import { invoke } from "@tauri-apps/api/core";
import {
  isDesktopApp,
  salvaPdfConPreferenze,
  sanitizzaNomeCartellaWindows,
} from "./appSettings";

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

export async function creaLinkPagamento(importo: number, descrizione: string, token: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/crea-link-pagamento`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ importo, descrizione }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`);
  if (data.error) throw new Error(data.error);
  return data.payment_url as string;
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

export async function salvaPDF(pdfBase64: string, token: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/salva-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pdf_base64: pdfBase64 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`);
  if (data.error) throw new Error(data.error);
  return data.pdf_url;
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
  const { openPath } = await import("@tauri-apps/plugin-opener");
  await openPath(percorso);
}

export async function mostraPdfInCartella(percorso: string): Promise<void> {
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
