import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/axios'
import { useAuth } from './AuthContext'

// ---------------------------------------------------------------
// Contadores del nav del cliente. Consume GET /nav/badges (verifyJWT).
//
// Reglas de diseño (las mismas que StaffBadgesContext):
//  - Un fallo NO borra los conteos ya conocidos: el badge con el dato
//    de hace 60 s es mejor que un nav que parpadea. Solo se registra
//    `error` y se avisa por consola.
//  - Polling de 60 s, pausado con la pestaña oculta y con refresco
//    inmediato al volver.
//  - Nunca se superponen peticiones: cada `refrescar()` cancela la
//    anterior con su AbortController, así una respuesta vieja no
//    puede escribir conteos viejos encima de los nuevos.
//
// NOTA DE LINT: todo fetch se dispara desde un callback (microtask,
// timer o event listener), nunca directo en el cuerpo del efecto —
// eslint-plugin-react-hooks marca cualquier setState síncrono dentro
// de un efecto (`react-hooks/set-state-in-effect`). Ver la sección
// "Lint" del AGENTS.md del frontend.
// ---------------------------------------------------------------

const NavBadgesContext = createContext(null)

const INTERVALO_MS = 60 * 1000

export function NavBadgesProvider({ children }) {
  const { token } = useAuth()
  const [conteos, setConteos] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [actualizadoEn, setActualizadoEn] = useState(null)

  // Refs, no estado: son banderas del ciclo de vida y las necesita leer
  // `refrescar`, que debe mantener identidad estable para que el
  // consumidor la pueda usar como dependencia de sus efectos.
  const vivoRef = useRef(false) // ¿el provider sigue montado?
  const sesionRef = useRef(false) // ¿hay sesión de cliente?
  const peticionRef = useRef(null) // AbortController de la petición en vuelo

  const refrescar = useCallback(() => {
    if (!vivoRef.current || !sesionRef.current) return Promise.resolve()

    if (peticionRef.current) peticionRef.current.abort()
    const controller = new AbortController()
    peticionRef.current = controller

    return api
      .get('/nav/badges', { signal: controller.signal })
      .then(({ data }) => {
        if (!vivoRef.current || controller.signal.aborted) return
        setConteos(data?.conteos || {})
        setActualizadoEn(data?.actualizado_en || null)
        setError('')
      })
      .catch((err) => {
        if (!vivoRef.current || err?.name === 'CanceledError') return
        // A propósito NO se toca `conteos`: el badge sigue con el
        // último dato conocido en vez de desaparecer.
        setError(err.response?.data?.error || 'No se pudieron actualizar los contadores')
        console.error('No se pudieron actualizar los contadores del nav:', err)
      })
      .finally(() => {
        if (peticionRef.current === controller) peticionRef.current = null
        if (vivoRef.current && !controller.signal.aborted) setCargando(false)
      })
  }, [])

  useEffect(() => {
    vivoRef.current = true
    return () => {
      vivoRef.current = false
      if (peticionRef.current) {
        peticionRef.current.abort()
        peticionRef.current = null
      }
    }
  }, [])

  // Sin sesión no se pide nada: /nav/badges exige el JWT del cliente y
  // un 401 dispararía el redirect a /login del interceptor de axios.
  useEffect(() => {
    sesionRef.current = Boolean(token)
    if (!token) return undefined

    // Primera carga desde un microtask: su setState cuenta como callback
    // de un sistema externo y no como setState síncrono dentro del efecto.
    let cancelado = false
    Promise.resolve().then(() => {
      if (!cancelado) refrescar()
    })

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refrescar()
    }, INTERVALO_MS)

    const alVolver = () => {
      if (document.visibilityState === 'visible') refrescar()
    }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      cancelado = true
      sesionRef.current = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', alVolver)
      if (peticionRef.current) {
        peticionRef.current.abort()
        peticionRef.current = null
      }
    }
  }, [token, refrescar])

  const value = useMemo(
    () => ({ conteos, cargando, error, actualizado_en: actualizadoEn, refrescar }),
    [conteos, cargando, error, actualizadoEn, refrescar]
  )

  return <NavBadgesContext.Provider value={value}>{children}</NavBadgesContext.Provider>
}

export function useNavBadges() {
  const ctx = useContext(NavBadgesContext)
  if (!ctx) throw new Error('useNavBadges debe usarse dentro de NavBadgesProvider')
  return ctx
}