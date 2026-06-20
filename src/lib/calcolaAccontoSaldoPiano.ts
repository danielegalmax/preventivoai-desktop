import { calcolaImportiRate, parseImportoEuro } from "preventivoai-shared";

export type RateModalitaPiano = "rate_uguali" | "acconto_saldo";
export type RateAccontoTipo = "fisso" | "percentuale";

/** Acconto + saldo: centesimi di arrotondamento restano sul saldo (seconda rata). */
export function calcolaAccontoSaldoPiano(
  importoTotale: number,
  tipo: RateAccontoTipo,
  valoreRaw: string,
): { acconto: number; saldo: number } | null {
  if (!(importoTotale > 0)) return null;

  if (tipo === "fisso") {
    const accontoParsed = parseImportoEuro(valoreRaw);
    if (accontoParsed === null || accontoParsed <= 0 || accontoParsed >= importoTotale) return null;
    const acconto = Math.round(accontoParsed * 100) / 100;
    const saldo = Math.round((importoTotale - acconto) * 100) / 100;
    if (saldo <= 0) return null;
    return { acconto, saldo };
  }

  const percentuale = parseInt(valoreRaw.trim(), 10);
  if (!(percentuale >= 1 && percentuale <= 99)) return null;

  const parti = calcolaImportiRate(importoTotale, 100);
  if (parti.length === 0) return null;

  const acconto = Math.round(parti.slice(0, percentuale).reduce((s, v) => s + v, 0) * 100) / 100;
  const saldo = Math.round((importoTotale - acconto) * 100) / 100;
  if (saldo <= 0) return null;
  return { acconto, saldo };
}
