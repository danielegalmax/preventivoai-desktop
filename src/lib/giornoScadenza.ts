export function normalizzaGiornoScadenzaInput(raw: string): string {
  const cleaned = raw.replace(/\D/g, "").slice(0, 2);
  if (!cleaned) return "";
  const n = parseInt(cleaned, 10);
  if (Number.isNaN(n)) return "";
  return String(Math.min(31, n));
}

export function giornoScadenzaValido(raw: string): boolean {
  const n = parseInt(raw, 10);
  return n >= 1 && n <= 31;
}

export function normalizzaMeseInizioInput(raw: string): string {
  const cleaned = raw.replace(/\D/g, "").slice(0, 2);
  if (!cleaned) return "";
  const n = parseInt(cleaned, 10);
  if (Number.isNaN(n)) return "";
  return String(Math.min(12, Math.max(1, n)));
}

export function meseInizioValido(raw: string): boolean {
  const n = parseInt(raw, 10);
  return n >= 1 && n <= 12;
}

export function meseCorrenteString() {
  return String(new Date().getMonth() + 1);
}

export function giorniInMese(mese: number, anno?: number): number {
  if (!(mese >= 1 && mese <= 12)) return 31;
  const y = anno && anno > 2000 ? anno : new Date().getFullYear();
  return new Date(y, mese, 0).getDate();
}

export function clampGiornoAlMese(giornoStr: string, meseStr: string, annoStr?: string): string {
  const g = parseInt(giornoStr, 10);
  const m = parseInt(meseStr, 10);
  if (!(g >= 1) || !(m >= 1 && m <= 12)) return giornoStr;
  const anno = annoStr ? parseInt(annoStr, 10) : undefined;
  const max = giorniInMese(m, anno && anno > 2000 ? anno : undefined);
  return String(Math.min(g, max));
}
