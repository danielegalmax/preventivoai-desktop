import { useCallback, useEffect, useState } from "react";
import {
  apriOnboarding,
  connettiAccount,
  creaOnboardingLink,
  statoAccount,
  type StripeAccountStato,
  type StripeOnboardingStatus,
} from "../lib/stripeConnect";

function labelStato(status: StripeOnboardingStatus): string {
  if (status === "verificato") return "Verificato";
  if (status === "in_attesa") return "In attesa verifica";
  return "Non connesso";
}

function badgeStato(status: StripeOnboardingStatus): { label: string; className: string } {
  if (status === "verificato") {
    return { label: labelStato(status), className: "bg-emerald-100 text-emerald-700" };
  }
  if (status === "in_attesa") {
    return { label: labelStato(status), className: "bg-amber-100 text-amber-700" };
  }
  return { label: labelStato(status), className: "bg-brand-bg text-brand-navy/60" };
}

export default function StripeConnectCard() {
  const [stato, setStato] = useState<StripeAccountStato | null>(null);
  const [loading, setLoading] = useState(true);
  const [aprendo, setAprendo] = useState(false);
  const [errore, setErrore] = useState("");

  const caricaStato = useCallback(async () => {
    setLoading(true);
    setErrore("");
    try {
      setStato(await statoAccount());
    } catch (err) {
      setStato(null);
      setErrore(err instanceof Error ? err.message : "Errore caricamento stato Stripe");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void caricaStato();
  }, [caricaStato]);

  useEffect(() => {
    const onFocus = () => {
      void caricaStato();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [caricaStato]);

  async function avviaOnboarding(creaAccount: boolean) {
    setAprendo(true);
    setErrore("");
    try {
      if (creaAccount) await connettiAccount();
      const url = await creaOnboardingLink();
      await apriOnboarding(url);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore Stripe Connect");
    } finally {
      setAprendo(false);
      await caricaStato();
    }
  }

  const status = stato?.stripe_onboarding_status ?? "non_connesso";
  const verificato = status === "verificato";
  const badge = badgeStato(status);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-brand-navy">Stripe Connect</h2>
          <p className="mt-1 text-sm text-brand-navy/60">
            Collega il tuo account Stripe per ricevere pagamenti online con carta
          </p>
        </div>
        {!loading && (
          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-brand-navy/60">Caricamento stato...</p>
      ) : (
        <>
          {errore && <p className="mt-4 text-sm text-red-600">{errore}</p>}

          {!verificato && status === "non_connesso" && (
            <button
              type="button"
              onClick={() => void avviaOnboarding(true)}
              disabled={aprendo}
              className="mt-4 w-full rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {aprendo ? "Apertura..." : "Connetti account Stripe"}
            </button>
          )}

          {!verificato && status === "in_attesa" && (
            <button
              type="button"
              onClick={() => void avviaOnboarding(false)}
              disabled={aprendo}
              className="mt-4 w-full rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {aprendo ? "Apertura..." : "Continua verifica"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
