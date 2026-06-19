import { Link } from "react-router";
import type { Servizio } from "../lib/types";
import type { VoceBuilder } from "../lib/builder";
import { formatImporto } from "../lib/format";

interface Props {
  servizi: Servizio[];
  voci: VoceBuilder[];
  onAggiungiVoce: (servizio: Servizio) => void;
  onRimuoviVoce: (servizioId: string) => void;
}

export default function ServiziListinoCard({ servizi, voci, onAggiungiVoce, onRimuoviVoce }: Props) {
  return (
    <div className="mt-5 rounded-2xl border border-black/10 bg-brand-bg/40 p-4">
      <p className="text-sm font-medium text-brand-navy">I tuoi servizi</p>
      <p className="text-xs text-brand-navy/50">Clicca + per aggiungere, ✓ per rimuovere</p>

      {servizi.length === 0 ? (
        <Link
          to="/impostazioni/servizi"
          className="mt-3 block rounded-lg border border-dashed border-brand-teal/40 bg-brand-teal/5 p-4 text-center text-sm text-brand-teal hover:bg-brand-teal/10"
        >
          Nessun servizio configurato — clicca qui per aggiungerli
        </Link>
      ) : (
        <div className="mt-3 divide-y divide-black/5">
          {servizi.map((s) => {
            const aggiunto = voci.some((v) => v.id === s.id);
            return (
              <div key={s.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-brand-navy">{s.nome}</p>
                  {s.costo != null && (
                    <p className="text-xs text-brand-navy/50">
                      {formatImporto(s.costo)}/{s.unita}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => (aggiunto ? onRimuoviVoce(s.id) : onAggiungiVoce(s))}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
                    aggiunto ? "bg-brand-teal/15 text-brand-teal" : "bg-brand-teal text-white"
                  }`}
                  aria-label={aggiunto ? "Rimuovi dal preventivo" : "Aggiungi al preventivo"}
                >
                  {aggiunto ? "✓" : "+"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
