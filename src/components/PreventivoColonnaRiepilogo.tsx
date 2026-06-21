import { formatData, formatImporto } from "../lib/format";
import type { Preventivo } from "../lib/types";
import MenuTrePuntini, { type VoceMenuAzione } from "./MenuTrePuntini";
import PreventivoStatoBadge from "./PreventivoStatoBadge";
import InviaFirmaChip from "./firma/InviaFirmaChip";

type Props = {
  preventivo: Preventivo;
  collegamentoPiano?: boolean;
  mostraInviaFirma: boolean;
  onStatoPress: () => void;
  onPdf: () => void;
  onFirma: () => void;
  menuVoci: VoceMenuAzione[];
  menuAriaLabel: string;
  selezioneAttiva?: boolean;
};

function IconDownload({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <path d="M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PreventivoColonnaRiepilogo({
  preventivo: p,
  collegamentoPiano = false,
  mostraInviaFirma,
  onStatoPress,
  onPdf,
  onFirma,
  menuVoci,
  menuAriaLabel,
  selezioneAttiva = false,
}: Props) {
  const pdfLabel = p.pdf_url ? "Scarica PDF" : "Genera PDF";
  const azioniDisabilitate = selezioneAttiva;

  return (
    <div className="flex items-center justify-end gap-1.5" data-no-expand>
      <div className="grid w-[7.5rem] grid-cols-1 justify-items-end gap-1.5">
        <span className="w-full text-right tabular-nums text-sm font-semibold leading-none text-brand-navy">
          {formatImporto(p.importo_totale)}
        </span>

        <PreventivoStatoBadge
          stato={p.stato}
          pagato={p.pagato}
          pagamentoGestitoDalPiano={collegamentoPiano}
          onClick={azioniDisabilitate ? undefined : onStatoPress}
        />
        {p.pagato && p.data_pagamento && !collegamentoPiano ? (
          <span className="text-right text-[11px] leading-none text-brand-navy/45">
            Pagato il {formatData(p.data_pagamento)}
          </span>
        ) : null}

        {azioniDisabilitate ? (
          <span className="flex h-5 w-5 items-center justify-center text-brand-teal/40" aria-hidden>
            <IconDownload />
          </span>
        ) : (
          <button
            type="button"
            onClick={onPdf}
            title={pdfLabel}
            aria-label={pdfLabel}
            className="flex h-5 w-5 items-center justify-center text-brand-teal transition-opacity hover:opacity-70"
          >
            <IconDownload />
          </button>
        )}

        {!azioniDisabilitate && mostraInviaFirma ? <InviaFirmaChip onClick={onFirma} /> : null}
      </div>

      {!azioniDisabilitate ? (
        <div className="flex self-stretch items-center pl-0.5">
          <MenuTrePuntini ariaLabel={menuAriaLabel} voci={menuVoci} />
        </div>
      ) : null}
    </div>
  );
}
