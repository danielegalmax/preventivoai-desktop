import { importoDaTesto, type RateAccontoTipo, type RateModalitaPiano } from "preventivoai-shared";
import type { MetodoPagamento } from "./pagamenti";
import {
  creaAbbonamentoDaPreventivo,
  creaPianoRateDaPreventivo,
  testoConPagamento,
  type ClientePreventivo,
} from "./preventivoPdfPiani";

export type PreparaTestoPdfParams = {
  testo: string;
  token: string;
  mode: "chat" | "manuale";
  totaleConIva: number;
  abbonamentoAttivo: boolean;
  abVisibileNelPDF: boolean;
  abImporto: string;
  abGiorno: string;
  abMeseInizio: string;
  pagamentoRateAttivo: boolean;
  rateVisibileNelPDF: boolean;
  rateNumero: string;
  rateGiornoScadenza: string;
  rateMeseInizio: string;
  rateModalita: RateModalitaPiano;
  rateAccontoTipo: RateAccontoTipo;
  rateAccontoValore: string;
  accontoLinkPrecomputato?: string;
  metodoPagamento: MetodoPagamento | null;
};

export async function preparaTestoPerPdfNuovo(params: PreparaTestoPdfParams): Promise<string> {
  const {
    testo,
    token,
    mode,
    totaleConIva,
    abbonamentoAttivo,
    abVisibileNelPDF,
    abImporto,
    abGiorno,
    abMeseInizio,
    pagamentoRateAttivo,
    rateVisibileNelPDF,
    rateNumero,
    rateGiornoScadenza,
    rateMeseInizio,
    rateModalita,
    rateAccontoTipo,
    rateAccontoValore,
    accontoLinkPrecomputato,
    metodoPagamento,
  } = params;

  if (!token) return testo;

  const importoRate = mode === "manuale"
    ? totaleConIva
    : (importoDaTesto(testo) || 0);

  return testoConPagamento({
    testo,
    abbonamentoAttivo,
    abVisibileNelPDF,
    abImporto,
    abGiorno,
    abMeseInizio: parseInt(abMeseInizio, 10) || 0,
    pagamentoRateAttivo,
    rateVisibileNelPDF,
    rateImportoTotale: importoRate,
    rateNumero: parseInt(rateNumero, 10) || 0,
    rateGiornoScadenza: parseInt(rateGiornoScadenza, 10) || 0,
    rateMeseInizio: parseInt(rateMeseInizio, 10) || 0,
    rateModalita,
    rateAccontoTipo,
    rateAccontoValore,
    accontoLinkPrecomputato,
    metodoPagamento,
    token,
  });
}

export type CreaPianiDopoSalvataggioParams = {
  preventivoId: string;
  cliente: ClientePreventivo | undefined;
  abbonamentoAttivo: boolean;
  abImporto: string;
  abGiorno: string;
  abMeseInizio: string;
  abMensilita: string;
  pagamentoRateAttivo: boolean;
  rateModalita: RateModalitaPiano;
  mode: "chat" | "manuale";
  totaleConIva: number;
  preventivo: string;
  rateNumero: string;
  rateGiornoScadenza: string;
  rateMeseInizio: string;
};

export async function creaPianiDopoSalvataggioNuovo(params: CreaPianiDopoSalvataggioParams) {
  const {
    preventivoId,
    cliente,
    abbonamentoAttivo,
    abImporto,
    abGiorno,
    abMeseInizio,
    abMensilita,
    pagamentoRateAttivo,
    rateModalita,
    mode,
    totaleConIva,
    preventivo,
    rateNumero,
    rateGiornoScadenza,
    rateMeseInizio,
  } = params;

  if (!cliente) return;

  try {
    if (abbonamentoAttivo) {
      const r = await creaAbbonamentoDaPreventivo({
        cliente,
        preventivoId,
        importoRaw: abImporto,
        giornoRaw: abGiorno,
        meseInizioRaw: abMeseInizio,
        mensilitaRaw: abMensilita,
      });
      if (r.esistente) {
        window.alert("Questo preventivo ha già un piano collegato. Gestiscilo dalla cartella cliente.");
      }
    }

    if (pagamentoRateAttivo && rateModalita !== "acconto_saldo") {
      const importoRate = mode === "manuale"
        ? totaleConIva
        : (importoDaTesto(preventivo) || 0);
      const r = await creaPianoRateDaPreventivo({
        cliente,
        preventivoId,
        importoTotale: importoRate,
        numeroRateRaw: rateNumero,
        giornoScadenzaRaw: rateGiornoScadenza,
        meseInizioRaw: rateMeseInizio,
      });
      if (r.esistente) {
        window.alert("Questo preventivo ha già un piano a rate collegato. Gestiscilo dalla cartella cliente.");
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore nella creazione del piano.";
    window.alert(`Piano incompleto: ${msg}`);
  }
}
