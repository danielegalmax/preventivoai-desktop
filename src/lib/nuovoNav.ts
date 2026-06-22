import {
  cancellaTutteLeBozzeNuovo,
  infoBozzaNuovoInSospeso,
  percorsoRipresaBozzaNuovo,
  type BozzaNuovoInfo,
} from "./nuovoDraft";
import {
  getRememberedPath,
  pathToSection,
  resetRememberedPath,
  resolveSidebarTarget,
} from "./navMemory";

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

export function percorsoNuovoPreventivo(currentPathname: string): string {
  return resolveSidebarTarget("nuovo", currentPathname);
}

export function percorsoRipresaBozza(info: BozzaNuovoInfo): string {
  const remembered = getRememberedPath("nuovo");
  if (
    remembered !== "/nuovo" &&
    pathToSection(remembered) === "nuovo" &&
    ((info.mode === "chat" && remembered.includes("/chat")) ||
      (info.mode === "manuale" && remembered.includes("/manuale")))
  ) {
    return remembered;
  }
  return percorsoRipresaBozzaNuovo(info.mode);
}

export function percorsoNuovoPreventivoVuoto(clienteId?: string): string {
  cancellaTutteLeBozzeNuovo();
  resetRememberedPath("nuovo");
  return clienteId ? `/nuovo?cliente_id=${encodeURIComponent(clienteId)}` : "/nuovo";
}
