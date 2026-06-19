import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { MESI_BREVI, MESI_FULL } from "../../lib/constants";
import { messaggioEliminaPiano } from "../../lib/confermeElimina";
import { useConfirmDialog } from "../../lib/hooks/useConfirmDialog";
import { sessioneClienteDettaglio } from "../../lib/clienteDettaglio";
import { formatImportoEuro } from "../../lib/importo";
import { creaLinkPagamentoRata } from "../../lib/pdf";
import { titoloHeaderPiano } from "../../lib/preventivoMadre";
import { analizzaStatoPiano, ordinaPianiPerStato } from "../../lib/statoPiano";
import type { Abbonamento, PreventivoMadre, RataAbbonamento } from "../../lib/types";
import PianoStatoBadge from "./PianoStatoBadge";
import PianoVuotoState from "./PianoVuotoState";
import PreventivoMadreLink from "./PreventivoMadreLink";
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
  onEditCanone: (abbonamentoId: string) => void;
  onDeleteAbbonamento: (abbonamentoId: string) => void;
  selezionePianoAttiva: boolean;
  pianiSelezionati: string[];
  onToggleSelezionePiano: (abbonamentoId: string) => void;
};

function badgeCanone(stato: RataAbbonamento["stato"]) {
  if (stato === "incassato") return { label: "Incassato", className: "bg-emerald-100 text-emerald-700" };
  if (stato === "in_ritardo") return { label: "In ritardo", className: "bg-red-100 text-red-600" };
  if (stato === "parziale") return { label: "Parziale", className: "bg-amber-100 text-amber-700" };
  return { label: "Da incassare", className: "bg-gray-100 text-gray-500" };
}

function labelScadenza(rata: RataAbbonamento) {
  return `${MESI_BREVI[rata.mese - 1]} ${rata.anno}`;
}

function residuoRata(rata: RataAbbonamento) {
  return rata.importo - (rata.acconto || 0);
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
  onEditCanone,
  onDeleteAbbonamento,
  selezionePianoAttiva,
  pianoSelezionato,
  onToggleSelezionePiano,
}: PianoCardProps) {
  const [storicoAperto, setStoricoAperto] = useState(false);
  const [rataMiniAperta, setRataMiniAperta] = useState<string | null>(null);

  const rataMeseCorrente = rate.find((r) => r.mese === meseCorrente && r.anno === annoCorrente);
  const rateStoriche = rate.filter((r) => !(r.mese === meseCorrente && r.anno === annoCorrente));
  const rateStoricheOrdinate = useMemo(
    () => [...rateStoriche].sort((a, b) => b.anno - a.anno || b.mese - a.mese),
    [rateStoriche],
  );
  const totaleIncassato = rate.filter((r) => r.stato === "incassato").reduce((a, r) => a + r.importo, 0);
  const analisi = useMemo(() => analizzaStatoPiano(abbonamento, rate), [abbonamento, rate]);
  const badgeCorrente = rataMeseCorrente ? badgeCanone(rataMeseCorrente.stato) : null;
  const defaultNome = `Abbonamento N.${indice + 1}`;

  function renderRataDetail(rata: RataAbbonamento) {
    return (
      <div className="space-y-2 border-t border-black/5 pt-3">
        {rata.stato === "parziale" ? (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${((rata.acconto || 0) / rata.importo) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-amber-600">Acconto: €{formatImportoEuro(rata.acconto || 0, 2)}</span>
              <span className="text-red-500">Residuo: €{formatImportoEuro(residuoRata(rata), 2)}</span>
            </div>
          </div>
        ) : null}
        {rata.note ? <p className="text-xs text-brand-navy/40">{rata.note}</p> : null}
        <div className="flex gap-2">
          {rata.stato !== "incassato" ? (
            <>
              <button type="button" onClick={() => onOpenPagamento(rata)} className="flex-1 rounded-xl border border-brand-teal py-2 text-sm font-semibold text-brand-teal">
                + Registra pagamento
              </button>
              <button
                type="button"
                onClick={() => onSendReminder(rata)}
                disabled={invioReminderLoading === rata.id}
                className="rounded-xl border border-green-500 px-3 py-2 text-sm font-semibold text-green-600 disabled:opacity-50"
              >
                {invioReminderLoading === rata.id ? "..." : "WA"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Riportare a "da incassare"?')) onAzzeraPagamento(rata.id);
              }}
              className="flex-1 rounded-xl border border-black/10 py-2 text-sm text-brand-navy/40"
            >
              ↩ Azzera
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 ${
          pianoSelezionato ? "border-brand-teal bg-emerald-50" : analisi.concluso ? "border-emerald-200 bg-emerald-50/50" : "border-black/10 bg-white"
        }`}
      >
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
                ? `Canone completato · €${formatImportoEuro(totaleIncassato, 2)} incassati`
                : `Canone mensile · €${formatImportoEuro(abbonamento.importo_default, 2)}/mese · giorno ${abbonamento.giorno_scadenza}`}
            </p>
            {analisi.sottotitolo ? (
              <p className={`mt-1 text-xs ${analisi.concluso ? "font-medium text-emerald-700" : "text-brand-teal"}`}>
                {analisi.sottotitolo}
              </p>
            ) : totaleIncassato > 0 && !analisi.concluso ? (
              <p className="mt-1 text-xs font-medium text-brand-teal">€{formatImportoEuro(totaleIncassato, 2)} incassati</p>
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

      {espanso && !selezionePianoAttiva ? (
        <div className="space-y-3 pl-1">
          <PreventivoMadreLink preventivo={preventivoMadre} onPress={onApriPreventivoMadre} />

          {rataMeseCorrente ? (
            <div className="rounded-xl border-2 border-brand-teal bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-brand-navy">{labelScadenza(rataMeseCorrente)}</span>
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-teal">corrente</span>
                  </div>
                  {rataMeseCorrente.note ? <p className="mt-1 text-xs text-brand-navy/40">{rataMeseCorrente.note}</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-navy">€{formatImportoEuro(rataMeseCorrente.importo, 2)}</p>
                  {badgeCorrente ? (
                    <span className={`mt-1 inline-block rounded-lg px-2 py-0.5 text-[10px] font-semibold ${badgeCorrente.className}`}>
                      {badgeCorrente.label}
                    </span>
                  ) : null}
                </div>
              </div>
              {renderRataDetail(rataMeseCorrente)}
            </div>
          ) : (
            <button type="button" onClick={onOpenAddRata} className="w-full rounded-xl border border-black/10 bg-brand-bg py-2.5 text-sm font-medium text-brand-teal">
              + Aggiungi canone {MESI_BREVI[meseCorrente - 1]} {annoCorrente}
            </button>
          )}

          {rateStoricheOrdinate.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
              <button
                type="button"
                onClick={() => setStoricoAperto((v) => !v)}
                className="flex w-full items-center justify-between bg-brand-bg px-3.5 py-3"
              >
                <span className="text-xs font-semibold tracking-wide text-brand-navy/50 uppercase">
                  Storico canoni ({rateStoricheOrdinate.length})
                </span>
                <span className="text-[10px] text-brand-navy/40">{storicoAperto ? "▲" : "▼"}</span>
              </button>
              {storicoAperto ? rateStoricheOrdinate.map((rata) => {
                const badge = badgeCanone(rata.stato);
                const aperta = rataMiniAperta === rata.id;
                return (
                  <div key={rata.id} className="border-t border-black/5 px-3 py-3">
                    <button type="button" onClick={() => setRataMiniAperta((id) => id === rata.id ? null : rata.id)} className="flex w-full items-center gap-2 text-left">
                      <span className="flex-1 text-sm font-medium text-brand-navy">{labelScadenza(rata)}</span>
                      <span className="text-sm font-semibold">€{formatImportoEuro(rata.importo, 2)}</span>
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
                      <span className="text-[10px] text-brand-navy/40">{aperta ? "▲" : "▼"}</span>
                    </button>
                    {aperta ? <div className="mt-3">{renderRataDetail(rata)}</div> : null}
                  </div>
                );
              }) : null}
            </div>
          ) : null}

          <button type="button" onClick={onOpenAddRata} className="w-full py-2 text-sm font-medium text-brand-teal">
            + Aggiungi canone (mese/anno)
          </button>
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
