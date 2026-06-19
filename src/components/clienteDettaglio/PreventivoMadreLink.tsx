import { dataPreventivoMadre, titoloPreventivoMadre } from "../../lib/preventivoMadre";

export type PreventivoMadreInfo = {
  id: string;
  titolo: string | null;
  created_at: string;
  versione?: number | null;
};

type Props = {
  preventivo: PreventivoMadreInfo | null;
  onPress?: (preventivoId: string) => void;
};

export default function PreventivoMadreLink({ preventivo, onPress }: Props) {
  const content = (
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold tracking-wide text-brand-navy/40 uppercase">Preventivo madre</p>
      {preventivo ? (
        <div className="mt-1 flex min-w-0 items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className={`truncate text-sm font-medium text-brand-navy ${onPress ? "text-brand-teal" : ""}`}>
              {titoloPreventivoMadre(preventivo)}
            </p>
            {onPress ? (
              <p className="mt-0.5 text-[11px] text-brand-navy/45">Vai al preventivo nella lista →</p>
            ) : null}
          </div>
          {dataPreventivoMadre(preventivo) ? (
            <span className="shrink-0 text-xs text-brand-navy/50">{dataPreventivoMadre(preventivo)}</span>
          ) : null}
        </div>
      ) : (
        <p className="mt-1 text-sm italic text-brand-navy/40">Non collegato</p>
      )}
    </div>
  );

  if (onPress && preventivo) {
    return (
      <button
        type="button"
        onClick={() => onPress(preventivo.id)}
        className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-brand-bg px-3.5 py-3 text-left hover:border-brand-teal/30"
      >
        {content}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-brand-teal">→</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-brand-bg px-3.5 py-3">
      {content}
    </div>
  );
}
