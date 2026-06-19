export type ClienteDettaglioTab = "preventivi" | "pagamento_rate" | "abbonamento";

type Props = {
  active: ClienteDettaglioTab;
  onChange: (tab: ClienteDettaglioTab) => void;
};

const TABS: { id: ClienteDettaglioTab; label: string }[] = [
  { id: "preventivi", label: "Preventivi" },
  { id: "pagamento_rate", label: "Pagamento a rate" },
  { id: "abbonamento", label: "Abbonamento" },
];

export default function ClienteDettaglioTabs({ active, onChange }: Props) {
  return (
    <div className="mt-6 flex gap-1 rounded-xl border border-black/10 bg-brand-bg p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            active === tab.id
              ? "bg-white text-brand-navy shadow-sm"
              : "text-brand-navy/60 hover:text-brand-navy"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
