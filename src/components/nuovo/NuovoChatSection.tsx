import type { RefObject } from "react";
import type { Messaggio } from "../../lib/types";

type Props = {
  messaggi: Messaggio[];
  recap: string;
  errore: string;
  loading: boolean;
  inModifica: boolean;
  fineListaRef: RefObject<HTMLDivElement | null>;
  onGeneraDaRecap: () => void;
};

export default function NuovoChatSection({
  messaggi,
  recap,
  errore,
  loading,
  inModifica,
  fineListaRef,
  onGeneraDaRecap,
}: Props) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
      {messaggi.length === 0 && !inModifica && (
        <p className="text-brand-navy/60">
          Descrivi il lavoro da preventivare, l&apos;assistente ti farà le domande necessarie.
        </p>
      )}

      <div className="space-y-3">
        {messaggi.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-brand-teal text-white" : "bg-brand-bg text-brand-navy"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {recap && (
        <div className="mt-4 rounded-2xl border border-brand-teal/30 bg-brand-teal/5 p-4">
          <p className="text-sm font-medium text-brand-navy">Riepilogo pronto</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-brand-navy/70">{recap}</p>
          <button
            type="button"
            onClick={onGeneraDaRecap}
            disabled={loading}
            className="mt-3 rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Generazione..." : "Genera preventivo"}
          </button>
        </div>
      )}

      {errore && <p className="mt-4 text-sm text-red-600">{errore}</p>}
      <div ref={fineListaRef} />
    </div>
  );
}
