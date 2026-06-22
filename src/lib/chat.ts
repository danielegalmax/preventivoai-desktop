import type { Messaggio } from "./types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export function normalizzaValuta(testo: string): string {
  return testo.replace(/EUR\s+/g, "€");
}

export async function inviaMessaggio(messages: Messaggio[], token: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages, cliente_id: "" }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.reply;
}

export async function convertiRecap(recap: string, token: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/converti-recap`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ recap }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return normalizzaValuta(data.preventivo);
}

export async function cercaCliente(nome: string, token: string): Promise<{ id: string; nome: string }[]> {
  const res = await fetch(`${BACKEND_URL}/api/cerca-cliente`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nome }),
  });
  const data = await res.json();
  return data.risultati || [];
}

export function estraiNomeCliente(reply: string): { reply: string; nomeCliente: string | null } {
  if (!reply.includes("CLIENTE:")) return { reply, nomeCliente: null };
  const match = reply.match(/CLIENTE:([^\n]+)/);
  if (!match) return { reply, nomeCliente: null };
  return {
    reply: reply.replace(/CLIENTE:[^\n]+\n?/, "").trim(),
    nomeCliente: match[1].trim(),
  };
}

export function applicaRispostaChat(reply: string, messaggiAttuali: Messaggio[]) {
  if (reply.includes("PREVENTIVO_PRONTO")) {
    const [pre, post] = reply.split("PREVENTIVO_PRONTO");
    return {
      messaggi: pre.trim() ? [...messaggiAttuali, { role: "assistant" as const, content: pre.trim() }] : messaggiAttuali,
      preventivo: normalizzaValuta(post.trim()),
      recap: "",
    };
  }
  if (reply.includes("RECAP_PRONTO")) {
    const [pre, post] = reply.split("RECAP_PRONTO");
    return {
      messaggi: pre.trim() ? [...messaggiAttuali, { role: "assistant" as const, content: pre.trim() }] : messaggiAttuali,
      preventivo: "",
      recap: post.trim(),
    };
  }
  return {
    messaggi: [...messaggiAttuali, { role: "assistant" as const, content: reply }],
    preventivo: "",
    recap: "",
  };
}
