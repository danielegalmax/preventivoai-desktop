import { useMemo, useState } from "react";
import { MESI_BREVI, MESI_FULL } from "../../lib/constants";
import { messaggioEliminaPiano, messaggioEliminaRata } from "../../lib/confermeElimina";
import { useConfirmDialog } from "../../lib/hooks/useConfirmDialog";
import { sessioneClienteDettaglio } from "../../lib/clienteDettaglio";
import { formatImportoEuro, parseImportoEuro, ricalcolaImportiRateLibere } from "preventivoai-shared";
import { creaLinkPagamentoRata } from "../../lib/pdf";
import { titoloHeaderPiano, analizzaStatoPiano } from "preventivoai-shared";
import type { Abbonamento, PreventivoMadre, RataAbbonamento } from "../../lib/types";
import PianoStatoBadge from "./PianoStatoBadge";
import PreventivoMadreLink from "./PreventivoMadreLink";
import MenuTrePuntini from "../MenuTrePuntini";

function labelScadenza(rata: RataAbbonamento) {
  return `${MESI_BREVI[rata.mese - 1]} ${rata.anno}`;
}

function badgeRata(stato: RataAbbonamento["stato"]) {
  if (stato === "incassato") return { label: "Pagata", className: "bg-emerald-100 text-emerald-700" };
  if (stato === "in_ritardo") return { label: "Scaduta", className: "bg-red-100 text-red-600" };
  if (stato === "parziale") return { label: "Parziale", className: "bg-amber-100 text-amber-700" };
  return { label: "Da pagare", className: "bg-amber-100 text-amber-700" };
}

function ordinaRate(a: RataAbbonamento, b: RataAbbonamento) {
  return a.anno - b.anno || a.mese - b.mese;
}

function residuoRata(rata: RataAbbonamento) {
  return rata.importo - (rata.acconto || 0);
}

type RataRowProps = {
  rata: RataAbbonamento;
  index: number;
  aperta: boolean;
  invioReminderLoading: string | null;
  mostraReminder: boolean;
  onToggle: () => void;
  onOpenPagamento: (rata: RataAbbonamento) => void;
  onAzzeraPagamento: (rataId: string) => void;
  onReminder: () => void;
  onElimina: () => void;
};

function RataRow({
  rata,
  index,
  aperta,
  invioReminderLoading,
  mostraReminder,
  onToggle,
  onOpenPagamento,
  onAzzeraPagamento,
  onReminder,
  onElimina,
}: RataRowProps) {
  const badge = badgeRata(rata.stato);
  const pagata = rata.stato === "incassato";

  return (
    <div className="border-t border-black/5 px-3 py-3">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 text-left">
        <span className="min-w-0 flex-1 text-sm font-medium text-brand-navy">
          Rata {index + 1} · {labelScadenza(rata)}
        </span>
        <span className="text-sm font-semibold text-brand-navy">€{formatImportoEuro(rata.importo, 2)}</span>
        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
        <span className="text-[10px] text-brand-navy/40">{aperta ? "▲" : "▼"}</span>
      </button>
      {aperta ? (
        <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
          {rata.stato === "parziale" ? (
            <div className="space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${((rata.acconto || 0) / rata.importo) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-amber-600">Acconto: €{formatImportoEuro(rata.acconto || 0, 2)}</span>
                <span className="text-red-500">Residuo: €{formatImportoEuro(residuoRata(rata), 2)}</span>
              </div>
            </div>
          ) : null}
          {rata.note ? <p className="text-xs text-brand-navy/40">{rata.note}</p> : null}
          <div className="flex gap-2">
            {!pagata ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenPagamento(rata)}
                  className="flex-1 rounded-xl border border-brand-teal py-2 text-sm font-semibold text-brand-teal"
                >
                  + Registra pagamento
                </button>
                {mostraReminder ? (
                  <button
                    type="button"
                    onClick={onReminder}
                    disabled={invioReminderLoading === rata.id}
                    className="rounded-xl border border-green-500 px-3 py-2 text-sm font-semibold text-green-600 disabled:opacity-50"
                  >
                    {invioReminderLoading === rata.id ? "..." : "WA"}
                  </button>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Riportare a "da pagare"?')) onAzzeraPagamento(rata.id);
                }}
                className="flex-1 rounded-xl border border-black/10 py-2 text-sm text-brand-navy/40"
              >
                ↩ Azzera
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onElimina}
            className="w-full rounded-xl border border-red-200 py-2 text-sm font-medium text-red-600"
          >
            Elimina
          </button>
        </div>
      ) : null}
    </div>
  );
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
  const [futureAperte, setFutureAperte] = useState(true);
  const [storicoAperto, setStoricoAperto] = useState(false);
  const [rataMiniAperta, setRataMiniAperta] = useState<string | null>(null);
  const [modificaImporto, setModificaImporto] = useState(false);
  const [personalizzaRate, setPersonalizzaRate] = useState(false);
  const [bozzaImporti, setBozzaImporti] = useState<Record<string, string>>({});
  const [ratePinnate, setRatePinnate] = useState<Record<string, boolean>>({});
  const [nuovoImportoTotale, setNuovoImportoTotale] = useState("");
  const [salvaImportoLoading, setSalvaImportoLoading] = useState(false);
  const [salvaPersonalizzaLoading, setSalvaPersonalizzaLoading] = useState(false);

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
    setPianoEspanso(true);
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
    setPianoEspanso(true);
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
      window.alert("Le rate non ancora pagate sono state ricalcolate.");
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

  function renderAzioniPiano() {
    if (personalizzaRate) {
      return (
        <div className="space-y-3 rounded-xl border border-black/10 bg-white p-4">
          <p className="text-xs font-semibold tracking-wide text-brand-navy/50 uppercase">Importo per rata</p>
          <p className="text-xs leading-relaxed text-brand-navy/60">
            Fissa le rate che vuoi impostare tu, poi usa Ricalcola rate libere per ripartire il resto su €{formatImportoEuro(targetImportoPiano, 2)}.
          </p>
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
                      onChange={(e) => setBozzaImporti((b) => ({ ...b, [rata.id]: e.target.value }))}
                      className={`w-24 rounded-lg border px-2 py-1.5 text-right text-sm font-semibold ${
                        pinnata ? "border-brand-teal bg-emerald-50" : "border-black/10 bg-brand-bg"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={bloccataAcconto}
                      onClick={() => {
                        if (bloccataAcconto) return;
                        setRatePinnate((p) => ({ ...p, [rata.id]: !p[rata.id] }));
                      }}
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
          <p className={`text-center text-sm font-semibold ${bozzaSommaValida && bozzaImportiValidi ? "text-brand-teal" : "text-red-500"}`}>
            Somma: €{formatImportoEuro(sommaBozzaTotale, 2)} / €{formatImportoEuro(targetImportoPiano, 2)}
          </p>
          <button
            type="button"
            onClick={ricalcolaRateLibere}
            disabled={rateLibereCount === 0}
            className="w-full rounded-xl border border-brand-teal bg-emerald-50 py-2.5 text-sm font-semibold text-brand-teal disabled:opacity-40"
          >
            Ricalcola rate libere
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPersonalizzaRate(false)} className="flex-1 rounded-xl border border-black/10 py-2 text-sm text-brand-navy/60">
              Annulla
            </button>
            <button
              type="button"
              onClick={() => void salvaPersonalizzaRate()}
              disabled={salvaPersonalizzaLoading || !bozzaSommaValida || !bozzaImportiValidi}
              className="flex-1 rounded-xl bg-brand-navy py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {salvaPersonalizzaLoading ? "Salvataggio..." : "Salva rate"}
            </button>
          </div>
        </div>
      );
    }

    if (modificaImporto) {
      return (
        <div className="space-y-3 rounded-xl border border-black/10 bg-white p-4">
          <p className="text-xs font-semibold tracking-wide text-brand-navy/50 uppercase">Nuovo importo totale</p>
          <input
            value={nuovoImportoTotale}
            onChange={(e) => setNuovoImportoTotale(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm"
            placeholder="es. 3000"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setModificaImporto(false)} className="flex-1 rounded-xl border border-black/10 py-2 text-sm text-brand-navy/60">
              Annulla
            </button>
            <button
              type="button"
              onClick={() => void salvaModificaImporto()}
              disabled={salvaImportoLoading}
              className="flex-1 rounded-xl bg-brand-navy py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {salvaImportoLoading ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  function togglePianoEspanso() {
    if (selezionePianoAttiva) {
      onToggleSelezionePiano?.(abbonamento.id);
      return;
    }
    setPianoEspanso((v) => {
      if (v) {
        setModificaImporto(false);
        setPersonalizzaRate(false);
      }
      return !v;
    });
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
        <div className="space-y-3 pb-28 pl-1">
          <div className="h-2 overflow-hidden rounded-full bg-black/5">
            <div
              className={`h-full rounded-full ${analisi.concluso ? "bg-emerald-700" : "bg-brand-teal"}`}
              style={{ width: `${Math.min(100, analisi.progressoPct)}%` }}
            />
          </div>

          <PreventivoMadreLink preventivo={preventivoMadre} onPress={onApriPreventivoMadre} />

          {renderAzioniPiano()}

          {rateFuture.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
              <button
                type="button"
                onClick={() => setFutureAperte((v) => !v)}
                className="flex w-full items-center justify-between bg-brand-bg px-3.5 py-3 text-left"
              >
                <span className="text-xs font-semibold tracking-wide text-brand-navy/50 uppercase">
                  Prossime scadenze ({rateFuture.length})
                </span>
                <span className="text-[10px] text-brand-navy/40">{futureAperte ? "▲" : "▼"}</span>
              </button>
              {futureAperte ? rateFuture.map((rata) => {
                const index = rateOrdinate.findIndex((r) => r.id === rata.id);
                return (
                  <RataRow
                    key={rata.id}
                    rata={rata}
                    index={index}
                    aperta={rataMiniAperta === rata.id}
                    invioReminderLoading={invioReminderLoading}
                    mostraReminder={prossima?.id === rata.id}
                    onToggle={() => setRataMiniAperta((id) => id === rata.id ? null : rata.id)}
                    onOpenPagamento={onOpenPagamento}
                    onAzzeraPagamento={onAzzeraPagamento}
                    onReminder={() => void inviaReminder(rata)}
                    onElimina={() => void handleEliminaRata(rata)}
                  />
                );
              }) : null}
            </div>
          ) : null}

          {rateStorico.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
              <button
                type="button"
                onClick={() => setStoricoAperto((v) => !v)}
                className="flex w-full items-center justify-between bg-brand-bg px-3.5 py-3 text-left"
              >
                <span className="text-xs font-semibold tracking-wide text-brand-navy/50 uppercase">
                  Storico ({rateStorico.length})
                </span>
                <span className="text-[10px] text-brand-navy/40">{storicoAperto ? "▲" : "▼"}</span>
              </button>
              {storicoAperto ? rateStorico.map((rata) => {
                const index = rateOrdinate.findIndex((r) => r.id === rata.id);
                return (
                  <RataRow
                    key={rata.id}
                    rata={rata}
                    index={index}
                    aperta={rataMiniAperta === rata.id}
                    invioReminderLoading={invioReminderLoading}
                    mostraReminder={false}
                    onToggle={() => setRataMiniAperta((id) => id === rata.id ? null : rata.id)}
                    onOpenPagamento={onOpenPagamento}
                    onAzzeraPagamento={onAzzeraPagamento}
                    onReminder={() => void inviaReminder(rata)}
                    onElimina={() => void handleEliminaRata(rata)}
                  />
                );
              }) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
    {confirmDialog}
    </>
  );
}
