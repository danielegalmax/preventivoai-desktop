import {
  formatData,
  formatDataBreve,
  formatImportoEuroVisuale,
  inputDateToIso,
  oggiInputDate,
} from "preventivoai-shared";

export { formatData, formatDataBreve, inputDateToIso, oggiInputDate };

export function formatImporto(valore: number | null) {
  if (valore === null) return "-";
  return `${formatImportoEuroVisuale(valore)} €`;
}

/** Ora in formato italiano (es. 15:30). */
export function formatOra(valore: string | null | undefined) {
  if (!valore) return "-";
  return new Date(valore).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

/** Intestazione home con giorno e mese estesi. */
export function formatDataHomeHeader(now = new Date()) {
  return now.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Etichetta data italiana per titoli generati (es. 21/06/2026). */
export function oggiItItLabel() {
  return new Date().toLocaleDateString("it-IT");
}
