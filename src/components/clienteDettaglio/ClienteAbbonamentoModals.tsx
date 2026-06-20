import { useRef, useMemo } from "react";
import type { Preventivo, RataAbbonamento } from "../../lib/types";
import { MESI_BREVI } from "../../lib/constants";
import { formatImportoEuro, parseImportoEuro } from "preventivoai-shared";
import { AnnoSelect, GiornoScadenzaSelect, MeseInizioSelect } from "../pickers/DatePartPickers";
import PreventivoPicker from "./PreventivoPicker";
import {
  calcolaAccontoSaldoPiano,
  type RateAccontoTipo,
  type RateModalitaPiano,
} from "preventivoai-shared";

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
  rateModalita: RateModalitaPiano;
  onChangeRateModalita: (v: RateModalitaPiano) => void;
  rateAccontoTipo: RateAccontoTipo;
  onChangeRateAccontoTipo: (v: RateAccontoTipo) => void;
  rateAccontoValore: string;
  onChangeRateAccontoValore: (v: string) => void;
  preventiviDisponibiliRate: Preventivo[];
  preventivoRateSelezionatoId: string | null;
  onSelectPreventivoRate: (id: string | null) => void;
  onCreaPianoRate: () => void;

  mostraModifica: boolean;
  onCloseModifica: () => void;
  onAggiornaAbbonamento: () => void;
  mostraSceltaApplicaCanone: boolean;
  onCloseSceltaApplicaCanone: () => void;
  onApplicaSoloProssimiCanoni: () => void;
  onApplicaAncheCanoniEsistenti: () => void;

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
  rateModalita,
  onChangeRateModalita,
  rateAccontoTipo,
  onChangeRateAccontoTipo,
  rateAccontoValore,
  onChangeRateAccontoValore,
  preventiviDisponibiliRate,
  preventivoRateSelezionatoId,
  onSelectPreventivoRate,
  onCreaPianoRate,
  mostraModifica,
  onCloseModifica,
  onAggiornaAbbonamento,
  mostraSceltaApplicaCanone,
  onCloseSceltaApplicaCanone,
  onApplicaSoloProssimiCanoni,
  onApplicaAncheCanoniEsistenti,
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
  const importoTotaleParsed = parseImportoEuro(rateImportoTotale);
  const anteprimaAccontoSaldo = useMemo(() => {
    if (rateModalita !== "acconto_saldo" || importoTotaleParsed === null || !(importoTotaleParsed > 0)) {
      return null;
    }
    return calcolaAccontoSaldoPiano(importoTotaleParsed, rateAccontoTipo, rateAccontoValore);
  }, [rateModalita, importoTotaleParsed, rateAccontoTipo, rateAccontoValore]);

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
          <div className="space-y-2">
            <FieldLabel>MODALITÀ</FieldLabel>
            <OptionToggle
              options={[
                { key: "rate_uguali" as const, label: "Rate uguali" },
                { key: "acconto_saldo" as const, label: "Acconto + saldo" },
              ]}
              value={rateModalita}
              onChange={onChangeRateModalita}
            />
          </div>
          {rateModalita === "rate_uguali" ? (
            <div className="space-y-1">
              <FieldLabel>N° RATE (min. 2)</FieldLabel>
              <FieldInput value={rateNumero} onChange={(e) => onChangeRateNumero(e.target.value)} placeholder="es. 6" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <FieldLabel>TIPO ACCONTO</FieldLabel>
                <OptionToggle
                  options={[
                    { key: "fisso" as const, label: "Importo fisso (€)" },
                    { key: "percentuale" as const, label: "Percentuale (%)" },
                  ]}
                  value={rateAccontoTipo}
                  onChange={onChangeRateAccontoTipo}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel>{rateAccontoTipo === "fisso" ? "IMPORTO ACCONTO (€)" : "PERCENTUALE ACCONTO (%)"}</FieldLabel>
                <FieldInput
                  value={rateAccontoValore}
                  onChange={(e) => onChangeRateAccontoValore(e.target.value)}
                  placeholder={rateAccontoTipo === "fisso" ? "es. 500" : "es. 30"}
                  inputMode={rateAccontoTipo === "fisso" ? "decimal" : "numeric"}
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
                    {rateAccontoTipo === "fisso"
                      ? "Inserisci un acconto maggiore di zero e minore del totale."
                      : "Inserisci una percentuale tra 1 e 99."}
                  </span>
                )}
              </div>
            </>
          )}
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

      {mostraSceltaApplicaCanone ? (
        <ModalShell title="Applica nuovo importo" onClose={onCloseSceltaApplicaCanone} zClass="z-[60]">
          <p className="text-sm leading-relaxed text-brand-navy/70">
            Stai modificando l&apos;importo del canone. I canoni già incassati non vengono mai modificati.
            Come vuoi applicare il nuovo importo?
          </p>
          <button
            type="button"
            onClick={onApplicaSoloProssimiCanoni}
            className="w-full rounded-xl border border-brand-teal py-3 text-sm font-semibold text-brand-teal"
          >
            Applica solo ai prossimi canoni
          </button>
          <button
            type="button"
            onClick={onApplicaAncheCanoniEsistenti}
            className="w-full rounded-xl bg-brand-navy py-3 text-sm font-semibold text-white"
          >
            Applica anche ai canoni già generati
          </button>
          <button type="button" onClick={onCloseSceltaApplicaCanone} className="w-full py-2 text-sm text-brand-navy/50">
            Annulla
          </button>
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
