import type { PreventivoInvio } from "../../lib/firma";
import { labelFirmaFirmata, statoFirmaInvio } from "../../lib/firma";

type Props = {
  invio?: PreventivoInvio;
  onClick?: () => void;
};

export default function FirmaStatoBadge({ invio, onClick }: Props) {
  const sf = statoFirmaInvio(invio);
  if (sf === "nessuno") return null;

  const label =
    sf === "firmato" ? labelFirmaFirmata(invio)
      : sf === "attesa" ? "⏳ In attesa firma"
        : sf === "scaduto" ? "Link firma scaduto"
          : "Link revocato";

  const className =
    sf === "firmato"
      ? "mt-1 inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
      : sf === "attesa"
        ? "mt-1 inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
        : "mt-1 inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600";

  if (onClick && (sf === "firmato" || sf === "attesa" || sf === "scaduto" || sf === "revocato")) {
    return (
      <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className={`${className} hover:opacity-80`}>
        {label}
      </button>
    );
  }

  return <span className={className}>{label}</span>;
}
