import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import type { ModificaPreventivoInput } from "../lib/modificaPreventivo/apriModificaPreventivo";
import { paramsRouterModifica } from "../lib/modificaPreventivo/apriModificaPreventivo";
import { MODIFICA_VERSIONE_MODAL_SUB } from "../lib/modificaPreventivo/constants";
import { setModificaSession } from "../lib/modificaPreventivo/modificaSession";
import { useAppModalKeyboard } from "./ModalShell";

type Props = {
  open: boolean;
  input: ModificaPreventivoInput | null;
  onClose: () => void;
};

function IconEdit3() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
      <path strokeLinecap="round" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path strokeLinecap="round" d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v3" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
      <path strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13" />
      <path strokeLinecap="round" d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" d="m9 18 6-6-6-6" />
    </svg>
  );
}

const OPZIONI: {
  icon: ReactNode;
  title: string;
  sub: string;
  path: string;
}[] = [
  {
    icon: <IconList />,
    title: "Builder manuale",
    sub: "Modifica servizi, rimborsi e pagamento dal form",
    path: "/nuovo/manuale",
  },
  {
    icon: <IconEdit3 />,
    title: "Chat",
    sub: "Descrivi le modifiche all'AI a testo",
    path: "/nuovo/chat",
  },
  {
    icon: <IconMic />,
    title: "Registra voce",
    sub: "Parla delle modifiche da fare",
    path: "/nuovo/registra",
  },
];

export default function ModificaPreventivoModal({ open, input, onClose }: Props) {
  const navigate = useNavigate();

  useAppModalKeyboard(onClose, { enabled: open && !!input });

  if (!open || !input) return null;

  function scegli(path: string) {
    setModificaSession(input!);
    const qs = new URLSearchParams(paramsRouterModifica(input!)).toString();
    onClose();
    navigate(`${path}?${qs}`);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-brand-navy/45 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-brand-bg p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modifica-preventivo-titolo"
      >
        <h2 id="modifica-preventivo-titolo" className="text-lg font-semibold text-brand-navy">
          Modifica preventivo
        </h2>
        <p className="mt-1 text-sm text-brand-navy/60">{MODIFICA_VERSIONE_MODAL_SUB}</p>

        <div className="mt-4 space-y-3">
          {OPZIONI.map((op) => (
            <button
              key={op.path}
              type="button"
              onClick={() => scegli(op.path)}
              className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-brand-bg/80"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                {op.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-brand-navy">{op.title}</span>
                <span className="mt-0.5 block text-sm text-brand-navy/60">{op.sub}</span>
              </span>
              <span className="text-brand-navy/30">
                <IconChevronRight />
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 text-center text-sm font-semibold text-brand-navy/60 hover:text-brand-navy"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}
