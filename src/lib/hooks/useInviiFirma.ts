import { useCallback, useEffect, useRef, useState } from "react";
import { caricaInviiFirma, type PreventivoInvio } from "../firma";
import { supabase } from "../supabase";

export type InviiFirmaPreventivoPatch = {
  id: string;
  stato: string;
  pdf_url?: string | null;
};

type Options = {
  onPreventivoChange?: (patch: InviiFirmaPreventivoPatch) => void;
};

export function useInviiFirma(preventivoIds: string[], options?: Options) {
  const [inviiFirma, setInviiFirma] = useState<Record<string, PreventivoInvio>>({});
  const idsKey = preventivoIds.join(",");
  const idsRef = useRef(preventivoIds);
  idsRef.current = preventivoIds;
  const onPreventivoChangeRef = useRef(options?.onPreventivoChange);
  onPreventivoChangeRef.current = options?.onPreventivoChange;

  const ricaricaInviiFirma = useCallback(async () => {
    const ids = idsRef.current;
    if (ids.length === 0) {
      setInviiFirma({});
      return;
    }
    setInviiFirma(await caricaInviiFirma(ids));
  }, []);

  const ricaricaRef = useRef(ricaricaInviiFirma);
  ricaricaRef.current = ricaricaInviiFirma;

  useEffect(() => {
    void ricaricaRef.current();
  }, [idsKey]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const channelName = `invii-firma-desktop-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "preventivo_invii",
            filter: `user_id=eq.${user.id}`,
          },
          () => { void ricaricaRef.current(); },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "preventivi",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as InviiFirmaPreventivoPatch;
            if (idsRef.current.includes(row.id)) {
              onPreventivoChangeRef.current?.(row);
            }
          },
        )
        .subscribe();
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") void ricaricaRef.current();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [idsKey]);

  return { inviiFirma, ricaricaInviiFirma };
}
