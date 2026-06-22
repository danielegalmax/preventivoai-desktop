import { formatImportoEuroVisuale } from "preventivoai-shared";

export function formatImporto(valore: number | null) {
  if (valore === null) return "-";
  return `${formatImportoEuroVisuale(valore)} €`;
}

/** Data completa in formato italiano (es. 21/06/2026). */
export function formatData(valore: string | null | undefined) {
  if (!valore) return "-";
  return new Date(valore).toLocaleDateString("it-IT");
}

/** Ora in formato italiano (es. 15:30). */
export function formatOra(valore: string | null | undefined) {
  if (!valore) return "-";
  return new Date(valore).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

/** Data breve per notifiche e liste (es. 21 giu). */
export function formatDataBreve(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

/** Intestazione home con giorno e mese estesi. */
export function formatDataHomeHeader(now = new Date()) {
  return now.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Valore per input HTML type="date" (YYYY-MM-DD locale). */
export function oggiInputDate() {
  return new Date().toLocaleDateString("en-CA");
}

/**
 * Persistenza date-only scelte dall'utente: mezzogiorno locale → ISO UTC.
 * Evita shift di giorno rispetto al fuso orario in visualizzazione.
 */
export function inputDateToIso(date: string) {
  return new Date(`${date}T12:00:00`).toISOString();
}

/** Etichetta data italiana per titoli generati (es. 21/06/2026). */
export function oggiItItLabel() {
  return new Date().toLocaleDateString("it-IT");
}
