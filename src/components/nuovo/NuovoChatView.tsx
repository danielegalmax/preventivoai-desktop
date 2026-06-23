import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import type { Messaggio } from "../../lib/types";
import BuilderClienteCard from "../BuilderClienteCard";
import NuovoChatSection from "./NuovoChatSection";

type Props = {
  clienti: { id: string; nome: string }[];
  clienteSelezionatoId: string;
  onSelectCliente: (id: string) => void;
  onClearCliente: () => void;
  onNuovoCliente: () => void;
  messaggi: Messaggio[];
  recap: string;
  errore: string;
  loading: boolean;
  inModifica: boolean;
  fineListaRef: RefObject<HTMLDivElement | null>;
  onGeneraDaRecap: () => void;
  input: string;
  onInputChange: (value: string) => void;
  onInvia: (e: FormEvent) => void;
};

const TEXTAREA_LINE_HEIGHT_PX = 22;
const TEXTAREA_MAX_ROWS = 4;

function IconSend({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 14-7-7 7 14 7-7-7Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5" />
    </svg>
  );
}

function IconSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="opacity-25" />
      <path
        fill="currentColor"
        d="M12 3a9 9 0 0 1 9 9h-2a7 7 0 0 0-7-7V3z"
        className="opacity-75"
      />
    </svg>
  );
}

export default function NuovoChatView({
  clienti,
  clienteSelezionatoId,
  onSelectCliente,
  onClearCliente,
  onNuovoCliente,
  messaggi,
  recap,
  errore,
  loading,
  inModifica,
  fineListaRef,
  onGeneraDaRecap,
  input,
  onInputChange,
  onInvia,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [clienteCardEspansa, setClienteCardEspansa] = useState(!clienteSelezionatoId);

  const clienteSelezionato = clienti.find((c) => c.id === clienteSelezionatoId) ?? null;

  useEffect(() => {
    if (clienteSelezionatoId) {
      setClienteCardEspansa(false);
    } else {
      setClienteCardEspansa(true);
    }
  }, [clienteSelezionatoId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = TEXTAREA_LINE_HEIGHT_PX * TEXTAREA_MAX_ROWS + 16;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [input]);

  function handleClearCliente() {
    onClearCliente();
    setClienteCardEspansa(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) {
        formRef.current?.requestSubmit();
      }
    }
  }

  return (
    <div className="mt-4 flex min-h-[calc(100vh-16rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#1a2f45]">
      <div className="shrink-0 border-b border-black/5 px-4 py-3 dark:border-white/10">
        {clienteSelezionato && !clienteCardEspansa ? (
          <button
            type="button"
            onClick={() => setClienteCardEspansa(true)}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/10 bg-brand-bg px-3 py-1.5 text-sm text-brand-navy dark:border-white/10 dark:bg-[#1e2d3d] dark:text-white"
          >
            <span aria-hidden>👤</span>
            <span className="truncate font-medium">{clienteSelezionato.nome}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClearCliente();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClearCliente();
                }
              }}
              className="ml-1 rounded-full px-1 text-brand-navy/50 hover:text-brand-navy dark:text-white/50 dark:hover:text-white"
              aria-label="Rimuovi cliente"
            >
              ×
            </span>
          </button>
        ) : (
          <BuilderClienteCard
            clienti={clienti}
            clienteSelezionatoId={clienteSelezionatoId}
            onSelect={(id) => {
              onSelectCliente(id);
              if (id) setClienteCardEspansa(false);
            }}
            onClear={handleClearCliente}
            onNuovoCliente={onNuovoCliente}
            compact
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <NuovoChatSection
          messaggi={messaggi}
          recap={recap}
          errore={errore}
          loading={loading}
          inModifica={inModifica}
          fineListaRef={fineListaRef}
          onGeneraDaRecap={onGeneraDaRecap}
          onSuggestionClick={onInputChange}
        />
      </div>

      <form
        ref={formRef}
        onSubmit={onInvia}
        className="sticky bottom-0 shrink-0 border-t border-black/8 bg-white px-5 py-3 dark:border-white/10 dark:bg-[#1a2f45]"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descrivi il lavoro da preventivare..."
            disabled={loading}
            rows={1}
            className="max-h-[6.5rem] min-h-[2.75rem] flex-1 resize-none rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-teal disabled:opacity-60 dark:border-white/10 dark:bg-[#1e2d3d] dark:text-white"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-teal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            aria-label="Invia messaggio"
          >
            {loading ? <IconSpinner /> : <IconSend />}
          </button>
        </div>
      </form>
    </div>
  );
}
