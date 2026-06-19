export function parseImportoEuro(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "");
  if (!trimmed) return null;

  if (trimmed.includes(",") && trimmed.includes(".")) {
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    if (lastComma > lastDot) {
      const val = parseFloat(trimmed.replace(/\./g, "").replace(",", "."));
      return Number.isNaN(val) ? null : val;
    }
    const val = parseFloat(trimmed.replace(/,/g, ""));
    return Number.isNaN(val) ? null : val;
  }

  if (trimmed.includes(",")) {
    const val = parseFloat(trimmed.replace(",", "."));
    return Number.isNaN(val) ? null : val;
  }

  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    const lastPart = parts[parts.length - 1];
    const isThousands = parts.length > 1
      && lastPart.length === 3
      && /^\d{3}$/.test(lastPart)
      && parts.every((part, index) => (index === 0 ? /^\d{1,3}$/.test(part) : /^\d{3}$/.test(part)));

    if (isThousands) {
      const val = parseFloat(parts.join(""));
      return Number.isNaN(val) ? null : val;
    }

    const val = parseFloat(trimmed);
    return Number.isNaN(val) ? null : val;
  }

  const val = parseFloat(trimmed);
  return Number.isNaN(val) ? null : val;
}

export function formatImportoEuro(valore: number, decimals = 0): string {
  return valore.toLocaleString("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function calcolaImportiRate(importoTotale: number, numeroRate: number): number[] {
  if (numeroRate < 2 || importoTotale <= 0) return [];
  const quota = Math.round((importoTotale / numeroRate) * 100) / 100;
  const prime = Array.from({ length: numeroRate - 1 }, () => quota);
  const ultima = Math.round((importoTotale - quota * (numeroRate - 1)) * 100) / 100;
  return [...prime, ultima];
}

export type RataImportoModificabile = {
  id: string;
  pinnata: boolean;
  importoBozza: number | null;
  accontoMinimo: number;
};

export function ricalcolaImportiRateLibere(
  totalePiano: number,
  sommaRateIncassate: number,
  rateModificabili: RataImportoModificabile[],
): { ok: true; importi: Record<string, number> } | { ok: false; messaggio: string } {
  let sommaFisse = sommaRateIncassate;
  const importi: Record<string, number> = {};
  const libere: RataImportoModificabile[] = [];

  for (const rata of rateModificabili) {
    if (rata.pinnata) {
      if (rata.importoBozza === null || rata.importoBozza <= 0) {
        return { ok: false, messaggio: "Inserisci un importo valido per ogni rata fissata." };
      }
      if (rata.importoBozza < rata.accontoMinimo) {
        return { ok: false, messaggio: "Una rata fissata ha importo inferiore all'acconto già versato." };
      }
      importi[rata.id] = rata.importoBozza;
      sommaFisse += rata.importoBozza;
    } else {
      libere.push(rata);
    }
  }

  const residuo = Math.round((totalePiano - sommaFisse) * 100) / 100;

  if (libere.length === 0) {
    if (Math.abs(residuo) > 0.01) {
      return { ok: false, messaggio: "Gli importi fissi non corrispondono al totale del piano. Modifica le rate fissate o sbloccane una." };
    }
    return { ok: true, importi };
  }

  if (residuo <= 0) {
    return { ok: false, messaggio: "Gli importi fissi superano il totale del piano. Riduci una rata fissata." };
  }

  const nuoviImporti = libere.length === 1
    ? [residuo]
    : calcolaImportiRate(residuo, libere.length);

  if (nuoviImporti.length !== libere.length) {
    return { ok: false, messaggio: "Impossibile ricalcolare le rate libere." };
  }

  for (let i = 0; i < libere.length; i++) {
    const rata = libere[i];
    const importo = nuoviImporti[i];
    if (importo < rata.accontoMinimo) {
      return {
        ok: false,
        messaggio: "Il ricalcolo assegnerebbe meno dell'acconto già versato su una rata. Fissa manualmente quella rata o sblocca altre.",
      };
    }
    importi[rata.id] = importo;
  }

  return { ok: true, importi };
}

export function calcolaScadenzeRate(
  numeroRate: number,
  giornoScadenza = 1,
  meseInizio?: number,
): { mese: number; anno: number; giorno: number }[] {
  const ora = new Date();
  const giorno = Math.min(Math.max(giornoScadenza, 1), 31);
  let mesePartenza = meseInizio && meseInizio >= 1 && meseInizio <= 12 ? meseInizio : ora.getMonth() + 1;
  let annoPartenza = ora.getFullYear();
  if (mesePartenza < ora.getMonth() + 1) annoPartenza += 1;
  return Array.from({ length: numeroRate }, (_, i) => {
    const d = new Date(annoPartenza, mesePartenza - 1 + i, giorno);
    return { mese: d.getMonth() + 1, anno: d.getFullYear(), giorno: d.getDate() };
  });
}

const MESI_NOMI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function labelScadenzaRata(mese: number, anno: number, giorno?: number) {
  const meseNome = MESI_NOMI[mese - 1];
  if (giorno) return `${giorno} ${meseNome} ${anno}`;
  return `${meseNome} ${anno}`;
}

export function testoPagamentoRatePdf(opts: {
  attivo: boolean;
  visibileNelPDF: boolean;
  importoTotale: number;
  numeroRate: number;
  giornoScadenza: number;
  meseInizio?: number;
}): string {
  if (!opts.attivo || !opts.visibileNelPDF || opts.numeroRate < 2 || opts.importoTotale <= 0) return "";
  const importi = calcolaImportiRate(opts.importoTotale, opts.numeroRate);
  if (importi.length === 0) return "";
  const scadenze = calcolaScadenzeRate(opts.numeroRate, opts.giornoScadenza, opts.meseInizio);
  const quota = importi[0];
  const ultima = importi[importi.length - 1];
  const primaScadenza = scadenze[0];
  let blocco = `\nPAGAMENTO A RATE: ${opts.numeroRate} rate`;
  blocco += `\nIMPORTO RATA: €${formatImportoEuro(quota, 2)}`;
  if (ultima !== quota) blocco += `\nULTIMA RATA: €${formatImportoEuro(ultima, 2)}`;
  if (primaScadenza) {
    blocco += `\nSCADENZA PRIMA RATA: ${labelScadenzaRata(primaScadenza.mese, primaScadenza.anno, primaScadenza.giorno)}`;
  }
  return blocco;
}

export function importoDaTesto(testo: string): number | null {
  const righe = testo.split("\n");
  for (let i = righe.length - 1; i >= 0; i--) {
    const riga = righe[i].trim();
    if (!/^TOTALE:/i.test(riga)) continue;
    const match = riga.match(/TOTALE:\s*(?:EUR\s*)?(?:€\s*)?([\d.,]+)/i);
    if (match) return parseImportoEuro(match[1]);
  }

  const matches = [...testo.matchAll(/TOTALE:\s*(?:EUR\s*)?(?:€\s*)?([\d.,]+)/gi)];
  if (matches.length > 0) {
    return parseImportoEuro(matches[matches.length - 1][1]);
  }

  const imponibile = testo.match(/Imponibile:\s*(?:EUR\s*)?(?:€\s*)?([\d.,]+)/i);
  if (imponibile && !/IVA\s*22%/i.test(testo)) {
    return parseImportoEuro(imponibile[1]);
  }

  return null;
}
