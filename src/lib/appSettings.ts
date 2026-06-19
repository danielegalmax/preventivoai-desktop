import { invoke, isTauri } from "@tauri-apps/api/core";
import { getVersion, getBundleType } from "@tauri-apps/api/app";
import { basename, desktopDir, dirname, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

export const CARTELLA_PDF_ROOT_NAME = "Preventivo AI - Preventivi PDF";

const PDF_CARTELLE_CLIENTE_KEY = "preventivoai-pdf-cartelle-cliente";
const PDF_CARTELLA_CUSTOM_KEY = "preventivoai-pdf-cartella-custom";
const PDF_SALVATAGGIO_MODALITA_KEY = "preventivoai-pdf-salvataggio-modalita";

export type PdfSalvataggioModalita = "cartella" | "chiedi_ogni_volta";

export function isDesktopApp(): boolean {
  return isTauri();
}

export function getPdfCartelleCliente(): boolean {
  const raw = localStorage.getItem(PDF_CARTELLE_CLIENTE_KEY);
  if (raw === null) return true;
  return raw === "true";
}

export function setPdfCartelleCliente(abilitato: boolean) {
  localStorage.setItem(PDF_CARTELLE_CLIENTE_KEY, String(abilitato));
}

export function getPdfCartellaCustom(): string {
  return localStorage.getItem(PDF_CARTELLA_CUSTOM_KEY) || "";
}

export function setPdfCartellaCustom(path: string) {
  if (path) localStorage.setItem(PDF_CARTELLA_CUSTOM_KEY, path);
  else localStorage.removeItem(PDF_CARTELLA_CUSTOM_KEY);
}

export function getPdfSalvataggioModalita(): PdfSalvataggioModalita {
  return localStorage.getItem(PDF_SALVATAGGIO_MODALITA_KEY) === "chiedi_ogni_volta"
    ? "chiedi_ogni_volta"
    : "cartella";
}

export function setPdfSalvataggioModalita(modalita: PdfSalvataggioModalita) {
  localStorage.setItem(PDF_SALVATAGGIO_MODALITA_KEY, modalita);
}

export function sanitizzaNomeCartellaWindows(nome: string): string {
  return (
    nome
      .trim()
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, " ")
      .replace(/\.+$/, "")
      .slice(0, 120) || ""
  );
}

export async function cartellaPdfPredefinita(): Promise<string> {
  if (!isTauri()) return "";
  const desktop = await desktopDir();
  return join(desktop, CARTELLA_PDF_ROOT_NAME);
}

/** Cartella base effettiva: personalizzata o predefinita sul Desktop. */
export async function cartellaPdfBase(): Promise<string> {
  const personalizzata = getPdfCartellaCustom();
  if (personalizzata) return personalizzata;
  return cartellaPdfPredefinita();
}

/** Cartella di salvataggio in base alle preferenze utente. */
export async function risolviCartellaPdfSalvataggio(nomeCliente?: string): Promise<string> {
  const base = await cartellaPdfBase();
  if (!getPdfCartelleCliente()) return base;

  const nome = sanitizzaNomeCartellaWindows(nomeCliente || "");
  if (!nome) return base;
  return join(base, nome);
}

export async function scegliCartellaPdfCustom(): Promise<string | null> {
  if (!isTauri()) return null;
  const defaultPath = getPdfCartellaCustom() || (await cartellaPdfPredefinita()) || undefined;
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Scegli cartella per i PDF",
    defaultPath,
  });
  if (typeof selected === "string" && selected) {
    setPdfCartellaCustom(selected);
    return selected;
  }
  return null;
}

/** Dialog Salva con nome: restituisce il percorso completo scelto dall'utente. */
export async function scegliPercorsoSalvaPdf(
  nomeFile: string,
  cartellaSuggerita: string,
): Promise<string | null> {
  if (!isTauri()) return null;
  const defaultPath = cartellaSuggerita ? await join(cartellaSuggerita, nomeFile) : nomeFile;
  const selected = await save({
    title: "Salva preventivo PDF",
    defaultPath,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  return typeof selected === "string" && selected ? selected : null;
}

export async function salvaPdfConPreferenze(
  pdfBase64: string,
  nomeFile: string,
  nomeCliente?: string,
): Promise<string | undefined> {
  if (!isTauri()) return undefined;

  const cartellaSuggerita = await risolviCartellaPdfSalvataggio(nomeCliente);

  if (getPdfSalvataggioModalita() === "chiedi_ogni_volta") {
    const percorso = await scegliPercorsoSalvaPdf(nomeFile, cartellaSuggerita);
    if (!percorso) return undefined;
    const dir = await dirname(percorso);
    const file = await basename(percorso);
    return salvaPdfInCartella(dir, file, pdfBase64);
  }

  return salvaPdfInCartella(cartellaSuggerita, nomeFile, pdfBase64);
}

export async function salvaPdfInCartella(cartella: string, nomeFile: string, pdfBase64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  return invoke<string>("write_pdf_file", {
    cartella,
    nomeFile,
    bytes: Array.from(bytes),
  });
}

export async function leggiAutostartAbilitato(): Promise<boolean> {
  if (!isTauri()) return false;
  return isEnabled();
}

export async function impostaAutostart(abilitato: boolean): Promise<void> {
  if (!isTauri()) return;
  if (abilitato) await enable();
  else await disable();
}

export async function leggiInfoApp(): Promise<{ versione: string; build: string }> {
  if (!isTauri()) {
    return { versione: import.meta.env.VITE_APP_VERSION || "0.1.0", build: "browser" };
  }
  const versione = await getVersion();
  let build = import.meta.env.DEV ? "sviluppo" : "release";
  try {
    const bundleType = await getBundleType();
    build = bundleType;
  } catch {
    // in dev getBundleType può non essere disponibile
  }
  return { versione, build };
}

export type { RisultatoControlloAggiornamenti } from "./appUpdater";
export { controllaAggiornamentoDesktop as controllaAggiornamenti, installaAggiornamentoDesktop } from "./appUpdater";
