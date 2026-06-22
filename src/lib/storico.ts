import { spostaPreventiviInCestino } from "./cestino";
import { supabase } from "./supabase";
import { queryConFiltroCestino } from "preventivoai-shared";
import { caricaCollegamentiPianoPreventivi } from "./collegamentiPiano";
import type { Tables } from "./database.types";
import type { Cliente, Preventivo } from "./types";

export { caricaCollegamentiPianoPreventivi };

type RigaPreventivoQuery = Pick<
  Tables<"preventivi">,
  | "id"
  | "titolo"
  | "stato"
  | "importo_totale"
  | "created_at"
  | "pagato"
  | "data_pagamento"
  | "cliente_id"
  | "nome_cliente"
  | "pdf_url"
  | "testo_preventivo"
  | "versione"
  | "preventivo_padre_id"
> & { clienti?: { nome: string } | null };

export async function caricaStorico(): Promise<Preventivo[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const select =
    "id, titolo, stato, importo_totale, created_at, pagato, data_pagamento, cliente_id, nome_cliente, pdf_url, testo_preventivo, versione, preventivo_padre_id, clienti(nome)";

  const { data, error } = await queryConFiltroCestino(
    () =>
      supabase
        .from("preventivi")
        .select(select)
        .eq("user_id", user.id)
        .eq("is_ultimo", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    () =>
      supabase
        .from("preventivi")
        .select(select)
        .eq("user_id", user.id)
        .eq("is_ultimo", true)
        .order("created_at", { ascending: false }),
  );

  if (error || !data) return [];

  return (data as RigaPreventivoQuery[]).map((p) => ({
    ...p,
    stato: p.stato ?? "bozza",
    created_at: p.created_at ?? new Date(0).toISOString(),
    nome_cliente: p.clienti?.nome || p.nome_cliente || "Senza cliente",
  }));
}

export async function eliminaPreventivi(ids: string[]) {
  return spostaPreventiviInCestino(ids);
}

export async function caricaClientiPerSposta(): Promise<Cliente[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("clienti")
    .select("id, nome, telefono, email, indirizzo")
    .eq("user_id", user.id)
    .order("nome");

  if (error || !data) return [];
  return data as Cliente[];
}

export async function spostaPreventivi(ids: string[], cliente: Pick<Cliente, "id" | "nome">) {
  return supabase
    .from("preventivi")
    .update({ cliente_id: cliente.id, nome_cliente: cliente.nome })
    .in("id", ids);
}

export async function caricaCronologiaPreventivo(padreId: string | null): Promise<Preventivo[]> {
  if (!padreId) return [];

  const versioni: Preventivo[] = [];
  let currentId: string | null = padreId;
  while (currentId) {
    const { data } = await supabase
      .from("preventivi")
      .select("id, titolo, stato, importo_totale, created_at, pagato, data_pagamento, pdf_url, testo_preventivo, versione, preventivo_padre_id")
      .eq("id", currentId)
      .single();
    const row = data as Pick<
      Tables<"preventivi">,
      | "id"
      | "titolo"
      | "stato"
      | "importo_totale"
      | "created_at"
      | "pagato"
      | "data_pagamento"
      | "pdf_url"
      | "testo_preventivo"
      | "versione"
      | "preventivo_padre_id"
    > | null;
    if (!row) break;
    versioni.unshift({
      ...row,
      stato: row.stato ?? "bozza",
      created_at: row.created_at ?? new Date(0).toISOString(),
    });
    currentId = row.preventivo_padre_id ?? null;
  }
  return versioni;
}

export async function ripristinaVersionePreventivo(preventivoCorrenteId: string, versioneId: string) {
  const { error: errCorrente } = await supabase
    .from("preventivi")
    .update({ is_ultimo: false })
    .eq("id", preventivoCorrenteId);

  if (errCorrente) return { error: errCorrente };

  const { error: errVersione } = await supabase
    .from("preventivi")
    .update({ is_ultimo: true })
    .eq("id", versioneId);

  if (errVersione) {
    return {
      error: {
        message:
          "Ripristino interrotto: la versione corrente potrebbe non essere più contrassegnata come ultima. "
          + errVersione.message,
      },
    };
  }

  return { error: null };
}
