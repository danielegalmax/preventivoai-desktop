import { supabase } from "./supabase";

export type SegnalazioneForm = {
  tipo: string;
  titolo: string;
  descrizione: string;
  schermata: string;
};

export const SEGNALAZIONE_TIPI = [
  { key: "bug", label: "Bug" },
  { key: "suggerimento", label: "Suggerimento" },
  { key: "altro", label: "Altro" },
] as const;

export const SEGNALAZIONE_VUOTA: SegnalazioneForm = {
  tipo: "bug",
  titolo: "",
  descrizione: "",
  schermata: "",
};

const ETICHETTE_SCHERMATA: Record<string, string> = {
  "/": "Home",
  "/storico": "Storico",
  "/cestino": "Elementi eliminati",
  "/clienti": "Clienti",
  "/nuovo": "Nuovo preventivo",
  "/profilo": "Profilo",
  "/app": "Impostazioni app",
  "/impostazioni": "Impostazioni",
  "/impostazioni/servizi": "Listino servizi",
  "/impostazioni/fiscale": "Regime fiscale",
  "/impostazioni/pagamenti": "Metodi di pagamento",
  "/impostazioni/messaggi": "Messaggi cliente",
};

export function etichettaSchermata(pathname: string): string {
  if (ETICHETTE_SCHERMATA[pathname]) return ETICHETTE_SCHERMATA[pathname];
  if (pathname.startsWith("/clienti/")) return "Dettaglio cliente";
  if (pathname.startsWith("/nuovo/")) return "Nuovo preventivo";
  if (pathname.startsWith("/impostazioni/")) return "Impostazioni";
  return pathname;
}

export async function inviaSegnalazione(form: SegnalazioneForm) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Utente non autenticato"), user: null };

  const { error } = await supabase.from("segnalazioni").insert({
    user_id: user.id,
    tipo: form.tipo,
    titolo: form.titolo.trim(),
    descrizione: form.descrizione.trim(),
    schermata: form.schermata.trim() || null,
  });

  return { error, user };
}
