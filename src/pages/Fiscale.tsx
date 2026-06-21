import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  caricaProfiloFiscale,
  DEFAULT_PROFILO_FISCALE,
  salvaProfiloFiscale,
  type ProfiloFiscaleForm,
} from "../lib/fiscale";
import PageContainer from "../components/PageContainer";
import ToggleSwitch from "../components/ToggleSwitch";

type Regime = ProfiloFiscaleForm["regime"];

function FiscaleNumericField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex-1 text-sm text-brand-navy/80">{label}</span>
      <div className="flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded-lg border border-black/10 bg-brand-bg px-2 py-1.5 text-center text-sm font-semibold text-brand-navy outline-none focus:border-brand-teal"
        />
        <span className="w-5 text-sm text-brand-navy/40">{unit}</span>
      </div>
    </div>
  );
}

export default function Fiscale() {
  const [profilo, setProfilo] = useState<ProfiloFiscaleForm>(DEFAULT_PROFILO_FISCALE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [featureAttiva, setFeatureAttiva] = useState(false);
  const [modificheNonSalvate, setModificheNonSalvate] = useState(false);
  const [messaggio, setMessaggio] = useState("");

  useEffect(() => {
    if (!modificheNonSalvate) return;
    const avviso = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", avviso);
    return () => window.removeEventListener("beforeunload", avviso);
  }, [modificheNonSalvate]);

  useEffect(() => {
    caricaProfiloFiscale().then((data) => {
      if (data) {
        setProfilo(data.profilo);
        setFeatureAttiva(data.featureAttiva);
      }
      setLoading(false);
    });
  }, []);

  function set<K extends keyof ProfiloFiscaleForm>(key: K, val: ProfiloFiscaleForm[K]) {
    setProfilo((p) => ({ ...p, [key]: val }));
    setModificheNonSalvate(true);
    setMessaggio("");
  }

  async function salva() {
    setSaving(true);
    setMessaggio("");
    const { id, error } = await salvaProfiloFiscale(profilo, featureAttiva);
    setSaving(false);
    if (error) {
      setMessaggio(error);
      return;
    }
    if (id) setProfilo((p) => ({ ...p, id }));
    setModificheNonSalvate(false);
    setMessaggio("Profilo fiscale aggiornato.");
  }

  if (loading) {
    return (
      <PageContainer>
        <p className="text-brand-navy/60">Caricamento...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <Link
          to="/impostazioni"
          onClick={(e) => {
            if (modificheNonSalvate && !window.confirm("Hai modifiche non salvate. Vuoi uscire senza salvare?")) {
              e.preventDefault();
            }
          }}
          className="text-brand-navy/50 hover:text-brand-navy"
        >
          ←
        </Link>
        <h1 className="text-2xl font-semibold text-brand-navy">Regime fiscale</h1>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-brand-navy">Analisi fiscale</p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-brand-navy/80">Abilita analisi fiscale</p>
              <p className="text-xs text-brand-navy/50">Mostra il calcolo del netto nel builder preventivo</p>
            </div>
            <ToggleSwitch
              checked={featureAttiva}
              onChange={(value) => {
                setFeatureAttiva(value);
                setModificheNonSalvate(true);
                setMessaggio("");
              }}
            />
          </div>
        </div>

        {featureAttiva && (
          <>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-brand-navy">Il tuo regime fiscale</p>
              <p className="mt-1 text-xs text-brand-navy/50">Usato per calcolare il netto nel builder preventivo</p>
              <div className="mt-4 space-y-2">
                {(
                  [
                    { key: "forfettario" as Regime, nome: "Forfettario", sub: "Imposta sostitutiva + INPS" },
                    { key: "ordinario" as Regime, nome: "Ordinario", sub: "IVA + IRPEF + INPS" },
                    { key: "occasionale" as Regime, nome: "Occasionale", sub: "Ritenuta d'acconto" },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => set("regime", r.key)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      profilo.regime === r.key
                        ? "border-brand-teal bg-brand-teal/5"
                        : "border-black/10 bg-brand-bg hover:border-black/20"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">{r.nome}</p>
                      <p className="text-xs text-brand-navy/50">{r.sub}</p>
                    </div>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                        profilo.regime === r.key
                          ? "border-brand-teal bg-brand-teal text-white"
                          : "border-black/10 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {profilo.regime === "forfettario" && (
              <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-brand-navy">Parametri forfettario</p>
                <FiscaleNumericField label="Coefficiente di redditività" value={profilo.coefficiente_redditivita} unit="%" onChange={(v) => set("coefficiente_redditivita", v)} />
                <FiscaleNumericField label="Imposta sostitutiva" value={profilo.aliquota_sostitutiva} unit="%" onChange={(v) => set("aliquota_sostitutiva", v)} />
                <p className="pt-1 text-xs font-semibold tracking-wide text-brand-navy/40">TIPO INPS</p>
                <div className="flex rounded-lg border border-black/10 bg-brand-bg p-1">
                  {[
                    { key: "gestione_separata", label: "Gestione separata" },
                    { key: "artigiani", label: "Artigiani/Comm." },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => set("inps_tipo", t.key)}
                      className={`flex-1 rounded-md px-2 py-2 text-xs font-medium ${
                        profilo.inps_tipo === t.key ? "bg-brand-navy text-white" : "text-brand-navy/50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <FiscaleNumericField label="Contributi INPS" value={profilo.inps_percentuale} unit="%" onChange={(v) => set("inps_percentuale", v)} />
                <div className="flex items-center justify-between gap-4 py-1">
                  <div>
                    <p className="text-sm text-brand-navy/80">Riduzione contributiva</p>
                    <p className="text-xs text-brand-navy/50">Agevolazione primi 3 anni (-35%)</p>
                  </div>
                  <ToggleSwitch
                    checked={profilo.riduzione_contributiva}
                    onChange={(value) => set("riduzione_contributiva", value)}
                  />
                </div>
                {profilo.riduzione_contributiva && (
                  <FiscaleNumericField label="Riduzione contributiva" value={profilo.riduzione_percentuale} unit="%" onChange={(v) => set("riduzione_percentuale", v)} />
                )}
                <div className="flex items-center justify-between gap-4 py-1">
                  <div>
                    <p className="text-sm text-brand-navy/80">Rivalsa INPS in fattura</p>
                    <p className="text-xs text-brand-navy/50">Aggiunge % al totale fattura</p>
                  </div>
                  <ToggleSwitch
                    checked={profilo.rivalsa_inps}
                    onChange={(value) => set("rivalsa_inps", value)}
                  />
                </div>
                {profilo.rivalsa_inps && (
                  <FiscaleNumericField label="Rivalsa INPS" value={profilo.rivalsa_percentuale} unit="%" onChange={(v) => set("rivalsa_percentuale", v)} />
                )}
                <FiscaleNumericField label="Soglia massima fatturato" value={profilo.soglia_fatturato} unit="€" onChange={(v) => set("soglia_fatturato", v)} />
              </div>
            )}

            {profilo.regime === "ordinario" && (
              <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-brand-navy">Parametri ordinario</p>
                <FiscaleNumericField label="Aliquota IVA" value={profilo.aliquota_iva} unit="%" onChange={(v) => set("aliquota_iva", v)} />
                <FiscaleNumericField label="Costi deducibili stimati" value={profilo.costi_deducibili_percentuale} unit="%" onChange={(v) => set("costi_deducibili_percentuale", v)} />
                <FiscaleNumericField label="INPS gestione separata" value={profilo.inps_percentuale} unit="%" onChange={(v) => set("inps_percentuale", v)} />
                <div className="flex items-center justify-between gap-4 py-1">
                  <div>
                    <p className="text-sm text-brand-navy/80">Rivalsa INPS in fattura</p>
                    <p className="text-xs text-brand-navy/50">4% aggiunto al totale fattura</p>
                  </div>
                  <ToggleSwitch
                    checked={profilo.rivalsa_inps}
                    onChange={(value) => set("rivalsa_inps", value)}
                  />
                </div>
                {profilo.rivalsa_inps && (
                  <FiscaleNumericField label="Rivalsa INPS" value={profilo.rivalsa_percentuale} unit="%" onChange={(v) => set("rivalsa_percentuale", v)} />
                )}
                <p className="text-xs italic text-brand-navy/60">
                  L'IRPEF viene calcolata automaticamente a scaglioni sul reddito imponibile
                </p>
              </div>
            )}

            {profilo.regime === "occasionale" && (
              <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-brand-navy">Parametri collaborazione occasionale</p>
                <FiscaleNumericField label="Ritenuta d'acconto" value={profilo.ritenuta_acconto} unit="%" onChange={(v) => set("ritenuta_acconto", v)} />
                <FiscaleNumericField label="Soglia esenzione contributi" value={profilo.soglia_occasionale} unit="€" onChange={(v) => set("soglia_occasionale", v)} />
              </div>
            )}
          </>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-relaxed text-amber-900">
            I calcoli sono indicativi e a scopo informativo. Consulta sempre il tuo commercialista per decisioni fiscali.
          </p>
        </div>

        {messaggio && (
          <p className={`text-sm ${messaggio === "Profilo fiscale aggiornato." ? "text-brand-teal" : "text-red-500"}`}>
            {messaggio}
          </p>
        )}

        <button
          type="button"
          onClick={salva}
          disabled={saving}
          className="w-full rounded-xl bg-brand-navy px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Salvataggio..." : "Salva regime fiscale"}
        </button>
      </div>
    </PageContainer>
  );
}
