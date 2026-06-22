import { useEffect, useRef, useState } from "react";
import { spostaAbbonamentiInCestino } from "../cestino";
import { MESI_BREVI } from "../constants";
import { supabase } from "../supabase";
import { eventBus } from "../eventBus";
import type { Abbonamento, PreventivoMadre, RataAbbonamento } from "../types";
import { calcolaImportiRate, calcolaScadenzeRate, formatImportoEuro, rateScaduteDaSegnalare } from "preventivoai-shared";
import { inputDateToIso, oggiInputDate } from "../format";
import {
  alertErroreAbbonamento as alertErrore,
  caricaPreventiviMadreMap,
  fetchRatePerPiani,
  generaRateConImporti,
  generaRateMultiple,
  generaRataMeseCorrente,
  nomeDaPreventivoId,
  nuovoStatoDopoImportoRata,
  pianoAttivoSuPreventivo,
} from "./abbonamentoDb";
import {
  azzeraPagamentoDb,
  modificaImportoPianoRate as modificaImportoPianoRateDb,
  registraPagamentoDb,
} from "./abbonamentoOps";

type CreaPianoRateResult = {
  abbonamentoId: string;
  rate: { id: string; mese: number; anno: number }[];
};

type UseAbbonamentoOpts = {
  soloTipo?: "canone" | "rate";
};

export function useAbbonamento(clienteId: string, opts?: UseAbbonamentoOpts) {
  const [abbonamentiAttivi, setAbbonamentiAttivi] = useState<Abbonamento[]>([]);
  const [abbonamentiStorico, setAbbonamentiStorico] = useState<Abbonamento[]>([]);
  const [preventiviMadreStorico, setPreventiviMadreStorico] = useState<Record<string, PreventivoMadre>>({});
  const [ratePerPiano, setRatePerPiano] = useState<Record<string, RataAbbonamento[]>>({});
  const [loading, setLoading] = useState(true);
  const pagamentiInCorso = useRef(new Set<string>());
  const caricaReqRef = useRef(0);

  useEffect(() => {
    void carica();
    return () => {
      caricaReqRef.current += 1;
    };
  }, [clienteId, opts?.soloTipo]);

  function tutteLeRate() {
    return Object.values(ratePerPiano).flat();
  }

  function trovaRata(rataId: string) {
    for (const [abbonamentoId, rate] of Object.entries(ratePerPiano)) {
      const rata = rate.find((r) => r.id === rataId);
      if (rata) return { rata, abbonamentoId };
    }
    return null;
  }

  function pianoById(abbonamentoId: string) {
    return abbonamentiAttivi.find((a) => a.id === abbonamentoId);
  }

  function aggiornaRatePiano(
    abbonamentoId: string,
    updater: (rate: RataAbbonamento[]) => RataAbbonamento[],
  ) {
    setRatePerPiano((prev) => ({
      ...prev,
      [abbonamentoId]: updater(prev[abbonamentoId] || []),
    }));
  }

  async function caricaRatePerPiani(abbonamentoIds: string[], reqId?: number) {
    const isStale = () => reqId !== undefined && reqId !== caricaReqRef.current;

    if (abbonamentoIds.length === 0) {
      if (!isStale()) setRatePerPiano({});
      return;
    }
    const rate = await fetchRatePerPiani(abbonamentoIds);
    if (!isStale()) setRatePerPiano(rate);
  }

  async function carica() {
    const reqId = ++caricaReqRef.current;
    setLoading(true);
    let query = supabase
      .from("abbonamenti")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });
    if (opts?.soloTipo) query = query.eq("tipo", opts.soloTipo);
    const { data: tutti } = await query;

    if (reqId !== caricaReqRef.current) return;

    const lista = (tutti || []).filter((a) => !a.deleted_at);
    const attivi = lista.filter((a) => a.attivo);
    const storico = lista.filter((a) => !a.attivo);
    const preventiviMap = await caricaPreventiviMadreMap(lista);

    if (reqId !== caricaReqRef.current) return;

    setAbbonamentiAttivi(attivi);
    setAbbonamentiStorico(storico);
    setPreventiviMadreStorico(preventiviMap);
    await caricaRatePerPiani(attivi.map((a) => a.id), reqId);

    if (reqId !== caricaReqRef.current) return;

    setLoading(false);
  }

  async function creaAbbonamento(
    importo: number,
    giornoScadenza: number,
    opzioni?: {
      preventivoId?: string;
      numeroMensilita?: number;
      note?: string;
      tipo?: "canone" | "rate";
    },
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tipoFinale = opzioni?.tipo || "canone";
    if (opzioni?.preventivoId) {
      const tipoEsistente = await pianoAttivoSuPreventivo(opzioni.preventivoId);
      if (tipoEsistente) {
        alertErrore(
          "Preventivo già collegato",
          tipoEsistente === "rate"
            ? "Questo preventivo ha già un piano a rate collegato."
            : "Questo preventivo ha già un abbonamento collegato.",
        );
        return;
      }
    }

    const nome = opzioni?.preventivoId
      ? await nomeDaPreventivoId(opzioni.preventivoId, tipoFinale)
      : null;

    const { data, error } = await supabase
      .from("abbonamenti")
      .insert({
        user_id: user.id,
        cliente_id: clienteId,
        importo_default: importo,
        giorno_scadenza: giornoScadenza,
        attivo: true,
        preventivo_id: opzioni?.preventivoId || null,
        numero_mensilita: opzioni?.numeroMensilita || null,
        note: opzioni?.note || null,
        tipo: tipoFinale,
        nome,
      })
      .select()
      .single();

    if (error) { alertErrore("Errore", error.message); return; }

    let erroreRate: string | null = null;
    if (opzioni?.numeroMensilita && opzioni.numeroMensilita > 0) {
      erroreRate = await generaRateMultiple(data.id, importo, opzioni.numeroMensilita);
    } else {
      erroreRate = await generaRataMeseCorrente(data.id, importo);
    }

    if (erroreRate) {
      alertErrore(
        "Piano incompleto",
        `L'abbonamento è stato creato ma le rate non sono state salvate: ${erroreRate}`,
      );
      await carica();
      return;
    }

    await carica();
  }

  async function creaPianoRate(
    importoTotale: number,
    numeroRate: number,
    opzioni?: {
      preventivoId?: string;
      giornoScadenza?: number;
      meseInizio?: number;
      importiPersonalizzati?: number[];
    },
  ): Promise<CreaPianoRateResult | null> {
    const personalizzati = opzioni?.importiPersonalizzati;
    const sommaPersonalizzati = personalizzati
      ? Math.round(personalizzati.reduce((a, v) => a + v, 0) * 100) / 100
      : null;
    const usaImportiPersonalizzati =
      personalizzati != null
      && personalizzati.length === numeroRate
      && sommaPersonalizzati != null
      && Math.abs(sommaPersonalizzati - importoTotale) <= 0.01;

    const importi = usaImportiPersonalizzati
      ? personalizzati
      : calcolaImportiRate(importoTotale, numeroRate);
    if (importi.length === 0) {
      alertErrore("Errore", "Inserisci un numero di rate valido (minimo 2).");
      return null;
    }

    const preventivoId = opzioni?.preventivoId;
    if (preventivoId) {
      const tipoEsistente = await pianoAttivoSuPreventivo(preventivoId);
      if (tipoEsistente) {
        alertErrore(
          "Preventivo già collegato",
          tipoEsistente === "canone"
            ? "Questo preventivo ha già un abbonamento collegato."
            : "Questo preventivo ha già un piano a rate collegato.",
        );
        return null;
      }
    }

    const giornoScadenza = opzioni?.giornoScadenza ?? new Date().getDate();
    const scadenze = calcolaScadenzeRate(numeroRate, giornoScadenza, opzioni?.meseInizio);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const nome = preventivoId ? await nomeDaPreventivoId(preventivoId, "rate") : null;
    const { data, error } = await supabase
      .from("abbonamenti")
      .insert({
        user_id: user.id,
        cliente_id: clienteId,
        importo_default: importoTotale,
        giorno_scadenza: giornoScadenza,
        attivo: true,
        preventivo_id: preventivoId || null,
        numero_mensilita: numeroRate,
        note: null,
        tipo: "rate",
        nome,
      })
      .select()
      .single();

    if (error) { alertErrore("Errore", error.message); return null; }

    const { data: rateInserite, error: errRate } = await generaRateConImporti(
      data.id,
      importi.map((importo, i) => ({ importo, ...scadenze[i] })),
    );
    if (errRate) { alertErrore("Errore", errRate); return null; }
    if (rateInserite.length === 0) return null;

    await carica();
    return {
      abbonamentoId: data.id as string,
      rate: [...rateInserite].sort((a, b) => a.anno - b.anno || a.mese - b.mese),
    };
  }

  async function segnaRataPagata(rataId: string, pagata: boolean) {
    const found = trovaRata(rataId);
    if (!found) return;
    if (pagata) {
      if (found.rata.stato === "incassato") return;
      await registraPagamento(
        rataId,
        found.rata.importo - (found.rata.acconto || 0),
        undefined,
        inputDateToIso(oggiInputDate()),
      );
    } else {
      await azzeraPagamento(rataId);
    }
  }

  async function aggiornaAbbonamento(
    abbonamentoId: string,
    importo: number,
    giornoScadenza: number,
    applicaEsistenti = false,
  ) {
    const { error } = await supabase
      .from("abbonamenti")
      .update({ importo_default: importo, giorno_scadenza: giornoScadenza })
      .eq("id", abbonamentoId);
    if (error) { alertErrore("Errore", error.message); return; }

    if (applicaEsistenti) {
      const { error: rateError } = await supabase
        .from("rate_abbonamento")
        .update({ importo })
        .eq("abbonamento_id", abbonamentoId)
        .neq("stato", "incassato");
      if (rateError) { alertErrore("Errore", rateError.message); return; }
      aggiornaRatePiano(abbonamentoId, (rs) =>
        rs.map((x) => {
          if (x.stato === "incassato") return x;
          return { ...x, importo, saldo_residuo: importo - (x.acconto || 0) };
        }),
      );
    }

    setAbbonamentiAttivi((lista) =>
      lista.map((a) => a.id === abbonamentoId
        ? { ...a, importo_default: importo, giorno_scadenza: giornoScadenza }
        : a),
    );
  }

  async function modificaImportoPianoRate(abbonamentoId: string, nuovoImportoTotale: number) {
    const abbonamento = pianoById(abbonamentoId);
    const rate = ratePerPiano[abbonamentoId] || [];
    if (!abbonamento) return false;

    const result = await modificaImportoPianoRateDb(abbonamentoId, rate, nuovoImportoTotale);
    if (!result.ok) {
      alertErrore(result.errorTitle ?? "Errore", result.error);
      return false;
    }

    setAbbonamentiAttivi((lista) =>
      lista.map((a) =>
        a.id === abbonamentoId ? { ...a, importo_default: result.nuovoImportoTotale } : a,
      ),
    );
    await caricaRatePerPiani([abbonamentoId]);
    return true;
  }

  async function eliminaAbbonamento(abbonamentoId: string) {
    const { error } = await spostaAbbonamentiInCestino([abbonamentoId]);
    if (error) { alertErrore("Errore", error.message); return; }
    await carica();
  }

  async function registraPagamento(
    rataId: string,
    importoPagato: number,
    nota?: string,
    dataIncasso?: string,
  ): Promise<void> {
    if (!Number.isFinite(importoPagato) || importoPagato <= 0) {
      alertErrore("Importo non valido", "Inserisci un importo maggiore di zero.");
      return;
    }

    if (pagamentiInCorso.current.has(rataId)) return;

    const found = trovaRata(rataId);
    if (!found) return;
    const { rata, abbonamentoId } = found;
    if (rata.stato === "incassato") {
      alertErrore("Rata già incassata", "Questa rata è già stata incassata.");
      return;
    }

    pagamentiInCorso.current.add(rataId);
    try {
      const result = await registraPagamentoDb(rataId, rata, importoPagato, nota, dataIncasso);
      if (!result.ok) {
        alertErrore("Errore", result.error);
        return;
      }
      aggiornaRatePiano(abbonamentoId, (rs) =>
        rs.map((x) =>
          x.id === rataId
            ? { ...x, ...result.aggiornamento, saldo_residuo: result.nuovoSaldo }
            : x,
        ),
      );
      eventBus.emit("aggiorna-home");
    } finally {
      pagamentiInCorso.current.delete(rataId);
    }
  }

  async function azzeraPagamento(rataId: string) {
    const found = trovaRata(rataId);
    if (!found) return;
    const result = await azzeraPagamentoDb(rataId);
    if (!result.ok) {
      alertErrore("Errore", result.error);
      return;
    }
    aggiornaRatePiano(found.abbonamentoId, (rs) =>
      rs.map((x) =>
        x.id === rataId ? { ...x, ...result.aggiornamento, saldo_residuo: x.importo } : x,
      ),
    );
    eventBus.emit("aggiorna-home");
  }

  async function aggiungiRataMese(abbonamentoId: string, mese: number, anno: number, importo: number) {
    const { data: esistente } = await supabase
      .from("rate_abbonamento")
      .select("id")
      .eq("abbonamento_id", abbonamentoId)
      .eq("mese", mese)
      .eq("anno", anno)
      .single();
    if (esistente) {
      alertErrore("Rata già presente", `Esiste già una rata per ${MESI_BREVI[mese - 1]} ${anno}`);
      return false;
    }

    const { data, error } = await supabase
      .from("rate_abbonamento")
      .insert({
        abbonamento_id: abbonamentoId,
        mese,
        anno,
        importo,
        acconto: 0,
        stato: "da_incassare",
      })
      .select()
      .single();
    if (error) { alertErrore("Errore", error.message); return false; }
    aggiornaRatePiano(abbonamentoId, (rs) =>
      [...rs, { ...data, saldo_residuo: data.saldo_residuo ?? 0 } as RataAbbonamento].sort(
        (a, b) => a.anno - b.anno || a.mese - b.mese,
      ),
    );
    return true;
  }

  async function eliminaRate(rataIds: string[]) {
    if (!rataIds.length) return false;
    const { error } = await supabase
      .from("rate_abbonamento")
      .delete()
      .in("id", rataIds);
    if (error) { alertErrore("Errore", error.message); return false; }
    setRatePerPiano((prev) => {
      const next = { ...prev };
      for (const abId of Object.keys(next)) {
        next[abId] = next[abId].filter((x) => !rataIds.includes(x.id));
      }
      return next;
    });
    return true;
  }

  async function aggiornaRitardi() {
    const scadute = rateScaduteDaSegnalare(abbonamentiAttivi, ratePerPiano);

    for (const { abbonamentoId, rataId } of scadute) {
      const { error } = await supabase
        .from("rate_abbonamento")
        .update({ stato: "in_ritardo" })
        .eq("id", rataId);
      if (error) {
        alertErrore("Errore aggiornamento scadenze", error.message);
        return;
      }
      aggiornaRatePiano(abbonamentoId, (rs) =>
        rs.map((x) => x.id === rataId ? { ...x, stato: "in_ritardo" } : x),
      );
    }
  }

  useEffect(() => {
    if (abbonamentiAttivi.length > 0 && tutteLeRate().length > 0) void aggiornaRitardi();
  }, [abbonamentiAttivi.length, Object.values(ratePerPiano).flat().length]);

  async function rinominaAbbonamento(abbonamentoId: string, nuovoNome: string) {
    const { error } = await supabase
      .from("abbonamenti")
      .update({ nome: nuovoNome })
      .eq("id", abbonamentoId);
    if (error) { alertErrore("Errore", error.message); return; }
    setAbbonamentiAttivi((lista) =>
      lista.map((a) => a.id === abbonamentoId ? { ...a, nome: nuovoNome } : a),
    );
  }

  async function modificaImportoRata(rataId: string, nuovoImporto: number) {
    const found = trovaRata(rataId);
    if (!found) return false;
    const { rata, abbonamentoId } = found;
    const abbonamento = pianoById(abbonamentoId);
    const rate = ratePerPiano[abbonamentoId] || [];
    if (!abbonamento) return false;
    if (!(nuovoImporto > 0)) {
      alertErrore("Importo non valido", "Inserisci un importo maggiore di zero.");
      return false;
    }
    if (nuovoImporto < (rata.acconto || 0)) {
      alertErrore("Importo troppo basso", "L'importo non può essere inferiore a quanto già incassato su questa rata.");
      return false;
    }

    if (abbonamento.tipo === "rate") {
      const sommaAltri = rate
        .filter((r) => r.id !== rataId)
        .reduce((a, r) => a + r.importo, 0);
      const sommaTotale = Math.round((sommaAltri + nuovoImporto) * 100) / 100;
      if (Math.abs(sommaTotale - abbonamento.importo_default) > 0.01) {
        alertErrore(
          "Somma rate errata",
          `Le rate devono sommare €${formatImportoEuro(abbonamento.importo_default, 2)}. Usa Personalizza rate per ripartire gli importi.`,
        );
        return false;
      }
    }

    const nuovoStato = nuovoStatoDopoImportoRata(rata, nuovoImporto);
    const { error } = await supabase
      .from("rate_abbonamento")
      .update({ importo: nuovoImporto, stato: nuovoStato })
      .eq("id", rataId);
    if (error) { alertErrore("Errore", error.message); return false; }
    aggiornaRatePiano(abbonamentoId, (rs) =>
      rs.map((x) => x.id === rataId ? { ...x, importo: nuovoImporto, stato: nuovoStato } : x),
    );
    return true;
  }

  async function salvaImportiRatePersonalizzati(abbonamentoId: string, importiPerRata: Record<string, number>) {
    const abbonamento = pianoById(abbonamentoId);
    const rate = ratePerPiano[abbonamentoId] || [];
    if (!abbonamento || abbonamento.tipo !== "rate") return false;

    const incassate = rate.filter((r) => r.stato === "incassato");
    const modificabili = rate.filter((r) => r.stato !== "incassato");

    for (const rata of modificabili) {
      const importo = importiPerRata[rata.id];
      if (importo === undefined || !(importo > 0)) {
        alertErrore("Importo non valido", "Inserisci un importo valido per ogni rata modificabile.");
        return false;
      }
      if (importo < (rata.acconto || 0)) {
        alertErrore(
          "Importo troppo basso",
          `La rata di ${MESI_BREVI[rata.mese - 1]} ${rata.anno} ha già un acconto di €${formatImportoEuro(rata.acconto || 0, 2)}.`,
        );
        return false;
      }
    }

    const sommaIncassate = incassate.reduce((a, r) => a + r.importo, 0);
    const sommaModificabili = modificabili.reduce((a, r) => a + importiPerRata[r.id], 0);
    const sommaTotale = Math.round((sommaIncassate + sommaModificabili) * 100) / 100;
    const target = abbonamento.importo_default;

    if (Math.abs(sommaTotale - target) > 0.01) {
      alertErrore(
        "Somma rate errata",
        `Le rate devono sommare €${formatImportoEuro(target, 2)} (attuale: €${formatImportoEuro(sommaTotale, 2)}).`,
      );
      return false;
    }

    for (const rata of modificabili) {
      const nuovoImporto = importiPerRata[rata.id];
      const nuovoStato = nuovoStatoDopoImportoRata(rata, nuovoImporto);
      const { error } = await supabase
        .from("rate_abbonamento")
        .update({ importo: nuovoImporto, stato: nuovoStato })
        .eq("id", rata.id);
      if (error) { alertErrore("Errore", error.message); return false; }
    }

    await caricaRatePerPiani([abbonamentoId]);
    return true;
  }

  const tutteRate = tutteLeRate();
  const totaleIncassato = tutteRate
    .filter((r) => r.stato === "incassato")
    .reduce((a, r) => a + r.importo, 0);

  const totaleParziale = tutteRate
    .filter((r) => r.stato === "parziale")
    .reduce((a, r) => a + r.acconto, 0);

  const rataDaIncassare = tutteRate.find((r) => r.stato !== "incassato");

  return {
    abbonamentiAttivi,
    abbonamentiStorico,
    preventiviMadreStorico,
    ratePerPiano,
    loading,
    creaAbbonamento,
    creaPianoRate,
    aggiornaAbbonamento,
    eliminaAbbonamento,
    modificaImportoPianoRate,
    registraPagamento,
    azzeraPagamento,
    segnaRataPagata,
    aggiungiRataMese,
    eliminaRate,
    rinominaAbbonamento,
    modificaImportoRata,
    salvaImportiRatePersonalizzati,
    totaleIncassato,
    totaleParziale,
    rataDaIncassare,
    carica,
  };
}
