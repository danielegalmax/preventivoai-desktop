import { supabase } from "./supabase";

export type MessaggiClienteTemplates = {
  condividi_pdf: string;
  firma_invio: string;
  firma_reminder: string;
  oggetto_firma_invio: string;
  oggetto_firma_reminder: string;
};

export type TipoMessaggioCliente = keyof MessaggiClienteTemplates;

export const MESSAGGI_CLIENTE_DEFAULT: MessaggiClienteTemplates = {
  condividi_pdf:
    "{nome_azienda} ti invia il preventivo.\n\nCliente: {nome_cliente}\n\nTrovi il PDF in allegato. Buona lettura!",
  firma_invio:
    "{nome_azienda} ti ha inviato un preventivo da firmare.\n\nCliente: {nome_cliente}\n\nApri il link per leggere e firmare online:\n{url}\n{nota_stripe}\n\nIl link è valido 30 giorni.",
  firma_reminder:
    "{nome_azienda} — promemoria\n\nCiao {nome_cliente}, ti ricordo di firmare il preventivo qui:\n{url}\n{nota_stripe}\n\nGrazie!",
  oggetto_firma_invio: "Preventivo da firmare — {nome_cliente}",
  oggetto_firma_reminder: "Reminder — preventivo da firmare",
};

export const MESSAGGI_VARIABILI: Record<TipoMessaggioCliente, string[]> = {
  condividi_pdf: ["{nome_azienda}", "{nome_cliente}"],
  firma_invio: ["{nome_azienda}", "{nome_cliente}", "{url}", "{nota_stripe}"],
  firma_reminder: ["{nome_azienda}", "{nome_cliente}", "{url}", "{nota_stripe}"],
  oggetto_firma_invio: ["{nome_cliente}"],
  oggetto_firma_reminder: ["{nome_cliente}"],
};

export type ScenarioMessaggio = "condividi" | "firma" | "reminder";

export type MessaggioSegment =
  | { type: "text"; value: string }
  | { type: "var"; name: string };

export const SCENARI_MESSAGGIO: {
  id: ScenarioMessaggio;
  label: string;
  desc: string;
  campi: { key: TipoMessaggioCliente; label: string; multiline: boolean }[];
}[] = [
  {
    id: "condividi",
    label: "Condividi PDF",
    desc: "Testo inviato con il PDF (WhatsApp o email).",
    campi: [{ key: "condividi_pdf", label: "Messaggio", multiline: true }],
  },
  {
    id: "firma",
    label: "Link firma",
    desc: "Invio del link per firmare online.",
    campi: [
      { key: "firma_invio", label: "Messaggio", multiline: true },
      { key: "oggetto_firma_invio", label: "Oggetto email", multiline: false },
    ],
  },
  {
    id: "reminder",
    label: "Reminder",
    desc: "Promemoria se il cliente non ha ancora firmato.",
    campi: [
      { key: "firma_reminder", label: "Messaggio", multiline: true },
      { key: "oggetto_firma_reminder", label: "Oggetto email", multiline: false },
    ],
  },
];

export function parseMessaggioSegmenti(template: string, variabiliAmmesse: string[]): MessaggioSegment[] {
  const allowed = new Set(variabiliAmmesse.map((v) => v.replace(/^\{|\}$/g, "")));
  const segments: MessaggioSegment[] = [];
  const re = /\{(\w+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: template.slice(lastIndex, match.index) });
    }
    if (allowed.has(match[1])) {
      segments.push({ type: "var", name: match[1] });
    } else {
      segments.push({ type: "text", value: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < template.length) {
    segments.push({ type: "text", value: template.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", value: "" }];
}

export function serializzaMessaggioSegmenti(segments: MessaggioSegment[]): string {
  return segments.map((s) => (s.type === "text" ? s.value : `{${s.name}}`)).join("");
}

export function inserisciVariabileMessaggio(template: string, varName: string): string {
  const token = varName.startsWith("{") ? varName : `{${varName}}`;
  if (template.includes(token)) return template;
  return `${template}${token}`;
}

export function proteggiModificaMessaggio(
  precedente: string,
  nuovo: string,
  variabiliAmmesse: string[],
): string {
  for (const token of variabiliAmmesse) {
    if (precedente.includes(token) && !nuovo.includes(token)) return precedente;
    const name = token.slice(1, -1);
    if (precedente.includes(token) && nuovo.includes(`{${name}`) && !nuovo.includes(token)) {
      return precedente;
    }
  }

  const tokens = nuovo.match(/\{[^}]+\}/g) ?? [];
  for (const token of tokens) {
    if (!variabiliAmmesse.includes(token)) return precedente;
  }

  const open = (nuovo.match(/\{/g) ?? []).length;
  const close = (nuovo.match(/\}/g) ?? []).length;
  if (open !== close) return precedente;

  for (const token of variabiliAmmesse) {
    const name = token.slice(1, -1);
    if (nuovo.includes(`{${name}`) && !nuovo.includes(token)) return precedente;
  }

  return nuovo;
}

export const ANTEPRIMA_MESSAGGI = {
  nome_azienda: "La Tua Azienda",
  nome_cliente: "Mario Rossi",
  url: "https://preventivoai-web.vercel.app/p/esempio-token",
  nota_stripe: "Se previsto, puoi pagare online direttamente dalla stessa pagina.",
};

export function mergeMessaggiCliente(raw?: Partial<MessaggiClienteTemplates> | null): MessaggiClienteTemplates {
  return { ...MESSAGGI_CLIENTE_DEFAULT, ...(raw || {}) };
}

export function compilaMessaggio(template: string, vars: Record<string, string>): string {
  const compilato = template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
  return compilato.replace(/\n{3,}/g, "\n\n").trim();
}

export function anteprimaMessaggio(_tipo: TipoMessaggioCliente, template: string): string {
  return compilaMessaggio(template, {
    nome_azienda: ANTEPRIMA_MESSAGGI.nome_azienda,
    nome_cliente: ANTEPRIMA_MESSAGGI.nome_cliente,
    url: ANTEPRIMA_MESSAGGI.url,
    nota_stripe: ANTEPRIMA_MESSAGGI.nota_stripe,
  });
}

export function notaStripeTesto(haStripe?: boolean): string {
  return haStripe ? "Se previsto, puoi pagare online direttamente dalla stessa pagina." : "";
}

export function buildMessaggioCondividiPdf(
  nomeCliente: string,
  nomeAzienda?: string,
  templates?: Partial<MessaggiClienteTemplates>,
) {
  const t = mergeMessaggiCliente(templates);
  return compilaMessaggio(t.condividi_pdf, {
    nome_azienda: nomeAzienda || "Il tuo artigiano",
    nome_cliente: nomeCliente,
  });
}

export function buildMessaggioFirmaInvio(
  nomeCliente: string,
  url: string,
  nomeAzienda?: string,
  opts?: { haStripe?: boolean; templates?: Partial<MessaggiClienteTemplates> },
) {
  const t = mergeMessaggiCliente(opts?.templates);
  return compilaMessaggio(t.firma_invio, {
    nome_azienda: nomeAzienda || "Il tuo artigiano",
    nome_cliente: nomeCliente,
    url,
    nota_stripe: notaStripeTesto(opts?.haStripe),
  });
}

export function buildMessaggioFirmaReminder(
  nomeCliente: string,
  url: string,
  nomeAzienda?: string,
  opts?: { haStripe?: boolean; templates?: Partial<MessaggiClienteTemplates> },
) {
  const t = mergeMessaggiCliente(opts?.templates);
  return compilaMessaggio(t.firma_reminder, {
    nome_azienda: nomeAzienda || "Il tuo artigiano",
    nome_cliente: nomeCliente,
    url,
    nota_stripe: notaStripeTesto(opts?.haStripe),
  });
}

export function buildOggettoFirmaInvio(nomeCliente: string, templates?: Partial<MessaggiClienteTemplates>) {
  const t = mergeMessaggiCliente(templates);
  return compilaMessaggio(t.oggetto_firma_invio, { nome_cliente: nomeCliente });
}

export function buildOggettoFirmaReminder(templates?: Partial<MessaggiClienteTemplates>) {
  const t = mergeMessaggiCliente(templates);
  return t.oggetto_firma_reminder;
}

/** @deprecated usa buildMessaggioFirmaInvio */
export function testoInvioFirma(
  nomeCliente: string,
  url: string,
  nomeAzienda?: string,
  opts?: { haStripe?: boolean; templates?: Partial<MessaggiClienteTemplates> },
) {
  return buildMessaggioFirmaInvio(nomeCliente, url, nomeAzienda, opts);
}

let cacheMessaggi: MessaggiClienteTemplates | null = null;
let cacheUserId: string | null = null;

export async function caricaMessaggiCliente(force = false): Promise<MessaggiClienteTemplates> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...MESSAGGI_CLIENTE_DEFAULT };
  if (!force && cacheMessaggi && cacheUserId === user.id) return cacheMessaggi;

  const { data, error } = await supabase
    .from("profiles")
    .select("messaggi_cliente")
    .eq("id", user.id)
    .single();

  if (error) {
    cacheUserId = user.id;
    cacheMessaggi = { ...MESSAGGI_CLIENTE_DEFAULT };
    return cacheMessaggi;
  }

  cacheUserId = user.id;
  cacheMessaggi = mergeMessaggiCliente(data?.messaggi_cliente as Partial<MessaggiClienteTemplates> | null);
  return cacheMessaggi;
}

export function invalidaCacheMessaggiCliente() {
  cacheMessaggi = null;
  cacheUserId = null;
}

export async function salvaMessaggiCliente(messaggi: MessaggiClienteTemplates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Non autenticato"), user: null };

  const { error } = await supabase
    .from("profiles")
    .update({ messaggi_cliente: messaggi })
    .eq("id", user.id);

  if (!error) invalidaCacheMessaggiCliente();
  return { error, user };
}
