import ToggleSwitch from "../ToggleSwitch";
import { GiorniReminderSelect } from "../pickers/DatePartPickers";

type Props = {
  giorni: number;
  disabilitato: boolean;
  onGiorniChange: (giorni: number) => void;
  onDisabilitatoChange: (v: boolean) => void;
};

export default function FirmaReminderPanel({
  giorni,
  disabilitato,
  onGiorniChange,
  onDisabilitatoChange,
}: Props) {
  return (
    <div className="rounded-xl border border-brand-teal/20 bg-brand-teal/5 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-brand-navy">Automazione reminder firma</h3>
        <p className="mt-1 text-xs text-brand-navy/60 leading-relaxed">
          Dopo quanti giorni dall&apos;invio del link ti chiediamo se mandare il promemoria al cliente (usa il template «Reminder» sotto).
        </p>
      </div>
      <div className="space-y-1">
        <label className="text-sm text-brand-navy/70">Giorni prima del reminder</label>
        <GiorniReminderSelect
          value={giorni}
          onChange={onGiorniChange}
          disabled={disabilitato}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-brand-navy/70">Disabilita reminder firma (tutti i preventivi)</span>
        <ToggleSwitch checked={disabilitato} onChange={onDisabilitatoChange} />
      </div>
    </div>
  );
}
