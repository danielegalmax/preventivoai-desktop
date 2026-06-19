import { useEffect, useState } from "react";
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
import DataTable from "../components/DataTable";
import CheckboxSelezione from "../components/CheckboxSelezione";
import BarraSelezione from "../components/BarraSelezione";

export default function ListinoServizi() {
  const [servizi, setServizi] = useState<Servizio[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAperto, setModalAperto] = useState(false);
  const [servizioInEdit, setServizioInEdit] = useState<Servizio | null>(null);
  const [importando, setImportando] = useState(false);
  const [msgImport, setMsgImport] = useState("");

  const ids = servizi.map((s) => s.id);
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
    caricaServizi().then((data) => {
      setServizi(data);
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
        <div className="mt-4 pb-20">
          <DataTable>
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-brand-bg text-brand-navy/60">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <CheckboxSelezione
                      checked={tuttiSelezionati}
                      indeterminate={parziale}
                      onChange={toggleTutti}
                      ariaLabel="Seleziona tutti i servizi"
                    />
                  </th>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Descrizione</th>
                  <th className="px-5 py-3 font-medium">Unità</th>
                  <th className="px-5 py-3 font-medium text-right">Costo</th>
                  <th className="px-5 py-3 font-medium text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {servizi.map((s) => {
                  const selezionato = selezionati.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`border-t border-black/5 ${selezionato ? "bg-brand-teal/5" : "hover:bg-brand-bg/40"}`}
                    >
                      <td className="px-3 py-3">
                        <CheckboxSelezione
                          checked={selezionato}
                          onChange={() => toggle(s.id)}
                          ariaLabel={`Seleziona ${s.nome}`}
                        />
                      </td>
                      <td className="px-5 py-3 text-brand-navy">{s.nome}</td>
                      <td className="px-5 py-3 text-brand-navy/70">{s.descrizione || "-"}</td>
                      <td className="px-5 py-3 text-brand-navy/70">{s.unita}</td>
                      <td className="px-5 py-3 text-right text-brand-navy/70">{formatImporto(s.costo)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => apriModifica(s)}
                          className="mr-3 text-brand-teal hover:underline"
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminaSingolo(s.id)}
                          className="text-red-600 hover:underline"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
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
