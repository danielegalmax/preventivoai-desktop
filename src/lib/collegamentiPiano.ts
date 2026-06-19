import { supabase } from "./supabase";
import { rimuoviDataDaNomePiano } from "./preventivoMadre";
import { queryConFiltroCestino } from "./preventiviVisibili";

export type CollegamentoPiano = {
  tipo: "canone" | "rate";
  nomePiano: string | null;
};

export type CollegamentiPianoMap = Record<string, CollegamentoPiano>;

type RigaAbbonamentoCollegato = {
  preventivo_id: string | null;
  tipo: string | null;
  nome: string | null;
  created_at?: string | null;
};

export function normalizzaTipoPiano(
  tipo: string | null | undefined,
  nomePiano?: string | null,
): "canone" | "rate" {
  const t = tipo?.toLowerCase();
  if (t === "rate") return "rate";
  if (t === "canone") return "canone";
  const nome = nomePiano?.trim() ?? "";
  if (nome.startsWith("Rate ·") || /^Rate ·/i.test(nome)) return "rate";
  if (nome.startsWith("Canone ·") || /^Canone ·/i.test(nome)) return "canone";
  return "canone";
}

/** Etichetta breve in lista preventivi: sempre distingue rate vs abbonamento (come mobile). */
export function etichettaPianoCollegato(collegamento: CollegamentoPiano): string {
  const tipo = normalizzaTipoPiano(collegamento.tipo, collegamento.nomePiano);
  return tipo === "rate" ? "Piano a rate collegato" : "Abbonamento collegato";
}

/** Etichetta estesa con titolo preventivo madre, se disponibile nel nome piano. */
export function etichettaPianoCollegatoDettaglio(collegamento: CollegamentoPiano): string {
  const tipo = normalizzaTipoPiano(collegamento.tipo, collegamento.nomePiano);
  const nome = collegamento.nomePiano?.trim();
  if (nome) {
    const pulito = rimuoviDataDaNomePiano(nome);
    if (pulito.startsWith("Rate ·") || pulito.startsWith("Canone ·")) return pulito;
    return tipo === "rate" ? `Rate · ${pulito}` : `Canone · ${pulito}`;
  }
  return etichettaPianoCollegato(collegamento);
}

async function caricaCollegamentiPiano(opts: { clienteId?: string; userId?: string }) {
  const build = (conFiltroCestino: boolean) => {
    let query = supabase
      .from("abbonamenti")
      .select("preventivo_id, tipo, nome, created_at")
      .eq("attivo", true)
      .not("preventivo_id", "is", null)
      .order("created_at", { ascending: false });
    if (conFiltroCestino) query = query.is("deleted_at", null);
    if (opts.clienteId) query = query.eq("cliente_id", opts.clienteId);
    if (opts.userId) query = query.eq("user_id", opts.userId);
    return query;
  };

  const { data } = await queryConFiltroCestino(
    () => build(true),
    () => build(false),
  );
  const map: CollegamentiPianoMap = {};
  for (const row of (data || []) as RigaAbbonamentoCollegato[]) {
    if (row.preventivo_id && !map[row.preventivo_id]) {
      map[row.preventivo_id] = {
        tipo: normalizzaTipoPiano(row.tipo, row.nome),
        nomePiano: row.nome,
      };
    }
  }
  return map;
}

export async function caricaCollegamentiPianoCliente(clienteId: string) {
  return caricaCollegamentiPiano({ clienteId });
}

export async function caricaCollegamentiPianoPreventivi() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  return caricaCollegamentiPiano({ userId: user.id });
}
