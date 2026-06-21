import { useState, type Dispatch, type SetStateAction } from "react";
import { calcolaTotaleTrasferte, type TrasfertaBuilder } from "../lib/builder";
import { formatImportoEuroVisuale } from "preventivoai-shared";
import ToggleSwitch from "./ToggleSwitch";
import { PLACEHOLDER } from "../lib/placeholders";

type Props = {
  trasferte: TrasfertaBuilder[];
  setTrasferte: Dispatch<SetStateAction<TrasfertaBuilder[]>>;
  mostraTrasferte: boolean;
  setMostraTrasferte: (value: boolean) => void;
};

export default function TrasferteCard({ trasferte, setTrasferte, mostraTrasferte, setMostraTrasferte }: Props) {
  const [nuoviKm, setNuoviKm] = useState("");
  const [nuovaSpesaNome, setNuovaSpesaNome] = useState("");
  const [nuovaSpesaImporto, setNuovaSpesaImporto] = useState("");

  function aggiungiKm() {
    const km = parseFloat(nuoviKm.replace(",", "."));
    if (!km || km <= 0) {
      window.alert("Inserisci i km");
      return;
    }
    const importo = (km * 0.25).toFixed(2);
    setTrasferte((ts) => [
      ...ts,
      { id: crypto.randomUUID(), tipo: "km", nome: "Rimborso km", importo, km: nuoviKm, esente: true },
    ]);
    setNuoviKm("");
  }

  function aggiungiSpesa() {
    if (!nuovaSpesaNome.trim() || !nuovaSpesaImporto) {
      window.alert("Inserisci nome e importo");
      return;
    }
    setTrasferte((ts) => [
      ...ts,
      {
        id: crypto.randomUUID(),
        tipo: "spesa",
        nome: nuovaSpesaNome.trim(),
        importo: nuovaSpesaImporto,
        esente: true,
      },
    ]);
    setNuovaSpesaNome("");
    setNuovaSpesaImporto("");
  }

  return (
    <div className="mt-8 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-xs font-semibold text-brand-navy">
            km
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-brand-teal">Trasferte e rimborsi</p>
            <p className="text-xs text-brand-navy/50">Km e spese vive - esenti o imponibili</p>
          </div>
        </div>
        <ToggleSwitch checked={mostraTrasferte} onChange={setMostraTrasferte} />
      </div>

      {mostraTrasferte && (
        <div className="mt-4 space-y-3">
          {trasferte.map((t) => (
            <div key={t.id} className="rounded-xl border border-black/5 bg-brand-bg p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-brand-navy">
                  {t.tipo === "km" ? `${t.km} km` : t.nome}
                </p>
                <button
                  type="button"
                  onClick={() => setTrasferte((ts) => ts.filter((x) => x.id !== t.id))}
                  className="text-brand-navy/40 hover:text-brand-navy"
                  aria-label="Rimuovi"
                >
                  ×
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-brand-navy/60">
                  €{formatImportoEuroVisuale(parseFloat(t.importo) || 0)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTrasferte((ts) => ts.map((x) => (x.id === t.id ? { ...x, esente: !x.esente } : x)))
                  }
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    t.esente
                      ? "border border-brand-teal/30 bg-brand-teal/10 text-brand-teal"
                      : "border border-amber-300 bg-amber-50 text-amber-700"
                  }`}
                >
                  {t.esente ? "Esente" : "Imponibile"}
                </button>
              </div>
            </div>
          ))}

          <div className="border-t border-black/5 pt-3">
            <p className="text-xs font-semibold tracking-wide text-brand-navy/40">RIMBORSO KM</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                value={nuoviKm}
                onChange={(e) => setNuoviKm(e.target.value)}
                placeholder={PLACEHOLDER.kmRimborso}
                className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
              />
              <span className="text-xs text-brand-navy/40">x €0.25</span>
              <button
                type="button"
                onClick={aggiungiKm}
                className="rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white"
              >
                + Aggiungi
              </button>
            </div>
            <p className="mt-1 text-xs text-brand-navy/40">Tariffa ACI €0.25/km - Default: esente</p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-navy/40">SPESA VIVA</p>
            <div className="mt-2 flex gap-2">
              <input
                value={nuovaSpesaNome}
                onChange={(e) => setNuovaSpesaNome(e.target.value)}
                placeholder={PLACEHOLDER.spesaVivaNome}
                className="min-w-0 flex-[2] rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
              />
              <input
                value={nuovaSpesaImporto}
                onChange={(e) => setNuovaSpesaImporto(e.target.value)}
                placeholder={PLACEHOLDER.importoEuro}
                className="w-24 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
              />
            </div>
            <button
              type="button"
              onClick={aggiungiSpesa}
              className="mt-2 w-full rounded-lg border border-black/10 bg-brand-bg py-2 text-sm font-medium text-brand-teal"
            >
              + Aggiungi spesa
            </button>
          </div>

          {trasferte.length > 0 && (
            <div className="flex items-center justify-between border-t border-black/5 pt-3">
              <span className="text-sm text-brand-navy/60">Totale trasferte</span>
              <span className="text-sm font-bold text-brand-navy">
                €{formatImportoEuroVisuale(calcolaTotaleTrasferte(trasferte))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
