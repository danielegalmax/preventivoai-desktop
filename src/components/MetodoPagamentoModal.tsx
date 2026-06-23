import { iconaMetodoPagamento, type MetodoPagamento } from "../lib/pagamenti";
import { trackEvento } from "../lib/track";

type Props = {
  open: boolean;
  metodiPagamento: MetodoPagamento[];
  metodoPagamentoSelezionato: MetodoPagamento | null;
  metodoPagamentoNessuno: boolean;
  onClose: () => void;
  onSelect: (metodo: MetodoPagamento) => void;
  onSelectNessuno: () => void;
};

export default function MetodoPagamentoModal({
  open,
  metodiPagamento,
  metodoPagamentoSelezionato,
  metodoPagamentoNessuno,
  onClose,
  onSelect,
  onSelectNessuno,
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
          <button
            type="button"
            onClick={() => {
              onSelectNessuno();
              onClose();
            }}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left ${
              metodoPagamentoNessuno
                ? "border-brand-teal bg-brand-teal/5"
                : "border-black/10 bg-white"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center text-base text-brand-navy/40">—</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-navy">Nessuno / da concordare</p>
              <p className="text-xs text-brand-navy/50">Nessun metodo indicato nel preventivo</p>
            </div>
            {metodoPagamentoNessuno && <span className="text-brand-teal">✓</span>}
          </button>

          <div className="border-t border-black/10 pt-2" />

          {metodiPagamento.map((m) => {
            const attivo = !metodoPagamentoNessuno && metodoPagamentoSelezionato?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  void trackEvento("metodo_pagamento_selezionato", "builder", { tipo: m.tipo });
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
