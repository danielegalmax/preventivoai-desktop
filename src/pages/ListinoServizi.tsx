import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { caricaServizi, eliminaServizi, eliminaServizio, inserisciServizi } from "../lib/listino";
import type { ServizioDraft } from "../lib/listinoSmart";
import ListinoSmartPanel from "../components/ListinoSmartPanel";
import type { Servizio } from "../lib/types";
import { formatImporto } from "../lib/format";
import { useSelezione } from "../lib/hooks/useSelezione";
import { useAnnullaSelezioneOnEscape } from "../lib/hooks/useAnnullaSelezioneOnEscape";
import ServizioModal from "../components/ServizioModal";
import PageContainer from "../components/PageContainer";
import CheckboxSelezione from "../components/CheckboxSelezione";
import BarraSelezione from "../components/BarraSelezione";

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path strokeLinecap="round" d="m14 7 3 3" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M10 11v6M14 11v6M9 7l1-2h4l1 2M7 7l1 13h8l1-13" />
    </svg>
  );
}

export default function ListinoServizi() {
  const [servizi, setServizi] = useState<Servizio[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAperto, setModalAperto] = useState(false);
  const [servizioInEdit, setServizioInEdit] = useState<Servizio | null>(null);
  const [importando, setImportando] = useState(false);
  const [msgImport, setMsgImport] = useState("");
  const [ricerca, setRicerca] = useState("");

  const ids = servizi.map((s) => s.id);
  const serviziFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return servizi;
    return servizi.filter((s) =>
      s.nome.toLowerCase().includes(q) || (s.descrizione || "").toLowerCase().includes(q),
    );
  }, [ricerca, servizi]);

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

  function carica() {
    caricaServizi().then(({ data, error }) => {
      setServizi(data);
      if (error) {
        window.alert("Impossibile caricare i servizi, riprova.");
      }
      setLoading(false);
    });
  }

  useEffect(() => {
    carica();
  }, []);

  function apriNuovo() {
    setServizioInEdit(null);
    setModalAperto(true);
  }

  function apriModifica(s: Servizio) {
    setServizioInEdit(s);
    setModalAperto(true);
  }

  async function eliminaSingolo(id: string) {
    if (!window.confirm("Eliminare questo servizio?")) return;
    const { error } = await eliminaServizio(id);
    if (error) {
      window.alert(error.message);
      return;
    }
    setServizi((lista) => lista.filter((s) => s.id !== id));
  }

  async function eliminaSelezionati() {
    if (selezionati.length === 0) return;
    const msg =
      selezionati.length === 1
        ? "Eliminare questo servizio?"
        : `Eliminare ${selezionati.length} servizi?`;
    if (!window.confirm(msg)) return;

    const { error } = await eliminaServizi(selezionati);
    if (error) {
      window.alert(error.message);
      return;
    }
    setServizi((lista) => lista.filter((s) => !selezionati.includes(s.id)));
    annulla();
  }

  async function importaServiziSmart(nuovi: ServizioDraft[]) {
    if (nuovi.length === 0) return;
    setImportando(true);
    setMsgImport("");
    const { error } = await inserisciServizi(nuovi, servizi.length);
    setImportando(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    setMsgImport(`${nuovi.length} servizi aggiunti al listino.`);
    carica();
    window.setTimeout(() => setMsgImport(""), 2500);
  }

  return (
    <PageContainer>
      <Link to="/impostazioni" className="text-sm text-brand-navy/60 hover:text-brand-navy">
        ← Torna alle impostazioni
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">I miei servizi</h1>
          <p className="mt-1 text-brand-navy/60">Il tuo listino prezzi, da riusare velocemente nei preventivi.</p>
        </div>
        <button onClick={apriNuovo} className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white">
          + Nuovo servizio
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-navy">Importa servizi</h2>
        <p className="mt-1 text-sm text-brand-navy/60">
          Incolla testo, carica una foto del listino o registra un vocale. L&apos;AI estrae i servizi automaticamente.
        </p>
        <div className={`mt-4 ${importando ? "pointer-events-none opacity-60" : ""}`}>
          <ListinoSmartPanel
            servizi={[]}
            onServiziChange={() => {}}
            onImportServizi={importaServiziSmart}
          />
        </div>
        {msgImport && <p className="mt-3 text-sm text-brand-teal">{msgImport}</p>}
      </div>

      {loading && <p className="mt-4 text-brand-navy/60">Caricamento...</p>}
      {!loading && servizi.length === 0 && <p className="mt-4 text-brand-navy/60">Nessun servizio ancora.</p>}

      {!loading && servizi.length > 0 && (
        <div className="mt-6 pb-20">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-brand-teal">Servizi salvati</h2>
                <p className="mt-0.5 text-sm text-brand-navy/55">
                  {servizi.length} {servizi.length === 1 ? "voce nel listino" : "voci nel listino"}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm text-brand-navy/60">
                  <CheckboxSelezione
                    checked={tuttiSelezionati}
                    indeterminate={parziale}
                    onChange={toggleTutti}
                    ariaLabel="Seleziona tutti i servizi"
                  />
                  Seleziona tutti
                </label>
                <input
                  type="search"
                  value={ricerca}
                  onChange={(e) => setRicerca(e.target.value)}
                  placeholder="Cerca per nome o descrizione"
                  className="w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2 text-sm outline-none focus:border-brand-teal sm:w-72"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {serviziFiltrati.map((s) => {
                const selezionato = selezionati.includes(s.id);
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                      selezionato
                        ? "border-brand-teal bg-brand-teal/5"
                        : "border-black/10 bg-white hover:border-brand-teal/30"
                    }`}
                  >
                    <CheckboxSelezione
                      checked={selezionato}
                      onChange={() => toggle(s.id)}
                      ariaLabel={`Seleziona ${s.nome}`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-brand-navy">{s.nome}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-brand-navy/60">
                        {s.descrizione || "Nessuna descrizione"}
                      </p>
                    </div>

                    <span className="hidden shrink-0 rounded-full border border-black/10 bg-brand-bg px-2.5 py-1 text-xs font-semibold text-brand-navy/65 sm:inline-flex">
                      {s.unita}
                    </span>

                    <div className="w-28 shrink-0 text-right text-sm font-bold text-brand-navy">
                      {formatImporto(s.costo)}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => apriModifica(s)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-brand-navy/45 hover:bg-brand-teal/10 hover:text-brand-teal"
                        aria-label={`Modifica ${s.nome}`}
                        title="Modifica"
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminaSingolo(s.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-brand-navy/35 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Elimina ${s.nome}`}
                        title="Elimina"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                );
              })}

              {serviziFiltrati.length === 0 && (
                <p className="rounded-2xl border border-dashed border-black/10 bg-brand-bg p-6 text-center text-sm text-brand-navy/55">
                  Nessun servizio trovato.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <BarraSelezione
        count={selezionati.length}
        onCancel={annulla}
        onDelete={eliminaSelezionati}
        etichetta="servizi selezionati"
      />

      {modalAperto && (
        <ServizioModal
          servizio={servizioInEdit}
          ordineSuccessivo={servizi.length}
          onClose={() => setModalAperto(false)}
          onSaved={carica}
        />
      )}
    </PageContainer>
  );
}
