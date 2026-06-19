import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import ListinoSmartPanel from "../components/ListinoSmartPanel";
import OnboardingNavBar from "../components/onboarding/OnboardingNavBar";
import OnboardingStepper from "../components/onboarding/OnboardingStepper";
import PreventivoPdfPreview from "../components/PreventivoPdfPreview";
import { TEMPLATES } from "../lib/constants";
import { aggiornaLogoCacheInHtml } from "../lib/pdf";
import type { ServizioDraft } from "../lib/listinoSmart";
import {
  ONBOARDING_CATEGORIE,
  completaOnboarding,
  generaPreviewOnboarding,
  hasCompletedProfile,
} from "../lib/onboarding";

const STEP_LABELS = ["Benvenuto", "Azienda", "Servizi", "Template"];

const CHIP_BASE =
  "rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors";
const CHIP_ACTIVE = "border-brand-teal bg-brand-teal/10 text-brand-teal";
const CHIP_IDLE = "border-black/10 text-brand-navy/70 hover:border-brand-teal/40 hover:bg-brand-bg";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [stepMassimo, setStepMassimo] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState("");

  const [nomeAzienda, setNomeAzienda] = useState("");
  const [citta, setCitta] = useState("");
  const [categoria, setCategoria] = useState("");
  const [firmaNome, setFirmaNome] = useState("");
  const [servizi, setServizi] = useState<ServizioDraft[]>([]);
  const [templateScelto, setTemplateScelto] = useState("pulito");
  const [htmlPreview, setHtmlPreview] = useState("");
  const [caricandoPreview, setCaricandoPreview] = useState(false);
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void hasCompletedProfile().then((ok) => {
      if (ok) navigate("/", { replace: true });
    });
  }, [navigate]);

  function puoAndareA(target: number) {
    if (target <= 1) return true;
    return Boolean(nomeAzienda.trim() && categoria);
  }

  function vaiAlloStep(target: number) {
    if (target < 0 || target > 3) return;
    if (!puoAndareA(target)) return;
    setStep(target);
    setStepMassimo((s) => Math.max(s, target));
    if (target === 3) void aggiornaPreview(templateScelto);
  }

  async function aggiornaPreview(template: string) {
    setCaricandoPreview(true);
    try {
      const html = await generaPreviewOnboarding(template, categoria, firmaNome);
      setHtmlPreview(aggiornaLogoCacheInHtml(html));
    } catch {
      setHtmlPreview("");
    } finally {
      setCaricandoPreview(false);
    }
  }

  function handleTemplateChange(id: string) {
    setTemplateScelto(id);
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    previewTimeout.current = setTimeout(() => void aggiornaPreview(id), 300);
  }

  async function completa() {
    setSaving(true);
    setErrore("");
    try {
      const { error } = await completaOnboarding({
        nomeAzienda,
        citta,
        categoria,
        templateScelto,
        firmaNome,
        servizi,
      });
      if (error) throw new Error(error.message);
      navigate("/", { replace: true });
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore nel salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  if (step === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-brand-navy px-6 text-white">
        <div className="w-full max-w-lg text-center">
          <p className="text-5xl">🎉</p>
          <h1 className="mt-6 text-3xl font-bold leading-tight">Benvenuto in PreventivoAI</h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            In pochi minuti configuro il tuo profilo.
            <br />
            Poi generi preventivi professionali in pochi secondi.
          </p>
          <ul className="mt-8 space-y-3 text-left">
            {[
              { icon: "🎙", text: "Racconta il lavoro a voce o con il builder" },
              { icon: "🤖", text: "L'AI compone il preventivo per te" },
              { icon: "📄", text: "PDF professionale pronto da inviare" },
            ].map((item) => (
              <li
                key={item.text}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-white/85">{item.text}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => vaiAlloStep(1)}
            className="mt-10 w-full rounded-xl bg-brand-teal py-3.5 text-sm font-semibold text-white hover:bg-brand-teal/90"
          >
            Inizia la configurazione →
          </button>
        </div>
      </div>
    );
  }

  const navProps =
    step === 1
      ? {
          showBack: false as const,
          onNext: () => vaiAlloStep(2),
          nextLabel: "Avanti →",
          nextDisabled: !nomeAzienda.trim() || !categoria,
        }
      : step === 2
        ? {
            showBack: true as const,
            onBack: () => setStep(1),
            onNext: () => vaiAlloStep(3),
            nextLabel: servizi.length > 0 ? `Avanti — ${servizi.length} servizi →` : "Avanti →",
          }
        : {
            showBack: true as const,
            onBack: () => setStep(2),
            onNext: () => void completa(),
            nextLabel: "Completa configurazione →",
            loading: saving,
          };

  return (
    <div className="theme-surface flex h-screen flex-col bg-brand-bg">
      <header className="shrink-0 border-b border-black/5 bg-brand-navy px-6 py-5">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-sm font-semibold text-white">Configurazione iniziale</p>
          <OnboardingStepper
            stepAttuale={step + 1}
            stepMassimo={stepMassimo}
            labels={STEP_LABELS}
            onNavigate={vaiAlloStep}
            canNavigate={(s) => puoAndareA(s)}
          />
        </div>
      </header>

      <main
        className={`flex min-h-0 flex-1 flex-col ${step >= 2 ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        <div
          className={`mx-auto w-full max-w-6xl px-6 py-6 pb-28 ${
            step >= 2 ? "flex min-h-0 flex-1 flex-col" : ""
          }`}
        >
          {step === 1 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-brand-navy">Chi sei?</h2>
              <p className="mt-1 text-sm text-brand-navy/60">
                Questi dati appariranno nei tuoi preventivi PDF.
              </p>

              <div className="mt-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-brand-navy/70">
                    Nome o ragione sociale *
                  </label>
                  <input
                    value={nomeAzienda}
                    onChange={(e) => setNomeAzienda(e.target.value)}
                    placeholder="es. Mario Rossi, Studio Rossi"
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-brand-navy/70">Città</label>
                  <input
                    value={citta}
                    onChange={(e) => setCitta(e.target.value)}
                    placeholder="es. Roma"
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-navy/70">Che lavoro fai? *</label>
                  <div className="flex flex-wrap gap-2">
                    {ONBOARDING_CATEGORIE.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoria(cat)}
                        className={`${CHIP_BASE} capitalize ${
                          categoria === cat ? CHIP_ACTIVE : CHIP_IDLE
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-brand-navy/70">Firma (opzionale)</label>
                  <p className="text-xs text-brand-navy/50">Apparirà in fondo ai preventivi PDF.</p>
                  <input
                    value={firmaNome}
                    onChange={(e) => setFirmaNome(e.target.value)}
                    placeholder="es. Mario Rossi"
                    className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
                  />
                  {firmaNome && (
                    <p className="pt-1 text-center text-lg italic text-brand-navy/80">{firmaNome}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
              <div className="shrink-0">
                <h2 className="text-xl font-semibold text-brand-navy">I tuoi servizi</h2>
                <p className="mt-1 text-sm text-brand-navy/60">
                  Claude userà questi prezzi per ogni preventivo. Puoi saltare e aggiungerli dopo.
                </p>
                {servizi.length === 0 && (
                  <p className="mt-1.5 text-xs text-brand-navy/45">
                    Potrai aggiungere o modificare i servizi in seguito dalle Impostazioni.
                  </p>
                )}
              </div>

              <div className="mt-4 min-h-0 flex-1">
                <ListinoSmartPanel
                  categoria={categoria}
                  servizi={servizi}
                  onServiziChange={setServizi}
                  segmentedTabs
                  fillHeight
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
              <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
                <div className="shrink-0">
                  <h2 className="text-xl font-semibold text-brand-navy">Scegli il tuo stile</h2>
                  <p className="mt-1 text-sm text-brand-navy/60">Il template preferito per i PDF.</p>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTemplateChange(t.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        templateScelto === t.id ? CHIP_ACTIVE : CHIP_IDLE
                      }`}
                    >
                      <span className="text-lg">{t.emoji}</span>
                      <span className="text-sm font-medium">{t.nome}</span>
                    </button>
                  ))}
                </div>

                {errore && <p className="mt-3 shrink-0 text-sm text-red-600">{errore}</p>}
              </div>

              <PreventivoPdfPreview
                html={htmlPreview}
                loading={caricandoPreview}
                fillHeight
                className="h-full min-h-0"
              />
            </div>
          )}
        </div>
      </main>

      <OnboardingNavBar {...navProps} />
    </div>
  );
}
