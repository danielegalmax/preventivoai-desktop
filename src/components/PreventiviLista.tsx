import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MouseEvent, SetStateAction } from "react";
import type { Preventivo } from "../lib/types";
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
  cambiaStatoPreventivo,
  caricaDettaglioPreventivo,
  segnaPreventivoPagato,
} from "../lib/preventivo";
import { useSelezione } from "../lib/hooks/useSelezione";
import { useAnnullaSelezioneOnEscape } from "../lib/hooks/useAnnullaSelezioneOnEscape";
import { type CollegamentiPianoMap } from "../lib/collegamentiPiano";
import PreventivoListaRiga from "./preventiviLista/PreventivoListaRiga";
import DataTable from "./DataTable";
import PreventivoStatoModal from "./PreventivoStatoModal";
import PreventivoTitoloModal from "./PreventivoTitoloModal";
import SpostaClienteModal from "./SpostaClienteModal";
import CheckboxSelezione from "./CheckboxSelezione";
import BarraSelezione from "./BarraSelezione";
import ModificaPreventivoModal from "./ModificaPreventivoModal";
import { useModificaPreventivoScelta } from "../lib/modificaPreventivo/useModificaPreventivoScelta";
import InviaFirmaModal from "./firma/InviaFirmaModal";
import FirmaDettaglioModal from "./firma/FirmaDettaglioModal";
import { eventBus } from "../lib/eventBus";
import {
  caricaContattiCliente,
  registraFirmaManuale,
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
  onPreventiviEliminati?: () => void | Promise<void>;
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
  onPreventiviEliminati,
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

  async function handleTogglePagato(pagato: boolean, dataPagamento?: string) {
    if (!preventivoModale) return;
    const { error } = await segnaPreventivoPagato(preventivoModale.id, pagato, dataPagamento);
    if (error) {
      window.alert(error);
      return;
    }
    setPreventivi((lista) =>
      lista.map((p) =>
        p.id === preventivoModale.id
          ? { ...p, pagato, data_pagamento: pagato ? (dataPagamento ?? null) : null }
          : p,
      ),
    );
    eventBus.emit("aggiorna-home");
  }

  async function segnaFirmatoSuCarta(p: Preventivo) {
    const ok = await confirm({
      title: "Firma su carta",
      message:
        "Segnare questo preventivo come firmato su carta? Non verrà inviato alcun link online.",
      confirmLabel: "Segna firmato",
      destructive: false,
    });
    if (!ok) return;

    try {
      await registraFirmaManuale(p.id);
      ricaricaInviiFirma();
      setPreventivi((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, stato: "accettato" } : x)),
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Operazione non riuscita.");
    }
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
    if (onPreventiviEliminati) {
      await onPreventiviEliminati();
    } else {
      setPreventivi((lista) => lista.filter((p) => p.id !== id));
    }
    eventBus.emit("aggiorna-home");
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
    if (onPreventiviEliminati) {
      await onPreventiviEliminati();
    } else {
      setPreventivi((lista) => lista.filter((p) => !selezionati.includes(p.id)));
    }
    annulla();
    eventBus.emit("aggiorna-home");
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
                {variant === "storico" && <th className="px-5 py-3 text-center font-medium">Data e ora</th>}
                {variant === "storico" && <th className="px-5 py-3 font-medium">Cliente</th>}
                <th className="px-5 py-3 font-medium">Titolo</th>
                {variant === "cliente" && <th className="px-5 py-3 text-center font-medium">Data e ora</th>}
                <th className="min-w-[9.5rem] px-5 py-3 text-right font-medium">Importo</th>
              </tr>
            </thead>
            <tbody>
              {preventivi.map((p) => (
                <PreventivoListaRiga
                  key={p.id}
                  preventivo={p}
                  variant={variant}
                  colCount={colCount}
                  collegamentiPiano={collegamentiPiano}
                  selezionato={selezionati.includes(p.id)}
                  espanso={apertoId === p.id}
                  evidenziato={evidenziatoId === p.id}
                  selezioneAttiva={selezioneAttiva}
                  invioFirma={inviiFirma[p.id]}
                  setRowRef={(el) => { rowRefs.current[p.id] = el; }}
                  cronologiaApertaId={cronologiaApertaId}
                  cronologiaVersioneApertaId={cronologiaVersioneApertaId}
                  cronologia={cronologia}
                  caricandoDettaglioId={caricandoDettaglioId}
                  onToggleSelezione={() => toggle(p.id)}
                  onRowClick={handleRowClick}
                  onStatoPress={() => setModalStatoId(p.id)}
                  onFirma={() => void apriFirmaModal(p)}
                  onFirmaDettaglio={() => setFirmaDettaglioPreventivo(p)}
                  onRinomina={() => setModalRinominaId(p.id)}
                  onModifica={() => apriDaPreventivo(p)}
                  onSposta={() => apriSpostaSingolo(p.id)}
                  onSegnaFirmatoSuCarta={() => void segnaFirmatoSuCarta(p)}
                  onElimina={() => eliminaSingolo(p.id)}
                  onToggleCronologia={() => void toggleCronologia(p)}
                  onToggleCronologiaVersione={(versioneId) =>
                    setCronologiaVersioneApertaId(
                      cronologiaVersioneApertaId === versioneId ? null : versioneId,
                    )
                  }
                  onRipristinaVersione={(versione) => void handleRipristinaVersione(p.id, versione)}
                />
              ))}
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
          onFirmaSuCarta={() => {
            ricaricaInviiFirma();
            setPreventivi((prev) =>
              prev.map((x) =>
                x.id === firmaModalPreventivo.id ? { ...x, stato: "accettato" } : x,
              ),
            );
          }}
        />
      ) : null}
    </>
  );
}
