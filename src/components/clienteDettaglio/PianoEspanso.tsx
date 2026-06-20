import { useMemo, useState, type ReactNode } from "react";

import { MESI_BREVI } from "../../lib/constants";

import type { AnalisiPiano } from "preventivoai-shared";

import { formatImportoEuro } from "preventivoai-shared";

import type { Abbonamento, PreventivoMadre, RataAbbonamento } from "../../lib/types";

import PreventivoMadreLink from "./PreventivoMadreLink";

import RigaPiano, { type VariantePiano } from "./RigaPiano";



export type PianoEspansoMode = "byStato" | "byCalendario";



function ordinaRate(a: RataAbbonamento, b: RataAbbonamento) {

  return a.anno - b.anno || a.mese - b.mese;

}



function labelScadenza(rata: RataAbbonamento) {

  return `${MESI_BREVI[rata.mese - 1]} ${rata.anno}`;

}



type GruppoRate = {

  titolo: string;

  rate: RataAbbonamento[];

};



function partizioneByStato(rate: RataAbbonamento[]): GruppoRate[] {

  const ordinate = [...rate].sort(ordinaRate);

  const future = ordinate.filter((r) => r.stato !== "incassato");

  const storico = ordinate.filter((r) => r.stato === "incassato");

  const gruppi: GruppoRate[] = [];

  if (future.length > 0) gruppi.push({ titolo: `Prossime scadenze (${future.length})`, rate: future });

  if (storico.length > 0) gruppi.push({ titolo: `Storico (${storico.length})`, rate: storico });

  return gruppi;

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

  onAggiungiCanone?: () => void;

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

  onAggiungiCanone,

  children,

  className = "",

}: PianoEspansoProps) {

  const rateOrdinate = useMemo(() => [...rate].sort(ordinaRate), [rate]);

  const gruppiByStato = useMemo(

    () => (mode === "byStato" ? partizioneByStato(rate) : []),

    [mode, rate],

  );

  const partizioneCalendario = useMemo(() => {

    if (mode !== "byCalendario" || meseCorrente == null || annoCorrente == null) return null;

    const corrente = rate.find((r) => r.mese === meseCorrente && r.anno === annoCorrente) ?? null;

    const resto = rate

      .filter((r) => !(r.mese === meseCorrente && r.anno === annoCorrente))

      .sort(ordinaRate);

    return { corrente, resto };

  }, [mode, rate, meseCorrente, annoCorrente]);

  const importoPiano = analisi.importoRaccolto + analisi.residuo;



  const propsRiga = (rata: RataAbbonamento) => ({

    rata,

    variante: varianteRiga,

    invioReminderLoading,

    mostraReminder: prossimaNonIncassataId === rata.id,

    onOpenPagamento,

    onAzzeraPagamento,

    onReminder: () => onReminder(rata),

    onElimina: () => onEliminaRata(rata),

  });



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



      {mode === "byCalendario" && partizioneCalendario ? (

        <>

          {partizioneCalendario.corrente ? (

            <RigaPiano

              {...propsRiga(partizioneCalendario.corrente)}

              layout="hero"

              evidenziaCorrente

              aperta

            />

          ) : onAggiungiCanone && meseCorrente != null && annoCorrente != null ? (

            <button

              type="button"

              onClick={onAggiungiCanone}

              className="w-full rounded-xl border border-black/10 bg-brand-bg py-2.5 text-sm font-medium text-brand-teal"

            >

              + Aggiungi canone {MESI_BREVI[meseCorrente - 1]} {annoCorrente}

            </button>

          ) : null}



          {partizioneCalendario.resto.length > 0 ? (

            <GruppoRateCollassabile

              titolo={`Storico canoni (${partizioneCalendario.resto.length})`}

              rate={partizioneCalendario.resto}

              rateOrdinate={rateOrdinate}

              varianteRiga={varianteRiga}

              defaultAperto={false}

              invioReminderLoading={invioReminderLoading}

              rataMiniAperta={rataMiniAperta}

              onToggleRataMini={onToggleRataMini}

              prossimaNonIncassataId={prossimaNonIncassataId}

              onOpenPagamento={onOpenPagamento}

              onAzzeraPagamento={onAzzeraPagamento}

              onReminder={onReminder}

              onEliminaRata={onEliminaRata}

              titoloCustom={labelScadenza}

            />

          ) : null}



          {onAggiungiCanone ? (

            <button type="button" onClick={onAggiungiCanone} className="w-full py-2 text-sm font-medium text-brand-teal">

              + Aggiungi canone (mese/anno)

            </button>

          ) : null}

        </>

      ) : null}



      {mode === "byStato" ? gruppiByStato.map((gruppo, i) => (

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

      )) : null}



      {children}

    </div>

  );

}


