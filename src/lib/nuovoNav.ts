import {
  cancellaTutteLeBozzeNuovo,
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
