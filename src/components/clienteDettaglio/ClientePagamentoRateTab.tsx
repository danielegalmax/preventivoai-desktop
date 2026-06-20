import { useMemo } from "react";
import type { Abbonamento } from "../../lib/types";
import { analizzaStatoPiano, ordinaPianiPerStato } from "preventivoai-shared";
import type { PianoRateCardProps } from "./PianoRateCard";
import PianoRateCard from "./PianoRateCard";
import PianoVuotoState from "./PianoVuotoState";

type Props = Omit<PianoRateCardProps, "abbonamento" | "rate" | "preventivoMadre"> & {
  loading: boolean;
  abbonamentiAttivi: Abbonamento[];
  ratePerPiano: Record<string, import("../../lib/types").RataAbbonamento[]>;
  preventiviMadreStorico: Record<string, import("../../lib/types").PreventivoMadre>;
  selezionePianoAttiva?: boolean;
  pianiSelezionati?: string[];
  onToggleSelezionePiano?: (abbonamentoId: string) => void;
};

export default function ClientePagamentoRateTab({
  loading,
  abbonamentiAttivi,
  ratePerPiano,
  preventiviMadreStorico,
  selezionePianoAttiva = false,
  pianiSelezionati = [],
  onToggleSelezionePiano,
  ...cardProps
}: Props) {
  const pianiOrdinati = useMemo(
    () => ordinaPianiPerStato(abbonamentiAttivi, ratePerPiano, (id) => abbonamentiAttivi.find((a) => a.id === id)),
    [abbonamentiAttivi, ratePerPiano],
  );

  const pianiInCorso = useMemo(
    () => pianiOrdinati.filter((a) => !analizzaStatoPiano(a, ratePerPiano[a.id] || []).concluso),
    [pianiOrdinati, ratePerPiano],
  );

  const pianiConclusi = useMemo(
    () => pianiOrdinati.filter((a) => analizzaStatoPiano(a, ratePerPiano[a.id] || []).concluso),
    [pianiOrdinati, ratePerPiano],
  );

  if (loading) {
    return <p className="py-10 text-center text-brand-navy/50">Caricamento piani...</p>;
  }

  if (abbonamentiAttivi.length === 0) {
    return (
      <PianoVuotoState
        emoji="📅"
        title="Nessun piano a rate"
        description="Suddividi l'importo di un preventivo in rate mensili con scadenze, promemoria e tracciamento degli incassi."
      />
    );
  }

  function renderCard(abbonamento: Abbonamento) {
    return (
      <PianoRateCard
        key={abbonamento.id}
        abbonamento={abbonamento}
        rate={ratePerPiano[abbonamento.id] || []}
        preventivoMadre={
          abbonamento.preventivo_id
            ? preventiviMadreStorico[abbonamento.preventivo_id] ?? null
            : null
        }
        selezionePianoAttiva={selezionePianoAttiva}
        pianoSelezionato={pianiSelezionati.includes(abbonamento.id)}
        onToggleSelezionePiano={onToggleSelezionePiano}
        {...cardProps}
      />
    );
  }

  return (
    <div className="space-y-3">
      {pianiInCorso.map(renderCard)}
      {pianiConclusi.length > 0 ? (
        <>
          <p className="pt-2 text-[11px] font-semibold tracking-wide text-brand-navy/40 uppercase">
            {pianiConclusi.length === 1 ? "Concluso" : `Conclusi (${pianiConclusi.length})`}
          </p>
          {pianiConclusi.map(renderCard)}
        </>
      ) : null}
    </div>
  );
}
