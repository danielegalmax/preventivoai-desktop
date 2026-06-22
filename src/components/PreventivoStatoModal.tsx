import { useEffect, useState } from "react";
import type { Preventivo } from "../lib/types";
import { STATI_PREVENTIVO } from "../lib/preventivo";
import { formatData, inputDateToIso, oggiInputDate } from "../lib/format";
import ToggleSwitch from "./ToggleSwitch";
import { useAppModalKeyboard } from "./ModalShell";
import StatoPreventivoIcon from "./StatoPreventivoIcon";

type Props = {
  preventivo: Preventivo | null;
  onClose: () => void;
  onChangeStato: (stato: string) => Promise<void>;
  onTogglePagato: (pagato: boolean, dataPagamento?: string) => Promise<void>;
  mostraTogglePagato?: boolean;
};

export default function PreventivoStatoModal({
  preventivo,
  onClose,
  onChangeStato,
  onTogglePagato,
  mostraTogglePagato = true,
}: Props) {
  const [salvandoPagato, setSalvandoPagato] = useState(false);
  const [mostraDataPagamento, setMostraDataPagamento] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(oggiInputDate);
  const [erroreDataPagamento, setErroreDataPagamento] = useState<string | null>(null);
  const [pagatoLocale, setPagatoLocale] = useState(preventivo?.pagato ?? false);

  useAppModalKeyboard(onClose, { enabled: !!preventivo });

  useEffect(() => {
    setPagatoLocale(preventivo?.pagato ?? false);
    setMostraDataPagamento(false);
    setErroreDataPagamento(null);
  }, [preventivo?.id, preventivo?.pagato]);

  function dataPagamentoValida(date: string): boolean {
    if (!date.trim()) return false;
    const parsed = new Date(`${date}T12:00:00`);
    return !Number.isNaN(parsed.getTime());
  }

  if (!preventivo) return null;

  async function handleTogglePagato(value: boolean) {
    if (value) {
      setDataPagamento(oggiInputDate());
      setErroreDataPagamento(null);
      setPagatoLocale(true);
      setMostraDataPagamento(true);
      return;
    }
    setSalvandoPagato(true);
    try {
      await onTogglePagato(value);
      setPagatoLocale(value);
      setMostraDataPagamento(false);
    } finally {
      setSalvandoPagato(false);
    }
  }

  async function confermaPagato() {
    if (!dataPagamentoValida(dataPagamento)) {
      setErroreDataPagamento("Inserisci una data di pagamento valida.");
      return;
    }
    setErroreDataPagamento(null);
    const dataIso = inputDateToIso(dataPagamento);
    setSalvandoPagato(true);
    try {
      await onTogglePagato(true, dataIso);
      setPagatoLocale(true);
      setMostraDataPagamento(false);
    } finally {
      setSalvandoPagato(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-brand-navy">Cambia stato</h2>

        <div className="mt-4 space-y-1">
          {STATI_PREVENTIVO.map((stato) => (
            <button
              key={stato}
              type="button"
              onClick={async () => {
                await onChangeStato(stato);
                const restaAperto = stato === "accettato";
                if (!restaAperto) onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-brand-navy hover:bg-brand-bg"
            >
              <StatoPreventivoIcon stato={stato} />
              <span className="capitalize">{stato}</span>
            </button>
          ))}
        </div>

        {preventivo.stato === "accettato" && mostraTogglePagato && (
          <div className="mt-4 border-t border-black/5 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand-navy">Segna come pagato</p>
                <p className="text-xs text-brand-navy/50">Registra l&apos;incasso del preventivo accettato</p>
              </div>
              <ToggleSwitch
                checked={pagatoLocale}
                onChange={handleTogglePagato}
                disabled={salvandoPagato}
              />
            </div>
            {pagatoLocale && preventivo.data_pagamento && !mostraDataPagamento ? (
              <p className="mt-2 text-xs text-brand-navy/50">
                Pagato il {formatData(preventivo.data_pagamento)}
              </p>
            ) : null}
            {mostraDataPagamento ? (
              <div className="mt-3 rounded-xl bg-brand-bg p-3">
                <label className="text-xs font-semibold tracking-wide text-brand-navy/50">
                  DATA PAGAMENTO
                </label>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => {
                    setDataPagamento(e.target.value);
                    if (erroreDataPagamento) setErroreDataPagamento(null);
                  }}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-teal"
                />
                {erroreDataPagamento ? (
                  <p className="mt-1.5 text-xs text-red-600">{erroreDataPagamento}</p>
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMostraDataPagamento(false);
                      setErroreDataPagamento(null);
                      setPagatoLocale(preventivo.pagato ?? false);
                    }}
                    className="rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-brand-navy/60"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={confermaPagato}
                    disabled={salvandoPagato}
                    className="rounded-xl bg-brand-teal px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Conferma
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-brand-navy/70 hover:bg-brand-bg"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
