import { useMemo } from "react";
import {
  MESSAGGI_VARIABILI,
  inserisciVariabileMessaggio,
  parseMessaggioSegmenti,
  serializzaMessaggioSegmenti,
  variabileBloccataInTemplate,
  type TipoMessaggioCliente,
} from "preventivoai-shared";
import MessaggioMultilineChipEditor from "./MessaggioMultilineChipEditor";

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
    const seg = segments[index];
    if (seg?.type === "var" && variabileBloccataInTemplate(value, tipo, seg.name)) return;
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
                className={
                  variabileBloccataInTemplate(value, tipo, seg.name)
                    ? "rounded-md border border-brand-teal/30 bg-brand-teal/10 px-2 py-0.5 text-xs font-semibold text-brand-teal"
                    : "rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700"
                }
                title={
                  variabileBloccataInTemplate(value, tipo, seg.name)
                    ? "Variabile bloccata"
                    : "Rimuovi variabile"
                }
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
    <MessaggioMultilineChipEditor
      tipo={tipo}
      value={value}
      onChange={onChange}
      variabili={variabili}
    />
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
