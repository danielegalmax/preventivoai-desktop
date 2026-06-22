/**
 * Architettura notifiche desktop a 3 canali (coordinati, non duplicati):
 *
 * 1. Realtime Supabase (JS): quando la finestra è in foreground aggiorna campanella + toast
 *    in-app (`enqueueToast`). `mostraNotificaOsSoloSeForeground` evita la notifica OS
 *    nativa se l'utente sta già guardando l'app.
 *
 * 2. Polling Rust ogni 35s (`src-tauri/src/lib.rs`): quando l'app è in background o nel
 *    tray, WebView2 throttla/sospende il JS — il realtime non è affidabile. Rust interroga
 *    Supabase e mostra la notifica OS nativa.
 *
 * 3. `visteLocalmente`: Set in memoria di sessione per abbassare il badge campanella quando
 *    l'utente ha già visto una notifica (hover/toast) senza scrivere `letta=true` su DB.
 *
 * Coordinamento anti-duplicati: in foreground JS segnala sempre a Rust (`segnalaNotificaConsegnata`)
 * ogni INSERT Realtime gestito, anche se la notifica OS nativa non parte (permessi disabilitati).
 * Rust salta l'OS in foreground; la segnalazione evita un secondo alert se l'utente va in
 * background prima del prossimo poll. In background JS non segnala: l'OS è responsabilità del poller Rust.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  archiviaNotifica,
  caricaNotificheCampanella,
  mostraNotificaOsSePossibile,
  notificaContaBadge,
  rimandaNotifica,
  segnalaNotificaConsegnata,
  segnaNotificaLetta,
  segnaTutteLette,
  titoloNotificaDaTipo,
  type Notifica,
} from "../lib/notifiche";
import { supabase } from "../lib/supabase";

const ORE_RIMANDA_DEFAULT = 24;
const MAX_TOASTS = 3;
const TOAST_TTL_MS = 5000;
const TOAST_FADE_MS = 300;

async function isFinestraInForeground() {
  if (!isTauri()) return true;

  try {
    const window = getCurrentWindow();
    const [visible, focused, minimized] = await Promise.all([
      window.isVisible(),
      window.isFocused(),
      window.isMinimized(),
    ]);
    return visible && focused && !minimized;
  } catch {
    return false;
  }
}

async function gestisciNotificaRealtime(raw: Partial<Notifica> | null | undefined) {
  if (!raw) return;

  const inForeground = await isFinestraInForeground();
  if (inForeground) {
    await mostraNotificaOsSePossibile(raw);
    await segnalaNotificaConsegnata(typeof raw.id === "string" ? raw.id : undefined);
  }
}

export type NotificaToast = {
  id: string;
  titolo: string;
  messaggio: string;
  tipo: string;
  preventivo_id: string | null;
  nomeCliente?: string;
  createdAt: string;
  leaving: boolean;
};

type NotificheContextValue = {
  notifiche: Notifica[];
  loading: boolean;
  erroreCaricamento: boolean;
  count: number;
  ricarica: () => Promise<void>;
  segnaLetta: (id: string) => Promise<void>;
  segnaTutteLette: () => Promise<void>;
  rimanda: (id: string, ore?: number) => Promise<void>;
  archivia: (id: string) => Promise<void>;
  toasts: NotificaToast[];
  rimuoviToast: (id: string) => void;
  clearToasts: () => void;
  marcaVistaLocale: (id: string) => void;
};

const NotificheContext = createContext<NotificheContextValue | null>(null);

function buildToast(raw: Partial<Notifica>): NotificaToast | null {
  if (!raw.id) return null;
  const tipo = String(raw.tipo || "");
  return {
    id: raw.id,
    titolo: typeof raw.titolo === "string" && raw.titolo.trim()
      ? raw.titolo.trim()
      : titoloNotificaDaTipo(tipo),
    messaggio: typeof raw.messaggio === "string" ? raw.messaggio : "",
    tipo,
    preventivo_id: raw.preventivo_id ?? null,
    nomeCliente: raw.payload?.nomeCliente,
    createdAt: raw.created_at || new Date().toISOString(),
    leaving: false,
  };
}

function contaBadgeCampanella(notifiche: Notifica[], visteLocalmente: Set<string>) {
  return notifiche.filter(
    (n) => notificaContaBadge(n) && !visteLocalmente.has(n.id),
  ).length;
}

export function NotificheProvider({ children }: { children: ReactNode }) {
  const [notifiche, setNotifiche] = useState<Notifica[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroreCaricamento, setErroreCaricamento] = useState(false);
  const [toasts, setToasts] = useState<NotificaToast[]>([]);
  const [visteLocalmente, setVisteLocalmente] = useState<Set<string>>(() => new Set());

  // Badge = non lette in DB − già viste in questa sessione (senza persistere su Supabase).
  const count = useMemo(
    () => contaBadgeCampanella(notifiche, visteLocalmente),
    [notifiche, visteLocalmente],
  );

  const marcaVistaLocale = useCallback((id: string) => {
    setVisteLocalmente((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const removeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const ttlTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearToastTimers = useCallback((id: string) => {
    const ttl = ttlTimersRef.current.get(id);
    if (ttl) {
      clearTimeout(ttl);
      ttlTimersRef.current.delete(id);
    }
    const remove = removeTimersRef.current.get(id);
    if (remove) {
      clearTimeout(remove);
      removeTimersRef.current.delete(id);
    }
  }, []);

  const removeToastFromDom = useCallback((id: string) => {
    clearToastTimers(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, [clearToastTimers]);

  const beginToastDismiss = useCallback((id: string) => {
    clearToastTimers(id);
    setToasts((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target || target.leaving) return prev;
      return prev.map((t) => (t.id === id ? { ...t, leaving: true } : t));
    });
    const removeTimer = setTimeout(() => {
      removeToastFromDom(id);
    }, TOAST_FADE_MS);
    removeTimersRef.current.set(id, removeTimer);
  }, [clearToastTimers, removeToastFromDom]);

  const scheduleToastAutoDismiss = useCallback((id: string) => {
    clearToastTimers(id);
    const ttlTimer = setTimeout(() => {
      beginToastDismiss(id);
    }, TOAST_TTL_MS - TOAST_FADE_MS);
    ttlTimersRef.current.set(id, ttlTimer);
  }, [beginToastDismiss, clearToastTimers]);

  const enqueueToast = useCallback((raw: Partial<Notifica> | undefined) => {
    const toast = raw ? buildToast(raw) : null;
    if (!toast) return;

    setToasts((prev) => {
      const withoutDup = prev.filter((t) => t.id !== toast.id);
      const merged: NotificaToast[] = [{ ...toast, leaving: false }, ...withoutDup];
      const active = merged.filter((t) => !t.leaving);

      if (active.length > MAX_TOASTS) {
        const oldest = active[MAX_TOASTS];
        if (oldest) {
          clearToastTimers(oldest.id);
          const evicted = merged.map((t) =>
            t.id === oldest.id ? { ...t, leaving: true } : t,
          );
          const removeTimer = setTimeout(() => {
            removeToastFromDom(oldest.id);
          }, TOAST_FADE_MS);
          removeTimersRef.current.set(oldest.id, removeTimer);
          return evicted;
        }
      }

      return merged;
    });

    scheduleToastAutoDismiss(toast.id);
  }, [clearToastTimers, removeToastFromDom, scheduleToastAutoDismiss]);

  const enqueueToastRef = useRef(enqueueToast);
  enqueueToastRef.current = enqueueToast;

  const rimuoviToast = useCallback((id: string) => {
    beginToastDismiss(id);
  }, [beginToastDismiss]);

  const clearToasts = useCallback(() => {
    const ids = new Set([
      ...ttlTimersRef.current.keys(),
      ...removeTimersRef.current.keys(),
    ]);
    for (const id of ids) clearToastTimers(id);
    setToasts([]);
  }, [clearToastTimers]);

  const ricaricaReqRef = useRef(0);

  const ricarica = useCallback(async () => {
    const reqId = ++ricaricaReqRef.current;
    const result = await caricaNotificheCampanella();
    if (reqId !== ricaricaReqRef.current) return;
    if (result.ok) {
      setNotifiche(result.notifiche);
      setErroreCaricamento(false);
    } else {
      setErroreCaricamento(true);
    }
    setLoading(false);
  }, []);

  const ricaricaRef = useRef(ricarica);
  ricaricaRef.current = ricarica;

  useEffect(() => {
    void ricaricaRef.current();

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const filter = `user_id=eq.${user.id}`;
      const channelName = `notifiche-artigiano-${user.id}`;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifiche",
            filter,
          },
          (payload) => {
            const raw = (payload as { new?: Partial<Notifica> }).new;
            void ricaricaRef.current();
            void gestisciNotificaRealtime(raw);
            enqueueToastRef.current(raw);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifiche",
            filter,
          },
          () => {
            void ricaricaRef.current();
          },
        )
        .subscribe();
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") void ricaricaRef.current();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
      for (const id of ttlTimersRef.current.keys()) clearToastTimers(id);
    };
  }, [clearToastTimers]);

  const segnaLetta = useCallback(async (id: string) => {
    await segnaNotificaLetta(id);
    await ricarica();
  }, [ricarica]);

  const segnaTutteLetteHook = useCallback(async () => {
    await segnaTutteLette();
    setVisteLocalmente(new Set());
    await ricarica();
  }, [ricarica]);

  const rimanda = useCallback(async (id: string, ore = ORE_RIMANDA_DEFAULT) => {
    await rimandaNotifica(id, ore);
    await ricarica();
  }, [ricarica]);

  const archivia = useCallback(async (id: string) => {
    await archiviaNotifica(id);
    await ricarica();
  }, [ricarica]);

  const value: NotificheContextValue = {
    notifiche,
    loading,
    erroreCaricamento,
    count,
    ricarica,
    segnaLetta,
    segnaTutteLette: segnaTutteLetteHook,
    rimanda,
    archivia,
    toasts,
    rimuoviToast,
    clearToasts,
    marcaVistaLocale,
  };

  return (
    <NotificheContext.Provider value={value}>
      {children}
    </NotificheContext.Provider>
  );
}

export function useNotifiche() {
  const ctx = useContext(NotificheContext);
  if (!ctx) {
    throw new Error("useNotifiche va usato dentro NotificheProvider");
  }
  return ctx;
}
