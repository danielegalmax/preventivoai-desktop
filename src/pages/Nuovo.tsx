import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { supabase } from "../lib/supabase";
import { caricaClientiPerSelezione, clienteIdUtilizzabile, salvaPreventivoGenerato } from "../lib/nuovo";
import {
  cancellaBozzaChat,
  cancellaBozzaManuale,
  caricaBozzaChat,
  caricaBozzaManuale,
  salvaBozzaChat,
  salvaBozzaManuale,
  finalizzaBozzaNuovo,
  onBozzaStorageWarning,
  pianoPagamentoTipoDaBozza,
  type NuovoManualeDraft,
  type PianoPagamentoTipo,
} from "../lib/nuovoDraft";
import { calcolaTotaleVoci, calcolaTotaleTrasferte } from "../lib/builder";
import type { TrasfertaBuilder, VoceBuilder } from "../lib/builder";
import { caricaMetodiPagamentoBuilder } from "../lib/pagamenti";
import type { MetodoPagamento } from "../lib/pagamenti";
import { generaPDF, generaPDFFile, aggiornaLogoCacheInHtml, formatNomeFilePdf, salvaPDF, scaricaPdfLocale, creaLinkPagamentoRata } from "../lib/pdf";
import { calcolaAccontoSaldoPiano, generaLinkPaypalMe, importoDaTesto, meseCorrenteString, validaPianiPagamento, type RateAccontoTipo, type RateModalitaPiano } from "preventivoai-shared";
import {
  creaPianoRateDaPreventivo,
  agganciaPianoAPreventivo,
} from "../lib/preventivoPdfPiani";
import {
  creaPianiDopoSalvataggioNuovo,
  preparaTestoPerPdfNuovo,
} from "../lib/nuovoPianiPagamento";
import { caricaServizi } from "../lib/listino";
import { caricaProfiloFiscaleAttivo } from "../lib/fiscale";
import { calcolaFiscalePreventivo, calcolaLordoDaNetto } from "../lib/fiscaleCalcolo";
import type { Messaggio, ProfiloFiscale, Servizio } from "../lib/types";
import { useNuovoBuilderVoci } from "../lib/hooks/nuovo/useNuovoBuilderVoci";
import { useNuovoChat } from "../lib/hooks/nuovo/useNuovoChat";
import { useNuovoModifica } from "../lib/hooks/nuovo/useNuovoModifica";
import BuilderFooterBar from "../components/BuilderFooterBar";
import ClienteNuovoModal from "../components/ClienteNuovoModal";
import MetodoPagamentoModal from "../components/MetodoPagamentoModal";
import PreventivoSuccessModal, { type PdfSuccessAzioni, type PdfSuccessInvio } from "../components/PreventivoSuccessModal";
import NuovoAnteprimaView from "../components/nuovo/NuovoAnteprimaView";
import NuovoBuilderView from "../components/nuovo/NuovoBuilderView";
import NuovoChatView from "../components/nuovo/NuovoChatView";
import PageContainer from "../components/PageContainer";
import { oggiItItLabel } from "../lib/format";
import { risolviModifica, clearModificaSession } from "../lib/modificaPreventivo/modificaSession";
import { buildNuovoManualeDraft } from "../lib/nuovoBozzaSnapshot";
import { resetPercorsoRipresaNuovo } from "../lib/nuovoRipresaPath";
import { percorsoNuovoPreventivoHub } from "../lib/nuovoNav";

type Props = {
  mode: "chat" | "manuale";
};

export default function Nuovo({ mode }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const percorsoBase = mode === "chat" ? "/nuovo/chat" : "/nuovo/manuale";
  const isAnteprima = location.pathname.endsWith("/anteprima");
  const clienteIdDaUrl = searchParams.get("cliente_id") ?? undefined;
  const clienteNomeDaUrl = searchParams.get("cliente_nome") ?? undefined;

  const modifica = risolviModifica({
    modifica: searchParams.get("modifica") ?? undefined,
    versione_padre_id: searchParams.get("versione_padre_id") ?? undefined,
    versione_numero: searchParams.get("versione_numero") ?? undefined,
    cliente_id: searchParams.get("cliente_id") ?? undefined,
    cliente_nome: searchParams.get("cliente_nome") ?? undefined,
    trascrizione: searchParams.get("trascrizione") ?? undefined,
  });
  const testoModifica = modifica?.testoPreventivo || "";
  const versionePrecedente = (modifica?.versioneNumero || parseInt(searchParams.get("versione_numero") || "2", 10)) - 1;
  const inModifica = Boolean(testoModifica);
  const versionePadreId = modifica?.versionePadreId || null;

  const [token, setToken] = useState("");
  const [messaggi, setMessaggi] = useState<Messaggio[]>(
    () => (mode === "chat" ? caricaBozzaChat()?.messaggi : undefined) ?? [],
  );
  const [input, setInput] = useState(() => (mode === "chat" ? caricaBozzaChat()?.input : undefined) ?? "");
  const [loading, setLoading] = useState(false);
  const [recap, setRecap] = useState(() => (mode === "chat" ? caricaBozzaChat()?.recap : undefined) ?? "");
  const [preventivo, setPreventivo] = useState(() => {
    if (mode === "chat") return caricaBozzaChat()?.preventivo ?? "";
    return caricaBozzaManuale()?.preventivo ?? "";
  });
  const [errore, setErrore] = useState("");
  const fineListaRef = useRef<HTMLDivElement>(null);

  const [voci, setVoci] = useState<VoceBuilder[]>(
    () => (mode === "manuale" ? caricaBozzaManuale()?.voci : undefined) ?? [],
  );
  const [servizi, setServizi] = useState<Servizio[]>([]);
  const [includiIva, setIncludiIva] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.includiIva : undefined) ?? false,
  );
  const [noteExtra, setNoteExtra] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.noteExtra : undefined) ?? "",
  );
  const [profiloFiscale, setProfiloFiscale] = useState<ProfiloFiscale | null>(null);
  const [mostraFiscale, setMostraFiscale] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.mostraFiscale : undefined) ?? true,
  );
  const [nettoDesiderato, setNettoDesiderato] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.nettoDesiderato : undefined) ?? "",
  );
  const [lordoCalcolato, setLordoCalcolato] = useState<number | null>(
    () => (mode === "manuale" ? caricaBozzaManuale()?.lordoCalcolato : undefined) ?? null,
  );
  const [storicoVoci, setStoricoVoci] = useState<VoceBuilder[][]>(
    () => (mode === "manuale" ? caricaBozzaManuale()?.storicoVoci : undefined) ?? [],
  );
  const [trasferte, setTrasferte] = useState<TrasfertaBuilder[]>(
    () => (mode === "manuale" ? caricaBozzaManuale()?.trasferte : undefined) ?? [],
  );
  const [mostraTrasferte, setMostraTrasferte] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.mostraTrasferte : undefined) ?? false,
  );
  const [metodiPagamento, setMetodiPagamento] = useState<MetodoPagamento[]>([]);
  const [metodoPagamentoSelezionato, setMetodoPagamentoSelezionato] = useState<MetodoPagamento | null>(
    () => (mode === "manuale" ? caricaBozzaManuale()?.metodoPagamentoSelezionato : undefined) ?? null,
  );
  const [metodoPagamentoNessuno, setMetodoPagamentoNessuno] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.metodoPagamentoNessuno : undefined) ?? false,
  );
  const [mostraModalPagamento, setMostraModalPagamento] = useState(false);

  const [pianoPagamentoTipo, setPianoPagamentoTipo] = useState<PianoPagamentoTipo>(() => {
    if (mode !== "manuale") return "nessuno";
    const bozza = caricaBozzaManuale();
    return bozza ? pianoPagamentoTipoDaBozza(bozza) : "nessuno";
  });
  const [abImporto, setAbImporto] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.abImporto : undefined) ?? "",
  );
  const [abGiorno, setAbGiorno] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.abGiorno : undefined) ?? "1",
  );
  const [abMeseInizio, setAbMeseInizio] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.abMeseInizio : undefined) ?? meseCorrenteString(),
  );
  const [abMensilita, setAbMensilita] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.abMensilita : undefined) ?? "",
  );
  const [abVisibileNelPDF, setAbVisibileNelPDF] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.abVisibileNelPDF : undefined) ?? true,
  );
  const [rateNumero, setRateNumero] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.rateNumero : undefined) ?? "",
  );
  const [rateGiornoScadenza, setRateGiornoScadenza] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.rateGiornoScadenza : undefined) ?? "1",
  );
  const [rateMeseInizio, setRateMeseInizio] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.rateMeseInizio : undefined) ?? meseCorrenteString(),
  );
  const [rateVisibileNelPDF, setRateVisibileNelPDF] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.rateVisibileNelPDF : undefined) ?? true,
  );
  const [rateAccontoTipo, setRateAccontoTipo] = useState<RateAccontoTipo>(
    () => (mode === "manuale" ? caricaBozzaManuale()?.rateAccontoTipo : undefined) ?? "fisso",
  );
  const [rateAccontoValore, setRateAccontoValore] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.rateAccontoValore : undefined) ?? "",
  );

  const pagamentoRateAttivo = pianoPagamentoTipo === "rate" || pianoPagamentoTipo === "acconto";
  const rateModalita: RateModalitaPiano = pianoPagamentoTipo === "acconto" ? "acconto_saldo" : "rate_uguali";
  const abbonamentoAttivo = pianoPagamentoTipo === "abbonamento";

  const [clienti, setClienti] = useState<{ id: string; nome: string }[]>([]);
  const [clienteSelezionatoId, setClienteSelezionatoId] = useState(() => {
    const daUrl = new URLSearchParams(window.location.search).get("cliente_id");
    if (daUrl) return daUrl;
    if (mode === "chat") return caricaBozzaChat()?.clienteSelezionatoId ?? "";
    return caricaBozzaManuale()?.clienteSelezionatoId ?? "";
  });
  const [mostraModalCliente, setMostraModalCliente] = useState(false);
  const [nomeClienteSuggerito, setNomeClienteSuggerito] = useState("");
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  const [salvato, setSalvato] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(() => {
    if (mode === "chat") return caricaBozzaChat()?.pdfUrl ?? "";
    return caricaBozzaManuale()?.pdfUrl ?? "";
  });
  const [messaggioSuccesso, setMessaggioSuccesso] = useState("");
  const [modalPdfSuccesso, setModalPdfSuccesso] = useState<{
    dettaglio: string;
    azioni?: PdfSuccessAzioni;
    invio?: PdfSuccessInvio;
  } | null>(null);

  const [template, setTemplate] = useState(() => {
    if (mode === "chat") return caricaBozzaChat()?.template ?? "pulito";
    return caricaBozzaManuale()?.template ?? "pulito";
  });
  const [nascondiPrezzi, setNascondiPrezzi] = useState(
    () => (mode === "manuale" ? caricaBozzaManuale()?.nascondiPrezzi : undefined) ?? false,
  );
  const [htmlPreview, setHtmlPreview] = useState("");
  const [caricandoPreview, setCaricandoPreview] = useState(false);
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bloccoSalvataggioBozzaRef = useRef(false);
  const clienteBozzaVerificatoRef = useRef(false);
  const [avvisoBozza, setAvvisoBozza] = useState<string | null>(null);
  const [clientiCaricati, setClientiCaricati] = useState(false);
  const [erroreServizi, setErroreServizi] = useState<string | null>(null);
  const [erroreMetodiPagamento, setErroreMetodiPagamento] = useState<string | null>(null);

  function nomeClienteBozza() {
    return (
      clienti.find((c) => c.id === clienteSelezionatoId)?.nome
      ?? clienteNomeDaUrl
      ?? ""
    );
  }

  function snapshotBozzaManuale(override: Partial<NuovoManualeDraft> = {}): NuovoManualeDraft {
    return buildNuovoManualeDraft(
      {
        voci,
        trasferte,
        mostraTrasferte,
        metodoPagamentoSelezionato,
        metodoPagamentoNessuno,
        includiIva,
        noteExtra,
        mostraFiscale,
        nettoDesiderato,
        lordoCalcolato,
        storicoVoci,
        clienteSelezionatoId,
        clienteNome: nomeClienteBozza(),
        preventivo,
        template,
        pdfUrl,
        nascondiPrezzi,
        pianoPagamentoTipo,
        abImporto,
        abGiorno,
        abMeseInizio,
        abMensilita,
        abVisibileNelPDF,
        rateNumero,
        rateGiornoScadenza,
        rateMeseInizio,
        rateVisibileNelPDF,
        rateAccontoTipo,
        rateAccontoValore,
      },
      override,
    );
  }

  function persistiBozzaManuale(override: Partial<NuovoManualeDraft> = {}) {
    salvaBozzaManuale(snapshotBozzaManuale(override));
  }

  function finalizzaBozzaWorkflow() {
    if (inModifica) return;
    bloccoSalvataggioBozzaRef.current = true;
    finalizzaBozzaNuovo(mode);
    resetPercorsoRipresaNuovo();
    window.setTimeout(() => {
      bloccoSalvataggioBozzaRef.current = false;
    }, 400);
  }

  function vaiAllAnteprima(override: Partial<NuovoManualeDraft> = {}) {
    if (mode === "manuale") persistiBozzaManuale(override);
    navigate(`${percorsoBase}/anteprima`);
  }

  function tornaAllAssemblaggio() {
    if (mode === "manuale") persistiBozzaManuale();
    navigate(percorsoBase);
  }

  useEffect(() => {
    if (isAnteprima && !preventivo) {
      navigate(percorsoBase, { replace: true });
    }
  }, [isAnteprima, preventivo, percorsoBase, navigate]);

  useEffect(() => {
    return onBozzaStorageWarning((warning) => {
      setAvvisoBozza(warning.message);
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || "");
    });
    caricaClientiPerSelezione().then((list) => {
      setClienti(list);
      setClientiCaricati(true);
    });
    caricaServizi().then(({ data, error }) => {
      setServizi(data);
      setErroreServizi(error);
    });
    caricaProfiloFiscaleAttivo().then(setProfiloFiscale);
    if (mode === "manuale") {
      caricaMetodiPagamentoBuilder().then(({ metodiPagamento: metodi, predefinito, error }) => {
        setMetodiPagamento(metodi);
        setErroreMetodiPagamento(error);
        if (
          predefinito &&
          !caricaBozzaManuale()?.metodoPagamentoSelezionato &&
          !caricaBozzaManuale()?.metodoPagamentoNessuno
        ) {
          setMetodoPagamentoSelezionato(predefinito);
        }
      });
    }
    if (mode === "chat" && inModifica) {
      caricaMetodiPagamentoBuilder().then(({ metodiPagamento: metodi, error }) => {
        setMetodiPagamento(metodi);
        setErroreMetodiPagamento(error);
      });
    }
  }, [mode, inModifica]);

  useEffect(() => {
    if (inModifica || clienteBozzaVerificatoRef.current || !clientiCaricati) return;

    const idDaVerificare = clienteSelezionatoId;
    clienteBozzaVerificatoRef.current = true;
    if (!idDaVerificare) return;

    void clienteIdUtilizzabile(idDaVerificare).then((ok) => {
      if (ok) return;

      setClienteSelezionatoId("");
      setAvvisoBozza("Il cliente precedentemente selezionato non è più disponibile");

      if (mode === "chat") {
        const draft = caricaBozzaChat();
        if (draft) {
          salvaBozzaChat({ ...draft, clienteSelezionatoId: "", clienteNome: "" });
        }
      } else {
        salvaBozzaManuale(snapshotBozzaManuale({ clienteSelezionatoId: "", clienteNome: "" }));
      }
    });
  }, [clientiCaricati, inModifica, mode]);

  useEffect(() => {
    if (!clientiCaricati || bloccoSalvataggioBozzaRef.current || inModifica) return;
    const timeout = setTimeout(() => {
      if (mode === "chat") {
        salvaBozzaChat({
          messaggi,
          input,
          recap,
          preventivo,
          clienteSelezionatoId,
          clienteNome: nomeClienteBozza(),
          template,
          pdfUrl,
        });
      } else {
        salvaBozzaManuale(snapshotBozzaManuale());
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [
    mode,
    messaggi,
    input,
    recap,
    preventivo,
    clienteSelezionatoId,
    clienti,
    clientiCaricati,
    template,
    pdfUrl,
    nascondiPrezzi,
    voci,
    includiIva,
    noteExtra,
    mostraFiscale,
    nettoDesiderato,
    lordoCalcolato,
    storicoVoci,
    trasferte,
    mostraTrasferte,
    metodoPagamentoSelezionato,
    metodoPagamentoNessuno,
    pianoPagamentoTipo,
    abImporto,
    abGiorno,
    abMeseInizio,
    abMensilita,
    abVisibileNelPDF,
    rateNumero,
    rateGiornoScadenza,
    rateMeseInizio,
    rateVisibileNelPDF,
    rateAccontoTipo,
    rateAccontoValore,
    inModifica,
  ]);

  const risultatoFiscale = useMemo(
    () => calcolaFiscalePreventivo(profiloFiscale, mostraFiscale, voci, trasferte, includiIva),
    [profiloFiscale, mostraFiscale, voci, trasferte, includiIva],
  );

  const totaleBase = calcolaTotaleVoci(voci) + calcolaTotaleTrasferte(trasferte);
  const totaleConIva = includiIva ? totaleBase * 1.22 : totaleBase;
  const importoAnteprima = mode === "manuale" ? totaleConIva : (importoDaTesto(preventivo) || 0);

  function clienteCollegato() {
    return !!clienteSelezionatoId;
  }

  const { invia, inviaTrascrizione, generaDaRecap } = useNuovoChat({
    token,
    messaggi,
    input,
    loading,
    clienteSelezionatoId,
    recap,
    setMessaggi,
    setInput,
    setRecap,
    setPreventivo,
    setErrore,
    setLoading,
    setClienteSelezionatoId,
    setClienti,
    setNomeClienteSuggerito,
    setMostraModalCliente,
    vaiAllAnteprima,
  });

  useNuovoModifica({
    modifica,
    searchParams,
    inModifica,
    testoModifica,
    versionePrecedente,
    mode,
    servizi,
    metodiPagamento,
    token,
    messaggiLength: messaggi.length,
    setClienteSelezionatoId,
    setClienti,
    setInput,
    setMessaggi,
    setMetodoPagamentoSelezionato,
    setMetodoPagamentoNessuno,
    setVoci,
    setNoteExtra,
    setIncludiIva,
    setTrasferte,
    setMostraTrasferte,
    inviaTrascrizione,
  });

  const {
    aggiornaVoce,
    handleSalvaNelListinoChange,
    aggiungiVoceCustom,
    riordinaVoci,
    rimuoviVoce,
    aggiungiServizioListino,
    generaDaBuilder,
  } = useNuovoBuilderVoci({
    voci,
    servizi,
    setVoci,
    setServizi,
    setErrore,
    setPreventivo,
    clienti,
    clienteSelezionatoId,
    trasferte,
    includiIva,
    noteExtra,
    metodoPagamentoSelezionato,
    pagamentoRateAttivo,
    abbonamentoAttivo,
    clienteCollegato,
    rateNumero,
    rateGiornoScadenza,
    rateMeseInizio,
    abGiorno,
    abMeseInizio,
    rateModalita,
    rateAccontoTipo,
    rateAccontoValore,
    totaleConIva,
    vaiAllAnteprima,
  });

  useEffect(() => {
    fineListaRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messaggi, recap, preventivo]);

  useEffect(() => {
    if (!preventivo || !token) return;
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    previewTimeout.current = setTimeout(() => {
      aggiornaPreview();
    }, 300);
    return () => {
      if (previewTimeout.current) clearTimeout(previewTimeout.current);
    };
  }, [
    preventivo,
    template,
    token,
    clienteSelezionatoId,
    pianoPagamentoTipo,
    abVisibileNelPDF,
    abImporto,
    abGiorno,
    abMeseInizio,
    rateVisibileNelPDF,
    rateNumero,
    rateGiornoScadenza,
    rateMeseInizio,
    rateAccontoTipo,
    rateAccontoValore,
    metodoPagamentoSelezionato,
    totaleConIva,
    versionePadreId,
    nascondiPrezzi,
  ]);

  function richiediClientePerPagamentoRicorrente() {
    if (clienteCollegato()) return true;
    window.alert("Associa un cliente al preventivo per abbonamento o pagamento a rate.");
    return false;
  }

  function onChangePianoPagamentoTipo(nuovoTipo: PianoPagamentoTipo) {
    if (nuovoTipo !== "nessuno" && !richiediClientePerPagamentoRicorrente()) return;
    setPianoPagamentoTipo(nuovoTipo);
    if (nuovoTipo === "abbonamento" && importoAnteprima > 0 && !abImporto.trim()) {
      setAbImporto(String(Math.round(importoAnteprima)));
    }
  }

  async function preparaTestoPerPdf(testo: string, accontoLinkPrecomputato?: string): Promise<string> {
    return preparaTestoPerPdfNuovo({
      testo,
      token,
      mode,
      totaleConIva,
      abbonamentoAttivo,
      abVisibileNelPDF,
      abImporto,
      abGiorno,
      abMeseInizio,
      pagamentoRateAttivo,
      rateVisibileNelPDF,
      rateNumero,
      rateGiornoScadenza,
      rateMeseInizio,
      rateModalita,
      rateAccontoTipo,
      rateAccontoValore,
      accontoLinkPrecomputato,
      metodoPagamento: metodoPagamentoSelezionato,
    });
  }

  async function creaPianiDopoSalvataggio(preventivoId: string) {
    await creaPianiDopoSalvataggioNuovo({
      preventivoId,
      cliente: clienti.find((c) => c.id === clienteSelezionatoId),
      abbonamentoAttivo,
      abImporto,
      abGiorno,
      abMeseInizio,
      abMensilita,
      pagamentoRateAttivo,
      rateModalita,
      mode,
      totaleConIva,
      preventivo,
      rateNumero,
      rateGiornoScadenza,
      rateMeseInizio,
    });
  }

  async function aggiornaPreview() {
    if (!preventivo || !token) return;
    setCaricandoPreview(true);
    try {
      const testoFinale = await preparaTestoPerPdf(preventivo);
      const data = await generaPDF({
        testo: testoFinale,
        template,
        token,
        cliente_id: clienteSelezionatoId,
        versione_padre_id: versionePadreId,
        nascondi_prezzi: nascondiPrezzi,
      });
      if (data.html) setHtmlPreview(aggiornaLogoCacheInHtml(data.html));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore anteprima PDF.");
    } finally {
      setCaricandoPreview(false);
    }
  }

  async function salva() {
    setSalvataggioInCorso(true);
    setErrore("");
    setMessaggioSuccesso("");
    const clienteNome = clienti.find((c) => c.id === clienteSelezionatoId)?.nome || "";
    const titolo = clienteNome ? `Preventivo ${clienteNome}` : `Preventivo ${oggiItItLabel()}`;
    const { error } = await salvaPreventivoGenerato({
      testo: preventivo,
      clienteId: clienteSelezionatoId,
      clienteNome,
      titolo,
      template,
      pdfUrl: pdfUrl || undefined,
      versione: inModifica ? modifica?.versioneNumero : undefined,
      preventivoPadreId: inModifica ? versionePadreId : undefined,
    });
    setSalvataggioInCorso(false);
    if (error) {
      setErrore(error.message);
      return;
    }
    setSalvato(true);
    finalizzaBozzaWorkflow();
  }

  function titoloPreventivo() {
    const clienteNome = clienti.find((c) => c.id === clienteSelezionatoId)?.nome || "";
    return clienteNome ? `Preventivo ${clienteNome}` : `Preventivo ${oggiItItLabel()}`;
  }

  async function generaPdf() {
    if (!token || !preventivo) return;
    const errPiani = validaPianiPagamento({
      pagamentoRateAttivo,
      abbonamentoAttivo,
      clienteCollegato: clienteCollegato(),
      rateNumero,
      rateGiornoScadenza,
      rateMeseInizio,
      abGiorno,
      abMeseInizio,
      rateModalita,
      rateAccontoTipo,
      rateAccontoValore,
      rateImportoTotale: importoAnteprima,
    });
    if (errPiani) {
      setErrore(errPiani);
      return;
    }
    setGenerandoPdf(true);
    setErrore("");
    setMessaggioSuccesso("");
    try {
      let accontoAbbonamentoId: string | null = null;
      let accontoLinkPrecomputato: string | undefined;

      if (pagamentoRateAttivo && rateModalita === "acconto_saldo" && clienteCollegato()) {
        const cliente = clienti.find((c) => c.id === clienteSelezionatoId);
        if (!cliente) {
          window.alert("Cliente non trovato.");
          return;
        }

        const importoRate = importoAnteprima;
        const accontoSaldo = calcolaAccontoSaldoPiano(importoRate, rateAccontoTipo, rateAccontoValore);
        if (!accontoSaldo) {
          window.alert("Importo acconto non valido.");
          return;
        }

        const r = await creaPianoRateDaPreventivo({
          cliente,
          preventivoId: null,
          importoTotale: importoRate,
          numeroRateRaw: "2",
          giornoScadenzaRaw: rateGiornoScadenza,
          meseInizioRaw: rateMeseInizio,
          importiPersonalizzati: [accontoSaldo.acconto, accontoSaldo.saldo],
        }).catch((e: unknown) => {
          window.alert(
            e instanceof Error
              ? `Piano incompleto: ${e.message}`
              : "Impossibile creare il piano acconto. Riprova.",
          );
          return null;
        });
        if (!r) return;
        if (r.esistente || !r.abbonamentoId) {
          window.alert("Impossibile creare il piano acconto. Riprova.");
          return;
        }

        const { data: rate, error: rateErr } = await supabase
          .from("rate_abbonamento")
          .select("id, mese, anno")
          .eq("abbonamento_id", r.abbonamentoId)
          .order("anno", { ascending: true })
          .order("mese", { ascending: true });

        if (rateErr || !rate?.length) {
          window.alert("Impossibile creare il piano acconto. Riprova.");
          return;
        }

        accontoAbbonamentoId = r.abbonamentoId;
        const rataAcconto = rate[0];
        const metodo = metodoPagamentoSelezionato;

        if (metodo?.tipo === "stripe") {
          accontoLinkPrecomputato = await creaLinkPagamentoRata(rataAcconto.id, cliente.nome, token);
        } else if (metodo?.tipo === "paypal" && metodo.dati?.paypalme?.trim()) {
          accontoLinkPrecomputato = generaLinkPaypalMe(metodo.dati.paypalme, accontoSaldo.acconto);
        }
      }

      const testoFinale = await preparaTestoPerPdf(preventivo, accontoLinkPrecomputato);
      const data = await generaPDFFile({
        testo: testoFinale,
        template,
        token,
        cliente_id: clienteSelezionatoId,
        versione_padre_id: versionePadreId,
        nascondi_prezzi: nascondiPrezzi,
      });

      let urlCaricato = "";
      let storagePathCaricato = "";
      try {
        const upload = await salvaPDF(data.pdf_base64, token);
        urlCaricato = upload.pdfUrl;
        storagePathCaricato = upload.storagePath || "";
      } catch (err) {
        console.warn("Upload PDF fallito:", err);
      }

      const clienteNome = clienti.find((c) => c.id === clienteSelezionatoId)?.nome || "";
      const titolo = data.numeroPreventivo.trim() || titoloPreventivo();
      const clienteIdSalvato = clienteSelezionatoId;

      const { error, id } = await salvaPreventivoGenerato({
        testo: testoFinale,
        clienteId: clienteSelezionatoId,
        clienteNome,
        titolo,
        template,
        versione: data.versione,
        pdfUrl: storagePathCaricato || urlCaricato || undefined,
        preventivoPadreId: inModifica ? versionePadreId : undefined,
      });
      if (error) throw new Error(error.message);
      const idPerPiani = id ?? null;
      setSalvato(true);

      if (idPerPiani) {
        if (accontoAbbonamentoId) {
          const agganciato = await agganciaPianoAPreventivo(accontoAbbonamentoId, idPerPiani);
          if (!agganciato) {
            window.alert("Preventivo salvato, ma collegamento al piano acconto non riuscito. Collegalo dalla cartella cliente.");
          }
        }
        await creaPianiDopoSalvataggio(idPerPiani);
      }

      const nomeFile = formatNomeFilePdf(clienteNome, data.numeroPreventivo);
      const percorsoLocale = await scaricaPdfLocale(data.pdf_base64, nomeFile, clienteNome || undefined);

      if (urlCaricato) setPdfUrl(urlCaricato);

      finalizzaBozzaWorkflow();

      const dettaglioBase = percorsoLocale
        ? "PDF salvato sul tuo PC."
        : "Preventivo salvato nello storico.";
      const haStripe = testoFinale.includes("LINK PAGAMENTO:");

      setModalPdfSuccesso({
        dettaglio: inModifica
          ? `Versione v${data.versione} generata e salvata.`
          : dettaglioBase,
        azioni: {
          percorsoLocale: percorsoLocale || undefined,
          pdfUrl: urlCaricato || undefined,
          pdfBase64: data.pdf_base64,
          nomeFile,
        },
        invio: {
          preventivoId: idPerPiani,
          clienteId: clienteIdSalvato || undefined,
          nomeCliente: clienteNome || undefined,
          haStripe,
          uploadOnlineOk: !!urlCaricato,
          titoloIniziale: titolo,
        },
      });
      if (inModifica) clearModificaSession();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore nella generazione del PDF.");
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function apriPdf() {
    if (!pdfUrl) return;
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(pdfUrl);
    } catch {
      window.open(pdfUrl, "_blank");
    }
  }

  function resetNuovoWorkflow(opzioni?: { navigare?: boolean }) {
    bloccoSalvataggioBozzaRef.current = true;
    clearModificaSession();
    if (mode === "chat") cancellaBozzaChat();
    else cancellaBozzaManuale();

    setMessaggi([]);
    setInput("");
    setRecap("");
    setPreventivo("");
    setErrore("");
    setClienteSelezionatoId("");
    setNomeClienteSuggerito("");
    setMostraModalCliente(false);
    setSalvato(false);
    setGenerandoPdf(false);
    setSalvataggioInCorso(false);
    setPdfUrl("");
    setMessaggioSuccesso("");
    setVoci([]);
    setIncludiIva(false);
    setNoteExtra("");
    setProfiloFiscale(null);
    setMostraFiscale(true);
    setNettoDesiderato("");
    setLordoCalcolato(null);
    setStoricoVoci([]);
    setTrasferte([]);
    setMostraTrasferte(false);
    setMetodoPagamentoSelezionato(null);
    setMetodoPagamentoNessuno(false);
    setMetodiPagamento([]);
    setMostraModalPagamento(false);
    setPianoPagamentoTipo("nessuno");
    setAbImporto("");
    setAbGiorno("1");
    setAbMeseInizio(meseCorrenteString());
    setAbMensilita("");
    setAbVisibileNelPDF(true);
    setRateNumero("");
    setRateGiornoScadenza("1");
    setRateMeseInizio(meseCorrenteString());
    setRateVisibileNelPDF(true);
    setTemplate("pulito");
    setHtmlPreview("");
    setCaricandoPreview(false);

    caricaProfiloFiscaleAttivo().then(setProfiloFiscale);
    if (mode === "manuale") {
      caricaMetodiPagamentoBuilder().then(({ metodiPagamento: metodi, predefinito, error }) => {
        setMetodiPagamento(metodi);
        setErroreMetodiPagamento(error);
        if (predefinito) setMetodoPagamentoSelezionato(predefinito);
      });
    }

    if (opzioni?.navigare !== false) {
      navigate(percorsoBase, { replace: true });
    }

    window.setTimeout(() => {
      bloccoSalvataggioBozzaRef.current = false;
    }, 400);
  }

  function ricomincia() {
    resetNuovoWorkflow();
  }

  const builderManualeAttivo = !isAnteprima && mode === "manuale";
  const vociValide = voci.filter((v) => v.nome.trim());
  const titoloModalita = isAnteprima
    ? inModifica ? `Anteprima — versione v${modifica?.versioneNumero}` : "Anteprima preventivo"
    : mode === "chat"
      ? inModifica ? `Modifica in chat (v${modifica?.versioneNumero})` : "Chat con AI"
      : inModifica ? `Builder — versione v${modifica?.versioneNumero}` : "Builder manuale";

  return (
    <PageContainer
      wide={isAnteprima}
      className={
        isAnteprima ? "flex h-full min-h-0 flex-col overflow-hidden py-4 lg:py-4" : undefined
      }
    >
      {avvisoBozza ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <p>{avvisoBozza}</p>
          <button
            type="button"
            onClick={() => setAvvisoBozza(null)}
            className="shrink-0 text-amber-700/70 hover:text-amber-900"
            aria-label="Chiudi avviso"
          >
            ×
          </button>
        </div>
      ) : null}
      <div
        className={
          builderManualeAttivo
            ? "pb-32"
            : isAnteprima
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : undefined
        }
      >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${isAnteprima ? "shrink-0" : ""}`}
      >
        <div>
          {isAnteprima ? (
            <button
              type="button"
              onClick={tornaAllAssemblaggio}
              className="text-sm text-brand-navy/60 hover:text-brand-navy"
            >
              ← Modifica preventivo
            </button>
          ) : inModifica ? (
            <Link to="/storico" className="text-sm text-brand-navy/60 hover:text-brand-navy">
              ← Torna allo storico
            </Link>
          ) : (
            <Link to={percorsoNuovoPreventivoHub(clienteIdDaUrl, clienteNomeDaUrl)} className="text-sm text-brand-navy/60 hover:text-brand-navy">
              ← Cambia metodo
            </Link>
          )}
          <h1 className="mt-1 text-2xl font-semibold text-brand-navy">{titoloModalita}</h1>
        </div>
        {(messaggi.length > 0 || recap || preventivo || voci.some((v) => v.nome.trim())) && (
          <button onClick={ricomincia} className="text-sm text-brand-navy/60 hover:text-brand-navy">
            Ricomincia
          </button>
        )}
      </div>

      {!isAnteprima && mode === "chat" && (
        <NuovoChatView
          clienti={clienti}
          clienteSelezionatoId={clienteSelezionatoId}
          onSelectCliente={setClienteSelezionatoId}
          onClearCliente={() => setClienteSelezionatoId("")}
          onNuovoCliente={() => setMostraModalCliente(true)}
          messaggi={messaggi}
          recap={recap}
          errore={errore}
          loading={loading}
          inModifica={inModifica}
          fineListaRef={fineListaRef}
          onGeneraDaRecap={() => void generaDaRecap()}
          input={input}
          onInputChange={setInput}
          onInvia={invia}
        />
      )}

      {!isAnteprima && mode === "manuale" && (
        <NuovoBuilderView
          clienti={clienti}
          clienteSelezionatoId={clienteSelezionatoId}
          onSelectCliente={setClienteSelezionatoId}
          onClearCliente={() => setClienteSelezionatoId("")}
          onNuovoCliente={() => setMostraModalCliente(true)}
          servizi={servizi}
          voci={voci}
          erroreServizi={erroreServizi}
          onAggiungiServizioListino={aggiungiServizioListino}
          onRimuoviVoce={rimuoviVoce}
          onAggiornaVoce={aggiornaVoce}
          onAggiungiVoceCustom={aggiungiVoceCustom}
          onSalvaNelListinoChange={handleSalvaNelListinoChange}
          onRiordinaVoci={riordinaVoci}
          metodiPagamento={metodiPagamento}
          metodoPagamentoSelezionato={metodoPagamentoSelezionato}
          metodoPagamentoNessuno={metodoPagamentoNessuno}
          erroreMetodiPagamento={erroreMetodiPagamento}
          onOpenPagamento={() => setMostraModalPagamento(true)}
          includiIva={includiIva}
          onIncludiIvaChange={setIncludiIva}
          trasferte={trasferte}
          setTrasferte={setTrasferte}
          mostraTrasferte={mostraTrasferte}
          setMostraTrasferte={setMostraTrasferte}
          noteExtra={noteExtra}
          onNoteExtraChange={setNoteExtra}
          profiloFiscale={profiloFiscale}
          mostraFiscale={mostraFiscale}
          setMostraFiscale={setMostraFiscale}
          risultatoFiscale={risultatoFiscale}
          setVoci={setVoci}
          storicoVoci={storicoVoci}
          setStoricoVoci={setStoricoVoci}
          nettoDesiderato={nettoDesiderato}
          setNettoDesiderato={setNettoDesiderato}
          lordoCalcolato={lordoCalcolato}
          setLordoCalcolato={setLordoCalcolato}
          calcolaLordoDaNetto={(netto) => calcolaLordoDaNetto(netto, profiloFiscale)}
          errore={errore}
        />
      )}

      {isAnteprima && preventivo && (
        <NuovoAnteprimaView
          clienti={clienti}
          clienteSelezionatoId={clienteSelezionatoId}
          onSelectCliente={setClienteSelezionatoId}
          onClearCliente={() => setClienteSelezionatoId("")}
          onNuovoCliente={() => setMostraModalCliente(true)}
          template={template}
          onSelectTemplate={setTemplate}
          pianoPagamentoTipo={pianoPagamentoTipo}
          onChangePianoPagamentoTipo={onChangePianoPagamentoTipo}
          importoAnteprima={importoAnteprima}
          rateAccontoTipo={rateAccontoTipo}
          rateAccontoValore={rateAccontoValore}
          rateNumero={rateNumero}
          rateGiornoScadenza={rateGiornoScadenza}
          rateMeseInizio={rateMeseInizio}
          rateVisibileNelPDF={rateVisibileNelPDF}
          onChangeRateAccontoTipo={setRateAccontoTipo}
          onChangeRateAccontoValore={setRateAccontoValore}
          onChangeRateNumero={setRateNumero}
          onChangeRateGiornoScadenza={setRateGiornoScadenza}
          onChangeRateMeseInizio={setRateMeseInizio}
          onChangeRateVisibileNelPDF={setRateVisibileNelPDF}
          abImporto={abImporto}
          abGiorno={abGiorno}
          abMeseInizio={abMeseInizio}
          abMensilita={abMensilita}
          abVisibileNelPDF={abVisibileNelPDF}
          onChangeAbImporto={setAbImporto}
          onChangeAbGiorno={setAbGiorno}
          onChangeAbMeseInizio={setAbMeseInizio}
          onChangeAbMensilita={setAbMensilita}
          onChangeAbVisibileNelPDF={setAbVisibileNelPDF}
          mode={mode}
          nascondiPrezzi={nascondiPrezzi}
          onNascondiPrezziChange={setNascondiPrezzi}
          onGeneraPdf={generaPdf}
          generandoPdf={generandoPdf}
          preventivo={preventivo}
          onSalva={salva}
          salvataggioInCorso={salvataggioInCorso}
          salvato={salvato}
          pdfUrl={pdfUrl}
          onApriPdf={apriPdf}
          messaggioSuccesso={messaggioSuccesso}
          errore={errore}
          htmlPreview={htmlPreview}
          caricandoPreview={caricandoPreview}
        />
      )}

      {mostraModalPagamento && (
        <MetodoPagamentoModal
          open={mostraModalPagamento}
          metodiPagamento={metodiPagamento}
          metodoPagamentoSelezionato={metodoPagamentoSelezionato}
          metodoPagamentoNessuno={metodoPagamentoNessuno}
          onClose={() => setMostraModalPagamento(false)}
          onSelect={(metodo) => {
            setMetodoPagamentoSelezionato(metodo);
            setMetodoPagamentoNessuno(false);
          }}
          onSelectNessuno={() => {
            setMetodoPagamentoSelezionato(null);
            setMetodoPagamentoNessuno(true);
          }}
        />
      )}

      {mostraModalCliente && (
        <ClienteNuovoModal
          nomeIniziale={nomeClienteSuggerito}
          onClose={() => {
            setMostraModalCliente(false);
            setNomeClienteSuggerito("");
          }}
          onCreated={(cliente) => {
            setClienti((prev) => [...prev, cliente]);
            setClienteSelezionatoId(cliente.id);
            setNomeClienteSuggerito("");
          }}
        />
      )}

      <PreventivoSuccessModal
        open={modalPdfSuccesso !== null}
        dettaglio={modalPdfSuccesso?.dettaglio}
        azioni={modalPdfSuccesso?.azioni}
        invio={modalPdfSuccesso?.invio}
        onClose={() => setModalPdfSuccesso(null)}
      />

      </div>

      {builderManualeAttivo && (
        <BuilderFooterBar
          totale={totaleConIva}
          buttonLabel="Genera preventivo"
          disabled={vociValide.length === 0}
          onPress={generaDaBuilder}
        />
      )}
    </PageContainer>
  );
}
