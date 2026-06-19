import { useCallback, useEffect, useRef, useState } from "react";
import {
  dimensioniPaginaPreview,
  htmlPerPaginaPreview,
  type PageBreakMessage,
} from "../lib/pdfPreviewPaginata";

type Props = {
  htmlContent: string;
  className?: string;
  variant?: "inline" | "expanded";
  enableKeyboard?: boolean;
  onEspandi?: () => void;
};

type FrameSize = {
  larghezza: number;
  altezza: number;
  scale: number;
};

const FRAME_VUOTO: FrameSize = { larghezza: 0, altezza: 0, scale: 1 };

function IconEspandi() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

function BarraPaginazione({
  paginaAttiva,
  totalPages,
  onVai,
}: {
  paginaAttiva: number;
  totalPages: number;
  onVai: (index: number) => void;
}) {
  const pagine = Array.from({ length: Math.max(totalPages, 1) }, (_, i) => i);

  return (
    <div className="flex shrink-0 items-center justify-center gap-4 border-t border-black/5 px-4 py-3">
      <button
        type="button"
        disabled={paginaAttiva === 0}
        onClick={() => onVai(paginaAttiva - 1)}
        className="rounded-lg border border-black/10 px-3 py-1.5 text-sm text-brand-navy/70 hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Pagina precedente"
      >
        ←
      </button>

      <div className="flex items-center gap-2">
        {pagine.map((pageIndex) => (
          <button
            key={pageIndex}
            type="button"
            onClick={() => onVai(pageIndex)}
            aria-label={`Pagina ${pageIndex + 1}`}
            aria-current={pageIndex === paginaAttiva ? "true" : undefined}
            className={`h-2 rounded-full transition-all ${
              pageIndex === paginaAttiva ? "w-5 bg-brand-teal" : "w-2 bg-black/15 hover:bg-black/25"
            }`}
          />
        ))}
      </div>

      <span className="min-w-[5.5rem] text-center text-xs text-brand-navy/50">
        {paginaAttiva + 1} / {totalPages}
      </span>

      <button
        type="button"
        disabled={paginaAttiva >= totalPages - 1}
        onClick={() => onVai(paginaAttiva + 1)}
        className="rounded-lg border border-black/10 px-3 py-1.5 text-sm text-brand-navy/70 hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Pagina successiva"
      >
        →
      </button>
    </div>
  );
}

export default function PreviewPaginata({
  htmlContent,
  className = "",
  variant = "inline",
  enableKeyboard = false,
  onEspandi,
}: Props) {
  const expanded = variant === "expanded";
  const viewportRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<FrameSize>(FRAME_VUOTO);
  const [totalPages, setTotalPages] = useState(1);
  const [paginaAttiva, setPaginaAttiva] = useState(0);

  const misuraViewport = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const pad = expanded ? 24 : 16;
    const availW = Math.max(0, el.clientWidth - pad * 2);
    const availH = Math.max(0, el.clientHeight - pad * 2);
    setFrame(dimensioniPaginaPreview(availW, availH));
  }, [expanded]);

  useEffect(() => {
    setTotalPages(1);
    setPaginaAttiva(0);
  }, [htmlContent]);

  useEffect(() => {
    misuraViewport();
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(misuraViewport);
    ro.observe(el);
    return () => ro.disconnect();
  }, [misuraViewport, totalPages]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (typeof event.data !== "string") return;
      try {
        const data = JSON.parse(event.data) as PageBreakMessage;
        if (data.type !== "page-breaks") return;
        setTotalPages(Math.max(1, Math.min(data.totalPages || 1, 20)));
      } catch {
        // ignora messaggi non JSON
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const vaiAPagina = useCallback(
    (index: number) => {
      const max = Math.max(totalPages, 1) - 1;
      setPaginaAttiva(Math.max(0, Math.min(index, max)));
    },
    [totalPages],
  );

  useEffect(() => {
    if (!enableKeyboard) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        vaiAPagina(paginaAttiva - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        vaiAPagina(paginaAttiva + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableKeyboard, paginaAttiva, vaiAPagina]);

  if (!htmlContent) return null;

  const { larghezza, altezza, scale } = frame;
  const mostraBarra = expanded || totalPages > 1;

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div
        ref={viewportRef}
        className={`flex min-h-0 flex-1 items-center justify-center overflow-hidden ${
          expanded ? "p-6" : "p-4"
        }`}
      >
        {larghezza > 0 && altezza > 0 ? (
          <div
            className="group relative shrink-0 overflow-hidden rounded-lg bg-white shadow-md"
            style={{ width: larghezza, height: altezza }}
          >
            <iframe
              key={`p-${paginaAttiva}-${htmlContent.length}-${variant}`}
              srcDoc={htmlPerPaginaPreview(htmlContent, paginaAttiva, scale)}
              title={`Anteprima preventivo pagina ${paginaAttiva + 1}`}
              className="block border-0"
              style={{ width: larghezza, height: altezza }}
              sandbox="allow-same-origin allow-scripts"
            />
            {onEspandi && (
              <button
                type="button"
                onClick={onEspandi}
                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-brand-navy/0 opacity-0 transition duration-200 group-hover:bg-black/30 group-hover:opacity-100 focus-visible:bg-black/30 focus-visible:opacity-100"
                aria-label="Espandi anteprima PDF"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-brand-navy shadow-lg">
                  <IconEspandi />
                </span>
              </button>
            )}
          </div>
        ) : null}
      </div>

      {mostraBarra && (
        <BarraPaginazione paginaAttiva={paginaAttiva} totalPages={totalPages} onVai={vaiAPagina} />
      )}
    </div>
  );
}
