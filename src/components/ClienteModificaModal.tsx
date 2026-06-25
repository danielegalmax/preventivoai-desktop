import { useState } from "react";
import type { FormEvent } from "react";
import { aggiornaCliente } from "../lib/clienti";
import { PLACEHOLDER } from "../lib/placeholders";
import type { Cliente } from "../lib/types";
import { useAppModalKeyboard } from "./ModalShell";

interface Props {
  cliente: Cliente;
  onClose: () => void;
  onSaved: (cliente: Cliente) => void;
}

export default function ClienteModificaModal({ cliente, onClose, onSaved }: Props) {
  useAppModalKeyboard(onClose);

  const [nome, setNome] = useState(cliente.nome);
  const [telefono, setTelefono] = useState(cliente.telefono || "");
  const [email, setEmail] = useState(cliente.email || "");
  const [indirizzo, setIndirizzo] = useState(cliente.indirizzo || "");
  const [note, setNote] = useState(cliente.note || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { data, error: err } = await aggiornaCliente(cliente.id, { nome, telefono, email, indirizzo, note });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data) onSaved({ ...cliente, ...data, created_at: data.created_at ?? undefined });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-brand-navy">Modifica cliente</h2>

        <div className="space-y-1">
          <label className="text-sm text-brand-navy/70">Nome *</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={PLACEHOLDER.nomeCliente}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-brand-navy/70">Telefono</label>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder={PLACEHOLDER.telefono}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-brand-navy/70">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={PLACEHOLDER.email}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-brand-navy/70">Indirizzo</label>
          <input
            value={indirizzo}
            onChange={(e) => setIndirizzo(e.target.value)}
            placeholder={PLACEHOLDER.indirizzo}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-brand-navy/70">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={PLACEHOLDER.noteCliente}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-brand-navy/70 hover:bg-brand-bg"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </form>
    </div>
  );
}
