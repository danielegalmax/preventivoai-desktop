import { supabase } from "./supabase";
import { importoDaTesto } from "./importo";
import { erroreColonnaDeletedAt } from "./preventiviVisibili";

export async function caricaClientiPerSelezione() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("clienti")
    .select("id, nome")
    .eq("user_id", user.id)
    .order("nome", { ascending: true });

  return data || [];
}

/** Preventivo esistente, visibile in storico/cliente (non nel cestino). */
export async function preventivoIdUtilizzabile(preventivoId: string | null): Promise<boolean> {
  if (!preventivoId) return false;

  const { data, error } = await supabase
    .from("preventivi")
    .select("id, deleted_at")
    .eq("id", preventivoId)
    .maybeSingle();

  if (error) {
    if (erroreColonnaDeletedAt(error)) {
      const { data: row } = await supabase
        .from("preventivi")
        .select("id")
        .eq("id", preventivoId)
        .maybeSingle();
      return !!row;
    }
    return false;
  }

  if (!data) return false;
  return !data.deleted_at;
}

export async function aggiornaPreventivoDaBuilder(
  preventivoId: string,
  {
    testo,
    clienteId,
    clienteNome,
    titolo,
    template,
    versione,
    pdfUrl,
  }: {
    testo: string;
    clienteId: string;
    clienteNome: string;
    titolo?: string;
    template?: string;
    versione?: number;
    pdfUrl?: string;
  },
) {
  const aggiornamento: Record<string, unknown> = {
    testo_preventivo: testo,
    importo_totale: importoDaTesto(testo),
    cliente_id: clienteId || null,
    nome_cliente: clienteNome || null,
    titolo: titolo || null,
    template: template || null,
  };
  if (versione != null) aggiornamento.versione = versione;
  if (pdfUrl) aggiornamento.pdf_url = pdfUrl;

  let res = await supabase
    .from("preventivi")
    .update({ ...aggiornamento, deleted_at: null })
    .eq("id", preventivoId);
  if (res.error && erroreColonnaDeletedAt(res.error)) {
    res = await supabase.from("preventivi").update(aggiornamento).eq("id", preventivoId);
  }
  return res;
}

export async function salvaPreventivoGenerato({
  testo,
  clienteId,
  clienteNome,
  titolo,
  template,
  versione = 1,
  pdfUrl,
  preventivoPadreId,
}: {
  testo: string;
  clienteId: string;
  clienteNome: string;
  titolo?: string;
  template?: string;
  versione?: number;
  pdfUrl?: string;
  preventivoPadreId?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Utente non autenticato" }, id: null };

  const { data, error } = await supabase
    .from("preventivi")
    .insert({
      user_id: user.id,
      testo_preventivo: testo,
      importo_totale: importoDaTesto(testo),
      cliente_id: clienteId || null,
      nome_cliente: clienteNome || null,
      titolo: titolo || null,
      template: template || null,
      stato: "bozza",
      is_ultimo: true,
      versione,
      preventivo_padre_id: preventivoPadreId || null,
      pdf_url: pdfUrl || null,
    })
    .select("id")
    .single();

  return { error, id: data?.id || null };
}

export async function aggiornaPdfUrlPreventivo(preventivoId: string, pdfUrl: string) {
  return supabase.from("preventivi").update({ pdf_url: pdfUrl }).eq("id", preventivoId);
}
