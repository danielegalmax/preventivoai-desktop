import { supabase } from "./supabase";

export type SegnalazioneForm = {
  tipo: string;
  titolo: string;
  descrizione: string;
  schermata: string;
  screenshotFile?: File;
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

async function caricaScreenshot(userId: string, file: File): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from("segnalazioni")
      .upload(path, arrayBuffer, { contentType: file.type, upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from("segnalazioni").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export async function inviaSegnalazione(form: SegnalazioneForm) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Utente non autenticato"), user: null };

  let screenshot_url: string | null = null;
  if (form.screenshotFile) {
    screenshot_url = await caricaScreenshot(user.id, form.screenshotFile);
  }

  const insertRow = {
    user_id: user.id,
    tipo: form.tipo,
    titolo: form.titolo.trim(),
    descrizione: form.descrizione.trim(),
    schermata: form.schermata.trim() || null,
    piattaforma: "desktop",
    screenshot_url: screenshot_url ?? null,
  };

  const { error } = await supabase.from("segnalazioni").insert(insertRow as never);

  return { error, user };
}
