import { useState } from "react";
import type { Preventivo } from "../lib/types";
import { STATI_PREVENTIVO, statoPreventivoIcon } from "../lib/preventivo";
import ToggleSwitch from "./ToggleSwitch";

type Props = {
  preventivo: Preventivo | null;
  onClose: () => void;
  onChangeStato: (stato: string) => Promise<void>;
  onTogglePagato: (pagato: boolean) => Promise<void>;
  mostraTogglePagato?: boolean;
};

export default function PreventivoStatoModal({
  preventivo,
  onClose,
  onChangeStato,
  onTogglePagato,
  mostraTogglePagato = true,
}: Props) {
  const [salvandoPagato, setSalvandoPagato] = useState(false);

  if (!preventivo) return null;

  async function handleTogglePagato(value: boolean) {
    setSalvandoPagato(true);
    try {
      await onTogglePagato(value);
    } finally {
      setSalvandoPagato(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-brand-navy">Cambia stato</h2>

        <div className="mt-4 space-y-1">
          {STATI_PREVENTIVO.map((stato) => (
            <button
              key={stato}
              type="button"
              onClick={async () => {
                await onChangeStato(stato);
                const restaAperto = stato === "accettato";
                if (!restaAperto) onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-brand-navy hover:bg-brand-bg"
            >
              <span>{statoPreventivoIcon(stato)}</span>
              <span className="capitalize">{stato}</span>
            </button>
          ))}
        </div>

        {preventivo.stato === "accettato" && mostraTogglePagato && (
          <div className="mt-4 border-t border-black/5 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand-navy">Segna come pagato</p>
                <p className="text-xs text-brand-navy/50">Registra l&apos;incasso del preventivo accettato</p>
              </div>
              <ToggleSwitch
                checked={preventivo.pagato}
                onChange={handleTogglePagato}
                disabled={salvandoPagato}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-brand-navy/70 hover:bg-brand-bg"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
