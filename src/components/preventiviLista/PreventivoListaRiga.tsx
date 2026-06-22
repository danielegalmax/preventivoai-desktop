import { Fragment, type MouseEvent } from "react";
import { Link } from "react-router";
import type { Preventivo } from "../../lib/types";
import { formatImporto, formatData, formatOra } from "../../lib/format";
import { etichettaPianoCollegato, normalizzaTipoPiano, type CollegamentiPianoMap } from "../../lib/collegamentiPiano";
import { apriPdfPreventivo } from "../../lib/preventivo";
import { MODIFICA_VERSIONE_ALTERNATIVA_LABEL } from "../../lib/modificaPreventivo/constants";
import { statoFirmaInvio, type PreventivoInvio } from "../../lib/firma";
import CheckboxSelezione from "../CheckboxSelezione";
import PreventivoColonnaRiepilogo from "../PreventivoColonnaRiepilogo";
import FirmaStatoBadge from "../firma/FirmaStatoBadge";

type Props = {
  preventivo: Preventivo;
  variant: "storico" | "cliente";
  colCount: number;
  collegamentiPiano: CollegamentiPianoMap;
  selezionato: boolean;
  espanso: boolean;
  evidenziato: boolean;
  selezioneAttiva: boolean;
  invioFirma: PreventivoInvio | undefined;
  setRowRef: (el: HTMLTableRowElement | null) => void;
  cronologiaApertaId: string | null;
  cronologiaVersioneApertaId: string | null;
  cronologia: Record<string, Preventivo[]>;
  caricandoDettaglioId: string | null;
  onToggleSelezione: () => void;
  onRowClick: (e: MouseEvent, preventivo: Preventivo) => void;
  onStatoPress: () => void;
  onFirma: () => void;
  onFirmaDettaglio: () => void;
  onRinomina: () => void;
  onModifica: () => void;
  onSposta: () => void;
  onSegnaFirmatoSuCarta: () => void;
  onElimina: () => void;
  onToggleCronologia: () => void;
  onToggleCronologiaVersione: (versioneId: string) => void;
  onRipristinaVersione: (versione: Preventivo) => void;
};

function CellDataOra({ valore }: { valore: string | null | undefined }) {
  if (!valore) return <span className="block text-center">-</span>;
  return (
    <div className="text-center leading-tight">
      <span className="block">{formatData(valore)}</span>
      <span className="mt-0.5 block text-xs text-brand-navy/45">{formatOra(valore)}</span>
    </div>
  );
}

export default function PreventivoListaRiga({
  preventivo: p,
  variant,
  colCount,
  collegamentiPiano,
  selezionato,
  espanso,
  evidenziato,
  selezioneAttiva,
  invioFirma,
  setRowRef,
  cronologiaApertaId,
  cronologiaVersioneApertaId,
  cronologia,
  caricandoDettaglioId,
  onToggleSelezione,
  onRowClick,
  onStatoPress,
  onFirma,
  onFirmaDettaglio,
  onRinomina,
  onModifica,
  onSposta,
  onSegnaFirmatoSuCarta,
  onElimina,
  onToggleCronologia,
  onToggleCronologiaVersione,
  onRipristinaVersione,
}: Props) {
  const collegamento = collegamentiPiano[p.id];
  const versioniPrecedenti = (p.versione || 1) - 1;
  const sfFirma = statoFirmaInvio(invioFirma);
  const mostraInviaFirma = !!p.pdf_url && (sfFirma === "nessuno" || sfFirma === "scaduto" || sfFirma === "revocato");

  return (
    <Fragment>
      <tr
        ref={setRowRef}
        onClick={(e) => onRowClick(e, p)}
        className={`border-t border-black/5 cursor-pointer transition-colors ${
          evidenziato
            ? "preventivo-row-focus"
            : espanso
              ? "bg-brand-bg/70"
              : selezionato
                ? "bg-brand-teal/5"
                : "hover:bg-brand-bg/40"
        }`}
      >
        <td className="px-3 py-3" data-no-expand>
          <CheckboxSelezione
            checked={selezionato}
            onChange={onToggleSelezione}
            ariaLabel={`Seleziona ${p.titolo || "preventivo"}`}
          />
        </td>
        {variant === "storico" && (
          <td className="px-5 py-3 text-center text-brand-navy/70">
            <CellDataOra valore={p.created_at} />
          </td>
        )}
        {variant === "storico" && (
          <td className="px-5 py-3">
            {p.cliente_id ? (
              <Link to={`/clienti/${p.cliente_id}`} className="text-brand-navy hover:text-brand-teal">
                {p.nome_cliente}
              </Link>
            ) : (
              <span className="text-brand-navy/70">{p.nome_cliente || "Senza cliente"}</span>
            )}
          </td>
        )}
        <td className="px-5 py-3 text-brand-navy">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 shrink-0 text-xs text-brand-navy/40" aria-hidden>
              {espanso ? "▲" : "▼"}
            </span>
            <div className="min-w-0">
              <p>{p.titolo || "Senza titolo"}</p>
              {collegamento ? (
                <p className="mt-1 text-xs font-semibold text-brand-teal">
                  {normalizzaTipoPiano(collegamento.tipo, collegamento.nomePiano) === "rate" ? "📅 " : "💰 "}
                  {etichettaPianoCollegato(collegamento)}
                </p>
              ) : null}
              <FirmaStatoBadge
                invio={invioFirma}
                onClick={selezioneAttiva ? undefined : onFirmaDettaglio}
              />
            </div>
          </div>
        </td>
        {variant === "cliente" && (
          <td className="px-5 py-3 text-center text-brand-navy/70">
            <CellDataOra valore={p.created_at} />
          </td>
        )}
        <td className="px-5 py-3 align-top" data-no-expand>
          <PreventivoColonnaRiepilogo
            preventivo={p}
            collegamentoPiano={!!collegamento}
            mostraInviaFirma={mostraInviaFirma}
            selezioneAttiva={selezioneAttiva}
            onStatoPress={onStatoPress}
            onPdf={() => apriPdfPreventivo(p)}
            onFirma={onFirma}
            menuAriaLabel={`Altre azioni per ${p.titolo || "preventivo"}`}
            menuVoci={[
              { label: "Rinomina", onClick: onRinomina },
              { label: MODIFICA_VERSIONE_ALTERNATIVA_LABEL, onClick: onModifica },
              { label: "Sposta", onClick: onSposta },
              ...(p.pdf_url && sfFirma !== "firmato"
                ? [{ label: "Segna firmato su carta", onClick: onSegnaFirmatoSuCarta }]
                : []),
              { label: "Elimina", onClick: onElimina, danger: true },
            ]}
          />
        </td>
      </tr>
      {espanso ? (
        <tr className="border-t border-black/5 bg-brand-bg/50">
          <td colSpan={colCount} className="px-5 py-4">
            <div className="space-y-4">
              {collegamento ? (
                <p className="text-xs font-semibold text-brand-teal">
                  {normalizzaTipoPiano(collegamento.tipo, collegamento.nomePiano) === "rate" ? "📅 " : "💰 "}
                  {etichettaPianoCollegato(collegamento)}
                </p>
              ) : null}
              <FirmaStatoBadge
                invio={invioFirma}
                onClick={selezioneAttiva ? undefined : onFirmaDettaglio}
              />
              {caricandoDettaglioId === p.id ? (
                <p className="text-sm text-brand-navy/50">Caricamento testo...</p>
              ) : p.testo_preventivo ? (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-black/5 bg-white p-4 font-mono text-xs leading-relaxed text-brand-navy/70">
                  {p.testo_preventivo}
                </pre>
              ) : (
                <p className="text-sm text-brand-navy/50">Nessun testo disponibile per questo preventivo.</p>
              )}

              {versioniPrecedenti > 0 && p.preventivo_padre_id ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={onToggleCronologia}
                    className="text-sm font-medium text-brand-teal hover:underline"
                  >
                    {cronologiaApertaId === p.id
                      ? "▲ Nascondi cronologia"
                      : `▼ Mostra cronologia (${versioniPrecedenti} vers. precedenti)`}
                  </button>

                  {cronologiaApertaId === p.id && cronologia[p.id]?.map((v) => (
                    <div key={v.id} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => onToggleCronologiaVersione(v.id)}
                        className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-sm hover:bg-brand-bg"
                      >
                        <span className="font-semibold text-brand-navy/50">v{v.versione || 1}</span>
                        <span className="text-brand-navy/50">
                          <CellDataOra valore={v.created_at} />
                        </span>
                        <span className="text-brand-navy/70">{formatImporto(v.importo_totale)}</span>
                      </button>
                      {cronologiaVersioneApertaId === v.id ? (
                        <div className="space-y-3 rounded-lg bg-white p-3">
                          {v.testo_preventivo ? (
                            <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-brand-navy/70">
                              {v.testo_preventivo}
                            </pre>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onRipristinaVersione(v)}
                            className="text-sm font-medium text-brand-teal hover:underline"
                          >
                            Ripristina questa versione
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}
