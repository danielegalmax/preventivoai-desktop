import { useState } from "react";
import type { FormEvent } from "react";

type Props = {
  titoloIniziale: string;
  onClose: () => void;
  onSalva: (titolo: string) => Promise<void>;
};

export default function PreventivoTitoloModal({ titoloIniziale, onClose, onSalva }: Props) {
  const [titolo, setTitolo] = useState(titoloIniziale);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await onSalva(titolo);
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-brand-navy">Rinomina preventivo</h2>
        <input
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          placeholder="es. Preventivo caldaia"
          autoFocus
          className="mt-4 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-brand-navy/70"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {salvando ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </form>
    </div>
  );
}
