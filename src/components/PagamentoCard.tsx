import { Link } from "react-router";
import { iconaMetodoPagamento, type MetodoPagamento } from "../lib/pagamenti";

type Props = {
  metodiPagamento: MetodoPagamento[];
  metodoPagamentoSelezionato: MetodoPagamento | null;
  metodoPagamentoNessuno: boolean;
  onOpen: () => void;
};

export default function PagamentoCard({
  metodiPagamento,
  metodoPagamentoSelezionato,
  metodoPagamentoNessuno,
  onOpen,
}: Props) {
  const etichetta = metodoPagamentoNessuno
    ? "Nessuno / da concordare"
    : metodoPagamentoSelezionato
      ? metodoPagamentoSelezionato.nome
      : "Scegli metodo di pagamento";

  const icona = metodoPagamentoNessuno
    ? "—"
    : iconaMetodoPagamento(metodoPagamentoSelezionato?.tipo);

  const testoClasse = metodoPagamentoNessuno
    ? "font-medium text-brand-navy/60"
    : metodoPagamentoSelezionato
      ? "font-medium text-brand-navy"
      : "font-medium text-brand-navy/50";

  return (
    <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
      <p className="text-sm font-semibold text-brand-navy">Pagamento</p>
      <p className="text-xs text-brand-navy/50">Come vuoi essere pagato</p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-left text-sm"
      >
        <span className={`flex items-center gap-2 ${testoClasse}`}>
          <span className={metodoPagamentoNessuno ? "text-brand-navy/40" : undefined}>{icona}</span>
          {etichetta}
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
