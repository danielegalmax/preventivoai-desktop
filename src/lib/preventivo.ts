import { supabase } from "./supabase";
import type { Preventivo } from "./types";

export const STATI_PREVENTIVO = ["bozza", "inviato", "accettato", "rifiutato"] as const;

export function statoPreventivoIcon(stato: string) {
  if (stato === "bozza") return "📝";
  if (stato === "inviato") return "📤";
  if (stato === "accettato") return "✅";
  return "❌";
}

export async function apriPdfPreventivo(preventivo: Pick<Preventivo, "pdf_url">) {
  if (!preventivo.pdf_url) {
    window.alert("PDF non ancora generato per questo preventivo.");
    return;
  }
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(preventivo.pdf_url);
  } catch {
    window.open(preventivo.pdf_url, "_blank");
  }
}

export async function cambiaStatoPreventivo(
  id: string,
  stato: string,
  statoPrecedente: string,
): Promise<{ error: string | null }> {
  const resetPagato = statoPrecedente === "accettato" && stato !== "accettato";
  const aggiornamento: {
    stato: string;
    pagato?: boolean;
    data_pagamento?: string | null;
  } = { stato };
  if (resetPagato) {
    aggiornamento.pagato = false;
    aggiornamento.data_pagamento = null;
  }

  const { error } = await supabase.from("preventivi").update(aggiornamento).eq("id", id);
  return { error: error?.message || null };
}

export async function segnaPreventivoPagato(
  id: string,
  pagato: boolean,
): Promise<{ error: string | null }> {
  const update = pagato
    ? { pagato: true, data_pagamento: new Date().toISOString() }
    : { pagato: false, data_pagamento: null };
  const { error } = await supabase.from("preventivi").update(update).eq("id", id);
  return { error: error?.message || null };
}

export async function aggiornaTitoloPreventivo(
  preventivoId: string,
  titolo: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("preventivi")
    .update({ titolo: titolo.trim() || null })
    .eq("id", preventivoId);
  return { error: error?.message || null };
}

export async function caricaDettaglioPreventivo(id: string): Promise<Preventivo | null> {
  const { data, error } = await supabase
    .from("preventivi")
    .select("id, titolo, stato, importo_totale, created_at, pagato, cliente_id, nome_cliente, pdf_url, testo_preventivo, versione, preventivo_padre_id, data_pagamento")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Preventivo;
}
