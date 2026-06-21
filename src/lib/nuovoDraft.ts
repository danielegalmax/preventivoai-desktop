import type { TrasfertaBuilder, VoceBuilder } from "./builder";
import type { MetodoPagamento } from "./pagamenti";
import type { Messaggio } from "./types";
import type { RateAccontoTipo } from "preventivoai-shared";

export type PianoPagamentoTipo = "nessuno" | "acconto" | "rate" | "abbonamento";

const CHAT_KEY = "preventivoai-nuovo-chat";
const MANUALE_KEY = "preventivoai-nuovo-manuale";

export type NuovoChatDraft = {
  messaggi: Messaggio[];
  input: string;
  recap: string;
  preventivo: string;
  clienteSelezionatoId: string;
  template: string;
  pdfUrl: string;
};

export type NuovoManualeDraft = {
  voci: VoceBuilder[];
  trasferte: TrasfertaBuilder[];
  mostraTrasferte: boolean;
  metodoPagamentoSelezionato: MetodoPagamento | null;
  metodoPagamentoNessuno: boolean;
  includiIva: boolean;
  noteExtra: string;
  mostraFiscale: boolean;
  nettoDesiderato: string;
  lordoCalcolato: number | null;
  storicoVoci: VoceBuilder[][];
  clienteSelezionatoId: string;
  preventivo: string;
  template: string;
  pdfUrl: string;
  pianoPagamentoTipo: PianoPagamentoTipo;
  abImporto: string;
  abGiorno: string;
  abMeseInizio: string;
  abMensilita: string;
  abVisibileNelPDF: boolean;
  rateNumero: string;
  rateGiornoScadenza: string;
  rateMeseInizio: string;
  rateVisibileNelPDF: boolean;
  rateAccontoTipo: RateAccontoTipo;
  rateAccontoValore: string;
};

/** Bozze salvate prima di pianoPagamentoTipo unificato. */
type NuovoManualeDraftLegacy = NuovoManualeDraft & {
  abbonamentoAttivo?: boolean;
  pagamentoRateAttivo?: boolean;
  rateModalita?: "rate_uguali" | "acconto_saldo";
};

export function pianoPagamentoTipoDaBozza(
  draft: Partial<NuovoManualeDraftLegacy>,
): PianoPagamentoTipo {
  if (draft.pianoPagamentoTipo) return draft.pianoPagamentoTipo;
  if (draft.abbonamentoAttivo) return "abbonamento";
  if (draft.pagamentoRateAttivo) {
    return draft.rateModalita === "acconto_saldo" ? "acconto" : "rate";
  }
  return "nessuno";
}

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

function remove(key: string) {
  localStorage.removeItem(key);
}

function bozzaChatVuota(d: NuovoChatDraft): boolean {
  return (
    d.messaggi.length === 0 &&
    !d.input.trim() &&
    !d.recap &&
    !d.preventivo &&
    !d.clienteSelezionatoId
  );
}

function bozzaManualeVuota(d: NuovoManualeDraft): boolean {
  return (
    !d.preventivo &&
    !d.noteExtra.trim() &&
    !d.clienteSelezionatoId &&
    !d.voci.some((v) => v.nome.trim())
  );
}

export function caricaBozzaChat(): NuovoChatDraft | null {
  return load<NuovoChatDraft>(CHAT_KEY);
}

export function salvaBozzaChat(draft: NuovoChatDraft) {
  if (bozzaChatVuota(draft)) {
    remove(CHAT_KEY);
    return;
  }
  save(CHAT_KEY, draft);
}

export function cancellaBozzaChat() {
  remove(CHAT_KEY);
}

export function caricaBozzaManuale(): NuovoManualeDraft | null {
  return load<NuovoManualeDraft>(MANUALE_KEY);
}

export function salvaBozzaManuale(draft: NuovoManualeDraft) {
  if (bozzaManualeVuota(draft)) {
    remove(MANUALE_KEY);
    return;
  }
  save(MANUALE_KEY, draft);
}

export function cancellaBozzaManuale() {
  remove(MANUALE_KEY);
}
