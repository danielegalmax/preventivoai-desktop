import { useEffect, useMemo, useState } from "react";
import { MESI_FULL } from "../../lib/constants";
import { messaggioEliminaPiano, messaggioEliminaRata } from "../../lib/confermeElimina";
import { useConfirmDialog } from "../../lib/hooks/useConfirmDialog";
import { sessioneClienteDettaglio } from "../../lib/clienteDettaglio";
import { formatImportoEuro, parseImportoEuro, ricalcolaImportiRateLibere } from "preventivoai-shared";
import { creaLinkPagamentoRata } from "../../lib/pdf";
import { titoloHeaderPiano, analizzaStatoPiano } from "preventivoai-shared";
import type { Abbonamento, PreventivoMadre, RataAbbonamento } from "../../lib/types";
import PianoStatoBadge from "./PianoStatoBadge";
import PianoEspanso from "./PianoEspanso";
import PianoRateModals from "./PianoRateModals";
import MenuTrePuntini from "../MenuTrePuntini";

function ordinaRate(a: RataAbbonamento, b: RataAbbonamento) {
  return a.anno - b.anno || a.mese - b.mese;
}

export type PianoRateCardProps = {
  abbonamento: Abbonamento;
  indice: number;
  rate: RataAbbonamento[];
  preventivoMadre: PreventivoMadre | null;
  clienteNome: string;
  onApriPreventivoMadre?: (preventivoId: string) => void;
  onPianoAggiornato?: () => void | Promise<void>;
  onOpenPagamento: (rata: RataAbbonamento) => void;
  onAzzeraPagamento: (rataId: string) => void;
  eliminaRate: (rataIds: string[]) => Promise<boolean>;
  modificaImportoPianoRate: (abbonamentoId: string, importo: number) => Promise<boolean>;
  salvaImportiRatePersonalizzati: (abbonamentoId: string, importi: Record<string, number>) => Promise<boolean>;
  eliminaAbbonamento: (abbonamentoId: string) => Promise<void>;
  onRename?: (abbonamentoId: string) => void;
  selezionePianoAttiva?: boolean;
  pianoSelezionato?: boolean;
  onToggleSelezionePiano?: (abbonamentoId: string) => void;
};

export default function PianoRateCard({
  abbonamento,
  indice,
  rate,
  preventivoMadre,
  clienteNome,
  onApriPreventivoMadre,
  onPianoAggiornato,
  onOpenPagamento,
  onAzzeraPagamento,
  eliminaRate,
  modificaImportoPianoRate,
  salvaImportiRatePersonalizzati,
  eliminaAbbonamento,
  onRename,
  selezionePianoAttiva = false,
  pianoSelezionato = false,
  onToggleSelezionePiano,
}: PianoRateCardProps) {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [invioReminderLoading, setInvioReminderLoading] = useState<string | null>(null);
  const [pianoEspanso, setPianoEspanso] = useState(false);
  const [rataMiniAperta, setRataMiniAperta] = useState<string | null>(null);
  const [modificaImporto, setModificaImporto] = useState(false);
  const [personalizzaRate, setPersonalizzaRate] = useState(false);
  const [bozzaImporti, setBozzaImporti] = useState<Record<string, string>>({});
  const [ratePinnate, setRatePinnate] = useState<Record<string, boolean>>({});
  const [nuovoImportoTotale, setNuovoImportoTotale] = useState("");
  const [salvaImportoLoading, setSalvaImportoLoading] = useState(false);
  const [salvaPersonalizzaLoading, setSalvaPersonalizzaLoading] = useState(false);
  const [messaggioSuccesso, setMessaggioSuccesso] = useState<string | null>(null);

  useEffect(() => {
    if (!messaggioSuccesso) return;
    const id = window.setTimeout(() => setMessaggioSuccesso(null), 4000);
    return () => clearTimeout(id);
  }, [messaggioSuccesso]);

  const rateOrdinate = useMemo(() => [...rate].sort(ordinaRate), [rate]);
  const rateFuture = useMemo(() => rateOrdinate.filter((r) => r.stato !== "incassato"), [rateOrdinate]);
  const rateStorico = useMemo(() => rateOrdinate.filter((r) => r.stato === "incassato"), [rateOrdinate]);
  const ratePagate = rateStorico.length;
  const importoPiano = rate.reduce((a, r) => a + r.importo, 0);
  const analisi = useMemo(() => analizzaStatoPiano(abbonamento, rate), [abbonamento, rate]);
  const defaultNome = `Piano a rate N.${indice + 1}`;
  const prossima = rateFuture[0];
  const targetImportoPiano = abbonamento.importo_default ?? importoPiano;
  const sommaIncassateFisse = rateStorico.reduce((a, r) => a + r.importo, 0);
  const sommaBozzaModificabili = rateFuture.reduce((a, r) => {
    const parsed = parseImportoEuro(bozzaImporti[r.id] ?? "");
    return a + (parsed ?? 0);
  }, 0);
  const sommaBozzaTotale = Math.round((sommaIncassateFisse + sommaBozzaModificabili) * 100) / 100;
  const bozzaImportiValidi = rateFuture.every((r) => {
    const parsed = parseImportoEuro(bozzaImporti[r.id] ?? "");
    return parsed !== null && parsed > 0 && parsed >= (r.acconto || 0);
  });
  const bozzaSommaValida = Math.abs(sommaBozzaTotale - targetImportoPiano) <= 0.01;

  function rataBloccataInPersonalizza(rata: RataAbbonamento) {
    return rata.stato === "incassato" || (rata.acconto || 0) > 0;
  }

  function rataPinnataEffettiva(rata: RataAbbonamento) {
    return rataBloccataInPersonalizza(rata) || !!ratePinnate[rata.id];
  }

  const rateLibereCount = rateFuture.filter((r) => !rataBloccataInPersonalizza(r) && !ratePinnate[r.id]).length;

  function apriPersonalizzaRate() {
    const bozza: Record<string, string> = {};
    for (const r of rateFuture) bozza[r.id] = String(r.importo).replace(".", ",");
    setBozzaImporti(bozza);
    setRatePinnate({});
    setPersonalizzaRate(true);
    setModificaImporto(false);
  }

  function ricalcolaRateLibere() {
    const rateModificabili = rateFuture.map((r) => ({
      id: r.id,
      pinnata: rataPinnataEffettiva(r),
      importoBozza: parseImportoEuro(bozzaImporti[r.id] ?? ""),
      accontoMinimo: r.acconto || 0,
    }));
    const result = ricalcolaImportiRateLibere(targetImportoPiano, sommaIncassateFisse, rateModificabili);
    if (!result.ok) {
      window.alert(result.messaggio);
      return;
    }
    setBozzaImporti((b) => {
      const next = { ...b };
      for (const r of rateFuture) {
        if (!rataPinnataEffettiva(r) && result.importi[r.id] !== undefined) {
          next[r.id] = String(result.importi[r.id]).replace(".", ",");
        }
      }
      return next;
    });
  }

  async function salvaPersonalizzaRate() {
    const importi: Record<string, number> = {};
    for (const r of rateFuture) {
      const parsed = parseImportoEuro(bozzaImporti[r.id] ?? "");
      if (parsed === null) {
        window.alert("Controlla gli importi inseriti.");
        return;
      }
      importi[r.id] = parsed;
    }
    setSalvaPersonalizzaLoading(true);
    const ok = await salvaImportiRatePersonalizzati(abbonamento.id, importi);
    setSalvaPersonalizzaLoading(false);
    if (ok) {
      setPersonalizzaRate(false);
      await onPianoAggiornato?.();
    }
  }

  async function inviaReminder(rata: RataAbbonamento) {
    try {
      setInvioReminderLoading(rata.id);
      const session = await sessioneClienteDettaglio();
      if (!session) return;
      const residuo = rata.importo - (rata.acconto || 0);
      const link = await creaLinkPagamentoRata(rata.id, clienteNome, session.access_token);
      const testo = `Ciao ${clienteNome}, ti ricordo il pagamento di €${formatImportoEuro(residuo, 2)} per la rata di ${MESI_FULL[rata.mese - 1]} ${rata.anno}. Puoi pagare qui: ${link}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(testo)}`, "_blank");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Errore invio reminder");
    } finally {
      setInvioReminderLoading(null);
    }
  }

  function apriModificaImporto() {
    setNuovoImportoTotale(String(abbonamento.importo_default ?? importoPiano));
    setModificaImporto(true);
    setPersonalizzaRate(false);
  }

  async function salvaModificaImporto() {
    const val = parseImportoEuro(nuovoImportoTotale);
    if (!val || !(val > 0)) {
      window.alert("Inserisci un importo maggiore di zero.");
      return;
    }
    setSalvaImportoLoading(true);
    const ok = await modificaImportoPianoRate(abbonamento.id, val);
    setSalvaImportoLoading(false);
    if (ok) {
      setModificaImporto(false);
      await onPianoAggiornato?.();
      setMessaggioSuccesso("Le rate non ancora pagate sono state ricalcolate.");
    }
  }

  async function confermaEliminaPiano() {
    const ok = await confirm({
      title: "Elimina piano a rate",
      message: messaggioEliminaPiano("rate"),
    });
    if (!ok) return;
    await eliminaAbbonamento(abbonamento.id);
    await onPianoAggiornato?.();
    setModificaImporto(false);
    setPersonalizzaRate(false);
    setPianoEspanso(false);
  }

  async function handleEliminaRata(rata: RataAbbonamento) {
    const { titolo, messaggio } = messaggioEliminaRata(rata, "rate");
    const ok = await confirm({
      title: titolo,
      message: messaggio,
      confirmLabel: "Elimina",
      cancelLabel: "Annulla",
      destructive: true,
    });
    if (!ok) return;
    await eliminaRate([rata.id]);
    setRataMiniAperta((id) => (id === rata.id ? null : id));
  }

  function togglePianoEspanso() {
    if (selezionePianoAttiva) {
      onToggleSelezionePiano?.(abbonamento.id);
      return;
    }
    setPianoEspanso((v) => !v);
  }

  return (
    <>
    <div className="space-y-3">
      <div
        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 ${
          pianoSelezionato ? "border-brand-teal bg-emerald-50" : analisi.concluso ? "border-emerald-200 bg-emerald-50/50" : "border-black/10 bg-white"
        }`}
      >
        <button type="button" onClick={togglePianoEspanso} className="flex min-w-0 flex-1 items-center gap-3 text-left">
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
                {titoloHeaderPiano(abbonamento.nome, preventivoMadre, "rate", defaultNome)}
              </h3>
              {!selezionePianoAttiva ? <PianoStatoBadge analisi={analisi} compact /> : null}
            </div>
            <p className="mt-1 text-sm text-brand-navy/70">
              {analisi.concluso
                ? `${rate.length}/${rate.length} rate pagate · €${formatImportoEuro(analisi.importoRaccolto, 2)} raccolti`
                : `${ratePagate}/${rate.length} rate pagate · €${formatImportoEuro(analisi.importoRaccolto, 2)} su €${formatImportoEuro(importoPiano, 2)}`}
            </p>
            {analisi.sottotitolo ? (
              <p className={`mt-1 text-xs ${analisi.concluso ? "font-medium text-emerald-700" : "text-brand-navy/40"}`}>
                {analisi.sottotitolo}
              </p>
            ) : null}
            {messaggioSuccesso ? (
              <p className="mt-1 text-sm text-brand-teal">{messaggioSuccesso}</p>
            ) : null}
          </div>
          {!selezionePianoAttiva ? (
            <span className="shrink-0 text-[10px] text-brand-navy/40">{pianoEspanso ? "▲" : "▼"}</span>
          ) : null}
        </button>
        {!selezionePianoAttiva ? (
          <div className="shrink-0" data-no-expand>
            <MenuTrePuntini
              voci={[
                { label: "Rinomina", onClick: () => onRename?.(abbonamento.id), hidden: !onRename },
                { label: "Modifica importo", onClick: apriModificaImporto },
                { label: "Personalizza rate", onClick: apriPersonalizzaRate, hidden: rateFuture.length === 0 },
                { label: "Elimina piano", onClick: confermaEliminaPiano, danger: true },
              ]}
            />
          </div>
        ) : null}
      </div>

      {pianoEspanso && !selezionePianoAttiva ? (
        <PianoEspanso
          abbonamento={abbonamento}
          rate={rate}
          preventivoMadre={preventivoMadre}
          analisi={analisi}
          mode="byStato"
          varianteRiga="rate"
          onApriPreventivoMadre={onApriPreventivoMadre}
          invioReminderLoading={invioReminderLoading}
          rataMiniAperta={rataMiniAperta}
          onToggleRataMini={(rataId) => setRataMiniAperta((id) => id === rataId ? null : rataId)}
          prossimaNonIncassataId={prossima?.id}
          onOpenPagamento={onOpenPagamento}
          onAzzeraPagamento={onAzzeraPagamento}
          onReminder={(rata) => void inviaReminder(rata)}
          onEliminaRata={(rata) => void handleEliminaRata(rata)}
        />
      ) : null}
    </div>
    <PianoRateModals
      mostraModificaImporto={modificaImporto}
      onCloseModificaImporto={() => setModificaImporto(false)}
      nuovoImportoTotale={nuovoImportoTotale}
      onChangeNuovoImportoTotale={setNuovoImportoTotale}
      onSalvaModificaImporto={() => void salvaModificaImporto()}
      salvaImportoLoading={salvaImportoLoading}
      mostraPersonalizzaRate={personalizzaRate}
      onClosePersonalizzaRate={() => setPersonalizzaRate(false)}
      rateOrdinate={rateOrdinate}
      bozzaImporti={bozzaImporti}
      onChangeBozzaImporto={(rataId, v) => setBozzaImporti((b) => ({ ...b, [rataId]: v }))}
      targetImportoPiano={targetImportoPiano}
      sommaBozzaTotale={sommaBozzaTotale}
      bozzaSommaValida={bozzaSommaValida}
      bozzaImportiValidi={bozzaImportiValidi}
      rataPinnataEffettiva={rataPinnataEffettiva}
      onToggleRataPin={(rataId, bloccataAcconto) => {
        if (bloccataAcconto) return;
        setRatePinnate((p) => ({ ...p, [rataId]: !p[rataId] }));
      }}
      onRicalcolaRateLibere={ricalcolaRateLibere}
      rateLibereCount={rateLibereCount}
      onSalvaPersonalizzaRate={() => void salvaPersonalizzaRate()}
      salvaPersonalizzaLoading={salvaPersonalizzaLoading}
    />
    {confirmDialog}
    </>
  );
}
