import { useEffect, useState } from "react";
import { spostaAbbonamentiInCestino } from "../cestino";
import { MESI_BREVI } from "../constants";
import { erroreColonnaDeletedAt } from "../preventiviVisibili";
import { supabase } from "../supabase";
import type { Abbonamento, PreventivoMadre, RataAbbonamento } from "../types";
import { calcolaImportiRate, calcolaScadenzeRate, formatImportoEuro } from "../importo";
import { nomePianoDaPreventivo } from "../preventivoMadre";

type UseAbbonamentoOpts = {
  soloTipo?: "canone" | "rate";
};

const PREVENTIVO_MADRE_SELECT = "id, titolo, created_at, versione, importo_totale, stato";

function alertErrore(titolo: string, messaggio?: string) {
  window.alert(messaggio ? `${titolo}\n\n${messaggio}` : titolo);
}

async function nomeDaPreventivoId(preventivoId: string, tipo: "canone" | "rate") {
  const { data } = await supabase
    .from("preventivi")
    .select("titolo, created_at, versione")
    .eq("id", preventivoId)
    .single();
  return data ? nomePianoDaPreventivo(data, tipo) : null;
}

async function pianoAttivoSuPreventivo(preventivoId: string) {
  const { data, error } = await supabase
    .from("abbonamenti")
    .select("id, tipo")
    .eq("preventivo_id", preventivoId)
    .eq("attivo", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error && erroreColonnaDeletedAt(error)) {
    const { data: fallback } = await supabase
      .from("abbonamenti")
      .select("id, tipo")
      .eq("preventivo_id", preventivoId)
      .eq("attivo", true)
      .maybeSingle();
    return fallback?.tipo as "canone" | "rate" | undefined;
  }

  return data?.tipo as "canone" | "rate" | undefined;
}

export function useAbbonamento(clienteId: string, opts?: UseAbbonamentoOpts) {
  const [abbonamentiAttivi, setAbbonamentiAttivi] = useState<Abbonamento[]>([]);
  const [abbonamentiStorico, setAbbonamentiStorico] = useState<Abbonamento[]>([]);
  const [preventiviMadreStorico, setPreventiviMadreStorico] = useState<Record<string, PreventivoMadre>>({});
  const [ratePerPiano, setRatePerPiano] = useState<Record<string, RataAbbonamento[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { void carica(); }, [clienteId, opts?.soloTipo]);

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

  async function caricaPreventiviMadreMap(abbonamenti: Abbonamento[]) {
    const ids = [...new Set(abbonamenti.map((a) => a.preventivo_id).filter(Boolean))] as string[];
    if (ids.length === 0) return {};
    const { data } = await supabase
      .from("preventivi")
      .select(PREVENTIVO_MADRE_SELECT)
      .in("id", ids);
    const map: Record<string, PreventivoMadre> = {};
    for (const p of (data || []) as PreventivoMadre[]) map[p.id] = p;
    return map;
  }

  async function caricaRatePerPiani(abbonamentoIds: string[]) {
    if (abbonamentoIds.length === 0) {
      setRatePerPiano({});
      return;
    }
    const { data } = await supabase
      .from("rate_abbonamento")
      .select("*")
      .in("abbonamento_id", abbonamentoIds)
      .order("anno", { ascending: true })
      .order("mese", { ascending: true });
    const map: Record<string, RataAbbonamento[]> = {};
    for (const id of abbonamentoIds) map[id] = [];
    for (const rata of data || []) {
      if (!map[rata.abbonamento_id]) map[rata.abbonamento_id] = [];
      map[rata.abbonamento_id].push(rata);
    }
    setRatePerPiano(map);
  }

  async function carica() {
    setLoading(true);
    let query = supabase
      .from("abbonamenti")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });
    if (opts?.soloTipo) query = query.eq("tipo", opts.soloTipo);
    const { data: tutti } = await query;

    const lista = (tutti || []).filter((a) => !a.deleted_at);
    const attivi = lista.filter((a) => a.attivo);
    const storico = lista.filter((a) => !a.attivo);
    const preventiviMap = await caricaPreventiviMadreMap(lista);

    setAbbonamentiAttivi(attivi);
    setAbbonamentiStorico(storico);
    setPreventiviMadreStorico(preventiviMap);
    await caricaRatePerPiani(attivi.map((a) => a.id));
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

    if (opzioni?.numeroMensilita && opzioni.numeroMensilita > 0) {
      await generaRateMultiple(data.id, importo, opzioni.numeroMensilita);
    } else {
      await generaRataMeseCorrente(data.id, importo);
    }

    await carica();
  }

  async function generaRataMeseCorrente(abbonamentoId: string, importo: number) {
    const ora = new Date();
    const mese = ora.getMonth() + 1;
    const anno = ora.getFullYear();
    const { data: esistente } = await supabase
      .from("rate_abbonamento")
      .select("id")
      .eq("abbonamento_id", abbonamentoId)
      .eq("mese", mese)
      .eq("anno", anno)
      .single();
    if (esistente) return;
    await supabase.from("rate_abbonamento").insert({
      abbonamento_id: abbonamentoId,
      mese,
      anno,
      importo,
      acconto: 0,
      stato: "da_incassare",
    });
  }

  async function generaRateMultiple(abbonamentoId: string, importo: number, numeroMesi: number) {
    const ora = new Date();
    const inserimenti = [];
    for (let i = 0; i < numeroMesi; i++) {
      const data = new Date(ora.getFullYear(), ora.getMonth() + i, 1);
      inserimenti.push({
        abbonamento_id: abbonamentoId,
        mese: data.getMonth() + 1,
        anno: data.getFullYear(),
        importo,
        acconto: 0,
        stato: "da_incassare",
      });
    }
    await supabase.from("rate_abbonamento").insert(inserimenti);
  }

  async function generaRateConImporti(
    abbonamentoId: string,
    voci: { importo: number; mese: number; anno: number }[],
  ) {
    if (voci.length === 0) return;
    await supabase.from("rate_abbonamento").insert(
      voci.map((v) => ({
        abbonamento_id: abbonamentoId,
        mese: v.mese,
        anno: v.anno,
        importo: v.importo,
        acconto: 0,
        stato: "da_incassare" as const,
      })),
    );
  }

  async function creaPianoRate(
    importoTotale: number,
    numeroRate: number,
    opzioni?: { preventivoId?: string; giornoScadenza?: number; meseInizio?: number },
  ) {
    const importi = calcolaImportiRate(importoTotale, numeroRate);
    if (importi.length === 0) {
      alertErrore("Errore", "Inserisci un numero di rate valido (minimo 2).");
      return false;
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
        return false;
      }
    }

    const giornoScadenza = opzioni?.giornoScadenza ?? new Date().getDate();
    const scadenze = calcolaScadenzeRate(numeroRate, giornoScadenza, opzioni?.meseInizio);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

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

    if (error) { alertErrore("Errore", error.message); return false; }

    await generaRateConImporti(
      data.id,
      importi.map((importo, i) => ({ importo, ...scadenze[i] })),
    );
    await carica();
    return true;
  }

  async function segnaRataPagata(rataId: string, pagata: boolean) {
    const found = trovaRata(rataId);
    if (!found) return;
    if (pagata) {
      await registraPagamento(rataId, found.rata.importo - (found.rata.acconto || 0));
    } else {
      await azzeraPagamento(rataId);
    }
  }

  async function aggiornaAbbonamento(abbonamentoId: string, importo: number, giornoScadenza: number) {
    const { error } = await supabase
      .from("abbonamenti")
      .update({ importo_default: importo, giorno_scadenza: giornoScadenza })
      .eq("id", abbonamentoId);
    if (error) { alertErrore("Errore", error.message); return; }
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
    if (!(nuovoImportoTotale > 0)) {
      alertErrore("Importo non valido", "Inserisci un importo maggiore di zero.");
      return false;
    }

    const raccolto = rate.reduce(
      (a, r) => a + (r.stato === "incassato" ? r.importo : (r.acconto || 0)),
      0,
    );
    if (nuovoImportoTotale < raccolto) {
      alertErrore(
        "Importo troppo basso",
        `Hai già incassato €${formatImportoEuro(raccolto, 2)}. L'importo totale non può essere inferiore.`,
      );
      return false;
    }

    const rateAperte = [...rate]
      .filter((r) => r.stato !== "incassato")
      .sort((a, b) => a.anno - b.anno || a.mese - b.mese);
    if (rateAperte.length === 0) {
      alertErrore("Nessuna rata da aggiornare", "Tutte le rate sono già pagate.");
      return false;
    }

    const residuo = Math.round((nuovoImportoTotale - raccolto) * 100) / 100;
    const nuoviImporti = calcolaImportiRate(residuo, rateAperte.length);
    if (nuoviImporti.length === 0) return false;

    const { error: errAb } = await supabase
      .from("abbonamenti")
      .update({ importo_default: nuovoImportoTotale })
      .eq("id", abbonamentoId);
    if (errAb) { alertErrore("Errore", errAb.message); return false; }

    for (let i = 0; i < rateAperte.length; i++) {
      const rata = rateAperte[i];
      const nuovoImporto = nuoviImporti[i];
      const acconto = rata.acconto || 0;
      let nuovoStato: RataAbbonamento["stato"] = rata.stato;
      if (acconto >= nuovoImporto) nuovoStato = "incassato";
      else if (acconto > 0) nuovoStato = "parziale";

      const { error } = await supabase
        .from("rate_abbonamento")
        .update({ importo: nuovoImporto, stato: nuovoStato })
        .eq("id", rata.id);
      if (error) { alertErrore("Errore", error.message); return false; }
    }

    setAbbonamentiAttivi((lista) =>
      lista.map((a) => a.id === abbonamentoId ? { ...a, importo_default: nuovoImportoTotale } : a),
    );
    await caricaRatePerPiani([abbonamentoId]);
    return true;
  }

  async function eliminaAbbonamento(abbonamentoId: string) {
    const { error } = await spostaAbbonamentiInCestino([abbonamentoId]);
    if (error) { alertErrore("Errore", error.message); return; }
    await carica();
  }

  async function registraPagamento(rataId: string, importoPagato: number, nota?: string) {
    const found = trovaRata(rataId);
    if (!found) return;
    const { rata, abbonamentoId } = found;

    const nuovoAcconto = Math.min(rata.acconto + importoPagato, rata.importo);
    const nuovoSaldo = rata.importo - nuovoAcconto;
    const nuovoStato = nuovoSaldo <= 0 ? "incassato" : "parziale";

    const aggiornamento: Partial<RataAbbonamento> & { data_incasso?: string } = {
      acconto: nuovoAcconto,
      stato: nuovoStato,
      note: nota || rata.note || null,
    };
    if (nuovoStato === "incassato") {
      aggiornamento.data_incasso = new Date().toISOString();
    }

    const { error } = await supabase
      .from("rate_abbonamento")
      .update(aggiornamento)
      .eq("id", rataId);

    if (error) { alertErrore("Errore", error.message); return; }
    aggiornaRatePiano(abbonamentoId, (rs) =>
      rs.map((x) => x.id === rataId ? { ...x, ...aggiornamento, saldo_residuo: nuovoSaldo } : x),
    );
  }

  async function azzeraPagamento(rataId: string) {
    const found = trovaRata(rataId);
    if (!found) return;
    const aggiornamento: Partial<RataAbbonamento> & { data_incasso: null } = {
      acconto: 0,
      stato: "da_incassare",
      data_incasso: null,
      note: null,
    };
    const { error } = await supabase
      .from("rate_abbonamento")
      .update(aggiornamento)
      .eq("id", rataId);
    if (error) { alertErrore("Errore", error.message); return; }
    aggiornaRatePiano(found.abbonamentoId, (rs) =>
      rs.map((x) => x.id === rataId ? { ...x, ...aggiornamento, saldo_residuo: x.importo } : x),
    );
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
      [...rs, data].sort((a, b) => a.anno - b.anno || a.mese - b.mese),
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
    const ora = new Date();
    const meseOra = ora.getMonth() + 1;
    const annoOra = ora.getFullYear();
    const giornoOggi = ora.getDate();

    for (const abbonamento of abbonamentiAttivi) {
      const rate = ratePerPiano[abbonamento.id] || [];
      for (const r of rate) {
        if (r.stato === "da_incassare" || r.stato === "parziale") {
          const scaduta =
            r.anno < annoOra
            || (r.anno === annoOra && r.mese < meseOra)
            || (r.anno === annoOra && r.mese === meseOra && giornoOggi > abbonamento.giorno_scadenza);
          if (scaduta) {
            await supabase.from("rate_abbonamento").update({ stato: "in_ritardo" }).eq("id", r.id);
            aggiornaRatePiano(abbonamento.id, (rs) =>
              rs.map((x) => x.id === r.id ? { ...x, stato: "in_ritardo" } : x),
            );
          }
        }
      }
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

  function nuovoStatoDopoImportoRata(rata: RataAbbonamento, nuovoImporto: number): RataAbbonamento["stato"] {
    const acconto = rata.acconto || 0;
    if (acconto >= nuovoImporto) return "incassato";
    if (acconto > 0) return "parziale";
    if (rata.stato === "in_ritardo") return "in_ritardo";
    return "da_incassare";
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
