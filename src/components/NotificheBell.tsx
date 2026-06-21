import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  formatTempoNotifica,
  notificaInRimando,
  type Notifica,
} from "../lib/notifiche";
import { useNotifiche } from "./NotificheProvider";
import { segnaPreventivoPagato } from "../lib/preventivo";
import { eventBus } from "../lib/eventBus";
import NotificaFirmaDialog from "./firma/NotificaFirmaDialog";
import NotificaToastStack from "./NotificaToastStack";

export default function NotificheBell() {
  const navigate = useNavigate();
  const { notifiche, count, segnaTutteLette, rimanda, archivia, clearToasts } = useNotifiche();
  const [open, setOpen] = useState(false);
  const [nonAncoraNotate, setNonAncoraNotate] = useState<Set<string>>(() => new Set());
  const [nonAncoraAperte, setNonAncoraAperte] = useState<Set<string>>(() => new Set());
  const ref = useRef<HTMLDivElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setNonAncoraNotate((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const n of notifiche) {
        if (!n.letta && !next.has(n.id)) {
          next.add(n.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setNonAncoraAperte((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const n of notifiche) {
        if (!n.letta && !next.has(n.id)) {
          next.add(n.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [notifiche]);

  useEffect(() => {
    if (!open) return;
    void segnaTutteLette();
  }, [open, segnaTutteLette]);

  useEffect(() => {
    if (!open) return;
    function chiudi(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", chiudi);
    return () => document.removeEventListener("mousedown", chiudi);
  }, [open]);

  function handleMouseEnterNotifica(n: Notifica) {
    setNonAncoraNotate((prev) => {
      if (!prev.has(n.id)) return prev;
      const next = new Set(prev);
      next.delete(n.id);
      return next;
    });
  }

  function apriNotifica(n: Notifica) {
    setNonAncoraAperte((prev) => {
      if (!prev.has(n.id)) return prev;
      const next = new Set(prev);
      next.delete(n.id);
      return next;
    });
    setOpen(false);
    if (n.preventivo_id) {
      navigate(`/storico?focus=${n.preventivo_id}&notifica=${n.id}`);
      eventBus.emitApriNotifica({ notifica: n });
    }
  }

  async function handleRimanda(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await rimanda(id);
  }

  async function handleArchivia(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await archivia(id);
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={bellBtnRef}
        type="button"
        onClick={() => setOpen((v) => {
          if (!v) clearToasts();
          return !v;
        })}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink/70 hover:bg-brand-bg"
        aria-label="Notifiche"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
          <path strokeLinecap="round" d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path strokeLinecap="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-teal px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-edge bg-surface shadow-lg">
          <div className="border-b border-edge-faint px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifiche</p>
            {count > 0 ? (
              <p className="mt-0.5 text-xs text-ink/45">{count} da fare</p>
            ) : notifiche.length > 0 ? (
              <p className="mt-0.5 text-xs text-ink/45">Tutte rimandate</p>
            ) : null}
          </div>
          {notifiche.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink/50">Nessuna notifica</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifiche.map((n) => {
                const rimandata = notificaInRimando(n);
                const mostraDot = nonAncoraNotate.has(n.id) && !rimandata;
                const titoloBold = nonAncoraAperte.has(n.id) && !rimandata;
                return (
                  <li
                    key={n.id}
                    className={`border-b border-edge-faint ${!mostraDot && !titoloBold ? "opacity-60" : ""}`}
                    onMouseEnter={() => handleMouseEnterNotifica(n)}
                  >
                    <div className="flex items-start gap-2 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void apriNotifica(n)}
                        className="flex min-w-0 flex-1 gap-3 text-left hover:opacity-80"
                      >
                        {mostraDot ? (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-teal"
                            aria-hidden
                          />
                        ) : rimandata ? (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink/25"
                            aria-hidden
                          />
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`text-sm text-ink ${titoloBold ? "font-semibold" : "font-normal"}`}
                            >
                              {n.titolo}
                            </p>
                            {rimandata ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                Rimandata
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink/55">{n.messaggio}</p>
                          <p className="mt-1 text-[11px] text-ink/40">{formatTempoNotifica(n.created_at)}</p>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => void handleArchivia(e, n.id)}
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink/40 hover:bg-brand-bg hover:text-ink/70"
                        aria-label="Elimina notifica"
                      >
                        ×
                      </button>
                    </div>
                    {!rimandata ? (
                      <div className="flex justify-end px-4 pb-2">
                        <button
                          type="button"
                          onClick={(e) => void handleRimanda(e, n.id)}
                          className="text-xs font-medium text-ink/45 hover:text-brand-teal"
                        >
                          Rimanda
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <NotificaToastStack anchorRef={bellBtnRef} />
    </div>
  );
}

export function NotificaAzioneStorico({
  notifica,
  onClose,
}: {
  notifica: Notifica | null;
  onClose: () => void;
}) {
  const { segnaLetta, rimanda, ricarica } = useNotifiche();

  async function handleSegnaPagato(preventivoId: string) {
    await segnaPreventivoPagato(preventivoId, true);
    if (notifica && !notifica.letta) await segnaLetta(notifica.id);
    eventBus.emit("aggiorna-home");
    void ricarica();
    onClose();
  }

  async function handleRimanda() {
    if (notifica) await rimanda(notifica.id);
    void ricarica();
    onClose();
  }

  async function handleCompletata() {
    if (notifica && !notifica.letta) await segnaLetta(notifica.id);
    void ricarica();
    onClose();
  }

  if (!notifica) return null;

  return (
    <NotificaFirmaDialog
      notifica={notifica}
      onClose={onClose}
      onSegnaPagato={(id) => void handleSegnaPagato(id)}
      onRimanda={() => void handleRimanda()}
      onCompletata={() => void handleCompletata()}
    />
  );
}
