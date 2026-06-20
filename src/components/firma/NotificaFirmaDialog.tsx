import type { Notifica } from "../../lib/notifiche";
import {
  apriEmailFirma,
  apriWhatsAppFirma,
  apriPdfFirmatoDaNotifica,
  disabilitaReminderInvio,
  inviaPreventivoPerFirma,
  registraReminderWhatsapp,
  caricaMessaggiCliente,
  buildMessaggioFirmaReminder,
  buildOggettoFirmaReminder,
} from "../../lib/firma";
import { sessionToken } from "../../lib/settings";

type Props = {
  notifica: Notifica;
  onClose: () => void;
  onSegnaPagato: (preventivoId: string) => void;
  onRimanda: () => void;
  onCompletata: () => void;
};

export default function NotificaFirmaDialog({
  notifica,
  onClose,
  onSegnaPagato,
  onRimanda,
  onCompletata,
}: Props) {
  const preventivoId = notifica.preventivo_id;
  const invioId = notifica.invio_id;
  const payload = notifica.payload || {};

  async function inviaReminderWhatsApp() {
    if (!preventivoId) return;
    const token = await sessionToken();
    const templates = await caricaMessaggiCliente();
    const res = await inviaPreventivoPerFirma(preventivoId, "whatsapp", token);
    if (!res.url) throw new Error("Link non disponibile");
    const testo = buildMessaggioFirmaReminder(payload.nomeCliente || "Cliente", res.url, undefined, { templates });
    apriWhatsAppFirma(payload.telefonoCliente, testo);
    if (invioId) await registraReminderWhatsapp(invioId);
    onCompletata();
  }

  async function inviaReminderEmail() {
    const templates = await caricaMessaggiCliente();
    const url = payload.urlFirma || (preventivoId
      ? (await inviaPreventivoPerFirma(preventivoId, "link", await sessionToken())).url
      : null);
    if (!url) throw new Error("Link non disponibile");
    apriEmailFirma(
      payload.emailCliente,
      buildMessaggioFirmaReminder(payload.nomeCliente || "Cliente", url, undefined, { templates }),
      buildOggettoFirmaReminder(templates),
    );
    onCompletata();
  }

  async function apriPdfFirmato() {
    if (!preventivoId) return;
    try {
      await apriPdfFirmatoDaNotifica(preventivoId);
    } catch {
      window.alert(
        "Impossibile aprire il documento firmato in questo momento. Riprova tra poco dal dettaglio firma.",
      );
    }
  }

  if (notifica.tipo === "firma_ricevuta") {
    const mostraPdfFirmato = Boolean(preventivoId);
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold text-brand-navy">{notifica.titolo}</h2>
          <p className="mt-2 text-sm text-brand-navy/70">{notifica.messaggio}</p>
          <div className="mt-5 grid gap-2">
            {mostraPdfFirmato ? (
              <button
                type="button"
                onClick={() => void apriPdfFirmato()}
                className="w-full rounded-xl border border-brand-teal py-3 text-sm font-semibold text-brand-teal"
              >
                Apri PDF firmato
              </button>
            ) : null}
            {preventivoId && payload.chiediPagato ? (
              <button
                type="button"
                onClick={() => { onSegnaPagato(preventivoId); onClose(); }}
                className="w-full rounded-xl bg-brand-teal py-3 text-sm font-semibold text-white"
              >
                Segna come pagato
              </button>
            ) : null}
            {preventivoId && !payload.chiediPagato ? (
              <button
                type="button"
                onClick={() => { onCompletata(); onClose(); }}
                className="w-full rounded-xl bg-brand-teal py-3 text-sm font-semibold text-white"
              >
                Visto
              </button>
            ) : null}
            <button type="button" onClick={onRimanda} className="w-full py-2 text-sm text-brand-navy/60">
              Rimanda (24 h)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-brand-navy">{notifica.titolo}</h2>
        <p className="mt-2 text-sm text-brand-navy/70">{notifica.messaggio}</p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => void inviaReminderWhatsApp().catch(() => onRimanda())}
            className="w-full rounded-xl bg-brand-teal py-3 text-sm font-semibold text-white"
          >
            Sì — WhatsApp
          </button>
          <button
            type="button"
            onClick={() => void inviaReminderEmail().catch(() => onRimanda())}
            className="w-full rounded-xl border border-black/10 py-3 text-sm font-semibold text-brand-navy"
          >
            Sì — Email
          </button>
          <button type="button" onClick={onRimanda} className="w-full py-2 text-sm text-brand-navy/70">
            Rimanda (24 h)
          </button>
          {invioId ? (
            <button
              type="button"
              onClick={() => { void disabilitaReminderInvio(invioId).then(() => onCompletata()); }}
              className="w-full py-2 text-xs text-brand-navy/50 underline"
            >
              Non chiedermelo più per questo preventivo
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
