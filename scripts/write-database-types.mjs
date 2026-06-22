import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "../src/lib/database.types.ts");

const content = `/**
 * Tipi database Supabase.
 * Rigenerare con: npx supabase login && npx supabase gen types typescript --project-id xzvvsdnuurzsocsmrghi > src/lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type EmptyRelationships = [];

type ClientiRow = {
  id: string;
  user_id: string;
  nome: string;
  telefono: string | null;
  email: string | null;
  indirizzo: string | null;
  note: string | null;
  created_at: string | null;
};

type ProfilesRow = {
  id: string;
  nome_azienda: string | null;
  categoria: string | null;
  citta: string | null;
  piva: string | null;
  telefono: string | null;
  tono: string | null;
  colore_brand: string | null;
  note_pagamento: string | null;
  firma_nome: string | null;
  logo_url: string | null;
  template_preferito: string | null;
  reminder_firma_giorni: number | null;
  reminder_firma_globale_disabilitato: boolean | null;
  messaggi_cliente: Json | null;
};

type ServiziRow = {
  id: string;
  user_id: string;
  nome: string;
  descrizione: string | null;
  costo: number | null;
  unita: string;
  ordine: number;
};

type MetodiPagamentoRow = {
  id: string;
  user_id: string;
  tipo: string;
  nome: string;
  dati: Json;
  predefinito: boolean;
};

type PreventivoInviiRow = {
  id: string;
  user_id: string;
  preventivo_id: string;
  link_token: string | null;
  inviato_at: string;
  scade_at: string;
  firmato_at: string | null;
  revocato_at: string | null;
  firma_immagine_url: string | null;
  pdf_firmato_url: string | null;
  reminder_disabilitato: boolean;
  canale: string | null;
  metodo_firma: string | null;
};

type PreventivoInviiEventiRow = {
  id?: string;
  invio_id: string;
  tipo: string;
};

type PreventiviRow = {
  id: string;
  user_id: string;
  titolo: string | null;
  stato: string;
  importo_totale: number | null;
  created_at: string;
  pagato: boolean;
  cliente_id: string | null;
  nome_cliente: string | null;
  pdf_url: string | null;
  testo_preventivo: string | null;
  template: string | null;
  data_pagamento: string | null;
  versione: number | null;
  preventivo_padre_id: string | null;
  is_ultimo: boolean;
  deleted_at: string | null;
};

type RateAbbonamentoRow = {
  id: string;
  abbonamento_id: string;
  mese: number;
  anno: number;
  importo: number;
  acconto: number;
  saldo_residuo: number | null;
  stato: "da_incassare" | "parziale" | "incassato" | "in_ritardo";
  data_incasso: string | null;
  note: string | null;
};

type AbbonamentiRow = {
  id: string;
  user_id: string;
  cliente_id: string;
  importo_default: number;
  giorno_scadenza: number;
  attivo: boolean;
  preventivo_id: string | null;
  numero_mensilita: number | null;
  note: string | null;
  tipo: "canone" | "rate";
  nome: string | null;
  created_at: string | null;
  deleted_at: string | null;
};

type ProfiliFiscaliRow = {
  id: string;
  user_id: string;
  attivo: boolean;
  regime: string;
  coefficiente_redditivita: number;
  aliquota_sostitutiva: number;
  inps_percentuale: number;
  inps_tipo: string;
  riduzione_contributiva: boolean;
  riduzione_percentuale: number;
  rivalsa_inps: boolean;
  rivalsa_percentuale: number;
  soglia_fatturato: number;
  aliquota_iva: number;
  costi_deducibili_percentuale: number;
  ritenuta_acconto: number;
  soglia_occasionale: number;
};

type NotificheRow = {
  id: string;
  user_id: string;
  tipo: string;
  preventivo_id: string | null;
  invio_id: string | null;
  titolo: string;
  messaggio: string;
  payload: Json;
  letta: boolean;
  archiviata: boolean;
  snooze_until: string | null;
  created_at: string;
};

type PreventiviRelationships = [
  {
    foreignKeyName: "preventivi_cliente_id_fkey";
    columns: ["cliente_id"];
    isOneToOne: false;
    referencedRelation: "clienti";
    referencedColumns: ["id"];
  },
];

type AbbonamentiRelationships = [
  {
    foreignKeyName: "abbonamenti_cliente_id_fkey";
    columns: ["cliente_id"];
    isOneToOne: false;
    referencedRelation: "clienti";
    referencedColumns: ["id"];
  },
];

export type Database = {
  public: {
    Tables: {
      preventivi: {
        Row: PreventiviRow;
        Insert: Partial<PreventiviRow>;
        Update: Partial<PreventiviRow>;
        Relationships: PreventiviRelationships;
      };
      rate_abbonamento: {
        Row: RateAbbonamentoRow;
        Insert: Partial<RateAbbonamentoRow>;
        Update: Partial<RateAbbonamentoRow>;
        Relationships: EmptyRelationships;
      };
      abbonamenti: {
        Row: AbbonamentiRow;
        Insert: Partial<AbbonamentiRow>;
        Update: Partial<AbbonamentiRow>;
        Relationships: AbbonamentiRelationships;
      };
      profili_fiscali: {
        Row: ProfiliFiscaliRow;
        Insert: Partial<ProfiliFiscaliRow>;
        Update: Partial<ProfiliFiscaliRow>;
        Relationships: EmptyRelationships;
      };
      notifiche: {
        Row: NotificheRow;
        Insert: Partial<NotificheRow>;
        Update: Partial<NotificheRow>;
        Relationships: EmptyRelationships;
      };
      clienti: {
        Row: ClientiRow;
        Insert: Partial<ClientiRow>;
        Update: Partial<ClientiRow>;
        Relationships: EmptyRelationships;
      };
      profiles: {
        Row: ProfilesRow;
        Insert: Partial<ProfilesRow>;
        Update: Partial<ProfilesRow>;
        Relationships: EmptyRelationships;
      };
      servizi: {
        Row: ServiziRow;
        Insert: Partial<ServiziRow>;
        Update: Partial<ServiziRow>;
        Relationships: EmptyRelationships;
      };
      metodi_pagamento: {
        Row: MetodiPagamentoRow;
        Insert: Partial<MetodiPagamentoRow>;
        Update: Partial<MetodiPagamentoRow>;
        Relationships: EmptyRelationships;
      };
      preventivo_invii: {
        Row: PreventivoInviiRow;
        Insert: Partial<PreventivoInviiRow>;
        Update: Partial<PreventivoInviiRow>;
        Relationships: EmptyRelationships;
      };
      preventivo_invii_eventi: {
        Row: PreventivoInviiEventiRow;
        Insert: Partial<PreventivoInviiEventiRow>;
        Update: Partial<PreventivoInviiEventiRow>;
        Relationships: EmptyRelationships;
      };
      trascrizioni: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: EmptyRelationships;
      };
      segnalazioni: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: EmptyRelationships;
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type PreventivoPagatoRow = Pick<Tables<"preventivi">, "id" | "importo_totale" | "cliente_id">;

export type RataIncassoRow = Pick<Tables<"rate_abbonamento">, "importo" | "acconto" | "stato">;

export type AbbonamentoPreventivoRow = Pick<Tables<"abbonamenti">, "preventivo_id">;

export type ProfiloFiscaleRow = Tables<"profili_fiscali">;

export type PreventivoPagamentoUpdate = Pick<TablesUpdate<"preventivi">, "pagato" | "data_pagamento">;
`;

fs.writeFileSync(target, content, "utf8");
console.log("Wrote", target);
