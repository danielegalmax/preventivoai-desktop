import { useCallback, useState } from "react";
import type { Preventivo } from "../types";
import { type ModificaPreventivoInput, modificaParamsFromPreventivo } from "./apriModificaPreventivo";

export function useModificaPreventivoScelta() {
  const [modificaInput, setModificaInput] = useState<ModificaPreventivoInput | null>(null);

  const apriDaPreventivo = useCallback((preventivo: Preventivo, versioneSorgente?: Preventivo) => {
    setModificaInput(modificaParamsFromPreventivo(preventivo, versioneSorgente));
  }, []);

  const chiudiSceltaModifica = useCallback(() => setModificaInput(null), []);

  return { modificaInput, apriDaPreventivo, chiudiSceltaModifica };
}
