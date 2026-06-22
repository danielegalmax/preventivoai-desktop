import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useNavigaNuovoPreventivo } from "../components/NuovoPreventivoNavProvider";
import { supabase } from "../lib/supabase";
import { caricaHomeData, type HomeData, type HomeInsight } from "../lib/home";
import { eventBus } from "../lib/eventBus";
import { getSalutoOrario } from "../lib/greeting";
import { formatImporto, formatData, formatDataHomeHeader } from "../lib/format";
import { etichettaPianoCollegato } from "../lib/collegamentiPiano";
import PreventivoStatoBadge from "../components/PreventivoStatoBadge";
import PageContainer from "../components/PageContainer";

const INSIGHT_ACCENT: Record<HomeInsight["kind"], string> = {
  alert: "border-l-red-500",
  success: "border-l-emerald-500",
  info: "border-l-brand-teal",
  action: "border-l-amber-500",
};

const QUICK_ACTIONS = [
  { to: "/nuovo/chat", label: "Chat AI", sub: "Descrivi a testo", Icon: IconChat },
  { to: "/nuovo/registra", label: "Voce", sub: "Parla e trascrivi", Icon: IconMic },
  { to: "/nuovo/manuale", label: "Builder", sub: "Listino manuale", Icon: IconList },
  { to: "/clienti", label: "Clienti", sub: "Rubrica", Icon: IconUsers },
  { to: "/storico", label: "Storico", sub: "Tutti i PDF", Icon: IconArchive },
] as const;

function dataOggi() {
  return formatDataHomeHeader();
}

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-edge-faint bg-surface p-5">
      <div className="h-3 w-20 rounded bg-brand-navy/10" />
      <div className="mt-4 h-8 w-16 rounded bg-brand-navy/10" />
      <div className="mt-2 h-3 w-28 rounded bg-brand-navy/10" />
    </div>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HomeData | null>(null);
  const navigaNuovoPreventivo = useNavigaNuovoPreventivo();

  const carica = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setData(await caricaHomeData(user.id));
    setLoading(false);
  }, []);

  useEffect(() => {
    void carica();
  }, [carica]);

  useEffect(() => {
    const handler = () => { void carica(); };
    eventBus.on("aggiorna-home", handler);
    return () => { eventBus.off("aggiorna-home", handler); };
  }, [carica]);

  const saluto = getSalutoOrario();
  const nome = data?.nomeBreve || "Artigiano";
  const trendPositivo =
    data && data.preventiviMeseScorso > 0 && data.preventiviMese >= data.preventiviMeseScorso;

  return (
    <PageContainer
      wide
      className="flex h-full min-h-0 flex-col overflow-hidden !py-5 lg:!py-6"
    >
      {/* Hero */}
      <header className="flex shrink-0 items-end justify-between gap-4 border-b border-edge-faint pb-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-navy/40">
            {dataOggi()}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy lg:text-[1.75rem]">
            {saluto}, {nome} 👋
          </h1>
          <p className="mt-1 max-w-md text-sm text-brand-navy/50">
            Panoramica del tuo lavoro e degli ultimi preventivi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigaNuovoPreventivo()}
          className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-teal/30 transition hover:bg-brand-teal/90"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10">
            <IconPlus className="h-3.5 w-3.5" />
          </span>
          Nuovo preventivo
        </button>
      </header>

      {/* Stats */}
      <div className="mt-5 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-12">
        {loading ? (
          <>
            <div className="sm:col-span-3"><StatSkeleton /></div>
            <div className="sm:col-span-6"><StatSkeleton /></div>
            <div className="sm:col-span-3"><StatSkeleton /></div>
          </>
        ) : (
          <>
            <article className="rounded-2xl border border-edge-faint bg-surface p-5 shadow-sm sm:col-span-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-brand-navy/45">Questo mese</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                  <IconFile className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-brand-navy">
                {data?.preventiviMese ?? 0}
              </p>
              <p className="mt-1 text-xs text-brand-navy/45">preventivi creati</p>
              {data && data.preventiviMeseScorso > 0 ? (
                <p className={`mt-3 text-xs font-medium ${trendPositivo ? "text-brand-teal" : "text-brand-navy/40"}`}>
                  {trendPositivo ? "↑" : "↓"} {data.preventiviMeseScorso} mese scorso
                </p>
              ) : null}
            </article>

            <article className="relative overflow-hidden rounded-2xl bg-brand-navy p-5 shadow-lg shadow-brand-navy/20 sm:col-span-6">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-teal/20 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-white/50">Incassato totale</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-white lg:text-4xl">
                    {formatImporto(data?.incassatoTotale ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-white/45">Preventivi, rate e abbonamenti</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand-teal">
                  <IconWallet className="h-5 w-5" />
                </span>
              </div>
              {data && data.pipelineValore > 0 ? (
                <p className="relative mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                  {formatImporto(data.pipelineValore)} in attesa di risposta
                </p>
              ) : null}
            </article>

            <article className="rounded-2xl border border-edge-faint bg-surface p-5 shadow-sm sm:col-span-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-brand-navy/45">Tempo risparmiato</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-navy/5 text-brand-navy/60">
                  <IconSpark className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-brand-navy">
                {(data?.minutiRisparmiati ?? 0).toLocaleString("it-IT")}
              </p>
              <p className="mt-1 text-xs text-brand-navy/45">minuti stimati con l&apos;AI</p>
            </article>
          </>
        )}
      </div>

      {/* Quick actions */}
      <section className="mt-4 shrink-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-navy/35">
          Azioni rapide
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {QUICK_ACTIONS.map(({ to, label, sub, Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-3 rounded-xl border border-edge-faint bg-surface px-3 py-2.5 shadow-sm transition hover:border-brand-teal/25 hover:shadow-md hover:shadow-brand-teal/5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-bg text-brand-navy/55 transition group-hover:bg-brand-teal/10 group-hover:text-brand-teal">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-brand-navy">{label}</span>
                <span className="block truncate text-[11px] text-brand-navy/40">{sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Storico preventivi — pannello principale */}
      <section className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-edge-faint bg-surface shadow-sm">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-edge-faint px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                <IconFile className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-brand-navy">Storico preventivi</h2>
                {!loading && data ? (
                  <p className="text-xs text-brand-navy/45">
                    {data.preventiviTotali} totali
                    {data.ultimiPreventivi.length > 0
                      ? ` · ultimi ${Math.min(data.ultimiPreventivi.length, 5)} in evidenza`
                      : ""}
                  </p>
                ) : (
                  <p className="text-xs text-brand-navy/45">Caricamento...</p>
                )}
              </div>
            </div>
            <Link
              to="/storico"
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge-faint px-3 py-1.5 text-xs font-medium text-brand-navy/55 transition hover:border-brand-teal/30 hover:text-brand-teal"
            >
              Apri storico completo
              <IconArrow className="h-3 w-3" />
            </Link>
          </div>

          {!loading && data && data.insights.length > 0 ? (
            <div className="shrink-0 border-b border-edge-faint bg-brand-bg/50 px-5 py-3">
              <div className="flex flex-wrap gap-2">
                {data.insights.slice(0, 2).map((insight) => (
                  <div
                    key={insight.id}
                    className={`flex min-w-0 max-w-full flex-1 items-start gap-2 rounded-lg border border-edge-faint border-l-[3px] bg-surface px-3 py-2 sm:min-w-[240px] sm:flex-none ${INSIGHT_ACCENT[insight.kind]}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-brand-navy">{insight.title}</p>
                      {insight.link ? (
                        <Link
                          to={insight.link}
                          className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-teal hover:underline"
                        >
                          {insight.linkLabel || "Apri"}
                          <IconArrow className="h-2.5 w-2.5" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="min-h-0 flex-1 divide-y divide-edge-faint">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex animate-pulse items-center gap-4 px-5 py-3.5">
                  <div className="h-9 w-9 rounded-full bg-brand-navy/10" />
                  <div className="h-3 flex-1 rounded bg-brand-navy/10" />
                  <div className="hidden h-3 w-24 rounded bg-brand-navy/10 sm:block" />
                  <div className="hidden h-3 w-16 rounded bg-brand-navy/10 md:block" />
                  <div className="h-3 w-20 rounded bg-brand-navy/10" />
                </div>
              ))}
            </div>
          ) : !data || data.ultimiPreventivi.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-bg text-brand-navy/30">
                <IconFile className="h-7 w-7" />
              </span>
              <p className="mt-4 text-sm font-medium text-brand-navy">Nessun preventivo ancora</p>
              <p className="mt-1 max-w-sm text-xs text-brand-navy/45">
                I preventivi che crei compariranno qui, pronti da aprire o inviare al cliente.
              </p>
              <button
                type="button"
                onClick={() => navigaNuovoPreventivo()}
                className="mt-4 rounded-xl bg-brand-teal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
              >
                Crea il primo preventivo
              </button>
            </div>
          ) : (
            <>
              <div className="hidden shrink-0 grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] gap-4 border-b border-edge-faint bg-brand-bg/40 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-navy/35 sm:grid">
                <span>Preventivo</span>
                <span className="hidden sm:block">Cliente</span>
                <span className="hidden md:block">Data</span>
                <span className="text-right">Importo</span>
                <span className="text-right">Stato</span>
              </div>
              <ul className="min-h-0 flex-1 divide-y divide-edge-faint">
                {data.ultimiPreventivi.slice(0, 5).map((p) => {
                  const collegamento = data.collegamentiPiano[p.id];
                  const destinazione = p.cliente_id ? `/clienti/${p.cliente_id}` : "/storico";
                  const iniziale = (p.nome_cliente || "S").charAt(0).toUpperCase();
                  const titolo = p.titolo || p.nome_cliente || "Senza titolo";
                  return (
                    <li key={p.id} className="min-h-0 flex-1">
                      <Link
                        to={destinazione}
                        className="group grid h-full grid-cols-1 items-center gap-2 px-5 py-3 transition hover:bg-brand-bg/70 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] sm:gap-4 sm:py-3.5"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal/15 to-brand-teal/5 text-sm font-semibold text-brand-teal ring-1 ring-brand-teal/10">
                            {iniziale}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-brand-navy group-hover:text-brand-teal">
                              {titolo}
                            </span>
                            {collegamento ? (
                              <span className="mt-0.5 block truncate text-[11px] font-medium text-brand-teal/75">
                                {etichettaPianoCollegato(collegamento)}
                              </span>
                            ) : (
                              <span className="mt-0.5 block truncate text-xs text-brand-navy/40 sm:hidden">
                                {p.nome_cliente || "Senza cliente"} · {formatData(p.created_at)}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="hidden truncate text-sm text-brand-navy/60 sm:block">
                          {p.nome_cliente || "Senza cliente"}
                        </span>
                        <span className="hidden text-sm text-brand-navy/50 md:block">
                          {formatData(p.created_at)}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-brand-navy sm:text-right">
                          {formatImporto(p.importo_totale)}
                        </span>
                        <span className="flex sm:justify-end">
                          <PreventivoStatoBadge
                            stato={p.stato}
                            pagato={p.pagato}
                            pagamentoGestitoDalPiano={!!collegamento}
                          />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>
    </PageContainer>
  );
}

type IconProps = { className?: string };

function IconPlus({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconFile({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
      <path strokeLinecap="round" d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function IconWallet({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3Z" />
    </svg>
  );
}

function IconSpark({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Zm7 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
    </svg>
  );
}

function IconChat({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4-.8L3 21l1.8-4.2A8.8 8.8 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
    </svg>
  );
}

function IconMic({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm0 0v3m-4 0h8M8 21h8" />
    </svg>
  );
}

function IconList({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconUsers({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconArchive({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7M3 7h18M3 7l2-4h14l2 4M10 11h4" />
    </svg>
  );
}

function IconArrow({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
