import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { caricaStorico, caricaCollegamentiPianoPreventivi } from "../lib/storico";
import { conteggioCestino } from "../lib/cestino";
import type { CollegamentiPianoMap } from "../lib/collegamentiPiano";
import type { Preventivo } from "../lib/types";
import PageContainer from "../components/PageContainer";
import PreventiviLista from "../components/PreventiviLista";
import { NotificaAzioneStorico } from "../components/NotificheBell";
import { caricaNotificaById, type Notifica } from "../lib/notifiche";
import { eventBus } from "../lib/eventBus";

export default function Storico() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const notificaIdParam = searchParams.get("notifica");

  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [collegamentiPiano, setCollegamentiPiano] = useState<CollegamentiPianoMap>({});
  const [loading, setLoading] = useState(true);
  const [vociCestino, setVociCestino] = useState(0);
  const [notificaAzione, setNotificaAzione] = useState<Notifica | null>(null);
  const [focusPronto, setFocusPronto] = useState(!focusId);

  useEffect(() => {
    Promise.all([caricaStorico(), caricaCollegamentiPianoPreventivi(), conteggioCestino()]).then(
      ([data, collegamenti, cestino]) => {
        setPreventivi(data);
        setCollegamentiPiano(collegamenti);
        setVociCestino(cestino);
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!notificaIdParam) return;
    void caricaNotificaById(notificaIdParam).then((n) => {
      if (n) setNotificaAzione(n);
    });
  }, [notificaIdParam]);

  useEffect(() => {
    return eventBus.onApriNotifica(({ notifica }) => {
      setNotificaAzione(notifica);
    });
  }, []);

  function consumaFocus() {
    setFocusPronto(true);
    if (focusId) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("focus");
        return next;
      }, { replace: true });
    }
  }

  function chiudiNotificaAzione() {
    setNotificaAzione(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("notifica");
      return next;
    }, { replace: true });
  }

  const mostraAzione = !!notificaAzione && (focusPronto || !focusId);

  return (
    <PageContainer>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Storico preventivi</h1>
          <p className="mt-1 text-sm text-brand-navy/55">Preventivi attivi e versioni precedenti.</p>
        </div>
        <Link
          to="/cestino"
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-brand-navy/70 shadow-sm hover:bg-brand-bg"
        >
          Elementi eliminati
          {vociCestino > 0 && (
            <span className="rounded-full bg-brand-teal/15 px-2 py-0.5 text-xs font-semibold text-brand-teal">
              {vociCestino}
            </span>
          )}
        </Link>
      </div>

      {loading && <p className="mt-4 text-brand-navy/60">Caricamento...</p>}
      {!loading && preventivi.length === 0 && <p className="mt-4 text-brand-navy/60">Nessun preventivo ancora.</p>}

      {!loading && preventivi.length > 0 && (
        <div className="mt-4">
          <PreventiviLista
            preventivi={preventivi}
            setPreventivi={setPreventivi}
            variant="storico"
            collegamentiPiano={collegamentiPiano}
            focusPreventivoId={focusId}
            onFocusConsumato={consumaFocus}
          />
        </div>
      )}

      {mostraAzione ? (
        <NotificaAzioneStorico notifica={notificaAzione} onClose={chiudiNotificaAzione} />
      ) : null}
    </PageContainer>
  );
}
