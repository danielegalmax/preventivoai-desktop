import type { Preventivo, RataAbbonamento } from "../../lib/types";
import { MESI_BREVI } from "../../lib/constants";
import { formatImportoEuro } from "../../lib/importo";
import { AnnoSelect, GiornoScadenzaSelect, MeseInizioSelect } from "../pickers/DatePartPickers";
import PreventivoPicker from "./PreventivoPicker";

type ModalShellProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

function ModalShell({ title, onClose, children }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
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

type Props = {
  mostraNuovo: boolean;
  onCloseNuovo: () => void;
  abImporto: string;
  onChangeAbImporto: (v: string) => void;
  abGiorno: string;
  onChangeAbGiorno: (v: string) => void;
  abMensilita: string;
  onChangeAbMensilita: (v: string) => void;
  preventiviDisponibili: Preventivo[];
  preventivoSelezionatoId: string | null;
  onSelectPreventivo: (id: string | null) => void;
  onCreaAbbonamento: () => void;

  mostraNuovoRate: boolean;
  onCloseNuovoRate: () => void;
  rateImportoTotale: string;
  onChangeRateImportoTotale: (v: string) => void;
  rateNumero: string;
  onChangeRateNumero: (v: string) => void;
  rateGiorno: string;
  onChangeRateGiorno: (v: string) => void;
  rateMeseInizio: string;
  onChangeRateMeseInizio: (v: string) => void;
  preventiviDisponibiliRate: Preventivo[];
  preventivoRateSelezionatoId: string | null;
  onSelectPreventivoRate: (id: string | null) => void;
  onCreaPianoRate: () => void;

  mostraModifica: boolean;
  onCloseModifica: () => void;
  onAggiornaAbbonamento: () => void;

  rataSelezionata: RataAbbonamento | null;
  onCloseRata: () => void;
  rataImporto: string;
  onChangeRataImporto: (v: string) => void;
  pagamentoImporto: string;
  onChangePagamentoImporto: (v: string) => void;
  pagamentoNota: string;
  onChangePagamentoNota: (v: string) => void;
  onConfermaPagamento: () => void;

  mostraRinomina: boolean;
  onCloseRinomina: () => void;
  nomeAbTemp: string;
  onChangeNomeAbTemp: (v: string) => void;
  onSalvaRinomina: () => void;

  mostraAggiungiRata: boolean;
  onCloseAggiungiRata: () => void;
  nuovaRataMese: string;
  onChangeNuovaRataMese: (v: string) => void;
  nuovaRataAnno: string;
  onChangeNuovaRataAnno: (v: string) => void;
  nuovaRataImporto: string;
  onChangeNuovaRataImporto: (v: string) => void;
  onConfermaAggiungiRata: () => void;
};

export default function ClienteAbbonamentoModals({
  mostraNuovo,
  onCloseNuovo,
  abImporto,
  onChangeAbImporto,
  abGiorno,
  onChangeAbGiorno,
  abMensilita,
  onChangeAbMensilita,
  preventiviDisponibili,
  preventivoSelezionatoId,
  onSelectPreventivo,
  onCreaAbbonamento,
  mostraNuovoRate,
  onCloseNuovoRate,
  rateImportoTotale,
  onChangeRateImportoTotale,
  rateNumero,
  onChangeRateNumero,
  rateGiorno,
  onChangeRateGiorno,
  rateMeseInizio,
  onChangeRateMeseInizio,
  preventiviDisponibiliRate,
  preventivoRateSelezionatoId,
  onSelectPreventivoRate,
  onCreaPianoRate,
  mostraModifica,
  onCloseModifica,
  onAggiornaAbbonamento,
  rataSelezionata,
  onCloseRata,
  rataImporto,
  onChangeRataImporto,
  pagamentoImporto,
  onChangePagamentoImporto,
  pagamentoNota,
  onChangePagamentoNota,
  onConfermaPagamento,
  mostraRinomina,
  onCloseRinomina,
  nomeAbTemp,
  onChangeNomeAbTemp,
  onSalvaRinomina,
  mostraAggiungiRata,
  onCloseAggiungiRata,
  nuovaRataMese,
  onChangeNuovaRataMese,
  nuovaRataAnno,
  onChangeNuovaRataAnno,
  nuovaRataImporto,
  onChangeNuovaRataImporto,
  onConfermaAggiungiRata,
}: Props) {
  return (
    <>
      {mostraNuovo ? (
        <ModalShell title="Nuovo abbonamento" onClose={onCloseNuovo}>
          <PreventivoPicker
            preventivi={preventiviDisponibili}
            selezionatoId={preventivoSelezionatoId}
            onSelect={onSelectPreventivo}
          />
          <div className="space-y-1">
            <FieldLabel>IMPORTO MENSILE (€)</FieldLabel>
            <FieldInput value={abImporto} onChange={(e) => onChangeAbImporto(e.target.value)} placeholder="es. 500" />
          </div>
          <div className="space-y-1">
            <FieldLabel>GIORNO SCADENZA</FieldLabel>
            <GiornoScadenzaSelect value={abGiorno} onChange={onChangeAbGiorno} />
          </div>
          <div className="space-y-1">
            <FieldLabel>N° MENSILITÀ (opzionale)</FieldLabel>
            <FieldInput value={abMensilita} onChange={(e) => onChangeAbMensilita(e.target.value)} placeholder="es. 12 - lascia vuoto per canone aperto" />
          </div>
          <button type="button" onClick={onCreaAbbonamento} className="w-full rounded-xl bg-brand-navy py-3 text-sm font-semibold text-white">
            Crea abbonamento
          </button>
          <button type="button" onClick={onCloseNuovo} className="w-full py-2 text-sm text-brand-navy/50">Annulla</button>
        </ModalShell>
      ) : null}

      {mostraNuovoRate ? (
        <ModalShell title="Nuovo piano a rate" onClose={onCloseNuovoRate}>
          <PreventivoPicker
            preventivi={preventiviDisponibiliRate}
            selezionatoId={preventivoRateSelezionatoId}
            onSelect={onSelectPreventivoRate}
          />
          <div className="space-y-1">
            <FieldLabel>IMPORTO TOTALE (€)</FieldLabel>
            <FieldInput value={rateImportoTotale} onChange={(e) => onChangeRateImportoTotale(e.target.value)} placeholder="es. 3000" />
          </div>
          <div className="space-y-1">
            <FieldLabel>N° RATE (min. 2)</FieldLabel>
            <FieldInput value={rateNumero} onChange={(e) => onChangeRateNumero(e.target.value)} placeholder="es. 6" />
          </div>
          <div className="space-y-1">
            <FieldLabel>GIORNO SCADENZA</FieldLabel>
            <GiornoScadenzaSelect value={rateGiorno} onChange={onChangeRateGiorno} mese={rateMeseInizio} />
          </div>
          <div className="space-y-1">
            <FieldLabel>MESE PRIMA RATA</FieldLabel>
            <MeseInizioSelect
              value={rateMeseInizio}
              onChange={onChangeRateMeseInizio}
              giornoCollegato={rateGiorno}
              onGiornoCollegatoChange={onChangeRateGiorno}
            />
          </div>
          <button type="button" onClick={onCreaPianoRate} className="w-full rounded-xl bg-brand-navy py-3 text-sm font-semibold text-white">
            Crea piano a rate
          </button>
          <button type="button" onClick={onCloseNuovoRate} className="w-full py-2 text-sm text-brand-navy/50">Annulla</button>
        </ModalShell>
      ) : null}

      {mostraModifica ? (
        <ModalShell title="Modifica abbonamento" onClose={onCloseModifica}>
          <div className="space-y-1">
            <FieldLabel>IMPORTO MENSILE (€)</FieldLabel>
            <FieldInput value={abImporto} onChange={(e) => onChangeAbImporto(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <FieldLabel>GIORNO SCADENZA</FieldLabel>
            <GiornoScadenzaSelect value={abGiorno} onChange={onChangeAbGiorno} />
          </div>
          <button type="button" onClick={onAggiornaAbbonamento} className="w-full rounded-xl bg-brand-navy py-3 text-sm font-semibold text-white">
            Salva
          </button>
          <button type="button" onClick={onCloseModifica} className="w-full py-2 text-sm text-brand-navy/50">Annulla</button>
        </ModalShell>
      ) : null}

      {rataSelezionata ? (
        <ModalShell title={`${MESI_BREVI[rataSelezionata.mese - 1]} ${rataSelezionata.anno}`} onClose={onCloseRata}>
          <div className="space-y-2 rounded-xl bg-brand-bg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-navy/60">Totale</span>
              <span className="font-bold text-brand-navy">€{formatImportoEuro(rataSelezionata.importo, 2)}</span>
            </div>
            {(rataSelezionata.acconto || 0) > 0 ? (
              <div className="flex justify-between">
                <span className="text-brand-navy/60">Già incassato</span>
                <span className="font-bold text-brand-teal">€{formatImportoEuro(rataSelezionata.acconto || 0, 2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-brand-navy/60">Residuo</span>
              <span className="font-bold text-red-500">
                €{formatImportoEuro(rataSelezionata.importo - (rataSelezionata.acconto || 0), 2)}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <FieldLabel>IMPORTO RATA (€)</FieldLabel>
            <FieldInput value={rataImporto} onChange={(e) => onChangeRataImporto(e.target.value)} placeholder="Modifica importo rata" />
          </div>
          <div className="space-y-1">
            <FieldLabel>IMPORTO RICEVUTO ORA (€)</FieldLabel>
            <FieldInput value={pagamentoImporto} onChange={(e) => onChangePagamentoImporto(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <FieldLabel>NOTA (opzionale)</FieldLabel>
            <FieldInput value={pagamentoNota} onChange={(e) => onChangePagamentoNota(e.target.value)} placeholder="es. Bonifico 10 giugno" />
          </div>
          <button type="button" onClick={onConfermaPagamento} className="w-full rounded-xl bg-brand-teal py-3 text-sm font-semibold text-white">
            ✓ Registra pagamento
          </button>
          <button type="button" onClick={onCloseRata} className="w-full py-2 text-sm text-brand-navy/50">Annulla</button>
        </ModalShell>
      ) : null}

      {mostraAggiungiRata ? (
        <ModalShell title="Aggiungi canone" onClose={onCloseAggiungiRata}>
          <div className="space-y-1">
            <FieldLabel>MESE</FieldLabel>
            <MeseInizioSelect value={nuovaRataMese} onChange={onChangeNuovaRataMese} />
          </div>
          <div className="space-y-1">
            <FieldLabel>ANNO</FieldLabel>
            <AnnoSelect value={nuovaRataAnno} onChange={onChangeNuovaRataAnno} />
          </div>
          <div className="space-y-1">
            <FieldLabel>IMPORTO (€)</FieldLabel>
            <FieldInput value={nuovaRataImporto} onChange={(e) => onChangeNuovaRataImporto(e.target.value)} placeholder="es. 500" />
          </div>
          <button type="button" onClick={onConfermaAggiungiRata} className="w-full rounded-xl bg-brand-navy py-3 text-sm font-semibold text-white">
            Aggiungi canone
          </button>
          <button type="button" onClick={onCloseAggiungiRata} className="w-full py-2 text-sm text-brand-navy/50">Annulla</button>
        </ModalShell>
      ) : null}

      {mostraRinomina ? (
        <ModalShell title="Rinomina abbonamento" onClose={onCloseRinomina}>
          <FieldInput value={nomeAbTemp} onChange={(e) => onChangeNomeAbTemp(e.target.value)} placeholder="es. Sito web mensile" autoFocus />
          <button type="button" onClick={onSalvaRinomina} className="w-full rounded-xl bg-brand-navy py-3 text-sm font-semibold text-white">
            Salva
          </button>
          <button type="button" onClick={onCloseRinomina} className="w-full py-2 text-sm text-brand-navy/50">Annulla</button>
        </ModalShell>
      ) : null}
    </>
  );
}
