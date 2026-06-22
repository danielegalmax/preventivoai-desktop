import { erroreColonnaDeletedAt } from "preventivoai-shared";
import { supabase } from "../supabase";
import type { Abbonamento, PreventivoMadre, RataAbbonamento } from "../types";
import type { Tables } from "../database.types";
import { nomePianoDaPreventivo } from "preventivoai-shared";

export const PREVENTIVO_MADRE_SELECT = "id, titolo, created_at, versione, importo_totale, stato";

export function alertErroreAbbonamento(titolo: string, messaggio?: string) {
  window.alert(messaggio ? `${titolo}\n\n${messaggio}` : titolo);
}

export async function nomeDaPreventivoId(preventivoId: string, tipo: "canone" | "rate") {
  const { data } = await supabase
    .from("preventivi")
    .select("titolo, created_at, versione")
    .eq("id", preventivoId)
    .single();
  return data ? nomePianoDaPreventivo(data, tipo) : null;
}

export async function pianoAttivoSuPreventivo(preventivoId: string) {
  const { data, error } = await supabase
    .from("abbonamenti")
    .select("id, tipo")
    .eq("preventivo_id", preventivoId)
    .eq("attivo", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error && erroreColonnaDeletedAt(error)) {
    const { data: fallback } = await supabase
      .from("abbonamenti")
      .select("id, tipo")
      .eq("preventivo_id", preventivoId)
      .eq("attivo", true)
      .maybeSingle();
    return fallback?.tipo as "canone" | "rate" | undefined;
  }

  return data?.tipo as "canone" | "rate" | undefined;
}

export async function caricaPreventiviMadreMap(abbonamenti: Abbonamento[]) {
  const ids = [...new Set(abbonamenti.map((a) => a.preventivo_id).filter(Boolean))] as string[];
  if (ids.length === 0) return {};
  const { data } = await supabase
    .from("preventivi")
    .select(PREVENTIVO_MADRE_SELECT)
    .in("id", ids);
  const map: Record<string, PreventivoMadre> = {};
  for (const p of data || []) {
    map[p.id] = p as PreventivoMadre;
  }
  return map;
}

export async function fetchRatePerPiani(abbonamentoIds: string[]) {
  if (abbonamentoIds.length === 0) return {} as Record<string, RataAbbonamento[]>;
  const { data } = await supabase
    .from("rate_abbonamento")
    .select("*")
    .in("abbonamento_id", abbonamentoIds)
    .order("anno", { ascending: true })
    .order("mese", { ascending: true });
  const map: Record<string, RataAbbonamento[]> = {};
  for (const id of abbonamentoIds) map[id] = [];
  for (const rata of data || []) {
    const row = rata as Tables<"rate_abbonamento">;
    if (!map[row.abbonamento_id]) map[row.abbonamento_id] = [];
    map[row.abbonamento_id].push({
      ...row,
      saldo_residuo: row.saldo_residuo ?? 0,
    } as RataAbbonamento);
  }
  return map;
}

export async function generaRataMeseCorrente(abbonamentoId: string, importo: number): Promise<string | null> {
  const ora = new Date();
  const mese = ora.getMonth() + 1;
  const anno = ora.getFullYear();
  const { data: esistente } = await supabase
    .from("rate_abbonamento")
    .select("id")
    .eq("abbonamento_id", abbonamentoId)
    .eq("mese", mese)
    .eq("anno", anno)
    .single();
  if (esistente) return null;
  const { error } = await supabase.from("rate_abbonamento").insert({
    abbonamento_id: abbonamentoId,
    mese,
    anno,
    importo,
    acconto: 0,
    stato: "da_incassare",
  });
  return error ? error.message : null;
}

export async function generaRateMultiple(
  abbonamentoId: string,
  importo: number,
  numeroMesi: number,
): Promise<string | null> {
  const ora = new Date();
  const inserimenti = [];
  for (let i = 0; i < numeroMesi; i++) {
    const data = new Date(ora.getFullYear(), ora.getMonth() + i, 1);
    inserimenti.push({
      abbonamento_id: abbonamentoId,
      mese: data.getMonth() + 1,
      anno: data.getFullYear(),
      importo,
      acconto: 0,
      stato: "da_incassare",
    });
  }
  const { error } = await supabase.from("rate_abbonamento").insert(inserimenti);
  return error ? error.message : null;
}

export async function generaRateConImporti(
  abbonamentoId: string,
  voci: { importo: number; mese: number; anno: number }[],
) {
  if (voci.length === 0) return { data: [] as { id: string; mese: number; anno: number }[], error: null as string | null };
  const { data, error } = await supabase.from("rate_abbonamento").insert(
    voci.map((v) => ({
      abbonamento_id: abbonamentoId,
      mese: v.mese,
      anno: v.anno,
      importo: v.importo,
      acconto: 0,
      stato: "da_incassare" as const,
    })),
  ).select("id, mese, anno");
  return { data: data || [], error: error?.message || null };
}

/** @see nuovoStatoDopoImportoRata in preventivoai-shared */
export { nuovoStatoDopoImportoRata } from "preventivoai-shared";
