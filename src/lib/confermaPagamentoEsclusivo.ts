type Attivare = "rate" | "canone";

export function confermaPagamentoEsclusivo(
  attivare: Attivare,
  altroAttivo: boolean,
  onConferma: () => void,
) {
  if (!altroAttivo) {
    onConferma();
    return;
  }
  const disattiva = attivare === "rate" ? "abbonamento mensile" : "pagamento a rate";
  const attiva = attivare === "rate" ? "pagamento a rate" : "abbonamento mensile";
  if (window.confirm(`Hai già ${disattiva} attivo. Attivando ${attiva} verrà disattivato. Continuare?`)) {
    onConferma();
  }
}
