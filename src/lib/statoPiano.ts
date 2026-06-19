import { MESI_BREVI } from "./constants";
import type { Abbonamento, RataAbbonamento } from "./types";
import { formatImportoEuro } from "./importo";

export type StatoPianoKind = "concluso" | "in_ritardo" | "in_corso" | "in_regola" | "vuoto";

export type AnalisiPiano = {
  stato: StatoPianoKind;
  concluso: boolean;
  label: string;
  badgeBg: string;
  badgeColor: string;
  progressoPct: number;
  ratePagate: number;
  rateTotali: number;
  sottotitolo: string | null;
};

function ordinaRate(a: RataAbbonamento, b: RataAbbonamento) {
  return a.anno - b.anno || a.mese - b.mese;
}

function labelScadenza(rata: RataAbbonamento) {
  return `${MESI_BREVI[rata.mese - 1]} ${rata.anno}`;
}

export function analizzaStatoPiano(abbonamento: Abbonamento, rate: RataAbbonamento[]): AnalisiPiano {
  const rateOrdinate = [...rate].sort(ordinaRate);
  const ratePagate = rate.filter((r) => r.stato === "incassato").length;
  const rateTotali = rate.length;
  const importoPiano = rate.reduce((a, r) => a + r.importo, 0);
  const importoRaccolto = rate.reduce((a, r) => {
    if (r.stato === "incassato") return a + r.importo;
    if (r.stato === "parziale") return a + (r.acconto || 0);
    return a;
  }, 0);
  const progressoPct = importoPiano > 0 ? Math.min(100, (importoRaccolto / importoPiano) * 100) : 0;

  if (rateTotali === 0) {
    return {
      stato: "vuoto",
      concluso: false,
      label: "Attivo",
      badgeBg: "#F3F4F6",
      badgeColor: "#6B7280",
      progressoPct: 0,
      ratePagate: 0,
      rateTotali: 0,
      sottotitolo: null,
    };
  }

  const tuttePagate = rate.every((r) => r.stato === "incassato");
  const pianoFinito = abbonamento.tipo === "rate" || abbonamento.numero_mensilita != null;
  const concluso = pianoFinito && tuttePagate;

  if (concluso) {
    const ultimaIncassata = [...rateOrdinate].reverse().find((r) => r.data_incasso);
    const dataLabel = ultimaIncassata?.data_incasso
      ? new Date(ultimaIncassata.data_incasso).toLocaleDateString("it-IT", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
    return {
      stato: "concluso",
      concluso: true,
      label: "Concluso",
      badgeBg: "#D1FAE5",
      badgeColor: "#047857",
      progressoPct: 100,
      ratePagate,
      rateTotali,
      sottotitolo: dataLabel
        ? `Completato il ${dataLabel}`
        : `Tutte le ${rateTotali} rate incassate`,
    };
  }

  const rateInRitardo = rate.filter((r) => r.stato === "in_ritardo");
  if (rateInRitardo.length > 0) {
    return {
      stato: "in_ritardo",
      concluso: false,
      label: rateInRitardo.length === 1 ? "1 in ritardo" : `${rateInRitardo.length} in ritardo`,
      badgeBg: "#FEE2E2",
      badgeColor: "#DC2626",
      progressoPct,
      ratePagate,
      rateTotali,
      sottotitolo: `${ratePagate}/${rateTotali} incassate`,
    };
  }

  const prossima = rateOrdinate.find((r) => r.stato !== "incassato");
  const sottotitoloProssima = prossima
    ? `Prossima: ${labelScadenza(prossima)} · €${formatImportoEuro(prossima.importo, 2)}`
    : null;

  if (abbonamento.tipo === "canone" && !abbonamento.numero_mensilita && tuttePagate) {
    return {
      stato: "in_regola",
      concluso: false,
      label: "In regola",
      badgeBg: "#D1FAE5",
      badgeColor: "#0E9F8E",
      progressoPct: 100,
      ratePagate,
      rateTotali,
      sottotitolo: "Tutti i canoni generati sono incassati",
    };
  }

  const labelProgresso = abbonamento.tipo === "rate"
    ? `${ratePagate}/${rateTotali}`
    : abbonamento.numero_mensilita
      ? `${ratePagate}/${abbonamento.numero_mensilita}`
      : `${ratePagate}/${rateTotali}`;

  return {
    stato: "in_corso",
    concluso: false,
    label: labelProgresso,
    badgeBg: "#EFF6FF",
    badgeColor: "#2563EB",
    progressoPct,
    ratePagate,
    rateTotali,
    sottotitolo: sottotitoloProssima ?? `${ratePagate}/${rateTotali} incassate`,
  };
}

export function ordinaPianiPerStato<T extends { id: string }>(
  piani: T[],
  ratePerPiano: Record<string, RataAbbonamento[]>,
  abbonamentoById: (id: string) => Abbonamento | undefined,
): T[] {
  return [...piani].sort((a, b) => {
    const abA = abbonamentoById(a.id);
    const abB = abbonamentoById(b.id);
    if (!abA || !abB) return 0;
    const sa = analizzaStatoPiano(abA, ratePerPiano[a.id] || []);
    const sb = analizzaStatoPiano(abB, ratePerPiano[b.id] || []);
    if (sa.concluso !== sb.concluso) return sa.concluso ? 1 : -1;
    if (sa.stato === "in_ritardo" && sb.stato !== "in_ritardo") return -1;
    if (sb.stato === "in_ritardo" && sa.stato !== "in_ritardo") return 1;
    return 0;
  });
}
