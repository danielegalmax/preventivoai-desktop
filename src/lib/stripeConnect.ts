import { sessionToken } from "./settings";
import { isDesktopApp } from "./pdf";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const STRIPE_ONBOARDING_WEB_CALLBACK = "https://preventivoai-web.vercel.app/stripe-connesso";

export type StripeOnboardingStatus = "non_connesso" | "in_attesa" | "verificato";

export type ConnettiAccountResult = {
  stripe_account_id: string;
};

export type StripeAccountStato = {
  stripe_account_id?: string | null;
  stripe_onboarding_status: StripeOnboardingStatus;
  stripe_charges_enabled: boolean;
};

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await sessionToken();
  if (!token) throw new Error("Non autenticato");

  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Errore server (${res.status})`);
    if (data.error) throw new Error(data.error);
    return data as T;
  } catch (err) {
    throw new Error(messaggioErrore(err) || "Errore Stripe");
  }
}

export async function connettiAccount(): Promise<ConnettiAccountResult> {
  return authFetch<ConnettiAccountResult>("/api/stripe/connetti-account", { method: "POST" });
}

export async function creaOnboardingLink(): Promise<string> {
  const data = await authFetch<{ url: string }>("/api/stripe/onboarding-link", {
    method: "POST",
    body: JSON.stringify({
      return_url: STRIPE_ONBOARDING_WEB_CALLBACK,
      refresh_url: STRIPE_ONBOARDING_WEB_CALLBACK,
    }),
  });
  if (!data.url) throw new Error("Link di onboarding Stripe non disponibile");
  return data.url;
}

export async function statoAccount(): Promise<StripeAccountStato> {
  return authFetch<StripeAccountStato>("/api/stripe/stato-account");
}

export async function apriOnboarding(url: string): Promise<void> {
  try {
    if (isDesktopApp()) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    }
  } catch (err) {
    throw new Error(messaggioErrore(err) || "Impossibile aprire il link di onboarding Stripe.");
  }
  window.open(url, "_blank");
}

function messaggioErrore(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "";
}
