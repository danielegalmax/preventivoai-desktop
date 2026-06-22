import { supabase } from "./supabase";
import { queryConFiltroCestino } from "preventivoai-shared";
import type { Cliente, Preventivo } from "./types";

export async function caricaClienteDettaglio(clienteId: string) {
  const select =
    "id, titolo, stato, importo_totale, created_at, pagato, data_pagamento, pdf_url, cliente_id, testo_preventivo, versione, preventivo_padre_id";

  const [{ data: cliente }, preventiviRes] = await Promise.all([
    supabase.from("clienti").select("*").eq("id", clienteId).single(),
    queryConFiltroCestino(
      () =>
        supabase
          .from("preventivi")
          .select(select)
          .eq("cliente_id", clienteId)
          .eq("is_ultimo", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
      () =>
        supabase
          .from("preventivi")
          .select(select)
          .eq("cliente_id", clienteId)
          .eq("is_ultimo", true)
          .order("created_at", { ascending: false }),
    ),
  ]);

  const preventivi = preventiviRes.error ? [] : (preventiviRes.data || []);

  return {
    cliente: cliente as Cliente | null,
    preventivi: preventivi as Preventivo[],
  };
}

export async function caricaClientiDisponibili(clienteId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("clienti")
    .select("id, nome")
    .eq("user_id", user.id)
    .order("nome");

  if (clienteId) query = query.neq("id", clienteId);

  const { data } = await query;
  return data || [];
}

export { caricaCollegamentiPianoCliente } from "./collegamentiPiano";

export async function sessioneClienteDettaglio() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
