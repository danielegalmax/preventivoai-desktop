import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

export type RisultatoControlloAggiornamenti = {
  aggiornato: boolean;
  messaggio: string;
  versioneDisponibile?: string;
  note?: string;
  update?: Update;
};

const SESSION_CHECK_KEY = "preventivoai-update-checked";

export function aggiornamentoGiaControllatoInSessione(): boolean {
  return sessionStorage.getItem(SESSION_CHECK_KEY) === "1";
}

export function segnaAggiornamentoControllatoInSessione() {
  sessionStorage.setItem(SESSION_CHECK_KEY, "1");
}

export async function controllaAggiornamentoDesktop(options?: {
  silent?: boolean;
}): Promise<RisultatoControlloAggiornamenti> {
  if (!isTauri()) {
    return { aggiornato: true, messaggio: "Controllo disponibile solo nell'app desktop." };
  }

  if (import.meta.env.DEV) {
    return {
      aggiornato: true,
      messaggio: options?.silent ? "" : "In sviluppo il controllo aggiornamenti è disattivato.",
    };
  }

  try {
    const update = await check();
    if (!update) {
      return { aggiornato: true, messaggio: "Sei aggiornato." };
    }

    const note = update.body?.trim();
    return {
      aggiornato: false,
      messaggio: `Disponibile la versione ${update.version}.`,
      versioneDisponibile: update.version,
      note: note || undefined,
      update,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Impossibile controllare gli aggiornamenti.";
    if (options?.silent) return { aggiornato: true, messaggio: "" };
    return { aggiornato: true, messaggio: msg };
  }
}

export async function installaAggiornamentoDesktop(
  update: Update,
  onProgress?: (percent: number) => void,
): Promise<void> {
  let downloaded = 0;
  let contentLength = 0;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        contentLength = event.data.contentLength ?? 0;
        onProgress?.(0);
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        if (contentLength > 0) {
          onProgress?.(Math.min(100, Math.round((downloaded / contentLength) * 100)));
        }
        break;
      case "Finished":
        onProgress?.(100);
        break;
    }
  });

  await relaunch();
}

export async function controllaEProponeAggiornamentoAvvio(): Promise<void> {
  if (!isTauri() || import.meta.env.DEV || aggiornamentoGiaControllatoInSessione()) return;

  segnaAggiornamentoControllatoInSessione();

  const res = await controllaAggiornamentoDesktop({ silent: true });
  if (res.aggiornato || !res.update || !res.versioneDisponibile) return;

  const note = res.note ? `\n\n${res.note}` : "";
  const installa = window.confirm(
    `È disponibile PreventivoAI ${res.versioneDisponibile}.${note}\n\nVuoi scaricare e installare ora?`,
  );
  if (!installa) return;

  await installaAggiornamentoDesktop(res.update);
}
