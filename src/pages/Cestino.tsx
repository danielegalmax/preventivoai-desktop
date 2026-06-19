import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  CESTINO_GIORNI,
  caricaCestinoAbbonamenti,
  caricaCestinoPreventivi,
  eliminaDefinitivamenteAbbonamenti,
  eliminaDefinitivamentePreventivi,
  giorniRimastiCestino,
  purgeCestinoScaduto,
  ripristinaAbbonamenti,
  ripristinaPreventivi,
  type VoceCestinoAbbonamento,
  type VoceCestinoPreventivo,
} from "../lib/cestino";
import {
  messaggioEliminaDefinitiva,
  messaggioRipristina,
} from "../lib/confermeElimina";
import { useConfirmDialog } from "../lib/hooks/useConfirmDialog";
import { useSelezione } from "../lib/hooks/useSelezione";
import { useAnnullaSelezioneOnEscape } from "../lib/hooks/useAnnullaSelezioneOnEscape";
import { formatImporto } from "../lib/format";
import { normalizzaTipoPiano } from "../lib/collegamentiPiano";
import PageContainer from "../components/PageContainer";
import DataTable from "../components/DataTable";
import CheckboxSelezione from "../components/CheckboxSelezione";

type TabCestino = "preventivi" | "piani";

export default function Cestino() {
  const [tab, setTab] = useState<TabCestino>("preventivi");
  const [preventivi, setPreventivi] = useState<VoceCestinoPreventivo[]>([]);
  const [abbonamenti, setAbbonamenti] = useState<VoceCestinoAbbonamento[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const idsPreventivi = preventivi.map((p) => p.id);
  const idsAbbonamenti = abbonamenti.map((a) => a.id);
  const selPrev = useSelezione(idsPreventivi);
  const selAb = useSelezione(idsAbbonamenti);
  const selezione = tab === "preventivi" ? selPrev : selAb;

  useAnnullaSelezioneOnEscape(selezione.selezioneAttiva, selezione.annulla);

  const ricarica = useCallback(async () => {
    setLoading(true);
    await purgeCestinoScaduto();
    const [prev, ab] = await Promise.all([caricaCestinoPreventivi(), caricaCestinoAbbonamenti()]);
    setPreventivi(prev);
    setAbbonamenti(ab);
    setLoading(false);
  }, []);

  useEffect(() => {
    void ricarica();
  }, [ricarica]);

  async function handleRipristina() {
    const count = selezione.selezionati.length;
    if (count === 0) return;
    const tipo = tab === "preventivi" ? "preventivo" as const : "piano" as const;
    const ok = await confirm({
      title: "Ripristina",
      message: messaggioRipristina(count, tipo),
      confirmLabel: "Ripristina",
      destructive: false,
    });
    if (!ok) return;

    if (tab === "preventivi") {
      const { error } = await ripristinaPreventivi(selezione.selezionati);
      if (error) { window.alert(error.message); return; }
    } else {
      const { error } = await ripristinaAbbonamenti(selezione.selezionati);
      if (error) { window.alert(error.message); return; }
    }
    selezione.annulla();
    await ricarica();
  }

  async function handleEliminaDefinitiva() {
    const count = selezione.selezionati.length;
    if (count === 0) return;
    const tipo = tab === "preventivi" ? "preventivo" as const : "piano" as const;
    const ok = await confirm({
      title: "Elimina definitivamente",
      message: messaggioEliminaDefinitiva(count, tipo),
      confirmLabel: "Elimina definitivamente",
    });
    if (!ok) return;

    if (tab === "preventivi") {
      const { error } = await eliminaDefinitivamentePreventivi(selezione.selezionati);
      if (error) { window.alert(error.message); return; }
    } else {
      const { error } = await eliminaDefinitivamenteAbbonamenti(selezione.selezionati);
      if (error) { window.alert(error.message); return; }
    }
    selezione.annulla();
    await ricarica();
  }

  const listaVuota = tab === "preventivi" ? preventivi.length === 0 : abbonamenti.length === 0;

  return (
    <PageContainer className={selezione.selezionati.length > 0 ? "pb-24" : ""}>
      <Link to="/storico" className="text-sm font-medium text-brand-teal hover:underline">
        ← Storico preventivi
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-brand-navy">Elementi eliminati</h1>
      <p className="mt-2 text-sm text-brand-navy/60">
        Gli elementi eliminati restano qui per {CESTINO_GIORNI} giorni, poi vengono cancellati definitivamente dal database.
      </p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => { setTab("preventivi"); selezione.annulla(); selAb.annulla(); }}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            tab === "preventivi" ? "bg-brand-teal text-white" : "bg-white text-brand-navy/70 shadow-sm"
          }`}
        >
          Preventivi ({preventivi.length})
        </button>
        <button
          type="button"
          onClick={() => { setTab("piani"); selezione.annulla(); selPrev.annulla(); }}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            tab === "piani" ? "bg-brand-teal text-white" : "bg-white text-brand-navy/70 shadow-sm"
          }`}
        >
          Piani e abbonamenti ({abbonamenti.length})
        </button>
      </div>

      {loading && <p className="mt-6 text-brand-navy/60">Caricamento...</p>}

      {!loading && listaVuota && (
        <p className="mt-6 text-brand-navy/60">Il cestino è vuoto.</p>
      )}

      {!loading && !listaVuota && tab === "preventivi" && (
        <div className="mt-4 pb-20">
          <DataTable>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-brand-bg text-brand-navy/60">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <CheckboxSelezione
                      checked={selPrev.tuttiSelezionati}
                      indeterminate={selPrev.parziale}
                      onChange={selPrev.toggleTutti}
                      ariaLabel="Seleziona tutti"
                    />
                  </th>
                  <th className="px-5 py-3 font-medium">Titolo</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium text-right">Importo</th>
                  <th className="px-5 py-3 font-medium text-center">Scade tra</th>
                </tr>
              </thead>
              <tbody>
                {preventivi.map((p) => (
                  <tr key={p.id} className="border-t border-black/5 hover:bg-brand-bg/40">
                    <td className="px-3 py-3">
                      <CheckboxSelezione
                        checked={selPrev.selezionati.includes(p.id)}
                        onChange={() => selPrev.toggle(p.id)}
                        ariaLabel={`Seleziona ${p.titolo || "preventivo"}`}
                      />
                    </td>
                    <td className="px-5 py-3 text-brand-navy">{p.titolo || "Senza titolo"}</td>
                    <td className="px-5 py-3">
                      {p.cliente_id ? (
                        <Link to={`/clienti/${p.cliente_id}`} className="text-brand-navy hover:text-brand-teal">
                          {p.nome_cliente}
                        </Link>
                      ) : (
                        <span className="text-brand-navy/70">{p.nome_cliente || "Senza cliente"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-brand-navy/70">{formatImporto(p.importo_totale)}</td>
                    <td className="px-5 py-3 text-center text-brand-navy/60">
                      {giorniRimastiCestino(p.deleted_at)} {giorniRimastiCestino(p.deleted_at) === 1 ? "giorno" : "giorni"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </div>
      )}

      {!loading && !listaVuota && tab === "piani" && (
        <div className="mt-4 pb-20">
          <DataTable>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-brand-bg text-brand-navy/60">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <CheckboxSelezione
                      checked={selAb.tuttiSelezionati}
                      indeterminate={selAb.parziale}
                      onChange={selAb.toggleTutti}
                      ariaLabel="Seleziona tutti"
                    />
                  </th>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium text-center">Scade tra</th>
                </tr>
              </thead>
              <tbody>
                {abbonamenti.map((a) => {
                  const tipo = normalizzaTipoPiano(a.tipo, a.nome);
                  return (
                    <tr key={a.id} className="border-t border-black/5 hover:bg-brand-bg/40">
                      <td className="px-3 py-3">
                        <CheckboxSelezione
                          checked={selAb.selezionati.includes(a.id)}
                          onChange={() => selAb.toggle(a.id)}
                          ariaLabel={`Seleziona ${a.nome || "piano"}`}
                        />
                      </td>
                      <td className="px-5 py-3 text-brand-navy">{a.nome || "Senza nome"}</td>
                      <td className="px-5 py-3 text-brand-navy/70">
                        {tipo === "rate" ? "Piano a rate" : "Abbonamento"}
                      </td>
                      <td className="px-5 py-3">
                        <Link to={`/clienti/${a.cliente_id}`} className="text-brand-navy hover:text-brand-teal">
                          {a.clienti?.nome || "Cliente"}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-center text-brand-navy/60">
                        {giorniRimastiCestino(a.deleted_at!)} {giorniRimastiCestino(a.deleted_at!) === 1 ? "giorno" : "giorni"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
        </div>
      )}

      {selezione.selezionati.length > 0 && (
        <div className="fixed bottom-0 left-56 right-0 z-30 border-t border-black/10 bg-white px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={selezione.annulla}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-navy/60 hover:bg-brand-bg"
                aria-label="Annulla selezione"
              >
                ✕
              </button>
              <span className="text-sm font-medium text-brand-navy">
                {selezione.selezionati.length} selezionati
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleRipristina()}
                className="rounded-xl border border-brand-teal px-5 py-2.5 text-sm font-semibold text-brand-teal hover:bg-brand-teal/5"
              >
                Ripristina
              </button>
              <button
                type="button"
                onClick={() => void handleEliminaDefinitiva()}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Elimina definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </PageContainer>
  );
}
