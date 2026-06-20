import { useState } from "react";
import type { FormEvent } from "react";
import { creaServizio, aggiornaServizio } from "../lib/listino";
import type { Servizio } from "../lib/types";
import { PLACEHOLDER } from "../lib/placeholders";
import { UNITA_MISURA } from "preventivoai-shared";
import { useAppModalKeyboard } from "./ModalShell";

interface Props {
  onClose: () => void;
  onSaved: () => void;
  servizio?: Servizio | null;
  ordineSuccessivo: number;
}

export default function ServizioModal({ onClose, onSaved, servizio, ordineSuccessivo }: Props) {
  useAppModalKeyboard(onClose);

  const [nome, setNome] = useState(servizio?.nome || "");
  const [descrizione, setDescrizione] = useState(servizio?.descrizione || "");
  const [costo, setCosto] = useState(servizio?.costo != null ? String(servizio.costo) : "");
  const [unita, setUnita] = useState(servizio?.unita || "cad");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setError("Inserisci almeno il nome del servizio.");
      return;
    }
    setError("");
    setSubmitting(true);
    const input = { nome, descrizione, costo, unita };
    const { error } = servizio
      ? await aggiornaServizio(servizio.id, input)
      : await creaServizio({ ...input, ordine: ordineSuccessivo });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg space-y-4">
        <h2 className="text-lg font-semibold text-brand-navy">{servizio ? "Modifica servizio" : "Nuovo servizio"}</h2>

        <div className="space-y-1">
          <label className="text-sm text-brand-navy/70">Nome *</label>
          <input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder={PLACEHOLDER.nomeServizio} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal" />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-brand-navy/70">Descrizione</label>
          <textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} rows={2} placeholder={PLACEHOLDER.descrizioneServizio} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-brand-navy/70">Costo (€)</label>
            <input value={costo} onChange={(e) => setCosto(e.target.value)} placeholder={PLACEHOLDER.costoServizio} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-brand-navy/70">Unità</label>
            <select value={unita} onChange={(e) => setUnita(e.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal">
              {UNITA_MISURA.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-brand-navy/70 hover:bg-brand-bg">Annulla</button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{submitting ? "Salvataggio..." : "Salva"}</button>
        </div>
      </form>
    </div>
  );
}
