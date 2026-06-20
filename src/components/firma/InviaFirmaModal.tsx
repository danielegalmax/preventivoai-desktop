import { useEffect, useState } from "react";
import type { CanaleFirma } from "../../lib/firma";
import {
  apriEmailFirma,
  apriWhatsAppFirma,
  copiaLinkFirma,
  inviaPreventivoPerFirma,
  caricaMessaggiCliente,
  buildMessaggioFirmaInvio,
  buildOggettoFirmaInvio,
} from "../../lib/firma";
import { sessionToken } from "../../lib/settings";
import { useAppModalKeyboard } from "../ModalShell";

type Props = {
  open: boolean;
  preventivoId: string;
  nomeCliente: string;
  emailCliente?: string | null;
  telefonoCliente?: string | null;
  nomeAzienda?: string;
  haStripe?: boolean;
  onClose: () => void;
  onInviato?: () => void;
  onFirmaManuale?: () => void;
};

export default function InviaFirmaModal({
  open,
  preventivoId,
  nomeCliente,
  emailCliente,
  telefonoCliente,
  nomeAzienda,
  haStripe,
  onClose,
  onInviato,
  onFirmaManuale,
}: Props) {
  const [loading, setLoading] = useState<CanaleFirma | null>(null);
  const [feedback, setFeedback] = useState("");
  const [errore, setErrore] = useState("");

  useEffect(() => {
    if (open) void caricaMessaggiCliente(true);
  }, [open]);

  useAppModalKeyboard(onClose, { enabled: open });

  if (!open) return null;

  async function esegui(canale: CanaleFirma) {
    setErrore("");
    setFeedback("");
    setLoading(canale);
    try {
      const token = await sessionToken();
      const templates = await caricaMessaggiCliente();
      const res = await inviaPreventivoPerFirma(preventivoId, canale, token);
      if (!res.url) throw new Error("Link firma non disponibile. Revoca e reinvia.");
      const testo = buildMessaggioFirmaInvio(nomeCliente, res.url, nomeAzienda, { haStripe, templates });

      if (canale === "whatsapp") {
        await apriWhatsAppFirma(telefonoCliente, testo);
        setFeedback("WhatsApp aperto con il link di firma.");
      } else if (canale === "email") {
        await apriEmailFirma(emailCliente, testo, buildOggettoFirmaInvio(nomeCliente, templates));
        setFeedback(emailCliente ? "Client email aperto con il link." : "Client email aperto: scegli il destinatario.");
      } else {
        await copiaLinkFirma(res.url);
        setFeedback("Link copiato negli appunti.");
      }

      onInviato?.();
      window.setTimeout(onClose, 1200);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Invio non riuscito.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-lg font-semibold text-brand-navy">Invia per firma</h2>
        <p className="mt-2 text-sm text-brand-navy/60">
          Il cliente <strong>{nomeCliente}</strong> potrà firmare online. Il link resta valido 30 giorni.
          {haStripe ? " Il pagamento Stripe è già nella pagina — non serve inviarlo a parte." : ""}
        </p>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            disabled={!!loading}
            onClick={() => void esegui("whatsapp")}
            className="w-full rounded-xl border border-black/10 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-bg disabled:opacity-60"
          >
            {loading === "whatsapp" ? "Preparazione…" : "WhatsApp"}
          </button>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => void esegui("email")}
            className="w-full rounded-xl border border-black/10 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-bg disabled:opacity-60"
          >
            {loading === "email" ? "Preparazione…" : "Email"}
          </button>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => void esegui("link")}
            className="w-full rounded-xl border border-black/10 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-bg disabled:opacity-60"
          >
            {loading === "link" ? "Preparazione…" : "Copia link"}
          </button>
        </div>

        {feedback ? <p className="mt-3 text-sm font-medium text-brand-teal">{feedback}</p> : null}
        {errore ? <p className="mt-3 text-sm text-red-600">{errore}</p> : null}

        {onFirmaManuale ? (
          <button
            type="button"
            onClick={() => { onClose(); onFirmaManuale(); }}
            className="mt-4 w-full text-sm font-medium text-brand-teal hover:underline"
          >
            Il cliente ha firmato a mano
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-2.5 text-sm text-brand-navy/60 hover:text-brand-navy"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}
