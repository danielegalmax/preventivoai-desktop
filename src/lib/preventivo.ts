import { supabase } from "./supabase";
import type { Tables, TablesUpdate } from "./database.types";
import type { Preventivo } from "./types";
import { ottieniUrlPdfPreventivo } from "./pdf";

export const STATI_PREVENTIVO = ["bozza", "inviato", "accettato", "rifiutato"] as const;

export async function apriPdfPreventivo(preventivo: Pick<Preventivo, "id" | "pdf_url">) {
  if (!preventivo.pdf_url) {
    window.alert("PDF non ancora generato per questo preventivo.");
    return;
  }
  try {
    const url = await ottieniUrlPdfPreventivo(preventivo.id);
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  } catch {
    window.alert("Impossibile aprire il PDF.");
  }
}

export async function cambiaStatoPreventivo(
  id: string,
  stato: string,
  statoPrecedente: string | null,
): Promise<{ error: string | null }> {
  const precedente = statoPrecedente ?? "bozza";
  const resetPagato = precedente === "accettato" && stato !== "accettato";
  const aggiornamento: TablesUpdate<"preventivi"> & { stato: string } = { stato };
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
  dataPagamento?: string,
): Promise<{ error: string | null }> {
  const update: TablesUpdate<"preventivi"> = pagato
    ? { pagato: true, data_pagamento: dataPagamento || new Date().toISOString() }
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
  type DettaglioRow = Pick<
    Tables<"preventivi">,
    | "id"
    | "titolo"
    | "stato"
    | "importo_totale"
    | "created_at"
    | "pagato"
    | "cliente_id"
    | "nome_cliente"
    | "pdf_url"
    | "testo_preventivo"
    | "versione"
    | "preventivo_padre_id"
    | "data_pagamento"
  >;

  const { data, error } = await supabase
    .from("preventivi")
    .select("id, titolo, stato, importo_totale, created_at, pagato, cliente_id, nome_cliente, pdf_url, testo_preventivo, versione, preventivo_padre_id, data_pagamento")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as DettaglioRow as Preventivo;
}
