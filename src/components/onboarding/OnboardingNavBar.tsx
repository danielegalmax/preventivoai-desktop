type Props = {

  showBack?: boolean;

  onBack?: () => void;

  onNext: () => void;

  nextLabel: string;

  nextDisabled?: boolean;

  loading?: boolean;

  onSkip?: () => void;

  skipLabel?: string;

};



export default function OnboardingNavBar({

  showBack,

  onBack,

  onNext,

  nextLabel,

  nextDisabled,

  loading,

  onSkip,

  skipLabel = "Salta",

}: Props) {

  return (

    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/10 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">

      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">

        {showBack && (

          <button

            type="button"

            onClick={onBack}

            className="shrink-0 rounded-xl border border-black/10 px-6 py-3 text-sm font-semibold text-brand-navy/70 hover:bg-brand-bg"

          >

            Indietro

          </button>

        )}

        {onSkip && (

          <button

            type="button"

            onClick={onSkip}

            disabled={loading}

            className="shrink-0 rounded-xl border border-brand-navy/20 px-6 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-bg disabled:opacity-50"

          >

            {skipLabel}

          </button>

        )}

        <button

          type="button"

          disabled={nextDisabled || loading}

          onClick={onNext}

          className="flex-1 rounded-xl bg-brand-teal py-3 text-sm font-semibold text-white hover:bg-brand-teal/90 disabled:cursor-not-allowed disabled:opacity-50"

        >

          {loading ? "Salvataggio..." : nextLabel}

        </button>

      </div>

    </div>

  );

}

