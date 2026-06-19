import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { hasCompletedProfile } from "../lib/onboarding";

export default function RequireProfile() {
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    void hasCompletedProfile().then((ok) => {
      setComplete(ok);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="theme-surface flex h-screen items-center justify-center bg-brand-bg text-brand-navy/60">
        Caricamento...
      </div>
    );
  }

  if (!complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
