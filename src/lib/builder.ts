import { parseImportoEuro } from "./importo";
import type { MetodoPagamento } from "./pagamenti";

export interface VoceBuilder {
  id: string;
  nome: string;
  descrizione: string;
  costo: string;
  quantita: string;
  unita: string;
  salvaNelListino?: boolean;
  salvataNelListino?: boolean;
}

export type TrasfertaBuilder = {
  id: string;
  tipo: "km" | "spesa";
  nome: string;
  importo: string;
  km?: string;
  esente: boolean;
};

export function isVoceCustom(v: VoceBuilder): boolean {
  return v.id.startsWith("custom-");
}

export function formatImportoEuroVisuale(valore: number): string {
  return valore.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Formatta un importo numerico per il campo costo (es. dal listino). */
export function formatImportoVoce(valore: number): string {
  return formatImportoEuroVisuale(valore);
}

function parseQuantita(raw: string): number {
  const val = parseImportoEuro(raw);
  return val != null && val > 0 ? val : 1;
}

function parseCosto(raw: string): number {
  return parseImportoEuro(raw) ?? 0;
}

export function calcolaTotaleVoci(voci: VoceBuilder[]): number {
  return voci.reduce((acc, v) => acc + parseCosto(v.costo) * parseQuantita(v.quantita), 0);
}

export function calcolaTotaleTrasferte(trasferte: TrasfertaBuilder[]): number {
  return trasferte.reduce((acc, t) => acc + (parseImportoEuro(t.importo) ?? 0), 0);
}

export function generaTestoPreventivoBuilder(params: {
  nomeCliente: string;
  voci: VoceBuilder[];
  trasferte?: TrasfertaBuilder[];
  includiIva: boolean;
  noteExtra: string;
  metodoPagamentoSelezionato?: MetodoPagamento | null;
}): string {
  const {
    nomeCliente,
    voci,
    trasferte = [],
    includiIva,
    noteExtra,
    metodoPagamentoSelezionato = null,
  } = params;
  const oggi = new Date().toLocaleDateString("it-IT");
  let testo = `PREVENTIVO\nData: ${oggi}  |  Validita': 30 giorni\n`;
  if (nomeCliente) testo += `Cliente: ${nomeCliente}\n`;
  testo += `\nSERVIZI:\n`;
  voci.forEach((v) => {
    const qty = parseQuantita(v.quantita);
    const costo = parseCosto(v.costo);
    const totaleVoce = qty * costo;
    testo += `\nSERVIZIO: ${v.nome}\n`;
    if (v.descrizione) testo += `DETTAGLI:\n- ${v.descrizione}\n`;
    if (qty > 1) testo += `DETTAGLI:\n- ${qty} ${v.unita}\n`;
    testo += `PREZZO: \u20ac${formatImportoEuroVisuale(totaleVoce)}\n`;
  });
  if (trasferte.length > 0) {
    testo += `\nRIMBORSI SPESE:\n`;
    trasferte.forEach((t) => {
      if (t.tipo === "km") {
        const importoKm = parseImportoEuro(t.importo) ?? 0;
        testo += `RIMBORSO: Trasferta km\nDETTAGLIO: ${t.km} km \u00d7 \u20ac0.25 = \u20ac${formatImportoEuroVisuale(importoKm)}\nTIPO: ${t.esente ? "Esente" : "Imponibile"}\n`;
      } else {
        const importoSpesa = parseImportoEuro(t.importo) ?? 0;
        testo += `RIMBORSO: ${t.nome}\nDETTAGLIO: Spesa viva\nTIPO: ${t.esente ? "Esente" : "Imponibile"}\nIMPORTO: \u20ac${formatImportoEuroVisuale(importoSpesa)}\n`;
      }
    });
  }
  const totaleFinale = calcolaTotaleVoci(voci) + calcolaTotaleTrasferte(trasferte);
  testo += `\nRIEPILOGO:\n`;
  if (includiIva) {
    testo += `Imponibile: \u20ac${formatImportoEuroVisuale(totaleFinale)}\nIVA 22%: \u20ac${formatImportoEuroVisuale(totaleFinale * 0.22)}\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nTOTALE: \u20ac${formatImportoEuroVisuale(totaleFinale * 1.22)}\n`;
  } else {
    testo += `TOTALE: \u20ac${formatImportoEuroVisuale(totaleFinale)}\n`;
  }
  if (noteExtra) testo += `\nNote: ${noteExtra}`;
  if (metodoPagamentoSelezionato) {
    const m = metodoPagamentoSelezionato;
    let pagamento = `\nPAGAMENTO: ${m.nome}`;
    if (m.tipo === "bonifico" && m.dati?.iban) pagamento += `\nIBAN: ${m.dati.iban}`;
    if (m.tipo === "bonifico" && m.dati?.intestatario) pagamento += `\nIntestatario: ${m.dati.intestatario}`;
    if (m.tipo === "paypal" && m.dati?.email) pagamento += `\nPayPal: ${m.dati.email}`;
    testo += pagamento;
  }
  return testo;
}
