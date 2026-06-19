import { Link, useSearchParams } from "react-router";
import PageContainer from "../components/PageContainer";

function IconEdit3() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
      <path strokeLinecap="round" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path strokeLinecap="round" d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v3" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
      <path strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13" />
      <path strokeLinecap="round" d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" d="m9 18 6-6-6-6" />
    </svg>
  );
}

const opzioni = [
  {
    to: "/nuovo/chat",
    icon: <IconEdit3 />,
    titolo: "Scrivi in chat",
    descrizione: "Descrivi il lavoro a testo, l'assistente AI ti farà le domande giuste.",
  },
  {
    to: "/nuovo/registra",
    icon: <IconMic />,
    titolo: "Registra voce",
    descrizione: "Parla del lavoro, trascrivo e genero automaticamente.",
  },
  {
    to: "/nuovo/manuale",
    icon: <IconList />,
    titolo: "Builder manuale",
    descrizione: "Seleziona i servizi dal listino e assembla il preventivo voce per voce.",
  },
];

export default function NuovoHub() {
  const [searchParams] = useSearchParams();
  const clienteId = searchParams.get("cliente_id");
  const queryCliente = clienteId ? `?cliente_id=${clienteId}` : "";

  return (
    <PageContainer>
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center py-8">
        <div className="w-full max-w-lg text-center">
          <h1 className="text-2xl font-semibold text-brand-navy">Nuovo preventivo</h1>
          <p className="mt-2 text-sm text-brand-navy/60">Come vuoi iniziare?</p>
        </div>

        <div className="mt-8 w-full max-w-lg space-y-3">
          {opzioni.map((opzione) => (
            <Link
              key={opzione.to}
              to={`${opzione.to}${queryCliente}`}
              className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-colors hover:bg-brand-bg/60"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                {opzione.icon}
              </span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-brand-navy">{opzione.titolo}</p>
                <p className="mt-0.5 text-sm text-brand-navy/60">{opzione.descrizione}</p>
              </div>
              <span className="text-brand-navy/30">
                <IconChevronRight />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
