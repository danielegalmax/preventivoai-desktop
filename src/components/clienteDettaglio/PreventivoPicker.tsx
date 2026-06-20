import type { Preventivo } from "../../lib/types";
import { formatImportoEuro } from "preventivoai-shared";

type Props = {
  preventivi: Preventivo[];
  selezionatoId: string | null;
  onSelect: (id: string | null) => void;
};

export default function PreventivoPicker({ preventivi, selezionatoId, onSelect }: Props) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold tracking-wide text-brand-navy/50">PREVENTIVO COLLEGATO (opzionale)</p>
      <div className="overflow-hidden rounded-xl border border-black/10 bg-brand-bg">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`block w-full border-b border-black/5 px-3 py-2.5 text-left text-sm ${
            selezionatoId === null ? "bg-emerald-50 font-semibold text-brand-teal" : "text-brand-navy/70"
          }`}
        >
          Nessun preventivo
        </button>
        {preventivi.map((p) => {
          const titolo = p.titolo?.trim() || "Preventivo senza titolo";
          const importo = p.importo_totale != null ? `€${formatImportoEuro(p.importo_totale, 2)}` : "";
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`block w-full border-b border-black/5 px-3 py-2.5 text-left last:border-b-0 ${
                selezionatoId === p.id ? "bg-emerald-50" : ""
              }`}
            >
              <span className={`block truncate text-sm ${selezionatoId === p.id ? "font-semibold text-brand-teal" : "font-medium text-brand-navy/80"}`}>
                {titolo}
              </span>
              {importo ? <span className="mt-0.5 block text-xs text-brand-navy/40">{importo}</span> : null}
            </button>
          );
        })}
        {preventivi.length === 0 ? (
          <p className="px-3 py-3 text-center text-xs text-brand-navy/40">Nessun preventivo disponibile per questo cliente</p>
        ) : null}
      </div>
    </div>
  );
}
