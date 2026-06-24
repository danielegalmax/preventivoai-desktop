import { getVersion } from '@tauri-apps/api/app'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

type VersioneMinima = {
  android: string
  desktop: string
  ios: string
}

export type RisultatoVersioneMinima = {
  ok: boolean
  installata: string
  minima: string
}

function confrontaVersioni(installata: string, minima: string): boolean {
  const toNumeri = (v: string) => v.split('.').map(Number)
  const [iA, iB, iC] = toNumeri(installata)
  const [mA, mB, mC] = toNumeri(minima)
  if (iA !== mA) return iA > mA
  if (iB !== mB) return iB > mB
  return iC >= mC
}

export async function controllaVersioneMinima(): Promise<RisultatoVersioneMinima> {
  try {
    const risposta = await fetch(`${BACKEND_URL}/api/versione-minima`)
    const dati: VersioneMinima = await risposta.json()
    const versioneInstallata = await getVersion()
    const versioneMinima = dati.desktop
    return {
      ok: confrontaVersioni(versioneInstallata, versioneMinima),
      installata: versioneInstallata,
      minima: versioneMinima,
    }
  } catch {
    return { ok: true, installata: '', minima: '' }
  }
}
