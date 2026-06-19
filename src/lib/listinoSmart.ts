import { sessionToken } from "./settings";
import { serviziDaTesto } from "./serviziDaTesto";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export interface ServizioDraft {
  nome: string;
  descrizione: string;
  costo: string;
  unita: string;
}

export interface ServizioAI {
  nome: string;
  descrizione?: string | null;
  costo?: string | number | null;
  unita?: string | null;
}

function normalizzaServizioAI(s: ServizioAI): ServizioDraft {
  return {
    nome: s.nome,
    descrizione: s.descrizione || "",
    costo: s.costo != null && s.costo !== "" ? String(s.costo).replace(",", ".") : "",
    unita: s.unita || "cad",
  };
}

async function authHeaders() {
  const token = await sessionToken();
  if (!token) throw new Error("Sessione non valida");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function elaboraServiziDaTesto(testo: string): Promise<ServizioDraft[]> {
  const res = await fetch(`${BACKEND_URL}/api/elabora-servizi`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ testo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = serviziDaTesto(testo);
    if (fallback.length > 0) return fallback;
    throw new Error(data.error || `Errore server (${res.status})`);
  }
  if (data.error) {
    const fallback = serviziDaTesto(testo);
    if (fallback.length > 0) return fallback;
    throw new Error(data.error);
  }
  return (data.servizi || []).map(normalizzaServizioAI);
}

export async function elaboraServiziDaImmagine(immagineBase64: string, mimeType: string): Promise<ServizioDraft[]> {
  const res = await fetch(`${BACKEND_URL}/api/elabora-servizi`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ immagine_base64: immagineBase64, mime_type: mimeType }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`);
  if (data.error) throw new Error(data.error);
  return (data.servizi || []).map(normalizzaServizioAI);
}

export async function trascriviAudio(audioBase64: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/trascrivi`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ audio: audioBase64 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`);
  if (data.error) throw new Error(data.error);
  if (!data.trascrizione) throw new Error("Nessuna trascrizione disponibile.");
  return data.trascrizione as string;
}

export async function elaboraServiziDaVocale(audioBase64: string): Promise<ServizioDraft[]> {
  const trascrizione = await trascriviAudio(audioBase64);
  return elaboraServiziDaTesto(trascrizione);
}
