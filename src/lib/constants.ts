export const MESI_BREVI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"] as const;

export const MESI_FULL = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
] as const;

/** Etichetta mese da stringa "1"-"12". */
export function labelMese(meseStr: string, breve = false): string {
  const n = parseInt(meseStr, 10);
  if (!(n >= 1 && n <= 12)) return "";
  return breve ? MESI_BREVI[n - 1] : MESI_FULL[n - 1];
}

export const TEMPLATES = [
  { id: "pulito", nome: "Pulito", desc: "Moderno e professionale", emoji: "⬜" },
  { id: "classico", nome: "Classico", desc: "Formale con bordi", emoji: "📋" },
  { id: "bold", nome: "Bold", desc: "Intestazione colorata", emoji: "🎨" },
  { id: "minimal_dark", nome: "Dark", desc: "Sfondo scuro elegante", emoji: "🌙" },
  { id: "artigiano", nome: "Artigiano", desc: "Caldo e personale", emoji: "🪵" },
] as const;
