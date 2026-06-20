import { useEffect, useState } from "react";
import PageContainer from "../components/PageContainer";
import ToggleSwitch from "../components/ToggleSwitch";
import {
  CARTELLA_PDF_ROOT_NAME,
  cartellaPdfBase,
  controllaAggiornamenti,
  getPdfCartellaCustom,
  getPdfCartelleCliente,
  getPdfSalvataggioModalita,
  impostaAutostart,
  installaAggiornamentoDesktop,
  isDesktopApp,
  leggiAutostartAbilitato,
  leggiInfoApp,
  scegliCartellaPdfCustom,
  setPdfCartellaCustom,
  setPdfCartelleCliente,
  setPdfSalvataggioModalita,
  type PdfSalvataggioModalita,
  type RisultatoControlloAggiornamenti,
} from "../lib/appSettings";

const WEB_BASE_URL = "https://preventivoai-web.vercel.app";
const WEB_TERMINI_URL = `${WEB_BASE_URL}/termini`;
const WEB_PRIVACY_URL = `${WEB_BASE_URL}/privacy`;

function clearLocalData() {
  localStorage.removeItem("preventivoai-nav-memory");
  localStorage.removeItem("preventivoai-nuovo-chat");
  localStorage.removeItem("preventivoai-nuovo-manuale");
  localStorage.removeItem("preventivoai-pdf-folder");
  localStorage.removeItem("preventivoai-pdf-cartelle-cliente");
  localStorage.removeItem("preventivoai-pdf-cartella-custom");
  localStorage.removeItem("preventivoai-pdf-salvataggio-modalita");
}

export default function AppSettings() {
  const [msg, setMsg] = useState("");
  const [cartellaBase, setCartellaBase] = useState("");
  const [cartellaCustom, setCartellaCustomState] = useState("");
  const [cartelleCliente, setCartelleCliente] = useState(true);
  const [salvataggioModalita, setSalvataggioModalita] = useState<PdfSalvataggioModalita>("cartella");
  const [autostart, setAutostart] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(true);
  const [versione, setVersione] = useState("—");
  const [build, setBuild] = useState("—");
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [updateResult, setUpdateResult] = useState<RisultatoControlloAggiornamenti | null>(null);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [installProgress, setInstallProgress] = useState<number | null>(null);
  const desktop = isDesktopApp();

  async function aggiornaPercorsiPdf() {
    if (!desktop) return;
    setCartellaBase(await cartellaPdfBase());
  }

  useEffect(() => {
    setCartelleCliente(getPdfCartelleCliente());
    setCartellaCustomState(getPdfCartellaCustom());
    setSalvataggioModalita(getPdfSalvataggioModalita());

    void (async () => {
      const info = await leggiInfoApp();
      setVersione(info.versione);
      setBuild(info.build);
      if (desktop) {
        try {
          setAutostart(await leggiAutostartAbilitato());
          await aggiornaPercorsiPdf();
        } catch {
          setAutostart(false);
        }
      }
      setAutostartLoading(false);
    })();
  }, [desktop]);

  function flash(message: string, ms = 1500) {
    setMsg(message);
    window.setTimeout(() => setMsg(""), ms);
  }

  function onCartelleClienteChange(checked: boolean) {
    setCartelleCliente(checked);
    setPdfCartelleCliente(checked);
    flash(checked ? "Sottocartelle cliente attivate." : "Sottocartelle cliente disattivate.");
  }

  function onSalvataggioModalitaChange(modalita: PdfSalvataggioModalita) {
    setSalvataggioModalita(modalita);
    setPdfSalvataggioModalita(modalita);
    flash(
      modalita === "chiedi_ogni_volta"
        ? "Ti chiederò dove salvare a ogni PDF."
        : "Salvataggio automatico nella cartella configurata.",
    );
  }

  async function onScegliCartella() {
    if (!desktop) {
      flash("Disponibile solo nell'app desktop.");
      return;
    }
    try {
      const path = await scegliCartellaPdfCustom();
      if (path) {
        setCartellaCustomState(path);
        await aggiornaPercorsiPdf();
        flash("Cartella personalizzata salvata.");
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : "Errore nella selezione cartella.", 2500);
    }
  }

  async function onUsaPredefinita() {
    setPdfCartellaCustom("");
    setCartellaCustomState("");
    await aggiornaPercorsiPdf();
    flash("Ripristinata la cartella predefinita sul Desktop.");
  }

  async function onAutostartChange(checked: boolean) {
    if (!desktop) return;
    setAutostart(checked);
    try {
      await impostaAutostart(checked);
      flash(checked ? "Avvio automatico attivato." : "Avvio automatico disattivato.");
    } catch (err) {
      setAutostart(!checked);
      flash(err instanceof Error ? err.message : "Impossibile modificare l'avvio automatico.", 2500);
    }
  }

  async function onControllaAggiornamenti() {
    setCheckingUpdate(true);
    setUpdateMsg("");
    setUpdateResult(null);
    setInstallProgress(null);
    try {
      const res = await controllaAggiornamenti();
      setUpdateResult(res);
      setUpdateMsg(res.messaggio);
    } catch (err) {
      setUpdateMsg(err instanceof Error ? err.message : "Controllo aggiornamenti non disponibile.");
    } finally {
      setCheckingUpdate(false);
    }
  }

  async function onInstallaAggiornamento() {
    const update = updateResult?.update;
    if (!update) return;
    setInstallingUpdate(true);
    setInstallProgress(0);
    setUpdateMsg("Download in corso...");
    try {
      await installaAggiornamentoDesktop(update, setInstallProgress);
    } catch (err) {
      setUpdateMsg(err instanceof Error ? err.message : "Installazione non riuscita.");
      setInstallingUpdate(false);
      setInstallProgress(null);
    }
  }

  function reset() {
    if (!window.confirm("Vuoi cancellare memoria navigazione e bozze?")) return;
    clearLocalData();
    setCartelleCliente(true);
    setSalvataggioModalita("cartella");
    setCartellaCustomState("");
    void aggiornaPercorsiPdf();
    flash("Dati locali cancellati.");
  }

  const usaCartellaCustom = Boolean(cartellaCustom);

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-brand-navy">App</h1>
      <p className="mt-1 text-brand-navy/60">Impostazioni locali di PreventivoAI su questo PC.</p>

      <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">Cartella PDF</p>

        <fieldset className="mt-4 border-t border-black/5 pt-4">
          <legend className="text-sm font-medium text-brand-navy">Come salvare i PDF</legend>
          <div className="mt-3 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 px-4 py-3 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal/5">
              <input
                type="radio"
                name="pdf-salvataggio"
                className="mt-1"
                checked={salvataggioModalita === "cartella"}
                disabled={!desktop}
                onChange={() => onSalvataggioModalitaChange("cartella")}
              />
              <span>
                <span className="block text-sm font-medium text-brand-navy">Cartella automatica</span>
                <span className="mt-0.5 block text-sm text-brand-navy/60">
                  Salvo subito nella cartella principale (e nella sottocartella cliente, se attiva).
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 px-4 py-3 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal/5">
              <input
                type="radio"
                name="pdf-salvataggio"
                className="mt-1"
                checked={salvataggioModalita === "chiedi_ogni_volta"}
                disabled={!desktop}
                onChange={() => onSalvataggioModalitaChange("chiedi_ogni_volta")}
              />
              <span>
                <span className="block text-sm font-medium text-brand-navy">Scegli ogni volta</span>
                <span className="mt-0.5 block text-sm text-brand-navy/60">
                  Alla generazione del PDF apro la finestra «Salva con nome» (cartella e nome precompilati).
                </span>
              </span>
            </label>
          </div>
          <p className="mt-3 text-xs text-brand-navy/50">
            Nome file: <span className="font-mono">Mario Rossi_PRV-2026-0070.pdf</span>
          </p>
        </fieldset>

        <div className="mt-4 flex items-start justify-between gap-4 border-t border-black/5 pt-4">
          <div>
            <p className="text-sm font-medium text-brand-navy">Sottocartelle per cliente</p>
            <p className="mt-1 text-sm text-brand-navy/60">
              Se è selezionato un cliente, creo la sua cartella (se non esiste già) e salvo lì i PDF.
              Senza cliente, i file restano nella cartella principale.
            </p>
          </div>
          <ToggleSwitch
            checked={cartelleCliente}
            onChange={onCartelleClienteChange}
            disabled={!desktop}
          />
        </div>

        <div className="mt-5 border-t border-black/5 pt-4">
          <p className="text-sm font-medium text-brand-navy">Cartella principale</p>
          <p className="mt-1 text-sm text-brand-navy/60">
            {usaCartellaCustom
              ? "Stai usando una cartella personalizzata."
              : `Predefinita sul Desktop: ${CARTELLA_PDF_ROOT_NAME}.`}
          </p>
          <p className="mt-3 truncate rounded-lg border border-black/10 bg-brand-bg px-3 py-2 text-sm text-brand-navy/80">
            {cartellaBase || `Desktop\\${CARTELLA_PDF_ROOT_NAME}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onScegliCartella()}
              disabled={!desktop}
              className="rounded-xl bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Scegli cartella
            </button>
            {usaCartellaCustom && (
              <button
                type="button"
                onClick={() => void onUsaPredefinita()}
                className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-semibold text-brand-navy/70 hover:bg-brand-bg"
              >
                Usa cartella predefinita
              </button>
            )}
          </div>
          {cartelleCliente && (
            <p className="mt-3 text-xs text-brand-navy/50">
              Esempio con cliente &quot;Mario Rossi&quot;:{" "}
              <span className="font-mono">{cartellaBase}\Mario Rossi\</span>
            </p>
          )}
        </div>

        {!desktop && (
          <p className="mt-3 text-xs text-brand-navy/50">Disponibile nell'app desktop Tauri.</p>
        )}
      </div>

      <div className="mt-3 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-navy">Avvio con Windows</p>
            <p className="mt-1 text-sm text-brand-navy/60">Avvia PreventivoAI all'accensione del PC.</p>
          </div>
          <ToggleSwitch
            checked={autostart}
            onChange={(checked) => void onAutostartChange(checked)}
            disabled={!desktop || autostartLoading}
          />
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">Informazioni</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-brand-navy/60">Versione</dt>
            <dd className="font-medium text-brand-navy">{versione}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-brand-navy/60">Build</dt>
            <dd className="font-medium text-brand-navy">{build}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => void onControllaAggiornamenti()}
          disabled={checkingUpdate || installingUpdate}
          className="mt-4 rounded-xl border border-black/10 px-5 py-2.5 text-sm font-semibold text-brand-navy hover:bg-brand-bg disabled:opacity-50"
        >
          {checkingUpdate ? "Controllo in corso..." : "Controlla aggiornamenti"}
        </button>
        {updateResult?.update && !updateResult.aggiornato && (
          <button
            type="button"
            onClick={() => void onInstallaAggiornamento()}
            disabled={installingUpdate}
            className="mt-3 rounded-xl bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-teal/90 disabled:opacity-50"
          >
            {installingUpdate
              ? installProgress !== null
                ? `Installazione ${installProgress}%...`
                : "Installazione..."
              : `Installa versione ${updateResult.versioneDisponibile}`}
          </button>
        )}
        {updateResult?.note && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy/70">{updateResult.note}</p>
        )}
        {updateMsg && <p className="mt-2 text-sm text-brand-teal">{updateMsg}</p>}
      </div>

      <div className="mt-3 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">Documenti legali</p>
        <div className="mt-3 space-y-2">
          <a
            href={WEB_TERMINI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 text-sm text-brand-navy hover:bg-brand-bg"
          >
            <span>Termini di servizio</span>
            <span className="text-brand-navy/40">↗</span>
          </a>
          <a
            href={WEB_PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 text-sm text-brand-navy hover:bg-brand-bg"
          >
            <span>Privacy Policy</span>
            <span className="text-brand-navy/40">↗</span>
          </a>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">Dati locali</p>
        <p className="mt-2 text-sm text-brand-navy/60">
          Cancella la memoria delle tab (ultima pagina visitata) e le bozze di Nuovo preventivo.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-3 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Cancella dati locali
        </button>
      </div>

      {msg && <p className="mt-3 text-sm text-brand-teal">{msg}</p>}
    </PageContainer>
  );
}
