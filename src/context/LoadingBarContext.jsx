import { createContext, useContext, useState, useCallback, useRef } from 'react'

const LoadingBarContext = createContext(null)

// La barra permanece visible al menos este tiempo tras una navegación o el
// inicio de un request, para que siempre sea perceptible aunque la página
// (o la API) responda rápido.
const MIN_VISIBLE_MS = 500
// Retardo extra tras el último request antes de ocultar la barra.
const FINISH_DELAY_MS = 200

export function LoadingBarProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false)
  const pendingRef = useRef(0)
  const hideTimer = useRef(null)

  const maybeHide = useCallback(() => {
    if (pendingRef.current === 0) setIsLoading(false)
  }, [])

  // Mantiene la barra visible (o la enciende) al menos MIN_VISIBLE_MS.
  const ensanchar = useCallback(() => {
    clearTimeout(hideTimer.current)
    setIsLoading(true)
    hideTimer.current = setTimeout(maybeHide, MIN_VISIBLE_MS)
  }, [maybeHide])

  const start = useCallback(() => {
    pendingRef.current += 1
    ensanchar()
  }, [ensanchar])

  const finish = useCallback(() => {
    pendingRef.current = Math.max(0, pendingRef.current - 1)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(maybeHide, FINISH_DELAY_MS)
  }, [maybeHide])

  // Cada navegación enciende la barra aunque la página no haga requests:
  // es el aviso de "está cargando". Los requests en vuelo la extienden hasta
  // que la página termina de cargar.
  const notifyNavigation = useCallback(() => {
    ensanchar()
  }, [ensanchar])

  return (
    <LoadingBarContext.Provider value={{ start, finish, notifyNavigation, isLoading }}>
      {children}
    </LoadingBarContext.Provider>
  )
}

export function useLoadingBar() {
  const ctx = useContext(LoadingBarContext)
  if (!ctx) throw new Error('useLoadingBar debe usarse dentro de LoadingBarProvider')
  return ctx
}