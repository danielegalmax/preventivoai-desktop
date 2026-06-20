import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { MESI_FULL } from "../../lib/constants";
import { messaggioEliminaPiano, messaggioEliminaRata } from "../../lib/confermeElimina";
import { useConfirmDialog } from "../../lib/hooks/useConfirmDialog";
import { sessioneClienteDettaglio } from "../../lib/clienteDettaglio";
import { formatImportoEuro } from "preventivoai-shared";
import { creaLinkPagamentoRata } from "../../lib/pdf";
import { titoloHeaderPiano, analizzaStatoPiano, ordinaPianiPerStato } from "preventivoai-shared";
import type { Abbonamento, PreventivoMadre, RataAbbonamento } from "../../lib/types";
import PianoStatoBadge from "./PianoStatoBadge";
import PianoVuotoState from "./PianoVuotoState";
import PianoEspanso from "./PianoEspanso";
import MenuTrePuntini from "../MenuTrePuntini";

type Props = {
  loading: boolean;
  abbonamentiAttivi: Abbonamento[];
  ratePerPiano: Record<string, RataAbbonamento[]>;
  preventiviMadreStorico: Record<string, PreventivoMadre>;
  clienteNome: string;
  onApriPreventivoMadre?: (preventivoId: string) => void;
  meseCorrente: number;
  annoCorrente: number;
  pianoEspansoId: string | null;
  setPianoEspansoId: Dispatch<SetStateAction<string | null>>;
  onRename: (abbonamentoId: string) => void;
  onOpenAddRata: (abbonamentoId: string) => void;
  onOpenPagamento: (rata: RataAbbonamento) => void;
  onAzzeraPagamento: (rataId: string) => void;
  eliminaRate: (rataIds: string[]) => Promise<boolean>;
  onEditCanone: (abbonamentoId: string) => void;
  onDeleteAbbonamento: (abbonamentoId: string) => void;
  selezionePianoAttiva: boolean;
  pianiSelezionati: string[];
  onToggleSelezionePiano: (abbonamentoId: string) => void;
};

function ordinaRateCronologica(a: RataAbbonamento, b: RataAbbonamento) {
  return a.anno - b.anno || a.mese - b.mese;
}

type PianoCardProps = {
  abbonamento: Abbonamento;
  indice: number;
  preventivoMadre: PreventivoMadre | null;
  rate: RataAbbonamento[];
  espanso: boolean;
  meseCorrente: number;
  annoCorrente: number;
  invioReminderLoading: string | null;
  clienteNome: string;
  onApriPreventivoMadre?: (preventivoId: string) => void;
  onToggleEspanso: () => void;
  onRename: () => void;
  onOpenAddRata: () => void;
  onOpenPagamento: (rata: RataAbbonamento) => void;
  onSendReminder: (rata: RataAbbonamento) => void;
  onAzzeraPagamento: (rataId: string) => void;
  onEliminaRata: (rata: RataAbbonamento) => Promise<void>;
  onEditCanone: () => void;
  onDeleteAbbonamento: () => void;
  selezionePianoAttiva: boolean;
  pianoSelezionato: boolean;
  onToggleSelezionePiano: () => void;
};

function AbbonamentoPianoCard({
  abbonamento,
  indice,
  preventivoMadre,
  rate,
  espanso,
  meseCorrente,
  annoCorrente,
  invioReminderLoading,
  onApriPreventivoMadre,
  onToggleEspanso,
  onRename,
  onOpenAddRata,
  onOpenPagamento,
  onSendReminder,
  onAzzeraPagamento,
  onEliminaRata,
  onEditCanone,
  onDeleteAbbonamento,
  selezionePianoAttiva,
  pianoSelezionato,
  onToggleSelezionePiano,
}: PianoCardProps) {
  const [rataMiniAperta, setRataMiniAperta] = useState<string | null>(null);

  const analisi = useMemo(() => analizzaStatoPiano(abbonamento, rate), [abbonamento, rate]);
  const prossimaNonIncassata = useMemo(
    () => [...rate].sort(ordinaRateCronologica).find((r) => r.stato !== "incassato"),
    [rate],
  );
  const defaultNome = `Abbonamento N.${indice + 1}`;

  async function eliminaRataDaDettaglio(rata: RataAbbonamento) {
    await onEliminaRata(rata);
    setRataMiniAperta((id) => (id === rata.id ? null : id));
  }

  const cardEspansa = espanso && !selezionePianoAttiva;

  return (
    <div
      className={`rounded-2xl border ${
        pianoSelezionato ? "border-brand-teal bg-emerald-50" : analisi.concluso ? "border-emerald-200 bg-emerald-50/50" : "border-black/10 bg-white"
      }${cardEspansa ? " border-l-[3px] border-l-brand-teal" : ""}`}
    >
      <div className="flex w-full items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => {
            if (selezionePianoAttiva) {
              onToggleSelezionePiano();
              return;
            }
            onToggleEspanso();
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {selezionePianoAttiva ? (
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
              pianoSelezionato ? "border-brand-teal bg-brand-teal text-white" : "border-black/20"
            }`}>
              {pianoSelezionato ? "✓" : ""}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-bold text-brand-navy">
                {titoloHeaderPiano(abbonamento.nome, preventivoMadre, "canone", defaultNome)}
              </h3>
              {!selezionePianoAttiva ? <PianoStatoBadge analisi={analisi} compact /> : null}
            </div>
            <p className="mt-1 text-xs text-brand-navy/50">
              {analisi.concluso
                ? `Canone completato · €${formatImportoEuro(analisi.importoRaccolto, 2)} incassati`
                : `Canone mensile · €${formatImportoEuro(abbonamento.importo_default, 2)}/mese · giorno ${abbonamento.giorno_scadenza}`}
            </p>
            {analisi.sottotitolo ? (
              <p className={`mt-1 text-xs ${analisi.concluso ? "font-medium text-emerald-700" : "text-brand-teal"}`}>
                {analisi.sottotitolo}
              </p>
            ) : analisi.importoRaccolto > 0 && !analisi.concluso ? (
              <p className="mt-1 text-xs font-medium text-brand-teal">€{formatImportoEuro(analisi.importoRaccolto, 2)} incassati</p>
            ) : null}
          </div>
          {!selezionePianoAttiva ? (
            <span className="shrink-0 text-[10px] text-brand-navy/40">{espanso ? "▲" : "▼"}</span>
          ) : null}
        </button>
        {!selezionePianoAttiva ? (
          <div className="shrink-0" data-no-expand>
            <MenuTrePuntini
              voci={[
                { label: "Rinomina", onClick: onRename },
                { label: "Modifica canone", onClick: onEditCanone },
                { label: "Elimina", onClick: () => void onDeleteAbbonamento(), danger: true },
              ]}
            />
          </div>
        ) : null}
      </div>

      {cardEspansa ? (
        <div className="border-t border-black/5">
          <PianoEspanso
          abbonamento={abbonamento}
          rate={rate}
          preventivoMadre={preventivoMadre}
          analisi={analisi}
          mode="byCalendario"
          varianteRiga="canone"
          meseCorrente={meseCorrente}
          annoCorrente={annoCorrente}
          onApriPreventivoMadre={onApriPreventivoMadre}
          invioReminderLoading={invioReminderLoading}
          rataMiniAperta={rataMiniAperta}
          onToggleRataMini={(rataId) => setRataMiniAperta((id) => id === rataId ? null : rataId)}
          prossimaNonIncassataId={prossimaNonIncassata?.id}
          onOpenPagamento={onOpenPagamento}
          onAzzeraPagamento={onAzzeraPagamento}
          onReminder={(rata) => void onSendReminder(rata)}
          onEliminaRata={(rata) => void eliminaRataDaDettaglio(rata)}
          onAggiungiCanone={onOpenAddRata}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function ClienteAbbonamentoTab({
  loading,
  abbonamentiAttivi,
  ratePerPiano,
  preventiviMadreStorico,
  clienteNome,
  onApriPreventivoMadre,
  meseCorrente,
  annoCorrente,
  pianoEspansoId,
  setPianoEspansoId,
  onRename,
  onOpenAddRata,
  onOpenPagamento,
  onAzzeraPagamento,
  eliminaRate,
  onEditCanone,
  onDeleteAbbonamento,
  selezionePianoAttiva,
  pianiSelezionati,
  onToggleSelezionePiano,
}: Props) {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [invioReminderLoading, setInvioReminderLoading] = useState<string | null>(null);

  const pianiOrdinati = useMemo(
    () => ordinaPianiPerStato(abbonamentiAttivi, ratePerPiano, (id) => abbonamentiAttivi.find((a) => a.id === id)),
    [abbonamentiAttivi, ratePerPiano],
  );

  const pianiAttivi = useMemo(
    () => pianiOrdinati.filter((a) => !analizzaStatoPiano(a, ratePerPiano[a.id] || []).concluso),
    [pianiOrdinati, ratePerPiano],
  );

  const pianiConclusi = useMemo(
    () => pianiOrdinati.filter((a) => analizzaStatoPiano(a, ratePerPiano[a.id] || []).concluso),
    [pianiOrdinati, ratePerPiano],
  );

  function handleToggleEspanso(abbonamentoId: string) {
    const espansoOra =
      pianoEspansoId === abbonamentoId
      || (pianoEspansoId === null && pianiAttivi[0]?.id === abbonamentoId);
    setPianoEspansoId(espansoOra ? "" : abbonamentoId);
  }

  async function handleEliminaRata(rata: RataAbbonamento) {
    const { titolo, messaggio } = messaggioEliminaRata(rata, "canone");
    const ok = await confirm({
      title: titolo,
      message: messaggio,
      confirmLabel: "Elimina",
      cancelLabel: "Annulla",
      destructive: true,
    });
    if (!ok) return;
    await eliminaRate([rata.id]);
  }

  async function inviaReminder(rata: RataAbbonamento) {
    try {
      setInvioReminderLoading(rata.id);
      const session = await sessioneClienteDettaglio();
      if (!session) return;
      const residuo = rata.importo - (rata.acconto || 0);
      const link = await creaLinkPagamentoRata(rata.id, clienteNome, session.access_token);
      const testo = `Ciao ${clienteNome}, ti ricordo il pagamento di €${formatImportoEuro(residuo, 2)} per il canone di ${MESI_FULL[rata.mese - 1]} ${rata.anno}. Puoi pagare qui: ${link}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(testo)}`, "_blank");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Errore invio reminder");
    } finally {
      setInvioReminderLoading(null);
    }
  }

  if (loading) return <p className="py-10 text-center text-brand-navy/50">Caricamento abbonamenti...</p>;

  if (abbonamentiAttivi.length === 0) {
    return (
      <PianoVuotoState
        emoji="💰"
        title="Nessun abbonamento"
        description="Configura un canone mensile ricorrente per questo cliente: importo fisso, scadenza e rate mensili automatiche."
      />
    );
  }

  function renderCard(abbonamento: Abbonamento, indice: number) {
    const rate = ratePerPiano[abbonamento.id] || [];
    const preventivoMadre = abbonamento.preventivo_id
      ? preventiviMadreStorico[abbonamento.preventivo_id] ?? null
      : null;
    const espanso = pianoEspansoId === abbonamento.id
      || (pianoEspansoId === null && indice === 0 && pianiAttivi[0]?.id === abbonamento.id);

    return (
      <AbbonamentoPianoCard
        key={abbonamento.id}
        abbonamento={abbonamento}
        indice={indice}
        preventivoMadre={preventivoMadre}
        rate={rate}
        espanso={espanso}
        meseCorrente={meseCorrente}
        annoCorrente={annoCorrente}
        invioReminderLoading={invioReminderLoading}
        clienteNome={clienteNome}
        onApriPreventivoMadre={onApriPreventivoMadre}
        onToggleEspanso={() => handleToggleEspanso(abbonamento.id)}
        onRename={() => onRename(abbonamento.id)}
        onOpenAddRata={() => onOpenAddRata(abbonamento.id)}
        onOpenPagamento={onOpenPagamento}
        onSendReminder={(r) => void inviaReminder(r)}
        onAzzeraPagamento={onAzzeraPagamento}
        onEliminaRata={handleEliminaRata}
        onEditCanone={() => onEditCanone(abbonamento.id)}
        onDeleteAbbonamento={async () => {
          const ok = await confirm({
            title: "Elimina abbonamento",
            message: messaggioEliminaPiano("canone"),
          });
          if (ok) await onDeleteAbbonamento(abbonamento.id);
        }}
        selezionePianoAttiva={selezionePianoAttiva}
        pianoSelezionato={pianiSelezionati.includes(abbonamento.id)}
        onToggleSelezionePiano={() => onToggleSelezionePiano(abbonamento.id)}
      />
    );
  }

  return (
    <>
    <div className="space-y-3">
      {pianiAttivi.map((ab, i) => renderCard(ab, i))}
      {pianiConclusi.length > 0 ? (
        <>
          <p className="pt-2 text-[11px] font-semibold tracking-wide text-brand-navy/40 uppercase">
            {pianiConclusi.length === 1 ? "Concluso" : `Conclusi (${pianiConclusi.length})`}
          </p>
          {pianiConclusi.map((ab, i) => renderCard(ab, pianiAttivi.length + i))}
        </>
      ) : null}
    </div>
    {confirmDialog}
    </>
  );
}
