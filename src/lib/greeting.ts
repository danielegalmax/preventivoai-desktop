import { supabase } from "./supabase";

export function getSalutoOrario(date = new Date()): string {
  const ora = date.getHours();
  if (ora < 12) return "Buongiorno";
  if (ora < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export function getNomeBreve(nomeAzienda: string): string {
  const primo = nomeAzienda.trim().split(/\s+/)[0];
  return primo || "Artigiano";
}

export function getInizialeProfilo(nome: string): string {
  return (nome.trim().charAt(0) || "A").toUpperCase();
}

export interface HeaderProfilo {
  nomeBreve: string;
  iniziale: string;
  logoUrl: string;
  email: string;
}

export async function caricaHeaderProfilo(): Promise<HeaderProfilo | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("nome_azienda, logo_url")
    .eq("id", user.id)
    .single();

  const nomeBreve = getNomeBreve(data?.nome_azienda || "");
  return {
    nomeBreve,
    iniziale: getInizialeProfilo(nomeBreve),
    logoUrl: data?.logo_url || "",
    email: user.email || "",
  };
}
