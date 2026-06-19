import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import SegnalazioneModal from "./SegnalazioneModal";
import {
  SEGNALAZIONE_VUOTA,
  etichettaSchermata,
  inviaSegnalazione,
  type SegnalazioneForm,
} from "../lib/segnalazioni";

type SegnalazioneContextValue = {
  apriSegnalazione: () => void;
};

const SegnalazioneContext = createContext<SegnalazioneContextValue | null>(null);

export function SegnalazioneProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SegnalazioneForm>(SEGNALAZIONE_VUOTA);
  const [inviando, setInviando] = useState(false);

  const apriSegnalazione = useCallback(() => {
    setForm({
      ...SEGNALAZIONE_VUOTA,
      schermata: etichettaSchermata(location.pathname),
    });
    setOpen(true);
  }, [location.pathname]);

  function patchForm(patch: Partial<SegnalazioneForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function invia() {
    if (!form.titolo.trim() || !form.descrizione.trim()) {
      window.alert("Inserisci titolo e descrizione.");
      return;
    }
    setInviando(true);
    const { error, user } = await inviaSegnalazione(form);
    setInviando(false);
    if (!user) return;
    if (error) {
      window.alert("Impossibile inviare la segnalazione.");
      return;
    }
    setOpen(false);
    setForm(SEGNALAZIONE_VUOTA);
    window.alert("Grazie! Analizzeremo il problema il prima possibile.");
  }

  return (
    <SegnalazioneContext.Provider value={{ apriSegnalazione }}>
      {children}
      <SegnalazioneModal
        open={open}
        form={form}
        inviando={inviando}
        onClose={() => setOpen(false)}
        onChange={patchForm}
        onInvia={() => void invia()}
      />
    </SegnalazioneContext.Provider>
  );
}

export function useSegnalazioneFeedback() {
  const ctx = useContext(SegnalazioneContext);
  if (!ctx) {
    throw new Error("useSegnalazioneFeedback va usato dentro SegnalazioneProvider");
  }
  return ctx;
}
