import { formatImportoEuro } from "preventivoai-shared";

type Props = {
  preventiviCount: number;
  fatturato: number;
  fatturatoLoading?: boolean;
  fatturatoErrore?: string | null;
  abbonamentoTotale: number;
  abbonamentoAttivo: boolean;
};

export default function ClienteStats({
  preventiviCount,
  fatturato,
  fatturatoLoading = false,
  fatturatoErrore = null,
  abbonamentoTotale,
  abbonamentoAttivo,
}: Props) {
  const cards = [
    {
      label: "Preventivi",
      value: String(preventiviCount),
      accent: false,
    },
    {
      label: "Fatturato",
      value: fatturatoErrore
        ? "Non disponibile"
        : fatturatoLoading
          ? "..."
          : `€${formatImportoEuro(fatturato, 2)}`,
      accent: !fatturatoErrore,
      hint: fatturatoErrore,
    },
    {
      label: "Abbonamento",
      value: abbonamentoAttivo ? `€${formatImportoEuro(abbonamentoTotale, 2)}` : "€0,00",
      accent: abbonamentoAttivo,
    },
  ];

  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl bg-white px-3 py-4 text-center shadow-sm">
          <p className={`text-xl font-semibold ${card.accent ? "text-brand-teal" : "text-brand-navy"}`}>
            {card.value}
          </p>
          <p className="mt-1 text-xs text-brand-navy/50">{card.label}</p>
          {"hint" in card && card.hint ? (
            <p className="mt-1 text-[10px] leading-tight text-red-500">{card.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
