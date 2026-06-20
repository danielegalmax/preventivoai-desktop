import { useMemo, useState, type ReactNode } from "react";
import type { AnalisiPiano } from "preventivoai-shared";
import { formatImportoEuro } from "preventivoai-shared";
import type { Abbonamento, PreventivoMadre, RataAbbonamento } from "../../lib/types";
import PreventivoMadreLink from "./PreventivoMadreLink";
import RigaPiano, { type VariantePiano } from "./RigaPiano";

export type PianoEspansoMode = "byStato" | "byCalendario";

function ordinaRate(a: RataAbbonamento, b: RataAbbonamento) {
  return a.anno - b.anno || a.mese - b.mese;
}

type GruppoRate = {
  titolo: string;
  rate: RataAbbonamento[];
};

function partizioneRate(
  mode: PianoEspansoMode,
  rate: RataAbbonamento[],
  meseCorrente?: number,
  annoCorrente?: number,
): GruppoRate[] {
  const ordinate = [...rate].sort(ordinaRate);

  if (mode === "byStato") {
    const future = ordinate.filter((r) => r.stato !== "incassato");
    const storico = ordinate.filter((r) => r.stato === "incassato");
    const gruppi: GruppoRate[] = [];
    if (future.length > 0) gruppi.push({ titolo: `Prossime scadenze (${future.length})`, rate: future });
    if (storico.length > 0) gruppi.push({ titolo: `Storico (${storico.length})`, rate: storico });
    return gruppi;
  }

  if (meseCorrente != null && annoCorrente != null) {
    const corrente = ordinate.filter((r) => r.mese === meseCorrente && r.anno === annoCorrente);
    const storico = ordinate.filter((r) => !(r.mese === meseCorrente && r.anno === annoCorrente));
    const gruppi: GruppoRate[] = [];
    if (corrente.length > 0) gruppi.push({ titolo: `Canone corrente (${corrente.length})`, rate: corrente });
    if (storico.length > 0) gruppi.push({ titolo: `Storico canoni (${storico.length})`, rate: storico });
    return gruppi;
  }

  return [];
}

type PianoEspansoProps = {
  abbonamento: Abbonamento;
  rate: RataAbbonamento[];
  preventivoMadre: PreventivoMadre | null;
  analisi: AnalisiPiano;
  mode: PianoEspansoMode;
  varianteRiga: VariantePiano;
  meseCorrente?: number;
  annoCorrente?: number;
  onApriPreventivoMadre?: (preventivoId: string) => void;
  invioReminderLoading: string | null;
  rataMiniAperta: string | null;
  onToggleRataMini: (rataId: string) => void;
  prossimaNonIncassataId?: string | null;
  onOpenPagamento: (rata: RataAbbonamento) => void;
  onAzzeraPagamento: (rataId: string) => void;
  onReminder: (rata: RataAbbonamento) => void;
  onEliminaRata: (rata: RataAbbonamento) => void;
  children?: ReactNode;
  className?: string;
};

function GruppoRateCollassabile({
  titolo,
  rate,
  rateOrdinate,
  varianteRiga,
  defaultAperto,
  invioReminderLoading,
  rataMiniAperta,
  onToggleRataMini,
  prossimaNonIncassataId,
  onOpenPagamento,
  onAzzeraPagamento,
  onReminder,
  onEliminaRata,
  titoloCustom,
}: {
  titolo: string;
  rate: RataAbbonamento[];
  rateOrdinate: RataAbbonamento[];
  varianteRiga: VariantePiano;
  defaultAperto: boolean;
  invioReminderLoading: string | null;
  rataMiniAperta: string | null;
  onToggleRataMini: (rataId: string) => void;
  prossimaNonIncassataId?: string | null;
  onOpenPagamento: (rata: RataAbbonamento) => void;
  onAzzeraPagamento: (rataId: string) => void;
  onReminder: (rata: RataAbbonamento) => void;
  onEliminaRata: (rata: RataAbbonamento) => void;
  titoloCustom?: (rata: RataAbbonamento) => string | undefined;
}) {
  const [aperto, setAperto] = useState(defaultAperto);

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        className="flex w-full items-center justify-between bg-brand-bg px-3.5 py-3 text-left"
      >
        <span className="text-xs font-semibold tracking-wide text-brand-navy/50 uppercase">{titolo}</span>
        <span className="text-[10px] text-brand-navy/40">{aperto ? "▲" : "▼"}</span>
      </button>
      {aperto ? rate.map((rata) => {
        const index = rateOrdinate.findIndex((r) => r.id === rata.id);
        return (
          <RigaPiano
            key={rata.id}
            rata={rata}
            variante={varianteRiga}
            layout="completa"
            indiceRata={varianteRiga === "rate" ? index : undefined}
            titoloCustom={titoloCustom?.(rata)}
            aperta={rataMiniAperta === rata.id}
            invioReminderLoading={invioReminderLoading}
            mostraReminder={prossimaNonIncassataId === rata.id}
            onToggle={() => onToggleRataMini(rata.id)}
            onOpenPagamento={onOpenPagamento}
            onAzzeraPagamento={onAzzeraPagamento}
            onReminder={() => onReminder(rata)}
            onElimina={() => onEliminaRata(rata)}
          />
        );
      }) : null}
    </div>
  );
}

export default function PianoEspanso({
  rate,
  preventivoMadre,
  analisi,
  mode,
  varianteRiga,
  meseCorrente,
  annoCorrente,
  onApriPreventivoMadre,
  invioReminderLoading,
  rataMiniAperta,
  onToggleRataMini,
  prossimaNonIncassataId,
  onOpenPagamento,
  onAzzeraPagamento,
  onReminder,
  onEliminaRata,
  children,
  className = "",
}: PianoEspansoProps) {
  const rateOrdinate = useMemo(() => [...rate].sort(ordinaRate), [rate]);
  const gruppi = useMemo(
    () => partizioneRate(mode, rate, meseCorrente, annoCorrente),
    [mode, rate, meseCorrente, annoCorrente],
  );
  const importoPiano = analisi.importoRaccolto + analisi.residuo;

  return (
    <div className={`space-y-3 pb-28 pl-1 ${className}`.trim()}>
      <div className="h-2 overflow-hidden rounded-full bg-black/5">
        <div
          className={`h-full rounded-full ${analisi.concluso ? "bg-emerald-700" : "bg-brand-teal"}`}
          style={{ width: `${Math.min(100, analisi.progressoPct)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold tracking-wide text-brand-navy/50 uppercase">Totale</p>
          <p className="mt-1 text-sm font-bold text-brand-navy">€{formatImportoEuro(importoPiano, 2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold tracking-wide text-brand-navy/50 uppercase">Incassato</p>
          <p className="mt-1 text-sm font-bold text-brand-teal">€{formatImportoEuro(analisi.importoRaccolto, 2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold tracking-wide text-brand-navy/50 uppercase">Residuo</p>
          <p className="mt-1 text-sm font-bold text-brand-navy">€{formatImportoEuro(analisi.residuo, 2)}</p>
        </div>
      </div>

      <PreventivoMadreLink preventivo={preventivoMadre} onPress={onApriPreventivoMadre} />

      {gruppi.map((gruppo, i) => (
        <GruppoRateCollassabile
          key={gruppo.titolo}
          titolo={gruppo.titolo}
          rate={gruppo.rate}
          rateOrdinate={rateOrdinate}
          varianteRiga={varianteRiga}
          defaultAperto={i === 0}
          invioReminderLoading={invioReminderLoading}
          rataMiniAperta={rataMiniAperta}
          onToggleRataMini={onToggleRataMini}
          prossimaNonIncassataId={prossimaNonIncassataId}
          onOpenPagamento={onOpenPagamento}
          onAzzeraPagamento={onAzzeraPagamento}
          onReminder={onReminder}
          onEliminaRata={onEliminaRata}
        />
      ))}

      {children}
    </div>
  );
}
