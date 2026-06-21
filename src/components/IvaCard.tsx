import ToggleSwitch from "./ToggleSwitch";

type Props = {
  attivo: boolean;
  onChange: (value: boolean) => void;
};

export default function IvaCard({ attivo, onChange }: Props) {
  return (
    <div className="mt-8 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-sm font-semibold text-brand-navy">
            %
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-brand-teal">IVA</h3>
            <p className="mt-0.5 text-xs text-brand-navy/50">Aggiunge l&apos;IVA 22% al totale del preventivo</p>
          </div>
        </div>
        <ToggleSwitch checked={attivo} onChange={onChange} />
      </div>
    </div>
  );
}
