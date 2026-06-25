import type { TrasfertaBuilder, VoceBuilder } from "./builder";
import type { MetodoPagamento } from "./pagamenti";
import type { NuovoManualeDraft, PianoPagamentoTipo } from "./nuovoDraft";
import type { RateAccontoTipo } from "preventivoai-shared";

type NuovoManualeDraftInput = {
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
  clienteNome?: string;
  preventivo: string;
  template: string;
  pdfUrl: string;
  nascondiPrezzi: boolean;
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
  scontoAttivo: boolean;
  scontoTipo: "percentuale" | "fisso";
  scontoValore: string;
};

export function buildNuovoManualeDraft(
  state: NuovoManualeDraftInput,
  override: Partial<NuovoManualeDraft> = {},
): NuovoManualeDraft {
  return {
    voci: state.voci,
    trasferte: state.trasferte,
    mostraTrasferte: state.mostraTrasferte,
    metodoPagamentoSelezionato: state.metodoPagamentoSelezionato,
    metodoPagamentoNessuno: state.metodoPagamentoNessuno,
    includiIva: state.includiIva,
    noteExtra: state.noteExtra,
    mostraFiscale: state.mostraFiscale,
    nettoDesiderato: state.nettoDesiderato,
    lordoCalcolato: state.lordoCalcolato,
    storicoVoci: state.storicoVoci,
    clienteSelezionatoId: state.clienteSelezionatoId,
    clienteNome: state.clienteNome,
    preventivo: state.preventivo,
    template: state.template,
    pdfUrl: state.pdfUrl,
    nascondiPrezzi: state.nascondiPrezzi,
    pianoPagamentoTipo: state.pianoPagamentoTipo,
    abImporto: state.abImporto,
    abGiorno: state.abGiorno,
    abMeseInizio: state.abMeseInizio,
    abMensilita: state.abMensilita,
    abVisibileNelPDF: state.abVisibileNelPDF,
    rateNumero: state.rateNumero,
    rateGiornoScadenza: state.rateGiornoScadenza,
    rateMeseInizio: state.rateMeseInizio,
    rateVisibileNelPDF: state.rateVisibileNelPDF,
    rateAccontoTipo: state.rateAccontoTipo,
    rateAccontoValore: state.rateAccontoValore,
    scontoAttivo: state.scontoAttivo,
    scontoTipo: state.scontoTipo,
    scontoValore: state.scontoValore,
    ...override,
  };
}
