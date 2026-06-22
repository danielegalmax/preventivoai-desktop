import { useEffect, useState } from "react";
import { getInitialSession, onAuthStateChange } from "../lib/auth";
import { invalidaFatturatoClienteCache } from "../lib/incassi";
import { syncNativeNotificationSession } from "../lib/nativeNotificationSession";
import { richiediPermessoNotifiche } from "../lib/notifications";
import { supabase } from "../lib/supabase";

const NATIVE_SESSION_SYNC_INTERVAL_MS = 15 * 60 * 1000;

function deveSincronizzareSessioneNative(event: string) {
  return event === "INITIAL_SESSION"
    || event === "SIGNED_IN"
    || event === "TOKEN_REFRESHED"
    || event === "SIGNED_OUT"
    || event === "USER_UPDATED";
}

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    getInitialSession().then((session) => {
      const has = !!session;
      setAuthenticated(has);
      if (has) void richiediPermessoNotifiche();
      void syncNativeNotificationSession(session);
      setLoading(false);
    });

    return onAuthStateChange((session, event) => {
      setAuthenticated(!!session);
      if (event === "SIGNED_OUT") invalidaFatturatoClienteCache();
      if (deveSincronizzareSessioneNative(event)) {
        void syncNativeNotificationSession(session);
      }
    });
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    void richiediPermessoNotifiche();

    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) void syncNativeNotificationSession(session);
    }, NATIVE_SESSION_SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [authenticated]);

  return { loading, authenticated };
}
