import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { caricaClienti, eliminaClienti } from "../lib/clienti";
import type { Cliente } from "../lib/types";
import { useSelezione } from "../lib/hooks/useSelezione";
import { useAnnullaSelezioneOnEscape } from "../lib/hooks/useAnnullaSelezioneOnEscape";
import ClienteModificaModal from "../components/ClienteModificaModal";
import ClienteNuovoModal from "../components/ClienteNuovoModal";
import MenuTrePuntini from "../components/MenuTrePuntini";
import PageContainer from "../components/PageContainer";
import DataTable from "../components/DataTable";
import CheckboxSelezione from "../components/CheckboxSelezione";
import BarraSelezione from "../components/BarraSelezione";

export default function Clienti() {
  const navigate = useNavigate();
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAperto, setModalAperto] = useState(false);
  const [clienteModifica, setClienteModifica] = useState<Cliente | null>(null);

  const ids = clienti.map((c) => c.id);
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
    caricaClienti().then((data) => {
      setClienti(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    carica();
  }, []);

  async function eliminaSingolo(id: string) {
    if (!window.confirm("Eliminare questo cliente? Verranno eliminati anche preventivi e dati collegati.")) return;
    const { error } = await eliminaClienti([id]);
    if (error) {
      window.alert(error.message);
      return;
    }
    setClienti((lista) => lista.filter((c) => c.id !== id));
  }

  async function eliminaSelezionati() {
    if (selezionati.length === 0) return;
    const msg =
      selezionati.length === 1
        ? "Eliminare questo cliente? Verranno eliminati anche preventivi e dati collegati."
        : `Eliminare ${selezionati.length} clienti? Verranno eliminati anche preventivi, abbonamenti e rate collegati.`;
    if (!window.confirm(msg)) return;

    const { error } = await eliminaClienti(selezionati);
    if (error) {
      window.alert(error.message);
      return;
    }
    setClienti((lista) => lista.filter((c) => !selezionati.includes(c.id)));
    annulla();
  }

  return (
    <PageContainer>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-brand-navy">Clienti</h1>
        <button onClick={() => setModalAperto(true)} className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white">
          + Nuovo cliente
        </button>
      </div>

      {loading && <p className="mt-4 text-brand-navy/60">Caricamento...</p>}
      {!loading && clienti.length === 0 && <p className="mt-4 text-brand-navy/60">Nessun cliente ancora.</p>}

      {!loading && clienti.length > 0 && (
        <div className="mt-4 pb-20">
          <DataTable>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-brand-bg text-brand-navy/60">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <CheckboxSelezione
                      checked={tuttiSelezionati}
                      indeterminate={parziale}
                      onChange={toggleTutti}
                      ariaLabel="Seleziona tutti i clienti"
                    />
                  </th>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Telefono</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium text-right">Preventivi</th>
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {clienti.map((c) => {
                  const selezionato = selezionati.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => {
                        if (selezioneAttiva) toggle(c.id);
                        else navigate(`/clienti/${c.id}`);
                      }}
                      className={`cursor-pointer border-t border-black/5 ${
                        selezionato ? "bg-brand-teal/5" : "hover:bg-brand-bg/60"
                      }`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <CheckboxSelezione
                          checked={selezionato}
                          onChange={() => toggle(c.id)}
                          ariaLabel={`Seleziona ${c.nome}`}
                        />
                      </td>
                      <td className="px-5 py-3 text-brand-navy">{c.nome}</td>
                      <td className="px-5 py-3 text-brand-navy/70">{c.telefono || "-"}</td>
                      <td className="px-5 py-3 text-brand-navy/70">{c.email || "-"}</td>
                      <td className="px-5 py-3 text-right text-brand-navy/70">{c.num_preventivi}</td>
                      <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {!selezioneAttiva ? (
                          <MenuTrePuntini
                            ariaLabel={`Azioni per ${c.nome}`}
                            voci={[
                              { label: "Modifica", onClick: () => setClienteModifica(c) },
                              { label: "Elimina", onClick: () => eliminaSingolo(c.id), danger: true },
                            ]}
                          />
                        ) : null}
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
        etichetta="clienti selezionati"
      />

      {modalAperto && <ClienteNuovoModal onClose={() => setModalAperto(false)} onCreated={carica} />}

      {clienteModifica ? (
        <ClienteModificaModal
          cliente={clienteModifica}
          onClose={() => setClienteModifica(null)}
          onSaved={(aggiornato) => {
            setClienti((lista) => lista.map((x) => (x.id === aggiornato.id ? { ...x, ...aggiornato } : x)));
          }}
        />
      ) : null}
    </PageContainer>
  );
}
