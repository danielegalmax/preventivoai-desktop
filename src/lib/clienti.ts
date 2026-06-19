import { supabase } from "./supabase";
import { queryConFiltroCestino } from "./preventiviVisibili";
import type { Cliente } from "./types";

export async function caricaClienti(): Promise<Cliente[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("clienti")
    .select("*")
    .eq("user_id", user.id)
    .order("nome", { ascending: true });

  if (error || !data) return [];

  const clientiConConteggio = await Promise.all(
    data.map(async (c) => {
      const base = () =>
        supabase
          .from("preventivi")
          .select("id", { count: "exact", head: true })
          .eq("cliente_id", c.id)
          .eq("is_ultimo", true);
      const { count } = await queryConFiltroCestino(
        () => base().is("deleted_at", null),
        () => base(),
      );
      return { ...c, num_preventivi: count || 0 } as Cliente;
    }),
  );

  return clientiConConteggio;
}

export async function creaCliente(dati: { nome: string; telefono: string; email: string; note: string }) {
  if (!dati.nome.trim()) {
    return { data: null, error: { message: "Inserisci almeno il nome del cliente" } };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: "Utente non autenticato" } };
  }

  return supabase
    .from("clienti")
    .insert({ ...dati, user_id: user.id })
    .select()
    .single();
}

async function eliminaDatiCollegatiClienti(clienteIds: string[]) {
  if (clienteIds.length === 0) return null;

  const { data: abbonamenti, error: abSelErr } = await supabase
    .from("abbonamenti")
    .select("id")
    .in("cliente_id", clienteIds);

  if (abSelErr) return abSelErr;

  const abbonamentoIds = (abbonamenti || []).map((a) => a.id);
  if (abbonamentoIds.length > 0) {
    const { error: rateErr } = await supabase
      .from("rate_abbonamento")
      .delete()
      .in("abbonamento_id", abbonamentoIds);
    if (rateErr) return rateErr;

    const { error: abErr } = await supabase
      .from("abbonamenti")
      .delete()
      .in("id", abbonamentoIds);
    if (abErr) return abErr;
  }

  const { error: trErr } = await supabase
    .from("trascrizioni")
    .delete()
    .in("cliente_id", clienteIds);
  if (trErr) return trErr;

  const { error: prevErr } = await supabase
    .from("preventivi")
    .delete()
    .in("cliente_id", clienteIds);
  if (prevErr) return prevErr;

  return null;
}

export async function aggiornaCliente(
  id: string,
  dati: { nome?: string; telefono?: string; email?: string; note?: string },
) {
  if (dati.nome !== undefined && !dati.nome.trim()) {
    return { data: null, error: { message: "Inserisci almeno il nome del cliente" } };
  }

  return supabase.from("clienti").update(dati).eq("id", id).select().single();
}

export async function eliminaClienti(ids: string[]) {
  const cleanupError = await eliminaDatiCollegatiClienti(ids);
  if (cleanupError) return { error: cleanupError };

  return supabase.from("clienti").delete().in("id", ids);
}
