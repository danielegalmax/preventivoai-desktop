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

function CampiQuantitaUnitaCosto({
  voce,
  onAggiorna,
  inputClass = "",
  selectClass = "",
}: {
  voce: VoceBuilder;
  onAggiorna: (campo: keyof VoceBuilder, valore: string) => void;
  inputClass?: string;
  selectClass?: string;
}) {
  return (
    <>
      <input
        value={voce.quantita}
        onChange={(e) => onAggiorna("quantita", e.target.value)}
        placeholder={PLACEHOLDER.quantita}
        className={`w-16 rounded-lg border border-black/10 px-2 py-2 text-sm outline-none focus:border-brand-teal ${inputClass}`}
      />
      <select
        value={voce.unita}
        onChange={(e) => onAggiorna("unita", e.target.value)}
        className={`rounded-lg border border-black/10 px-2 py-2 text-sm outline-none focus:border-brand-teal ${selectClass}`}
      >
        {UNITA.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
      <input
        value={voce.costo}
        onChange={(e) => onAggiorna("costo", e.target.value)}
        placeholder={PLACEHOLDER.costoServizio}
        className={`w-24 rounded-lg border border-black/10 px-2 py-2 text-sm outline-none focus:border-brand-teal ${inputClass}`}
      />
    </>
  );
}

function ManigliaTrascina({
  onStart,
  className = "",
}: {
  onStart: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onStart();
      }}
      className={`shrink-0 cursor-grab touch-none text-brand-navy/30 active:cursor-grabbing ${className}`}
      title="Trascina per riordinare"
      aria-label="Trascina per riordinare"
    >
      ⠿
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
    <div className="mt-5 space-y-3">
      <div>
        <p className="text-sm font-medium text-brand-navy">Voci dal listino</p>
        {voci.length > 1 && (
          <p className="mt-0.5 text-xs text-brand-navy/50">Tieni premuto ⠿ e trascina per riordinare</p>
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
            className={`py-1 transition-opacity ${
              inTrascinamento ? "opacity-40" : ""
            } ${evidenziato ? "rounded-xl ring-2 ring-brand-teal/40" : ""}`}
          >
            {custom ? (
              <div className="rounded-xl border border-black/10 bg-brand-bg/40 p-3 space-y-3">
                <div className="flex items-end gap-2">
                  <ManigliaTrascina
                    onStart={() => iniziaTrascinamento(index)}
                    className="mb-2"
                  />
                  <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
                    <input
                      value={v.nome}
                      onChange={(e) => aggiorna("nome", e.target.value)}
                      placeholder={PLACEHOLDER.nomeServizio}
                      className="min-w-[160px] flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-teal"
                    />
                    <input
                      value={v.descrizione}
                      onChange={(e) => aggiorna("descrizione", e.target.value)}
                      placeholder={PLACEHOLDER.descrizioneServizio}
                      className="min-w-[160px] flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-teal"
                    />
                    <CampiQuantitaUnitaCosto
                      voce={v}
                      onAggiorna={aggiorna}
                      inputClass="bg-white"
                      selectClass="bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => onRimuoviVoce(v.id)}
                      className="px-2 text-brand-navy/40 hover:text-red-600"
                      aria-label="Rimuovi voce"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-t border-black/5 pt-3">
                  <ToggleSwitch
                    checked={v.salvaNelListino ?? false}
                    onChange={(salva) => onSalvaNelListinoChange(v.id, salva)}
                    disabled={v.salvataNelListino}
                  />
                  <div>
                    <p className="text-sm text-brand-navy">Salva nel mio listino</p>
                    <p className="text-xs text-brand-navy/50">
                      {v.salvataNelListino
                        ? "Salvata tra i tuoi servizi"
                        : "La voce resta usa e getta se lasci spento"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <ManigliaTrascina
                  onStart={() => iniziaTrascinamento(index)}
                  className="mb-2"
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
                  <input
                    value={v.nome}
                    onChange={(e) => aggiorna("nome", e.target.value)}
                    placeholder={PLACEHOLDER.nomeServizio}
                    className="min-w-[160px] flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                  />
                  <input
                    value={v.descrizione}
                    onChange={(e) => aggiorna("descrizione", e.target.value)}
                    placeholder={PLACEHOLDER.descrizioneServizio}
                    className="min-w-[160px] flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                  />
                  <CampiQuantitaUnitaCosto voce={v} onAggiorna={aggiorna} />
                  <button
                    type="button"
                    onClick={() => onRimuoviVoce(v.id)}
                    className="px-2 text-brand-navy/40 hover:text-red-600"
                    aria-label="Rimuovi voce"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAggiungiVoceCustom}
        className="w-full rounded-lg border border-dashed border-brand-teal px-4 py-2 text-sm font-medium text-brand-teal hover:bg-brand-teal/5"
      >
        + Aggiungi voce personalizzata
      </button>
    </div>
  );
}
