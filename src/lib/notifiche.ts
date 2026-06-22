import { invoke, isTauri } from "@tauri-apps/api/core";
import { sendNotification, isPermissionGranted } from "@tauri-apps/plugin-notification";
import { supabase } from "./supabase";
import { isDesktopApp } from "./appSettings";
import { formatDataBreve } from "./format";
import { sonoNotificheAbilitate } from "./notifications";

export type Notifica = {
  id: string;
  tipo: "firma_ricevuta" | "reminder_firma" | "rata_in_scadenza" | "pagamento_ricevuto" | string;
  preventivo_id: string | null;
  invio_id: string | null;
  titolo: string;
  messaggio: string;
  payload: {
    nomeCliente?: string;
    pdfFirmatoUrl?: string;
    chiediPagato?: boolean;
    urlFirma?: string;
    emailCliente?: string;
    telefonoCliente?: string;
    rata_id?: string;
    abbonamento_id?: string;
    cliente_id?: string;
    cliente_nome?: string;
    importo_residuo?: number;
    scadenza?: string;
    mese?: number;
    anno?: number;
    tipo_piano?: string;
  };
  letta: boolean;
  archiviata: boolean;
  snooze_until: string | null;
  created_at: string;
};

const ORE_RIMANDA_DEFAULT = 24;

export async function segnalaNotificaConsegnata(notificationId: string | undefined) {
  if (!isTauri() || !notificationId) return;
  try {
    await invoke("mark_notification_delivered", { notificationId });
  } catch (e) {
    console.warn("[notifiche-os] impossibile segnalare notifica a Rust:", e);
  }
}

export function titoloNotificaDaTipo(tipo: string) {
  const map: Record<string, string> = {
    firma_ricevuta: "Preventivo firmato",
    reminder_firma: "Promemoria firma",
    rata_in_scadenza: "Rata in scadenza",
    pagamento_ricevuto: "Pagamento ricevuto",
  };
  return map[tipo] || "Notifica";
}

export async function mostraNotificaOsSePossibile(n: Partial<Notifica> | null | undefined) {
  if (!isDesktopApp()) return;
  if (!sonoNotificheAbilitate()) return;
  if (!n) return;
  const body = typeof n.messaggio === "string" ? n.messaggio : "";
  if (!body) return;
  try {
    const granted = await isPermissionGranted();
    if (!granted) return;
    const title = typeof n.titolo === "string" && n.titolo.trim()
      ? n.titolo.trim()
      : titoloNotificaDaTipo(String(n.tipo || ""));
    sendNotification({ title, body });
  } catch (e) {
    console.error("[notifiche-os] errore:", e);
  }
}

export function notificaInRimando(n: Notifica, now = Date.now()) {
  if (!n.snooze_until) return false;
  return new Date(n.snooze_until).getTime() > now;
}

/** Conta solo le non lette e non rimandate (badge campanella). */
export function notificaContaBadge(n: Notifica, now = Date.now()) {
  return !n.letta && !notificaInRimando(n, now);
}

export async function caricaNotificheCampanella(): Promise<
  { ok: true; notifiche: Notifica[] } | { ok: false; error: string }
> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: true, notifiche: [] };
  const { data, error } = await supabase
    .from("notifiche")
    .select("*")
    .eq("user_id", user.id)
    .eq("archiviata", false)
    .order("letta", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("caricaNotificheCampanella", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, notifiche: (data || []) as Notifica[] };
}

export async function caricaNotificaById(id: string): Promise<Notifica | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("notifiche")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("caricaNotificaById", error.message);
    return null;
  }
  return (data as Notifica) || null;
}

export async function segnaNotificaLetta(id: string) {
  const { error } = await supabase.from("notifiche").update({ letta: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function segnaTutteLette() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("notifiche")
    .update({ letta: true })
    .eq("user_id", user.id)
    .eq("archiviata", false)
    .eq("letta", false);
  if (error) throw new Error(error.message);
}

export async function archiviaNotifica(id: string) {
  const { error } = await supabase.from("notifiche").update({ archiviata: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function rimandaNotifica(id: string, ore = ORE_RIMANDA_DEFAULT) {
  const snoozeUntil = new Date(Date.now() + ore * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("notifiche")
    .update({ snooze_until: snoozeUntil })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function formatTempoNotifica(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Adesso";
  if (min < 60) return `${min} min fa`;
  const ore = Math.floor(min / 60);
  if (ore < 24) return `${ore} h fa`;
  const giorni = Math.floor(ore / 24);
  if (giorni < 7) return `${giorni} g fa`;
  return formatDataBreve(iso);
}