import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { isDesktopApp } from "./appSettings";

const NOTIFICATION_PERMISSION_KEY = "preventivoai-notification-permission-requested";
const NOTIFICHE_OS_KEY = "preventivoai-notifiche-os";

export function sonoNotificheAbilitate(): boolean {
  const raw = localStorage.getItem(NOTIFICHE_OS_KEY);
  if (raw === null) return true;
  return raw === "true";
}

export function setNotificheAbilitate(abilitate: boolean) {
  localStorage.setItem(NOTIFICHE_OS_KEY, String(abilitate));
}

export async function richiediPermessoNotifiche() {  if (!isDesktopApp()) return;
  if (sessionStorage.getItem(NOTIFICATION_PERMISSION_KEY) === "1") return;
  sessionStorage.setItem(NOTIFICATION_PERMISSION_KEY, "1");

  try {
    const granted = await isPermissionGranted();
    if (granted) {
      console.log("[notifiche] permesso già concesso");
      return;
    }

    const result = await requestPermission();
    console.log(`[notifiche] permesso ${result === "granted" ? "concesso" : "negato"}`);
  } catch (err) {
    console.warn("[notifiche] richiesta permesso fallita", err);
  }
}

