import { useEffect } from "react";
import type { RefObject } from "react";
import type { Messaggio } from "../../lib/types";

const SUGGERIMENTI = [
  "Preventivo ristrutturazione bagno",
  "Preventivo impianto elettrico",
  "Preventivo giardinaggio",
] as const;

type Props = {
  messaggi: Messaggio[];
  recap: string;
  errore: string;
  loading: boolean;
  inModifica: boolean;
  fineListaRef: RefObject<HTMLDivElement | null>;
  onGeneraDaRecap: () => void;
  onSuggestionClick: (testo: string) => void;
};

function AvatarAi() {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-teal text-xs font-bold text-white"
      aria-hidden
    >
      AI
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start justify-start gap-3">
      <AvatarAi />
      <div className="flex items-center gap-1 rounded-2xl border border-black/8 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-[#1e2d3d]">
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-brand-navy/40 dark:bg-white/40"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-brand-navy/40 dark:bg-white/40"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-brand-navy/40 dark:bg-white/40"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

export default function NuovoChatSection({
  messaggi,
  recap,
  errore,
  loading,
  inModifica,
  fineListaRef,
  onGeneraDaRecap,
  onSuggestionClick,
}: Props) {
  const ultimoMessaggioUtente =
    messaggi.length > 0 && messaggi[messaggi.length - 1].role === "user";
  const mostraTyping = loading && ultimoMessaggioUtente;

  useEffect(() => {
    if (errore) console.error("[chat]", errore);
  }, [errore]);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .chat-msg-fade-in {
          animation: fadeInUp 200ms ease-out;
        }
      `}</style>

      {messaggi.length === 0 && !inModifica && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <span className="text-5xl" role="img" aria-label="Chat">
            💬
          </span>
          <h2 className="mt-4 text-lg font-semibold text-brand-navy dark:text-white">
            Come posso aiutarti?
          </h2>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGGERIMENTI.map((testo) => (
              <button
                key={testo}
                type="button"
                onClick={() => onSuggestionClick(testo)}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-brand-navy shadow-sm transition-colors hover:border-brand-teal/40 hover:bg-brand-teal/5 dark:border-white/10 dark:bg-[#1e2d3d] dark:text-white dark:hover:border-brand-teal/50"
              >
                {testo}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {messaggi.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="chat-msg-fade-in flex justify-end">
              <div className="max-w-[70%] rounded-2xl bg-[#0E9F8E] px-4 py-3 text-sm whitespace-pre-wrap text-white shadow-sm">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="chat-msg-fade-in flex items-start justify-start gap-3">
              <AvatarAi />
              <div className="max-w-[70%] rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm whitespace-pre-wrap text-brand-navy shadow-sm dark:border-white/10 dark:bg-[#1e2d3d] dark:text-white">
                {m.content}
              </div>
            </div>
          ),
        )}

        {mostraTyping && <TypingIndicator />}
      </div>

      {recap && (
        <div className="mt-4 rounded-2xl border border-brand-teal/20 bg-[#F0FDFB] p-4 dark:border-brand-teal/30 dark:bg-brand-teal/10">
          <p className="text-sm font-bold text-brand-navy dark:text-white">📋 Riepilogo</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy/80 dark:text-white/80">
            {recap}
          </p>
          <button
            type="button"
            onClick={onGeneraDaRecap}
            disabled={loading}
            className="mt-4 rounded-xl bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Generazione..." : "Genera preventivo →"}
          </button>
        </div>
      )}

      {errore && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B] dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <span className="shrink-0" aria-hidden>
            ⚠️
          </span>
          <p>Si è verificato un errore. Riprova tra qualche secondo.</p>
        </div>
      )}

      <div ref={fineListaRef} />
    </>
  );
}
