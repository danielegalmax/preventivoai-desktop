import {
  SEGNALAZIONE_TIPI,
  type SegnalazioneForm,
} from "../lib/segnalazioni";
import { useAppModalKeyboard, useModalBackdropClose } from "./ModalShell";

type Props = {
  open: boolean;
  form: SegnalazioneForm;
  inviando: boolean;
  onClose: () => void;
  onChange: (patch: Partial<SegnalazioneForm>) => void;
  onInvia: () => void;
};

export default function SegnalazioneModal({
  open,
  form,
  inviando,
  onClose,
  onChange,
  onInvia,
}: Props) {
  useAppModalKeyboard(onClose, { enabled: open });
  const { handleBackdropMouseDown, handleBackdropMouseUp } = useModalBackdropClose(onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="segnalazione-title"
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 id="segnalazione-title" className="text-lg font-semibold text-brand-navy">
            Segnala un problema
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-brand-navy/50 hover:bg-brand-bg hover:text-brand-navy"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy/45">Tipo</p>
            <div className="flex flex-wrap gap-2">
              {SEGNALAZIONE_TIPI.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onChange({ tipo: t.key })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    form.tipo === t.key
                      ? "bg-brand-navy text-white"
                      : "border border-black/10 text-brand-navy/70 hover:bg-brand-bg"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-brand-navy/70">Titolo *</label>
            <input
              value={form.titolo}
              onChange={(e) => onChange({ titolo: e.target.value })}
              placeholder="es. Il PDF non si genera"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-brand-navy/70">Descrizione *</label>
            <textarea
              value={form.descrizione}
              onChange={(e) => onChange({ descrizione: e.target.value })}
              placeholder="Descrivi il problema nel dettaglio..."
              rows={5}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-brand-navy/70">Schermata (opzionale)</label>
            <input
              value={form.schermata}
              onChange={(e) => onChange({ schermata: e.target.value })}
              placeholder="es. Builder, Storico..."
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
            />
          </div>

          <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
            Le segnalazioni vengono analizzate entro 24–48 ore. Grazie per aiutarci a migliorare PreventivoAI!
          </p>
        </div>

        <div className="flex gap-3 border-t border-black/5 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-brand-navy hover:bg-brand-bg"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onInvia}
            disabled={inviando}
            className="flex-1 rounded-xl bg-brand-teal py-2.5 text-sm font-semibold text-white hover:bg-brand-teal/90 disabled:opacity-60"
          >
            {inviando ? "Invio..." : "Invia"}
          </button>
        </div>
      </div>
    </div>
  );
}
