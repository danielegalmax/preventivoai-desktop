import { Navigate, Outlet } from "react-router";
import { useAuth } from "../app/useAuth";

export default function RequireAuth() {
  const { loading, authenticated } = useAuth();

  if (loading) {
    return (
      <div className="theme-surface flex h-screen items-center justify-center bg-brand-bg text-brand-navy/60">
        Caricamento...
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
