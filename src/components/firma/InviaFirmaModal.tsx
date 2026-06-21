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
  registraFirmaManuale,
} from "../../lib/firma";
import { sessionToken } from "../../lib/settings";
import { useAppModalKeyboard } from "../ModalShell";
import { useConfirmDialog } from "../../lib/hooks/useConfirmDialog";

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
  onFirmaSuCarta?: () => void;
};

const MESSAGGIO_CONFERMA_CARTA =
  "Segnare questo preventivo come firmato su carta? Non verrà inviato alcun link online.";

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
  onFirmaSuCarta,
}: Props) {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [loading, setLoading] = useState<CanaleFirma | null>(null);
  const [feedback, setFeedback] = useState("");
  const [errore, setErrore] = useState("");
  const [linkFallbackUrl, setLinkFallbackUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setErrore("");
    setFeedback("");
    setLinkFallbackUrl("");
    void caricaMessaggiCliente(true);
  }, [open]);

  useAppModalKeyboard(onClose, { enabled: open && !confirmDialog });

  if (!open) return null;

  async function esegui(canale: CanaleFirma) {
    setErrore("");
    setFeedback("");
    setLinkFallbackUrl("");
    setLoading(canale);
    try {
      const token = await sessionToken();
      const templates = await caricaMessaggiCliente();
      const res = await inviaPreventivoPerFirma(preventivoId, canale, token);
      if (!res.url) throw new Error("Link firma non disponibile. Revoca e reinvia.");
      const testo = buildMessaggioFirmaInvio(nomeCliente, res.url, nomeAzienda, { haStripe, templates });

      let autoClose = true;

      if (canale === "whatsapp") {
        await apriWhatsAppFirma(telefonoCliente, testo);
        setFeedback("WhatsApp aperto con il link di firma.");
      } else if (canale === "email") {
        await apriEmailFirma(emailCliente, testo, buildOggettoFirmaInvio(nomeCliente, templates));
        setFeedback(emailCliente ? "Client email aperto con il link." : "Client email aperto: scegli il destinatario.");
      } else {
        const copiato = await copiaLinkFirma(res.url);
        if (copiato) {
          setFeedback("Link copiato negli appunti.");
        } else {
          setLinkFallbackUrl(res.url);
          setFeedback("Link creato. Copia manualmente:");
          autoClose = false;
        }
      }

      onInviato?.();
      if (autoClose) {
        window.setTimeout(onClose, 1200);
      }
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Invio non riuscito.");
    } finally {
      setLoading(null);
    }
  }

  async function chiediSegnaSuCarta() {
    const ok = await confirm({
      title: "Firma su carta",
      message: MESSAGGIO_CONFERMA_CARTA,
      confirmLabel: "Segna firmato",
      destructive: false,
      zClass: "z-[80]",
    });
    if (!ok) return;

    setErrore("");
    setFeedback("");
    setLinkFallbackUrl("");
    setLoading("manuale");
    try {
      await registraFirmaManuale(preventivoId);
      setFeedback("Preventivo segnato come firmato su carta.");
      (onFirmaSuCarta ?? onInviato)?.();
      window.setTimeout(onClose, 1200);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Operazione non riuscita.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      {confirmDialog}

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
          {linkFallbackUrl ? (
            <input
              type="text"
              readOnly
              value={linkFallbackUrl}
              aria-label="Link firma da copiare manualmente"
              onFocus={(e) => e.target.select()}
              className="mt-2 w-full rounded-lg border border-brand-teal/30 bg-brand-teal/5 px-3 py-2 text-xs text-brand-navy selection:bg-brand-teal/20"
            />
          ) : null}
          {errore ? <p className="mt-3 text-sm text-red-600">{errore}</p> : null}

          <div className="mt-5 border-t border-black/10 pt-4">
            <button
              type="button"
              disabled={!!loading}
              onClick={() => void chiediSegnaSuCarta()}
              className="w-full rounded-xl border border-brand-teal/30 bg-brand-teal/5 py-3 text-sm font-semibold text-brand-teal hover:bg-brand-teal/10 disabled:opacity-60"
            >
              {loading === "manuale" ? "Registrazione…" : "Il cliente ha già firmato su carta"}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-xl py-2.5 text-sm text-brand-navy/60 hover:text-brand-navy"
          >
            Annulla
          </button>
        </div>
      </div>
    </>
  );
}
