import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { invalidaFatturatoClienteCache } from "./incassi";
import { supabase } from "./supabase";

export function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://preventivoai-web.vercel.app/reset-password",
  });
}

export function signOut() {
  invalidaFatturatoClienteCache();
  return supabase.auth.signOut();
}

export async function getInitialSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthStateChange(callback: (session: Session | null, event: AuthChangeEvent) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session, event);
  });
  return () => subscription.unsubscribe();
}
