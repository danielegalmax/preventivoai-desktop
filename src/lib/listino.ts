import { parseImportoEuro } from "preventivoai-shared";
import { supabase } from "./supabase";
import type { Servizio } from "./types";

function parseCostoOptional(costo: string): { value: number | null; error: string | null } {
  const trimmed = costo.trim();
  if (!trimmed) return { value: null, error: null };
  const val = parseImportoEuro(trimmed);
  if (val === null) return { value: null, error: "Costo non valido." };
  return { value: val, error: null };
}

export async function caricaServizi(): Promise<{ data: Servizio[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };

  const { data, error } = await supabase
    .from("servizi")
    .select("*")
    .eq("user_id", user.id)
    .order("ordine", { ascending: true });

  if (error) {
    console.error("caricaServizi", error.message);
    return { data: [], error: error.message };
  }

  return { data: (data || []) as Servizio[], error: null };
}

export async function creaServizio(input: { nome: string; descrizione: string; costo: string; unita: string; ordine: number }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "Utente non autenticato" } };

  const parsed = parseCostoOptional(input.costo);
  if (parsed.error) return { data: null, error: { message: parsed.error } };

  return supabase
    .from("servizi")
    .insert({
      user_id: user.id,
      nome: input.nome.trim(),
      descrizione: input.descrizione.trim() || null,
      costo: parsed.value,
      unita: input.unita,
      ordine: input.ordine,
    })
    .select()
    .single();
}

export async function aggiornaServizio(id: string, input: { nome: string; descrizione: string; costo: string; unita: string }) {
  const parsed = parseCostoOptional(input.costo);
  if (parsed.error) return { data: null, error: { message: parsed.error } };

  return supabase
    .from("servizi")
    .update({
      nome: input.nome.trim(),
      descrizione: input.descrizione.trim() || null,
      costo: parsed.value,
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

  const rows = servizi.map((s, index) => {
    const parsed = parseCostoOptional(s.costo);
    if (parsed.error) return null;
    return {
      user_id: user.id,
      nome: s.nome.trim(),
      descrizione: s.descrizione.trim() || null,
      costo: parsed.value,
      unita: s.unita || "cad",
      ordine: ordineBase + index,
    };
  });

  if (rows.some((row) => row === null)) {
    return { data: null, error: { message: "Uno o più costi non sono validi." } };
  }

  return supabase.from("servizi").insert(rows as NonNullable<(typeof rows)[number]>[]).select();
}
