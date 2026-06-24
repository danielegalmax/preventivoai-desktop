import { openUrl } from '@tauri-apps/plugin-opener'

type Props = {
  visibile: boolean
  versioneInstallata?: string
  versioneMinima?: string
}

export function AggiornamentoObbligatorioModal({
  visibile,
  versioneInstallata,
  versioneMinima,
}: Props) {
  if (!visibile) return null
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center
                    bg-brand-navy text-white p-8">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Aggiornamento richiesto
      </h1>
      <p className="text-center text-gray-300 leading-relaxed max-w-md">
        È disponibile un aggiornamento obbligatorio di PreventivoAI.<br /><br />
        Versione installata: <strong>{versioneInstallata ?? '—'}</strong><br />
        Versione richiesta: <strong>{versioneMinima ?? '—'}</strong><br /><br />
        L'app si aggiornerà automaticamente al prossimo avvio.
      </p>
      <button
        type="button"
        onClick={() => void openUrl('https://preventivoai-web.vercel.app/scarica')}
        style={{ marginTop: 16, color: '#0E9F8E', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}
      >
        Scarica l'ultima versione
      </button>
    </div>
  )
}
