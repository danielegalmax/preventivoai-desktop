import { formatImportoEuroVisuale } from "preventivoai-shared";

export function formatImporto(valore: number | null) {
  if (valore === null) return "-";
  return `${formatImportoEuroVisuale(valore)} €`;
}

export function formatData(valore: string) {
  return new Date(valore).toLocaleDateString("it-IT");
}
