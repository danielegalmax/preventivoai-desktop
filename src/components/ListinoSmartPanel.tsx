import { useState } from "react";
import { formatImporto } from "../lib/format";
import {
  avviaRegistrazioneVocale,
  fermaRegistrazioneVocale,
  fileImmagineToBase64,
  scegliFileImmagine,
} from "../lib/listinoMedia";
import {
  elaboraServiziDaImmagine,
  elaboraServiziDaTesto,
  elaboraServiziDaVocale,
  type ServizioDraft,
} from "../lib/listinoSmart";
import { ESEMPI_LISTINO, UNITA_SERVIZIO } from "../lib/onboardingConstants";
import { PLACEHOLDER } from "../lib/placeholders";
import { serviziDaTesto } from "../lib/serviziDaTesto";

type TabKey = "testo" | "foto" | "vocale" | "manuale";

type Props = {
  categoria?: string;
  servizi: ServizioDraft[];
  onServiziChange: (servizi: ServizioDraft[]) => void;
  onImportServizi?: (servizi: ServizioDraft[]) => void | Promise<void>;
  showSkipNote?: boolean;
  segmentedTabs?: boolean;
  fillHeight?: boolean;
};

const TAB_LABELS: { id: TabKey; label: string }[] = [
  { id: "testo", label: "Incolla testo" },
  { id: "foto", label: "Foto" },
  { id: "vocale", label: "Vocale" },
  { id: "manuale", label: "Manuale" },
];

const NUOVO_VUOTO = { nome: "", descrizione: "", costo: "", unita: "cad" };

export default function ListinoSmartPanel({
  categoria,
  servizi,
  onServiziChange,
  onImportServizi,
  showSkipNote,
  segmentedTabs,
  fillHeight,
}: Props) {
  const [tab, setTab] = useState<TabKey>("testo");
  const [testoServizi, setTestoServizi] = useState("");
  const [elaborando, setElaborando] = useState(false);
  const [elaborandoMedia, setElaborandoMedia] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [errore, setErrore] = useState("");
  const [nuovoServizio, setNuovoServizio] = useState({ ...NUOVO_VUOTO });

  async function unisciServizi(estratti: ServizioDraft[]) {
    if (estratti.length === 0) {
      setErrore("Nessun servizio trovato. Prova con un input più chiaro.");
      return;
    }
    if (onImportServizi) {
      await onImportServizi(estratti);
      setTab("manuale");
      setErrore("");
      return;
    }
    onServiziChange([...servizi, ...estratti]);
    setTab("manuale");
    setErrore("");
  }

  async function elaboraTestoAI() {
    if (!testoServizi.trim()) return;
    setElaborando(true);
    setErrore("");
    try {
      const estratti = await elaboraServiziDaTesto(testoServizi);
      unisciServizi(estratti);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Impossibile elaborare i servizi.");
    } finally {
      setElaborando(false);
    }
  }

  function elaboraTestoLocale() {
    if (!testoServizi.trim()) return;
    unisciServizi(serviziDaTesto(testoServizi));
  }

  async function elaboraFoto() {
    setElaborandoMedia(true);
    setErrore("");
    try {
      const file = await scegliFileImmagine();
      if (!file) return;
      const { base64, mimeType } = await fileImmagineToBase64(file);
      const estratti = await elaboraServiziDaImmagine(base64, mimeType);
      unisciServizi(estratti);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Impossibile elaborare la foto.");
    } finally {
      setElaborandoMedia(false);
    }
  }

  async function avviaRegistrazione() {
    setErrore("");
    try {
      await avviaRegistrazioneVocale();
      setRegistrando(true);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Microfono non disponibile.");
    }
  }

  async function fermaEdElaboraVocale() {
    if (!registrando) return;
    setElaborandoMedia(true);
    setErrore("");
    try {
      const audio = await fermaRegistrazioneVocale();
      setRegistrando(false);
      const estratti = await elaboraServiziDaVocale(audio);
      await unisciServizi(estratti);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Impossibile elaborare il vocale.");
      setRegistrando(false);
    } finally {
      setElaborandoMedia(false);
    }
  }

  function rimuoviServizio(index: number) {
    onServiziChange(servizi.filter((_, i) => i !== index));
  }

  function aggiungiManuale() {
    if (!nuovoServizio.nome.trim()) return;
    const item = {
      ...nuovoServizio,
      nome: nuovoServizio.nome.trim(),
      descrizione: nuovoServizio.descrizione.trim(),
    };
    if (onImportServizi) {
      void onImportServizi([item]);
      setNuovoServizio({ ...NUOVO_VUOTO });
      return;
    }
    onServiziChange([...servizi, item]);
    setNuovoServizio({ ...NUOVO_VUOTO });
  }

  const placeholder =
    categoria && ESEMPI_LISTINO[categoria]
      ? `es.\n${ESEMPI_LISTINO[categoria]}`
      : "es.\nServizio 1: 100€\nServizio 2: 200€/ora";

  const tabBtnClass = (active: boolean) =>
    segmentedTabs
      ? `flex-1 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors ${
          active ? "bg-brand-navy text-white shadow-sm" : "text-brand-navy/60 hover:text-brand-navy"
        }`
      : `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
          active
            ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
            : "border-black/10 text-brand-navy/70 hover:border-brand-teal/40"
        }`;

  return (
    <div className={fillHeight ? "flex h-full min-h-0 flex-col gap-4" : "space-y-4"}>
      <div
        className={
          segmentedTabs
            ? "flex shrink-0 rounded-xl border border-black/10 bg-brand-bg p-1"
            : "flex shrink-0 flex-wrap gap-2"
        }
      >
        {TAB_LABELS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={tabBtnClass(tab === t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={fillHeight ? "min-h-0 flex-1 overflow-y-auto" : undefined}>
      {tab === "testo" && (
        <div className={fillHeight ? "flex h-full min-h-0 flex-col gap-3" : "space-y-3"}>
          <p className="shrink-0 text-sm text-brand-navy/60">
            Incolla o scrivi il tuo listino — anche disordinato. L&apos;AI lo struttura automaticamente.
          </p>
          <textarea
            value={testoServizi}
            onChange={(e) => setTestoServizi(e.target.value)}
            rows={fillHeight ? undefined : 8}
            placeholder={placeholder}
            className={`w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal ${
              fillHeight ? "min-h-[140px] flex-1 resize-none" : ""
            }`}
          />
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              disabled={!testoServizi.trim() || elaborando}
              onClick={() => void elaboraTestoAI()}
              className="rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-teal/90 disabled:opacity-50"
            >
              {elaborando ? "Elaborazione..." : "Struttura con AI"}
            </button>
            <button
              type="button"
              disabled={!testoServizi.trim() || elaborando}
              onClick={elaboraTestoLocale}
              className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-brand-navy/70 hover:bg-brand-bg disabled:opacity-50"
            >
              Importa senza AI
            </button>
          </div>
        </div>
      )}

      {tab === "foto" && (
        <div className={fillHeight ? "flex h-full min-h-0 flex-col gap-3" : "space-y-3"}>
          <p className="shrink-0 text-sm text-brand-navy/60">
            Carica una foto del tuo listino — anche scritto a mano. L&apos;AI estrae servizi e prezzi.
          </p>
          <button
            type="button"
            disabled={elaborandoMedia}
            onClick={() => void elaboraFoto()}
            className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-black/15 bg-brand-bg px-4 text-sm text-brand-navy/60 hover:border-brand-teal/40 ${
              fillHeight ? "min-h-[160px] flex-1 py-8" : "py-10"
            }`}
          >
            {elaborandoMedia ? "Elaborazione foto..." : "📷 Scegli immagine dal computer"}
          </button>
        </div>
      )}

      {tab === "vocale" && (
        <div
          className={`space-y-4 rounded-xl border border-black/10 bg-brand-bg/40 p-5 ${
            fillHeight ? "flex h-full min-h-0 flex-col justify-center" : ""
          }`}
        >
          <p className="text-sm text-brand-navy/60">
            Descrivi i tuoi servizi a voce — nomi, prezzi e unità. Premi Stop quando hai finito: trascrizione e
            strutturazione automatica.
          </p>

          <div className="flex items-center justify-center py-2">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
                registrando ? "bg-red-500/15 text-red-600" : "bg-brand-navy/10 text-brand-navy"
              }`}
            >
              {registrando ? "🔴" : "🎙"}
            </div>
          </div>

          <p className="text-center text-sm font-medium text-brand-navy">
            {elaborandoMedia
              ? "Elaborazione in corso..."
              : registrando
                ? "Registrazione attiva"
                : "Microfono pronto"}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              disabled={registrando || elaborandoMedia}
              onClick={() => void avviaRegistrazione()}
              className="rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Avvia registrazione
            </button>
            <button
              type="button"
              disabled={!registrando || elaborandoMedia}
              onClick={() => void fermaEdElaboraVocale()}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop ed elabora
            </button>
          </div>
        </div>
      )}

      {tab === "manuale" && (
        <div className="space-y-4">
          {servizi.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-brand-navy/50 uppercase">
                Servizi aggiunti ({servizi.length})
              </p>
              <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
                {servizi.map((s, i) => (
                  <li key={`${s.nome}-${i}`} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-navy">{s.nome}</p>
                      {s.descrizione && (
                        <p className="mt-0.5 text-sm text-brand-navy/60">{s.descrizione}</p>
                      )}
                      {s.costo && (
                        <p className="mt-1 text-xs font-medium text-brand-teal">
                          {formatImporto(parseFloat(s.costo.replace(",", ".")) || 0)} / {s.unita}
                        </p>
                      )}
                    </div>
                    {!onImportServizi && (
                      <button
                        type="button"
                        onClick={() => rimuoviServizio(i)}
                        className="shrink-0 rounded-lg px-2 py-1 text-sm text-brand-navy/40 hover:bg-red-50 hover:text-red-600"
                        aria-label="Rimuovi servizio"
                      >
                        Rimuovi
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-brand-navy">Aggiungi servizio</p>
            <p className="mt-1 text-xs text-brand-navy/50">
              Il nome è obbligatorio. La descrizione è opzionale e compare nel listino.
            </p>

            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-brand-navy/70">Nome servizio *</label>
                <input
                  value={nuovoServizio.nome}
                  onChange={(e) => setNuovoServizio((s) => ({ ...s, nome: e.target.value }))}
                  placeholder={PLACEHOLDER.nomeServizio}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-brand-navy/70">Descrizione</label>
                <textarea
                  value={nuovoServizio.descrizione}
                  onChange={(e) => setNuovoServizio((s) => ({ ...s, descrizione: e.target.value }))}
                  rows={2}
                  placeholder={PLACEHOLDER.descrizioneServizio}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-brand-navy/70">Costo (€)</label>
                  <input
                    value={nuovoServizio.costo}
                    onChange={(e) => setNuovoServizio((s) => ({ ...s, costo: e.target.value }))}
                    placeholder={PLACEHOLDER.costoServizio}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-brand-navy/70">Unità di misura</label>
                  <select
                    value={nuovoServizio.unita}
                    onChange={(e) => setNuovoServizio((s) => ({ ...s, unita: e.target.value }))}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                  >
                    {UNITA_SERVIZIO.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={!nuovoServizio.nome.trim()}
                onClick={aggiungiManuale}
                className="w-full rounded-xl bg-brand-teal py-2.5 text-sm font-semibold text-white hover:bg-brand-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Aggiungi servizio
              </button>
            </div>
          </div>
        </div>
      )}

      {errore && <p className="text-sm text-red-600">{errore}</p>}

      {showSkipNote && servizi.length === 0 && !fillHeight && (
        <p className="text-xs text-brand-navy/50">Potrai aggiungere o modificare i servizi in seguito dalle Impostazioni.</p>
      )}
      </div>
    </div>
  );
}
