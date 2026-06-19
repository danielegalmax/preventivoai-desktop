import { supabase } from "./supabase";
import { erroreColonnaDeletedAt } from "./preventiviVisibili";
import {
  calcolaImportiRate,
  calcolaScadenzeRate,
  formatImportoEuro,
  importoDaTesto,
  parseImportoEuro,
  testoPagamentoRatePdf,
  labelScadenzaRata,
} from "./importo";
import type { MetodoPagamento } from "./pagamenti";
import { creaLinkPagamento } from "./pdf";
import { nomePianoDaPreventivo } from "./preventivoMadre";
import { giornoScadenzaValido } from "./giornoScadenza";

async function pianoEsistenteSuPreventivo(preventivoId: string) {
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

async function nomePianoPerPreventivo(preventivoId: string, tipo: "canone" | "rate") {
  const { data } = await supabase
    .from("preventivi")
    .select("titolo, created_at, versione")
    .eq("id", preventivoId)
    .single();
  return data ? nomePianoDaPreventivo(data, tipo) : null;
}

export type ClientePreventivo = { id: string; nome: string };

export async function creaAbbonamentoDaPreventivo({
  cliente,
  preventivoId,
  importoRaw,
  giornoRaw,
  meseInizioRaw,
  mensilitaRaw,
}: {
  cliente: ClientePreventivo;
  preventivoId: string;
  importoRaw: string;
  giornoRaw: string;
  meseInizioRaw: string;
  mensilitaRaw: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { esistente: false };

  const importo = parseFloat(importoRaw.replace(",", "."));
  const giorno = parseInt(giornoRaw, 10);
  const meseInizio = parseInt(meseInizioRaw, 10);
  const mensilita = mensilitaRaw ? parseInt(mensilitaRaw, 10) : null;
  if (!(importo > 0 && giorno >= 1 && giorno <= 31 && meseInizio >= 1 && meseInizio <= 12)) {
    return { esistente: false };
  }

  if (await pianoEsistenteSuPreventivo(preventivoId)) return { esistente: true };

  const nome = await nomePianoPerPreventivo(preventivoId, "canone");
  const { data: ab } = await supabase.from("abbonamenti").insert({
    user_id: user.id,
    cliente_id: cliente.id,
    importo_default: importo,
    giorno_scadenza: giorno,
    attivo: true,
    preventivo_id: preventivoId,
    numero_mensilita: mensilita,
    tipo: "canone",
    nome,
  }).select().single();

  if (!ab) return { esistente: false };

  const numRate = mensilita && mensilita > 0 ? mensilita : 1;
  const scadenze = calcolaScadenzeRate(numRate, giorno, meseInizio);
  const inserimenti = scadenze.map((s) => ({
    abbonamento_id: ab.id,
    mese: s.mese,
    anno: s.anno,
    importo,
    acconto: 0,
    stato: "da_incassare" as const,
  }));
  await supabase.from("rate_abbonamento").insert(inserimenti);
  return { esistente: false };
}

export async function creaPianoRateDaPreventivo({
  cliente,
  preventivoId,
  importoTotale,
  numeroRateRaw,
  giornoScadenzaRaw,
  meseInizioRaw,
}: {
  cliente: ClientePreventivo;
  preventivoId: string;
  importoTotale: number;
  numeroRateRaw: string;
  giornoScadenzaRaw: string;
  meseInizioRaw: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { esistente: false };

  const numeroRate = parseInt(numeroRateRaw, 10);
  const giornoScadenza = parseInt(giornoScadenzaRaw, 10);
  const meseInizio = parseInt(meseInizioRaw, 10);
  if (!(importoTotale > 0 && numeroRate >= 2 && giornoScadenza >= 1 && giornoScadenza <= 31 && meseInizio >= 1 && meseInizio <= 12)) {
    return { esistente: false };
  }

  if (await pianoEsistenteSuPreventivo(preventivoId)) return { esistente: true };

  const importi = calcolaImportiRate(importoTotale, numeroRate);
  const scadenze = calcolaScadenzeRate(numeroRate, giornoScadenza, meseInizio);

  const nome = await nomePianoPerPreventivo(preventivoId, "rate");
  const { data: ab } = await supabase.from("abbonamenti").insert({
    user_id: user.id,
    cliente_id: cliente.id,
    importo_default: importoTotale,
    giorno_scadenza: giornoScadenza,
    attivo: true,
    preventivo_id: preventivoId,
    numero_mensilita: numeroRate,
    note: null,
    tipo: "rate",
    nome,
  }).select().single();

  if (!ab) return { esistente: false };

  const inserimenti = importi.map((importo, i) => ({
    abbonamento_id: ab.id,
    mese: scadenze[i].mese,
    anno: scadenze[i].anno,
    importo,
    acconto: 0,
    stato: "da_incassare" as const,
  }));
  await supabase.from("rate_abbonamento").insert(inserimenti);
  return { esistente: false };
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
  metodoPagamento: MetodoPagamento | null;
  token: string;
};

export async function testoConPagamento({
  testo,
  abbonamentoAttivo,
  abVisibileNelPDF,
  abImporto,
  abGiorno = "1",
  abMeseInizio = 0,
  pagamentoRateAttivo = false,
  rateVisibileNelPDF = false,
  rateImportoTotale = 0,
  rateNumero = 0,
  rateGiornoScadenza = 0,
  rateMeseInizio = 0,
  metodoPagamento,
  token,
}: TestoConPagamentoParams) {
  let testoBase = testo;

  if (pagamentoRateAttivo && rateVisibileNelPDF) {
    testoBase += testoPagamentoRatePdf({
      attivo: true,
      visibileNelPDF: true,
      importoTotale: rateImportoTotale,
      numeroRate: rateNumero,
      giornoScadenza: rateGiornoScadenza,
      meseInizio: rateMeseInizio >= 1 && rateMeseInizio <= 12 ? rateMeseInizio : undefined,
    });
  }

  if (abbonamentoAttivo && abVisibileNelPDF && abImporto) {
    const importoCanone = parseImportoEuro(abImporto);
    testoBase += `\nCANONE MENSILE: €${importoCanone != null ? formatImportoEuro(importoCanone, 2) : abImporto}/mese`;
    const giorno = parseInt(abGiorno, 10);
    const mese = abMeseInizio >= 1 && abMeseInizio <= 12 ? abMeseInizio : undefined;
    if (giornoScadenzaValido(abGiorno)) {
      const prima = calcolaScadenzeRate(1, giorno, mese)[0];
      if (prima) {
        testoBase += `\nSCADENZA PRIMO CANONE: ${labelScadenzaRata(prima.mese, prima.anno, prima.giorno)}`;
      }
    }
  }

  if (!metodoPagamento) return testoBase;

  if (metodoPagamento.tipo === "stripe") {
    const link = await creaLinkPagamento(importoDaTesto(testo) || 0, "Preventivo", token);
    return `${testoBase}\nPAGAMENTO: Online con carta\nLINK PAGAMENTO: ${link}`;
  }

  let extra = `\nPAGAMENTO: ${metodoPagamento.nome}`;
  if (metodoPagamento.tipo === "bonifico" && metodoPagamento.dati?.iban) {
    extra += `\nIBAN: ${metodoPagamento.dati.iban}`;
  }
  if (metodoPagamento.tipo === "paypal" && metodoPagamento.dati?.email) {
    extra += `\nPayPal: ${metodoPagamento.dati.email}`;
  }
  return testoBase + extra;
}
