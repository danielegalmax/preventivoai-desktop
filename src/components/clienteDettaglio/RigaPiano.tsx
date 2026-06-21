import { formatImportoEuro, labelScadenzaRataDaPiano } from "preventivoai-shared";
import type { RataAbbonamento } from "../../lib/types";
import { formatData } from "../../lib/format";

export type VariantePiano = "rate" | "canone";
export type RigaPianoLayout = "completa" | "dettaglio" | "hero";

export type RigaPianoProps = {
  rata: RataAbbonamento;
  variante: VariantePiano;
  layout?: RigaPianoLayout;
  indiceRata?: number;
  titoloCustom?: string;
  aperta?: boolean;
  onToggle?: () => void;
  mostraChevron?: boolean;
  evidenziaCorrente?: boolean;
  invioReminderLoading: string | null;
  mostraReminder: boolean;
  onReminder: () => void;
  onOpenPagamento: (rata: RataAbbonamento) => void;
  onAzzeraPagamento: (rataId: string) => void;
  onElimina: () => void;
  messaggioConfermaAzzera?: string;
  className?: string;
  giornoScadenzaPiano: number;
};

function btnReset(extra = "") {
  return `m-0 border-0 bg-transparent p-0 shadow-none [font:inherit] ${extra}`.trim();
}

function residuoRata(rata: RataAbbonamento) {
  return rata.importo - (rata.acconto || 0);
}

function PagatoIl({ rata, className = "" }: { rata: RataAbbonamento; className?: string }) {
  if (rata.stato !== "incassato" || !rata.data_incasso) return null;
  return (
    <span className={`text-[11px] leading-none text-brand-navy/45 ${className}`.trim()}>
      Pagato il {formatData(rata.data_incasso)}
    </span>
  );
}

export function badgeStato(stato: RataAbbonamento["stato"], variante: VariantePiano) {
  if (stato === "incassato") {
    return {
      label: variante === "rate" ? "Pagata" : "Incassato",
      className: "bg-emerald-100 text-emerald-700",
    };
  }
  if (stato === "in_ritardo") {
    return {
      label: variante === "rate" ? "Scaduta" : "In ritardo",
      className: "bg-red-100 text-red-600",
    };
  }
  if (stato === "parziale") {
    return { label: "Parziale", className: "bg-amber-100 text-amber-700" };
  }
  return {
    label: variante === "rate" ? "Da pagare" : "Da incassare",
    className: "bg-amber-100 text-amber-700",
  };
}

function titoloHeader(
  rata: RataAbbonamento,
  variante: VariantePiano,
  giornoScadenzaPiano: number,
  indiceRata?: number,
  titoloCustom?: string,
) {
  if (titoloCustom) return titoloCustom;
  const scadenza = labelScadenzaRataDaPiano(rata, giornoScadenzaPiano);
  if (variante === "rate" && indiceRata != null) {
    return `Rata ${indiceRata + 1} · ${scadenza}`;
  }
  return scadenza;
}

function messaggioAzzeraDefault(variante: VariantePiano) {
  return variante === "rate"
    ? 'Riportare a "da pagare"?'
    : 'Riportare a "da incassare"?';
}

type DettaglioPianoProps = Pick<
  RigaPianoProps,
  | "rata"
  | "variante"
  | "invioReminderLoading"
  | "mostraReminder"
  | "onReminder"
  | "onOpenPagamento"
  | "onAzzeraPagamento"
  | "onElimina"
  | "messaggioConfermaAzzera"
>;

function DettaglioPiano({
  rata,
  variante,
  invioReminderLoading,
  mostraReminder,
  onReminder,
  onOpenPagamento,
  onAzzeraPagamento,
  onElimina,
  messaggioConfermaAzzera,
}: DettaglioPianoProps) {
  const pagata = rata.stato === "incassato";
  const confermaAzzera = messaggioConfermaAzzera ?? messaggioAzzeraDefault(variante);

  return (
    <div className="space-y-2 border-t border-black/5 pt-3">
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
      <PagatoIl rata={rata} />
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
              if (window.confirm(confermaAzzera)) onAzzeraPagamento(rata.id);
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
  );
}

export default function RigaPiano({
  rata,
  variante,
  layout = "completa",
  indiceRata,
  titoloCustom,
  aperta = false,
  onToggle,
  mostraChevron,
  evidenziaCorrente = false,
  invioReminderLoading,
  mostraReminder,
  onReminder,
  onOpenPagamento,
  onAzzeraPagamento,
  onElimina,
  messaggioConfermaAzzera,
  className = "",
  giornoScadenzaPiano,
}: RigaPianoProps) {
  const badge = badgeStato(rata.stato, variante);
  const titolo = titoloHeader(rata, variante, giornoScadenzaPiano, indiceRata, titoloCustom);
  const chevron = mostraChevron ?? layout === "completa";
  const dettaglioProps = {
    rata,
    variante,
    invioReminderLoading,
    mostraReminder,
    onReminder,
    onOpenPagamento,
    onAzzeraPagamento,
    onElimina,
    messaggioConfermaAzzera,
  };

  if (layout === "dettaglio") {
    return (
      <div className={className}>
        <DettaglioPiano {...dettaglioProps} />
      </div>
    );
  }

  if (layout === "hero") {
    return (
      <div className={`rounded-xl border-2 border-brand-teal bg-white p-4 ${className}`.trim()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-brand-navy">{titolo}</span>
              {evidenziaCorrente ? (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-teal">
                  corrente
                </span>
              ) : null}
            </div>
            {rata.note ? <p className="mt-1 text-xs text-brand-navy/40">{rata.note}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-brand-navy">€{formatImportoEuro(rata.importo, 2)}</p>
            <span className={`mt-1 inline-block rounded-lg px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
            <PagatoIl rata={rata} className="mt-1 block text-right" />
          </div>
        </div>
        <div className="mt-3">
          <DettaglioPiano {...dettaglioProps} />
        </div>
      </div>
    );
  }

  return (
    <div className={`border-t border-black/5 px-3 py-3 ${className}`.trim()}>
      <button type="button" onClick={onToggle} className={btnReset("flex w-full items-center gap-2 text-left text-brand-navy")}>
        <span className="min-w-0 flex-1 text-sm font-medium text-brand-navy">{titolo}</span>
        <span className="text-sm font-semibold text-brand-navy">€{formatImportoEuro(rata.importo, 2)}</span>
        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
        {chevron ? (
          <span className="text-[10px] text-brand-navy/40">{aperta ? "▲" : "▼"}</span>
        ) : null}
      </button>
      <PagatoIl rata={rata} className="mt-1 block text-right" />
      {aperta ? (
        <div className="mt-3">
          <DettaglioPiano {...dettaglioProps} />
        </div>
      ) : null}
    </div>
  );
}
