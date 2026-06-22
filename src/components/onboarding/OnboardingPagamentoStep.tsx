import { useState } from "react";
import StripeConnectCard from "../StripeConnectCard";
import { PLACEHOLDER } from "../../lib/placeholders";
import {
  iconaMetodoPagamento,
  normalizzaPaypalMe,
  type MetodoPagamentoForm,
  type TipoPagamento,
} from "../../lib/pagamenti";

const TIPI: { key: TipoPagamento; label: string }[] = [
  { key: "bonifico", label: "Bonifico" },
  { key: "paypal", label: "PayPal" },
  { key: "contanti", label: "Contanti" },
  { key: "stripe", label: "Stripe" },
];

const NOMI_DEFAULT: Record<TipoPagamento, string> = {
  bonifico: "Bonifico bancario",
  paypal: "PayPal",
  contanti: "Contanti",
  carta: "Carta",
  stripe: "Pagamento online (Stripe)",
};

type Props = {
  form: MetodoPagamentoForm;
  onFormChange: (form: MetodoPagamentoForm) => void;
  errore: string;
};

export default function OnboardingPagamentoStep({ form, onFormChange, errore }: Props) {
  const [tipoSelezionato, setTipoSelezionato] = useState<TipoPagamento | null>(form.tipo || null);

  function selezionaTipo(tipo: TipoPagamento) {
    setTipoSelezionato(tipo);
    onFormChange({
      tipo,
      nome: form.nome.trim() || NOMI_DEFAULT[tipo],
      dati: {},
      predefinito: true,
    });
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-brand-navy">Metodo di pagamento predefinito</h2>
      <p className="mt-1 text-sm text-brand-navy/60">
        Scegli come preferisci ricevere i pagamenti nei preventivi. Puoi saltare e configurarlo dopo.
      </p>

      <div className="mt-6">
        <p className="text-xs font-semibold tracking-wide text-brand-navy/40">TIPO</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIPI.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => selezionaTipo(t.key)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                tipoSelezionato === t.key
                  ? "bg-brand-navy text-white"
                  : "border border-black/10 bg-brand-bg text-brand-navy"
              }`}
            >
              {iconaMetodoPagamento(t.key)} {t.label}
            </button>
          ))}
        </div>
      </div>

      {tipoSelezionato && (
        <div className="mt-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-brand-navy/40">NOME *</label>
            <input
              value={form.nome}
              onChange={(e) => onFormChange({ ...form, nome: e.target.value })}
              placeholder="es. Conto principale"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
            />
          </div>

          {form.tipo === "bonifico" && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold tracking-wide text-brand-navy/40">IBAN</label>
                <input
                  value={form.dati?.iban || ""}
                  onChange={(e) =>
                    onFormChange({ ...form, dati: { ...form.dati, iban: e.target.value.toUpperCase() } })
                  }
                  placeholder="IT60..."
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold tracking-wide text-brand-navy/40">INTESTATARIO</label>
                <input
                  value={form.dati?.intestatario || ""}
                  onChange={(e) =>
                    onFormChange({ ...form, dati: { ...form.dati, intestatario: e.target.value } })
                  }
                  placeholder="Mario Rossi"
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                />
              </div>
            </>
          )}

          {form.tipo === "paypal" && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold tracking-wide text-brand-navy/40">USERNAME PAYPAL.ME</label>
                <div className="flex overflow-hidden rounded-lg border border-black/10 focus-within:border-brand-teal">
                  <span className="flex shrink-0 items-center bg-brand-bg px-2.5 text-xs text-brand-navy/50">
                    paypal.me/
                  </span>
                  <input
                    value={form.dati?.paypalme || ""}
                    onChange={(e) =>
                      onFormChange({
                        ...form,
                        dati: { ...form.dati, paypalme: normalizzaPaypalMe(e.target.value) },
                      })
                    }
                    placeholder="marioelettricista"
                    className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold tracking-wide text-brand-navy/40">EMAIL PAYPAL</label>
                <input
                  type="email"
                  value={form.dati?.email || ""}
                  onChange={(e) => onFormChange({ ...form, dati: { ...form.dati, email: e.target.value } })}
                  placeholder={PLACEHOLDER.email}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                />
              </div>
            </>
          )}

          {form.tipo === "stripe" && (
            <>
              <p className="rounded-lg bg-brand-bg px-3 py-2 text-xs text-brand-navy/60">
                Al momento della generazione PDF verrà creato un link Stripe Checkout per il cliente.
              </p>
              <StripeConnectCard />
            </>
          )}

          {errore && <p className="text-sm text-red-600">{errore}</p>}
        </div>
      )}
    </div>
  );
}
