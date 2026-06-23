import PageContainer from "../components/PageContainer";
import { WEB_PRODOTTI_URL } from "../lib/webUrls";

async function apriProdottiWeb() {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(WEB_PRODOTTI_URL);
  } catch {
    window.open(WEB_PRODOTTI_URL, "_blank", "noopener,noreferrer");
  }
}

export default function ProdottiDigitali() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-lg py-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-edge-faint bg-surface text-brand-teal shadow-sm">
          <IconPackage className="h-8 w-8" />
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          <h1 className="text-2xl font-semibold text-brand-navy">Prodotti digitali</h1>
          <span className="rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2DD4BF]">
            Beta
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-brand-navy/60">
          Dal web puoi creare uno store personale per guide, template e file scaricabili. Condividi il
          link con i clienti: pagano con carta e ricevono subito il download.
        </p>

        <ul className="mt-6 space-y-2 rounded-2xl border border-edge-faint bg-surface p-5 text-left text-sm text-brand-navy/80">
          <li>1. Crea il prodotto e imposta il prezzo</li>
          <li>2. Condividi il link del tuo store</li>
          <li>3. Incassa automaticamente con Stripe</li>
        </ul>

        <button
          type="button"
          onClick={() => void apriProdottiWeb()}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-teal px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-teal/25 transition hover:bg-brand-teal/90"
        >
          Vai a prodotti digitali sul web
          <IconExternal className="h-4 w-4" />
        </button>

        <p className="mt-4 text-xs text-brand-navy/45">
          Si apre preventivoai-web: accedi con le stesse credenziali dell&apos;app.
        </p>
      </div>
    </PageContainer>
  );
}

function IconPackage({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" strokeLinejoin="round" />
      <path d="M3 7.5V16.5L12 21l9-4.5V7.5" strokeLinejoin="round" />
      <path d="M12 12v9" strokeLinecap="round" />
    </svg>
  );
}

function IconExternal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M14 3h7v7M10 14 21 3M21 14v7h-7M10 10 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
