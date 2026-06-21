import type { RateAccontoTipo, RateModalitaPiano } from "preventivoai-shared";
import { supabase } from "./supabase";
import { erroreColonnaDeletedAt } from "preventivoai-shared";
import { creaLinkPagamento } from "./pdf";
import type { MetodoPagamento } from "./pagamenti";
import {
  creaAbbonamentoDaPreventivo as creaAbbonamentoCore,
  creaPianoRateDaPreventivo as creaPianoRateCore,
  agganciaPianoAPreventivo as agganciaPianoCore,
  testoConPagamento as testoConPagamentoShared,
  type PreventivoPianiDb,
} from "preventivoai-shared";

async function esistePianoAttivo(preventivoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("abbonamenti")
    .select("id")
    .eq("preventivo_id", preventivoId)
    .eq("attivo", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error && erroreColonnaDeletedAt(error)) {
    const { data: fallback } = await supabase
      .from("abbonamenti")
      .select("id")
      .eq("preventivo_id", preventivoId)
      .eq("attivo", true)
      .maybeSingle();
    return !!fallback;
  }

  return !!data;
}

const preventivoPianiDb: PreventivoPianiDb = {
  async getUserId() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  },
  esistePianoAttivo,
  async fetchPreventivo(preventivoId) {
    const { data } = await supabase
      .from("preventivi")
      .select("titolo, created_at, versione")
      .eq("id", preventivoId)
      .single();
    return data ?? null;
  },
  async insertAbbonamento(row) {
    const { data, error } = await supabase.from("abbonamenti").insert(row).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Inserimento abbonamento fallito.");
    return { id: data.id as string };
  },
  async insertRate(rows) {
    const { error } = await supabase.from("rate_abbonamento").insert(rows);
    if (error) throw new Error(error.message);
  },
  async agganciaPianoAPreventivo(abbonamentoId, preventivoId) {
    const { error } = await supabase
      .from("abbonamenti")
      .update({ preventivo_id: preventivoId })
      .eq("id", abbonamentoId);
    return !error;
  },
};

export type ClientePreventivo = { id: string; nome: string };

export async function creaAbbonamentoDaPreventivo(params: {
  cliente: ClientePreventivo;
  preventivoId: string;
  importoRaw: string;
  giornoRaw: string;
  meseInizioRaw: string;
  mensilitaRaw: string;
}) {
  return creaAbbonamentoCore(preventivoPianiDb, params);
}

export async function creaPianoRateDaPreventivo(params: {
  cliente: ClientePreventivo;
  preventivoId: string | null;
  importoTotale: number;
  numeroRateRaw: string;
  giornoScadenzaRaw: string;
  meseInizioRaw: string;
  importiPersonalizzati?: number[];
}) {
  return creaPianoRateCore(preventivoPianiDb, params);
}

export async function agganciaPianoAPreventivo(abbonamentoId: string, preventivoId: string) {
  return agganciaPianoCore(preventivoPianiDb, abbonamentoId, preventivoId);
}

type TestoConPagamentoParams = {
  testo: string;
  abbonamentoAttivo: boolean;
  abVisibileNelPDF: boolean;
  abImporto: string;
  abGiorno?: string;
  abMeseInizio?: number;
  pagamentoRateAttivo?: boolean;
  rateVisibileNelPDF?: boolean;
  rateImportoTotale?: number;
  rateNumero?: number;
  rateGiornoScadenza?: number;
  rateMeseInizio?: number;
  rateModalita?: RateModalitaPiano;
  rateAccontoTipo?: RateAccontoTipo;
  rateAccontoValore?: string;
  accontoLinkPrecomputato?: string;
  metodoPagamento: MetodoPagamento | null;
  token: string;
};

export async function testoConPagamento(params: TestoConPagamentoParams) {
  return testoConPagamentoShared({ ...params, creaLinkPagamento });
}
