import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { caricaClienti, eliminaClienti } from "../lib/clienti";
import type { Cliente } from "../lib/types";
import { useSelezione } from "../lib/hooks/useSelezione";
import { useAnnullaSelezioneOnEscape } from "../lib/hooks/useAnnullaSelezioneOnEscape";
import ClienteModificaModal from "../components/ClienteModificaModal";
import ClienteNuovoModal from "../components/ClienteNuovoModal";
import MenuTrePuntini from "../components/MenuTrePuntini";
import PageContainer from "../components/PageContainer";
import CheckboxSelezione from "../components/CheckboxSelezione";
import BarraSelezione from "../components/BarraSelezione";

function inizialiCliente(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || "?").slice(0, 2).toUpperCase();
}

function contattoPrincipale(cliente: Cliente) {
  return cliente.telefono || cliente.email || "Nessun contatto";
}

function labelPreventivi(count: number) {
  return `${count} ${count === 1 ? "preventivo" : "preventivi"}`;
}

export default function Clienti() {
  const navigate = useNavigate();
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAperto, setModalAperto] = useState(false);
  const [clienteModifica, setClienteModifica] = useState<Cliente | null>(null);
  const [ricerca, setRicerca] = useState("");

  const ids = clienti.map((c) => c.id);
  const clientiFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return clienti;
    return clienti.filter((c) =>
      c.nome.toLowerCase().includes(q)
      || (c.telefono || "").toLowerCase().includes(q)
      || (c.email || "").toLowerCase().includes(q),
    );
  }, [ricerca, clienti]);

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
    if (
      !window.confirm(
        "Eliminare questo cliente in modo permanente e immediato?\n\nI preventivi, i piani e le rate collegati verranno eliminati subito (non passano dal cestino).",
      )
    ) {
      return;
    }
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
        ? "Eliminare questo cliente in modo permanente e immediato?\n\nI preventivi, i piani e le rate collegati verranno eliminati subito (non passano dal cestino)."
        : `Eliminare ${selezionati.length} clienti in modo permanente e immediato?\n\nPreventivi, piani e rate collegati verranno eliminati subito (non passano dal cestino).`;
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
        <div className="mt-6 pb-20">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-brand-teal">Rubrica clienti</h2>
                <p className="mt-0.5 text-sm text-brand-navy/55">
                  {clienti.length} {clienti.length === 1 ? "cliente salvato" : "clienti salvati"}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm text-brand-navy/60">
                  <CheckboxSelezione
                    checked={tuttiSelezionati}
                    indeterminate={parziale}
                    onChange={toggleTutti}
                    ariaLabel="Seleziona tutti i clienti"
                  />
                  Seleziona tutti
                </label>
                <input
                  type="search"
                  value={ricerca}
                  onChange={(e) => setRicerca(e.target.value)}
                  placeholder="Cerca per nome, telefono o email"
                  className="w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2 text-sm outline-none focus:border-brand-teal sm:w-80"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {clientiFiltrati.map((c) => {
                const selezionato = selezionati.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (selezioneAttiva) toggle(c.id);
                      else navigate(`/clienti/${c.id}`);
                    }}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                      selezionato
                        ? "border-brand-teal bg-brand-teal/5"
                        : "border-black/10 bg-white hover:border-brand-teal/30"
                    }`}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <CheckboxSelezione
                        checked={selezionato}
                        onChange={() => toggle(c.id)}
                        ariaLabel={`Seleziona ${c.nome}`}
                      />
                    </div>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-sm font-bold text-brand-teal">
                      {inizialiCliente(c.nome)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-brand-navy">{c.nome}</p>
                      <p className="mt-1 truncate text-sm text-brand-navy/60">{contattoPrincipale(c)}</p>
                    </div>

                    <span className="hidden shrink-0 rounded-full border border-black/10 bg-brand-bg px-3 py-1 text-xs font-semibold text-brand-navy/65 sm:inline-flex">
                      {labelPreventivi(c.num_preventivi ?? 0)}
                    </span>

                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {!selezioneAttiva ? (
                        <MenuTrePuntini
                          ariaLabel={`Azioni per ${c.nome}`}
                          voci={[
                            { label: "Modifica", onClick: () => setClienteModifica(c) },
                            { label: "Elimina", onClick: () => eliminaSingolo(c.id), danger: true },
                          ]}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {clientiFiltrati.length === 0 && (
                <p className="rounded-2xl border border-dashed border-black/10 bg-brand-bg p-6 text-center text-sm text-brand-navy/55">
                  Nessun cliente trovato.
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
