import { useEffect } from "react";
import { useLocation } from "react-router";
import { salvaPercorsoRipresaNuovo } from "../lib/nuovoRipresaPath";

export default function NuovoRipresaPathTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    salvaPercorsoRipresaNuovo(pathname);
  }, [pathname]);

  return null;
}
