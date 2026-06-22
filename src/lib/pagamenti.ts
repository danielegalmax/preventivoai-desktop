import { supabase } from "./supabase";

export type TipoPagamento = "bonifico" | "paypal" | "contanti" | "carta" | "stripe";

export type MetodoPagamento = {
  id: string;
  user_id?: string;
  tipo: TipoPagamento;
  nome: string;
  dati: Record<string, string>;
  predefinito: boolean;
};

/** Estrae solo lo username PayPal.me (senza URL o slash). */
export function normalizzaPaypalMe(value: string): string {
  let v = value.trim();
  v = v.replace(/^https?:\/\//i, "");
  v = v.replace(/^www\./i, "");
  v = v.replace(/^paypal\.me\//i, "");
  return v.replace(/^\/+|\/+$/g, "");
}

export type MetodoPagamentoForm = {
  tipo: TipoPagamento;
  nome: string;
  dati: Record<string, string>;
  predefinito: boolean;
};

export const metodoContantiDefault: MetodoPagamento = {
  id: "contanti-default",
  tipo: "contanti",
  nome: "Paga in contanti",
  dati: {},
  predefinito: false,
};

export function iconaMetodoPagamento(tipo?: TipoPagamento): string {
  if (tipo === "bonifico") return "🏦";
  if (tipo === "paypal") return "💙";
  if (tipo === "contanti") return "💵";
  if (tipo === "stripe") return "🔗";
  return "💳";
}

export async function caricaMetodiPagamento(): Promise<{ data: MetodoPagamento[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };
  const { data, error } = await supabase
    .from("metodi_pagamento")
    .select("*")
    .eq("user_id", user.id)
    .order("predefinito", { ascending: false });

  if (error) {
    console.error("caricaMetodiPagamento", error.message);
    return { data: [], error: error.message };
  }

  return { data: (data || []) as MetodoPagamento[], error: null };
}

export async function caricaMetodiPagamentoBuilder() {
  const { data, error } = await caricaMetodiPagamento();
  const predefinito = data.find((m) => m.predefinito) || null;
  const haContantiDb = data.some((m) => m.tipo === "contanti");
  return {
    metodiPagamento: haContantiDb ? data : [metodoContantiDefault, ...data],
    predefinito,
    error,
  };
}

export async function salvaMetodoPagamento(form: MetodoPagamentoForm, editId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Utente non autenticato" }, user: null };

  const payload = {
    user_id: user.id,
    tipo: form.tipo,
    nome: form.nome.trim(),
    dati: form.dati,
    predefinito: form.predefinito,
  };

  if (form.predefinito) {
    const { error } = await supabase
      .from("metodi_pagamento")
      .update({ predefinito: false })
      .eq("user_id", user.id);
    if (error) return { error, user };
  }

  const { error } = editId
    ? await supabase.from("metodi_pagamento").update(payload).eq("id", editId)
    : await supabase.from("metodi_pagamento").insert(payload);

  return { error, user };
}

export function eliminaMetodoPagamento(id: string) {
  return supabase.from("metodi_pagamento").delete().eq("id", id);
}
