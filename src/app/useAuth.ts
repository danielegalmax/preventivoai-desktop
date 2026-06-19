import { useEffect, useState } from "react";
import { getInitialSession, onAuthStateChange } from "../lib/auth";

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    getInitialSession().then((has) => {
      setAuthenticated(has);
      setLoading(false);
    });
    return onAuthStateChange((has) => setAuthenticated(has));
  }, []);

  return { loading, authenticated };
}
