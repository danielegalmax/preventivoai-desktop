import type { Dispatch, SetStateAction } from "react";
import type { TrasfertaBuilder, VoceBuilder } from "../../lib/builder";
import type { MetodoPagamento } from "../../lib/pagamenti";
import type { ProfiloFiscale, RisultatoFiscale, Servizio } from "../../lib/types";
import { PLACEHOLDER } from "../../lib/placeholders";
import AnalisiFiscaleCard from "../AnalisiFiscaleCard";
import BuilderClienteCard from "../BuilderClienteCard";
import PagamentoCard from "../PagamentoCard";
import IvaCard from "../IvaCard";
import ServiziListinoCard from "../ServiziListinoCard";
import TrasferteCard from "../TrasferteCard";
import ScontoCard from "../ScontoCard";
import VociPreventivoSection from "../VociPreventivoSection";

type Props = {
  clienti: { id: string; nome: string }[];
  clienteSelezionatoId: string;
  onSelectCliente: (id: string) => void;
  onClearCliente: () => void;
  onNuovoCliente: () => void;
  servizi: Servizio[];
  voci: VoceBuilder[];
  erroreServizi: string | null;
  onAggiungiServizioListino: (s: Servizio) => void;
  onRimuoviVoce: (id: string) => void;
  onAggiornaVoce: (id: string, campo: keyof VoceBuilder, valore: string) => void;
  onAggiungiVoceCustom: () => void;
  onSalvaNelListinoChange: (voceId: string, salva: boolean) => void;
  onRiordinaVoci: (fromIndex: number, toIndex: number) => void;
  metodiPagamento: MetodoPagamento[];
  metodoPagamentoSelezionato: MetodoPagamento | null;
  metodoPagamentoNessuno: boolean;
  erroreMetodiPagamento: string | null;
  onOpenPagamento: () => void;
  includiIva: boolean;
  onIncludiIvaChange: (value: boolean) => void;
  trasferte: TrasfertaBuilder[];
  setTrasferte: Dispatch<SetStateAction<TrasfertaBuilder[]>>;
  mostraTrasferte: boolean;
  setMostraTrasferte: Dispatch<SetStateAction<boolean>>;
  scontoAttivo: boolean;
  scontoTipo: "percentuale" | "fisso";
  scontoValore: string;
  onToggleScontoAttivo: () => void;
  onChangeScontoTipo: (tipo: "percentuale" | "fisso") => void;
  onChangeScontoValore: (value: string) => void;
  totaleBase: number;
  noteExtra: string;
  onNoteExtraChange: (value: string) => void;
  profiloFiscale: ProfiloFiscale | null;
  mostraFiscale: boolean;
  setMostraFiscale: Dispatch<SetStateAction<boolean>>;
  risultatoFiscale: RisultatoFiscale | null;
  setVoci: Dispatch<SetStateAction<VoceBuilder[]>>;
  storicoVoci: VoceBuilder[][];
  setStoricoVoci: Dispatch<SetStateAction<VoceBuilder[][]>>;
  nettoDesiderato: string;
  setNettoDesiderato: Dispatch<SetStateAction<string>>;
  lordoCalcolato: number | null;
  setLordoCalcolato: Dispatch<SetStateAction<number | null>>;
  calcolaLordoDaNetto: (netto: number) => number | null;
  errore: string;
};

export default function NuovoBuilderView({
  clienti,
  clienteSelezionatoId,
  onSelectCliente,
  onClearCliente,
  onNuovoCliente,
  servizi,
  voci,
  erroreServizi,
  onAggiungiServizioListino,
  onRimuoviVoce,
  onAggiornaVoce,
  onAggiungiVoceCustom,
  onSalvaNelListinoChange,
  onRiordinaVoci,
  metodiPagamento,
  metodoPagamentoSelezionato,
  metodoPagamentoNessuno,
  erroreMetodiPagamento,
  onOpenPagamento,
  includiIva,
  onIncludiIvaChange,
  trasferte,
  setTrasferte,
  mostraTrasferte,
  setMostraTrasferte,
  scontoAttivo,
  scontoTipo,
  scontoValore,
  onToggleScontoAttivo,
  onChangeScontoTipo,
  onChangeScontoValore,
  totaleBase,
  noteExtra,
  onNoteExtraChange,
  profiloFiscale,
  mostraFiscale,
  setMostraFiscale,
  risultatoFiscale,
  setVoci,
  storicoVoci,
  setStoricoVoci,
  nettoDesiderato,
  setNettoDesiderato,
  lordoCalcolato,
  setLordoCalcolato,
  calcolaLordoDaNetto,
  errore,
}: Props) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
      <BuilderClienteCard
        clienti={clienti}
        clienteSelezionatoId={clienteSelezionatoId}
        onSelect={onSelectCliente}
        onClear={onClearCliente}
        onNuovoCliente={onNuovoCliente}
      />

      <ServiziListinoCard
        servizi={servizi}
        voci={voci}
        erroreCaricamento={erroreServizi}
        onAggiungiVoce={onAggiungiServizioListino}
        onRimuoviVoce={onRimuoviVoce}
      />

      <VociPreventivoSection
        voci={voci}
        onAggiornaVoce={onAggiornaVoce}
        onRimuoviVoce={onRimuoviVoce}
        onAggiungiVoceCustom={onAggiungiVoceCustom}
        onSalvaNelListinoChange={onSalvaNelListinoChange}
        onRiordinaVoci={onRiordinaVoci}
      />

      <PagamentoCard
        metodiPagamento={metodiPagamento}
        metodoPagamentoSelezionato={metodoPagamentoSelezionato}
        metodoPagamentoNessuno={metodoPagamentoNessuno}
        erroreCaricamento={erroreMetodiPagamento}
        onOpen={onOpenPagamento}
      />

      <IvaCard attivo={includiIva} onChange={onIncludiIvaChange} />

      <TrasferteCard
        trasferte={trasferte}
        setTrasferte={setTrasferte}
        mostraTrasferte={mostraTrasferte}
        setMostraTrasferte={setMostraTrasferte}
      />

      <ScontoCard
        scontoAttivo={scontoAttivo}
        scontoTipo={scontoTipo}
        scontoValore={scontoValore}
        onToggle={onToggleScontoAttivo}
        onChangeTipo={onChangeScontoTipo}
        onChangeValore={onChangeScontoValore}
        totaleBase={totaleBase}
      />

      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg text-sm font-semibold text-brand-navy">
            N
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-brand-teal">Note</p>
            <p className="text-xs text-brand-navy/50">Dettagli aggiuntivi da inserire nel preventivo</p>
          </div>
        </div>
        <textarea
          value={noteExtra}
          onChange={(e) => onNoteExtraChange(e.target.value)}
          rows={2}
          placeholder={PLACEHOLDER.notePreventivo}
          className="mt-4 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
        />
      </div>

      <AnalisiFiscaleCard
        profiloFiscale={profiloFiscale}
        mostraFiscale={mostraFiscale}
        setMostraFiscale={setMostraFiscale}
        fiscale={risultatoFiscale}
        voci={voci}
        setVoci={setVoci}
        storicoVoci={storicoVoci}
        setStoricoVoci={setStoricoVoci}
        nettoDesiderato={nettoDesiderato}
        setNettoDesiderato={setNettoDesiderato}
        lordoCalcolato={lordoCalcolato}
        setLordoCalcolato={setLordoCalcolato}
        calcolaLordoDaNetto={calcolaLordoDaNetto}
      />

      {errore && <p className="mt-4 text-sm text-red-600">{errore}</p>}
    </div>
  );
}
