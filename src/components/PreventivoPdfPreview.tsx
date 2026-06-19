import { useState } from "react";
import PreviewPaginata from "./PreviewPaginata";
import PreviewEspansaModal from "./PreviewEspansaModal";

interface Props {
  html: string;
  loading: boolean;
  className?: string;
  fillHeight?: boolean;
}

export default function PreventivoPdfPreview({ html, loading, className = "", fillHeight }: Props) {
  const [espansa, setEspansa] = useState(false);

  return (
    <>
      <div
        className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm ${className}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-4 py-2">
          <p className="text-sm font-medium text-brand-navy">Anteprima PDF</p>
          {loading && <p className="text-xs text-brand-navy/50">Aggiornamento...</p>}
        </div>

        {html ? (
          <PreviewPaginata
            htmlContent={html}
            onEspandi={() => setEspansa(true)}
            className={fillHeight ? "min-h-0" : "min-h-[420px] lg:min-h-[480px]"}
          />
        ) : (
          <div
            className={`flex flex-1 items-center justify-center bg-brand-bg p-4 ${
              fillHeight ? "min-h-0" : "min-h-[420px] lg:min-h-0"
            }`}
          >
            <p className="text-sm text-brand-navy/50">
              {loading ? "Caricamento anteprima..." : "Nessuna anteprima"}
            </p>
          </div>
        )}
      </div>

      <PreviewEspansaModal html={html} open={espansa} onClose={() => setEspansa(false)} />
    </>
  );
}
