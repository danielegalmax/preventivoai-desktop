import ToggleSwitch from "./ToggleSwitch";

type Props = {
  attivo: boolean;
  onChange: (value: boolean) => void;
};

export default function IvaCard({ attivo, onChange }: Props) {
  return (
    <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-brand-navy">IVA</h3>
          <p className="mt-0.5 text-xs text-brand-navy/50">Aggiunge l&apos;IVA 22% al totale del preventivo</p>
        </div>
        <ToggleSwitch checked={attivo} onChange={onChange} />
      </div>
    </div>
  );
}
