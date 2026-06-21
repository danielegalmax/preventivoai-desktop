import { useEffect, useState } from "react";
import { getInitialSession, onAuthStateChange } from "../lib/auth";
import { syncNativeNotificationSession } from "../lib/nativeNotificationSession";
import { richiediPermessoNotifiche } from "../lib/notifications";

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

    return onAuthStateChange((session) => {
      setAuthenticated(!!session);
      void syncNativeNotificationSession(session);
    });
  }, []);

  useEffect(() => {
    if (authenticated) void richiediPermessoNotifiche();
  }, [authenticated]);

  return { loading, authenticated };
}
