const STORAGE_KEY = "preventivoai-nav-memory";

export type NavSection =
  | "home"
  | "clienti"
  | "storico"
  | "cestino"
  | "nuovo"
  | "impostazioni"
  | "profilo"
  | "app";

const SECTION_ROOTS: Record<NavSection, string> = {
  home: "/",
  clienti: "/clienti",
  storico: "/storico",
  cestino: "/cestino",
  nuovo: "/nuovo",
  impostazioni: "/impostazioni",
  profilo: "/profilo",
  app: "/app",
};

function defaultMemory(): Record<NavSection, string> {
  return { ...SECTION_ROOTS };
}

function loadMemory(): Record<NavSection, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultMemory();
    const parsed = JSON.parse(raw) as Partial<Record<NavSection, string>>;
    return { ...defaultMemory(), ...parsed };
  } catch {
    return defaultMemory();
  }
}

function saveMemory(memory: Record<NavSection, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

export function pathToSection(pathname: string): NavSection | null {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/clienti")) return "clienti";
  if (pathname.startsWith("/storico")) return "storico";
  if (pathname.startsWith("/cestino")) return "cestino";
  if (pathname.startsWith("/nuovo")) return "nuovo";
  if (pathname.startsWith("/impostazioni")) return "impostazioni";
  if (pathname.startsWith("/profilo")) return "profilo";
  if (pathname.startsWith("/app")) return "app";
  return null;
}

export function linkToSection(linkTo: string): NavSection | null {
  return pathToSection(linkTo);
}

export function getSectionRoot(section: NavSection): string {
  return SECTION_ROOTS[section];
}

export function getRememberedPath(section: NavSection): string {
  return loadMemory()[section];
}

export function setRememberedPath(section: NavSection, path: string) {
  const memory = loadMemory();
  memory[section] = path;
  saveMemory(memory);
}

export function resetRememberedPath(section: NavSection) {
  setRememberedPath(section, SECTION_ROOTS[section]);
}

export function rememberPath(pathname: string) {
  const section = pathToSection(pathname);
  if (!section) return;
  const memory = loadMemory();
  memory[section] = pathname;
  saveMemory(memory);
}

export function resolveSidebarTarget(
  section: NavSection,
  currentPathname: string,
): string {
  if (pathToSection(currentPathname) === section) {
    return currentPathname;
  }

  const remembered = loadMemory()[section];
  if (remembered && pathToSection(remembered) === section) {
    return remembered;
  }

  return getSectionRoot(section);
}
