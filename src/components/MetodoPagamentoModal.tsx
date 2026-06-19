import { iconaMetodoPagamento, type MetodoPagamento } from "../lib/pagamenti";

type Props = {
  open: boolean;
  metodiPagamento: MetodoPagamento[];
  metodoPagamentoSelezionato: MetodoPagamento | null;
  onClose: () => void;
  onSelect: (metodo: MetodoPagamento) => void;
};

export default function MetodoPagamentoModal({
  open,
  metodiPagamento,
  metodoPagamentoSelezionato,
  onClose,
  onSelect,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="text-base font-semibold text-brand-navy">Metodo pagamento</h2>
          <button type="button" onClick={onClose} className="text-brand-navy/50 hover:text-brand-navy">
            ✕
          </button>
        </div>
        <div className="space-y-2 overflow-y-auto p-4">
          {metodiPagamento.map((m) => {
            const attivo = metodoPagamentoSelezionato?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelect(m);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left ${
                  attivo ? "border-brand-teal bg-brand-teal/5" : "border-black/10 bg-white"
                }`}
              >
                <span className="text-xl">{iconaMetodoPagamento(m.tipo)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-navy">{m.nome}</p>
                  {m.tipo === "bonifico" && m.dati?.iban && (
                    <p className="truncate text-xs text-brand-navy/50">{m.dati.iban}</p>
                  )}
                  {m.tipo === "paypal" && m.dati?.email && (
                    <p className="truncate text-xs text-brand-navy/50">{m.dati.email}</p>
                  )}
                </div>
                {attivo && <span className="text-brand-teal">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
