import { useMemo, useState } from "react";
import { Link } from "react-router";
import { formatImportoEuroVisuale } from "preventivoai-shared";
import type { Servizio } from "../lib/types";
import type { VoceBuilder } from "../lib/builder";

interface Props {
  servizi: Servizio[];
  voci: VoceBuilder[];
  erroreCaricamento?: string | null;
  onAggiungiVoce: (servizio: Servizio) => void;
  onRimuoviVoce: (servizioId: string) => void;
}

export default function ServiziListinoCard({ servizi, voci, erroreCaricamento, onAggiungiVoce, onRimuoviVoce }: Props) {
  const [ricerca, setRicerca] = useState("");
  const serviziFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return servizi;
    return servizi.filter((s) => s.nome.toLowerCase().includes(q));
  }, [ricerca, servizi]);

  return (
    <div className="mt-8 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div>
        <p className="text-base font-bold text-brand-teal">I tuoi servizi</p>
        <p className="text-xs text-brand-navy/50">Cerca nel listino e aggiungi le voci al preventivo</p>
      </div>

      {erroreCaricamento ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          Impossibile caricare i servizi, riprova.
        </p>
      ) : servizi.length === 0 ? (
        <Link
          to="/impostazioni/servizi"
          className="mt-3 block rounded-xl border border-dashed border-brand-teal/40 bg-brand-teal/5 p-4 text-center text-sm text-brand-teal hover:bg-brand-teal/10"
        >
          Nessun servizio configurato - clicca qui per aggiungerli
        </Link>
      ) : (
        <>
          <input
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca servizio"
            className="mt-3 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2 text-sm outline-none focus:border-brand-teal"
          />

          <div className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {serviziFiltrati.map((s) => {
              const aggiunto = voci.some((v) => v.id === s.id);
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-black/10 bg-brand-bg/40 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-navy">{s.nome}</p>
                    {s.costo != null && (
                      <p className="mt-0.5 text-xs text-brand-navy/50">
                        {formatImportoEuroVisuale(s.costo)} EUR / {s.unita}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => (aggiunto ? onRimuoviVoce(s.id) : onAggiungiVoce(s))}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
                      aggiunto ? "bg-brand-teal text-white" : "border border-brand-teal/30 bg-white text-brand-teal"
                    }`}
                    aria-label={aggiunto ? "Rimuovi dal preventivo" : "Aggiungi al preventivo"}
                  >
                    {aggiunto ? "✓" : "+"}
                  </button>
                </div>
              );
            })}

            {serviziFiltrati.length === 0 && (
              <p className="rounded-xl border border-dashed border-black/10 bg-brand-bg p-4 text-center text-sm text-brand-navy/50">
                Nessun servizio trovato
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
