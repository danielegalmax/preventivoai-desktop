import { useState } from "react";
import {
  MESSAGGI_CLIENTE_DEFAULT,
  SCENARI_MESSAGGIO,
  anteprimaMessaggio,
  type MessaggiClienteTemplates,
  type ScenarioMessaggio,
} from "preventivoai-shared";
import MessaggioTemplateEditor from "./MessaggioTemplateEditor";
import FirmaReminderPanel from "./FirmaReminderPanel";

type Props = {
  messaggi: MessaggiClienteTemplates;
  onChange: (messaggi: MessaggiClienteTemplates) => void;
  reminderGiorni?: number;
  reminderDisabilitato?: boolean;
  onReminderGiorniChange?: (giorni: number) => void;
  onReminderDisabilitatoChange?: (v: boolean) => void;
};

export default function MessaggiClienteEditor({
  messaggi,
  onChange,
  reminderGiorni = 3,
  reminderDisabilitato = false,
  onReminderGiorniChange,
  onReminderDisabilitatoChange,
}: Props) {
  const [scenario, setScenario] = useState<ScenarioMessaggio>("firma");
  const config = SCENARI_MESSAGGIO.find((s) => s.id === scenario) ?? SCENARI_MESSAGGIO[1];
  const campoAnteprima = config.campi[0].key;

  function aggiornaCampo(key: keyof MessaggiClienteTemplates, valore: string) {
    onChange({ ...messaggi, [key]: valore });
  }

  function ripristinaScenario() {
    const patch = Object.fromEntries(config.campi.map((c) => [c.key, MESSAGGI_CLIENTE_DEFAULT[c.key]]));
    onChange({ ...messaggi, ...patch });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SCENARI_MESSAGGIO.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScenario(s.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              scenario === s.id
                ? "bg-brand-navy text-white"
                : "border border-black/10 text-brand-navy/70 hover:bg-brand-bg"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-brand-navy/60">{config.desc}</p>

      {scenario === "reminder" && onReminderGiorniChange && onReminderDisabilitatoChange && (
        <FirmaReminderPanel
          giorni={reminderGiorni}
          disabilitato={reminderDisabilitato}
          onGiorniChange={onReminderGiorniChange}
          onDisabilitatoChange={onReminderDisabilitatoChange}
        />
      )}

      {config.campi.map((campo) => (
        <div key={campo.key} className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-navy/45">
            {campo.label}
          </label>
          <MessaggioTemplateEditor
            tipo={campo.key}
            value={messaggi[campo.key]}
            onChange={(valore) => aggiornaCampo(campo.key, valore)}
            multiline={campo.multiline}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={ripristinaScenario}
        className="text-xs font-medium text-brand-teal hover:underline"
      >
        Ripristina predefinito
      </button>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy/45">Anteprima</p>
        <div className="rounded-lg border border-black/10 bg-brand-bg px-3 py-3">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-brand-navy/80">
            {anteprimaMessaggio(campoAnteprima, messaggi[campoAnteprima])}
          </pre>
        </div>
        {config.campi.length > 1 && (
          <p className="text-xs text-brand-navy/60">
            Oggetto: {anteprimaMessaggio(config.campi[1].key, messaggi[config.campi[1].key])}
          </p>
        )}
      </div>
    </div>
  );
}
