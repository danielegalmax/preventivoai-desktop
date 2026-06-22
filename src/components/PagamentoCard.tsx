import { Link } from "react-router";
import { iconaMetodoPagamento, type MetodoPagamento } from "../lib/pagamenti";

type Props = {
  metodiPagamento: MetodoPagamento[];
  metodoPagamentoSelezionato: MetodoPagamento | null;
  metodoPagamentoNessuno: boolean;
  erroreCaricamento?: string | null;
  onOpen: () => void;
};

export default function PagamentoCard({
  metodiPagamento,
  metodoPagamentoSelezionato,
  metodoPagamentoNessuno,
  erroreCaricamento,
  onOpen,
}: Props) {
  const etichetta = metodoPagamentoNessuno
    ? "Nessuno / da concordare"
    : metodoPagamentoSelezionato
      ? metodoPagamentoSelezionato.nome
      : "Scegli metodo di pagamento";

  const icona = metodoPagamentoNessuno
    ? "-"
    : iconaMetodoPagamento(metodoPagamentoSelezionato?.tipo);

  const testoClasse = metodoPagamentoNessuno
    ? "font-medium text-brand-navy/60"
    : metodoPagamentoSelezionato
      ? "font-medium text-brand-navy"
      : "font-medium text-brand-navy/50";

  return (
    <div className="mt-8 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-sm font-semibold text-brand-navy">
          €
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-brand-teal">Pagamento</p>
          <p className="text-xs text-brand-navy/50">Come vuoi essere pagato</p>
        </div>
      </div>

      {erroreCaricamento ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
          Impossibile caricare i metodi di pagamento, riprova.
        </p>
      ) : (
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-left text-sm"
      >
        <span className={`flex items-center gap-2 ${testoClasse}`}>
          <span className={metodoPagamentoNessuno ? "text-brand-navy/40" : undefined}>{icona}</span>
          {etichetta}
        </span>
        <span className="text-brand-navy/40">⌄</span>
      </button>
      )}

      {!erroreCaricamento && metodiPagamento.length <= 1 && (
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
