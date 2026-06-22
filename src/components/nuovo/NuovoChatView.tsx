import type { FormEvent, RefObject } from "react";
import type { Messaggio } from "../../lib/types";
import { PLACEHOLDER } from "../../lib/placeholders";
import BuilderClienteCard from "../BuilderClienteCard";
import NuovoChatSection from "./NuovoChatSection";

type Props = {
  clienti: { id: string; nome: string }[];
  clienteSelezionatoId: string;
  onSelectCliente: (id: string) => void;
  onClearCliente: () => void;
  onNuovoCliente: () => void;
  messaggi: Messaggio[];
  recap: string;
  errore: string;
  loading: boolean;
  inModifica: boolean;
  fineListaRef: RefObject<HTMLDivElement | null>;
  onGeneraDaRecap: () => void;
  input: string;
  onInputChange: (value: string) => void;
  onInvia: (e: FormEvent) => void;
};

export default function NuovoChatView({
  clienti,
  clienteSelezionatoId,
  onSelectCliente,
  onClearCliente,
  onNuovoCliente,
  messaggi,
  recap,
  errore,
  loading,
  inModifica,
  fineListaRef,
  onGeneraDaRecap,
  input,
  onInputChange,
  onInvia,
}: Props) {
  return (
    <>
      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <BuilderClienteCard
          clienti={clienti}
          clienteSelezionatoId={clienteSelezionatoId}
          onSelect={onSelectCliente}
          onClear={onClearCliente}
          onNuovoCliente={onNuovoCliente}
        />
      </div>
      <NuovoChatSection
        messaggi={messaggi}
        recap={recap}
        errore={errore}
        loading={loading}
        inModifica={inModifica}
        fineListaRef={fineListaRef}
        onGeneraDaRecap={onGeneraDaRecap}
      />
      <form onSubmit={onInvia} className="sticky bottom-0 mt-4 flex gap-2 bg-brand-bg pb-2 pt-2">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={PLACEHOLDER.chatPreventivo}
          disabled={loading}
          className="flex-1 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-brand-teal"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-brand-teal px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "..." : "Invia"}
        </button>
      </form>
    </>
  );
}
