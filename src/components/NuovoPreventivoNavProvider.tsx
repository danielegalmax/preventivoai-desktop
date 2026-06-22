import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router";
import BozzaInSospesoDialog from "./BozzaInSospesoDialog";
import type { BozzaNuovoInfo } from "../lib/nuovoDraft";
import {
  bozzaNuovoDaIntercettare,
  messaggioBozzaInSospeso,
  percorsoNuovoPreventivo,
  percorsoNuovoPreventivoVuoto,
  percorsoRipresaBozza,
} from "../lib/nuovoNav";

type NavigaNuovoOpts = {
  clienteId?: string;
};

type PendingNav = NavigaNuovoOpts & {
  bozza: BozzaNuovoInfo;
};

const NuovoPreventivoNavContext = createContext<(opts?: NavigaNuovoOpts) => void>(() => {});

export function useNavigaNuovoPreventivo() {
  return useContext(NuovoPreventivoNavContext);
}

export function NuovoPreventivoNavProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState<PendingNav | null>(null);

  const navigaNuovoPreventivo = useCallback(
    (opts?: NavigaNuovoOpts) => {
      const bozza = bozzaNuovoDaIntercettare(location.pathname);
      if (bozza) {
        setPending({ bozza, clienteId: opts?.clienteId });
        return;
      }
      navigate(percorsoNuovoPreventivo());
    },
    [location.pathname, navigate],
  );

  const handleRiprendi = useCallback(() => {
    if (!pending) return;
    const target = percorsoRipresaBozza(pending.bozza);
    setPending(null);
    navigate(target);
  }, [navigate, pending]);

  const handleIniziaNuovo = useCallback(() => {
    if (!pending) return;
    const target = percorsoNuovoPreventivoVuoto(pending.clienteId);
    setPending(null);
    navigate(target);
  }, [navigate, pending]);

  const value = useMemo(() => navigaNuovoPreventivo, [navigaNuovoPreventivo]);

  return (
    <NuovoPreventivoNavContext.Provider value={value}>
      {children}
      {pending ? (
        <BozzaInSospesoDialog
          message={messaggioBozzaInSospeso(pending.bozza)}
          onRiprendi={handleRiprendi}
          onIniziaNuovo={handleIniziaNuovo}
          onDismiss={() => setPending(null)}
        />
      ) : null}
    </NuovoPreventivoNavContext.Provider>
  );
}
