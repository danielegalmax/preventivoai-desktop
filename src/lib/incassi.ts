import { supabase } from "./supabase";
import { queryConFiltroCestino } from "preventivoai-shared";
import type { Tables } from "./database.types";

type PreventivoPagatoRow = Pick<Tables<"preventivi">, "id" | "importo_totale" | "cliente_id">;
type AbbonamentoPreventivoRow = Pick<Tables<"abbonamenti">, "preventivo_id">;
type RataIncassoRow = Pick<Tables<"rate_abbonamento">, "importo" | "acconto" | "stato">;

type RisultatoIncasso =
  | { ok: true; value: number }
  | { ok: false; error: string };

const fatturatoClienteCache = new Map<string, number>();

export function getFatturatoClienteCached(clienteId: string): number | undefined {
  return fatturatoClienteCache.get(clienteId);
}

export function setFatturatoClienteCached(clienteId: string, value: number) {
  fatturatoClienteCache.set(clienteId, value);
}

export function invalidaFatturatoClienteCache() {
  fatturatoClienteCache.clear();
}

function sommaImportoRate(rate: RataIncassoRow[]) {
  return rate.reduce((totale, r) => {
    if (r.stato === "incassato") return totale + (r.importo || 0);
    if (r.stato === "parziale") return totale + (r.acconto || 0);
    return totale;
  }, 0);
}

/**
 * Incasso da preventivi singoli accettati e segnati pagati.
 *
 * Regola anti-doppio-conteggio: i preventivi con un piano collegato (`preventiviConPiano`,
 * da `abbonamenti.preventivo_id`) sono ESCLUSI. Il loro importo non va sommato qui perché
 * entra già in `sommaImportoRate` man mano che le rate vengono incassate (anche parzialmente).
 * Contarli in entrambi i bucket gonfierebbe fatturato e home.
 */
function incassoSingoliPreventivi(
  preventivi: PreventivoPagatoRow[],
  preventiviConPiano: Set<string>,
  clienteId?: string,
) {
  return preventivi
    .filter((p) => (!clienteId || p.cliente_id === clienteId) && !preventiviConPiano.has(p.id))
    .reduce((totale, p) => totale + (p.importo_totale || 0), 0);
}

async function caricaAbbonamentiConPreventivo(userId: string, clienteId?: string) {
  const build = (conFiltro: boolean) => {
    let q = supabase
      .from("abbonamenti")
      .select("preventivo_id")
      .eq("user_id", userId)
      .eq("attivo", true)
      .not("preventivo_id", "is", null);
    if (conFiltro) q = q.is("deleted_at", null);
    if (clienteId) q = q.eq("cliente_id", clienteId);
    return q;
  };
  const { data, error } = await queryConFiltroCestino(() => build(true), () => build(false));
  if (error) return { data: [] as AbbonamentoPreventivoRow[], error: error.message };
  return { data: data || [], error: null as string | null };
}

async function caricaPreventiviPagati(userId: string, clienteId?: string) {
  const build = (conFiltro: boolean) => {
    let q = supabase
      .from("preventivi")
      .select("id, importo_totale, cliente_id")
      .eq("user_id", userId)
      .eq("is_ultimo", true)
      .eq("stato", "accettato")
      .eq("pagato", true);
    if (conFiltro) q = q.is("deleted_at", null);
    if (clienteId) q = q.eq("cliente_id", clienteId);
    return q;
  };
  const { data, error } = await queryConFiltroCestino(() => build(true), () => build(false));
  if (error) return { data: [] as PreventivoPagatoRow[], error: error.message };
  return { data: data || [], error: null as string | null };
}

async function caricaRateIncasso(userId: string, clienteId?: string) {
  const build = (conFiltro: boolean) => {
    let q = supabase
      .from("rate_abbonamento")
      .select(
        conFiltro
          ? "importo, acconto, stato, abbonamenti!inner(user_id, cliente_id, attivo, deleted_at)"
          : "importo, acconto, stato, abbonamenti!inner(user_id, cliente_id, attivo)",
      )
      .eq("abbonamenti.user_id", userId)
      .eq("abbonamenti.attivo", true);
    if (conFiltro) q = q.is("abbonamenti.deleted_at", null);
    if (clienteId) q = q.eq("abbonamenti.cliente_id", clienteId);
    return q;
  };
  const { data, error } = await queryConFiltroCestino(() => build(true), () => build(false));
  if (error) return { data: [] as RataIncassoRow[], error: error.message };
  return { data: (data || []) as RataIncassoRow[], error: null as string | null };
}

async function caricaDatiIncassiUser(userId: string) {
  const [abbonamentiRes, pagatiRes, rateRes] = await Promise.all([
    caricaAbbonamentiConPreventivo(userId),
    caricaPreventiviPagati(userId),
    caricaRateIncasso(userId),
  ]);

  const error = abbonamentiRes.error || pagatiRes.error || rateRes.error;
  if (error) {
    return { error, preventiviPagati: [] as PreventivoPagatoRow[], preventiviConPiano: new Set<string>(), rate: [] as RataIncassoRow[] };
  }

  const preventiviConPiano = new Set(
    abbonamentiRes.data.map((a) => a.preventivo_id).filter(Boolean) as string[],
  );

  return {
    error: null as string | null,
    preventiviPagati: pagatiRes.data,
    preventiviConPiano,
    rate: rateRes.data,
  };
}

/** Incasso totale per cliente: preventivi singoli accettati+pagati + ogni pagamento su rate/abbonamento (anche parziale). */
export async function calcolaIncassoCliente(userId: string, clienteId: string): Promise<RisultatoIncasso> {
  const [abbonamentiRes, pagatiRes, rateRes] = await Promise.all([
    caricaAbbonamentiConPreventivo(userId, clienteId),
    caricaPreventiviPagati(userId, clienteId),
    caricaRateIncasso(userId, clienteId),
  ]);

  const error = abbonamentiRes.error || pagatiRes.error || rateRes.error;
  if (error) return { ok: false, error };

  const preventiviConPiano = new Set(
    abbonamentiRes.data.map((a) => a.preventivo_id).filter(Boolean) as string[],
  );

  const partePreventivi = incassoSingoliPreventivi(pagatiRes.data, preventiviConPiano);
  const parteRate = sommaImportoRate(rateRes.data);

  return { ok: true, value: partePreventivi + parteRate };
}

export async function calcolaIncassatoTotale(userId: string): Promise<RisultatoIncasso> {
  const { error, preventiviPagati, preventiviConPiano, rate } = await caricaDatiIncassiUser(userId);
  if (error) return { ok: false, error };

  const sommaPreventivi = incassoSingoliPreventivi(preventiviPagati, preventiviConPiano);
  const totaleRate = sommaImportoRate(rate);

  return { ok: true, value: sommaPreventivi + totaleRate };
}
