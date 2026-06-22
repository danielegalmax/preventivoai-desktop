import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { cancellaBozzaChat, cancellaBozzaManuale } from "../../nuovoDraft";
import type { TrasfertaBuilder, VoceBuilder } from "../../builder";
import type { MetodoPagamento } from "../../pagamenti";
import type { ModificaPreventivoInput } from "../../modificaPreventivo/apriModificaPreventivo";
import type { Messaggio, Servizio } from "../../types";
import {
  collegaVociAlListino,
  parsePreventivoTesto,
  trovaMetodoPagamentoDaNome,
  vociParsedConId,
} from "../../parsePreventivoTesto";

type ModificaRisolta = ModificaPreventivoInput | null;

type Params = {
  modifica: ModificaRisolta;
  searchParams: { get: (key: string) => string | null };
  inModifica: boolean;
  testoModifica: string;
  versionePrecedente: number;
  mode: "chat" | "manuale";
  servizi: Servizio[];
  metodiPagamento: MetodoPagamento[];
  token: string;
  messaggiLength: number;
  setClienteSelezionatoId: Dispatch<SetStateAction<string>>;
  setClienti: Dispatch<SetStateAction<{ id: string; nome: string }[]>>;
  setInput: Dispatch<SetStateAction<string>>;
  setMessaggi: Dispatch<SetStateAction<Messaggio[]>>;
  setMetodoPagamentoSelezionato: Dispatch<SetStateAction<MetodoPagamento | null>>;
  setMetodoPagamentoNessuno: Dispatch<SetStateAction<boolean>>;
  setVoci: Dispatch<SetStateAction<VoceBuilder[]>>;
  setNoteExtra: Dispatch<SetStateAction<string>>;
  setIncludiIva: Dispatch<SetStateAction<boolean>>;
  setTrasferte: Dispatch<SetStateAction<TrasfertaBuilder[]>>;
  setMostraTrasferte: Dispatch<SetStateAction<boolean>>;
  inviaTrascrizione: (testo: string) => Promise<void>;
};

export function useNuovoModifica({
  modifica,
  searchParams,
  inModifica,
  testoModifica,
  versionePrecedente,
  mode,
  servizi,
  metodiPagamento,
  token,
  messaggiLength,
  setClienteSelezionatoId,
  setClienti,
  setInput,
  setMessaggi,
  setMetodoPagamentoSelezionato,
  setMetodoPagamentoNessuno,
  setVoci,
  setNoteExtra,
  setIncludiIva,
  setTrasferte,
  setMostraTrasferte,
  inviaTrascrizione,
}: Params) {
  const modificaInizializzata = useRef(false);
  const modificaManualeCaricata = useRef(false);
  const trascrizioneModificaInviata = useRef(false);
  const pagamentoImportato = useRef("");

  useEffect(() => {
    const clienteId = modifica?.clienteId || searchParams.get("cliente_id");
    const clienteNome = modifica?.clienteNome || searchParams.get("cliente_nome");
    if (clienteId) {
      setClienteSelezionatoId(clienteId);
      if (clienteNome) {
        setClienti((prev) =>
          prev.some((c) => c.id === clienteId) ? prev : [...prev, { id: clienteId, nome: clienteNome }],
        );
      }
    }
  }, [modifica?.clienteId, modifica?.clienteNome, searchParams, setClienteSelezionatoId, setClienti]);

  useEffect(() => {
    const trascrizione = searchParams.get("trascrizione");
    if (trascrizione && !inModifica && messaggiLength === 0) {
      setInput(trascrizione);
    }
  }, [searchParams, inModifica, messaggiLength, setInput]);

  useEffect(() => {
    modificaInizializzata.current = false;
    modificaManualeCaricata.current = false;
    trascrizioneModificaInviata.current = false;
  }, [searchParams.get("modifica"), searchParams.get("trascrizione"), testoModifica]);

  useEffect(() => {
    if (mode !== "chat" || !testoModifica || modificaInizializzata.current) return;
    modificaInizializzata.current = true;
    cancellaBozzaChat();
    setMessaggi([
      {
        role: "assistant",
        content: `Ho caricato il tuo preventivo v${versionePrecedente}. Cosa vuoi modificare?\n\n${testoModifica}`,
      },
    ]);
  }, [mode, testoModifica, versionePrecedente, setMessaggi]);

  useEffect(() => {
    if (!testoModifica || metodiPagamento.length === 0) return;
    const parsed = parsePreventivoTesto(testoModifica);
    const trovato = trovaMetodoPagamentoDaNome(metodiPagamento, parsed.pagamentoNome);
    if (trovato) {
      setMetodoPagamentoSelezionato(trovato);
      setMetodoPagamentoNessuno(false);
    }
  }, [testoModifica, metodiPagamento, setMetodoPagamentoSelezionato, setMetodoPagamentoNessuno]);

  useEffect(() => {
    const trascrizione = searchParams.get("trascrizione");
    if (!trascrizione || !inModifica || trascrizioneModificaInviata.current) return;
    if (!token || messaggiLength === 0) return;
    trascrizioneModificaInviata.current = true;
    void inviaTrascrizione(trascrizione);
  }, [searchParams, inModifica, token, messaggiLength, inviaTrascrizione]);

  useEffect(() => {
    if (mode !== "manuale" || !testoModifica) return;

    const parsed = parsePreventivoTesto(testoModifica);
    setVoci(vociParsedConId(collegaVociAlListino(parsed.voci, servizi)));
    setNoteExtra(parsed.noteExtra);
    setIncludiIva(parsed.includiIva);
    setTrasferte(parsed.trasferte);
    setMostraTrasferte(parsed.trasferte.length > 0);
    pagamentoImportato.current = parsed.pagamentoNome;

    if (modificaManualeCaricata.current) return;
    modificaManualeCaricata.current = true;
    cancellaBozzaManuale();

    const clienteId = modifica?.clienteId || searchParams.get("cliente_id");
    const clienteNome = modifica?.clienteNome || searchParams.get("cliente_nome");
    if (clienteId && clienteNome) {
      setClienteSelezionatoId(clienteId);
      setClienti((prev) =>
        prev.some((c) => c.id === clienteId) ? prev : [...prev, { id: clienteId, nome: clienteNome }],
      );
    }
  }, [
    mode,
    testoModifica,
    servizi,
    modifica?.clienteId,
    modifica?.clienteNome,
    searchParams,
    setVoci,
    setNoteExtra,
    setIncludiIva,
    setTrasferte,
    setMostraTrasferte,
    setClienteSelezionatoId,
    setClienti,
  ]);

  useEffect(() => {
    if (!pagamentoImportato.current || metodiPagamento.length <= 1) return;
    const trovato = trovaMetodoPagamentoDaNome(metodiPagamento, pagamentoImportato.current);
    if (trovato) {
      setMetodoPagamentoSelezionato(trovato);
      setMetodoPagamentoNessuno(false);
    }
  }, [metodiPagamento, setMetodoPagamentoSelezionato, setMetodoPagamentoNessuno]);
}
