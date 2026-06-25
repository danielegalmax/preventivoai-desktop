import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import ModalShell from "../ModalShell";
import {
  cropImageToBase64,
  displayAreaToNatural,
  loadImage,
  type CropRect,
} from "../../lib/cropImage";

type Props = {
  imageSrc: string;
  mimeType: string;
  onClose: () => void;
  onUseFull: () => void;
  onConfirmCrop: (base64: string) => void;
};

type DragMode = "move" | "resize" | null;

function clampRect(rect: CropRect, bounds: { width: number; height: number }): CropRect {
  const width = Math.min(Math.max(rect.width, 24), bounds.width);
  const height = Math.min(Math.max(rect.height, 24), bounds.height);
  const x = Math.min(Math.max(rect.x, 0), bounds.width - width);
  const y = Math.min(Math.max(rect.y, 0), bounds.height - height);
  return { x, y, width, height };
}

export default function LogoCropModal({ imageSrc, mimeType, onClose, onUseFull, onConfirmCrop }: Props) {
  const [step, setStep] = useState<"preview" | "crop">("preview");
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; rect: CropRect } | null>(null);
  const [applicando, setApplicando] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setStep("preview");
    setCropRect({ x: 0, y: 0, width: 0, height: 0 });
  }, [imageSrc]);

  function misuraImmagine() {
    const img = imageRef.current;
    if (!img) return;
    const maxW = Math.min(640, img.parentElement?.clientWidth || 640);
    const maxH = Math.min(window.innerHeight * 0.55, 480);
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    if (!width || !height) return;
    setDisplaySize({ width, height });
    setCropRect((prev) => {
      if (prev.width > 0 && prev.height > 0) return clampRect(prev, { width, height });
      const margin = Math.min(width, height) * 0.1;
      return clampRect(
        { x: margin, y: margin, width: width - margin * 2, height: height - margin * 2 },
        { width, height },
      );
    });
  }

  function avviaRitaglio() {
    misuraImmagine();
    setStep("crop");
  }

  function iniziaDrag(mode: DragMode, e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragMode(mode);
    setDragStart({ x: e.clientX, y: e.clientY, rect: cropRect });
  }

  useEffect(() => {
    if (!dragMode || !dragStart) return;

    function onMove(e: MouseEvent) {
      if (!dragStart) return;
      const start = dragStart;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      setCropRect(() => {
        if (dragMode === "move") {
          return clampRect(
            {
              x: start.rect.x + dx,
              y: start.rect.y + dy,
              width: start.rect.width,
              height: start.rect.height,
            },
            displaySize,
          );
        }
        return clampRect(
          {
            x: start.rect.x,
            y: start.rect.y,
            width: start.rect.width + dx,
            height: start.rect.height + dy,
          },
          displaySize,
        );
      });
    }

    function onUp() {
      setDragMode(null);
      setDragStart(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragMode, dragStart, displaySize]);

  async function applicaRitaglio() {
    const img = imageRef.current;
    if (!img || !displaySize.width || !displaySize.height) return;
    setApplicando(true);
    try {
      const loaded = await loadImage(imageSrc);
      const naturalArea = displayAreaToNatural(cropRect, displaySize, {
        width: loaded.naturalWidth,
        height: loaded.naturalHeight,
      });
      onConfirmCrop(cropImageToBase64(loaded, naturalArea, mimeType));
    } finally {
      setApplicando(false);
    }
  }

  return (
    <ModalShell
      title={step === "preview" ? "Anteprima logo" : "Ritaglia logo"}
      onClose={onClose}
      panelClassName="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg"
      contentClassName="mt-4 space-y-4"
    >
      <div className="flex justify-center rounded-xl border border-black/10 bg-brand-bg p-2">
        <div className="relative" style={{ width: displaySize.width || undefined, height: displaySize.height || undefined }}>
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Anteprima logo"
            className="block max-h-[60vh] max-w-full object-contain"
            style={
              displaySize.width > 0
                ? { width: displaySize.width, height: displaySize.height }
                : { maxHeight: "60vh", maxWidth: "100%" }
            }
            onLoad={misuraImmagine}
          />
          {step === "crop" && displaySize.width > 0 ? (
            <div
              className="absolute inset-0"
              style={{ width: displaySize.width, height: displaySize.height }}
            >
            <div
              className="absolute cursor-move border-2 border-brand-teal bg-brand-teal/10"
              style={{
                left: cropRect.x,
                top: cropRect.y,
                width: cropRect.width,
                height: cropRect.height,
              }}
              onMouseDown={(e) => iniziaDrag("move", e)}
            >
              <div
                className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded-sm bg-brand-teal"
                onMouseDown={(e) => iniziaDrag("resize", e)}
              />
            </div>
            </div>
          ) : null}
        </div>
      </div>

      {step === "preview" ? (
        <p className="text-center text-sm text-brand-navy/60">
          Vuoi usare l&apos;immagine intera o ritagliarla?
        </p>
      ) : (
        <p className="text-center text-sm text-brand-navy/60">
          Trascina il riquadro o l&apos;angolo per ritagliare come preferisci.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-brand-navy hover:bg-brand-bg"
        >
          Annulla
        </button>
        {step === "preview" ? (
          <>
            <button
              type="button"
              onClick={onUseFull}
              className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-brand-navy hover:bg-brand-bg"
            >
              Usa intera
            </button>
            <button
              type="button"
              onClick={avviaRitaglio}
              className="flex-1 rounded-xl bg-brand-navy py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90"
            >
              Ritaglia
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void applicaRitaglio()}
            disabled={applicando}
            className="flex-1 rounded-xl bg-brand-teal py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {applicando ? "Applicazione..." : "Applica ritaglio"}
          </button>
        )}
      </div>
    </ModalShell>
  );
}
