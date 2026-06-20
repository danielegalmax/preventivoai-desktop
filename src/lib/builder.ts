import { formatImportoEuroVisuale } from "preventivoai-shared";

export { calcolaTotaleTrasferte, calcolaTotaleVoci } from "preventivoai-shared";
export { generaTestoPreventivoBuilder } from "preventivoai-shared";

export interface VoceBuilder {
  id: string;
  nome: string;
  descrizione: string;
  costo: string;
  quantita: string;
  unita: string;
  salvaNelListino?: boolean;
  salvataNelListino?: boolean;
}

export type TrasfertaBuilder = {
  id: string;
  tipo: "km" | "spesa";
  nome: string;
  importo: string;
  km?: string;
  esente: boolean;
};

export function isVoceCustom(v: VoceBuilder): boolean {
  return v.id.startsWith("custom-");
}

/** Formatta un importo numerico per il campo costo (es. dal listino). */
export function formatImportoVoce(valore: number): string {
  return formatImportoEuroVisuale(valore);
}
