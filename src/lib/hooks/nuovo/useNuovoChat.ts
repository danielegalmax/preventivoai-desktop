import { useCallback } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { inviaMessaggio, convertiRecap, applicaRispostaChat, estraiNomeCliente, cercaCliente, type ClienteSuggeritoChat } from "../../chat";
import type { Messaggio } from "../../types";
import type { NuovoManualeDraft } from "../../nuovoDraft";

type Params = {
  token: string;
  messaggi: Messaggio[];
  input: string;
  loading: boolean;
  clienteSelezionatoId: string;
  recap: string;
  setMessaggi: Dispatch<SetStateAction<Messaggio[]>>;
  setInput: Dispatch<SetStateAction<string>>;
  setRecap: Dispatch<SetStateAction<string>>;
  setPreventivo: Dispatch<SetStateAction<string>>;
  setErrore: Dispatch<SetStateAction<string>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setClienteSelezionatoId: Dispatch<SetStateAction<string>>;
  setClienti: Dispatch<SetStateAction<{ id: string; nome: string }[]>>;
  setNomeClienteSuggerito: Dispatch<SetStateAction<string>>;
  setMostraModalCliente: Dispatch<SetStateAction<boolean>>;
  setClientiSuggeritiOmografi: Dispatch<SetStateAction<ClienteSuggeritoChat[]>>;
  setMostraModalOmografi: Dispatch<SetStateAction<boolean>>;
  vaiAllAnteprima: (override?: Partial<NuovoManualeDraft>) => void;
};

export function useNuovoChat({
  token,
  messaggi,
  input,
  loading,
  clienteSelezionatoId,
  recap,
  setMessaggi,
  setInput,
  setRecap,
  setPreventivo,
  setErrore,
  setLoading,
  setClienteSelezionatoId,
  setClienti,
  setNomeClienteSuggerito,
  setMostraModalCliente,
  setClientiSuggeritiOmografi,
  setMostraModalOmografi,
  vaiAllAnteprima,
}: Params) {
  const gestisciClienteDaNome = useCallback(
    async (nome: string) => {
      try {
        const risultati = await cercaCliente(nome, token);
        if (risultati.length === 1) {
          setClienteSelezionatoId(risultati[0].id);
          setClienti((prev) =>
            prev.some((c) => c.id === risultati[0].id) ? prev : [...prev, risultati[0]],
          );
        } else if (risultati.length > 1) {
          setClientiSuggeritiOmografi(risultati);
          setMostraModalOmografi(true);
        } else if (risultati.length === 0) {
          setNomeClienteSuggerito(nome);
          setMostraModalCliente(true);
        }
      } catch {
        // ricerca cliente best-effort, non blocca la chat se fallisce
      }
    },
    [
      token,
      setClienteSelezionatoId,
      setClienti,
      setClientiSuggeritiOmografi,
      setMostraModalOmografi,
      setNomeClienteSuggerito,
      setMostraModalCliente,
    ],
  );

  const inviaTrascrizione = useCallback(
    async (testo: string) => {
      if (!testo || loading) return;
      setErrore("");
      setLoading(true);

      const nuovi: Messaggio[] = [...messaggi, { role: "user", content: testo }];
      setMessaggi(nuovi);

      try {
        let reply = await inviaMessaggio(nuovi, token);

        if (reply.includes("CLIENTE:") && !clienteSelezionatoId) {
          const estratto = estraiNomeCliente(reply);
          reply = estratto.reply;
          if (estratto.nomeCliente) await gestisciClienteDaNome(estratto.nomeCliente);
        }

        const risultato = applicaRispostaChat(reply, nuovi);
        setMessaggi(risultato.messaggi);
        setRecap(risultato.recap);
        setPreventivo(risultato.preventivo);
        if (risultato.preventivo) vaiAllAnteprima();
      } catch (err) {
        setErrore(err instanceof Error ? err.message : "Errore durante l'invio.");
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      messaggi,
      token,
      clienteSelezionatoId,
      gestisciClienteDaNome,
      setErrore,
      setLoading,
      setMessaggi,
      setRecap,
      setPreventivo,
      vaiAllAnteprima,
    ],
  );

  const invia = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const testo = input.trim();
      if (!testo || loading) return;
      setInput("");
      setErrore("");
      setLoading(true);

      const nuovi: Messaggio[] = [...messaggi, { role: "user", content: testo }];
      setMessaggi(nuovi);

      try {
        let reply = await inviaMessaggio(nuovi, token);

        if (reply.includes("CLIENTE:") && !clienteSelezionatoId) {
          const estratto = estraiNomeCliente(reply);
          reply = estratto.reply;
          if (estratto.nomeCliente) await gestisciClienteDaNome(estratto.nomeCliente);
        }

        const risultato = applicaRispostaChat(reply, nuovi);
        setMessaggi(risultato.messaggi);
        setRecap(risultato.recap);
        setPreventivo(risultato.preventivo);
        if (risultato.preventivo) vaiAllAnteprima();
      } catch (err) {
        setErrore(err instanceof Error ? err.message : "Errore durante l'invio.");
      } finally {
        setLoading(false);
      }
    },
    [
      input,
      loading,
      messaggi,
      token,
      clienteSelezionatoId,
      gestisciClienteDaNome,
      setInput,
      setErrore,
      setLoading,
      setMessaggi,
      setRecap,
      setPreventivo,
      vaiAllAnteprima,
    ],
  );

  const generaDaRecap = useCallback(async () => {
    setLoading(true);
    setErrore("");
    try {
      const testoFinale = await convertiRecap(recap, token);
      setRecap("");
      setPreventivo(testoFinale);
      vaiAllAnteprima();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore nella generazione.");
    } finally {
      setLoading(false);
    }
  }, [recap, token, setLoading, setErrore, setRecap, setPreventivo, vaiAllAnteprima]);

  return {
    invia,
    inviaTrascrizione,
    generaDaRecap,
    gestisciClienteDaNome,
  };
}
