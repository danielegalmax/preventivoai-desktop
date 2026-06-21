import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { eventBus } from "../lib/eventBus";
import type { Notifica } from "../lib/notifiche";
import { useNotifiche, type NotificaToast } from "./NotificheProvider";

const TOAST_GAP = 8;
const ANCHOR_GAP = 8;
const TOAST_WIDTH = 320;

type Props = {
  anchorRef: RefObject<HTMLButtonElement | null>;
};

function toastToNotifica(t: NotificaToast): Notifica {
  return {
    id: t.id,
    tipo: t.tipo,
    preventivo_id: t.preventivo_id,
    invio_id: null,
    titolo: t.titolo,
    messaggio: t.messaggio,
    payload: t.nomeCliente ? { nomeCliente: t.nomeCliente } : {},
    letta: false,
    archiviata: false,
    snooze_until: null,
    created_at: t.createdAt,
  };
}

export default function NotificaToastStack({ anchorRef }: Props) {
  const navigate = useNavigate();
  const { toasts, rimuoviToast, marcaVistaLocale } = useNotifiche();
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const visteToastRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    function aggiornaPosizione() {
      const btn = anchorRef.current;
      if (!btn) {
        setCoords(null);
        return;
      }
      const rect = btn.getBoundingClientRect();
      setCoords({
        top: rect.bottom + ANCHOR_GAP,
        right: window.innerWidth - rect.right,
      });
    }

    aggiornaPosizione();
    window.addEventListener("resize", aggiornaPosizione);
    window.addEventListener("scroll", aggiornaPosizione, true);
    return () => {
      window.removeEventListener("resize", aggiornaPosizione);
      window.removeEventListener("scroll", aggiornaPosizione, true);
    };
  }, [anchorRef, toasts.length]);

  if (toasts.length === 0 || !coords || typeof document === "undefined") return null;

  function handleToastMouseEnter(id: string) {
    if (visteToastRef.current.has(id)) return;
    visteToastRef.current.add(id);
    marcaVistaLocale(id);
  }

  function handleToastClick(t: NotificaToast) {
    rimuoviToast(t.id);
    if (!t.preventivo_id) return;
    const notifica = toastToNotifica(t);
    navigate(`/storico?focus=${t.preventivo_id}&notifica=${t.id}`);
    eventBus.emitApriNotifica({ notifica });
  }

  const stack = (
    <div
      className="pointer-events-none fixed z-[55] flex w-80 flex-col"
      style={{ top: coords.top, right: coords.right, width: TOAST_WIDTH }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto ${t.leaving ? "notifica-toast-leave" : "notifica-toast-enter"}`}
          style={{ marginBottom: TOAST_GAP }}
          onMouseEnter={() => handleToastMouseEnter(t.id)}
        >
          <div className="relative overflow-hidden rounded-2xl border border-edge bg-surface shadow-lg">
            <span
              className="absolute left-0 top-0 h-full w-1 bg-brand-teal"
              aria-hidden
            />
            <div className="flex items-start gap-2 py-3 pl-4 pr-2">
              <button
                type="button"
                onClick={() => handleToastClick(t)}
                className={`min-w-0 flex-1 text-left ${t.preventivo_id ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}
              >
                <p className="text-sm font-semibold text-ink">{t.titolo}</p>
                {t.nomeCliente ? (
                  <p className="mt-0.5 text-xs font-medium text-brand-teal">{t.nomeCliente}</p>
                ) : null}
                {t.messaggio ? (
                  <p className="mt-1 line-clamp-2 text-xs text-ink/55">{t.messaggio}</p>
                ) : null}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  rimuoviToast(t.id);
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink/40 hover:bg-brand-bg hover:text-ink/70"
                aria-label="Chiudi notifica"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return createPortal(stack, document.body);
}
