type NavSection =
  | "home"
  | "clienti"
  | "prodotti-digitali"
  | "storico"
  | "cestino"
  | "nuovo"
  | "impostazioni"
  | "profilo"
  | "app";

const SECTION_ROOTS: Record<NavSection, string> = {
  home: "/",
  clienti: "/clienti",
  "prodotti-digitali": "/prodotti-digitali",
  storico: "/storico",
  cestino: "/cestino",
  nuovo: "/nuovo",
  impostazioni: "/impostazioni",
  profilo: "/profilo",
  app: "/app",
};

export function pathToSection(pathname: string): NavSection | null {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/clienti")) return "clienti";
  if (pathname.startsWith("/prodotti-digitali")) return "prodotti-digitali";
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
