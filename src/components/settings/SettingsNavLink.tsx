import { Link } from "react-router";
import type { ReactNode } from "react";

type Props = {
  to: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
};

export default function SettingsNavLink({ to, title, subtitle, icon }: Props) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm hover:bg-brand-bg/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-bg text-brand-navy/70">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-brand-navy">{title}</p>
        <p className="text-sm text-brand-navy/60">{subtitle}</p>
      </div>
      <span className="shrink-0 text-brand-navy/40">→</span>
    </Link>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconPercent() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
      <path strokeLinecap="round" d="m19 5-14 14" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path strokeLinecap="round" d="M2 10h20" />
    </svg>
  );
}

function IconMessage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path strokeLinecap="round" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  );
}

export const SETTINGS_NAV_ICONS = {
  servizi: <IconList />,
  fiscale: <IconPercent />,
  pagamenti: <IconCard />,
  messaggi: <IconMessage />,
};
