import { useEffect } from "react";
import PreviewPaginata from "./PreviewPaginata";

type Props = {
  html: string;
  open: boolean;
  onClose: () => void;
};

export default function PreviewEspansaModal({ html, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !html) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-brand-navy/55 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Anteprima PDF ingrandita"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-navy">Anteprima PDF</p>
            <p className="text-xs text-brand-navy/50">Frecce ← → per cambiare pagina · Esc per chiudere</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm text-brand-navy/70 hover:bg-brand-bg"
            aria-label="Chiudi anteprima"
          >
            Chiudi
          </button>
        </div>
        <PreviewPaginata htmlContent={html} variant="expanded" enableKeyboard className="min-h-0 flex-1" />
      </div>
    </div>
  );
}
