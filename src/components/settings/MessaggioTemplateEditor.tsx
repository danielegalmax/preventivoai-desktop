import { useMemo } from "react";
import {
  MESSAGGI_VARIABILI,
  inserisciVariabileMessaggio,
  parseMessaggioSegmenti,
  proteggiModificaMessaggio,
  serializzaMessaggioSegmenti,
  type TipoMessaggioCliente,
} from "../../lib/messaggiCliente";

type Props = {
  tipo: TipoMessaggioCliente;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
};

export default function MessaggioTemplateEditor({ tipo, value, onChange, multiline = true }: Props) {
  const variabili = MESSAGGI_VARIABILI[tipo];
  const segments = useMemo(() => parseMessaggioSegmenti(value, variabili), [value, variabili]);

  function aggiornaTesto(index: number, testo: string) {
    const next = segments.map((s, i) => (i === index && s.type === "text" ? { ...s, value: testo } : s));
    onChange(serializzaMessaggioSegmenti(next));
  }

  function rimuoviVariabile(index: number) {
    onChange(serializzaMessaggioSegmenti(segments.filter((_, i) => i !== index)));
  }

  function inserisci(varName: string) {
    onChange(inserisciVariabileMessaggio(value, varName));
  }

  if (!multiline) {
    return (
      <div className="space-y-2">
        <div className="flex min-h-11 flex-wrap items-center gap-1 rounded-lg border border-black/10 bg-brand-bg px-3 py-2">
          {segments.map((seg, i) =>
            seg.type === "text" ? (
              <input
                key={`t-${i}`}
                value={seg.value}
                onChange={(e) => aggiornaTesto(i, e.target.value)}
                className="min-w-[4rem] flex-1 border-none bg-transparent text-sm outline-none"
              />
            ) : (
              <button
                key={`v-${i}`}
                type="button"
                onClick={() => rimuoviVariabile(i)}
                className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700"
                title="Rimuovi variabile"
              >
                {`{${seg.name}}`}
              </button>
            ),
          )}
        </div>
        <VariabiliBar variabili={variabili} value={value} onInsert={inserisci} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(proteggiModificaMessaggio(value, e.target.value, variabili))}
        rows={6}
        className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
      />
      <VariabiliInTesto value={value} variabili={variabili} />
      <VariabiliBar variabili={variabili} value={value} onInsert={inserisci} />
    </div>
  );
}

function VariabiliInTesto({ value, variabili }: { value: string; variabili: string[] }) {
  const presenti = variabili.filter((v) => value.includes(v));
  if (!presenti.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {presenti.map((v) => (
        <span key={v} className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
          {v}
        </span>
      ))}
    </div>
  );
}

function VariabiliBar({
  variabili,
  value,
  onInsert,
}: {
  variabili: string[];
  value: string;
  onInsert: (name: string) => void;
}) {
  const disponibili = variabili.filter((v) => !value.includes(v));
  if (!disponibili.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-navy/40">Inserisci</span>
      {disponibili.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onInsert(v)}
          className="rounded-md border border-black/10 bg-white px-2 py-0.5 text-xs font-semibold text-brand-teal hover:bg-brand-bg"
        >
          {v}
        </button>
      ))}
    </div>
  );
}
