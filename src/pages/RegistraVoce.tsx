import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import PageContainer from "../components/PageContainer";
import { getModificaSession } from "../lib/modificaPreventivo/modificaSession";
import { percorsoNuovoPreventivoHub } from "../lib/nuovoNav";
import { trascriviAudio } from "../lib/listinoSmart";
import {
  annullaRegistrazioneVocale,
  avviaRegistrazioneVocale,
  fermaRegistrazioneVocale,
  isRegistrazioneVocaleAttiva,
} from "../lib/listinoMedia";
import { supabase } from "../lib/supabase";

export default function RegistraVoce() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inModifica = searchParams.get("modifica") === "1" || Boolean(getModificaSession());
  const clienteId = searchParams.get("cliente_id") ?? undefined;
  const clienteNome = searchParams.get("cliente_nome") ?? undefined;

  const [registrando, setRegistrando] = useState(false);
  const [trascrivendo, setTrascrivendo] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    return () => annullaRegistrazioneVocale();
  }, []);

  async function toggleRegistrazione() {
    setErrore("");
    if (registrando) {
      await fermaETrascrivi();
      return;
    }
    try {
      await avviaRegistrazioneVocale();
      setRegistrando(isRegistrazioneVocaleAttiva());
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Impossibile avviare la registrazione.");
    }
  }

  async function fermaETrascrivi() {
    setRegistrando(false);
    setTrascrivendo(true);
    try {
      const audioBase64 = await fermaRegistrazioneVocale();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessione non valida");

      const trascrizione = await trascriviAudio(audioBase64);
      const sessionModifica = getModificaSession();
      const params = new URLSearchParams();
      params.set("trascrizione", trascrizione);
      if (sessionModifica || inModifica) params.set("modifica", "1");
      if (clienteId) params.set("cliente_id", clienteId);
      if (clienteNome) params.set("cliente_nome", clienteNome);
      navigate(`/nuovo/chat?${params.toString()}`);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante la trascrizione.");
    } finally {
      setTrascrivendo(false);
    }
  }

  const indietro = inModifica ? "/storico" : percorsoNuovoPreventivoHub(clienteId, clienteNome);

  return (
    <PageContainer>
      <Link to={indietro} className="text-sm text-brand-navy/60 hover:text-brand-navy">
        ← Indietro
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-brand-navy">Registra voce</h1>
      <p className="mt-2 text-sm text-brand-navy/60">
        {inModifica
          ? "Descrivi a voce le modifiche da apportare al preventivo."
          : "Parla del lavoro da preventivare: trascrivo e passo alla chat."}
      </p>

      <div className="mx-auto mt-12 flex max-w-md flex-col items-center gap-6">
        {trascrivendo ? (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
            <p className="text-brand-navy/70">Trascrizione in corso...</p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void toggleRegistrazione()}
              className={`flex h-28 w-28 items-center justify-center rounded-full text-4xl transition-colors ${
                registrando ? "bg-red-500/15 text-red-600 ring-4 ring-red-500/30" : "bg-brand-navy/10 text-brand-navy hover:bg-brand-teal/15"
              }`}
              aria-label={registrando ? "Ferma registrazione" : "Avvia registrazione"}
            >
              {registrando ? "⏹" : "🎙"}
            </button>
            <p className="text-center text-sm text-brand-navy/60">
              {registrando ? "Registrazione in corso — premi per fermare" : "Premi per iniziare a parlare"}
            </p>
          </>
        )}

        {errore ? <p className="text-center text-sm text-red-600">{errore}</p> : null}
      </div>
    </PageContainer>
  );
}
