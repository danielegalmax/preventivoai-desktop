import type { ServizioDraft } from "./listinoSmart";

function parseNumeroItaliano(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) {
    return parseFloat(t.replace(/\./g, "").replace(",", "."));
  }
  const n = parseFloat(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function estraiPrezzo(testo: string): string {
  const range = testo.match(/(\d[\d.,]*)\s*[–\-]\s*(\d[\d.,]*)/);
  if (range) {
    const min = parseNumeroItaliano(range[1]);
    const max = parseNumeroItaliano(range[2]);
    if (min != null && max != null) return String(Math.round((min + max) / 2));
  }
  const single = testo.match(/(\d[\d.,]*)/);
  if (!single) return "";
  const n = parseNumeroItaliano(single[1]);
  return n != null ? String(n) : "";
}

function mappaUnitaEsplicita(tipo: string): string | null {
  const t = tipo.toLowerCase().trim();
  if (/^(ora|orario)$/.test(t)) return "ora";
  if (/^(giorno|giornata)$/.test(t)) return "giorno";
  if (/^progetto$/.test(t)) return "progetto";
  if (/^(cad|cadauno|a\s*cad)$/.test(t)) return "cad";
  if (/^mq$/.test(t)) return "mq";
  if (/^set$/.test(t)) return "set";
  return null;
}

function riconosciUnita(riga: string) {
  const testo = riga.toLowerCase();
  if (/(ora|orario|all'ora|\/ora)/.test(testo)) return "ora";
  if (/(giorno|giornata|al giorno)/.test(testo)) return "giorno";
  if (/(mq|metro quadro|al mq)/.test(testo)) return "mq";
  if (/(set|a set)/.test(testo)) return "set";
  if (/(progetto|a progetto)/.test(testo)) return "progetto";
  return "cad";
}

function pulisciNome(riga: string, prezzo: string) {
  return riga
    .replace(prezzo, "")
    .replace(/€/gi, "")
    .replace(/\beuro\b/gi, "")
    .replace(/\ball'ora\b|\b\/ora\b|\borario\b|\bora\b/gi, "")
    .replace(/\bal giorno\b|\bgiornata\b|\bgiorno\b/gi, "")
    .replace(/\bal mq\b|\bmetro quadro\b|\bmq\b/gi, "")
    .replace(/\ba set\b|\bset\b/gi, "")
    .replace(/\ba progetto\b|\bprogetto\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isRigaIntestazione(riga: string) {
  const t = riga.toLowerCase();
  return t.includes("servizio") && (t.includes("prezzo") || t.includes("tipo"));
}

function parseRigaTabellare(riga: string): ServizioDraft | null {
  const parts = riga.split("\t").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  if (parts.length >= 3) {
    const nome = parts[0];
    const unita = mappaUnitaEsplicita(parts[1]) || riconosciUnita(parts[2]);
    const costo = estraiPrezzo(parts[2]);
    return { nome, descrizione: "", costo, unita };
  }

  const nome = parts[0];
  const costo = estraiPrezzo(parts[1]);
  const unita = riconosciUnita(parts[1]);
  return { nome, descrizione: "", costo, unita };
}

function parseRigaLibera(riga: string): ServizioDraft {
  const unita = riconosciUnita(riga);
  const match = riga.match(/^(.+?):\s*(\d+(?:[.,]\d+)?)\s*€?/);
  if (match) {
    return {
      nome: match[1].trim(),
      descrizione: "",
      costo: match[2].replace(",", "."),
      unita,
    };
  }

  const costo = estraiPrezzo(riga);
  if (costo) {
    return {
      nome: pulisciNome(riga, costo) || riga,
      descrizione: "",
      costo,
      unita,
    };
  }

  return { nome: riga, descrizione: "", costo: "", unita: "cad" };
}

export function serviziDaTesto(testoServizi: string): ServizioDraft[] {
  return testoServizi
    .split("\n")
    .map((riga) => riga.trim())
    .filter(Boolean)
    .filter((riga) => !isRigaIntestazione(riga))
    .map((riga) => parseRigaTabellare(riga) ?? parseRigaLibera(riga))
    .filter((s) => s.nome.length > 0);
}
