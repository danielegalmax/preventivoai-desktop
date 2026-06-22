type ThemeMode = "light" | "dark";

const STORAGE_KEY = "preventivoai-theme";

export function getThemeMode(): ThemeMode {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "dark") return "dark";
  if (raw === "light") return "light";
  return "light";
}

export function isDarkMode(): boolean {
  return getThemeMode() === "dark";
}

export function setThemeMode(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  applyThemeMode(mode);
}

export function setDarkMode(enabled: boolean) {
  setThemeMode(enabled ? "dark" : "light");
}

export function applyThemeMode(mode: ThemeMode = getThemeMode()) {
  document.documentElement.dataset.theme = mode;
}
