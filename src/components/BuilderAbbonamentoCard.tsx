import { calcolaScadenzeRate, labelScadenzaRata } from "../lib/importo";
import {
  giornoScadenzaValido,
  meseInizioValido,
} from "../lib/giornoScadenza";
import { GiornoScadenzaSelect, MeseInizioSelect } from "./pickers/DatePartPickers";
import ToggleSwitch from "./ToggleSwitch";

type Props = {
  attivo: boolean;
  importo: string;
  giorno: string;
  meseInizio: string;
  mensilita: string;
  visibileNelPDF: boolean;
  importoTotale?: string;
  onChangeAttivo: (value: boolean) => void;
  onChangeImporto: (value: string) => void;
  onChangeGiorno: (value: string) => void;
  onChangeMeseInizio: (value: string) => void;
  onChangeMensilita: (value: string) => void;
  onChangeVisibileNelPDF: (value: boolean) => void;
};

export default function BuilderAbbonamentoCard({
  attivo,
  importo,
  giorno,
  meseInizio,
  mensilita,
  visibileNelPDF,
  importoTotale,
  onChangeAttivo,
  onChangeImporto,
  onChangeGiorno,
  onChangeMeseInizio,
  onChangeMensilita,
  onChangeVisibileNelPDF,
}: Props) {
  const giornoNum = parseInt(giorno, 10) || 0;
  const meseNum = parseInt(meseInizio, 10) || 0;
  const primaScadenza = giornoScadenzaValido(giorno) && meseInizioValido(meseInizio)
    ? calcolaScadenzeRate(1, giornoNum, meseNum)[0]
    : null;

  return (
    <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-brand-navy">Abbonamento mensile</h3>
          <p className="mt-0.5 text-xs text-brand-navy/50">Configura un canone ricorrente per questo cliente</p>
        </div>
        <ToggleSwitch
          checked={attivo}
          onChange={(v) => {
            onChangeAttivo(v);
            if (v && importoTotale) onChangeImporto(importoTotale);
          }}
        />
      </div>

      {attivo ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="min-h-[30px] text-xs font-semibold tracking-wide text-brand-navy/50">IMPORTO MENSILE (€)</p>
              <input
                value={importo}
                onChange={(e) => onChangeImporto(e.target.value)}
                placeholder="es. 400"
                className="w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
            <div>
              <p className="min-h-[30px] text-xs font-semibold tracking-wide text-brand-navy/50">GIORNO SCADENZA</p>
              <GiornoScadenzaSelect
                value={giorno}
                onChange={onChangeGiorno}
                mese={meseInizio}
                className="w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-navy/50">MESE INIZIO PRIMO CANONE</p>
            <MeseInizioSelect
              value={meseInizio}
              onChange={onChangeMeseInizio}
              giornoCollegato={giorno}
              onGiornoCollegatoChange={onChangeGiorno}
              className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
            />
          </div>

          {primaScadenza ? (
            <p className="rounded-xl bg-brand-bg p-3 text-sm text-brand-navy">
              Primo canone: {labelScadenzaRata(primaScadenza.mese, primaScadenza.anno, primaScadenza.giorno)}
            </p>
          ) : null}

          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-navy/50">N. MENSILITÀ (opzionale)</p>
            <input
              value={mensilita}
              onChange={(e) => onChangeMensilita(e.target.value)}
              placeholder="es. 12 - lascia vuoto per canone aperto"
              className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-3">
            <div>
              <p className="text-sm font-medium text-brand-navy">Mostra nel PDF</p>
              <p className="text-xs text-brand-navy/50">Aggiunge il canone mensile al documento</p>
            </div>
            <ToggleSwitch checked={visibileNelPDF} onChange={onChangeVisibileNelPDF} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
