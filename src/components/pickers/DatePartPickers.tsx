import { useMemo } from "react";
import { MESI_FULL } from "../../lib/constants";
import { clampGiornoAlMese, giorniInMese } from "../../lib/giornoScadenza";

const SELECT_CLS =
  "w-full rounded-xl border border-black/10 bg-brand-bg px-3 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-teal disabled:opacity-50";

type GiornoProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  mese?: string;
  anno?: string;
};

type MeseProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  giornoCollegato?: string;
  onGiornoCollegatoChange?: (value: string) => void;
  annoCollegato?: string;
};

type GiorniReminderProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
};

type AnnoProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  meseCollegato?: string;
  giornoCollegato?: string;
  onGiornoCollegatoChange?: (value: string) => void;
};

export function GiornoScadenzaSelect({ value, onChange, disabled, className, mese, anno }: GiornoProps) {
  const meseNum = mese ? parseInt(mese, 10) : 0;
  const annoNum = anno ? parseInt(anno, 10) : undefined;
  const maxGiorni = useMemo(() => {
    if (!(meseNum >= 1 && meseNum <= 12)) return 31;
    return giorniInMese(meseNum, annoNum && annoNum > 2000 ? annoNum : undefined);
  }, [meseNum, annoNum]);

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? SELECT_CLS}
    >
      <option value="">Seleziona giorno</option>
      {Array.from({ length: maxGiorni }, (_, i) => {
        const d = String(i + 1);
        return (
          <option key={d} value={d}>
            {d}
          </option>
        );
      })}
    </select>
  );
}

export function MeseInizioSelect({
  value,
  onChange,
  disabled,
  className,
  giornoCollegato,
  onGiornoCollegatoChange,
  annoCollegato,
}: MeseProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const m = e.target.value;
        onChange(m);
        if (giornoCollegato && onGiornoCollegatoChange) {
          onGiornoCollegatoChange(clampGiornoAlMese(giornoCollegato, m, annoCollegato));
        }
      }}
      className={className ?? SELECT_CLS}
    >
      <option value="">Seleziona mese</option>
      {MESI_FULL.map((nome, i) => {
        const m = String(i + 1);
        return (
          <option key={m} value={m}>
            {nome}
          </option>
        );
      })}
    </select>
  );
}

export function GiorniReminderSelect({
  value,
  onChange,
  disabled,
  className,
  min = 1,
  max = 30,
}: GiorniReminderProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={className ?? SELECT_CLS}
    >
      {Array.from({ length: max - min + 1 }, (_, i) => {
        const n = min + i;
        return (
          <option key={n} value={n}>
            {n} {n === 1 ? "giorno" : "giorni"}
          </option>
        );
      })}
    </select>
  );
}

export function AnnoSelect({
  value,
  onChange,
  disabled,
  className,
  meseCollegato,
  giornoCollegato,
  onGiornoCollegatoChange,
}: AnnoProps) {
  const corrente = new Date().getFullYear();
  const anni = Array.from({ length: 8 }, (_, i) => corrente - 2 + i);

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const a = e.target.value;
        onChange(a);
        if (meseCollegato && giornoCollegato && onGiornoCollegatoChange) {
          onGiornoCollegatoChange(clampGiornoAlMese(giornoCollegato, meseCollegato, a));
        }
      }}
      className={className ?? SELECT_CLS}
    >
      <option value="">Seleziona anno</option>
      {anni.map((a) => (
        <option key={a} value={String(a)}>
          {a}
        </option>
      ))}
    </select>
  );
}
