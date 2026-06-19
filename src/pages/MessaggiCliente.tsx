import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import PageContainer from "../components/PageContainer";
import MessaggiClienteEditor from "../components/settings/MessaggiClienteEditor";
import {
  MESSAGGI_CLIENTE_DEFAULT,
  caricaMessaggiCliente,
  type MessaggiClienteTemplates,
} from "../lib/messaggiCliente";
import { caricaSettingsData, salvaProfiloSettings } from "../lib/settings";

function ModificheNonSalvateDialog({
  onAbbandona,
  onContinua,
  onSalva,
  salvando,
}: {
  onAbbandona: () => void;
  onContinua: () => void;
  onSalva: () => void;
  salvando: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onContinua}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-center text-lg font-semibold text-brand-navy">Modifiche non salvate</h2>
        <p className="mt-4 text-center text-sm leading-relaxed text-brand-navy/70">
          Vuoi salvare le modifiche ai messaggi?
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onAbbandona}
            className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Abbandona
          </button>
          <button
            type="button"
            onClick={onContinua}
            className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-brand-navy hover:bg-brand-bg"
          >
            Continua
          </button>
          <button
            type="button"
            onClick={onSalva}
            disabled={salvando}
            className="flex-1 rounded-xl bg-brand-teal py-2.5 text-sm font-semibold text-white hover:bg-brand-teal/90 disabled:opacity-60"
          >
            {salvando ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MessaggiClientePage() {
  const navigate = useNavigate();
  const [messaggi, setMessaggi] = useState<MessaggiClienteTemplates>(MESSAGGI_CLIENTE_DEFAULT);
  const [reminderGiorni, setReminderGiorni] = useState(3);
  const [reminderDisabilitato, setReminderDisabilitato] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [messaggio, setMessaggio] = useState("");
  const [errore, setErrore] = useState("");
  const [modificheNonSalvate, setModificheNonSalvate] = useState(false);
  const [dialogUscita, setDialogUscita] = useState(false);
  const messaggiRef = useRef(messaggi);
  useEffect(() => { messaggiRef.current = messaggi; }, [messaggi]);
  const reminderRef = useRef({ giorni: reminderGiorni, disabilitato: reminderDisabilitato });
  useEffect(() => { reminderRef.current = { giorni: reminderGiorni, disabilitato: reminderDisabilitato }; }, [reminderGiorni, reminderDisabilitato]);

  useEffect(() => {
    if (!modificheNonSalvate) return;
    const avviso = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", avviso);
    return () => window.removeEventListener("beforeunload", avviso);
  }, [modificheNonSalvate]);

  useEffect(() => {
    void Promise.all([caricaMessaggiCliente(true), caricaSettingsData()]).then(([data, settings]) => {
      setMessaggi(data);
      if (settings?.form) {
        setReminderGiorni(settings.form.reminder_firma_giorni);
        setReminderDisabilitato(settings.form.reminder_firma_globale_disabilitato);
      }
      setLoading(false);
    });
  }, []);

  async function salvaSilenzioso(): Promise<boolean> {
    setSalvando(true);
    setMessaggio("");
    setErrore("");
    const settings = await caricaSettingsData();
    if (!settings?.form) {
      setSalvando(false);
      setErrore("Utente non autenticato");
      return false;
    }
    const { error } = await salvaProfiloSettings({
      ...settings.form,
      messaggi: messaggiRef.current,
      reminder_firma_giorni: reminderRef.current.giorni,
      reminder_firma_globale_disabilitato: reminderRef.current.disabilitato,
    });
    setSalvando(false);
    if (error) {
      setErrore(error.message);
      return false;
    }
    setModificheNonSalvate(false);
    return true;
  }

  async function salva() {
    const ok = await salvaSilenzioso();
    if (ok) setMessaggio("Salvato.");
  }

  function handleChange(next: MessaggiClienteTemplates) {
    setMessaggi(next);
    setModificheNonSalvate(true);
    setMessaggio("");
    setErrore("");
  }

  function richiediUscita(e: MouseEvent) {
    if (!modificheNonSalvate) return;
    e.preventDefault();
    setDialogUscita(true);
  }

  function continuaModifica() {
    setDialogUscita(false);
  }

  function abbandonaModifiche() {
    setModificheNonSalvate(false);
    setDialogUscita(false);
    navigate("/impostazioni");
  }

  async function salvaEdEsci() {
    const ok = await salvaSilenzioso();
    if (!ok) return;
    setDialogUscita(false);
    navigate("/impostazioni");
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
      <Link
        to="/impostazioni"
        onClick={richiediUscita}
        className="text-sm text-brand-navy/60 hover:text-brand-navy"
      >
        ← Torna alle impostazioni
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-brand-navy">Comunicazione cliente</h1>
      <p className="mt-1 text-sm text-brand-navy/60">
        Personalizza messaggi WhatsApp ed email, template per la firma digitale e automazione dei reminder.
      </p>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <MessaggiClienteEditor
          messaggi={messaggi}
          onChange={handleChange}
          reminderGiorni={reminderGiorni}
          reminderDisabilitato={reminderDisabilitato}
          onReminderGiorniChange={(v) => { setReminderGiorni(v); setModificheNonSalvate(true); }}
          onReminderDisabilitatoChange={(v) => { setReminderDisabilitato(v); setModificheNonSalvate(true); }}
        />

        {errore && <p className="mt-4 text-sm text-red-600">{errore}</p>}
        {messaggio && <p className="mt-4 text-sm text-brand-teal">{messaggio}</p>}

        <button
          type="button"
          onClick={() => void salva()}
          disabled={salvando}
          className="mt-4 rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {salvando ? "Salvataggio..." : "Salva"}
        </button>
      </div>

      {dialogUscita && (
        <ModificheNonSalvateDialog
          salvando={salvando}
          onContinua={continuaModifica}
          onAbbandona={abbandonaModifiche}
          onSalva={() => void salvaEdEsci()}
        />
      )}
    </PageContainer>
  );
}
