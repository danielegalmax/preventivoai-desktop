import ModalShell from "../ModalShell";
import type { ClienteSuggeritoChat } from "../../lib/chat";

type Props = {
  clienti: ClienteSuggeritoChat[];
  onClose: () => void;
  onSelect: (cliente: ClienteSuggeritoChat) => void;
};

function discriminanteCliente(cliente: ClienteSuggeritoChat): string | null {
  const email = cliente.email?.trim();
  if (email) return email;
  const telefono = cliente.telefono?.trim();
  if (telefono) return telefono;
  const indirizzo = cliente.indirizzo?.trim();
  if (indirizzo) return indirizzo;
  return null;
}

export default function ClienteOmografiModal({ clienti, onClose, onSelect }: Props) {
  return (
    <ModalShell
      title="Più clienti trovati"
      titleId="cliente-omografi-title"
      onClose={onClose}
      onBackdropClick={onClose}
      zClass="z-[60]"
      panelClassName="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
      contentClassName="mt-3 space-y-3"
    >
      <p className="text-sm text-brand-navy/60">Ho trovato più clienti con questo nome. Quale vuoi associare al preventivo?</p>
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {clienti.map((cliente) => {
          const info = discriminanteCliente(cliente);
          return (
            <li key={cliente.id}>
              <button
                type="button"
                onClick={() => onSelect(cliente)}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-left transition hover:border-brand-teal/40 hover:bg-brand-bg"
              >
                <span className="block text-sm font-semibold text-brand-navy">{cliente.nome}</span>
                {info ? <span className="mt-0.5 block text-xs text-brand-navy/50">{info}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-xl py-2.5 text-sm font-medium text-brand-navy/55 hover:bg-brand-bg"
      >
        Nessuno di questi
      </button>
    </ModalShell>
  );
}
