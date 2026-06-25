import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { signOut } from "../lib/auth";
import { caricaHeaderProfilo, type HeaderProfilo } from "../lib/greeting";
import { isDarkMode, setDarkMode } from "../lib/theme";
import { isDesktopApp } from "../lib/appSettings";
import { onAggiornaProfilo } from "../lib/eventBus";
import { onNativeNotificationSyncStatus } from "../lib/nativeNotificationSession";
import { supabase } from "../lib/supabase";
import ToggleSwitch from "./ToggleSwitch";
import NotificheBell from "./NotificheBell";
import { useSegnalazioneFeedback } from "./SegnalazioneProvider";

export default function Header() {
  const [profilo, setProfilo] = useState<HeaderProfilo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scuro, setScuro] = useState(isDarkMode);
  const [avvisoNotificheNative, setAvvisoNotificheNative] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { apriSegnalazione } = useSegnalazioneFeedback();

  useEffect(() => {
    if (!isDesktopApp()) return;
    return onNativeNotificationSyncStatus(setAvvisoNotificheNative);
  }, []);

  useEffect(() => {
    void caricaHeaderProfilo().then(setProfilo);
  }, []);

  useEffect(() => {
    return onAggiornaProfilo(() => {
      void caricaHeaderProfilo().then(setProfilo);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase
        .channel("header-profilo")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          () => {
            void caricaHeaderProfilo().then(setProfilo);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function chiudi(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", chiudi);
    return () => document.removeEventListener("mousedown", chiudi);
  }, [menuOpen]);

  function onTemaScuro(checked: boolean) {
    setScuro(checked);
    setDarkMode(checked);
  }

  async function esci() {
    setMenuOpen(false);
    if (!window.confirm("Vuoi uscire dall'account?")) return;
    await signOut();
  }

  return (
    <>
      {avvisoNotificheNative ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-800">
          <p>{avvisoNotificheNative}</p>
          <button
            type="button"
            onClick={() => setAvvisoNotificheNative(null)}
            className="shrink-0 text-amber-700/70 hover:text-amber-900"
            aria-label="Chiudi avviso"
          >
            ×
          </button>
        </div>
      ) : null}
    <header className="flex h-16 shrink-0 items-center justify-end gap-2 border-b border-edge-faint bg-surface px-6">
      <NotificheBell />
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center gap-3 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-brand-bg"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-teal text-sm font-bold text-white shadow-sm">
            {profilo?.iniziale || "P"}
          </div>
          <div className="hidden min-w-0 text-left sm:block">
            <p className="truncate text-sm font-semibold text-ink">
              {profilo?.nomeBreve || "..."}
            </p>
          </div>
          <ChevronIcon open={menuOpen} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-edge bg-surface py-2 shadow-lg"
          >
            <div className="border-b border-edge-faint px-4 py-3">
              <p className="truncate text-sm font-semibold text-ink">{profilo?.nomeBreve || "Account"}</p>
              {profilo?.email && (
                <p className="mt-0.5 truncate text-xs text-ink/50">{profilo.email}</p>
              )}
            </div>

            <Link
              to="/profilo"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-brand-bg"
            >
              <MenuIconProfilo />
              Il mio profilo
            </Link>
            <Link
              to="/app"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-brand-bg"
            >
              <MenuIconApp />
              Impostazioni app
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                apriSegnalazione();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-brand-bg"
            >
              <MenuIconFeedback />
              Segnala un problema
            </button>

            <div className="my-2 border-t border-edge-faint" />

            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <MenuIconTema />
                <span className="text-sm text-ink">Tema scuro</span>
              </div>
              <ToggleSwitch checked={scuro} onChange={onTemaScuro} />
            </div>

            <div className="my-2 border-t border-edge-faint" />

            <button
              type="button"
              role="menuitem"
              onClick={() => void esci()}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-500/10"
            >
              <MenuIconEsci />
              Esci dall&apos;account
            </button>
          </div>
        )}
      </div>
    </header>
    </>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 shrink-0 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MenuIconProfilo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 text-ink/50">
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" d="M5 20v-1a7 7 0 0 1 14 0v1" />
    </svg>
  );
}

function MenuIconApp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 text-ink/50">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path strokeLinecap="round" d="M8 20h8M12 16v4" />
    </svg>
  );
}

function MenuIconFeedback() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 text-ink/50">
      <path strokeLinecap="round" d="M12 9v4m0 4h.01" />
      <path strokeLinecap="round" d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

function MenuIconTema() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 text-ink/50">
      <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" />
    </svg>
  );
}

function MenuIconEsci() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path strokeLinecap="round" d="M15 12H3m0 0 4-4m-4 4 4 4" />
      <path strokeLinecap="round" d="M9 7V5a2 2 0 0 1 2-2h8v18h-8a2 2 0 0 1-2-2v-2" />
    </svg>
  );
}
