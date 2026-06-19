import { supabase } from "./supabase";
import type { Servizio } from "./types";

export async function caricaServizi(): Promise<Servizio[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("servizi")
    .select("*")
    .eq("user_id", user.id)
    .order("ordine", { ascending: true });

  return (data || []) as Servizio[];
}

export async function creaServizio(input: { nome: string; descrizione: string; costo: string; unita: string; ordine: number }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "Utente non autenticato" } };

  return supabase
    .from("servizi")
    .insert({
      user_id: user.id,
      nome: input.nome.trim(),
      descrizione: input.descrizione.trim() || null,
      costo: input.costo ? parseFloat(input.costo.replace(",", ".")) : null,
      unita: input.unita,
      ordine: input.ordine,
    })
    .select()
    .single();
}

export async function aggiornaServizio(id: string, input: { nome: string; descrizione: string; costo: string; unita: string }) {
  return supabase
    .from("servizi")
    .update({
      nome: input.nome.trim(),
      descrizione: input.descrizione.trim() || null,
      costo: input.costo ? parseFloat(input.costo.replace(",", ".")) : null,
      unita: input.unita,
    })
    .eq("id", id);
}

export async function eliminaServizio(id: string) {
  return supabase.from("servizi").delete().eq("id", id);
}

export async function eliminaServizi(ids: string[]) {
  return supabase.from("servizi").delete().in("id", ids);
}

export interface ServizioInserimento {
  nome: string;
  descrizione: string;
  costo: string;
  unita: string;
}

export async function inserisciServizi(servizi: ServizioInserimento[], ordineBase = 0) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "Utente non autenticato" } };
  if (servizi.length === 0) return { data: [], error: null };

  const rows = servizi.map((s, index) => ({
    user_id: user.id,
    nome: s.nome.trim(),
    descrizione: s.descrizione.trim() || null,
    costo: s.costo ? parseFloat(s.costo.replace(",", ".")) : null,
    unita: s.unita || "cad",
    ordine: ordineBase + index,
  }));

  return supabase.from("servizi").insert(rows).select();
}
