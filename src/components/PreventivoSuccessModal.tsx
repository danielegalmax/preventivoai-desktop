import { useEffect, useState } from "react";
import { apriPdfDaBase64, apriPdfLocale, apriPdfOnline, condividiPdf, isDesktopApp, mostraPdfInCartella, ottieniUrlPdfPreventivo } from "../lib/pdf";
import { caricaContattiCliente } from "../lib/firma";
import { caricaHeaderProfilo } from "../lib/greeting";
import { buildMessaggioCondividiPdf } from "preventivoai-shared";
import { caricaMessaggiCliente } from "../lib/messaggiCliente";
import InviaFirmaModal from "./firma/InviaFirmaModal";
import { useAppModalKeyboard } from "./ModalShell";

export type PdfSuccessAzioni = {
  percorsoLocale?: string;
  pdfUrl?: string;
  pdfBase64?: string;
  nomeFile?: string;
};

export type PdfSuccessInvio = {
  preventivoId?: string | null;
  clienteId?: string;
  nomeCliente?: string;
  haStripe?: boolean;
  uploadOnlineOk: boolean;
};

type Props = {
  open: boolean;
  dettaglio?: string;
  azioni?: PdfSuccessAzioni;
  invio?: PdfSuccessInvio;
  onClose: () => void;
};

export default function PreventivoSuccessModal({ open, dettaglio, azioni, invio, onClose }: Props) {
  const [feedback, setFeedback] = useState("");
  const [mostraFirmaModal, setMostraFirmaModal] = useState(false);
  const [nomeAzienda, setNomeAzienda] = useState("");
  const [emailCliente, setEmailCliente] = useState<string | null | undefined>();
  const [telefonoCliente, setTelefonoCliente] = useState<string | null | undefined>();

  useEffect(() => {
    if (!open) {
      setMostraFirmaModal(false);
      setFeedback("");
      return;
    }
    void caricaHeaderProfilo().then((p) => setNomeAzienda(p?.nomeBreve || ""));
  }, [open]);

  useAppModalKeyboard(onClose, { enabled: open });

  if (!open) return null;

  const desktop = isDesktopApp();
  const haLocale = Boolean(azioni?.percorsoLocale);
  const haOnline = Boolean(azioni?.pdfUrl);
  const haStripe = Boolean(invio?.haStripe);
  const uploadOk = Boolean(invio?.uploadOnlineOk);
  const haCliente = Boolean(invio?.clienteId && invio?.nomeCliente?.trim());
  const haPreventivo = Boolean(invio?.preventivoId);
  const puoInviareFirma = uploadOk && haCliente && haPreventivo;

  let motivoBloccoFirma = "";
  if (!uploadOk) {
    motivoBloccoFirma =
      "L'upload del PDF online non è riuscito. Il link firma richiede il documento online: chiudi, poi clicca di nuovo «Genera PDF» per riprovare.";
  } else if (!haCliente) {
    motivoBloccoFirma = "Seleziona un cliente nel preventivo per inviare il link firma.";
  } else if (!haPreventivo) {
    motivoBloccoFirma = "Preventivo non salvato correttamente. Rigenera il PDF e riprova.";
  }

  async function conFeedback(fn: () => Promise<string | void>, okMsg: string) {
    try {
      const extra = await fn();
      setFeedback(extra || okMsg);
      window.setTimeout(() => setFeedback(""), 2500);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message
          : typeof err === "string" ? err
            : err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message)
              : "Operazione non riuscita.";
      setFeedback(msg);
      window.setTimeout(() => setFeedback(""), 3000);
    }
  }

  async function urlPdfOnlineFresco(): Promise<string> {
    if (invio?.preventivoId) {
      try {
        return await ottieniUrlPdfPreventivo(invio.preventivoId);
      } catch {
        if (azioni?.pdfUrl) return azioni.pdfUrl;
        throw new Error("PDF online non disponibile.");
      }
    }
    if (azioni?.pdfUrl) return azioni.pdfUrl;
    throw new Error("PDF online non disponibile.");
  }

  async function apriPdfGenerato() {
    if (haLocale && desktop) {
      try {
        await apriPdfLocale(azioni!.percorsoLocale!);
        return;
      } catch {
        // fallback: base64 o URL online
      }
    }

    if (azioni?.pdfBase64) {
      await apriPdfDaBase64(azioni.pdfBase64, azioni.nomeFile || "preventivo.pdf");
      return;
    }

    const url = await urlPdfOnlineFresco();
    await apriPdfOnline(url);
  }

  async function apriInvioFirma() {
    if (!puoInviareFirma || !invio?.clienteId) return;
    const contatti = await caricaContattiCliente(invio.clienteId);
    setEmailCliente(contatti?.email);
    setTelefonoCliente(contatti?.telefono);
    setMostraFirmaModal(true);
  }

  function handlePressFirma() {
    if (!puoInviareFirma) {
      window.alert(motivoBloccoFirma || "Link firma non disponibile.");
      return;
    }
    void apriInvioFirma();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-navy/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="preventivo-success-title"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-teal/15">
            <svg
              className="h-8 w-8 text-brand-teal"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 id="preventivo-success-title" className="mt-5 text-center text-xl font-bold text-brand-navy">
            Preventivo generato!
          </h2>

          {dettaglio && (
            <p className="mt-3 text-center text-sm leading-relaxed text-brand-navy/60">{dettaglio}</p>
          )}

          {!uploadOk && (
            <div
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800"
              role="alert"
            >
              <p className="font-semibold">Upload online non riuscito</p>
              <p className="mt-1">
                Il PDF è sul tuo PC, ma il link firma digitale non è disponibile finché il documento non viene
                caricato online. Chiudi e clicca di nuovo «Genera PDF» per riprovare.
              </p>
            </div>
          )}

          <p className="mt-5 text-sm font-semibold text-brand-navy">Come lo invii al cliente?</p>

          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={handlePressFirma}
              className={`w-full rounded-xl px-4 py-3 text-left ${puoInviareFirma ? "bg-brand-teal" : "cursor-pointer bg-brand-teal/55"}`}
            >
              <span className="block text-sm font-semibold text-white">Invia link firma</span>
              <span className="mt-0.5 block text-xs text-white/85">
                Un solo link: legge il preventivo e firma online
                {haStripe ? " — pagamento Stripe incluso nella pagina" : ""}
              </span>
            </button>
            {!puoInviareFirma && motivoBloccoFirma ? (
              <p className="px-1 text-xs leading-relaxed text-brand-navy/55">{motivoBloccoFirma}</p>
            ) : (
              <p className="px-1 text-xs text-brand-navy/45">
                Non allegare il PDF nello stesso messaggio: il cliente lo vede dal link.
                {haStripe
                  ? " Il reminder firma reinvia lo stesso link — non serve un link Stripe separato."
                  : ""}
              </p>
            )}

            {(haLocale || haOnline) && (
              <button
                type="button"
                onClick={() =>
                  void conFeedback(async () => {
                    const templates = await caricaMessaggiCliente();
                    const profilo = await caricaHeaderProfilo();
                    const messaggio = buildMessaggioCondividiPdf(
                      invio?.nomeCliente || "Cliente",
                      profilo?.nomeBreve || "Il tuo artigiano",
                      templates,
                    );
                    try {
                      await navigator.clipboard.writeText(messaggio);
                    } catch {
                      // clipboard opzionale
                    }
                    await condividiPdf({
                      percorsoLocale: azioni?.percorsoLocale,
                      pdfUrl: azioni?.percorsoLocale ? undefined : await urlPdfOnlineFresco(),
                      pdfBase64: azioni?.pdfBase64,
                      nomeFile: azioni?.nomeFile,
                    });
                    return "Messaggio copiato negli appunti. Allega il PDF dalla condivisione.";
                  }, "")
                }
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-left hover:bg-brand-bg"
              >
                <span className="block text-sm font-semibold text-brand-navy">Condividi solo PDF</span>
                <span className="mt-0.5 block text-xs text-brand-navy/55">
                  Allegato PDF classico.
                  {haStripe ? " Il link Stripe è già in fondo al documento." : ""}
                </span>
              </button>
            )}
          </div>

          {feedback && <p className="mt-3 text-center text-sm font-medium text-brand-teal">{feedback}</p>}

          <div className="mt-5 grid gap-2 border-t border-black/5 pt-4">
            {haLocale && desktop && (
              <button
                type="button"
                onClick={() =>
                  void conFeedback(
                    () => mostraPdfInCartella(azioni!.percorsoLocale!),
                    "Cartella aperta in Esplora file.",
                  )
                }
                className="w-full rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-brand-navy hover:bg-brand-bg"
              >
                Mostra nella cartella
              </button>
            )}

            {(haLocale || haOnline) && (
              <button
                type="button"
                onClick={() =>
                  void conFeedback(async () => {
                    await apriPdfGenerato();
                  }, "PDF aperto.")
                }
                className="w-full rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-brand-navy hover:bg-brand-bg"
              >
                Apri PDF
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-brand-navy/60 hover:text-brand-navy"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>

      {mostraFirmaModal && invio?.preventivoId && invio.nomeCliente ? (
        <InviaFirmaModal
          open
          preventivoId={invio.preventivoId}
          nomeCliente={invio.nomeCliente}
          emailCliente={emailCliente}
          telefonoCliente={telefonoCliente}
          nomeAzienda={nomeAzienda}
          haStripe={haStripe}
          onClose={() => setMostraFirmaModal(false)}
          onInviato={onClose}
        />
      ) : null}
    </>
  );
}
