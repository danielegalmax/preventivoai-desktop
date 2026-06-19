type Props = {
  onClick: () => void;
  className?: string;
};

function IconFirmaMini({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path
        d="M8 17c1.1-1.4 2.2-1.4 3.3 0 1.1 1.4 2.2 1.4 3.3 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function InviaFirmaChip({ onClick, className = "" }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border border-brand-navy/20 bg-brand-navy/[0.07] px-2.5 py-1 text-[11px] font-semibold leading-none text-brand-navy transition-colors hover:border-brand-navy/30 hover:bg-brand-navy/[0.12] ${className}`}
    >
      <IconFirmaMini />
      Invia firma
    </button>
  );
}
