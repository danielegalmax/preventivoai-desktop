import { useEffect, useState } from "react";

export function useSelezione(ids: string[]) {
  const [selezionati, setSelezionati] = useState<string[]>([]);
  const idsKey = ids.join("\0");

  useEffect(() => {
    const validi = new Set(ids);
    setSelezionati((prev) => {
      const filtered = prev.filter((id) => validi.has(id));
      if (filtered.length === prev.length) return prev;
      return filtered;
    });
  }, [idsKey]);

  const selezioneAttiva = selezionati.length > 0;
  const tuttiSelezionati = ids.length > 0 && selezionati.length === ids.length;
  const parziale = selezionati.length > 0 && selezionati.length < ids.length;

  function toggle(id: string) {
    setSelezionati((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function annulla() {
    setSelezionati([]);
  }

  function toggleTutti() {
    if (tuttiSelezionati) setSelezionati([]);
    else setSelezionati([...ids]);
  }

  return {
    selezionati,
    selezioneAttiva,
    tuttiSelezionati,
    parziale,
    toggle,
    annulla,
    toggleTutti,
  };
}
