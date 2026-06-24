import { Outlet, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { NuovoPreventivoNavProvider } from "./NuovoPreventivoNavProvider";
import Sidebar from "./Sidebar";
import Header from "./Header";
import NuovoRipresaPathTracker from "./NuovoRipresaPathTracker";
import { NotificheProvider } from "./NotificheProvider";
import { SegnalazioneProvider } from "./SegnalazioneProvider";
import { applyThemeMode, getThemeMode } from "../lib/theme";
import { purgeCestinoScaduto } from "../lib/cestino";
import { isDesktopApp } from "../lib/appSettings";
import { controllaEProponeAggiornamentoAvvio } from "../lib/appUpdater";
import { controllaVersioneMinima } from "../lib/versione";
import { AggiornamentoObbligatorioModal } from "./AggiornamentoObbligatorioModal";

export default function Layout() {
  const [aggiornaObbligatorio, setAggiornaObbligatorio] = useState(false);
  const [versioneInstallata, setVersioneInstallata] = useState<string>();
  const [versioneMinima, setVersioneMinima] = useState<string>();
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    applyThemeMode(getThemeMode());
    void purgeCestinoScaduto();
    void controllaEProponeAggiornamentoAvvio();
  }, []);

  useEffect(() => {
    controllaVersioneMinima().then((risultato) => {
      if (!risultato.ok) {
        setVersioneInstallata(risultato.installata);
        setVersioneMinima(risultato.minima);
        setAggiornaObbligatorio(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!isDesktopApp()) return;
    const bloccaMenuBrowser = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", bloccaMenuBrowser);
    return () => document.removeEventListener("contextmenu", bloccaMenuBrowser);
  }, []);
  return (
    <>
    <AggiornamentoObbligatorioModal
      visibile={aggiornaObbligatorio}
      versioneInstallata={versioneInstallata}
      versioneMinima={versioneMinima}
    />
    <NotificheProvider>
      <SegnalazioneProvider>
        <NuovoPreventivoNavProvider>
        <div className="flex h-screen bg-brand-bg">
          <NuovoRipresaPathTracker />
          <Sidebar />
          <div className="theme-surface flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className={`flex min-h-0 flex-1 flex-col ${isHome ? "overflow-hidden" : "overflow-y-auto"}`}>
              <Outlet />
            </main>
          </div>
        </div>
        </NuovoPreventivoNavProvider>
      </SegnalazioneProvider>
    </NotificheProvider>
    </>
  );
}
