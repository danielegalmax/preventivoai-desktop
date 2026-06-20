import { formatImportoEuroVisuale } from "preventivoai-shared";

export const statoStile: Record<string, string> = {
  bozza: "bg-gray-100 text-gray-600",
  inviato: "bg-blue-100 text-blue-700",
  accettato: "bg-green-100 text-green-700",
  rifiutato: "bg-red-100 text-red-700",
};

export function formatImporto(valore: number | null) {
  if (valore === null) return "-";
  return `${formatImportoEuroVisuale(valore)} €`;
}

export function formatData(valore: string) {
  return new Date(valore).toLocaleDateString("it-IT");
}
