import { supabase } from "../supabase";
import type { RataAbbonamento } from "../types";
import { calcolaImportiRate, formatImportoEuro } from "preventivoai-shared";
import { inputDateToIso, oggiInputDate } from "../format";
import { trackEvento } from "../track";

export type AbbonamentoOpError = {
  ok: false;
  error: string;
  errorTitle?: string;
};

export type AbbonamentoOpOk<T extends Record<string, unknown> = Record<string, never>> = {
  ok: true;
} & T;

export type AbbonamentoOpResult<T extends Record<string, unknown> = Record<string, never>> =
  | AbbonamentoOpOk<T>
  | AbbonamentoOpError;

export async function modificaImportoPianoRate(
  abbonamentoId: string,
  rate: RataAbbonamento[],
  nuovoImportoTotale: number,
): Promise<AbbonamentoOpResult<{ nuovoImportoTotale: number }>> {
  if (!(nuovoImportoTotale > 0)) {
    return {
      ok: false,
      errorTitle: "Importo non valido",
      error: "Inserisci un importo maggiore di zero.",
    };
  }

  const raccolto = rate.reduce(
    (a, r) => a + (r.stato === "incassato" ? r.importo : (r.acconto || 0)),
    0,
  );
  if (nuovoImportoTotale < raccolto) {
    return {
      ok: false,
      errorTitle: "Importo troppo basso",
      error: `Hai già incassato €${formatImportoEuro(raccolto, 2)}. L'importo totale non può essere inferiore.`,
    };
  }

  const rateAperte = [...rate]
    .filter((r) => r.stato !== "incassato")
    .sort((a, b) => a.anno - b.anno || a.mese - b.mese);
  if (rateAperte.length === 0) {
    return {
      ok: false,
      errorTitle: "Nessuna rata da aggiornare",
      error: "Tutte le rate sono già pagate.",
    };
  }

  const residuo = Math.round((nuovoImportoTotale - raccolto) * 100) / 100;
  const nuoviImporti = calcolaImportiRate(residuo, rateAperte.length);
  if (nuoviImporti.length === 0) {
    return { ok: false, error: "Impossibile calcolare gli importi delle rate." };
  }

  const snapshot = rateAperte.map((r) => ({
    id: r.id,
    importo: r.importo,
    stato: r.stato,
  }));
  const aggiornate: string[] = [];

  for (let i = 0; i < rateAperte.length; i++) {
    const rata = rateAperte[i];
    const nuovoImporto = nuoviImporti[i];
    const acconto = rata.acconto || 0;
    let nuovoStato: RataAbbonamento["stato"] = rata.stato;
    if (acconto >= nuovoImporto) nuovoStato = "incassato";
    else if (acconto > 0) nuovoStato = "parziale";

    const { error } = await supabase
      .from("rate_abbonamento")
      .update({ importo: nuovoImporto, stato: nuovoStato })
      .eq("id", rata.id);
    if (error) {
      for (const id of aggiornate) {
        const orig = snapshot.find((s) => s.id === id);
        if (!orig) continue;
        await supabase
          .from("rate_abbonamento")
          .update({ importo: orig.importo, stato: orig.stato })
          .eq("id", id);
      }
      return {
        ok: false,
        errorTitle: "Errore",
        error:
          "Aggiornamento importi interrotto: le rate già modificate sono state ripristinate. "
          + error.message,
      };
    }
    aggiornate.push(rata.id);
  }

  const { error: errAb } = await supabase
    .from("abbonamenti")
    .update({ importo_default: nuovoImportoTotale })
    .eq("id", abbonamentoId);
  if (errAb) {
    for (const { id, importo, stato } of snapshot) {
      await supabase
        .from("rate_abbonamento")
        .update({ importo, stato })
        .eq("id", id);
    }
    return {
      ok: false,
      errorTitle: "Errore",
      error:
        "Importi rate aggiornati ma il totale del piano no: le rate sono state ripristinate. "
        + errAb.message,
    };
  }

  return { ok: true, nuovoImportoTotale };
}

export async function registraPagamentoDb(
  rataId: string,
  rata: RataAbbonamento,
  importoPagato: number,
  nota?: string,
  dataIncasso?: string,
): Promise<
  AbbonamentoOpResult<{
    aggiornamento: Partial<RataAbbonamento> & { data_incasso?: string };
    nuovoSaldo: number;
  }>
> {
  const nuovoAcconto = Math.min(rata.acconto + importoPagato, rata.importo);
  const nuovoSaldo = rata.importo - nuovoAcconto;
  const nuovoStato = nuovoSaldo <= 0 ? "incassato" : "parziale";

  const aggiornamento: Partial<RataAbbonamento> & { data_incasso?: string } = {
    acconto: nuovoAcconto,
    stato: nuovoStato,
    note: nota || rata.note || null,
  };
  if (nuovoStato === "incassato") {
    aggiornamento.data_incasso = dataIncasso ?? inputDateToIso(oggiInputDate());
  }

  const { error } = await supabase
    .from("rate_abbonamento")
    .update(aggiornamento)
    .eq("id", rataId);

  if (error) {
    return { ok: false, error: error.message };
  }

  void trackEvento("pagamento_registrato", "cliente_dettaglio");
  return { ok: true, aggiornamento, nuovoSaldo };
}

export async function azzeraPagamentoDb(
  rataId: string,
): Promise<
  AbbonamentoOpResult<{
    aggiornamento: Partial<RataAbbonamento> & { data_incasso: null };
  }>
> {
  const aggiornamento: Partial<RataAbbonamento> & { data_incasso: null } = {
    acconto: 0,
    stato: "da_incassare",
    data_incasso: null,
  };
  const { error } = await supabase
    .from("rate_abbonamento")
    .update(aggiornamento)
    .eq("id", rataId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, aggiornamento };
}
