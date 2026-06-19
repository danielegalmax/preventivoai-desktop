import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageContainer from "../components/PageContainer";
import { useSegnalazioneFeedback } from "../components/SegnalazioneProvider";
import {
  aggiornaPasswordAccount,
  caricaProfiloUtente,
  eliminaAccount,
  logoutAccount,
  verificaPasswordAccount,
} from "../lib/profilo";

export default function Profilo() {
  const navigate = useNavigate();
  const { apriSegnalazione } = useSegnalazioneFeedback();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [nomeAzienda, setNomeAzienda] = useState("");

  const [passwordAttuale, setPasswordAttuale] = useState("");
  const [passwordNuova, setPasswordNuova] = useState("");
  const [passwordConferma, setPasswordConferma] = useState("");
  const [salvandoPassword, setSalvandoPassword] = useState(false);

  const [errore, setErrore] = useState("");
  const [messaggio, setMessaggio] = useState("");

  const iniziale = useMemo(() => (nomeAzienda?.trim()?.charAt(0)?.toUpperCase() || "?"), [nomeAzienda]);

  useEffect(() => {
    caricaProfiloUtente().then((p) => {
      if (p) {
        setEmail(p.email);
        setNomeAzienda(p.nomeAzienda);
      }
      setLoading(false);
    });
  }, []);

  async function cambiaPassword() {
    setMessaggio("");
    setErrore("");
    const attuale = passwordAttuale.trim();
    const nuova = passwordNuova.trim();
    const conferma = passwordConferma.trim();

    if (!attuale) {
      setErrore("Inserisci la password attuale.");
      return;
    }
    if (nuova.length < 6) {
      setErrore("La nuova password deve avere almeno 6 caratteri.");
      return;
    }
    if (nuova !== conferma) {
      setErrore("La conferma non corrisponde alla nuova password.");
      return;
    }
    if (nuova === attuale) {
      setErrore("La nuova password deve essere diversa da quella attuale.");
      return;
    }

    setSalvandoPassword(true);
    const { error: errVerify } = await verificaPasswordAccount(email, attuale);
    if (errVerify) {
      setSalvandoPassword(false);
      setErrore("Password attuale non corretta.");
      return;
    }

    const { error } = await aggiornaPasswordAccount(nuova);
    setSalvandoPassword(false);
    if (error) {
      setErrore(error.message);
      return;
    }

    setPasswordAttuale("");
    setPasswordNuova("");
    setPasswordConferma("");
    setMessaggio("Password aggiornata.");
  }

  async function logout() {
    if (!window.confirm("Vuoi uscire dall'account?")) return;
    await logoutAccount();
    navigate("/login");
  }

  async function elimina() {
    const conferma1 = window.confirm(
      "Questa azione è irreversibile. Tutti i tuoi dati verranno eliminati. Vuoi continuare?",
    );
    if (!conferma1) return;
    const conferma2 = window.confirm("Conferma finale: sei assolutamente sicuro?");
    if (!conferma2) return;

    try {
      await eliminaAccount();
      await logoutAccount();
      navigate("/login");
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Impossibile eliminare account.");
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <p className="text-brand-navy/60">Caricamento...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-brand-navy">Profilo</h1>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-bg text-lg font-semibold text-brand-navy">
            {iniziale}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-brand-navy">{nomeAzienda || "Nome azienda"}</p>
            <p className="truncate text-sm text-brand-navy/60">{email}</p>
          </div>
          <Link to="/impostazioni" className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-bg">
            Modifica
          </Link>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">Sicurezza</p>
        <p className="mt-1 text-sm text-brand-navy/60">Cambia la password del tuo account.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm text-brand-navy/70">Password attuale</label>
            <input
              value={passwordAttuale}
              onChange={(e) => setPasswordAttuale(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-brand-navy/70">Nuova password</label>
            <input
              value={passwordNuova}
              onChange={(e) => setPasswordNuova(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-brand-navy/70">Conferma nuova password</label>
            <input
              value={passwordConferma}
              onChange={(e) => setPasswordConferma(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={cambiaPassword}
          disabled={salvandoPassword}
          className="mt-3 rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {salvandoPassword ? "Salvataggio..." : "Cambia password"}
        </button>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">Aiuto e feedback</p>
        <p className="mt-1 text-sm text-brand-navy/60">
          Segnala un bug o suggerisci un miglioramento. La schermata attuale viene compilata automaticamente.
        </p>
        <button
          type="button"
          onClick={apriSegnalazione}
          className="mt-3 rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-bg"
        >
          Segnala un problema
        </button>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">Notifiche</p>
        <p className="mt-2 text-sm text-brand-navy/60">
          Su desktop le notifiche push non sono ancora disponibili. (Su mobile sono i promemoria e gli aggiornamenti.)
        </p>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">App</p>
        <div className="mt-3 space-y-2">
          <Link to="/app" className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 text-sm text-brand-navy hover:bg-brand-bg">
            <span>Impostazioni app</span>
            <span className="text-brand-navy/40">→</span>
          </Link>
        </div>
      </div>

      {errore && <p className="mt-3 text-sm text-red-600">{errore}</p>}
      {messaggio && <p className="mt-3 text-sm text-brand-teal">{messaggio}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={logout}
          className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-semibold text-brand-navy/70 hover:bg-brand-bg"
        >
          Esci dall&apos;account
        </button>
        <button
          type="button"
          onClick={elimina}
          className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Elimina account
        </button>
      </div>
    </PageContainer>
  );
}

