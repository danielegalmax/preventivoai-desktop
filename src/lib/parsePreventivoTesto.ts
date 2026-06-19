import { parseImportoEuro } from "./importo";
import type { MetodoPagamento } from "./pagamenti";
import type { Servizio } from "./types";
import type { TrasfertaBuilder, VoceBuilder } from "./builder";

export type ParsedPreventivoBuilder = {
  nomeCliente: string;
  voci: VoceBuilder[];
  trasferte: TrasfertaBuilder[];
  includiIva: boolean;
  noteExtra: string;
  pagamentoNome: string;
};

function parseImporto(raw: string): string {
  const val = parseImportoEuro(raw.match(/([\d.,]+)/)?.[1] || raw);
  return val != null ? String(val) : raw.replace(/€/g, "").replace(/\s/g, "").replace(",", ".").trim();
}

function normalizzaNome(nome: string) {
  return nome.trim().toLowerCase();
}

export function collegaVociAlListino(voci: VoceBuilder[], servizi: Servizio[]): VoceBuilder[] {
  if (servizi.length === 0) return voci;

  return voci.map((voce) => {
    if (servizi.some((s) => s.id === voce.id)) return voce;

    const match = servizi.find((s) => normalizzaNome(s.nome) === normalizzaNome(voce.nome));
    if (match) {
      return { ...voce, id: match.id, unita: voce.unita || match.unita };
    }

    return voce;
  });
}

export function parsePreventivoTesto(testo: string): ParsedPreventivoBuilder {
  const righe = testo.split("\n").map((r) => r.trim()).filter(Boolean);

  let nomeCliente = "";
  let noteExtra = "";
  let pagamentoNome = "";
  let includiIva = false;
  const voci: VoceBuilder[] = [];
  const trasferte: TrasfertaBuilder[] = [];

  let fase = "header";
  let servizioCorrente: { nome: string; descrizione: string; dettagli: string[]; prezzo: string } | null = null;
  let rimborsoCorrente: { nome: string; dettaglio: string; tipo: string; importo: string } | null = null;
  let voceIndex = 0;

  function pushServizio() {
    if (!servizioCorrente) return;
    const prezzoNum = parseFloat(parseImporto(servizioCorrente.prezzo)) || 0;
    let quantita = "1";
    let unita = "cad";
    let descrizione = servizioCorrente.descrizione;

    for (const dettaglio of servizioCorrente.dettagli) {
      const qtyMatch = dettaglio.match(/^([\d.,]+)\s+(\w+)$/);
      if (qtyMatch) {
        quantita = qtyMatch[1].replace(",", ".");
        unita = qtyMatch[2];
      } else if (!descrizione) {
        descrizione = dettaglio;
      } else {
        descrizione = `${descrizione}\n${dettaglio}`;
      }
    }

    const qtyNum = parseFloat(quantita) || 1;
    const costo = qtyNum > 0 ? String(prezzoNum / qtyNum) : String(prezzoNum);

    voci.push({
      id: `import-${voceIndex++}`,
      nome: servizioCorrente.nome,
      descrizione,
      costo,
      quantita,
      unita,
    });
    servizioCorrente = null;
  }

  function pushRimborso() {
    if (!rimborsoCorrente) return;
    const esente = rimborsoCorrente.tipo.toLowerCase().includes("esente");
    const importoRaw = rimborsoCorrente.importo || rimborsoCorrente.dettaglio;
    const importo = parseImporto(importoRaw);

    if (rimborsoCorrente.nome.toLowerCase().includes("km") || rimborsoCorrente.dettaglio.toLowerCase().includes(" km")) {
      const kmMatch = rimborsoCorrente.dettaglio.match(/([\d.,]+)\s*km/i);
      trasferte.push({
        id: `import-${trasferte.length}`,
        tipo: "km",
        nome: "Trasferta km",
        importo,
        km: kmMatch ? kmMatch[1].replace(",", ".") : "",
        esente,
      });
    } else {
      trasferte.push({
        id: `import-${trasferte.length}`,
        tipo: "spesa",
        nome: rimborsoCorrente.nome,
        importo,
        esente,
      });
    }
    rimborsoCorrente = null;
  }

  for (const riga of righe) {
    if (riga.startsWith("Cliente:")) {
      nomeCliente = riga.replace("Cliente:", "").trim();
      continue;
    }
    if (riga === "SERVIZI:" || riga === "SERVIZI") {
      fase = "servizi";
      continue;
    }
    if (riga.startsWith("SERVIZIO:") && fase === "servizi") {
      pushServizio();
      const nomeServizio = riga.replace("SERVIZIO:", "").trim();
      const colIdx = nomeServizio.indexOf(": ");
      servizioCorrente = {
        nome: colIdx > -1 ? nomeServizio.slice(0, colIdx).trim() : nomeServizio,
        descrizione: colIdx > -1 ? nomeServizio.slice(colIdx + 2).trim() : "",
        dettagli: [],
        prezzo: "",
      };
      continue;
    }
    if (riga === "DETTAGLI:" && servizioCorrente) continue;
    if (riga.startsWith("- ") && servizioCorrente && fase === "servizi") {
      servizioCorrente.dettagli.push(riga.slice(2).trim());
      continue;
    }
    if (riga.startsWith("PREZZO:") && servizioCorrente) {
      servizioCorrente.prezzo = riga.replace("PREZZO:", "").trim();
      continue;
    }
    if (riga === "RIMBORSI SPESE:") {
      pushServizio();
      fase = "rimborsi";
      continue;
    }
    if (fase === "rimborsi") {
      if (riga.startsWith("RIMBORSO:")) {
        pushRimborso();
        rimborsoCorrente = { nome: riga.replace("RIMBORSO:", "").trim(), dettaglio: "", tipo: "", importo: "" };
        continue;
      }
      if (riga.startsWith("DETTAGLIO:") && rimborsoCorrente) {
        rimborsoCorrente.dettaglio = riga.replace("DETTAGLIO:", "").trim();
        const match = rimborsoCorrente.dettaglio.match(/=\s*€?([\d.,]+)/);
        if (match) rimborsoCorrente.importo = match[1];
        continue;
      }
      if (riga.startsWith("TIPO:") && rimborsoCorrente) {
        rimborsoCorrente.tipo = riga.replace("TIPO:", "").trim();
        continue;
      }
      if (riga.startsWith("IMPORTO:") && rimborsoCorrente) {
        rimborsoCorrente.importo = riga.replace("IMPORTO:", "").trim();
        continue;
      }
    }
    if (riga === "RIEPILOGO:") {
      pushServizio();
      pushRimborso();
      fase = "totali";
      continue;
    }
    if (riga.startsWith("Imponibile:") || riga.startsWith("IVA")) {
      includiIva = true;
      continue;
    }
    if (riga.startsWith("Note:")) {
      noteExtra = riga.replace("Note:", "").trim();
      continue;
    }
    if (riga.startsWith("PAGAMENTO:")) {
      pagamentoNome = riga.replace("PAGAMENTO:", "").trim();
      continue;
    }
  }

  pushServizio();
  pushRimborso();

  return { nomeCliente, voci, trasferte, includiIva, noteExtra, pagamentoNome };
}

export function trovaMetodoPagamentoDaNome<T extends MetodoPagamento>(
  metodi: T[],
  pagamentoNome: string,
): T | null {
  if (!pagamentoNome) return null;
  const normalizzato = pagamentoNome.trim().toLowerCase();
  return (
    metodi.find((m) => m.nome.trim().toLowerCase() === normalizzato)
    || metodi.find((m) => normalizzato.includes(m.nome.trim().toLowerCase()))
    || null
  );
}
