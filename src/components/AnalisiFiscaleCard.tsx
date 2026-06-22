import type { Dispatch, SetStateAction } from "react";
import { calcolaTotaleVoci, type VoceBuilder } from "../lib/builder";
import { formatImportoEuroVisuale, parseImportoEuro } from "preventivoai-shared";
import type { ProfiloFiscale, RisultatoFiscale } from "../lib/types";
import ToggleSwitch from "./ToggleSwitch";

type Props = {
  profiloFiscale: ProfiloFiscale | null;
  mostraFiscale: boolean;
  setMostraFiscale: (value: boolean) => void;
  fiscale: RisultatoFiscale | null;
  voci: VoceBuilder[];
  setVoci: Dispatch<SetStateAction<VoceBuilder[]>>;
  storicoVoci: VoceBuilder[][];
  setStoricoVoci: Dispatch<SetStateAction<VoceBuilder[][]>>;
  nettoDesiderato: string;
  setNettoDesiderato: (value: string) => void;
  lordoCalcolato: number | null;
  setLordoCalcolato: (value: number | null) => void;
  calcolaLordoDaNetto: (netto: number) => number | null;
};

function fmt(value: number) {
  return formatImportoEuroVisuale(value);
}

export default function AnalisiFiscaleCard({
  profiloFiscale,
  mostraFiscale,
  setMostraFiscale,
  fiscale: f,
  voci,
  setVoci,
  storicoVoci,
  setStoricoVoci,
  nettoDesiderato,
  setNettoDesiderato,
  lordoCalcolato,
  setLordoCalcolato,
  calcolaLordoDaNetto,
}: Props) {
  if (!profiloFiscale) return null;

  const totaleAttuale = () => calcolaTotaleVoci(voci);

  return (
    <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-sm font-semibold text-brand-teal">
            =
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-brand-teal">Analisi fiscale</p>
            <p className="mt-0.5 text-xs text-brand-navy/50">Stima netto, imposte e lordo necessario</p>
          </div>
        </div>
        <ToggleSwitch checked={mostraFiscale} onChange={setMostraFiscale} />
      </div>

      {mostraFiscale && f && (
        <div className="mt-4 space-y-1 text-sm">
          {f.regime === "forfettario" && (
            <>
              <Riga label="Fatturato lordo" valore={`€${fmt(f.lordo)}`} />
              {f.rivalsa > 0 && (
                <Riga label={`+ Rivalsa INPS (${profiloFiscale.rivalsa_percentuale}%)`} valore={`+€${fmt(f.rivalsa)}`} />
              )}
              <Riga label="= Totale fattura cliente" valore={`€${fmt(f.totaleCliente)}`} bold />
              <Separatore />
              <Riga label={`Reddito imponibile (${profiloFiscale.coefficiente_redditivita}%)`} valore={`€${fmt(f.imponibile)}`} />
              <Riga label="- Contributi INPS" valore={`-€${fmt(f.contributi)}`} negativo />
              <Riga label={`- Imposta sostitutiva (${profiloFiscale.aliquota_sostitutiva}%)`} valore={`-€${fmt(f.imposta)}`} negativo />
              <Separatore />
              <Riga label="Netto stimato" valore={`€${fmt(f.netto)}`} netto />
            </>
          )}
          {f.regime === "ordinario" && (
            <>
              <Riga label="Fatturato lordo" valore={`€${fmt(f.lordo)}`} />
              {f.iva > 0 && <Riga label={`+ IVA (${profiloFiscale.aliquota_iva}%)`} valore={`+€${fmt(f.iva)}`} />}
              {f.rivalsa > 0 && <Riga label="+ Rivalsa INPS" valore={`+€${fmt(f.rivalsa)}`} />}
              <Riga label="= Totale fattura cliente" valore={`€${fmt(f.totaleCliente)}`} bold />
              <Separatore />
              <Riga label="- Contributi INPS" valore={`-€${fmt(f.contributi)}`} negativo />
              <Riga label="- IRPEF stimata" valore={`-€${fmt(f.irpef)}`} negativo />
              <Separatore />
              <Riga label="Netto stimato" valore={`€${fmt(f.netto)}`} netto />
            </>
          )}
          {f.regime === "occasionale" && (
            <>
              <Riga label="Compenso lordo" valore={`€${fmt(f.lordo)}`} />
              <Riga label={`- Ritenuta d'acconto (${profiloFiscale.ritenuta_acconto}%)`} valore={`-€${fmt(f.ritenuta)}`} negativo />
              <Separatore />
              <Riga label="Netto stimato" valore={`€${fmt(f.netto)}`} netto />
            </>
          )}
          <p className="pt-2 text-xs italic text-brand-navy/50">
            Calcolo indicativo — consulta il tuo commercialista
          </p>

          <Separatore />
          <p className="pt-2 text-xs font-medium text-brand-navy/70">Voglio incassare (netto)</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              value={nettoDesiderato}
              onChange={(e) => {
                setNettoDesiderato(e.target.value);
                setLordoCalcolato(null);
              }}
              placeholder="es. 2000"
              className="min-w-[120px] flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
            />
            <button
              type="button"
              onClick={() => {
                const netto = parseImportoEuro(nettoDesiderato);
                if (netto === null || netto <= 0) {
                  window.alert("Inserisci un valore valido");
                  return;
                }
                setLordoCalcolato(calcolaLordoDaNetto(netto));
              }}
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white"
            >
              Calcola
            </button>
          </div>

          {lordoCalcolato !== null && voci.length > 0 && (
            <div className="mt-3 space-y-2 rounded-xl bg-brand-teal/5 p-3">
              <p className="text-sm font-medium text-brand-teal">
                Lordo da fatturare: €{fmt(lordoCalcolato)}
              </p>
              <button
                type="button"
                onClick={() => {
                  const totale = totaleAttuale();
                  if (totale === 0) {
                    window.alert("I prezzi sono tutti a zero");
                    return;
                  }
                  const fattore = lordoCalcolato / totale;
                  setStoricoVoci((s) => [...s, voci]);
                  setVoci((v) =>
                    v.map((x) => ({
                      ...x,
                      costo: Math.round((parseImportoEuro(x.costo) ?? 0) * fattore).toString(),
                    })),
                  );
                  setLordoCalcolato(null);
                  setNettoDesiderato("");
                }}
                className="w-full rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white"
              >
                Applica al preventivo
              </button>
              <p className="text-center text-xs text-brand-navy/50">
                I prezzi delle voci verranno scalati proporzionalmente
              </p>
            </div>
          )}

          {storicoVoci.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const precedente = storicoVoci[storicoVoci.length - 1];
                setVoci(precedente);
                setStoricoVoci((s) => s.slice(0, -1));
                setLordoCalcolato(null);
                setNettoDesiderato("");
              }}
              className="mt-2 w-full text-center text-sm text-brand-navy/50 hover:text-brand-navy"
            >
              {`Annulla ultimo calcolo (${storicoVoci.length} step)`}
            </button>
          )}

          {lordoCalcolato !== null && voci.length === 0 && (
            <p className="mt-2 text-sm text-brand-teal">
              {`Lordo da fatturare: €${fmt(lordoCalcolato)} — aggiungi servizi per applicare`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Riga({
  label,
  valore,
  bold,
  negativo,
  netto,
}: {
  label: string;
  valore: string;
  bold?: boolean;
  negativo?: boolean;
  netto?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className={`flex-1 text-brand-navy/60 ${netto ? "font-semibold text-brand-navy" : ""}`}>{label}</span>
      <span
        className={
          netto
            ? "text-base font-bold text-brand-teal"
            : negativo
              ? "text-red-500"
              : bold
                ? "font-bold text-brand-navy"
                : "text-brand-navy"
        }
      >
        {valore}
      </span>
    </div>
  );
}

function Separatore() {
  return <div className="my-2 border-t border-black/5" />;
}
