import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  caricaClienteDettaglio,
  caricaCollegamentiPianoPreventivo,
} from "../lib/clienteDettaglio";
import type { CollegamentiPianoMap } from "../lib/collegamentiPiano";
import {
  calcolaIncassoCliente,
  getFatturatoClienteCached,
  setFatturatoClienteCached,
} from "../lib/incassi";
import { messaggioEliminaPiano } from "../lib/confermeElimina";
import { useConfirmDialog } from "../lib/hooks/useConfirmDialog";
import { useAnnullaSelezioneOnEscape } from "../lib/hooks/useAnnullaSelezioneOnEscape";
import { useAbbonamento } from "../lib/hooks/useAbbonamento";
import { parseImportoEuro } from "preventivoai-shared";
import { supabase } from "../lib/supabase";
import type { Cliente, Preventivo, RataAbbonamento } from "../lib/types";
import PageContainer from "../components/PageContainer";
import PreventiviLista from "../components/PreventiviLista";
import PianoVuotoState from "../components/clienteDettaglio/PianoVuotoState";
import ClienteModificaModal from "../components/ClienteModificaModal";
import BarraSelezione from "../components/BarraSelezione";
import ClienteDettaglioTabs, { type ClienteDettaglioTab } from "../components/clienteDettaglio/ClienteDettaglioTabs";
import ClientePagamentoRateTab from "../components/clienteDettaglio/ClientePagamentoRateTab";
import ClienteAbbonamentoTab from "../components/clienteDettaglio/ClienteAbbonamentoTab";
import ClienteAbbonamentoModals from "../components/clienteDettaglio/ClienteAbbonamentoModals";
import ClienteStats from "../components/clienteDettaglio/ClienteStats";

export default function ClienteDettaglio() {
  const { id } = useParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [collegamentiPiano, setCollegamentiPiano] = useState<CollegamentiPianoMap>({});
  const [loading, setLoading] = useState(true);
  const [mostraModifica, setMostraModifica] = useState(false);
  const [tab, setTab] = useState<ClienteDettaglioTab>("preventivi");

  const ora = new Date();
  const meseCorrente = ora.getMonth() + 1;
  const annoCorrente = ora.getFullYear();

  const abbonamentoCanone = useAbbonamento(id || "", { soloTipo: "canone" });
  const abbonamentoRate = useAbbonamento(id || "", { soloTipo: "rate" });

  const [mostraModalNuovoAb, setMostraModalNuovoAb] = useState(false);
  const [mostraModalNuovoRate, setMostraModalNuovoRate] = useState(false);
  const [mostraModalModificaAb, setMostraModalModificaAb] = useState(false);
  const [mostraModalRinominaAb, setMostraModalRinominaAb] = useState(false);
  const [mostraModalAggiungiRata, setMostraModalAggiungiRata] = useState(false);
  const [abImporto, setAbImporto] = useState("");
  const [abGiorno, setAbGiorno] = useState("1");
  const [abMensilita, setAbMensilita] = useState("");
  const [preventivoSelezionatoId, setPreventivoSelezionatoId] = useState<string | null>(null);
  const [preventivoRateSelezionatoId, setPreventivoRateSelezionatoId] = useState<string | null>(null);
  const [rateImportoTotale, setRateImportoTotale] = useState("");
  const [rateNumero, setRateNumero] = useState("");
  const [rateGiorno, setRateGiorno] = useState(String(ora.getDate()));
  const [rateMeseInizio, setRateMeseInizio] = useState(String(meseCorrente));
  const [abbonamentoSelezionatoId, setAbbonamentoSelezionatoId] = useState<string | null>(null);
  const [pianoEspansoId, setPianoEspansoId] = useState<string | null>(null);
  const [rataSelezionata, setRataSelezionata] = useState<RataAbbonamento | null>(null);
  const [rataImporto, setRataImporto] = useState("");
  const [pagamentoImporto, setPagamentoImporto] = useState("");
  const [pagamentoNota, setPagamentoNota] = useState("");
  const [nomeAbTemp, setNomeAbTemp] = useState("");
  const [nuovaRataMese, setNuovaRataMese] = useState(String(meseCorrente));
  const [nuovaRataAnno, setNuovaRataAnno] = useState(String(annoCorrente));
  const [nuovaRataImporto, setNuovaRataImporto] = useState("");
  const [pianoSelezioneAttiva, setPianoSelezioneAttiva] = useState(false);
  const [pianiSelezionati, setPianiSelezionati] = useState<string[]>([]);
  const [preventivoFocusId, setPreventivoFocusId] = useState<string | null>(null);
  const [preventiviSelezionati, setPreventiviSelezionati] = useState(0);
  const fatturatoReqRef = useRef(0);
  const [fatturato, setFatturato] = useState(() => getFatturatoClienteCached(id || "") ?? 0);
  const [fatturatoLoading, setFatturatoLoading] = useState(
    () => getFatturatoClienteCached(id || "") === undefined,
  );

  const preventiviSenzaPiano = useMemo(
    () => preventivi.filter((p) => !collegamentiPiano[p.id]),
    [preventivi, collegamentiPiano],
  );

  const rateIncassoSignature = useMemo(() => {
    const rate = [
      ...Object.values(abbonamentoCanone.ratePerPiano).flat(),
      ...Object.values(abbonamentoRate.ratePerPiano).flat(),
    ];
    return rate.map((r) => `${r.id}:${r.stato}:${r.importo}:${r.acconto ?? 0}`).join("|");
  }, [abbonamentoCanone.ratePerPiano, abbonamentoRate.ratePerPiano]);

  const ricaricaFatturato = useCallback(async (clienteId = id) => {
    if (!clienteId) return;
    const reqId = ++fatturatoReqRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || reqId !== fatturatoReqRef.current) return;

    const hasCached = getFatturatoClienteCached(clienteId) !== undefined;
    if (!hasCached) setFatturatoLoading(true);

    const value = await calcolaIncassoCliente(user.id, clienteId);
    if (reqId !== fatturatoReqRef.current) return;

    setFatturatoClienteCached(clienteId, value);
    setFatturato(value);
    setFatturatoLoading(false);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void carica(id);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const cached = getFatturatoClienteCached(id);
    if (cached !== undefined) {
      setFatturato(cached);
      setFatturatoLoading(false);
    } else {
      setFatturato(0);
      setFatturatoLoading(true);
    }
    void ricaricaFatturato(id);
  }, [id, ricaricaFatturato, preventivi.length, rateIncassoSignature]);

  useEffect(() => {
    setPianoSelezioneAttiva(false);
    setPianiSelezionati([]);
    setPreventiviSelezionati(0);
    if (tab !== "preventivi") {
      setPreventivoFocusId(null);
    }
  }, [tab]);

  async function carica(clienteId = id!) {
    const res = await caricaClienteDettaglio(clienteId);
    setCliente(res.cliente);
    setPreventivi(res.preventivi);
    setCollegamentiPiano(await caricaCollegamentiPianoPreventivo(clienteId));
    setLoading(false);
  }

  async function aggiornaCollegamentiPiano() {
    if (!id) return;
    setCollegamentiPiano(await caricaCollegamentiPianoPreventivo(id));
    const res = await caricaClienteDettaglio(id);
    setPreventivi(res.preventivi);
  }

  async function ricaricaPreventivi() {
    if (!id) return;
    const res = await caricaClienteDettaglio(id);
    setPreventivi(res.preventivi);
  }

  function apriPreventivoMadre(preventivoId: string) {
    setPreventivoFocusId(preventivoId);
    setTab("preventivi");
  }

  const consumaFocusPreventivo = useCallback(() => {
    setPreventivoFocusId(null);
  }, []);

  function selezionaPreventivoAbbonamento(preventivoId: string | null) {
    setPreventivoSelezionatoId(preventivoId);
    if (!preventivoId) return;
    const preventivo = preventivi.find((p) => p.id === preventivoId);
    if (preventivo?.importo_totale != null) {
      setAbImporto(String(preventivo.importo_totale).replace(".", ","));
    }
  }

  function selezionaPreventivoRate(preventivoId: string | null) {
    setPreventivoRateSelezionatoId(preventivoId);
    if (!preventivoId) return;
    const preventivo = preventivi.find((p) => p.id === preventivoId);
    if (preventivo?.importo_totale != null) {
      setRateImportoTotale(String(preventivo.importo_totale).replace(".", ","));
    }
  }

  function apriModaleAbbonamento() {
    setPreventivoSelezionatoId(null);
    setAbImporto("");
    setAbGiorno("1");
    setAbMensilita("");
    setMostraModalNuovoAb(true);
  }

  function apriModaleRate() {
    setPreventivoRateSelezionatoId(null);
    setRateImportoTotale("");
    setRateNumero("");
    setRateGiorno(String(ora.getDate()));
    setRateMeseInizio(String(meseCorrente));
    setMostraModalNuovoRate(true);
  }

  async function salvaNuovoAbbonamento() {
    const importo = parseImportoEuro(abImporto);
    const giorno = parseInt(abGiorno, 10);
    if (!importo || importo <= 0) { window.alert("Inserisci un importo valido"); return; }
    if (!giorno || giorno < 1 || giorno > 31) { window.alert("Inserisci un giorno valido (1-31)"); return; }
    const mensilita = abMensilita ? parseInt(abMensilita, 10) : undefined;
    await abbonamentoCanone.creaAbbonamento(importo, giorno, {
      numeroMensilita: mensilita,
      tipo: "canone",
      preventivoId: preventivoSelezionatoId || undefined,
    });
    setMostraModalNuovoAb(false);
    await aggiornaCollegamentiPiano();
    await abbonamentoCanone.carica();
  }

  async function salvaNuovoPianoRate() {
    const importo = parseImportoEuro(rateImportoTotale);
    const numero = parseInt(rateNumero, 10);
    const giorno = parseInt(rateGiorno, 10);
    const mese = parseInt(rateMeseInizio, 10);
    if (!(importo && importo > 0)) { window.alert("Inserisci un importo valido"); return; }
    if (!(numero >= 2)) { window.alert("Inserisci almeno 2 rate."); return; }
    if (!(giorno >= 1 && giorno <= 31)) { window.alert("Inserisci un giorno valido (1-31)"); return; }
    if (!(mese >= 1 && mese <= 12)) { window.alert("Inserisci un mese valido (1-12)"); return; }
    const ok = await abbonamentoRate.creaPianoRate(importo, numero, {
      preventivoId: preventivoRateSelezionatoId || undefined,
      giornoScadenza: giorno,
      meseInizio: mese,
    });
    if (!ok) return;
    setMostraModalNuovoRate(false);
    await aggiornaCollegamentiPiano();
    await abbonamentoRate.carica();
  }

  async function salvaModificaAbbonamento() {
    if (!abbonamentoSelezionatoId) return;
    const importo = parseImportoEuro(abImporto);
    const giorno = parseInt(abGiorno, 10);
    if (!importo || importo <= 0) { window.alert("Inserisci un importo valido"); return; }
    await abbonamentoCanone.aggiornaAbbonamento(abbonamentoSelezionatoId, importo, giorno);
    setMostraModalModificaAb(false);
  }

  function apriModalPagamento(rata: RataAbbonamento) {
    setRataSelezionata(rata);
    setRataImporto(String(rata.importo).replace(".", ","));
    setPagamentoImporto(String(rata.importo - (rata.acconto || 0)).replace(".", ","));
    setPagamentoNota("");
  }

  async function confermaPagamentoRata() {
    if (!rataSelezionata) return;
    const importo = parseImportoEuro(pagamentoImporto);
    if (!importo || importo <= 0) { window.alert("Inserisci un importo valido"); return; }
    const hook = tab === "pagamento_rate" ? abbonamentoRate : abbonamentoCanone;
    const nuovoImportoRata = parseImportoEuro(rataImporto);
    if (nuovoImportoRata && nuovoImportoRata !== rataSelezionata.importo) {
      await hook.modificaImportoRata(rataSelezionata.id, nuovoImportoRata);
    }
    await hook.registraPagamento(rataSelezionata.id, importo, pagamentoNota || undefined);
    await ricaricaPreventivi();
    setRataSelezionata(null);
  }

  async function salvaRinominaAbbonamento() {
    if (!abbonamentoSelezionatoId) return;
    const hook = tab === "pagamento_rate" ? abbonamentoRate : abbonamentoCanone;
    await hook.rinominaAbbonamento(abbonamentoSelezionatoId, nomeAbTemp);
    setMostraModalRinominaAb(false);
  }

  function apriModalAggiungiRata(abbonamentoId: string) {
    const ab = abbonamentoCanone.abbonamentiAttivi.find((a) => a.id === abbonamentoId);
    if (!ab) return;
    setAbbonamentoSelezionatoId(abbonamentoId);
    setNuovaRataMese(String(meseCorrente));
    setNuovaRataAnno(String(annoCorrente));
    setNuovaRataImporto(ab.importo_default.toString());
    setMostraModalAggiungiRata(true);
  }

  async function confermaAggiungiRata() {
    if (!abbonamentoSelezionatoId) return;
    const mese = parseInt(nuovaRataMese, 10);
    const anno = parseInt(nuovaRataAnno, 10);
    const importo = parseImportoEuro(nuovaRataImporto);
    if (!(mese >= 1 && mese <= 12 && anno > 2000)) { window.alert("Mese o anno non validi"); return; }
    if (!importo || importo <= 0) { window.alert("Inserisci un importo valido"); return; }
    const ok = await abbonamentoCanone.aggiungiRataMese(abbonamentoSelezionatoId, mese, anno, importo);
    if (ok) setMostraModalAggiungiRata(false);
  }

  async function eliminaAbbonamentoCliente(abbonamentoId: string) {
    await abbonamentoCanone.eliminaAbbonamento(abbonamentoId);
    await aggiornaCollegamentiPiano();
  }

  function toggleSelezionePiano(abbonamentoId: string) {
    setPianiSelezionati((prev) =>
      prev.includes(abbonamentoId) ? prev.filter((x) => x !== abbonamentoId) : [...prev, abbonamentoId],
    );
  }

  async function eliminaPianiSelezionati() {
    if (pianiSelezionati.length === 0) return;
    const tipo = tab === "pagamento_rate" ? "rate" as const : "canone" as const;
    const titolo = tab === "pagamento_rate" ? "Elimina piani a rate" : "Elimina abbonamenti";
    const ok = await confirm({
      title: titolo,
      message: messaggioEliminaPiano(tipo, pianiSelezionati.length),
    });
    if (!ok) return;
    if (tab === "pagamento_rate") {
      for (const pianoId of pianiSelezionati) await abbonamentoRate.eliminaAbbonamento(pianoId);
      await abbonamentoRate.carica();
    } else {
      for (const pianoId of pianiSelezionati) await abbonamentoCanone.eliminaAbbonamento(pianoId);
      await abbonamentoCanone.carica();
    }
    setPianiSelezionati([]);
    setPianoSelezioneAttiva(false);
    await aggiornaCollegamentiPiano();
  }

  const barraSelezionePianiVisibile = pianoSelezioneAttiva && (tab === "abbonamento" || tab === "pagamento_rate");

  const annullaSelezionePiani = useCallback(() => {
    setPianoSelezioneAttiva(false);
    setPianiSelezionati([]);
  }, []);

  useAnnullaSelezioneOnEscape(barraSelezionePianiVisibile && !loading && !!cliente && !!id, annullaSelezionePiani);

  if (loading) {
    return (
      <PageContainer>
        <p className="text-brand-navy/60">Caricamento...</p>
      </PageContainer>
    );
  }

  if (!cliente || !id) {
    return (
      <PageContainer>
        <p className="text-brand-navy/60">Cliente non trovato.</p>
      </PageContainer>
    );
  }

  const abbonamentoAttivo = abbonamentoCanone.abbonamentiAttivi.length > 0;
  const abbonamentoTotale = abbonamentoCanone.totaleIncassato + abbonamentoCanone.totaleParziale;

  const mostraBarraNuovo =
    (tab === "preventivi" && preventiviSelezionati === 0)
    || ((tab === "abbonamento" || tab === "pagamento_rate") && !pianoSelezioneAttiva);
  const paddingBarraFissa = mostraBarraNuovo || (tab === "preventivi" && preventiviSelezionati > 0) || barraSelezionePianiVisibile;

  return (
    <PageContainer className={paddingBarraFissa ? "pb-24" : ""}>
      <div className="sticky top-0 z-20 -mx-4 bg-brand-bg px-4 pb-3 sm:-mx-6 sm:px-6 lg:pb-4">
        <Link to="/clienti" className="text-sm text-brand-navy/60 hover:text-brand-navy">
          ← Torna ai clienti
        </Link>

        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold text-brand-navy">{cliente.nome}</h1>
            <div className="flex shrink-0 gap-2">
              {(tab === "abbonamento" || tab === "pagamento_rate") && (
                <button
                  type="button"
                  onClick={() => {
                    if (pianoSelezioneAttiva) {
                      setPianoSelezioneAttiva(false);
                      setPianiSelezionati([]);
                    } else {
                      setPianoSelezioneAttiva(true);
                    }
                  }}
                  className="rounded-xl border border-brand-navy/20 px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-bg"
                >
                  {pianoSelezioneAttiva ? "Annulla selezione" : "Seleziona"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setMostraModifica(true)}
                className="rounded-xl border border-brand-navy/20 px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-bg"
              >
                Modifica
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-brand-navy/70 sm:grid-cols-3">
            <div>Telefono: {cliente.telefono || "-"}</div>
            <div>Email: {cliente.email || "-"}</div>
            <div>Indirizzo: {cliente.indirizzo || "-"}</div>
          </div>
          {cliente.note ? (
            <p className="mt-3 text-sm text-brand-navy/60">Note: {cliente.note}</p>
          ) : null}
        </div>

        <ClienteStats
          preventiviCount={preventivi.length}
          fatturato={fatturato}
          fatturatoLoading={fatturatoLoading}
          abbonamentoTotale={abbonamentoTotale}
          abbonamentoAttivo={abbonamentoAttivo}
        />

        <ClienteDettaglioTabs active={tab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === "preventivi" ? (
          preventivi.length === 0 ? (
            <PianoVuotoState
              emoji="📄"
              title="Nessun preventivo per questo cliente"
              description="Crea un preventivo associato a questo cliente con chat, voce o builder manuale."
            />
          ) : (
            <>
              <h2 className="text-lg font-semibold text-brand-navy">Preventivi</h2>
              <div className="mt-3">
                <PreventiviLista
                  preventivi={preventivi}
                  setPreventivi={setPreventivi}
                  variant="cliente"
                  clienteCorrenteId={cliente.id}
                  collegamentiPiano={collegamentiPiano}
                  focusPreventivoId={preventivoFocusId}
                  onFocusConsumato={consumaFocusPreventivo}
                  onSelezioneChange={setPreventiviSelezionati}
                />
              </div>
            </>
          )
        ) : null}

        {tab === "pagamento_rate" ? (
          <ClientePagamentoRateTab
            loading={abbonamentoRate.loading}
            abbonamentiAttivi={abbonamentoRate.abbonamentiAttivi}
            ratePerPiano={abbonamentoRate.ratePerPiano}
            preventiviMadreStorico={abbonamentoRate.preventiviMadreStorico}
            clienteNome={cliente.nome}
            onApriPreventivoMadre={apriPreventivoMadre}
            onPianoAggiornato={aggiornaCollegamentiPiano}
            onOpenPagamento={apriModalPagamento}
            onAzzeraPagamento={abbonamentoRate.azzeraPagamento}
            modificaImportoPianoRate={abbonamentoRate.modificaImportoPianoRate}
            salvaImportiRatePersonalizzati={abbonamentoRate.salvaImportiRatePersonalizzati}
            eliminaAbbonamento={abbonamentoRate.eliminaAbbonamento}
            onRename={(abbonamentoId) => {
              const ab = abbonamentoRate.abbonamentiAttivi.find((a) => a.id === abbonamentoId);
              const indice = abbonamentoRate.abbonamentiAttivi.findIndex((a) => a.id === abbonamentoId);
              setAbbonamentoSelezionatoId(abbonamentoId);
              setNomeAbTemp(ab?.nome || `Piano a rate N.${indice + 1}`);
              setMostraModalRinominaAb(true);
            }}
            selezionePianoAttiva={pianoSelezioneAttiva}
            pianiSelezionati={pianiSelezionati}
            onToggleSelezionePiano={toggleSelezionePiano}
          />
        ) : null}

        {tab === "abbonamento" ? (
          <ClienteAbbonamentoTab
            loading={abbonamentoCanone.loading}
            abbonamentiAttivi={abbonamentoCanone.abbonamentiAttivi}
            ratePerPiano={abbonamentoCanone.ratePerPiano}
            preventiviMadreStorico={abbonamentoCanone.preventiviMadreStorico}
            clienteNome={cliente.nome}
            onApriPreventivoMadre={apriPreventivoMadre}
            meseCorrente={meseCorrente}
            annoCorrente={annoCorrente}
            pianoEspansoId={pianoEspansoId}
            setPianoEspansoId={setPianoEspansoId}
            onRename={(abbonamentoId) => {
              const ab = abbonamentoCanone.abbonamentiAttivi.find((a) => a.id === abbonamentoId);
              const indice = abbonamentoCanone.abbonamentiAttivi.findIndex((a) => a.id === abbonamentoId);
              setAbbonamentoSelezionatoId(abbonamentoId);
              setNomeAbTemp(ab?.nome || `Abbonamento N.${indice + 1}`);
              setMostraModalRinominaAb(true);
            }}
            onOpenAddRata={apriModalAggiungiRata}
            onOpenPagamento={apriModalPagamento}
            onAzzeraPagamento={abbonamentoCanone.azzeraPagamento}
            onEditCanone={(abbonamentoId) => {
              const ab = abbonamentoCanone.abbonamentiAttivi.find((a) => a.id === abbonamentoId);
              if (!ab) return;
              setAbbonamentoSelezionatoId(abbonamentoId);
              setAbImporto(String(ab.importo_default).replace(".", ","));
              setAbGiorno(String(ab.giorno_scadenza));
              setMostraModalModificaAb(true);
            }}
            onDeleteAbbonamento={eliminaAbbonamentoCliente}
            selezionePianoAttiva={pianoSelezioneAttiva}
            pianiSelezionati={pianiSelezionati}
            onToggleSelezionePiano={toggleSelezionePiano}
          />
        ) : null}
      </div>

      {mostraBarraNuovo ? (
        <div className="fixed bottom-0 left-56 right-0 z-30 border-t border-black/10 bg-white px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex w-full max-w-5xl justify-center">
            {tab === "abbonamento" ? (
              <button
                type="button"
                onClick={apriModaleAbbonamento}
                className="rounded-xl bg-brand-teal px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                + Nuovo abbonamento
              </button>
            ) : tab === "pagamento_rate" ? (
              <button
                type="button"
                onClick={apriModaleRate}
                className="rounded-xl bg-brand-teal px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                + Nuovo piano a rate
              </button>
            ) : (
              <Link
                to={`/nuovo?cliente_id=${id}`}
                className="rounded-xl bg-brand-teal px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                + Nuovo preventivo
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {barraSelezionePianiVisibile ? (
        <BarraSelezione
          count={pianiSelezionati.length}
          etichetta={tab === "pagamento_rate" ? "piani selezionati" : "abbonamenti selezionati"}
          onCancel={annullaSelezionePiani}
          onDelete={() => void eliminaPianiSelezionati()}
        />
      ) : null}

      {mostraModifica ? (
        <ClienteModificaModal
          cliente={cliente}
          onClose={() => setMostraModifica(false)}
          onSaved={setCliente}
        />
      ) : null}

      <ClienteAbbonamentoModals
        mostraNuovo={mostraModalNuovoAb}
        onCloseNuovo={() => setMostraModalNuovoAb(false)}
        abImporto={abImporto}
        onChangeAbImporto={setAbImporto}
        abGiorno={abGiorno}
        onChangeAbGiorno={setAbGiorno}
        abMensilita={abMensilita}
        onChangeAbMensilita={setAbMensilita}
        preventiviDisponibili={preventiviSenzaPiano}
        preventivoSelezionatoId={preventivoSelezionatoId}
        onSelectPreventivo={selezionaPreventivoAbbonamento}
        onCreaAbbonamento={() => void salvaNuovoAbbonamento()}
        mostraNuovoRate={mostraModalNuovoRate}
        onCloseNuovoRate={() => setMostraModalNuovoRate(false)}
        rateImportoTotale={rateImportoTotale}
        onChangeRateImportoTotale={setRateImportoTotale}
        rateNumero={rateNumero}
        onChangeRateNumero={setRateNumero}
        rateGiorno={rateGiorno}
        onChangeRateGiorno={setRateGiorno}
        rateMeseInizio={rateMeseInizio}
        onChangeRateMeseInizio={setRateMeseInizio}
        preventiviDisponibiliRate={preventiviSenzaPiano}
        preventivoRateSelezionatoId={preventivoRateSelezionatoId}
        onSelectPreventivoRate={selezionaPreventivoRate}
        onCreaPianoRate={() => void salvaNuovoPianoRate()}
        mostraModifica={mostraModalModificaAb}
        onCloseModifica={() => setMostraModalModificaAb(false)}
        onAggiornaAbbonamento={() => void salvaModificaAbbonamento()}
        rataSelezionata={rataSelezionata}
        onCloseRata={() => setRataSelezionata(null)}
        rataImporto={rataImporto}
        onChangeRataImporto={setRataImporto}
        pagamentoImporto={pagamentoImporto}
        onChangePagamentoImporto={setPagamentoImporto}
        pagamentoNota={pagamentoNota}
        onChangePagamentoNota={setPagamentoNota}
        onConfermaPagamento={() => void confermaPagamentoRata()}
        mostraRinomina={mostraModalRinominaAb}
        onCloseRinomina={() => setMostraModalRinominaAb(false)}
        nomeAbTemp={nomeAbTemp}
        onChangeNomeAbTemp={setNomeAbTemp}
        onSalvaRinomina={() => void salvaRinominaAbbonamento()}
        mostraAggiungiRata={mostraModalAggiungiRata}
        onCloseAggiungiRata={() => setMostraModalAggiungiRata(false)}
        nuovaRataMese={nuovaRataMese}
        onChangeNuovaRataMese={setNuovaRataMese}
        nuovaRataAnno={nuovaRataAnno}
        onChangeNuovaRataAnno={setNuovaRataAnno}
        nuovaRataImporto={nuovaRataImporto}
        onChangeNuovaRataImporto={setNuovaRataImporto}
        onConfermaAggiungiRata={() => void confermaAggiungiRata()}
      />
      {confirmDialog}
    </PageContainer>
  );
}
