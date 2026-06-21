import { supabase } from "./supabase";
import type { ProfiloFiscale } from "./types";

export type ProfiloFiscaleForm = Omit<ProfiloFiscale, "attivo"> & { id?: string };

export const DEFAULT_PROFILO_FISCALE: ProfiloFiscaleForm = {
  regime: "forfettario",
  coefficiente_redditivita: "78",
  aliquota_sostitutiva: "15",
  inps_percentuale: "26.07",
  inps_tipo: "gestione_separata",
  riduzione_contributiva: false,
  riduzione_percentuale: "35",
  rivalsa_inps: true,
  rivalsa_percentuale: "4",
  soglia_fatturato: "85000",
  aliquota_iva: "22",
  costi_deducibili_percentuale: "20",
  ritenuta_acconto: "20",
  soglia_occasionale: "5000",
};

type ProfiloFiscaleRow = {
  id?: string;
  regime: ProfiloFiscaleForm["regime"];
  coefficiente_redditivita?: number | string | null;
  aliquota_sostitutiva?: number | string | null;
  inps_percentuale?: number | string | null;
  inps_tipo?: string | null;
  riduzione_contributiva?: boolean | null;
  riduzione_percentuale?: number | string | null;
  rivalsa_inps?: boolean | null;
  rivalsa_percentuale?: number | string | null;
  soglia_fatturato?: number | string | null;
  aliquota_iva?: number | string | null;
  costi_deducibili_percentuale?: number | string | null;
  ritenuta_acconto?: number | string | null;
  soglia_occasionale?: number | string | null;
  attivo?: boolean | null;
};

function normalizzaProfiloFiscale(data: ProfiloFiscaleRow): ProfiloFiscaleForm {
  return {
    id: data.id,
    regime: data.regime,
    coefficiente_redditivita: data.coefficiente_redditivita?.toString() || "78",
    aliquota_sostitutiva: data.aliquota_sostitutiva?.toString() || "15",
    inps_percentuale: data.inps_percentuale?.toString() || "26.07",
    inps_tipo: data.inps_tipo || "gestione_separata",
    riduzione_contributiva: data.riduzione_contributiva || false,
    riduzione_percentuale: data.riduzione_percentuale?.toString() || "35",
    rivalsa_inps: data.rivalsa_inps ?? true,
    rivalsa_percentuale: data.rivalsa_percentuale?.toString() || "4",
    soglia_fatturato: data.soglia_fatturato?.toString() || "85000",
    aliquota_iva: data.aliquota_iva?.toString() || "22",
    costi_deducibili_percentuale: data.costi_deducibili_percentuale?.toString() || "20",
    ritenuta_acconto: data.ritenuta_acconto?.toString() || "20",
    soglia_occasionale: data.soglia_occasionale?.toString() || "5000",
  };
}

export async function caricaProfiloFiscale() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profili_fiscali")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) return { profilo: DEFAULT_PROFILO_FISCALE, featureAttiva: false };
  const profilo = data as ProfiloFiscaleRow;
  return {
    profilo: normalizzaProfiloFiscale(profilo),
    featureAttiva: profilo.attivo ?? false,
  };
}

/** Profilo fiscale se la feature è attiva — usato nel builder. */
export async function caricaProfiloFiscaleAttivo(): Promise<ProfiloFiscale | null> {
  const data = await caricaProfiloFiscale();
  if (!data?.featureAttiva) return null;
  return data.profilo;
}

export async function salvaProfiloFiscale(profilo: ProfiloFiscaleForm, featureAttiva: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { id: null, error: "Utente non autenticato." };

  const payload = {
    user_id: user.id,
    attivo: featureAttiva,
    regime: profilo.regime,
    coefficiente_redditivita: parseFloat(profilo.coefficiente_redditivita) || 78,
    aliquota_sostitutiva: parseFloat(profilo.aliquota_sostitutiva) || 15,
    inps_percentuale: parseFloat(profilo.inps_percentuale) || 26.07,
    inps_tipo: profilo.inps_tipo,
    riduzione_contributiva: profilo.riduzione_contributiva,
    riduzione_percentuale: parseFloat(profilo.riduzione_percentuale) || 35,
    rivalsa_inps: profilo.rivalsa_inps,
    rivalsa_percentuale: parseFloat(profilo.rivalsa_percentuale) || 4,
    soglia_fatturato: parseFloat(profilo.soglia_fatturato) || 85000,
    aliquota_iva: parseFloat(profilo.aliquota_iva) || 22,
    costi_deducibili_percentuale: parseFloat(profilo.costi_deducibili_percentuale) || 20,
    ritenuta_acconto: parseFloat(profilo.ritenuta_acconto) || 20,
    soglia_occasionale: parseFloat(profilo.soglia_occasionale) || 5000,
  };

  if (profilo.id) {
    const { error } = await supabase.from("profili_fiscali").update(payload).eq("id", profilo.id);
    if (error) return { id: null, error: error.message };
    return { id: profilo.id, error: null };
  }

  const { data, error } = await supabase
    .from("profili_fiscali")
    .insert(payload)
    .select()
    .single();
  if (error) return { id: null, error: error.message };
  if (!data?.id) return { id: null, error: "Inserimento profilo fiscale fallito." };
  return { id: data.id as string, error: null };
}
