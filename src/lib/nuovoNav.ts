import {
  cancellaTutteLeBozzeNuovo,
  infoBozzaNuovoInSospeso,
  percorsoRipresaBozzaNuovo,
  type BozzaNuovoInfo,
} from "./nuovoDraft";
import { getPercorsoRipresaNuovo, resetPercorsoRipresaNuovo } from "./nuovoRipresaPath";
import { getSectionRoot, pathToSection } from "./navMemory";

export function messaggioBozzaInSospeso(info: BozzaNuovoInfo): string {
  if (info.clienteNome) {
    return `Hai un preventivo in corso per ${info.clienteNome}.\n\nVuoi riprenderlo o iniziare da zero?`;
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

export function percorsoNuovoPreventivoVuoto(clienteId?: string): string {
  cancellaTutteLeBozzeNuovo();
  resetPercorsoRipresaNuovo();
  return clienteId ? `/nuovo?cliente_id=${encodeURIComponent(clienteId)}` : "/nuovo";
}
