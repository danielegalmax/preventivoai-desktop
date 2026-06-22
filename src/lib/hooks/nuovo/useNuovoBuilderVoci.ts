import { useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  generaTestoPreventivoBuilder,
  formatImportoVoce,
  isVoceCustom,
} from "../../builder";
import type { TrasfertaBuilder, VoceBuilder } from "../../builder";
import { creaServizio } from "../../listino";
import type { MetodoPagamento } from "../../pagamenti";
import type { NuovoManualeDraft } from "../../nuovoDraft";
import type { Servizio } from "../../types";
import {
  validaPianiPagamento,
  type RateAccontoTipo,
  type RateModalitaPiano,
} from "preventivoai-shared";

type Params = {
  voci: VoceBuilder[];
  servizi: Servizio[];
  setVoci: Dispatch<SetStateAction<VoceBuilder[]>>;
  setServizi: Dispatch<SetStateAction<Servizio[]>>;
  setErrore: Dispatch<SetStateAction<string>>;
  setPreventivo: Dispatch<SetStateAction<string>>;
  clienti: { id: string; nome: string }[];
  clienteSelezionatoId: string;
  trasferte: TrasfertaBuilder[];
  includiIva: boolean;
  noteExtra: string;
  metodoPagamentoSelezionato: MetodoPagamento | null;
  pagamentoRateAttivo: boolean;
  abbonamentoAttivo: boolean;
  clienteCollegato: () => boolean;
  rateNumero: string;
  rateGiornoScadenza: string;
  rateMeseInizio: string;
  abGiorno: string;
  abMeseInizio: string;
  rateModalita: RateModalitaPiano;
  rateAccontoTipo: RateAccontoTipo;
  rateAccontoValore: string;
  totaleConIva: number;
  vaiAllAnteprima: (override?: Partial<NuovoManualeDraft>) => void;
};

export function useNuovoBuilderVoci({
  voci,
  servizi,
  setVoci,
  setServizi,
  setErrore,
  setPreventivo,
  clienti,
  clienteSelezionatoId,
  trasferte,
  includiIva,
  noteExtra,
  metodoPagamentoSelezionato,
  pagamentoRateAttivo,
  abbonamentoAttivo,
  clienteCollegato,
  rateNumero,
  rateGiornoScadenza,
  rateMeseInizio,
  abGiorno,
  abMeseInizio,
  rateModalita,
  rateAccontoTipo,
  rateAccontoValore,
  totaleConIva,
  vaiAllAnteprima,
}: Params) {
  const salvataggioListinoRef = useRef<Set<string>>(new Set());

  const salvaVoceNelListino = useCallback(
    async (voce: VoceBuilder) => {
      if (!isVoceCustom(voce) || voce.salvataNelListino || !voce.nome.trim()) return;
      if (salvataggioListinoRef.current.has(voce.id)) return;

      salvataggioListinoRef.current.add(voce.id);
      const costoNormalizzato = voce.costo.trim().replace(",", ".");
      const { data, error } = await creaServizio({
        nome: voce.nome,
        descrizione: voce.descrizione,
        costo: costoNormalizzato,
        unita: voce.unita,
        ordine: servizi.length,
      });
      salvataggioListinoRef.current.delete(voce.id);

      if (error) {
        window.alert("Non è stato possibile salvare la voce nel listino.");
        setVoci((prev) =>
          prev.map((v) => (v.id === voce.id ? { ...v, salvaNelListino: false } : v)),
        );
        return;
      }

      if (data) {
        setServizi((prev) => [...prev, data as Servizio]);
        setVoci((prev) =>
          prev.map((v) =>
            v.id === voce.id ? { ...v, salvataNelListino: true, salvaNelListino: true } : v,
          ),
        );
      }
    },
    [servizi.length, setServizi, setVoci],
  );

  const aggiornaVoce = useCallback(
    (id: string, campo: keyof VoceBuilder, valore: string) => {
      setVoci((prev) => {
        const next = prev.map((v) => (v.id === id ? { ...v, [campo]: valore } : v));
        const voce = next.find((v) => v.id === id);
        if (
          voce &&
          isVoceCustom(voce) &&
          voce.salvaNelListino &&
          !voce.salvataNelListino &&
          voce.nome.trim() &&
          (campo === "nome" || campo === "costo" || campo === "unita" || campo === "descrizione")
        ) {
          void salvaVoceNelListino(voce);
        }
        return next;
      });
    },
    [salvaVoceNelListino, setVoci],
  );

  const handleSalvaNelListinoChange = useCallback(
    async (voceId: string, salva: boolean) => {
      let voceAggiornata: VoceBuilder | undefined;
      setVoci((prev) =>
        prev.map((v) => {
          if (v.id !== voceId) return v;
          voceAggiornata = { ...v, salvaNelListino: salva };
          return voceAggiornata;
        }),
      );

      if (!salva || !voceAggiornata) return;

      if (!voceAggiornata.nome.trim()) {
        window.alert("Inserisci il nome del servizio prima di salvarlo nel listino.");
        setVoci((prev) =>
          prev.map((v) => (v.id === voceId ? { ...v, salvaNelListino: false } : v)),
        );
        return;
      }

      await salvaVoceNelListino(voceAggiornata);
    },
    [salvaVoceNelListino, setVoci],
  );

  const aggiungiVoceCustom = useCallback(() => {
    setVoci((prev) => [
      ...prev,
      {
        id: `custom-${crypto.randomUUID()}`,
        nome: "",
        descrizione: "",
        costo: "",
        quantita: "1",
        unita: "cad",
        salvaNelListino: false,
      },
    ]);
  }, [setVoci]);

  const riordinaVoci = useCallback(
    (fromIndex: number, toIndex: number) => {
      setVoci((prev) => {
        const next = [...prev];
        const [spostata] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, spostata);
        return next;
      });
    },
    [setVoci],
  );

  const rimuoviVoce = useCallback(
    (id: string) => {
      setVoci((prev) => prev.filter((v) => v.id !== id));
    },
    [setVoci],
  );

  const aggiungiServizioListino = useCallback(
    (s: Servizio) => {
      if (voci.find((v) => v.id === s.id)) return;
      setVoci((prev) => [
        ...prev,
        {
          id: s.id,
          nome: s.nome,
          descrizione: s.descrizione || "",
          costo: s.costo != null ? formatImportoVoce(s.costo) : "",
          quantita: "1",
          unita: s.unita,
        },
      ]);
    },
    [voci, setVoci],
  );

  const generaDaBuilder = useCallback(() => {
    const vociValide = voci.filter((v) => v.nome.trim());
    if (vociValide.length === 0) {
      setErrore("Aggiungi almeno una voce con un nome.");
      return;
    }
    const errPiani = validaPianiPagamento({
      pagamentoRateAttivo,
      abbonamentoAttivo,
      clienteCollegato: clienteCollegato(),
      rateNumero,
      rateGiornoScadenza,
      rateMeseInizio,
      abGiorno,
      abMeseInizio,
      rateModalita,
      rateAccontoTipo,
      rateAccontoValore,
      rateImportoTotale: totaleConIva,
    });
    if (errPiani) {
      setErrore(errPiani);
      return;
    }
    setErrore("");
    const nomeCliente = clienti.find((c) => c.id === clienteSelezionatoId)?.nome || "";
    const testo = generaTestoPreventivoBuilder({
      nomeCliente,
      voci: vociValide,
      trasferte,
      includiIva,
      noteExtra,
      metodoPagamentoSelezionato,
    });
    setPreventivo(testo);
    vaiAllAnteprima({ preventivo: testo });
  }, [
    voci,
    pagamentoRateAttivo,
    abbonamentoAttivo,
    clienteCollegato,
    rateNumero,
    rateGiornoScadenza,
    rateMeseInizio,
    abGiorno,
    abMeseInizio,
    rateModalita,
    rateAccontoTipo,
    rateAccontoValore,
    totaleConIva,
    setErrore,
    clienti,
    clienteSelezionatoId,
    trasferte,
    includiIva,
    noteExtra,
    metodoPagamentoSelezionato,
    setPreventivo,
    vaiAllAnteprima,
  ]);

  return {
    aggiornaVoce,
    handleSalvaNelListinoChange,
    aggiungiVoceCustom,
    riordinaVoci,
    rimuoviVoce,
    aggiungiServizioListino,
    generaDaBuilder,
  };
}
