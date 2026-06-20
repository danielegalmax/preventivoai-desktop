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
  type RateModalitaPiano,
} from "preventivoai-shared";
import { GiornoScadenzaSelect, MeseInizioSelect } from "./pickers/DatePartPickers";
import ToggleSwitch from "./ToggleSwitch";

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
  attivo: boolean;
  modalita: RateModalitaPiano;
  accontoTipo: RateAccontoTipo;
  accontoValore: string;
  numeroRate: string;
  giornoScadenza: string;
  meseInizio: string;
  visibileNelPDF: boolean;
  importoTotale: number;
  onChangeAttivo: (value: boolean) => void;
  onChangeModalita: (value: RateModalitaPiano) => void;
  onChangeAccontoTipo: (value: RateAccontoTipo) => void;
  onChangeAccontoValore: (value: string) => void;
  onChangeNumeroRate: (value: string) => void;
  onChangeGiornoScadenza: (value: string) => void;
  onChangeMeseInizio: (value: string) => void;
  onChangeVisibileNelPDF: (value: boolean) => void;
};

export default function BuilderPagamentoRateCard({
  attivo,
  modalita,
  accontoTipo,
  accontoValore,
  numeroRate,
  giornoScadenza,
  meseInizio,
  visibileNelPDF,
  importoTotale,
  onChangeAttivo,
  onChangeModalita,
  onChangeAccontoTipo,
  onChangeAccontoValore,
  onChangeNumeroRate,
  onChangeGiornoScadenza,
  onChangeMeseInizio,
  onChangeVisibileNelPDF,
}: Props) {
  const num = parseInt(numeroRate, 10) || 0;
  const giorno = parseInt(giornoScadenza, 10) || 0;
  const mese = parseInt(meseInizio, 10) || 0;
  const importi = modalita === "rate_uguali" && num >= 2 && importoTotale > 0
    ? calcolaImportiRate(importoTotale, num)
    : [];
  const importoRata = importi[0];
  const ultimaRata = importi.length > 0 ? importi[importi.length - 1] : null;
  const primaScadenza = num >= 2 && giornoScadenzaValido(giornoScadenza) && meseInizioValido(meseInizio)
    ? calcolaScadenzeRate(1, giorno, mese)[0]
    : null;

  const anteprimaAccontoSaldo = useMemo(() => {
    if (modalita !== "acconto_saldo" || !(importoTotale > 0)) return null;
    return calcolaAccontoSaldoPiano(importoTotale, accontoTipo, accontoValore);
  }, [modalita, importoTotale, accontoTipo, accontoValore]);

  return (
    <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-brand-navy">Pagamento a rate</h3>
          <p className="mt-0.5 text-xs text-brand-navy/50">Rateizza l&apos;importo del preventivo per questo cliente</p>
        </div>
        <ToggleSwitch checked={attivo} onChange={onChangeAttivo} />
      </div>

      {attivo ? (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-navy/50">IMPORTO TOTALE PREVENTIVO</p>
            <div className="mt-1 rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm font-semibold text-brand-navy">
              {importoTotale > 0 ? `€${formatImportoEuro(importoTotale, 2)}` : "—"}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-brand-navy/50">MODALITÀ</p>
            <OptionToggle
              options={[
                { key: "rate_uguali" as const, label: "Rate uguali" },
                { key: "acconto_saldo" as const, label: "Acconto + saldo" },
              ]}
              value={modalita}
              onChange={onChangeModalita}
            />
          </div>

          {modalita === "rate_uguali" ? (
            <div>
              <p className="text-xs font-semibold tracking-wide text-brand-navy/50">NUMERO DI RATE</p>
              <input
                value={numeroRate}
                onChange={(e) => onChangeNumeroRate(e.target.value)}
                placeholder="es. 3"
                className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-brand-navy/50">TIPO ACCONTO</p>
                <OptionToggle
                  options={[
                    { key: "fisso" as const, label: "Importo fisso (€)" },
                    { key: "percentuale" as const, label: "Percentuale (%)" },
                  ]}
                  value={accontoTipo}
                  onChange={onChangeAccontoTipo}
                />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-brand-navy/50">
                  {accontoTipo === "fisso" ? "IMPORTO ACCONTO (€)" : "PERCENTUALE ACCONTO (%)"}
                </p>
                <input
                  value={accontoValore}
                  onChange={(e) => onChangeAccontoValore(e.target.value)}
                  placeholder={accontoTipo === "fisso" ? "es. 500" : "es. 30"}
                  inputMode={accontoTipo === "fisso" ? "decimal" : "numeric"}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
                />
              </div>
              <div className="rounded-xl bg-brand-bg px-3 py-2.5 text-sm text-brand-navy/70">
                {anteprimaAccontoSaldo ? (
                  <>
                    Acconto: <span className="font-semibold text-brand-navy">€{formatImportoEuro(anteprimaAccontoSaldo.acconto, 2)}</span>
                    {" · "}
                    Saldo: <span className="font-semibold text-brand-navy">€{formatImportoEuro(anteprimaAccontoSaldo.saldo, 2)}</span>
                  </>
                ) : (
                  <span className="text-brand-navy/45">
                    {accontoTipo === "fisso"
                      ? "Inserisci un acconto maggiore di zero e minore del totale."
                      : "Inserisci una percentuale tra 1 e 99."}
                  </span>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-brand-navy/50">GIORNO SCADENZA</p>
              <GiornoScadenzaSelect
                value={giornoScadenza}
                onChange={onChangeGiornoScadenza}
                mese={meseInizio}
                className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-brand-navy/50">MESE INIZIO PRIMA RATA</p>
              <MeseInizioSelect
                value={meseInizio}
                onChange={onChangeMeseInizio}
                giornoCollegato={giornoScadenza}
                onGiornoCollegatoChange={onChangeGiornoScadenza}
                className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
          </div>

          {modalita === "rate_uguali" && importoRata != null ? (
            <div className="space-y-1 rounded-xl bg-brand-bg p-3 text-sm text-brand-navy">
              <p className="text-xs font-semibold text-brand-navy/60">Anteprima rate</p>
              <p>{num} rate da €{formatImportoEuro(importoRata, 2)}</p>
              {primaScadenza ? (
                <p>Prima rata: {labelScadenzaRata(primaScadenza.mese, primaScadenza.anno, primaScadenza.giorno)}</p>
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
            <ToggleSwitch checked={visibileNelPDF} onChange={onChangeVisibileNelPDF} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
