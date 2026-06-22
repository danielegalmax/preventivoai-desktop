import { supabase } from "./supabase";
import { caricaCollegamentiPianoPreventivi, type CollegamentiPianoMap } from "./collegamentiPiano";
import { calcolaIncassatoTotale } from "./incassi";
import { getNomeBreve } from "./greeting";
import { queryConFiltroCestino } from "preventivoai-shared";
import type { Preventivo } from "./types";

type HomeInsightKind = "alert" | "success" | "info" | "action";

export type HomeInsight = {
  id: string;
  kind: HomeInsightKind;
  icon: string;
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
};

export type HomeData = {
  nomeBreve: string;
  preventiviMese: number;
  preventiviMeseScorso: number;
  clientiTotali: number;
  incassatoTotale: number;
  preventiviTotali: number;
  minutiRisparmiati: number;
  pipelineValore: number;
  preventiviDaSeguire: number;
  rateInRitardo: number;
  rateInRitardoImporto: number;
  ultimiPreventivi: Preventivo[];
  collegamentiPiano: CollegamentiPianoMap;
  insights: HomeInsight[];
};

type PreventivoHomeRow = Preventivo & {
  clienti?: { nome?: string } | { nome?: string }[] | null;
};

function inizioMese(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fineMese(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

async function contaPreventiviMese(userId: string, offsetMese = 0): Promise<number> {
  const inizio = inizioMese(offsetMese);
  const fine = fineMese(offsetMese);

  const base = () =>
    supabase
      .from("preventivi")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_ultimo", true)
      .gte("created_at", inizio)
      .lte("created_at", fine);

  const { count } = await queryConFiltroCestino(
    () => base().is("deleted_at", null),
    () => base(),
  );

  return count || 0;
}

async function contaClienti(userId: string): Promise<number> {
  const { count } = await supabase
    .from("clienti")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return count || 0;
}

async function contaPreventiviTotali(userId: string): Promise<number> {
  const base = () =>
    supabase
      .from("preventivi")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_ultimo", true);

  const { count } = await queryConFiltroCestino(
    () => base().is("deleted_at", null),
    () => base(),
  );

  return count || 0;
}

async function caricaUltimiPreventivi(userId: string): Promise<Preventivo[]> {
  const base = () =>
    supabase
      .from("preventivi")
      .select(
        "id, titolo, nome_cliente, importo_totale, stato, pagato, created_at, cliente_id, clienti(nome)",
      )
      .eq("user_id", userId)
      .eq("is_ultimo", true)
      .order("created_at", { ascending: false })
      .limit(5);

  const { data } = await queryConFiltroCestino(
    () => base().is("deleted_at", null),
    () => base(),
  );

  return ((data || []) as unknown as PreventivoHomeRow[]).map((p) => {
    const cliente = Array.isArray(p.clienti) ? p.clienti[0] : p.clienti;
    return {
      ...p,
      nome_cliente: cliente?.nome || p.nome_cliente || "Senza cliente",
    };
  });
}

async function caricaPipeline(userId: string) {
  const base = () =>
    supabase
      .from("preventivi")
      .select("importo_totale")
      .eq("user_id", userId)
      .eq("is_ultimo", true)
      .eq("stato", "inviato");

  const { data } = await queryConFiltroCestino(
    () => base().is("deleted_at", null),
    () => base(),
  );

  const valore = (data || []).reduce((sum, p) => sum + (p.importo_totale || 0), 0);
  return { count: data?.length || 0, valore };
}

async function contaPreventiviDaSeguire(userId: string): Promise<number> {
  const limite = new Date();
  limite.setDate(limite.getDate() - 7);

  const base = () =>
    supabase
      .from("preventivi")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_ultimo", true)
      .eq("stato", "inviato")
      .lt("created_at", limite.toISOString());

  const { count } = await queryConFiltroCestino(
    () => base().is("deleted_at", null),
    () => base(),
  );

  return count || 0;
}

async function caricaRateInRitardo(userId: string) {
  const build = (conFiltro: boolean) => {
    let q = supabase
      .from("rate_abbonamento")
      .select("saldo_residuo, importo, acconto, abbonamenti!inner(user_id, attivo)")
      .eq("stato", "in_ritardo")
      .eq("abbonamenti.user_id", userId)
      .eq("abbonamenti.attivo", true);
    if (conFiltro) q = q.is("abbonamenti.deleted_at", null);
    return q;
  };

  const { data } = await queryConFiltroCestino(() => build(true), () => build(false));
  const rows = data || [];
  const importo = rows.reduce((sum, r) => {
    const residuo = r.saldo_residuo ?? Math.max(0, (r.importo || 0) - (r.acconto || 0));
    return sum + residuo;
  }, 0);

  return { count: rows.length, importo };
}

function generaHomeInsights(input: {
  preventiviMese: number;
  preventiviMeseScorso: number;
  preventiviTotali: number;
  pipelineValore: number;
  pipelineCount: number;
  preventiviDaSeguire: number;
  rateInRitardo: number;
  rateInRitardoImporto: number;
  clientiTotali: number;
}): HomeInsight[] {
  const insights: HomeInsight[] = [];

  if (input.rateInRitardo > 0) {
    insights.push({
      id: "rate-ritardo",
      kind: "alert",
      icon: "⚠️",
      title: `${input.rateInRitardo} rate in ritardo`,
      description: `Hai incassi da recuperare per un totale di circa €${input.rateInRitardoImporto.toLocaleString("it-IT", { maximumFractionDigits: 0 })}.`,
      link: "/clienti",
      linkLabel: "Vai ai clienti",
    });
  }

  if (input.preventiviDaSeguire > 0) {
    insights.push({
      id: "preventivi-seguire",
      kind: "action",
      icon: "📬",
      title: `${input.preventiviDaSeguire} preventivi da ricontattare`,
      description: "Inviati da più di 7 giorni senza risposta. Un messaggio ora può chiudere il lavoro.",
      link: "/storico",
      linkLabel: "Apri storico",
    });
  }

  if (input.pipelineValore > 0) {
    insights.push({
      id: "pipeline",
      kind: "info",
      icon: "💼",
      title: `€${input.pipelineValore.toLocaleString("it-IT", { maximumFractionDigits: 0 })} in pipeline`,
      description:
        input.pipelineCount === 1
          ? "1 preventivo inviato in attesa di risposta dal cliente."
          : `${input.pipelineCount} preventivi inviati in attesa di risposta.`,
      link: "/storico",
      linkLabel: "Vedi preventivi",
    });
  }

  if (input.preventiviMeseScorso > 0 && input.preventiviMese > input.preventiviMeseScorso) {
    const delta = Math.round(
      ((input.preventiviMese - input.preventiviMeseScorso) / input.preventiviMeseScorso) * 100,
    );
    insights.push({
      id: "trend-mese",
      kind: "success",
      icon: "📈",
      title: `+${delta}% preventivi questo mese`,
      description: "Stai accelerando: più preventivi significa più opportunità di lavoro.",
    });
  }

  if (input.preventiviTotali === 0) {
    insights.push({
      id: "primo-preventivo",
      kind: "action",
      icon: "✨",
      title: "Crea il tuo primo preventivo",
      description: "Chat AI, voce o builder manuale: in pochi minuti hai un PDF professionale da inviare.",
      link: "/nuovo",
      linkLabel: "Inizia ora",
    });
  } else if (insights.length < 3 && input.clientiTotali === 0) {
    insights.push({
      id: "aggiungi-cliente",
      kind: "info",
      icon: "👥",
      title: "Organizza i tuoi clienti",
      description: "Associa i preventivi alle rubriche clienti per storico, piani rate e incassi in un colpo d'occhio.",
      link: "/clienti",
      linkLabel: "Aggiungi clienti",
    });
  }

  return insights.slice(0, 4);
}

export async function caricaHomeData(userId: string): Promise<HomeData | null> {
  const [
    profiloRes,
    ultimiPreventivi,
    collegamentiPiano,
    incassatoTotaleRes,
    preventiviMese,
    preventiviMeseScorso,
    clientiTotali,
    preventiviTotali,
    pipeline,
    preventiviDaSeguire,
    rateRitardo,
  ] = await Promise.all([
    supabase.from("profiles").select("nome_azienda").eq("id", userId).single(),
    caricaUltimiPreventivi(userId),
    caricaCollegamentiPianoPreventivi(),
    calcolaIncassatoTotale(userId),
    contaPreventiviMese(userId, 0),
    contaPreventiviMese(userId, -1),
    contaClienti(userId),
    contaPreventiviTotali(userId),
    caricaPipeline(userId),
    contaPreventiviDaSeguire(userId),
    caricaRateInRitardo(userId),
  ]);

  const incassatoTotale = incassatoTotaleRes.ok ? incassatoTotaleRes.value : 0;
  const nomeBreve = getNomeBreve(profiloRes.data?.nome_azienda || "");
  const minutiRisparmiati = preventiviTotali * 23;

  const insights = generaHomeInsights({
    preventiviMese,
    preventiviMeseScorso,
    preventiviTotali,
    pipelineValore: pipeline.valore,
    pipelineCount: pipeline.count,
    preventiviDaSeguire,
    rateInRitardo: rateRitardo.count,
    rateInRitardoImporto: rateRitardo.importo,
    clientiTotali,
  });

  return {
    nomeBreve,
    preventiviMese,
    preventiviMeseScorso,
    clientiTotali,
    incassatoTotale,
    preventiviTotali,
    minutiRisparmiati,
    pipelineValore: pipeline.valore,
    preventiviDaSeguire,
    rateInRitardo: rateRitardo.count,
    rateInRitardoImporto: rateRitardo.importo,
    ultimiPreventivi,
    collegamentiPiano,
    insights,
  };
}
