import { formatImportoEuroVisuale, parseImportoEuro } from "preventivoai-shared";
import ToggleSwitch from "./ToggleSwitch";

type ScontoTipo = "percentuale" | "fisso";

type Props = {
  scontoAttivo: boolean;
  scontoTipo: ScontoTipo;
  scontoValore: string;
  onToggle: () => void;
  onChangeTipo: (tipo: ScontoTipo) => void;
  onChangeValore: (v: string) => void;
  totaleBase: number;
};

function parseValoreSconto(raw: string): number {
  return parseImportoEuro(raw) ?? 0;
}

function calcolaRisparmio(totaleBase: number, tipo: ScontoTipo, valore: number): number {
  if (valore <= 0) return 0;
  return tipo === "percentuale" ? totaleBase * (valore / 100) : valore;
}

export default function ScontoCard({
  scontoAttivo,
  scontoTipo,
  scontoValore,
  onToggle,
  onChangeTipo,
  onChangeValore,
  totaleBase,
}: Props) {
  const valoreNum = parseValoreSconto(scontoValore);
  const risparmio = scontoAttivo ? calcolaRisparmio(totaleBase, scontoTipo, valoreNum) : 0;

  return (
    <div className="mt-8 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-sm font-semibold text-brand-navy">
            −
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-brand-teal">Sconto</h3>
            <p className="mt-0.5 text-xs text-brand-navy/50">Applica uno sconto sul totale del preventivo</p>
          </div>
        </div>
        <ToggleSwitch checked={scontoAttivo} onChange={() => onToggle()} />
      </div>

      {scontoAttivo && (
        <div className="mt-4 space-y-3">
          <div className="flex rounded-[10px] border border-black/10 bg-brand-bg p-0.5">
            <button
              type="button"
              onClick={() => onChangeTipo("percentuale")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                scontoTipo === "percentuale" ? "bg-brand-navy text-white" : "text-brand-navy/40"
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => onChangeTipo("fisso")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                scontoTipo === "fisso" ? "bg-brand-navy text-white" : "text-brand-navy/40"
              }`}
            >
              €
            </button>
          </div>

          <input
            type="text"
            inputMode="decimal"
            value={scontoValore}
            onChange={(e) => onChangeValore(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-teal"
          />

          {valoreNum > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-navy/60">Risparmio:</span>
              <span className="text-sm font-bold text-brand-teal">-€{formatImportoEuroVisuale(risparmio)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
