import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MouseEvent, SetStateAction } from "react";
import { Link } from "react-router";
import type { Preventivo } from "../lib/types";
import { formatImporto, formatData } from "../lib/format";
import {
  caricaClientiPerSposta,
  caricaCronologiaPreventivo,
  eliminaPreventivi,
  ripristinaVersionePreventivo,
  spostaPreventivi,
} from "../lib/storico";
import {
  messaggioEliminaPreventivoSingolo,
  messaggioEliminaPreventiviMultipli,
} from "../lib/confermeElimina";
import { useConfirmDialog } from "../lib/hooks/useConfirmDialog";
import { caricaClientiDisponibili } from "../lib/clienteDettaglio";
import {
  aggiornaTitoloPreventivo,
  apriPdfPreventivo,
  cambiaStatoPreventivo,
  caricaDettaglioPreventivo,
  segnaPreventivoPagato,
} from "../lib/preventivo";
import { useSelezione } from "../lib/hooks/useSelezione";
import { useAnnullaSelezioneOnEscape } from "../lib/hooks/useAnnullaSelezioneOnEscape";
import { etichettaPianoCollegato, normalizzaTipoPiano, type CollegamentiPianoMap } from "../lib/collegamentiPiano";
import DataTable from "./DataTable";
import PreventivoStatoModal from "./PreventivoStatoModal";
import PreventivoTitoloModal from "./PreventivoTitoloModal";
import SpostaClienteModal from "./SpostaClienteModal";
import CheckboxSelezione from "./CheckboxSelezione";
import BarraSelezione from "./BarraSelezione";
import PreventivoColonnaRiepilogo from "./PreventivoColonnaRiepilogo";
import ModificaPreventivoModal from "./ModificaPreventivoModal";
import { MODIFICA_VERSIONE_ALTERNATIVA_LABEL } from "../lib/modificaPreventivo/constants";
import { useModificaPreventivoScelta } from "../lib/modificaPreventivo/useModificaPreventivoScelta";
import InviaFirmaModal from "./firma/InviaFirmaModal";
import FirmaDettaglioModal from "./firma/FirmaDettaglioModal";
import FirmaStatoBadge from "./firma/FirmaStatoBadge";
import {
  caricaContattiCliente,
  statoFirmaInvio,
} from "../lib/firma";
import { useInviiFirma } from "../lib/hooks/useInviiFirma";
import { caricaHeaderProfilo } from "../lib/greeting";

type Props = {
  preventivi: Preventivo[];
  setPreventivi: Dispatch<SetStateAction<Preventivo[]>>;
  variant: "storico" | "cliente";
  clienteCorrenteId?: string;
  collegamentiPiano?: CollegamentiPianoMap;
  focusPreventivoId?: string | null;
  onFocusConsumato?: () => void;
  onSelezioneChange?: (count: number) => void;
};

export default function PreventiviLista({
  preventivi,
  setPreventivi,
  variant,
  clienteCorrenteId,
  collegamentiPiano = {},
  focusPreventivoId = null,
  onFocusConsumato,
  onSelezioneChange,
}: Props) {
  const [modalStatoId, setModalStatoId] = useState<string | null>(null);
  const [modalSposta, setModalSposta] = useState(false);
  const [spostaPreventivoId, setSpostaPreventivoId] = useState<string | null>(null);
  const [modalRinominaId, setModalRinominaId] = useState<string | null>(null);
  const [apertoId, setApertoId] = useState<string | null>(null);
  const [cronologiaApertaId, setCronologiaApertaId] = useState<string | null>(null);
  const [cronologiaVersioneApertaId, setCronologiaVersioneApertaId] = useState<string | null>(null);
  const [cronologia, setCronologia] = useState<Record<string, Preventivo[]>>({});
  const [caricandoDettaglioId, setCaricandoDettaglioId] = useState<string | null>(null);
  const [evidenziatoId, setEvidenziatoId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const ultimoFocusRef = useRef<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const { modificaInput, apriDaPreventivo, chiudiSceltaModifica } = useModificaPreventivoScelta();
  const ids = preventivi.map((p) => p.id);
  const { inviiFirma, ricaricaInviiFirma } = useInviiFirma(ids, {
    onPreventivoChange: (row) => {
      setPreventivi((prev) =>
        prev.map((p) =>
          p.id === row.id
            ? { ...p, stato: row.stato, pdf_url: row.pdf_url ?? p.pdf_url }
            : p,
        ),
      );
    },
  });
  const [firmaModalPreventivo, setFirmaModalPreventivo] = useState<Preventivo | null>(null);
  const [firmaDettaglioPreventivo, setFirmaDettaglioPreventivo] = useState<Preventivo | null>(null);
  const [firmaContatti, setFirmaContatti] = useState<{ email?: string | null; telefono?: string | null }>({});
  const [nomeAzienda, setNomeAzienda] = useState("");
  const colCount = variant === "storico" ? 5 : 4;
  const preventivoModale = preventivi.find((p) => p.id === modalStatoId) ?? null;
  const preventivoRinomina = preventivi.find((p) => p.id === modalRinominaId) ?? null;
  const {
    selezionati,
    selezioneAttiva,
    tuttiSelezionati,
    parziale,
    toggle,
    annulla,
    toggleTutti,
  } = useSelezione(ids);

  useAnnullaSelezioneOnEscape(selezioneAttiva, annulla);

  useEffect(() => {
    onSelezioneChange?.(selezionati.length);
  }, [selezionati.length, onSelezioneChange]);

  useEffect(() => {
    void caricaHeaderProfilo().then((p) => setNomeAzienda(p?.nomeBreve || ""));
  }, []);

  async function apriFirmaModal(p: Preventivo) {
    setFirmaModalPreventivo(p);
    if (p.cliente_id) {
      const c = await caricaContattiCliente(p.cliente_id);
      setFirmaContatti({ email: c?.email, telefono: c?.telefono });
    } else {
      setFirmaContatti({});
    }
  }

  const caricaClientiSposta = useCallback(async () => {
    if (clienteCorrenteId) {
      return caricaClientiDisponibili(clienteCorrenteId);
    }
    const list = await caricaClientiPerSposta();
    return list.map((c) => ({ id: c.id, nome: c.nome }));
  }, [clienteCorrenteId]);

  useEffect(() => {
    if (!focusPreventivoId) {
      ultimoFocusRef.current = null;
      return;
    }
    if (ultimoFocusRef.current === focusPreventivoId) return;

    const preventivo = preventivi.find((p) => p.id === focusPreventivoId);
    if (!preventivo) return;

    ultimoFocusRef.current = focusPreventivoId;
    let cancelled = false;

    async function focalizza() {
      setApertoId(focusPreventivoId);
      setCronologiaApertaId(null);
      setCronologiaVersioneApertaId(null);
      setEvidenziatoId(focusPreventivoId);

      if (!preventivo!.testo_preventivo) {
        setCaricandoDettaglioId(focusPreventivoId);
        const dettaglio = await caricaDettaglioPreventivo(focusPreventivoId!);
        if (!cancelled && dettaglio) {
          setPreventivi((lista) =>
            lista.map((p) => (p.id === focusPreventivoId ? { ...p, ...dettaglio } : p)),
          );
        }
        if (!cancelled) setCaricandoDettaglioId(null);
      }

      window.setTimeout(() => {
        rowRefs.current[focusPreventivoId!]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);

      window.setTimeout(() => {
        if (!cancelled) {
          setEvidenziatoId(null);
          onFocusConsumato?.();
        }
      }, 1000);
    }

    void focalizza();
    return () => {
      cancelled = true;
    };
  }, [focusPreventivoId, preventivi, onFocusConsumato, setPreventivi]);

  async function handleCambiaStato(stato: string) {
    if (!preventivoModale) return;
    const { error } = await cambiaStatoPreventivo(
      preventivoModale.id,
      stato,
      preventivoModale.stato,
    );
    if (error) {
      window.alert(error);
      return;
    }
    const resetPagato = preventivoModale.stato === "accettato" && stato !== "accettato";
    setPreventivi((lista) =>
      lista.map((p) =>
        p.id === preventivoModale.id
          ? {
              ...p,
              stato,
              ...(resetPagato ? { pagato: false, data_pagamento: null } : {}),
            }
          : p,
      ),
    );
  }

  async function handleTogglePagato(pagato: boolean) {
    if (!preventivoModale) return;
    const { error } = await segnaPreventivoPagato(preventivoModale.id, pagato);
    if (error) {
      window.alert(error);
      return;
    }
    setPreventivi((lista) =>
      lista.map((p) =>
        p.id === preventivoModale.id
          ? { ...p, pagato, data_pagamento: pagato ? new Date().toISOString() : null }
          : p,
      ),
    );
  }

  async function eliminaSingolo(id: string) {
    const haPiano = !!collegamentiPiano[id];
    const ok = await confirm({
      title: "Elimina preventivo",
      message: messaggioEliminaPreventivoSingolo(haPiano),
    });
    if (!ok) return;
    const { error } = await eliminaPreventivi([id]);
    if (error) {
      window.alert(error.message);
      return;
    }
    setPreventivi((lista) => lista.filter((p) => p.id !== id));
  }

  async function eliminaSelezionati() {
    if (selezionati.length === 0) return;
    const ok = await confirm({
      title: "Elimina preventivi",
      message: messaggioEliminaPreventiviMultipli(selezionati.length, selezionati, collegamentiPiano),
    });
    if (!ok) return;

    const { error } = await eliminaPreventivi(selezionati);
    if (error) {
      window.alert(error.message);
      return;
    }
    setPreventivi((lista) => lista.filter((p) => !selezionati.includes(p.id)));
    annulla();
  }

  async function handleSposta(cliente: { id: string; nome: string }) {
    const idsDaSpostare = [...selezionati];
    const { error } = await spostaPreventivi(idsDaSpostare, cliente);
    if (error) {
      window.alert(error.message);
      return;
    }
    if (variant === "cliente") {
      setPreventivi((lista) => lista.filter((p) => !idsDaSpostare.includes(p.id)));
    } else {
      setPreventivi((lista) =>
        lista.map((p) =>
          idsDaSpostare.includes(p.id)
            ? { ...p, cliente_id: cliente.id, nome_cliente: cliente.nome }
            : p,
        ),
      );
    }
    annulla();
    chiudiModalSposta();
  }

  async function handleSpostaSingolo(cliente: { id: string; nome: string }) {
    if (!spostaPreventivoId) return;
    const id = spostaPreventivoId;
    const { error } = await spostaPreventivi([id], cliente);
    if (error) {
      window.alert(error.message);
      return;
    }
    if (variant === "cliente") {
      setPreventivi((lista) => lista.filter((p) => p.id !== id));
    } else {
      setPreventivi((lista) =>
        lista.map((p) =>
          p.id === id ? { ...p, cliente_id: cliente.id, nome_cliente: cliente.nome } : p,
        ),
      );
    }
    chiudiModalSposta();
  }

  function chiudiModalSposta() {
    setModalSposta(false);
    setSpostaPreventivoId(null);
  }

  function apriSpostaSingolo(preventivoId: string) {
    setSpostaPreventivoId(preventivoId);
    setModalSposta(true);
  }

  async function handleRinomina(titolo: string) {
    if (!modalRinominaId) return;
    const { error } = await aggiornaTitoloPreventivo(modalRinominaId, titolo);
    if (error) {
      window.alert(error);
      return;
    }
    const nuovoTitolo = titolo.trim() || null;
    setPreventivi((lista) =>
      lista.map((p) => (p.id === modalRinominaId ? { ...p, titolo: nuovoTitolo } : p)),
    );
  }

  function ignoraEspansione(e: MouseEvent) {
    const target = e.target as HTMLElement;
    return !!target.closest("button, a, input, label, [data-no-expand]");
  }

  async function toggleAperto(preventivo: Preventivo) {
    if (apertoId === preventivo.id) {
      setApertoId(null);
      setCronologiaApertaId(null);
      setCronologiaVersioneApertaId(null);
      return;
    }

    setApertoId(preventivo.id);
    setCronologiaApertaId(null);
    setCronologiaVersioneApertaId(null);

    if (!preventivo.testo_preventivo) {
      setCaricandoDettaglioId(preventivo.id);
      const dettaglio = await caricaDettaglioPreventivo(preventivo.id);
      setCaricandoDettaglioId(null);
      if (dettaglio) {
        setPreventivi((lista) =>
          lista.map((p) => (p.id === preventivo.id ? { ...p, ...dettaglio } : p)),
        );
      }
    }
  }

  function handleRowClick(e: MouseEvent, preventivo: Preventivo) {
    if (ignoraEspansione(e)) return;
    if (selezioneAttiva) {
      toggle(preventivo.id);
      return;
    }
    void toggleAperto(preventivo);
  }

  async function toggleCronologia(preventivo: Preventivo) {
    if (cronologiaApertaId === preventivo.id) {
      setCronologiaApertaId(null);
      setCronologiaVersioneApertaId(null);
      return;
    }
    if (!preventivo.preventivo_padre_id) return;

    const versioni = await caricaCronologiaPreventivo(preventivo.preventivo_padre_id);
    if (versioni.length === 0) return;

    setCronologia((prev) => ({ ...prev, [preventivo.id]: versioni }));
    setCronologiaApertaId(preventivo.id);
    setCronologiaVersioneApertaId(null);
  }

  async function handleRipristinaVersione(preventivoCorrenteId: string, versione: Preventivo) {
    if (!window.confirm(`Ripristinare la versione v${versione.versione || 1}?`)) return;
    const { error } = await ripristinaVersionePreventivo(preventivoCorrenteId, versione.id);
    if (error) {
      window.alert(error.message);
      return;
    }
    setApertoId(null);
    setCronologiaApertaId(null);
    setCronologiaVersioneApertaId(null);
    setPreventivi((lista) =>
      lista.map((item) => (item.id === preventivoCorrenteId ? { ...versione } : item)),
    );
  }

  return (
    <>
      <div className="pb-20">
        <DataTable className={variant === "cliente" ? "mt-3" : undefined}>
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-brand-bg text-brand-navy/60">
              <tr>
                <th className="w-10 px-3 py-3">
                  <CheckboxSelezione
                    checked={tuttiSelezionati}
                    indeterminate={parziale}
                    onChange={toggleTutti}
                    ariaLabel="Seleziona tutti"
                  />
                </th>
                {variant === "storico" && <th className="px-5 py-3 font-medium">Data</th>}
                {variant === "storico" && <th className="px-5 py-3 font-medium">Cliente</th>}
                <th className="px-5 py-3 font-medium">Titolo</th>
                {variant === "cliente" && <th className="px-5 py-3 font-medium">Data</th>}
                <th className="min-w-[9.5rem] px-5 py-3 text-right font-medium">Importo</th>
              </tr>
            </thead>
            <tbody>
              {preventivi.map((p) => {
                const selezionato = selezionati.includes(p.id);
                const collegamento = collegamentiPiano[p.id];
                const espanso = apertoId === p.id;
                const evidenziato = evidenziatoId === p.id;
                const versioniPrecedenti = (p.versione || 1) - 1;
                const invioFirma = inviiFirma[p.id];
                const sfFirma = statoFirmaInvio(invioFirma);
                const mostraInviaFirma = !!p.pdf_url && (sfFirma === "nessuno" || sfFirma === "scaduto" || sfFirma === "revocato");
                return (
                  <Fragment key={p.id}>
                  <tr
                    ref={(el) => { rowRefs.current[p.id] = el; }}
                    onClick={(e) => handleRowClick(e, p)}
                    className={`border-t border-black/5 cursor-pointer transition-colors ${
                      evidenziato
                        ? "preventivo-row-focus"
                        : espanso
                          ? "bg-brand-bg/70"
                          : selezionato
                            ? "bg-brand-teal/5"
                            : "hover:bg-brand-bg/40"
                    }`}
                  >
                    <td className="px-3 py-3" data-no-expand>
                      <CheckboxSelezione
                        checked={selezionato}
                        onChange={() => toggle(p.id)}
                        ariaLabel={`Seleziona ${p.titolo || "preventivo"}`}
                      />
                    </td>
                    {variant === "storico" && (
                      <td className="px-5 py-3 text-brand-navy/70">{formatData(p.created_at)}</td>
                    )}
                    {variant === "storico" && (
                      <td className="px-5 py-3">
                        {p.cliente_id ? (
                          <Link to={`/clienti/${p.cliente_id}`} className="text-brand-navy hover:text-brand-teal">
                            {p.nome_cliente}
                          </Link>
                        ) : (
                          <span className="text-brand-navy/70">{p.nome_cliente || "Senza cliente"}</span>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-3 text-brand-navy">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className="mt-0.5 shrink-0 text-xs text-brand-navy/40" aria-hidden>
                          {espanso ? "▲" : "▼"}
                        </span>
                        <div className="min-w-0">
                          <p>{p.titolo || "Senza titolo"}</p>
                          {collegamento ? (
                            <p className="mt-1 text-xs font-semibold text-brand-teal">
                              {normalizzaTipoPiano(collegamento.tipo, collegamento.nomePiano) === "rate" ? "📅 " : "💰 "}
                              {etichettaPianoCollegato(collegamento)}
                            </p>
                          ) : null}
                          <FirmaStatoBadge
                            invio={invioFirma}
                            onClick={selezioneAttiva ? undefined : () => setFirmaDettaglioPreventivo(p)}
                          />
                        </div>
                      </div>
                    </td>
                    {variant === "cliente" && (
                      <td className="px-5 py-3 text-brand-navy/70">{formatData(p.created_at)}</td>
                    )}
                    <td className="px-5 py-3 align-top" data-no-expand>
                      <PreventivoColonnaRiepilogo
                        preventivo={p}
                        collegamentoPiano={!!collegamento}
                        mostraInviaFirma={mostraInviaFirma}
                        selezioneAttiva={selezioneAttiva}
                        onStatoPress={() => setModalStatoId(p.id)}
                        onPdf={() => apriPdfPreventivo(p)}
                        onFirma={() => void apriFirmaModal(p)}
                        menuAriaLabel={`Altre azioni per ${p.titolo || "preventivo"}`}
                        menuVoci={[
                          { label: "Rinomina", onClick: () => setModalRinominaId(p.id) },
                          { label: "Sposta", onClick: () => apriSpostaSingolo(p.id) },
                          { label: "Elimina", onClick: () => eliminaSingolo(p.id), danger: true },
                        ]}
                      />
                    </td>
                  </tr>
                  {espanso ? (
                    <tr className="border-t border-black/5 bg-brand-bg/50">
                      <td colSpan={colCount} className="px-5 py-4">
                        <div className="space-y-4">
                          {caricandoDettaglioId === p.id ? (
                            <p className="text-sm text-brand-navy/50">Caricamento testo...</p>
                          ) : p.testo_preventivo ? (
                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-black/5 bg-white p-4 font-mono text-xs leading-relaxed text-brand-navy/70">
                              {p.testo_preventivo}
                            </pre>
                          ) : (
                            <p className="text-sm text-brand-navy/50">Nessun testo disponibile per questo preventivo.</p>
                          )}

                          {versioniPrecedenti > 0 && p.preventivo_padre_id ? (
                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() => void toggleCronologia(p)}
                                className="text-sm font-medium text-brand-teal hover:underline"
                              >
                                {cronologiaApertaId === p.id
                                  ? "▲ Nascondi cronologia"
                                  : `▼ Mostra cronologia (${versioniPrecedenti} vers. precedenti)`}
                              </button>

                              {cronologiaApertaId === p.id && cronologia[p.id]?.map((v) => (
                                <div key={v.id} className="space-y-2">
                                  <button
                                    type="button"
                                    onClick={() => setCronologiaVersioneApertaId(
                                      cronologiaVersioneApertaId === v.id ? null : v.id,
                                    )}
                                    className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-sm hover:bg-brand-bg"
                                  >
                                    <span className="font-semibold text-brand-navy/50">v{v.versione || 1}</span>
                                    <span className="text-brand-navy/50">{formatData(v.created_at)}</span>
                                    <span className="text-brand-navy/70">{formatImporto(v.importo_totale)}</span>
                                  </button>
                                  {cronologiaVersioneApertaId === v.id ? (
                                    <div className="space-y-3 rounded-lg bg-white p-3">
                                      {v.testo_preventivo ? (
                                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-brand-navy/70">
                                          {v.testo_preventivo}
                                        </pre>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() => void handleRipristinaVersione(p.id, v)}
                                        className="text-sm font-medium text-brand-teal hover:underline"
                                      >
                                        Ripristina questa versione
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => apriDaPreventivo(p)}
                            className="rounded-xl border border-brand-teal/30 bg-brand-teal/5 px-4 py-2.5 text-sm font-medium text-brand-teal hover:bg-brand-teal/10"
                          >
                            ✏️ {MODIFICA_VERSIONE_ALTERNATIVA_LABEL}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </DataTable>
      </div>

      <BarraSelezione
        count={selezionati.length}
        onCancel={annulla}
        onDelete={eliminaSelezionati}
        onMove={() => setModalSposta(true)}
        etichetta="preventivi selezionati"
      />

      {modalStatoId && (
        <PreventivoStatoModal
          preventivo={preventivoModale}
          onClose={() => setModalStatoId(null)}
          onChangeStato={handleCambiaStato}
          onTogglePagato={handleTogglePagato}
          mostraTogglePagato={!modalStatoId || !collegamentiPiano[modalStatoId]}
        />
      )}

      {modalSposta && (
        <SpostaClienteModal
          onClose={chiudiModalSposta}
          onSeleziona={spostaPreventivoId ? handleSpostaSingolo : handleSposta}
          caricaClienti={caricaClientiSposta}
        />
      )}

      {modalRinominaId && preventivoRinomina && (
        <PreventivoTitoloModal
          titoloIniziale={preventivoRinomina.titolo || ""}
          onClose={() => setModalRinominaId(null)}
          onSalva={handleRinomina}
        />
      )}

      {confirmDialog}

      <ModificaPreventivoModal
        open={!!modificaInput}
        input={modificaInput}
        onClose={chiudiSceltaModifica}
      />

      {firmaDettaglioPreventivo ? (
        <FirmaDettaglioModal
          open
          preventivo={firmaDettaglioPreventivo}
          invio={inviiFirma[firmaDettaglioPreventivo.id]}
          nomeAzienda={nomeAzienda}
          onClose={() => setFirmaDettaglioPreventivo(null)}
          onInviaNuovo={() => void apriFirmaModal(firmaDettaglioPreventivo)}
          onAggiornato={() => {
            ricaricaInviiFirma();
            setPreventivi((prev) =>
              prev.map((x) =>
                x.id === firmaDettaglioPreventivo.id ? { ...x, stato: "accettato" } : x,
              ),
            );
          }}
          onFirmaAnnullata={() => {
            ricaricaInviiFirma();
            setPreventivi((prev) =>
              prev.map((x) =>
                x.id === firmaDettaglioPreventivo.id ? { ...x, stato: "inviato" } : x,
              ),
            );
          }}
        />
      ) : null}

      {firmaModalPreventivo ? (
        <InviaFirmaModal
          open
          preventivoId={firmaModalPreventivo.id}
          nomeCliente={firmaModalPreventivo.nome_cliente || "Cliente"}
          emailCliente={firmaContatti.email}
          telefonoCliente={firmaContatti.telefono}
          nomeAzienda={nomeAzienda}
          onClose={() => setFirmaModalPreventivo(null)}
          onInviato={() => {
            ricaricaInviiFirma();
            setPreventivi((prev) =>
              prev.map((x) =>
                x.id === firmaModalPreventivo.id ? { ...x, stato: "inviato" } : x,
              ),
            );
          }}
          onFirmaManuale={() => setFirmaDettaglioPreventivo(firmaModalPreventivo)}
        />
      ) : null}
    </>
  );
}
