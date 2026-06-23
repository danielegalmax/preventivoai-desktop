import { supabase } from './supabase'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export async function trackEvento(
  evento: string,
  schermata?: string,
  dati?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch(`${BACKEND_URL}/api/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ evento, schermata, dati })
    })
  } catch {
    // fire-and-forget, ignora errori
  }
}
