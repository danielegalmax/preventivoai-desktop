import type { Notifica } from './notifiche'



type HomeEvent = 'aggiorna-home'

type NotificaApriPayload = { notifica: Notifica }



const homeListeners = new Set<() => void>()

const profiloListeners = new Set<() => void>()

const notificaListeners = new Set<(payload: NotificaApriPayload) => void>()



export const eventBus = {

  emit(event: HomeEvent) {

    if (event !== 'aggiorna-home') return

    homeListeners.forEach((handler) => handler())

  },

  on(event: HomeEvent, handler: () => void) {

    if (event !== 'aggiorna-home') return () => {}

    homeListeners.add(handler)

    return () => {

      homeListeners.delete(handler)

    }

  },

  off(event: HomeEvent, handler: () => void) {

    if (event !== 'aggiorna-home') return

    homeListeners.delete(handler)

  },

  emitApriNotifica(payload: NotificaApriPayload) {

    notificaListeners.forEach((handler) => handler(payload))

  },

  onApriNotifica(handler: (payload: NotificaApriPayload) => void) {

    notificaListeners.add(handler)

    return () => {

      notificaListeners.delete(handler)

    }

  },

}

export function emitAggiornaProfilo(): void {
  profiloListeners.forEach((handler) => handler())
}

export function onAggiornaProfilo(cb: () => void): () => void {
  profiloListeners.add(cb)
  return () => {
    profiloListeners.delete(cb)
  }
}

