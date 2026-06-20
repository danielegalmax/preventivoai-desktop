import { useRef } from "react";
import { MESI_BREVI } from "../../lib/constants";
import { formatImportoEuro } from "preventivoai-shared";
import type { RataAbbonamento } from "../../lib/types";

type ModalShellProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  zClass?: string;
};

function ModalShell({ title, onClose, children, zClass = "z-50" }: ModalShellProps) {
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  function handleBackdropMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    mouseDownTargetRef.current = e.target;
  }

  function handleBackdropMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    const backdrop = e.currentTarget;
    if (e.target === backdrop && mouseDownTargetRef.current === backdrop) {
      onClose();
    }
    mouseDownTargetRef.current = null;
  }

  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/40 p-4`}
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-center text-lg font-semibold text-brand-navy">{title}</h2>
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold tracking-wide text-brand-navy/50">{children}</label>;
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-teal"
    />
  );
}

function labelScadenza(rata: RataAbbonamento) {
  return `${MESI_BREVI[rata.mese - 1]} ${rata.anno}`;
}

export type PianoRateModalsProps = {
  mostraModificaImporto: boolean;
  onCloseModificaImporto: () => void;
  nuovoImportoTotale: string;
  onChangeNuovoImportoTotale: (v: string) => void;
  onSalvaModificaImporto: () => void;
  salvaImportoLoading: boolean;

  mostraPersonalizzaRate: boolean;
  onClosePersonalizzaRate: () => void;
  rateOrdinate: RataAbbonamento[];
  bozzaImporti: Record<string, string>;
  onChangeBozzaImporto: (rataId: string, v: string) => void;
  targetImportoPiano: number;
  sommaBozzaTotale: number;
  bozzaSommaValida: boolean;
  bozzaImportiValidi: boolean;
  rataPinnataEffettiva: (rata: RataAbbonamento) => boolean;
  onToggleRataPin: (rataId: string, bloccataAcconto: boolean) => void;
  onRicalcolaRateLibere: () => void;
  rateLibereCount: number;
  onSalvaPersonalizzaRate: () => void;
  salvaPersonalizzaLoading: boolean;
};

export default function PianoRateModals({
  mostraModificaImporto,
  onCloseModificaImporto,
  nuovoImportoTotale,
  onChangeNuovoImportoTotale,
  onSalvaModificaImporto,
  salvaImportoLoading,
  mostraPersonalizzaRate,
  onClosePersonalizzaRate,
  rateOrdinate,
  bozzaImporti,
  onChangeBozzaImporto,
  targetImportoPiano,
  sommaBozzaTotale,
  bozzaSommaValida,
  bozzaImportiValidi,
  rataPinnataEffettiva,
  onToggleRataPin,
  onRicalcolaRateLibere,
  rateLibereCount,
  onSalvaPersonalizzaRate,
  salvaPersonalizzaLoading,
}: PianoRateModalsProps) {
  return (
    <>
      {mostraModificaImporto ? (
        <ModalShell title="Modifica importo piano" onClose={onCloseModificaImporto}>
          <div className="space-y-1">
            <FieldLabel>NUOVO IMPORTO TOTALE (€)</FieldLabel>
            <FieldInput
              value={nuovoImportoTotale}
              onChange={(e) => onChangeNuovoImportoTotale(e.target.value)}
              placeholder="es. 3000"
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={onSalvaModificaImporto}
            disabled={salvaImportoLoading}
            className="w-full rounded-xl bg-brand-navy py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {salvaImportoLoading ? "Salvataggio..." : "Salva"}
          </button>
          <button type="button" onClick={onCloseModificaImporto} className="w-full py-2 text-sm text-brand-navy/50">
            Annulla
          </button>
        </ModalShell>
      ) : null}

      {mostraPersonalizzaRate ? (
        <ModalShell title="Personalizza rate" onClose={onClosePersonalizzaRate}>
          <p className="text-xs leading-relaxed text-brand-navy/60">
            Fissa le rate che vuoi impostare tu, poi usa Ricalcola rate libere per ripartire il resto su €
            {formatImportoEuro(targetImportoPiano, 2)}.
          </p>
          <div className="space-y-2">
            {rateOrdinate.map((rata, index) => {
              const pagata = rata.stato === "incassato";
              const bloccataAcconto = !pagata && (rata.acconto || 0) > 0;
              const pinnata = rataPinnataEffettiva(rata);
              return (
                <div key={rata.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm text-brand-navy/70">
                    Rata {index + 1} · {labelScadenza(rata)}
                  </span>
                  {pagata ? (
                    <span className="w-24 text-right text-sm font-semibold text-brand-navy/40">
                      €{formatImportoEuro(rata.importo, 2)}
                    </span>
                  ) : (
                    <>
                      <input
                        value={bozzaImporti[rata.id] ?? ""}
                        onChange={(e) => onChangeBozzaImporto(rata.id, e.target.value)}
                        className={`w-24 rounded-lg border px-2 py-1.5 text-right text-sm font-semibold ${
                          pinnata ? "border-brand-teal bg-emerald-50" : "border-black/10 bg-brand-bg"
                        }`}
                      />
                      <button
                        type="button"
                        disabled={bloccataAcconto}
                        onClick={() => onToggleRataPin(rata.id, bloccataAcconto)}
                        className={`min-w-[52px] rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
                          pinnata ? "border-brand-teal bg-emerald-50 text-brand-teal" : "border-black/10 text-brand-navy/40"
                        }`}
                      >
                        {bloccataAcconto ? "Acconto" : pinnata ? "Fissa" : "Libera"}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className={`text-center text-sm font-semibold ${bozzaSommaValida && bozzaImportiValidi ? "text-brand-teal" : "text-red-500"}`}>
            Somma: €{formatImportoEuro(sommaBozzaTotale, 2)} / €{formatImportoEuro(targetImportoPiano, 2)}
          </p>
          <button
            type="button"
            onClick={onRicalcolaRateLibere}
            disabled={rateLibereCount === 0}
            className="w-full rounded-xl border border-brand-teal bg-emerald-50 py-2.5 text-sm font-semibold text-brand-teal disabled:opacity-40"
          >
            Ricalcola rate libere
          </button>
          <button
            type="button"
            onClick={onSalvaPersonalizzaRate}
            disabled={salvaPersonalizzaLoading || !bozzaSommaValida || !bozzaImportiValidi}
            className="w-full rounded-xl bg-brand-navy py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {salvaPersonalizzaLoading ? "Salvataggio..." : "Salva rate"}
          </button>
          <button type="button" onClick={onClosePersonalizzaRate} className="w-full py-2 text-sm text-brand-navy/50">
            Annulla
          </button>
        </ModalShell>
      ) : null}
    </>
  );
}
