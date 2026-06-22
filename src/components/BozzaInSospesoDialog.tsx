import ModalShell from "./ModalShell";

type Props = {
  message: string;
  onRiprendi: () => void;
  onIniziaNuovo: () => void;
  onDismiss: () => void;
};

export default function BozzaInSospesoDialog({
  message,
  onRiprendi,
  onIniziaNuovo,
  onDismiss,
}: Props) {
  return (
    <ModalShell
      title="Preventivo in corso"
      titleId="bozza-in-sospeso-title"
      onClose={onDismiss}
      onBackdropClick={onDismiss}
      zClass="z-[60]"
      panelClassName="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
      contentClassName="mt-4"
    >
      <p className="whitespace-pre-line text-sm leading-relaxed text-brand-navy/70">{message}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRiprendi}
          className="flex-1 rounded-xl bg-brand-teal py-2.5 text-sm font-semibold text-white hover:bg-brand-teal/90"
        >
          Riprendi bozza
        </button>
        <button
          type="button"
          onClick={onIniziaNuovo}
          className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-brand-navy hover:bg-brand-bg"
        >
          Inizia nuovo
        </button>
      </div>
    </ModalShell>
  );
}
