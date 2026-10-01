import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import staffApi from '../api/staffAxios'
import { useStaffAuth } from './StaffAuthContext'

// ---------------------------------------------------------------
// Contexto de contadores de trabajo del staff (badges de Logística).
// Alimenta el badge del sidebar, el número del hub y el total del
// dashboard. Consume GET /staff/badges (verifyStaffJWT).
//
// Reglas de diseño:
//  - Un fallo NO borra los conteos ya conocidos: el nav mostrando el
//    dato de hace 60 s es mejor que un nav vacío parpadeando. Solo se
//    registra `error` y se avisa por consola.
//  - Polling de 60 s, pausado con la pestaña oculta y con refresco
//    inmediato al volver (mismo patrón que MonitoreoAdmin.jsx).
//  - Nunca se superponen peticiones: cada `refrescar()` cancela la
//    anterior con su AbortController, así una respuesta vieja no puede
//    escribir conteos viejos encima de los nuevos.
//
// NOTA DE LINT: todo fetch se dispara desde un callback (microtask,
// timer o event listener), nunca directo en el cuerpo del efecto —
// eslint-plugin-react-hooks (React Compiler) marca cualquier setState
// síncrono dentro de un efecto (`react-hooks/set-state-in-effect`).
// Ver la sección "Lint" del AGENTS.md del frontend; mismo patrón que
// MonitoreoAdmin.jsx y ProductoDetalle.jsx.
// ---------------------------------------------------------------

const StaffBadgesContext = createContext(null)

const INTERVALO_MS = 60 * 1000

export function StaffBadgesProvider({ children }) {
  const { token } = useStaffAuth()
  const [conteos, setConteos] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [actualizadoEn, setActualizadoEn] = useState(null)

  // Refs, no estado: son banderas de control del ciclo de vida y las
  // necesita leer `refrescar`, que debe mantener identidad estable para
  // que los consumidores la puedan usar como dependencia de sus efectos.
  const vivoRef = useRef(false)      // ¿el provider sigue montado?
  const sesionRef = useRef(false)    // ¿hay sesión staff?
  const peticionRef = useRef(null)   // AbortController de la petición en vuelo

  // Pide los conteos. Devuelve una promesa para que quien la llame pueda
  // encadenar su propia recarga (p. ej. `recargarTodo` de useColaStaff).
  const refrescar = useCallback(() => {
    if (!vivoRef.current || !sesionRef.current) return Promise.resolve()

    // Cancelar la petición anterior: dos respuestas fuera de orden
    // escribirían conteos viejos encima de los nuevos.
    if (peticionRef.current) peticionRef.current.abort()
    const controller = new AbortController()
    peticionRef.current = controller

    return staffApi
      .get('/staff/badges', { signal: controller.signal })
      .then(({ data }) => {
        if (!vivoRef.current || controller.signal.aborted) return
        setConteos(data?.conteos || {})
        setActualizadoEn(data?.actualizado_en || null)
        setError('')
      })
      .catch((err) => {
        if (!vivoRef.current || err?.name === 'CanceledError') return
        // A propósito NO se toca `conteos`: el badge sigue con el último
        // dato conocido en vez de desaparecer.
        setError(err.response?.data?.error || 'No se pudieron actualizar los contadores')
        console.error('No se pudieron actualizar los contadores de staff:', err)
      })
      .finally(() => {
        if (peticionRef.current === controller) peticionRef.current = null
        if (vivoRef.current && !controller.signal.aborted) setCargando(false)
      })
  }, [])

  // El provider se desmonta una sola vez por montaje de la app, pero el
  // flag es lo que impide un setState después del desmontaje.
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

  // Polling. Sin sesión staff no se pide nada: /staff/badges exige el JWT
  // del personal y un 401 dispararía el redirect a /staff/login del
  // interceptor de staffAxios, echando de la tienda a un cliente normal.
  useEffect(() => {
    sesionRef.current = Boolean(token)
    if (!token) return undefined

    // Primera carga desde un microtask para que su setState cuente como
    // callback de un sistema externo y no como setState síncrono dentro
    // del efecto (mismo truco que ProductoDetalle.jsx).
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

  return (
    <StaffBadgesContext.Provider value={value}>
      {children}
    </StaffBadgesContext.Provider>
  )
}

export function useStaffBadges() {
  const ctx = useContext(StaffBadgesContext)
  if (!ctx) throw new Error('useStaffBadges debe usarse dentro de StaffBadgesProvider')
  return ctx
}
