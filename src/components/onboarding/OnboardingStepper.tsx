type Props = {
  stepAttuale: number;
  stepMassimo: number;
  labels: string[];
  onNavigate?: (step: number) => void;
  canNavigate?: (step: number) => boolean;
};

export default function OnboardingStepper({
  stepAttuale,
  stepMassimo,
  labels,
  onNavigate,
  canNavigate,
}: Props) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}
    >
      {labels.map((label, i) => {
        const num = i + 1;
        const attivo = num === stepAttuale;
        const completato = num < stepAttuale;
        const cliccabile = onNavigate && canNavigate?.(i) && i <= stepMassimo;

        return (
          <button
            key={label}
            type="button"
            disabled={!cliccabile}
            onClick={() => cliccabile && onNavigate(i)}
            className={`flex flex-col items-center gap-2 rounded-xl px-2 py-2.5 transition-colors ${
              attivo ? "bg-white/10" : cliccabile ? "hover:bg-white/5" : ""
            } ${cliccabile ? "cursor-pointer" : "cursor-default"}`}
            aria-label={label}
            aria-current={attivo ? "step" : undefined}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                attivo
                  ? "bg-brand-teal text-white"
                  : completato
                    ? "bg-brand-teal/25 text-brand-teal"
                    : "bg-white/10 text-white/45"
              }`}
            >
              {num}
            </span>
            <span
              className={`text-center text-xs font-medium leading-tight ${
                attivo ? "text-white" : completato ? "text-white/70" : "text-white/40"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
