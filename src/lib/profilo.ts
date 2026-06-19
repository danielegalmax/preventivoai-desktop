import { supabase } from "./supabase";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export async function caricaProfiloUtente() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("nome_azienda")
    .eq("id", user.id)
    .single();

  return { email: user.email || "", nomeAzienda: data?.nome_azienda || "" };
}

export async function verificaPasswordAccount(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function aggiornaPasswordAccount(nuovaPassword: string) {
  return supabase.auth.updateUser({ password: nuovaPassword });
}

export async function logoutAccount() {
  return supabase.auth.signOut();
}

export async function eliminaAccount() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessione non valida. Effettua di nuovo il login.");

  const res = await fetch(`${BACKEND_URL}/api/elimina-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || "Impossibile eliminare account");
  return true;
}

