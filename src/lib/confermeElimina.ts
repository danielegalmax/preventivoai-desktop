import type { CollegamentiPianoMap } from "./collegamentiPiano";
import { CESTINO_GIORNI } from "./cestino";

const notaCestino = `Gli elementi resteranno nel Cestino per ${CESTINO_GIORNI} giorni e potranno essere ripristinati.`;

export function messaggioEliminaPreventivoSingolo(haPianoCollegato: boolean): string {
  if (haPianoCollegato) {
    return `Sei sicuro di voler cancellare questo preventivo? Verranno cancellati anche abbonamento/pagamento a rate connesso.\n\n${notaCestino}`;
  }
  return `Sei sicuro di voler eliminare questo preventivo?\n\n${notaCestino}`;
}

export function messaggioEliminaPreventiviMultipli(
  count: number,
  ids: string[],
  collegamentiPiano: CollegamentiPianoMap,
): string {
  const conPiano = ids.filter((id) => !!collegamentiPiano[id]).length;
  if (count === 1) {
    return messaggioEliminaPreventivoSingolo(conPiano > 0);
  }
  if (conPiano > 0) {
    return `Sei sicuro di voler eliminare ${count} preventivi? ${conPiano} ${conPiano === 1 ? "ha un piano collegato" : "hanno un piano collegato"} (abbonamento o pagamento a rate) che verrà cancellato.\n\n${notaCestino}`;
  }
  return `Sei sicuro di voler eliminare ${count} preventivi selezionati?\n\n${notaCestino}`;
}

export function messaggioEliminaPiano(tipo: "rate" | "canone", count = 1): string {
  const etichetta = count === 1
    ? (tipo === "rate" ? "il piano a rate selezionato" : "l'abbonamento selezionato")
    : count === 2
      ? (tipo === "rate" ? "i 2 piani a rate selezionati" : "i 2 abbonamenti selezionati")
      : (tipo === "rate" ? `i ${count} piani a rate selezionati` : `i ${count} abbonamenti selezionati`);

  return `Sei sicuro di voler eliminare ${etichetta}?\n\n${notaCestino}`;
}

export function messaggioEliminaDefinitiva(count: number, tipo: "preventivo" | "piano"): string {
  const cosa = tipo === "preventivo"
    ? (count === 1 ? "questo preventivo" : `questi ${count} preventivi`)
    : (count === 1 ? "questo piano/abbonamento" : `questi ${count} piani/abbonamenti`);
  return `Eliminare definitivamente ${cosa}? Non sarà più possibile ripristinarli.`;
}

export function messaggioRipristina(count: number, tipo: "preventivo" | "piano"): string {
  const cosa = tipo === "preventivo"
    ? (count === 1 ? "questo preventivo" : `questi ${count} preventivi`)
    : (count === 1 ? "questo piano/abbonamento" : `questi ${count} piani/abbonamenti`);
  return `Ripristinare ${cosa}?`;
}
