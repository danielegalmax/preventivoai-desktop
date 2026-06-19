import { formatImportoEuroVisuale } from "../lib/builder";

type Props = {
  totale: number;
  buttonLabel: string;
  disabled?: boolean;
  onPress: () => void;
};

export default function BuilderFooterBar({ totale, buttonLabel, disabled, onPress }: Props) {
  return (
    <div className="fixed bottom-0 left-56 right-0 z-30 border-t border-edge bg-surface px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold text-ink">Totale:</span>
          <span className="text-lg font-bold text-brand-teal">€{formatImportoEuroVisuale(totale)}</span>
        </div>
        <button
          type="button"
          onClick={onPress}
          disabled={disabled}
          className="w-full rounded-2xl bg-brand-navy px-4 py-3.5 text-base font-semibold text-white disabled:opacity-40"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
