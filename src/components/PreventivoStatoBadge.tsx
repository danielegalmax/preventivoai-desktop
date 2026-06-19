type Props = {
  stato?: string | null;
  pagato?: boolean;
  pagamentoGestitoDalPiano?: boolean;
  onClick?: () => void;
};

function badgeMeta(stato?: string | null, pagato?: boolean, pagamentoGestitoDalPiano?: boolean) {
  const s = stato || "bozza";
  if (s === "accettato" && !pagamentoGestitoDalPiano) {
    if (pagato) {
      return { label: "pagato", className: "bg-brand-teal text-white font-semibold" };
    }
    return { label: "da incassare", className: "bg-amber-100 text-amber-800 font-semibold" };
  }
  if (s === "accettato") {
    return { label: "accettato", className: "bg-emerald-100 text-gray-600 font-medium" };
  }
  if (s === "rifiutato") return { label: "rifiutato", className: "bg-red-100 text-gray-600" };
  if (s === "inviato") return { label: "inviato", className: "bg-blue-100 text-gray-600" };
  return { label: s, className: "bg-gray-100 text-gray-600" };
}

export default function PreventivoStatoBadge({ stato, pagato, pagamentoGestitoDalPiano, onClick }: Props) {
  const meta = badgeMeta(stato, pagato, pagamentoGestitoDalPiano);
  const className = `rounded-lg px-2 py-0.5 text-xs font-medium ${meta.className} ${
    onClick ? "cursor-pointer hover:opacity-80" : ""
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {meta.label} ▼
      </button>
    );
  }

  return <span className={className}>{meta.label}</span>;
}
