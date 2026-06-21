export const CATEGORIE = [
  "videomaker",
  "fotografo",
  "catering",
  "falegname",
  "estetista",
  "elettricista",
  "idraulico",
  "imbianchino",
  "altro",
] as const;

export const TONI = [
  "professionale e diretto",
  "cordiale e disponibile",
  "formale e preciso",
  "semplice e informale",
] as const;

export const COLORI_BRAND = [
  "0D1B2A",
  "0E9F8E",
  "1D4ED8",
  "7C3AED",
  "DC2626",
  "EA580C",
  "059669",
  "374151",
] as const;

export function normalizzaHexColore(val: string): string {
  return val.replace(/^#/, "").replace(/[^0-9A-Fa-f]/g, "").slice(0, 6).toUpperCase();
}
