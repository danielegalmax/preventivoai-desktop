import { Link } from "react-router";
import { iconaMetodoPagamento, type MetodoPagamento } from "../lib/pagamenti";

type Props = {
  metodiPagamento: MetodoPagamento[];
  metodoPagamentoSelezionato: MetodoPagamento | null;
  onOpen: () => void;
};

export default function PagamentoCard({ metodiPagamento, metodoPagamentoSelezionato, onOpen }: Props) {
  return (
    <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
      <p className="text-sm font-semibold text-brand-navy">Pagamento</p>
      <p className="text-xs text-brand-navy/50">Come vuoi essere pagato</p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-left text-sm"
      >
        <span className="flex items-center gap-2 font-medium text-brand-navy">
          <span>{iconaMetodoPagamento(metodoPagamentoSelezionato?.tipo)}</span>
          {metodoPagamentoSelezionato ? metodoPagamentoSelezionato.nome : "Scegli metodo di pagamento"}
        </span>
        <span className="text-brand-navy/40">⌄</span>
      </button>
      {metodiPagamento.length <= 1 && (
        <Link
          to="/impostazioni/pagamenti"
          className="mt-3 block text-center text-sm text-brand-teal hover:underline"
        >
          Configura altri metodi di pagamento →
        </Link>
      )}
    </div>
  );
}
