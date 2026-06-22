import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  linkToSection,
  pathToSection,
  resolveSidebarTarget,
} from "../lib/navMemory";
import { useNavigaNuovoPreventivo } from "./NuovoPreventivoNavProvider";

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  emphasis?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const mainGroups: NavGroup[] = [
  {
    title: "Panoramica",
    items: [{ to: "/", label: "Home", icon: <IconHome /> }],
  },
  {
    title: "Lavoro",
    items: [
      { to: "/nuovo", label: "Nuovo preventivo", icon: <IconPlus />, emphasis: true },
      { to: "/storico", label: "Storico preventivi", icon: <IconFile /> },
      { to: "/clienti", label: "Clienti", icon: <IconUsers /> },
    ],
  },
];

const bottomGroups: NavGroup[] = [
  {
    title: "Configurazione",
    items: [{ to: "/impostazioni", label: "Impostazioni", icon: <IconSettings /> }],
  },
  {
    title: "Account",
    items: [
      { to: "/profilo", label: "Profilo", icon: <IconUser /> },
      { to: "/app", label: "App", icon: <IconMonitor /> },
    ],
  },
];

function NavLink({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate: (to: string) => void;
}) {
  const { to, label, icon, emphasis } = item;

  if (emphasis) {
    return (
      <a
        href={to}
        onClick={(e) => {
          e.preventDefault();
          onNavigate(to);
        }}
        className={`mt-1 mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
          isActive
            ? "bg-brand-teal text-white shadow-sm shadow-brand-teal/30"
            : "bg-brand-teal/90 text-white hover:bg-brand-teal"
        }`}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
        {label}
      </a>
    );
  }

  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(to);
      }}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-white/12 text-white"
          : "text-white/65 hover:bg-white/8 hover:text-white"
      }`}
    >
      {isActive && (
        <span className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-teal" />
      )}
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center ${
          isActive ? "text-brand-teal" : "text-white/50"
        }`}
      >
        {icon}
      </span>
      {label}
    </a>
  );
}

function NavSection({ group, currentSection, onNavigate }: {
  group: NavGroup;
  currentSection: ReturnType<typeof pathToSection>;
  onNavigate: (to: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold tracking-widest text-white/35 uppercase">
        {group.title}
      </p>
      {group.items.map((item) => {
        const section = linkToSection(item.to);
        const isActive = section !== null && currentSection === section;
        return (
          <NavLink key={item.to} item={item} isActive={isActive} onNavigate={onNavigate} />
        );
      })}
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigaNuovoPreventivo = useNavigaNuovoPreventivo();
  const currentSection = pathToSection(location.pathname);

  function handleNavigate(to: string) {
    const section = linkToSection(to);
    if (section === "nuovo") {
      navigaNuovoPreventivo();
      return;
    }
    if (!section) {
      navigate(to);
      return;
    }
    navigate(resolveSidebarTarget(section));
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-white/5 bg-brand-navy text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-base font-semibold tracking-tight">PreventivoAI</p>
        <p className="mt-0.5 text-xs text-white/45">Desktop</p>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {mainGroups.map((group) => (
          <NavSection
            key={group.title}
            group={group}
            currentSection={currentSection}
            onNavigate={handleNavigate}
          />
        ))}

        <div className="flex-1 min-h-4" />

        {bottomGroups.map((group) => (
          <NavSection
            key={group.title}
            group={group}
            currentSection={currentSection}
            onNavigate={handleNavigate}
          />
        ))}
      </nav>
    </aside>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h6l4 4v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path strokeLinecap="round" d="M14 3v4h4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path strokeLinecap="round" d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="8" r="3" />
      <path strokeLinecap="round" d="M20 19v-1a3 3 0 0 0-2-2.8" />
      <path strokeLinecap="round" d="M15 4.2a3 3 0 0 1 0 5.6" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" d="M5 20v-1a7 7 0 0 1 14 0v1" />
    </svg>
  );
}

function IconMonitor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path strokeLinecap="round" d="M8 20h8M12 16v4" />
    </svg>
  );
}
