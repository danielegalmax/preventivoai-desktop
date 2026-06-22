const KEY = "preventivoai-nuovo-ripresa-path";

export function salvaPercorsoRipresaNuovo(pathname: string) {
  if (!pathname.startsWith("/nuovo/")) return;
  localStorage.setItem(KEY, pathname);
}

export function getPercorsoRipresaNuovo(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw?.startsWith("/nuovo/")) return null;
    return raw;
  } catch {
    return null;
  }
}

export function resetPercorsoRipresaNuovo() {
  localStorage.removeItem(KEY);
}
