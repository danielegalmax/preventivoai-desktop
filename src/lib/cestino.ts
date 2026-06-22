import { supabase } from "./supabase";
import { caricaCronologiaPreventivo } from "./storico";
import { erroreColonnaDeletedAt } from "preventivoai-shared";
import type { Abbonamento, Preventivo } from "./types";

export const CESTINO_GIORNI = 7;

export type VoceCestinoPreventivo = Preventivo & {
  deleted_at: string;
  nome_cliente?: string | null;
};

export type VoceCestinoAbbonamento = Abbonamento & {
  deleted_at: string;
  clienti?: { nome: string } | null;
};

function sogliaScadenzaCestino() {
  const d = new Date();
  d.setDate(d.getDate() - CESTINO_GIORNI);
  return d.toISOString();
}

export function giorniRimastiCestino(deletedAt: string): number {
  const scadenza = new Date(deletedAt);
  scadenza.setDate(scadenza.getDate() + CESTINO_GIORNI);
  const diff = scadenza.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Tutti i preventivi della stessa famiglia di versioni (antenati + discendenti). */
async function idsFamigliaPreventivo(preventivoId: string): Promise<string[]> {
  const { data: current } = await supabase
    .from("preventivi")
    .select("id, preventivo_padre_id")
    .eq("id", preventivoId)
    .single();

  if (!current) return [preventivoId];

  const ids = new Set<string>([preventivoId]);
  if (current.preventivo_padre_id) {
    const versioni = await caricaCronologiaPreventivo(current.preventivo_padre_id);
    for (const v of versioni) ids.add(v.id);
  }

  let espanso = true;
  while (espanso) {
    espanso = false;
    const batch = [...ids];
    const { data: figli } = await supabase
      .from("preventivi")
      .select("id")
      .in("preventivo_padre_id", batch);
    for (const f of figli || []) {
      if (!ids.has(f.id)) {
        ids.add(f.id);
        espanso = true;
      }
    }
  }

  return [...ids];
}

async function abbonamentiCollegatiPreventivi(preventivoIds: string[], escludiGiaCestino = true) {
  if (preventivoIds.length === 0) return [];

  const base = () =>
    supabase
      .from("abbonamenti")
      .select("id")
      .in("preventivo_id", preventivoIds);

  if (!escludiGiaCestino) {
    const { data } = await base();
    return (data || []).map((a) => a.id);
  }

  const { data, error } = await base().is("deleted_at", null);
  if (error && erroreColonnaDeletedAt(error)) {
    const { data: fallback } = await base();
    return (fallback || []).map((a) => a.id);
  }
  return (data || []).map((a) => a.id);
}

async function ripristinaAbbonamentiDaCestino(abbonamentoIds: string[]) {
  if (abbonamentoIds.length === 0) return;

  const soft = await supabase
    .from("abbonamenti")
    .update({ deleted_at: null, attivo: true })
    .in("id", abbonamentoIds);

  if (soft.error && erroreColonnaDeletedAt(soft.error)) {
    await supabase.from("abbonamenti").update({ attivo: true }).in("id", abbonamentoIds);
  }
}

export async function spostaAbbonamentiInCestino(abbonamentoIds: string[]) {
  if (abbonamentoIds.length === 0) return { error: null };

  const now = new Date().toISOString();
  const soft = await supabase
    .from("abbonamenti")
    .update({ attivo: false, deleted_at: now })
    .in("id", abbonamentoIds);

  if (soft.error && erroreColonnaDeletedAt(soft.error)) {
    return supabase
      .from("abbonamenti")
      .update({ attivo: false })
      .in("id", abbonamentoIds);
  }

  return soft;
}

export async function spostaPreventiviInCestino(ids: string[]) {
  if (ids.length === 0) return { error: null };

  const tuttiIds = new Set<string>();
  for (const id of ids) {
    for (const chainId of await idsFamigliaPreventivo(id)) tuttiIds.add(chainId);
  }
  const preventivoIds = [...tuttiIds];

  const abbonamentoIds = await abbonamentiCollegatiPreventivi(preventivoIds);
  const now = new Date().toISOString();

  if (abbonamentoIds.length > 0) {
    const { error: abErr } = await spostaAbbonamentiInCestino(abbonamentoIds);
    if (abErr) return { error: abErr };
  }

  const softPrev = await supabase
    .from("preventivi")
    .update({ deleted_at: now })
    .in("id", preventivoIds);

  if (softPrev.error && erroreColonnaDeletedAt(softPrev.error)) {
    const { error: hardErr } = await supabase
      .from("preventivi")
      .delete()
      .in("id", preventivoIds);
    if (hardErr) {
      await ripristinaAbbonamentiDaCestino(abbonamentoIds);
      return { error: hardErr };
    }
    return { error: null };
  }

  if (softPrev.error) {
    await ripristinaAbbonamentiDaCestino(abbonamentoIds);
    return { error: softPrev.error };
  }

  return { error: null };
}

export async function ripristinaPreventivi(ids: string[]) {
  if (ids.length === 0) return { error: null };

  const tuttiIds = new Set<string>();
  for (const id of ids) {
    for (const chainId of await idsFamigliaPreventivo(id)) tuttiIds.add(chainId);
  }

  const softPrev = await supabase
    .from("preventivi")
    .update({ deleted_at: null })
    .in("id", [...tuttiIds]);

  if (softPrev.error && erroreColonnaDeletedAt(softPrev.error)) {
    return { error: { message: "Il cestino non è ancora attivo sul database." } };
  }
  if (softPrev.error) return { error: softPrev.error };

  const { data: abbonamenti, error: abSelErr } = await supabase
    .from("abbonamenti")
    .select("id, preventivo_id")
    .in("preventivo_id", [...tuttiIds])
    .not("deleted_at", "is", null);

  if (abSelErr && !erroreColonnaDeletedAt(abSelErr)) {
    return { error: abSelErr };
  }

  const abIds = (abbonamenti || []).map((a) => a.id);
  if (abIds.length > 0) {
    const softAb = await supabase
      .from("abbonamenti")
      .update({ deleted_at: null, attivo: true })
      .in("id", abIds);
    if (softAb.error) return { error: softAb.error };
  }

  return { error: null };
}

export async function ripristinaAbbonamenti(ids: string[]) {
  if (ids.length === 0) return { error: null };

  const { data: abbonamenti, error: selErr } = await supabase
    .from("abbonamenti")
    .select("id, preventivo_id")
    .in("id", ids);

  if (selErr) return { error: selErr };

  const preventivoIds = [
    ...new Set(
      (abbonamenti || [])
        .map((a) => a.preventivo_id)
        .filter((id): id is string => !!id),
    ),
  ];

  if (preventivoIds.length > 0) {
    const { data: preventiviInCestino, error: prevSelErr } = await supabase
      .from("preventivi")
      .select("id")
      .in("id", preventivoIds)
      .not("deleted_at", "is", null);

    if (prevSelErr && !erroreColonnaDeletedAt(prevSelErr)) {
      return { error: prevSelErr };
    }

    const idsPreventiviDaRipristinare = (preventiviInCestino || []).map((p) => p.id);
    if (idsPreventiviDaRipristinare.length > 0) {
      const { error: prevErr } = await ripristinaPreventivi(idsPreventiviDaRipristinare);
      if (prevErr) return { error: prevErr };
    }
  }

  const soft = await supabase
    .from("abbonamenti")
    .update({ deleted_at: null, attivo: true })
    .in("id", ids);

  if (soft.error && erroreColonnaDeletedAt(soft.error)) {
    return supabase
      .from("abbonamenti")
      .update({ attivo: true })
      .in("id", ids);
  }

  return soft;
}

async function eliminaDefinitivamenteAbbonamentiIds(abbonamentoIds: string[]) {
  if (abbonamentoIds.length === 0) return null;

  const { error: rateErr } = await supabase
    .from("rate_abbonamento")
    .delete()
    .in("abbonamento_id", abbonamentoIds);
  if (rateErr) return rateErr;

  const { error: abErr } = await supabase
    .from("abbonamenti")
    .delete()
    .in("id", abbonamentoIds);
  return abErr;
}

export async function eliminaDefinitivamentePreventivi(ids: string[]) {
  if (ids.length === 0) return { error: null };

  const tuttiIds = new Set<string>();
  for (const id of ids) {
    for (const chainId of await idsFamigliaPreventivo(id)) tuttiIds.add(chainId);
  }
  const preventivoIds = [...tuttiIds];

  const abbonamentoIds = await abbonamentiCollegatiPreventivi(preventivoIds, false);
  const abErr = await eliminaDefinitivamenteAbbonamentiIds(abbonamentoIds);
  if (abErr) return { error: abErr };

  const { error: prevErr } = await supabase
    .from("preventivi")
    .delete()
    .in("id", preventivoIds);
  return { error: prevErr };
}

export async function eliminaDefinitivamenteAbbonamenti(ids: string[]) {
  const err = await eliminaDefinitivamenteAbbonamentiIds(ids);
  return { error: err };
}

export async function purgeCestinoScaduto() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const soglia = sogliaScadenzaCestino();

  const { data: prevScaduti, error: prevErr } = await supabase
    .from("preventivi")
    .select("id")
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .lt("deleted_at", soglia);

  if (prevErr && erroreColonnaDeletedAt(prevErr)) return;

  if (prevScaduti?.length) {
    await eliminaDefinitivamentePreventivi(prevScaduti.map((p) => p.id));
  }

  const { data: abScaduti, error: abErr } = await supabase
    .from("abbonamenti")
    .select("id")
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .lt("deleted_at", soglia);

  if (abErr && erroreColonnaDeletedAt(abErr)) return;

  if (abScaduti?.length) {
    await eliminaDefinitivamenteAbbonamenti(abScaduti.map((a) => a.id));
  }
}

export async function caricaCestinoPreventivi(): Promise<VoceCestinoPreventivo[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const soglia = sogliaScadenzaCestino();

  const { data, error } = await supabase
    .from("preventivi")
    .select("id, titolo, stato, importo_totale, created_at, pagato, cliente_id, nome_cliente, deleted_at, clienti(nome)")
    .eq("user_id", user.id)
    .eq("is_ultimo", true)
    .not("deleted_at", "is", null)
    .gte("deleted_at", soglia)
    .order("deleted_at", { ascending: false });

  if (error && erroreColonnaDeletedAt(error)) return [];
  if (error || !data) return [];

  return data.map((p) => {
    const row = p as unknown as VoceCestinoPreventivo & { clienti?: { nome: string } | null };
    return {
      ...row,
      nome_cliente: row.clienti?.nome || row.nome_cliente || "Senza cliente",
    };
  });
}

export async function caricaCestinoAbbonamenti(): Promise<VoceCestinoAbbonamento[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const soglia = sogliaScadenzaCestino();

  const { data, error } = await supabase
    .from("abbonamenti")
    .select("*, clienti(nome)")
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .gte("deleted_at", soglia)
    .order("deleted_at", { ascending: false });

  if (error && erroreColonnaDeletedAt(error)) return [];
  if (error || !data) return [];
  return data as VoceCestinoAbbonamento[];
}

export async function conteggioCestino(): Promise<number> {
  const [preventivi, abbonamenti] = await Promise.all([
    caricaCestinoPreventivi(),
    caricaCestinoAbbonamenti(),
  ]);
  return preventivi.length + abbonamenti.length;
}
