import { useEffect, useRef, useState } from "react";
import type { VoceBuilder } from "../lib/builder";
import { isVoceCustom } from "../lib/builder";
import { PLACEHOLDER } from "../lib/placeholders";
import ToggleSwitch from "./ToggleSwitch";

const UNITA = ["cad", "ora", "giorno", "mq", "ml", "set", "progetto"];

type Props = {
  voci: VoceBuilder[];
  onAggiornaVoce: (id: string, campo: keyof VoceBuilder, valore: string) => void;
  onRimuoviVoce: (id: string) => void;
  onAggiungiVoceCustom: () => void;
  onSalvaNelListinoChange: (id: string, salva: boolean) => void;
  onRiordinaVoci: (fromIndex: number, toIndex: number) => void;
};

function FieldLabel({ children }: { children: string }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-navy/45">{children}</span>;
}

function ManigliaTrascina({ onStart }: { onStart: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onStart();
      }}
      className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-full border border-black/10 bg-white text-brand-navy/35 active:cursor-grabbing"
      title="Trascina per riordinare"
      aria-label="Trascina per riordinare"
    >
      ⋮⋮
    </button>
  );
}

export default function VociPreventivoSection({
  voci,
  onAggiornaVoce,
  onRimuoviVoce,
  onAggiungiVoceCustom,
  onSalvaNelListinoChange,
  onRiordinaVoci,
}: Props) {
  const [trascinato, setTrascinato] = useState<number | null>(null);
  const [sopra, setSopra] = useState<number | null>(null);
  const trascinatoRef = useRef<number | null>(null);
  const sopraRef = useRef<number | null>(null);
  const onRiordinaRef = useRef(onRiordinaVoci);
  onRiordinaRef.current = onRiordinaVoci;

  function iniziaTrascinamento(index: number) {
    trascinatoRef.current = index;
    sopraRef.current = index;
    setTrascinato(index);
    setSopra(index);
  }

  function terminaTrascinamento() {
    trascinatoRef.current = null;
    sopraRef.current = null;
    setTrascinato(null);
    setSopra(null);
  }

  useEffect(() => {
    if (trascinato === null) return;

    function indiceSottoCursore(clientX: number, clientY: number) {
      const el = document.elementFromPoint(clientX, clientY);
      const row = el?.closest("[data-voce-index]");
      if (!row) return null;
      const index = Number(row.getAttribute("data-voce-index"));
      return Number.isNaN(index) ? null : index;
    }

    function onPointerMove(e: PointerEvent) {
      const index = indiceSottoCursore(e.clientX, e.clientY);
      if (index === null) return;
      sopraRef.current = index;
      setSopra(index);
    }

    function onPointerUp(e: PointerEvent) {
      const from = trascinatoRef.current;
      const to = indiceSottoCursore(e.clientX, e.clientY) ?? sopraRef.current;
      if (from !== null && to !== null && from !== to) {
        onRiordinaRef.current(from, to);
      }
      terminaTrascinamento();
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [trascinato]);

  return (
    <div className="mt-8 space-y-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div>
        <p className="text-base font-bold text-brand-teal">Voci nel preventivo</p>
        {voci.length > 1 && (
          <p className="mt-0.5 text-xs text-brand-navy/50">Tieni premuto il controllo a sinistra e trascina per riordinare</p>
        )}
      </div>

      {voci.map((v, index) => {
        const custom = isVoceCustom(v);
        const aggiorna = (campo: keyof VoceBuilder, valore: string) => onAggiornaVoce(v.id, campo, valore);
        const inTrascinamento = trascinato === index;
        const evidenziato = sopra === index && trascinato !== null && trascinato !== index;

        return (
          <div
            key={v.id}
            data-voce-index={index}
            className={`rounded-2xl border bg-brand-bg/40 p-4 transition ${
              evidenziato ? "border-brand-teal ring-2 ring-brand-teal/20" : "border-black/10"
            } ${inTrascinamento ? "opacity-40" : ""}`}
          >
            <div className="flex items-start gap-3">
              <ManigliaTrascina onStart={() => iniziaTrascinamento(index)} />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <FieldLabel>Servizio</FieldLabel>
                    <input
                      value={v.nome}
                      onChange={(e) => aggiorna("nome", e.target.value)}
                      placeholder={PLACEHOLDER.nomeServizio}
                      className="mt-1 w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2 text-sm font-semibold text-brand-navy outline-none focus:border-brand-teal"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRimuoviVoce(v.id)}
                    className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 text-brand-navy/40 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    aria-label="Rimuovi voce"
                  >
                    ×
                  </button>
                </div>

                <div>
                  <FieldLabel>Descrizione</FieldLabel>
                  <input
                    value={v.descrizione}
                    onChange={(e) => aggiorna("descrizione", e.target.value)}
                    placeholder={PLACEHOLDER.descrizioneServizio}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label>
                    <FieldLabel>Quantità</FieldLabel>
                    <input
                      value={v.quantita}
                      onChange={(e) => aggiorna("quantita", e.target.value)}
                      placeholder={PLACEHOLDER.quantita}
                      className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                    />
                  </label>
                  <label>
                    <FieldLabel>Unità</FieldLabel>
                    <select
                      value={v.unita}
                      onChange={(e) => aggiorna("unita", e.target.value)}
                      className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                    >
                      {UNITA.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <FieldLabel>Prezzo</FieldLabel>
                    <input
                      value={v.costo}
                      onChange={(e) => aggiorna("costo", e.target.value)}
                      placeholder={PLACEHOLDER.costoServizio}
                      className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                    />
                  </label>
                </div>

                {custom && (
                  <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-brand-bg px-3 py-2">
                    <ToggleSwitch
                      checked={v.salvaNelListino ?? false}
                      onChange={(salva) => onSalvaNelListinoChange(v.id, salva)}
                      disabled={v.salvataNelListino}
                    />
                    <div>
                      <p className="text-sm text-brand-navy">Salva nel mio listino</p>
                      <p className="text-xs text-brand-navy/50">
                        {v.salvataNelListino ? "Salvata tra i tuoi servizi" : "La voce resta usa e getta se lasci spento"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAggiungiVoceCustom}
        className="w-full rounded-xl border border-dashed border-brand-teal px-4 py-3 text-sm font-medium text-brand-teal hover:bg-brand-teal/5"
      >
        + Aggiungi voce personalizzata
      </button>
    </div>
  );
}
