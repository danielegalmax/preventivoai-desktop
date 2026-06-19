export interface Cliente {
  id: string;
  nome: string;
  telefono: string | null;
  email: string | null;
  indirizzo: string | null;
  note?: string | null;
  created_at?: string;
  num_preventivi?: number;
}

export interface Preventivo {
  id: string;
  titolo: string | null;
  stato: string;
  importo_totale: number | null;
  created_at: string;
  pagato: boolean;
  cliente_id?: string | null;
  nome_cliente?: string | null;
  pdf_url?: string | null;
  testo_preventivo?: string | null;
  data_pagamento?: string | null;
  versione?: number | null;
  preventivo_padre_id?: string | null;
  deleted_at?: string | null;
}

export interface Abbonamento {
  id: string;
  cliente_id: string;
  importo_default: number;
  giorno_scadenza: number;
  attivo: boolean;
  preventivo_id: string | null;
  numero_mensilita: number | null;
  note: string | null;
  tipo: "canone" | "rate";
  nome: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
}

export type PreventivoMadre = {
  id: string;
  titolo: string | null;
  created_at: string;
  versione: number | null;
  importo_totale: number | null;
  stato: string;
};

export interface RataAbbonamento {
  id: string;
  abbonamento_id: string;
  mese: number;
  anno: number;
  importo: number;
  acconto: number;
  saldo_residuo: number;
  stato: "da_incassare" | "parziale" | "incassato" | "in_ritardo";
  data_incasso: string | null;
  note: string | null;
}

export interface Messaggio {
  role: "user" | "assistant";
  content: string;
}

export interface Servizio {
  id: string;
  nome: string;
  descrizione: string | null;
  costo: number | null;
  unita: string;
  ordine: number;
}

export interface ProfiloFiscale {
  id?: string;
  regime: "forfettario" | "ordinario" | "occasionale";
  coefficiente_redditivita: string;
  aliquota_sostitutiva: string;
  inps_percentuale: string;
  inps_tipo: string;
  riduzione_contributiva: boolean;
  riduzione_percentuale: string;
  rivalsa_inps: boolean;
  rivalsa_percentuale: string;
  soglia_fatturato: string;
  aliquota_iva: string;
  costi_deducibili_percentuale: string;
  ritenuta_acconto: string;
  soglia_occasionale: string;
  attivo?: boolean;
}

export interface RisultatoFiscale {
  regime: string;
  lordo: number;
  netto: number;
  rivalsa: number;
  totaleCliente: number;
  imponibile: number;
  contributi: number;
  imposta: number;
  iva: number;
  irpef: number;
  ritenuta: number;
}
