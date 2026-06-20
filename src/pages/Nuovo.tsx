import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { supabase } from "../lib/supabase";
import { inviaMessaggio, convertiRecap, applicaRispostaChat, estraiNomeCliente, cercaCliente } from "../lib/chat";
import { aggiornaPreventivoDaBuilder, caricaClientiPerSelezione, preventivoIdUtilizzabile, salvaPreventivoGenerato } from "../lib/nuovo";
import {
  cancellaBozzaChat,
  cancellaBozzaManuale,
  caricaBozzaChat,
  caricaBozzaManuale,
  salvaBozzaChat,
  salvaBozzaManuale,
  pianoPagamentoTipoDaBozza,
  type NuovoManualeDraft,
  type PianoPagamentoTipo,
} from "../lib/nuovoDraft";
import { generaTestoPreventivoBuilder, calcolaTotaleVoci, calcolaTotaleTrasferte, formatImportoVoce, isVoceCustom } from "../lib/builder";
import type { TrasfertaBuilder, VoceBuilder } from "../lib/builder";
import { caricaMetodiPagamentoBuilder } from "../lib/pagamenti";
import type { MetodoPagamento } from "../lib/pagamenti";
import { generaPDF, generaPDFFile, aggiornaLogoCacheInHtml, formatNomeFilePdf, salvaPDF, scaricaPdfLocale, creaLinkPagamentoRata } from "../lib/pdf";
import { calcolaAccontoSaldoPiano, generaLinkPaypalMe, importoDaTesto, meseCorrenteString, validaPianiPagamento, type RateAccontoTipo, type RateModalitaPiano } from "preventivoai-shared";
import {
  creaAbbonamentoDaPreventivo,
  creaPianoRateDaPreventivo,
  agganciaPianoAPreventivo,
  testoConPagamento,
} from "../lib/preventivoPdfPiani";
import { caricaServizi, creaServizio } from "../lib/listino";
import { caricaProfiloFiscaleAttivo } from "../lib/fiscale";
import { calcolaFiscalePreventivo, calcolaLordoDaNetto } from "../lib/fiscaleCalcolo";
import type { Messaggio, ProfiloFiscale, Servizio } from "../lib/types";
import AnalisiFiscaleCard from "../components/AnalisiFiscaleCard";
import BuilderFooterBar from "../components/BuilderFooterBar";
import BuilderClienteCard from "../components/BuilderClienteCard";
import ClienteNuovoModal from "../components/ClienteNuovoModal";
import MetodoPagamentoModal from "../components/MetodoPagamentoModal";
import PagamentoCard from "../components/PagamentoCard";
import IvaCard from "../components/IvaCard";
import BuilderPianoPagamentoCard from "../components/builder/BuilderPianoPagamentoCard";
import PreventivoPdfTemplatePicker from "../components/PreventivoPdfTemplatePicker";
import PreventivoPdfPreview from "../components/PreventivoPdfPreview";
import PreventivoSuccessModal, { type PdfSuccessAzioni, type PdfSuccessInvio } from "../components/PreventivoSuccessModal";
import ServiziListinoCard from "../components/ServiziListinoCard";
import TrasferteCard from "../components/TrasferteCard";
import VociPreventivoSection from "../components/VociPreventivoSection";
import PageContainer from "../components/PageContainer";
import { PLACEHOLDER } from "../lib/placeholders";
import { risolviModifica, clearModificaSession } from "../lib/modificaPreventivo/modificaSession";
import {
  collegaVociAlListino,
  parsePreventivoTesto,
  trovaMetodoPagamentoDaNome,
  vociParsedConId,
} from "../lib/parsePreventivoTesto";

type Props = {
  mode: "chat" | "manuale";
};

export default function Nuovo({ mode }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const percorsoBase = mode === "chat" ? "/nuovo/chat" : "/nuovo/manuale";
  const isAnteprima = location.pathname.endsWith("/anteprima");

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
  const [preventivoSalvatoId, setPreventivoSalvatoId] = useState<string | null>(null);
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
  const [htmlPreview, setHtmlPreview] = useState("");
  const [caricandoPreview, setCaricandoPreview] = useState(false);
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salvataggioListinoRef = useRef<Set<string>>(new Set());
  const bloccoSalvataggioBozzaRef = useRef(false);
  const modificaInizializzata = useRef(false);
  const modificaManualeCaricata = useRef(false);
  const trascrizioneModificaInviata = useRef(false);
  const pagamentoImportato = useRef("");

  function snapshotBozzaManuale(override: Partial<NuovoManualeDraft> = {}): NuovoManualeDraft {
    return {
      voci,
      trasferte,
      mostraTrasferte,
      metodoPagamentoSelezionato,
      includiIva,
      noteExtra,
      mostraFiscale,
      nettoDesiderato,
      lordoCalcolato,
      storicoVoci,
      clienteSelezionatoId,
      preventivo,
      template,
      pdfUrl,
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
      ...override,
    };
  }

  function persistiBozzaManuale(override: Partial<NuovoManualeDraft> = {}) {
    salvaBozzaManuale(snapshotBozzaManuale(override));
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || "");
    });
    caricaClientiPerSelezione().then(setClienti);
    caricaServizi().then(setServizi);
    caricaProfiloFiscaleAttivo().then(setProfiloFiscale);
    if (mode === "manuale") {
      caricaMetodiPagamentoBuilder().then(({ metodiPagamento: metodi, predefinito }) => {
        setMetodiPagamento(metodi);
        if (predefinito && !caricaBozzaManuale()?.metodoPagamentoSelezionato) {
          setMetodoPagamentoSelezionato(predefinito);
        }
      });
    }
    if (mode === "chat" && inModifica) {
      caricaMetodiPagamentoBuilder().then(({ metodiPagamento: metodi }) => {
        setMetodiPagamento(metodi);
      });
    }
  }, [mode, inModifica]);

  useEffect(() => {
    if (bloccoSalvataggioBozzaRef.current || inModifica) return;
    const timeout = setTimeout(() => {
      if (mode === "chat") {
        salvaBozzaChat({
          messaggi,
          input,
          recap,
          preventivo,
          clienteSelezionatoId,
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
    template,
    pdfUrl,
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

  useEffect(() => {
    const clienteId = modifica?.clienteId || searchParams.get("cliente_id");
    const clienteNome = modifica?.clienteNome || searchParams.get("cliente_nome");
    if (clienteId) {
      setClienteSelezionatoId(clienteId);
      if (clienteNome) {
        setClienti((prev) => (prev.some((c) => c.id === clienteId) ? prev : [...prev, { id: clienteId, nome: clienteNome }]));
      }
    }
  }, [modifica?.clienteId, modifica?.clienteNome, searchParams]);

  useEffect(() => {
    const trascrizione = searchParams.get("trascrizione");
    if (trascrizione && !inModifica && messaggi.length === 0) {
      setInput(trascrizione);
    }
  }, [searchParams, inModifica, messaggi.length]);

  useEffect(() => {
    modificaInizializzata.current = false;
    modificaManualeCaricata.current = false;
    trascrizioneModificaInviata.current = false;
  }, [searchParams.get("modifica"), searchParams.get("trascrizione"), testoModifica]);

  useEffect(() => {
    if (mode !== "chat" || !testoModifica || modificaInizializzata.current) return;
    modificaInizializzata.current = true;
    cancellaBozzaChat();
    setMessaggi([
      {
        role: "assistant",
        content: `Ho caricato il tuo preventivo v${versionePrecedente}. Cosa vuoi modificare?\n\n${testoModifica}`,
      },
    ]);
  }, [mode, testoModifica, versionePrecedente]);

  useEffect(() => {
    if (!testoModifica || metodiPagamento.length === 0) return;
    const parsed = parsePreventivoTesto(testoModifica);
    const trovato = trovaMetodoPagamentoDaNome(metodiPagamento, parsed.pagamentoNome);
    if (trovato) setMetodoPagamentoSelezionato(trovato);
  }, [testoModifica, metodiPagamento]);

  useEffect(() => {
    const trascrizione = searchParams.get("trascrizione");
    if (!trascrizione || !inModifica || trascrizioneModificaInviata.current) return;
    if (!token || messaggi.length === 0) return;
    trascrizioneModificaInviata.current = true;
    void inviaTrascrizione(trascrizione);
  }, [searchParams, inModifica, token, messaggi.length]);

  useEffect(() => {
    if (mode !== "manuale" || !testoModifica) return;

    const parsed = parsePreventivoTesto(testoModifica);
    setVoci(vociParsedConId(collegaVociAlListino(parsed.voci, servizi)));
    setNoteExtra(parsed.noteExtra);
    setIncludiIva(parsed.includiIva);
    setTrasferte(parsed.trasferte);
    setMostraTrasferte(parsed.trasferte.length > 0);
    pagamentoImportato.current = parsed.pagamentoNome;

    if (modificaManualeCaricata.current) return;
    modificaManualeCaricata.current = true;
    cancellaBozzaManuale();

    const clienteId = modifica?.clienteId || searchParams.get("cliente_id");
    const clienteNome = modifica?.clienteNome || searchParams.get("cliente_nome");
    if (clienteId && clienteNome) {
      setClienteSelezionatoId(clienteId);
      setClienti((prev) => (prev.some((c) => c.id === clienteId) ? prev : [...prev, { id: clienteId, nome: clienteNome }]));
    }
  }, [mode, testoModifica, servizi, modifica?.clienteId, modifica?.clienteNome, searchParams]);

  useEffect(() => {
    if (!pagamentoImportato.current || metodiPagamento.length <= 1) return;
    const trovato = trovaMetodoPagamentoDaNome(metodiPagamento, pagamentoImportato.current);
    if (trovato) setMetodoPagamentoSelezionato(trovato);
  }, [metodiPagamento]);

  const risultatoFiscale = useMemo(
    () => calcolaFiscalePreventivo(profiloFiscale, mostraFiscale, voci, trasferte, includiIva),
    [profiloFiscale, mostraFiscale, voci, trasferte, includiIva],
  );

  const totaleBase = calcolaTotaleVoci(voci) + calcolaTotaleTrasferte(trasferte);
  const totaleConIva = includiIva ? totaleBase * 1.22 : totaleBase;
  const importoAnteprima = mode === "manuale" ? totaleConIva : (importoDaTesto(preventivo) || 0);

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
  ]);

  function clienteCollegato() {
    return !!clienteSelezionatoId;
  }

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
    if (!token) return testo;
    const importoRate = mode === "manuale"
      ? totaleConIva
      : (importoDaTesto(testo) || 0);
    return testoConPagamento({
      testo,
      abbonamentoAttivo,
      abVisibileNelPDF,
      abImporto,
      abGiorno,
      abMeseInizio: parseInt(abMeseInizio, 10) || 0,
      pagamentoRateAttivo,
      rateVisibileNelPDF,
      rateImportoTotale: importoRate,
      rateNumero: parseInt(rateNumero, 10) || 0,
      rateGiornoScadenza: parseInt(rateGiornoScadenza, 10) || 0,
      rateMeseInizio: parseInt(rateMeseInizio, 10) || 0,
      rateModalita,
      rateAccontoTipo,
      rateAccontoValore,
      accontoLinkPrecomputato,
      metodoPagamento: metodoPagamentoSelezionato,
      token,
    });
  }

  async function creaPianiDopoSalvataggio(preventivoId: string) {
    const cliente = clienti.find((c) => c.id === clienteSelezionatoId);
    if (!cliente) return;

    if (abbonamentoAttivo) {
      const r = await creaAbbonamentoDaPreventivo({
        cliente,
        preventivoId,
        importoRaw: abImporto,
        giornoRaw: abGiorno,
        meseInizioRaw: abMeseInizio,
        mensilitaRaw: abMensilita,
      });
      if (r.esistente) {
        window.alert("Questo preventivo ha già un piano collegato. Gestiscilo dalla cartella cliente.");
      }
    }

    if (pagamentoRateAttivo && rateModalita !== "acconto_saldo") {
      const importoRate = mode === "manuale"
        ? totaleConIva
        : (importoDaTesto(preventivo) || 0);
      const r = await creaPianoRateDaPreventivo({
        cliente,
        preventivoId,
        importoTotale: importoRate,
        numeroRateRaw: rateNumero,
        giornoScadenzaRaw: rateGiornoScadenza,
        meseInizioRaw: rateMeseInizio,
      });
      if (r.esistente) {
        window.alert("Questo preventivo ha già un piano a rate collegato. Gestiscilo dalla cartella cliente.");
      }
    }
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
      });
      if (data.html) setHtmlPreview(aggiornaLogoCacheInHtml(data.html));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore anteprima PDF.");
    } finally {
      setCaricandoPreview(false);
    }
  }

  async function gestisciClienteDaNome(nome: string) {
    try {
      const risultati = await cercaCliente(nome, token);
      if (risultati.length === 1) {
        setClienteSelezionatoId(risultati[0].id);
        setClienti((prev) => (prev.some((c) => c.id === risultati[0].id) ? prev : [...prev, risultati[0]]));
      } else if (risultati.length === 0) {
        setNomeClienteSuggerito(nome);
        setMostraModalCliente(true);
      }
    } catch {
      // ricerca cliente best-effort, non blocca la chat se fallisce
    }
  }

  async function inviaTrascrizione(testo: string) {
    if (!testo || loading) return;
    setErrore("");
    setLoading(true);

    const nuovi: Messaggio[] = [...messaggi, { role: "user", content: testo }];
    setMessaggi(nuovi);

    try {
      let reply = await inviaMessaggio(nuovi, token);

      if (reply.includes("CLIENTE:") && !clienteSelezionatoId) {
        const estratto = estraiNomeCliente(reply);
        reply = estratto.reply;
        if (estratto.nomeCliente) await gestisciClienteDaNome(estratto.nomeCliente);
      }

      const risultato = applicaRispostaChat(reply, nuovi);
      setMessaggi(risultato.messaggi);
      setRecap(risultato.recap);
      setPreventivo(risultato.preventivo);
      if (risultato.preventivo) vaiAllAnteprima();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante l'invio.");
    } finally {
      setLoading(false);
    }
  }

  async function invia(e: FormEvent) {
    e.preventDefault();
    const testo = input.trim();
    if (!testo || loading) return;
    setInput("");
    setErrore("");
    setLoading(true);

    const nuovi: Messaggio[] = [...messaggi, { role: "user", content: testo }];
    setMessaggi(nuovi);

    try {
      let reply = await inviaMessaggio(nuovi, token);

      if (reply.includes("CLIENTE:") && !clienteSelezionatoId) {
        const estratto = estraiNomeCliente(reply);
        reply = estratto.reply;
        if (estratto.nomeCliente) await gestisciClienteDaNome(estratto.nomeCliente);
      }

      const risultato = applicaRispostaChat(reply, nuovi);
      setMessaggi(risultato.messaggi);
      setRecap(risultato.recap);
      setPreventivo(risultato.preventivo);
      if (risultato.preventivo) vaiAllAnteprima();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante l'invio.");
    } finally {
      setLoading(false);
    }
  }

  async function generaDaRecap() {
    setLoading(true);
    setErrore("");
    try {
      const testoFinale = await convertiRecap(recap, token);
      setRecap("");
      setPreventivo(testoFinale);
      vaiAllAnteprima();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore nella generazione.");
    } finally {
      setLoading(false);
    }
  }

  function aggiornaVoce(id: string, campo: keyof VoceBuilder, valore: string) {
    setVoci((prev) => {
      const next = prev.map((v) => (v.id === id ? { ...v, [campo]: valore } : v));
      const voce = next.find((v) => v.id === id);
      if (
        voce &&
        isVoceCustom(voce) &&
        voce.salvaNelListino &&
        !voce.salvataNelListino &&
        voce.nome.trim() &&
        (campo === "nome" || campo === "costo" || campo === "unita" || campo === "descrizione")
      ) {
        void salvaVoceNelListino(voce);
      }
      return next;
    });
  }

  async function salvaVoceNelListino(voce: VoceBuilder) {
    if (!isVoceCustom(voce) || voce.salvataNelListino || !voce.nome.trim()) return;
    if (salvataggioListinoRef.current.has(voce.id)) return;

    salvataggioListinoRef.current.add(voce.id);
    const costoNormalizzato = voce.costo.trim().replace(",", ".");
    const { data, error } = await creaServizio({
      nome: voce.nome,
      descrizione: voce.descrizione,
      costo: costoNormalizzato,
      unita: voce.unita,
      ordine: servizi.length,
    });
    salvataggioListinoRef.current.delete(voce.id);

    if (error) {
      window.alert("Non è stato possibile salvare la voce nel listino.");
      setVoci((prev) =>
        prev.map((v) => (v.id === voce.id ? { ...v, salvaNelListino: false } : v)),
      );
      return;
    }

    if (data) {
      setServizi((prev) => [...prev, data as Servizio]);
      setVoci((prev) =>
        prev.map((v) =>
          v.id === voce.id ? { ...v, salvataNelListino: true, salvaNelListino: true } : v,
        ),
      );
    }
  }

  async function handleSalvaNelListinoChange(voceId: string, salva: boolean) {
    let voceAggiornata: VoceBuilder | undefined;
    setVoci((prev) =>
      prev.map((v) => {
        if (v.id !== voceId) return v;
        voceAggiornata = { ...v, salvaNelListino: salva };
        return voceAggiornata;
      }),
    );

    if (!salva || !voceAggiornata) return;

    if (!voceAggiornata.nome.trim()) {
      window.alert("Inserisci il nome del servizio prima di salvarlo nel listino.");
      setVoci((prev) =>
        prev.map((v) => (v.id === voceId ? { ...v, salvaNelListino: false } : v)),
      );
      return;
    }

    await salvaVoceNelListino(voceAggiornata);
  }

  function aggiungiVoceCustom() {
    setVoci((prev) => [
      ...prev,
      {
        id: `custom-${crypto.randomUUID()}`,
        nome: "",
        descrizione: "",
        costo: "",
        quantita: "1",
        unita: "cad",
        salvaNelListino: false,
      },
    ]);
  }

  function riordinaVoci(fromIndex: number, toIndex: number) {
    setVoci((prev) => {
      const next = [...prev];
      const [spostata] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, spostata);
      return next;
    });
  }

  function rimuoviVoce(id: string) {
    setVoci((prev) => prev.filter((v) => v.id !== id));
  }

  function aggiungiServizioListino(s: Servizio) {
    if (voci.find((v) => v.id === s.id)) return;
    setVoci((prev) => [
      ...prev,
      {
        id: s.id,
        nome: s.nome,
        descrizione: s.descrizione || "",
        costo: s.costo != null ? formatImportoVoce(s.costo) : "",
        quantita: "1",
        unita: s.unita,
      },
    ]);
  }

  function generaDaBuilder() {
    const vociValide = voci.filter((v) => v.nome.trim());
    if (vociValide.length === 0) {
      setErrore("Aggiungi almeno una voce con un nome.");
      return;
    }
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
      rateImportoTotale: totaleConIva,
    });
    if (errPiani) {
      setErrore(errPiani);
      return;
    }
    setErrore("");
    const nomeCliente = clienti.find((c) => c.id === clienteSelezionatoId)?.nome || "";
    const testo = generaTestoPreventivoBuilder({
      nomeCliente,
      voci: vociValide,
      trasferte,
      includiIva,
      noteExtra,
      metodoPagamentoSelezionato,
    });
    setPreventivo(testo);
    vaiAllAnteprima({ preventivo: testo });
  }

  async function salva() {
    setSalvataggioInCorso(true);
    setErrore("");
    setMessaggioSuccesso("");
    const clienteNome = clienti.find((c) => c.id === clienteSelezionatoId)?.nome || "";
    const titolo = clienteNome ? `Preventivo ${clienteNome}` : `Preventivo ${new Date().toLocaleDateString("it-IT")}`;
    const { error, id } = await salvaPreventivoGenerato({
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
    if (id) setPreventivoSalvatoId(id);
    setSalvato(true);
  }

  function titoloPreventivo() {
    const clienteNome = clienti.find((c) => c.id === clienteSelezionatoId)?.nome || "";
    return clienteNome ? `Preventivo ${clienteNome}` : `Preventivo ${new Date().toLocaleDateString("it-IT")}`;
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
        });
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
      const titolo = titoloPreventivo();
      const clienteIdSalvato = clienteSelezionatoId;
      let idPerPiani: string | null = null;

      const aggiornaEsistente =
        !inModifica &&
        !!preventivoSalvatoId &&
        salvato &&
        (await preventivoIdUtilizzabile(preventivoSalvatoId));

      if (aggiornaEsistente && preventivoSalvatoId) {
        const { error } = await aggiornaPreventivoDaBuilder(preventivoSalvatoId, {
          testo: testoFinale,
          clienteId: clienteSelezionatoId,
          clienteNome,
          titolo,
          template,
          versione: data.versione,
          pdfUrl: storagePathCaricato || urlCaricato || undefined,
        });
        if (error) throw new Error(error.message);
        idPerPiani = preventivoSalvatoId;
      } else {
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
        if (id) {
          idPerPiani = id;
          setPreventivoSalvatoId(id);
        }
        setSalvato(true);
      }

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
    setPreventivoSalvatoId(null);
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
      caricaMetodiPagamentoBuilder().then(({ metodiPagamento: metodi, predefinito }) => {
        setMetodiPagamento(metodi);
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
            <Link to="/nuovo" className="text-sm text-brand-navy/60 hover:text-brand-navy">
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
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          {messaggi.length === 0 && !inModifica && (
            <p className="text-brand-navy/60">Descrivi il lavoro da preventivare, l'assistente ti farà le domande necessarie.</p>
          )}

          <div className="space-y-3">
            {messaggi.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-brand-teal text-white" : "bg-brand-bg text-brand-navy"}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {recap && (
            <div className="mt-4 rounded-2xl border border-brand-teal/30 bg-brand-teal/5 p-4">
              <p className="text-sm font-medium text-brand-navy">Riepilogo pronto</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-brand-navy/70">{recap}</p>
              <button onClick={generaDaRecap} disabled={loading} className="mt-3 rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                {loading ? "Generazione..." : "Genera preventivo"}
              </button>
            </div>
          )}

          {errore && <p className="mt-4 text-sm text-red-600">{errore}</p>}
          <div ref={fineListaRef} />
        </div>
      )}

      {!isAnteprima && mode === "manuale" && (
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <BuilderClienteCard
            clienti={clienti}
            clienteSelezionatoId={clienteSelezionatoId}
            onSelect={setClienteSelezionatoId}
            onClear={() => setClienteSelezionatoId("")}
            onNuovoCliente={() => setMostraModalCliente(true)}
          />

          <ServiziListinoCard
            servizi={servizi}
            voci={voci}
            onAggiungiVoce={aggiungiServizioListino}
            onRimuoviVoce={rimuoviVoce}
          />

          <VociPreventivoSection
            voci={voci}
            onAggiornaVoce={aggiornaVoce}
            onRimuoviVoce={rimuoviVoce}
            onAggiungiVoceCustom={aggiungiVoceCustom}
            onSalvaNelListinoChange={handleSalvaNelListinoChange}
            onRiordinaVoci={riordinaVoci}
          />

          <PagamentoCard
            metodiPagamento={metodiPagamento}
            metodoPagamentoSelezionato={metodoPagamentoSelezionato}
            onOpen={() => setMostraModalPagamento(true)}
          />

          <IvaCard attivo={includiIva} onChange={setIncludiIva} />

          <TrasferteCard
            trasferte={trasferte}
            setTrasferte={setTrasferte}
            mostraTrasferte={mostraTrasferte}
            setMostraTrasferte={setMostraTrasferte}
          />

          <div className="mt-3 space-y-1">
            <label className="text-sm text-brand-navy/70">Note</label>
            <textarea
              value={noteExtra}
              onChange={(e) => setNoteExtra(e.target.value)}
              rows={2}
              placeholder={PLACEHOLDER.notePreventivo}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
            />
          </div>

          <AnalisiFiscaleCard
            profiloFiscale={profiloFiscale}
            mostraFiscale={mostraFiscale}
            setMostraFiscale={setMostraFiscale}
            fiscale={risultatoFiscale}
            voci={voci}
            setVoci={setVoci}
            storicoVoci={storicoVoci}
            setStoricoVoci={setStoricoVoci}
            nettoDesiderato={nettoDesiderato}
            setNettoDesiderato={setNettoDesiderato}
            lordoCalcolato={lordoCalcolato}
            setLordoCalcolato={setLordoCalcolato}
            calcolaLordoDaNetto={(netto) => calcolaLordoDaNetto(netto, profiloFiscale)}
          />

          {errore && <p className="mt-4 text-sm text-red-600">{errore}</p>}
        </div>
      )}

      {isAnteprima && preventivo && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:items-stretch">
          <div className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm lg:w-[400px]">
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <PreventivoPdfTemplatePicker embedded template={template} onSelectTemplate={setTemplate} />

              <div className="mt-5 border-t border-black/5 pt-5">
                <BuilderClienteCard
                  compact
                  clienti={clienti}
                  clienteSelezionatoId={clienteSelezionatoId}
                  onSelect={setClienteSelezionatoId}
                  onClear={() => setClienteSelezionatoId("")}
                  onNuovoCliente={() => setMostraModalCliente(true)}
                  disabled={salvato}
                />
              </div>

              <div className="mt-5 border-t border-black/5 pt-5">
                <BuilderPianoPagamentoCard
                  tipo={pianoPagamentoTipo}
                  onChangeTipo={onChangePianoPagamentoTipo}
                  importoTotale={importoAnteprima}
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
                />
              </div>
            </div>

            <div className="shrink-0 border-t border-black/5 p-5">
              <div className="flex flex-col gap-3">
                <button
                  onClick={generaPdf}
                  disabled={generandoPdf || !preventivo}
                  className="w-full rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {generandoPdf ? "Generazione PDF..." : "Genera PDF"}
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={salva}
                    disabled={salvataggioInCorso || salvato}
                    className="rounded-lg border border-brand-teal px-5 py-2.5 text-sm font-medium text-brand-teal disabled:opacity-60"
                  >
                    {salvato ? "Salvato" : salvataggioInCorso ? "Salvataggio..." : "Salva nello storico"}
                  </button>
                  {salvato && (
                    <Link to="/storico" className="text-sm text-brand-teal hover:underline">
                      Vai allo storico →
                    </Link>
                  )}
                  {pdfUrl && (
                    <button
                      type="button"
                      onClick={apriPdf}
                      className="text-sm text-brand-teal hover:underline"
                    >
                      Apri PDF
                    </button>
                  )}
                </div>

                {messaggioSuccesso && <p className="text-sm text-brand-teal">{messaggioSuccesso}</p>}
                {errore && <p className="text-sm text-red-600">{errore}</p>}
              </div>
            </div>
          </div>

          <PreventivoPdfPreview
            html={htmlPreview}
            loading={caricandoPreview}
            className="min-h-0 flex-1"
          />
        </div>
      )}

      {!isAnteprima && mode === "chat" && (
        <form onSubmit={invia} className="sticky bottom-0 mt-4 flex gap-2 bg-brand-bg pb-2 pt-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={PLACEHOLDER.chatPreventivo} disabled={loading} className="flex-1 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-brand-teal" />
          <button type="submit" disabled={loading || !input.trim()} className="rounded-lg bg-brand-teal px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
            {loading ? "..." : "Invia"}
          </button>
        </form>
      )}

      {mostraModalPagamento && (
        <MetodoPagamentoModal
          open={mostraModalPagamento}
          metodiPagamento={metodiPagamento}
          metodoPagamentoSelezionato={metodoPagamentoSelezionato}
          onClose={() => setMostraModalPagamento(false)}
          onSelect={setMetodoPagamentoSelezionato}
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
