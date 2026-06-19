import { useEffect, useRef, useState } from "react";
import type { Preventivo } from "../../lib/types";
import { formatData } from "../../lib/format";
import type { PreventivoInvio } from "../../lib/firma";
import {
  annullaFirmaOnline,
  apriEmailFirma,
  apriWhatsAppFirma,
  caricaContattiCliente,
  caricaMessaggiCliente,
  copiaLinkFirma,
  buildMessaggioFirmaInvio,
  buildOggettoFirmaInvio,
  isFirmaManuale,
  isFirmaOnline,
  ottieniUrlFirma,
  registraFirmaManuale,
  statoFirmaInvio,
} from "../../lib/firma";

type Props = {
  open: boolean;
  preventivo: Preventivo;
  invio?: PreventivoInvio;
  nomeAzienda?: string;
  onClose: () => void;
  onInviaNuovo?: () => void;
  onAggiornato?: () => void;
  onFirmaAnnullata?: () => void;
};

export default function FirmaDettaglioModal({
  open,
  preventivo,
  invio,
  nomeAzienda,
  onClose,
  onInviaNuovo,
  onAggiornato,
  onFirmaAnnullata,
}: Props) {
  const sf = statoFirmaInvio(invio);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [confermaAnnulla, setConfermaAnnulla] = useState(false);
  const [telefono, setTelefono] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const nomeCliente = preventivo.nome_cliente || "Cliente";

  useEffect(() => {
    if (!open) return;
    setFeedback("");
    setConfermaAnnulla(false);
    if (!preventivo.cliente_id) return;
    void caricaContattiCliente(preventivo.cliente_id).then((c) => {
      if (c) {
        setTelefono(c.telefono);
        setEmail(c.email);
      }
    });
  }, [open, preventivo.cliente_id]);

  if (!open) return null;

  async function condividi(tipo: "whatsapp" | "email" | "link") {
    setFeedback("");
    setLoading(tipo);
    try {
      const url = await ottieniUrlFirma(preventivo.id, invio);
      const templates = await caricaMessaggiCliente();
      const testo = buildMessaggioFirmaInvio(nomeCliente, url, nomeAzienda, { templates });
      if (tipo === "whatsapp") {
        await apriWhatsAppFirma(telefono, testo);
        setFeedback("WhatsApp aperto con il link.");
      } else if (tipo === "email") {
        await apriEmailFirma(email, testo, buildOggettoFirmaInvio(nomeCliente, templates));
        setFeedback(email ? "Email aperta con il link." : "Client email aperto: scegli il destinatario.");
      } else {
        await copiaLinkFirma(url);
        setFeedback("Link copiato negli appunti.");
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Operazione non riuscita.");
    } finally {
      setLoading(null);
    }
  }

  async function segnaFirmatoManuale(documento?: { base64: string; mimeType: string }) {
    setFeedback("");
    setLoading(documento ? "upload" : "manuale");
    try {
      await registraFirmaManuale(preventivo.id, documento);
      setFeedback(
        documento
          ? "Documento caricato. Preventivo segnato come firmato."
          : "Preventivo segnato come firmato a mano.",
      );
      onAggiornato?.();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Operazione non riuscita.");
    } finally {
      setLoading(null);
    }
  }

  async function annullaFirma() {
    setFeedback("");
    setLoading("annulla");
    try {
      const res = await annullaFirmaOnline(preventivo.id);
      setConfermaAnnulla(false);
      setFeedback(
        res.link_attivo
          ? "Firma annullata. Puoi inviare di nuovo lo stesso link al cliente."
          : "Firma annullata. Il link è scaduto: inviane uno nuovo.",
      );
      onFirmaAnnullata?.();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Operazione non riuscita.");
    } finally {
      setLoading(null);
    }
  }

  async function onFileSelected(file: File | null) {
    if (!file) return;
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFeedback("File troppo grande (max 10 MB).");
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"];
    const mimeType = file.type || "application/octet-stream";
    if (!allowed.includes(mimeType)) {
      setFeedback("Formato non supportato. Usa PDF, JPG o PNG.");
      return;
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Lettura file non riuscita."));
      reader.readAsDataURL(file);
    });
    await segnaFirmatoManuale({ base64, mimeType });
    if (fileRef.current) fileRef.current.value = "";
  }

  const titolo =
    sf === "firmato" ? "Preventivo firmato"
      : sf === "attesa" ? "Condividi link firma"
        : "Firma digitale";

  const firmatoManuale = sf === "firmato" && isFirmaManuale(invio);
  const firmatoOnline = sf === "firmato" && isFirmaOnline(invio);

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
        <h2 className="text-lg font-semibold text-brand-navy">{titolo}</h2>
        <p className="mt-1 text-sm text-brand-navy/60">
          Cliente: <strong>{nomeCliente}</strong>
        </p>

        {sf === "firmato" && invio ? (
          <div className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">
              {firmatoManuale ? "Firmato a mano" : "Firmato online"} il {formatData(invio.firmato_at!)}
            </p>
            {invio.firma_immagine_url ? (
              <img src={invio.firma_immagine_url} alt="Documento firmato" className="max-h-32 rounded-lg border border-emerald-200" />
            ) : null}
            {invio.pdf_firmato_url ? (
              <a
                href={invio.pdf_firmato_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-medium text-brand-teal underline"
              >
                Apri PDF firmato
              </a>
            ) : null}
            {firmatoOnline ? (
              confermaAnnulla ? (
                <div className="space-y-2 border-t border-emerald-200 pt-3">
                  <p className="text-amber-900">Annullare questa firma? Il cliente dovrà firmare di nuovo.</p>
                  <button
                    type="button"
                    disabled={!!loading}
                    onClick={() => void annullaFirma()}
                    className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading === "annulla" ? "…" : "Conferma annullamento"}
                  </button>
                  <button
                    type="button"
                    disabled={!!loading}
                    onClick={() => setConfermaAnnulla(false)}
                    className="w-full py-2 text-sm text-brand-navy/60"
                  >
                    Indietro
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => setConfermaAnnulla(true)}
                  className="w-full rounded-xl border border-red-200 bg-white py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Firma non valida — richiedi nuova firma
                </button>
              )
            ) : null}
          </div>
        ) : null}

        {sf === "attesa" && invio ? (
          <>
            <p className="mt-3 text-sm text-amber-800">
              In attesa della firma. Link valido fino al {formatData(invio.scade_at)}.
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled={!!loading}
                onClick={() => void condividi("whatsapp")}
                className="w-full rounded-xl border border-black/10 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-bg disabled:opacity-60"
              >
                {loading === "whatsapp" ? "…" : "WhatsApp"}
              </button>
              <button
                type="button"
                disabled={!!loading}
                onClick={() => void condividi("email")}
                className="w-full rounded-xl border border-black/10 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-bg disabled:opacity-60"
              >
                {loading === "email" ? "…" : "Email"}
              </button>
              <button
                type="button"
                disabled={!!loading}
                onClick={() => void condividi("link")}
                className="w-full rounded-xl border border-black/10 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-bg disabled:opacity-60"
              >
                {loading === "link" ? "…" : "Copia link"}
              </button>
            </div>
          </>
        ) : null}

        {(sf === "scaduto" || sf === "revocato") ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-brand-navy/60">
              {sf === "scaduto" ? "Il link di firma è scaduto." : "Il link di firma non è più valido."}
            </p>
            {onInviaNuovo ? (
              <button
                type="button"
                onClick={() => { onClose(); onInviaNuovo(); }}
                className="w-full rounded-xl bg-brand-teal py-3 text-sm font-semibold text-white"
              >
                Invia nuovo link
              </button>
            ) : null}
          </div>
        ) : null}

        {sf !== "firmato" ? (
          <div className="mt-5 space-y-2 border-t border-black/10 pt-4">
            <p className="text-sm font-semibold text-brand-navy">Firma su carta</p>
            <p className="text-xs text-brand-navy/60">
              Se il cliente ha firmato a mano, segnalo qui o carica una foto o un PDF del documento firmato.
            </p>
            <button
              type="button"
              disabled={!!loading}
              onClick={() => void segnaFirmatoManuale()}
              className="w-full rounded-xl border border-brand-teal/30 bg-brand-teal/5 py-3 text-sm font-semibold text-brand-teal hover:bg-brand-teal/10 disabled:opacity-60"
            >
              {loading === "manuale" ? "…" : "Segna firmato a mano"}
            </button>
            <button
              type="button"
              disabled={!!loading}
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border border-black/10 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-bg disabled:opacity-60"
            >
              {loading === "upload" ? "Caricamento…" : "Carica foto/pdf firmato a mano"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void onFileSelected(e.target.files?.[0] ?? null)}
            />
          </div>
        ) : null}

        {feedback ? <p className="mt-3 text-sm font-medium text-brand-teal">{feedback}</p> : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-2.5 text-sm text-brand-navy/60 hover:text-brand-navy"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
