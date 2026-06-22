import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Session } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";

type SyncStatusListener = (error: string | null) => void;

const syncStatusListeners = new Set<SyncStatusListener>();

export function onNativeNotificationSyncStatus(listener: SyncStatusListener) {
  syncStatusListeners.add(listener);
  return () => {
    syncStatusListeners.delete(listener);
  };
}

function notifySyncStatus(error: string | null) {
  syncStatusListeners.forEach((listener) => listener(error));
}

export async function syncNativeNotificationSession(session: Session | null) {
  if (!isTauri()) return;

  try {
    if (!session?.access_token || !session.user?.id) {
      await invoke("clear_notification_session");
      notifySyncStatus(null);
      return;
    }

    await invoke("set_notification_session", {
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      accessToken: session.access_token,
      userId: session.user.id,
    });
    notifySyncStatus(null);
  } catch (error) {
    console.warn("Impossibile sincronizzare la sessione notifiche native", error);
    notifySyncStatus(
      "Le notifiche in background potrebbero non funzionare. Riavvia l'app o effettua di nuovo l'accesso.",
    );
  }
}
