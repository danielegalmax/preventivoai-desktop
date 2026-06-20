import { useEffect, useState } from "react";
import { getInitialSession, onAuthStateChange } from "../lib/auth";
import { richiediPermessoNotifiche } from "../lib/notifications";

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    getInitialSession().then((has) => {
      setAuthenticated(has);
      if (has) void richiediPermessoNotifiche();
      setLoading(false);
    });
    return onAuthStateChange((has) => setAuthenticated(has));
  }, []);

  useEffect(() => {
    if (authenticated) void richiediPermessoNotifiche();
  }, [authenticated]);

  return { loading, authenticated };
}
