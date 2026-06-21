import { supabase } from "./supabase";
import { queryConFiltroCestino } from "preventivoai-shared";

type RataRow = {
  importo: number;
  acconto: number;
  stato: string;
  abbonamenti?: { cliente_id?: string } | { cliente_id?: string }[] | null;
};

type PreventivoRow = {
  id: string;
  importo_totale: number | null;
  cliente_id: string | null;
};

const fatturatoClienteCache = new Map<string, number>();

export function getFatturatoClienteCached(clienteId: string): number | undefined {
  return fatturatoClienteCache.get(clienteId);
}

export function setFatturatoClienteCached(clienteId: string, value: number) {
  fatturatoClienteCache.set(clienteId, value);
}

export function sommaImportoRate(rate: Pick<RataRow, "importo" | "acconto" | "stato">[]) {
  return rate.reduce((totale, r) => {
    if (r.stato === "incassato") return totale + (r.importo || 0);
    if (r.stato === "parziale") return totale + (r.acconto || 0);
    return totale;
  }, 0);
}

function incassoSingoliPreventivi(
  preventivi: PreventivoRow[],
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
  const { data } = await queryConFiltroCestino(() => build(true), () => build(false));
  return data || [];
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
  const { data } = await queryConFiltroCestino(() => build(true), () => build(false));
  return (data || []) as PreventivoRow[];
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
  const { data } = await queryConFiltroCestino(() => build(true), () => build(false));
  return (data || []) as RataRow[];
}

async function caricaDatiIncassiUser(userId: string) {
  const [abbonamenti, pagati, rate] = await Promise.all([
    caricaAbbonamentiConPreventivo(userId),
    caricaPreventiviPagati(userId),
    caricaRateIncasso(userId),
  ]);

  const preventiviConPiano = new Set(
    abbonamenti.map((a) => a.preventivo_id).filter(Boolean) as string[],
  );

  return {
    preventiviPagati: pagati,
    preventiviConPiano,
    rate,
  };
}

/** Incasso totale per cliente: preventivi singoli accettati+pagati + ogni pagamento su rate/abbonamento (anche parziale). */
export async function calcolaIncassoCliente(userId: string, clienteId: string): Promise<number> {
  const [abbonamenti, pagati, rate] = await Promise.all([
    caricaAbbonamentiConPreventivo(userId, clienteId),
    caricaPreventiviPagati(userId, clienteId),
    caricaRateIncasso(userId, clienteId),
  ]);

  const preventiviConPiano = new Set(
    abbonamenti.map((a) => a.preventivo_id).filter(Boolean) as string[],
  );

  const partePreventivi = incassoSingoliPreventivi(pagati, preventiviConPiano);
  const parteRate = sommaImportoRate(rate);

  return partePreventivi + parteRate;
}

export async function calcolaIncassatoTotale(userId: string): Promise<number> {
  const { preventiviPagati, preventiviConPiano, rate } = await caricaDatiIncassiUser(userId);

  const sommaPreventivi = incassoSingoliPreventivi(preventiviPagati, preventiviConPiano);
  const totaleRate = sommaImportoRate(rate);

  return sommaPreventivi + totaleRate;
}

