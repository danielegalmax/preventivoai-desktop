type Props = {
  stato: string | null | undefined;
  className?: string;
};

type IconProps = { className?: string };

function IconFileText({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
      <path strokeLinecap="round" d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function IconSend({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="m22 2-7 20-4-9-9-4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13" />
    </svg>
  );
}

function IconCheckCircle({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 11 3 3L22 4" />
    </svg>
  );
}

function IconXCircle({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="m15 9-6 6M9 9l6 6" />
    </svg>
  );
}

const STATO_META: Record<string, { Icon: typeof IconFileText; colorClass: string }> = {
  bozza: { Icon: IconFileText, colorClass: "text-gray-500" },
  inviato: { Icon: IconSend, colorClass: "text-blue-600" },
  accettato: { Icon: IconCheckCircle, colorClass: "text-emerald-600" },
  rifiutato: { Icon: IconXCircle, colorClass: "text-red-500" },
};

export default function StatoPreventivoIcon({ stato, className = "h-4 w-4 shrink-0" }: Props) {
  const s = stato ?? "bozza";
  const meta = STATO_META[s] ?? STATO_META.bozza;
  const { Icon, colorClass } = meta;
  return <Icon className={`${className} ${colorClass}`} />;
}
