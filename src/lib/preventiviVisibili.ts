type SupabaseError = { message?: string } | null;

/** true se la migration deleted_at non è ancora stata applicata su Supabase */
export function erroreColonnaDeletedAt(error: SupabaseError) {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("deleted_at") ||
    msg.includes("deleted at") ||
    msg.includes("schema cache") ||
    (msg.includes("column") && msg.includes("does not exist"))
  );
}

/** Esegue la query con filtro cestino; se deleted_at manca, riprova senza filtro. */
export async function queryConFiltroCestino<T extends { data: unknown; error: SupabaseError }>(
  conFiltro: () => PromiseLike<T>,
  senzaFiltro: () => PromiseLike<T>,
): Promise<T> {
  const prima = await conFiltro();
  if (prima.error && erroreColonnaDeletedAt(prima.error)) {
    return senzaFiltro();
  }
  return prima;
}
