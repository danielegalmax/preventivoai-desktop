import { invoke } from "@tauri-apps/api/core";
import {
  isDesktopApp,
  salvaPdfConPreferenze,
  salvaPdfInCartella,
  sanitizzaNomeCartellaWindows,
} from "./appSettings";
import { sessionToken } from "./settings";
import { trackEvento } from "./track";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export { isDesktopApp };

export interface GeneraPDFResult {
  html: string;
  versione: number;
  numeroPreventivo: string;
}

export interface GeneraPDFFileResult extends GeneraPDFResult {
  pdf_base64: string;
}

interface GeneraPDFParams {
  testo: string;
  template: string;
  token: string;
  versione_padre_id?: string | null;
  cliente_id?: string;
  nascondi_prezzi?: boolean;
}

function bodyGeneraPdf(params: GeneraPDFParams) {
  return JSON.stringify({
    testo: params.testo,
    template: params.template,
    versione_padre_id: params.versione_padre_id || null,
    cliente_id: params.cliente_id || "",
    nascondi_prezzi: params.nascondi_prezzi || false,
  });
}

export async function generaPDF(params: GeneraPDFParams): Promise<GeneraPDFResult> {
  const res = await fetch(`${BACKEND_URL}/api/genera-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.token}` },
    body: bodyGeneraPdf(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`);
  if (data.error) throw new Error(data.error);
  void trackEvento("pdf_generato", "preventivo_pdf", { template: params.template });
  return data;
}

export async function generaPDFFile(params: GeneraPDFParams): Promise<GeneraPDFFileResult> {
  const res = await fetch(`${BACKEND_URL}/api/genera-pdf-file`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.token}` },
    body: bodyGeneraPdf(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`);
  if (data.error) throw new Error(data.error);
  return data;
}

export async function creaLinkPagamento(
  preventivoId: string,
  descrizione: string,
  token: string,
): Promise<{ payment_url: string; stripe_session_id: string }> {
  const res = await fetch(`${BACKEND_URL}/api/crea-link-pagamento`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ preventivo_id: preventivoId, descrizione }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`);
  if (data.error) throw new Error(data.error);
  return { payment_url: data.payment_url, stripe_session_id: data.stripe_session_id };
}

export async function creaLinkPagamentoRata(rataId: string, clienteNome: string, token: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/crea-link-pagamento-rata`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ rata_id: rataId, cliente_nome: clienteNome }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`);
  if (data.error) throw new Error(data.error);
  return data.payment_url as string;
}

export async function salvaPDF(
  pdfBase64: string,
  token: string,
): Promise<{ pdfUrl: string; storagePath?: string }> {
  const res = await fetch(`${BACKEND_URL}/api/salva-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pdf_base64: pdfBase64 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`);
  if (data.error) throw new Error(data.error);
  if (!data.pdf_url) throw new Error("Upload PDF completato senza URL online.");
  return {
    pdfUrl: data.pdf_url as string,
    storagePath: typeof data.storage_path === "string" ? data.storage_path : undefined,
  };
}

export async function ottieniUrlPdfPreventivo(preventivoId: string, token?: string): Promise<string> {
  const auth = token || (await sessionToken());
  const res = await fetch(`${BACKEND_URL}/api/preventivi/${preventivoId}/pdf-url`, {
    headers: { Authorization: `Bearer ${auth}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`);
  if (!data.pdf_url) throw new Error("PDF non disponibile");
  return data.pdf_url as string;
}

export function formatNomeFilePdf(nomeCliente: string | undefined, numeroPreventivo: string): string {
  const numero = numeroPreventivo?.trim() || `PRV-${Date.now()}`;
  const nome = sanitizzaNomeCartellaWindows(nomeCliente || "");
  if (nome) return `${nome}_${numero}.pdf`;
  return `${numero}.pdf`;
}

export async function scaricaPdfLocale(
  pdfBase64: string,
  nomeFile: string,
  nomeCliente?: string,
): Promise<string | void> {
  if (isDesktopApp()) {
    return salvaPdfConPreferenze(pdfBase64, nomeFile, nomeCliente);
  }

  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeFile;
  link.click();
  URL.revokeObjectURL(url);
}

export async function apriPdfLocale(percorso: string): Promise<void> {
  if (isDesktopApp()) {
    try {
      await invoke("open_pdf_path", { path: percorso });
      return;
    } catch (err) {
      throw new Error(messaggioErrore(err) || "Impossibile aprire il PDF locale.");
    }
  }

  const { openPath } = await import("@tauri-apps/plugin-opener");
  try {
    await openPath(percorso);
  } catch (err) {
    throw new Error(messaggioErrore(err) || "Impossibile aprire il PDF locale.");
  }
}

/** Apre un PDF appena generato salvandolo temporaneamente (cache desktop o blob in browser). */
export async function apriPdfDaBase64(pdfBase64: string, nomeFile: string): Promise<void> {
  if (isDesktopApp()) {
    const { appCacheDir } = await import("@tauri-apps/api/path");
    const cache = await appCacheDir();
    const percorso = await salvaPdfInCartella(cache, nomeFile, pdfBase64);
    await apriPdfLocale(percorso);
    return;
  }

  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  URL.revokeObjectURL(url);
}

export async function apriPdfOnline(url: string): Promise<void> {
  if (isDesktopApp()) {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    } catch {
      // fallback browser sotto
    }
  }
  window.open(url, "_blank");
}

function messaggioErrore(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "";
}

export async function mostraPdfInCartella(percorso: string): Promise<void> {
  if (isDesktopApp()) {
    await invoke("reveal_pdf_in_folder", { path: percorso });
    return;
  }
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
  await revealItemInDir(percorso);
}

function pdfBase64ToFile(base64: string, nomeFile: string): File {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new File([bytes], nomeFile, { type: "application/pdf" });
}

async function fileDaPdf(opts: {
  pdfBase64?: string;
  pdfUrl?: string;
  percorsoLocale?: string;
  nomeFile: string;
}): Promise<File> {
  if (opts.pdfBase64) {
    return pdfBase64ToFile(opts.pdfBase64, opts.nomeFile);
  }

  if (opts.pdfUrl) {
    const res = await fetch(opts.pdfUrl);
    if (!res.ok) throw new Error("Impossibile scaricare il PDF online.");
    const blob = await res.blob();
    return new File([blob], opts.nomeFile, { type: "application/pdf" });
  }

  if (opts.percorsoLocale && isDesktopApp()) {
    const bytes = await invoke<number[]>("read_file_bytes", { path: opts.percorsoLocale });
    return new File([new Uint8Array(bytes)], opts.nomeFile, { type: "application/pdf" });
  }

  throw new Error("Nessun file PDF disponibile da condividere.");
}

/**
 * Condivisione file tramite pannello di sistema Windows (Web Share API).
 * Mostra app installate: Mail, Outlook, WhatsApp desktop, ecc.
 * Non apre WhatsApp Web nel browser con allegato già pronto.
 */
export async function condividiPdf(opts: {
  percorsoLocale?: string;
  pdfUrl?: string;
  pdfBase64?: string;
  nomeFile?: string;
}): Promise<string> {
  const nomeFile = opts.nomeFile || "preventivo.pdf";
  const file = await fileDaPdf({ ...opts, nomeFile });

  if (!navigator.share) {
    throw new Error(
      "Condivisione non supportata. Usa «Mostra nella cartella» e allega il file manualmente.",
    );
  }

  const payload: ShareData = { files: [file], title: nomeFile.replace(/\.pdf$/i, "") };
  if (navigator.canShare && !navigator.canShare(payload)) {
    throw new Error(
      "Il sistema non consente la condivisione del file. Usa «Mostra nella cartella» e allega il PDF.",
    );
  }

  await navigator.share(payload);
  return "Scegli l'app per inviare il PDF.";
}

/** Evita logo vecchio in cache: l'URL Supabase non cambia dopo un nuovo upload. */
export function aggiornaLogoCacheInHtml(html: string): string {
  const v = Date.now();
  return html.replace(/(<img[^>]*\ssrc=")([^"?]*\/loghi\/[^"?]+)(")/gi, `$1$2?v=${v}$3`);
}
