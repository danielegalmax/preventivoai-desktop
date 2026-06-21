import { useEffect, useMemo, useRef, useState } from "react";

const ANTEPRIMA_SENZA_RICERCA = 5;
const MAX_RISULTATI_RICERCA = 8;

type ClienteOpzione = {
  id: string;
  nome: string;
};

type Props = {
  clienti: ClienteOpzione[];
  clienteSelezionatoId: string;
  onSelect: (id: string) => void;
  onClear: () => void;
  onNuovoCliente: () => void;
  disabled?: boolean;
  compact?: boolean;
};

function IconUser({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" d="M5 20v-1a7 7 0 0 1 14 0v1" />
    </svg>
  );
}

function IconX({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconSearch({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconChevronDown({ className = "h-4 w-4", open = false }: { className?: string; open?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`${className} transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path strokeLinecap="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function BuilderClienteCard({
  clienti,
  clienteSelezionatoId,
  onSelect,
  onClear,
  onNuovoCliente,
  disabled = false,
  compact = false,
}: Props) {
  const [ricerca, setRicerca] = useState("");
  const [mostraRicerca, setMostraRicerca] = useState(!clienteSelezionatoId);
  const [listaAperta, setListaAperta] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clienteSelezionatoId) setMostraRicerca(false);
  }, [clienteSelezionatoId]);

  useEffect(() => {
    if (!listaAperta) return;

    function chiudi(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setListaAperta(false);
      }
    }

    document.addEventListener("mousedown", chiudi);
    return () => document.removeEventListener("mousedown", chiudi);
  }, [listaAperta]);

  const clienteSelezionato = clienti.find((c) => c.id === clienteSelezionatoId) ?? null;

  const clientiFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return clienti;
    return clienti.filter((c) => c.nome.toLowerCase().includes(q));
  }, [clienti, ricerca]);

  const haRicerca = ricerca.trim().length > 0;
  const clientiVisibili = haRicerca
    ? clientiFiltrati.slice(0, MAX_RISULTATI_RICERCA)
    : clientiFiltrati.slice(0, ANTEPRIMA_SENZA_RICERCA);
  const clientiNascosti = clientiFiltrati.length - clientiVisibili.length;

  function seleziona(id: string) {
    onSelect(id);
    setMostraRicerca(false);
    setRicerca("");
    setListaAperta(false);
  }

  function rimuovi() {
    onClear();
    setMostraRicerca(true);
    setRicerca("");
    setListaAperta(false);
  }

  function apriLista() {
    if (!disabled) setListaAperta(true);
  }

  const wrapperClass = compact
    ? "space-y-3"
    : "mb-8 rounded-2xl border border-black/10 bg-white p-4 shadow-sm";

  return (
    <div className={wrapperClass}>
      <div className="flex items-center gap-2">
        <span className="text-brand-teal">
          <IconUser />
        </span>
        <div>
          <p className="text-base font-bold text-brand-teal">Cliente</p>
          {!compact && <p className="text-xs text-brand-navy/50">Opzionale — i dati appariranno nel PDF</p>}
        </div>
      </div>

      {clienteSelezionato && !mostraRicerca ? (
        <div className="flex items-center gap-3 rounded-xl border border-brand-teal bg-brand-teal/5 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal">
            <IconUser className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-navy">{clienteSelezionato.nome}</p>
          </div>
          {!disabled && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMostraRicerca(true);
                  setListaAperta(false);
                }}
                className="text-xs font-medium text-brand-teal hover:underline"
              >
                Cambia
              </button>
              <button
                type="button"
                onClick={rimuovi}
                className="rounded-lg p-1 text-brand-navy/40 hover:bg-black/5 hover:text-brand-navy"
                aria-label="Rimuovi cliente"
              >
                <IconX />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div ref={rootRef} className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-brand-navy/40">
              <IconSearch />
            </span>
            <input
              type="search"
              value={ricerca}
              onChange={(e) => {
                setRicerca(e.target.value);
                setListaAperta(true);
              }}
              onFocus={apriLista}
              disabled={disabled}
              placeholder={
                clienti.length > 0
                  ? `Cerca tra ${clienti.length} clienti...`
                  : "Cerca cliente per nome..."
              }
              className="w-full rounded-xl border border-black/10 bg-brand-bg py-2.5 pl-9 pr-10 text-sm outline-none focus:border-brand-teal disabled:opacity-60"
            />
            {!disabled && clienti.length > 0 && (
              <button
                type="button"
                onClick={() => setListaAperta((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-brand-navy/40 hover:bg-black/5 hover:text-brand-navy"
                aria-label={listaAperta ? "Chiudi lista clienti" : "Apri lista clienti"}
              >
                <IconChevronDown open={listaAperta} />
              </button>
            )}

            {listaAperta && !disabled && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                <div className="max-h-52 overflow-y-auto p-1">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => seleziona("")}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      !clienteSelezionatoId
                        ? "bg-brand-teal/10 font-medium text-brand-navy"
                        : "text-brand-navy/70 hover:bg-brand-bg"
                    }`}
                  >
                    Senza cliente
                  </button>

                  {clientiFiltrati.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-brand-navy/50">Nessun cliente trovato</p>
                  ) : (
                    clientiVisibili.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => seleziona(c.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          clienteSelezionatoId === c.id
                            ? "bg-brand-teal/10 font-medium text-brand-navy"
                            : "text-brand-navy/80 hover:bg-brand-bg"
                        }`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-bg text-brand-teal">
                          <IconUser className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate">{c.nome}</span>
                      </button>
                    ))
                  )}
                </div>

                {clientiNascosti > 0 && (
                  <p className="border-t border-black/5 px-3 py-2 text-xs text-brand-navy/50">
                    {haRicerca
                      ? `Altri ${clientiNascosti} risultati — affina la ricerca`
                      : `Altri ${clientiNascosti} clienti — digita per filtrare`}
                  </p>
                )}

                {!haRicerca && clienti.length > ANTEPRIMA_SENZA_RICERCA && clientiNascosti === 0 && (
                  <p className="border-t border-black/5 px-3 py-2 text-xs text-brand-navy/50">
                    Digita per filtrare l&apos;elenco completo
                  </p>
                )}
              </div>
            )}
          </div>

          {!listaAperta && !disabled && (
            <p className="text-xs text-brand-navy/45">
              {clienti.length === 0
                ? "Nessun cliente salvato — puoi crearne uno nuovo."
                : clienti.length <= ANTEPRIMA_SENZA_RICERCA
                  ? `${clienti.length} clienti — clicca la freccia o digita per scegliere`
                  : `${clienti.length} clienti — digita per cercare o apri l'elenco`}
            </p>
          )}

          {!disabled && (
            <div className="flex flex-wrap items-center gap-2">
              {!clienteSelezionatoId && (
                <button
                  type="button"
                  onClick={() => seleziona("")}
                  className="rounded-lg border border-black/10 bg-brand-bg px-3 py-1.5 text-xs font-medium text-brand-navy/70 hover:border-brand-teal/30 hover:text-brand-navy"
                >
                  Senza cliente
                </button>
              )}
              <button
                type="button"
                onClick={onNuovoCliente}
                className="rounded-lg border border-dashed border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-brand-teal hover:border-brand-teal/40 hover:bg-brand-teal/5"
              >
                + Nuovo cliente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
