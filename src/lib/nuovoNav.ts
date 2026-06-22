/**
 * Navigazione e intercettazione bozza "Nuovo preventivo".
 *
 * Moduli del flusso /nuovo (7 pezzi, responsabilità separate):
 * - `Nuovo.tsx` — orchestra UI, stato React, autosave, PDF
 * - `nuovoDraft.ts` — persistenza bozza in localStorage (chat + manuale)
 * - `nuovoBozzaSnapshot.ts` — costruisce lo snapshot immutabile del builder manuale
 * - `nuovoPianiPagamento.ts` — creazione piani rate/abbonamento dopo salvataggio
 * - `nuovo.ts` — API Supabase (clienti selezione, salva preventivo generato)
 * - `nuovoRipresaPath.ts` + `NuovoRipresaPathTracker` — ultimo sotto-percorso /nuovo/*
 * - questo file + `NuovoPreventivoNavProvider` — intercetta click sidebar con bozza attiva
 *
 * Flusso tipico: utente lavora in Nuovo → `nuovoDraft` salva → esce → sidebar chiama
 * `bozzaNuovoDaIntercettare` → dialog ripresa → `percorsoRipresaBozza` usa path salvato
 * o default per mode.
 */
import {  cancellaTutteLeBozzeNuovo,
  infoBozzaNuovoInSospeso,
  percorsoRipresaBozzaNuovo,
  type BozzaNuovoInfo,
} from "./nuovoDraft";
import { getPercorsoRipresaNuovo, resetPercorsoRipresaNuovo } from "./nuovoRipresaPath";
import { getSectionRoot, pathToSection } from "./navMemory";

export function messaggioBozzaInSospeso(info: BozzaNuovoInfo): string {
  const nome = info.clienteNome?.trim();
  const clienteLabel = nome || (info.clienteId ? `il cliente selezionato (ID: ${info.clienteId})` : "");
  if (clienteLabel) {
    return `Hai un preventivo in corso per ${clienteLabel}.\n\nVuoi riprenderlo o iniziare da zero?`;
  }
  return "Hai un preventivo in corso non ancora generato.\n\nVuoi riprenderlo o iniziare da zero?";
}

export function bozzaNuovoDaIntercettare(currentPathname: string): BozzaNuovoInfo | null {
  if (pathToSection(currentPathname) === "nuovo") return null;
  return infoBozzaNuovoInSospeso();
}

export function percorsoNuovoPreventivo(): string {
  return getSectionRoot("nuovo");
}

export function queryClienteNuovoPreventivo(clienteId?: string, clienteNome?: string): string {
  if (!clienteId) return "";
  const params = new URLSearchParams();
  params.set("cliente_id", clienteId);
  if (clienteNome?.trim()) params.set("cliente_nome", clienteNome.trim());
  return `?${params.toString()}`;
}

export function percorsoNuovoPreventivoHub(clienteId?: string, clienteNome?: string): string {
  return `/nuovo${queryClienteNuovoPreventivo(clienteId, clienteNome)}`;
}

export function percorsoRipresaBozza(info: BozzaNuovoInfo): string {
  const ripresa = getPercorsoRipresaNuovo();
  if (
    ripresa &&
    ((info.mode === "chat" && ripresa.includes("/chat")) ||
      (info.mode === "manuale" && ripresa.includes("/manuale")))
  ) {
    return ripresa;
  }
  return percorsoRipresaBozzaNuovo(info.mode);
}

export function percorsoNuovoPreventivoVuoto(clienteId?: string, clienteNome?: string): string {
  cancellaTutteLeBozzeNuovo();
  resetPercorsoRipresaNuovo();
  return percorsoNuovoPreventivoHub(clienteId, clienteNome);
}
