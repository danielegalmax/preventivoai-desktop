import { TEMPLATES } from "../lib/constants";

interface Props {
  template: string;
  onSelectTemplate: (templateId: string) => void;
  embedded?: boolean;
}

export default function PreventivoPdfTemplatePicker({ template, onSelectTemplate, embedded = false }: Props) {
  const attivo = TEMPLATES.find((t) => t.id === template);

  return (
    <div className={embedded ? "" : "rounded-2xl border border-black/10 bg-white p-3"}>
      <p className="text-sm font-medium text-brand-navy">Template</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTemplate(t.id)}
            title={t.desc}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              template === t.id
                ? "border-brand-teal bg-brand-teal text-white"
                : "border-black/10 bg-brand-bg text-brand-navy/70 hover:border-black/20"
            }`}
          >
            {t.nome}
          </button>
        ))}
      </div>
      {attivo && <p className="mt-1.5 text-[11px] text-brand-navy/50">{attivo.desc}</p>}
    </div>
  );
}
