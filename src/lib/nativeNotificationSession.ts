import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Session } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";

export async function syncNativeNotificationSession(session: Session | null) {
  if (!isTauri()) return;

  try {
    if (!session?.access_token || !session.user?.id) {
      await invoke("clear_notification_session");
      return;
    }

    await invoke("set_notification_session", {
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      accessToken: session.access_token,
      userId: session.user.id,
    });
  } catch (error) {
    console.warn("Impossibile sincronizzare la sessione notifiche native", error);
  }
}
