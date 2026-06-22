import { useState } from "react";
import { useNavigate } from "react-router";
import { formatImportoEuro } from "preventivoai-shared";
import type { Notifica } from "../../lib/notifiche";
import { formatDataBreve } from "../../lib/format";
import { creaLinkPagamentoRata } from "../../lib/pdf";
import { sessioneClienteDettaglio } from "../../lib/clienteDettaglio";
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
import { useAppModalKeyboard } from "../ModalShell";

const MESI_FULL = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

type Props = {
  notifica: Notifica;
  onClose: () => void;
  onSegnaPagato: (preventivoId: string) => void;
  onRimanda: () => void;
  onCompletata: () => void;
};

function nomeClienteDaPayload(payload: Notifica["payload"]) {
  return payload.cliente_nome || payload.nomeCliente || "Cliente";
}

export default function NotificaFirmaDialog({
  notifica,
  onClose,
  onSegnaPagato,
  onRimanda,
  onCompletata,
}: Props) {
  useAppModalKeyboard(onClose);
  const navigate = useNavigate();
  const [waLoading, setWaLoading] = useState(false);

  const preventivoId = notifica.preventivo_id;
  const invioId = notifica.invio_id;
  const payload = notifica.payload || {};

  async function inviaReminderFirmaWhatsApp() {
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

  async function inviaReminderFirmaEmail() {
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

  async function inviaReminderRataWhatsApp() {
    const rataId = payload.rata_id;
    if (!rataId) return;
    setWaLoading(true);
    try {
      const clienteNome = nomeClienteDaPayload(payload);
      const residuo = typeof payload.importo_residuo === "number" ? payload.importo_residuo : 0;
      const session = await sessioneClienteDettaglio();
      if (!session) throw new Error("Sessione non valida");
      const link = await creaLinkPagamentoRata(rataId, clienteNome, session.access_token);

      let testo: string;
      if (payload.tipo_piano === "canone" && payload.mese && payload.anno) {
        testo = `Ciao ${clienteNome}, ti ricordo il pagamento di €${formatImportoEuro(residuo, 2)} per il canone di ${MESI_FULL[payload.mese - 1]} ${payload.anno}. Puoi pagare qui: ${link}`;
      } else if (payload.scadenza) {
        testo = `Ciao ${clienteNome}, ti ricordo il pagamento di €${formatImportoEuro(residuo, 2)} per la rata del ${formatDataBreve(payload.scadenza)}. Puoi pagare qui: ${link}`;
      } else {
        testo = `Ciao ${clienteNome}, ti ricordo il pagamento di €${formatImportoEuro(residuo, 2)}. Puoi pagare qui: ${link}`;
      }

      const waUrl = `https://wa.me/?text=${encodeURIComponent(testo)}`;
      try {
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(waUrl);
      } catch {
        window.open(waUrl, "_blank");
      }
      onCompletata();
    } catch {
      onRimanda();
    } finally {
      setWaLoading(false);
    }
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

  if (notifica.tipo === "pagamento_ricevuto") {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold text-brand-navy">{notifica.titolo}</h2>
          <p className="mt-2 text-sm text-brand-navy/70">{notifica.messaggio}</p>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => { onCompletata(); onClose(); }}
              className="w-full rounded-xl bg-brand-teal py-3 text-sm font-semibold text-white"
            >
              Visto
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (notifica.tipo === "rata_in_scadenza") {
    const clienteNome = nomeClienteDaPayload(payload);
    const importoResiduo = typeof payload.importo_residuo === "number" ? payload.importo_residuo : null;
    const scadenza = payload.scadenza ? formatDataBreve(payload.scadenza) : null;
    const clienteId = payload.cliente_id;

    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold text-brand-navy">{notifica.titolo}</h2>
          <p className="mt-2 text-sm text-brand-navy/70">{notifica.messaggio}</p>
          <dl className="mt-4 space-y-2 rounded-xl bg-brand-bg/60 px-4 py-3 text-sm text-brand-navy">
            <div className="flex justify-between gap-4">
              <dt className="text-brand-navy/55">Cliente</dt>
              <dd className="font-medium text-right">{clienteNome}</dd>
            </div>
            {importoResiduo != null ? (
              <div className="flex justify-between gap-4">
                <dt className="text-brand-navy/55">Importo residuo</dt>
                <dd className="font-medium text-right">€{formatImportoEuro(importoResiduo, 2)}</dd>
              </div>
            ) : null}
            {scadenza ? (
              <div className="flex justify-between gap-4">
                <dt className="text-brand-navy/55">Scadenza</dt>
                <dd className="font-medium text-right">{scadenza}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              disabled={!payload.rata_id || waLoading}
              onClick={() => void inviaReminderRataWhatsApp()}
              className="w-full rounded-xl bg-brand-teal py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {waLoading ? "Invio in corso…" : "Invia reminder WA"}
            </button>
            {clienteId ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/clienti/${clienteId}`);
                }}
                className="w-full rounded-xl border border-black/10 py-3 text-sm font-semibold text-brand-navy"
              >
                Vai al cliente
              </button>
            ) : null}
            <button type="button" onClick={onRimanda} className="w-full py-2 text-sm text-brand-navy/70">
              Rimanda (24 h)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (notifica.tipo === "reminder_firma") {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold text-brand-navy">{notifica.titolo}</h2>
          <p className="mt-2 text-sm text-brand-navy/70">{notifica.messaggio}</p>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => void inviaReminderFirmaWhatsApp().catch(() => onRimanda())}
              className="w-full rounded-xl bg-brand-teal py-3 text-sm font-semibold text-white"
            >
              Sì — WhatsApp
            </button>
            <button
              type="button"
              onClick={() => void inviaReminderFirmaEmail().catch(() => onRimanda())}
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

  return null;
}
