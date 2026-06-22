import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../app/useAuth";
import { resetPassword, signInWithEmail, signUpWithEmail } from "../lib/auth";
import { PLACEHOLDER } from "../lib/placeholders";

const WEB_BASE_URL = "https://preventivoai-web.vercel.app";
const WEB_TERMINI_URL = `${WEB_BASE_URL}/termini`;

/** Imposta `true` per riattivare tab e form di registrazione. */
const BETA_REGISTRAZIONE_APERTA = false;

type AuthMode = "login" | "register";

export default function Login() {
  const { loading, authenticated } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostraPassword, setMostraPassword] = useState(false);
  const [accettaTermini, setAccettaTermini] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  if (!loading && authenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email.trim() || !password) {
      setError("Inserisci email e password.");
      return;
    }
    if (mode === "register" && BETA_REGISTRAZIONE_APERTA && !accettaTermini) {
      setError("Accetta i termini e condizioni per continuare.");
      return;
    }
    if (mode === "register" && BETA_REGISTRAZIONE_APERTA && password.length < 6) {
      setError("La password deve avere almeno 6 caratteri.");
      return;
    }

    setSubmitting(true);
    if (mode === "register" && BETA_REGISTRAZIONE_APERTA) {
      const { error: signUpError } = await signUpWithEmail(email.trim(), password);
      setSubmitting(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setInfo("Account creato. Controlla la tua email per confermare l'accesso.");
      return;
    }

    const { error: signInError } = await signInWithEmail(email.trim(), password);
    setSubmitting(false);
    if (signInError) setError("Email o password non corretti.");
  }

  async function recuperaPassword() {
    if (!email.trim()) {
      setError("Inserisci la tua email e poi riprova.");
      return;
    }
    setError("");
    setInfo("");
    setResetLoading(true);
    const { error: resetError } = await resetPassword(email.trim());
    setResetLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setInfo("Email inviata. Segui il link per reimpostare la password.");
  }

  function apriTerminiWeb() {
    window.open(WEB_TERMINI_URL, "_blank", "noopener,noreferrer");
  }

  function apriHomepageWeb() {
    window.open(WEB_BASE_URL, "_blank", "noopener,noreferrer");
  }

  function handleGoogle() {
    window.alert(
      "Il login con Google sarà disponibile in una versione successiva. Per ora usa email e password.",
    );
  }

  return (
    <div className="theme-surface flex h-screen overflow-hidden bg-brand-bg">
      <aside className="hidden w-[42%] max-w-xl flex-col justify-between bg-brand-navy p-10 text-white lg:flex">
        <div>
          <p className="text-3xl font-bold tracking-tight">
            Preventivo<span className="text-brand-teal">AI</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Preventivi professionali in pochi minuti: chat AI, voce, builder manuale e PDF pronti da inviare.
          </p>
        </div>
        <ul className="space-y-4 text-sm text-white/80">
          <li className="flex gap-3">
            <span className="mt-0.5 text-brand-teal">✓</span>
            <span>Genera preventivi con l&apos;assistente AI o dal listino servizi</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 text-brand-teal">✓</span>
            <span>PDF multi-template, clienti, rate e abbonamenti in un unico posto</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 text-brand-teal">✓</span>
            <span>Storico, versioni alternative e tracciamento incassi</span>
          </li>
        </ul>
        <p className="text-xs text-white/40">© PreventivoAI — fatto per artigiani e professionisti</p>
      </aside>

      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <p className="text-3xl font-bold tracking-tight text-brand-navy">
              Preventivo<span className="text-brand-teal">AI</span>
            </p>
            <p className="mt-2 text-sm text-brand-navy/60">
              {mode === "register" && BETA_REGISTRAZIONE_APERTA ? "Crea il tuo account" : "Bentornato"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <p className="mb-6 hidden text-sm text-brand-navy/60 lg:block">
              {mode === "register" && BETA_REGISTRAZIONE_APERTA ? "Crea il tuo account" : "Bentornato"}
            </p>

            {BETA_REGISTRAZIONE_APERTA ? (
              <div className="mb-6 flex rounded-xl bg-brand-bg p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setAccettaTermini(false);
                    setError("");
                    setInfo("");
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    mode === "login"
                      ? "bg-white text-brand-navy shadow-sm"
                      : "text-brand-navy/45 hover:text-brand-navy/70"
                  }`}
                >
                  Accedi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                    setInfo("");
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    mode === "register"
                      ? "bg-white text-brand-navy shadow-sm"
                      : "text-brand-navy/45 hover:text-brand-navy/70"
                  }`}
                >
                  Registrati
                </button>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-brand-navy/45">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
                  placeholder={PLACEHOLDER.loginEmail}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-brand-navy/45">
                  Password
                </label>
                <div className="flex items-center rounded-xl border border-black/10 bg-brand-bg">
                  <input
                    type={mostraPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                    placeholder={mode === "register" && BETA_REGISTRAZIONE_APERTA ? "Minimo 6 caratteri" : "••••••••"}
                    autoComplete={mode === "register" && BETA_REGISTRAZIONE_APERTA ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setMostraPassword((v) => !v)}
                    className="shrink-0 px-3 py-2.5 text-xs font-semibold text-brand-teal hover:underline"
                  >
                    {mostraPassword ? "Nascondi" : "Mostra"}
                  </button>
                </div>
                {mode === "login" ? (
                  <button
                    type="button"
                    onClick={() => void recuperaPassword()}
                    disabled={resetLoading}
                    className="mt-1 block text-xs font-semibold text-brand-teal hover:underline disabled:opacity-60"
                  >
                    {resetLoading ? "Invio email..." : "Password dimenticata?"}
                  </button>
                ) : null}
              </div>

              {mode === "register" && BETA_REGISTRAZIONE_APERTA ? (
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={accettaTermini}
                    onChange={(e) => setAccettaTermini(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-black/20 text-brand-teal focus:ring-brand-teal"
                  />
                  <span className="text-sm leading-relaxed text-brand-navy/65">
                    Accetto i{" "}
                    <button type="button" onClick={apriTerminiWeb} className="font-semibold text-brand-teal hover:underline">
                      termini e condizioni
                    </button>
                    .{" "}
                    <button type="button" onClick={apriHomepageWeb} className="font-semibold text-brand-teal hover:underline">
                      Scopri di più
                    </button>
                  </span>
                </label>
              ) : null}

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {info ? <p className="text-sm text-brand-teal">{info}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-brand-navy py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Attendere..." : mode === "register" && BETA_REGISTRAZIONE_APERTA ? "Crea account" : "Accedi"}
              </button>

              {!BETA_REGISTRAZIONE_APERTA ? (
                <p className="text-center text-sm leading-relaxed text-brand-navy/60">
                  Non hai un account? Richiedi l&apos;accesso alla beta su{" "}
                  <button
                    type="button"
                    onClick={apriHomepageWeb}
                    className="font-semibold text-brand-teal hover:underline"
                  >
                    preventivoai-web.vercel.app
                  </button>
                </p>
              ) : null}
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-black/10" />
              <span className="text-xs text-brand-navy/45">oppure</span>
              <div className="h-px flex-1 bg-black/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-brand-bg py-3 text-sm font-medium text-brand-navy hover:bg-brand-bg/80"
            >
              <span className="text-base font-bold text-[#EA4335]">G</span>
              Continua con Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
