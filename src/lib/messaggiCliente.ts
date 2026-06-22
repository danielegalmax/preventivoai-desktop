import { supabase } from "./supabase";
import {
  MESSAGGI_CLIENTE_DEFAULT,
  mergeMessaggiCliente,
  type MessaggiClienteTemplates,
} from "preventivoai-shared";

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

