import { useEffect } from "react";

export function useAnnullaSelezioneOnEscape(attivo: boolean, annulla: () => void) {
  useEffect(() => {
    if (!attivo) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      annulla();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [attivo, annulla]);
}
