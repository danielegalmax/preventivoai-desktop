import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import NavMemoryTracker from "./NavMemoryTracker";
import { SegnalazioneProvider } from "./SegnalazioneProvider";
import { applyThemeMode, getThemeMode } from "../lib/theme";
import { purgeCestinoScaduto } from "../lib/cestino";
import { isDesktopApp } from "../lib/appSettings";
import { controllaEProponeAggiornamentoAvvio } from "../lib/appUpdater";

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    applyThemeMode(getThemeMode());
    void purgeCestinoScaduto();
    void controllaEProponeAggiornamentoAvvio();
  }, []);

  useEffect(() => {
    if (!isDesktopApp()) return;
    const bloccaMenuBrowser = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", bloccaMenuBrowser);
    return () => document.removeEventListener("contextmenu", bloccaMenuBrowser);
  }, []);
  return (
    <SegnalazioneProvider>
      <div className="flex h-screen bg-brand-bg">
        <NavMemoryTracker />
        <Sidebar />
        <div className="theme-surface flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className={`flex min-h-0 flex-1 flex-col ${isHome ? "overflow-hidden" : "overflow-y-auto"}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </SegnalazioneProvider>
  );
}
