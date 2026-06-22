import { useMemo } from "react";
import {
  calcolaAccontoSaldoPiano,
  calcolaImportiRate,
  calcolaScadenzeRate,
  formatImportoEuro,
  labelScadenzaRata,
  giornoScadenzaValido,
  meseInizioValido,
  type RateAccontoTipo,
} from "preventivoai-shared";
import { GiornoScadenzaSelect, MeseInizioSelect } from "../pickers/DatePartPickers";
import ToggleSwitch from "../ToggleSwitch";

type PianoPagamentoTipo = "nessuno" | "acconto" | "rate" | "abbonamento";

const TIPI_PIANO: { key: PianoPagamentoTipo; label: string }[] = [
  { key: "nessuno", label: "Nessuno" },
  { key: "acconto", label: "Richiedi acconto" },
  { key: "rate", label: "Pagamento a rate" },
  { key: "abbonamento", label: "Abbonamento" },
];

function OptionToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`rounded-full px-3 py-1.5 text-sm ${
            value === opt.key
              ? "bg-brand-navy text-white"
              : "border border-black/10 bg-brand-bg text-brand-navy"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

type Props = {
  tipo: PianoPagamentoTipo;
  onChangeTipo: (tipo: PianoPagamentoTipo) => void;
  importoTotale: number;
  rateAccontoTipo: RateAccontoTipo;
  rateAccontoValore: string;
  rateNumero: string;
  rateGiornoScadenza: string;
  rateMeseInizio: string;
  rateVisibileNelPDF: boolean;
  onChangeRateAccontoTipo: (value: RateAccontoTipo) => void;
  onChangeRateAccontoValore: (value: string) => void;
  onChangeRateNumero: (value: string) => void;
  onChangeRateGiornoScadenza: (value: string) => void;
  onChangeRateMeseInizio: (value: string) => void;
  onChangeRateVisibileNelPDF: (value: boolean) => void;
  abImporto: string;
  abGiorno: string;
  abMeseInizio: string;
  abMensilita: string;
  abVisibileNelPDF: boolean;
  onChangeAbImporto: (value: string) => void;
  onChangeAbGiorno: (value: string) => void;
  onChangeAbMeseInizio: (value: string) => void;
  onChangeAbMensilita: (value: string) => void;
  onChangeAbVisibileNelPDF: (value: boolean) => void;
};

export default function BuilderPianoPagamentoCard({
  tipo,
  onChangeTipo,
  importoTotale,
  rateAccontoTipo,
  rateAccontoValore,
  rateNumero,
  rateGiornoScadenza,
  rateMeseInizio,
  rateVisibileNelPDF,
  onChangeRateAccontoTipo,
  onChangeRateAccontoValore,
  onChangeRateNumero,
  onChangeRateGiornoScadenza,
  onChangeRateMeseInizio,
  onChangeRateVisibileNelPDF,
  abImporto,
  abGiorno,
  abMeseInizio,
  abMensilita,
  abVisibileNelPDF,
  onChangeAbImporto,
  onChangeAbGiorno,
  onChangeAbMeseInizio,
  onChangeAbMensilita,
  onChangeAbVisibileNelPDF,
}: Props) {
  const num = parseInt(rateNumero, 10) || 0;
  const giornoRate = parseInt(rateGiornoScadenza, 10) || 0;
  const meseRate = parseInt(rateMeseInizio, 10) || 0;
  const importi =
    tipo === "rate" && num >= 2 && importoTotale > 0 ? calcolaImportiRate(importoTotale, num) : [];
  const importoRata = importi[0];
  const ultimaRata = importi.length > 0 ? importi[importi.length - 1] : null;
  const primaScadenzaRate =
    tipo === "rate" && num >= 2 && giornoScadenzaValido(rateGiornoScadenza) && meseInizioValido(rateMeseInizio)
      ? calcolaScadenzeRate(1, giornoRate, meseRate)[0]
      : null;

  const anteprimaAccontoSaldo = useMemo(() => {
    if (tipo !== "acconto" || !(importoTotale > 0)) return null;
    return calcolaAccontoSaldoPiano(importoTotale, rateAccontoTipo, rateAccontoValore);
  }, [tipo, importoTotale, rateAccontoTipo, rateAccontoValore]);

  const giornoAbNum = parseInt(abGiorno, 10) || 0;
  const meseAbNum = parseInt(abMeseInizio, 10) || 0;
  const primaScadenzaAb =
    tipo === "abbonamento" && giornoScadenzaValido(abGiorno) && meseInizioValido(abMeseInizio)
      ? calcolaScadenzeRate(1, giornoAbNum, meseAbNum)[0]
      : null;

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-brand-navy">Piano di pagamento</h3>
        <p className="mt-0.5 text-xs text-brand-navy/50">Configura rate, acconto o canone per questo cliente</p>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold tracking-wide text-brand-navy/50">TIPO PIANO</p>
        <OptionToggle options={TIPI_PIANO} value={tipo} onChange={onChangeTipo} />
      </div>

      {tipo === "acconto" ? (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-navy/50">IMPORTO TOTALE PREVENTIVO</p>
            <div className="mt-1 rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm font-semibold text-brand-navy">
              {importoTotale > 0 ? `€${formatImportoEuro(importoTotale, 2)}` : "—"}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-brand-navy/50">TIPO ACCONTO</p>
            <OptionToggle
              options={[
                { key: "fisso" as const, label: "Importo fisso (€)" },
                { key: "percentuale" as const, label: "Percentuale (%)" },
              ]}
              value={rateAccontoTipo}
              onChange={onChangeRateAccontoTipo}
            />
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-navy/50">
              {rateAccontoTipo === "fisso" ? "IMPORTO ACCONTO (€)" : "PERCENTUALE ACCONTO (%)"}
            </p>
            <input
              value={rateAccontoValore}
              onChange={(e) => onChangeRateAccontoValore(e.target.value)}
              placeholder={rateAccontoTipo === "fisso" ? "es. 500" : "es. 30"}
              inputMode={rateAccontoTipo === "fisso" ? "decimal" : "numeric"}
              className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
            />
          </div>

          <div className="rounded-xl bg-brand-bg px-3 py-2.5 text-sm text-brand-navy/70">
            {anteprimaAccontoSaldo ? (
              <>
                Acconto:{" "}
                <span className="font-semibold text-brand-navy">
                  €{formatImportoEuro(anteprimaAccontoSaldo.acconto, 2)}
                </span>
                {" · "}
                Saldo:{" "}
                <span className="font-semibold text-brand-navy">
                  €{formatImportoEuro(anteprimaAccontoSaldo.saldo, 2)}
                </span>
              </>
            ) : (
              <span className="text-brand-navy/45">
                {rateAccontoTipo === "fisso"
                  ? "Inserisci un acconto maggiore di zero e minore del totale."
                  : "Inserisci una percentuale tra 1 e 99."}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-brand-navy/50">GIORNO SCADENZA</p>
              <GiornoScadenzaSelect
                value={rateGiornoScadenza}
                onChange={onChangeRateGiornoScadenza}
                mese={rateMeseInizio}
                className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-brand-navy/50">MESE INIZIO PRIMA RATA</p>
              <MeseInizioSelect
                value={rateMeseInizio}
                onChange={onChangeRateMeseInizio}
                giornoCollegato={rateGiornoScadenza}
                onGiornoCollegatoChange={onChangeRateGiornoScadenza}
                className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-3">
            <div>
              <p className="text-sm font-medium text-brand-navy">Mostra nel PDF</p>
              <p className="text-xs text-brand-navy/50">Aggiunge il piano rate al documento</p>
            </div>
            <ToggleSwitch checked={rateVisibileNelPDF} onChange={onChangeRateVisibileNelPDF} />
          </div>
        </div>
      ) : null}

      {tipo === "rate" ? (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-navy/50">IMPORTO TOTALE PREVENTIVO</p>
            <div className="mt-1 rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm font-semibold text-brand-navy">
              {importoTotale > 0 ? `€${formatImportoEuro(importoTotale, 2)}` : "—"}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-navy/50">NUMERO DI RATE</p>
            <input
              value={rateNumero}
              onChange={(e) => onChangeRateNumero(e.target.value)}
              placeholder="es. 3"
              className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-brand-navy/50">GIORNO SCADENZA</p>
              <GiornoScadenzaSelect
                value={rateGiornoScadenza}
                onChange={onChangeRateGiornoScadenza}
                mese={rateMeseInizio}
                className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-brand-navy/50">MESE INIZIO PRIMA RATA</p>
              <MeseInizioSelect
                value={rateMeseInizio}
                onChange={onChangeRateMeseInizio}
                giornoCollegato={rateGiornoScadenza}
                onGiornoCollegatoChange={onChangeRateGiornoScadenza}
                className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
          </div>

          {importoRata != null ? (
            <div className="space-y-1 rounded-xl bg-brand-bg p-3 text-sm text-brand-navy">
              <p className="text-xs font-semibold text-brand-navy/60">Anteprima rate</p>
              <p>
                {num} rate da €{formatImportoEuro(importoRata, 2)}
              </p>
              {primaScadenzaRate ? (
                <p>
                  Prima rata: {labelScadenzaRata(primaScadenzaRate.mese, primaScadenzaRate.anno, primaScadenzaRate.giorno)}
                </p>
              ) : null}
              {ultimaRata != null && ultimaRata !== importoRata ? (
                <p>Ultima rata: €{formatImportoEuro(ultimaRata, 2)}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-3">
            <div>
              <p className="text-sm font-medium text-brand-navy">Mostra nel PDF</p>
              <p className="text-xs text-brand-navy/50">Aggiunge il piano rate al documento</p>
            </div>
            <ToggleSwitch checked={rateVisibileNelPDF} onChange={onChangeRateVisibileNelPDF} />
          </div>
        </div>
      ) : null}

      {tipo === "abbonamento" ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="min-h-[30px] text-xs font-semibold tracking-wide text-brand-navy/50">IMPORTO MENSILE (€)</p>
              <input
                value={abImporto}
                onChange={(e) => onChangeAbImporto(e.target.value)}
                placeholder="es. 400"
                className="w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
            <div>
              <p className="min-h-[30px] text-xs font-semibold tracking-wide text-brand-navy/50">GIORNO SCADENZA</p>
              <GiornoScadenzaSelect
                value={abGiorno}
                onChange={onChangeAbGiorno}
                mese={abMeseInizio}
                className="w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-navy/50">MESE INIZIO PRIMO CANONE</p>
            <MeseInizioSelect
              value={abMeseInizio}
              onChange={onChangeAbMeseInizio}
              giornoCollegato={abGiorno}
              onGiornoCollegatoChange={onChangeAbGiorno}
              className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
            />
          </div>

          {primaScadenzaAb ? (
            <p className="rounded-xl bg-brand-bg p-3 text-sm text-brand-navy">
              Primo canone: {labelScadenzaRata(primaScadenzaAb.mese, primaScadenzaAb.anno, primaScadenzaAb.giorno)}
            </p>
          ) : null}

          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-navy/50">N. MENSILITÀ (opzionale)</p>
            <input
              value={abMensilita}
              onChange={(e) => onChangeAbMensilita(e.target.value)}
              placeholder="es. 12 - lascia vuoto per canone aperto"
              className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-3">
            <div>
              <p className="text-sm font-medium text-brand-navy">Mostra nel PDF</p>
              <p className="text-xs text-brand-navy/50">Aggiunge il canone mensile al documento</p>
            </div>
            <ToggleSwitch checked={abVisibileNelPDF} onChange={onChangeAbVisibileNelPDF} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
