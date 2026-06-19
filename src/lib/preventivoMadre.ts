type PreventivoMadreLike = {
  titolo?: string | null;
  created_at?: string | null;
  versione?: number | null;
};

export function titoloPreventivoMadre(p: PreventivoMadreLike) {
  return p.titolo?.trim() || "Preventivo";
}

export function dataPreventivoMadre(p: PreventivoMadreLike) {
  const data = p.created_at
    ? new Date(p.created_at).toLocaleDateString("it-IT")
    : null;
  const versione = p.versione && p.versione > 1 ? ` · v${p.versione}` : "";
  return data ? `${data}${versione}` : null;
}

export function rimuoviDataDaNomePiano(nome: string) {
  return nome.replace(/\s·\s\d{1,2}\/\d{1,2}\/\d{4}(?:\s·\sv\d+)?$/, "").trim();
}

export function nomePianoBreveDaPreventivo(p: PreventivoMadreLike, tipo: "canone" | "rate") {
  const titolo = titoloPreventivoMadre(p);
  return tipo === "rate" ? `Rate · ${titolo}` : `Canone · ${titolo}`;
}

export function titoloHeaderPiano(
  nome: string | null | undefined,
  preventivo: PreventivoMadreLike | null | undefined,
  tipo: "canone" | "rate",
  fallback: string,
) {
  if (nome?.trim()) return rimuoviDataDaNomePiano(nome);
  if (preventivo) return nomePianoBreveDaPreventivo(preventivo, tipo);
  return fallback;
}

export function nomePianoDaPreventivo(p: PreventivoMadreLike, tipo: "canone" | "rate") {
  const titolo = titoloPreventivoMadre(p);
  const data = dataPreventivoMadre(p);
  const base = data ? `${titolo} · ${data}` : titolo;
  return tipo === "rate" ? `Rate · ${base}` : `Canone · ${base}`;
}
