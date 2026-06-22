import { useEffect } from "react";
import { useLocation } from "react-router";
import { resetPercorsoRipresaNuovo, salvaPercorsoRipresaNuovo } from "../lib/nuovoRipresaPath";

export default function NuovoRipresaPathTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    const inSezioneNuovo = pathname === "/nuovo" || pathname.startsWith("/nuovo/");
    if (pathname.startsWith("/nuovo/")) {
      salvaPercorsoRipresaNuovo(pathname);
    } else if (!inSezioneNuovo) {
      resetPercorsoRipresaNuovo();
    }
  }, [pathname]);

  return null;
}
