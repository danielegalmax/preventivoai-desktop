import type { AnalisiPiano } from "preventivoai-shared";

type Props = {
  analisi: AnalisiPiano;
  compact?: boolean;
};

export default function PianoStatoBadge({ analisi, compact }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-lg font-semibold ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"}`}
      style={{ backgroundColor: analisi.badgeBg, color: analisi.badgeColor }}
    >
      {analisi.concluso ? "✓ " : ""}{analisi.label}
    </span>
  );
}
