import { useCallback, useEffect, useRef, useState } from 'react'
import staffApi from '../api/staffAxios'

// ---------------------------------------------------------------
// Push del personal interno (staff) — espejo de `usePush.js` (cliente)
// pero sobre `staffApi` y los endpoints `/staff/push/*`.
//
// DIFERENCIA IMPORTANTE con el hook del cliente: la suscripción del
// navegador es UNA SOLA por service worker, y la PWA es única
// (decisión del 2026-09-28: un solo manifest, un solo sw). O sea que
// un mismo dispositivo puede tener sesión de cliente Y de staff sobre
// la MISMA fila de `push_subscriptions` (endpoint UNIQUE, columnas
// `user_id` + `staff_id`). Por eso:
//
//   - `activar()`   = permiso + suscripción del navegador (compartida) +
//                     POST /staff/push/subscribe (asocia el endpoint al
//                     staff) + preferencia `push_activo = true`.
//   - `desactivar()`= SOLO escribe `push_activo = false`. NO hace
//                     `subscription.unsubscribe()`: eso mataría también las
//                     notificaciones de la sesión de cliente del mismo
//                     dispositivo. El mute es del staff (servidor), no del
//                     dispositivo; volver a activar es instantáneo.
//
// La comparación de `applicationServerKey` es la misma del hook cliente:
// si se rotaron las claves VAPID, la suscripción vieja parece activa pero
// todos los envíos fallan con 410/403, así que se rehace en silencio.
// ---------------------------------------------------------------

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
const PUSH_ENABLED = !!VAPID_KEY

// iOS (Safari/Chrome) no expone `Notification` fuera de un PWA instalado:
// leer el global por nombre sin `typeof` lanzaría ReferenceError.
const API_NOTIFICACIONES = typeof Notification !== 'undefined' ? Notification : null

function convertirClaveVapid(claveBase64) {
  if (!claveBase64) return null
  const padding = '='.repeat((4 - (claveBase64.length % 4)) % 4)
  const base64 = (claveBase64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

function claveDeSuscripcionCoincide(suscripcion) {
  const key = suscripcion?.options?.applicationServerKey
  if (!key) return false // sin clave guardada no se puede saber -> re-suscribir
  const bytes = new Uint8Array(key)
  let binario = ''
  for (const byte of bytes) binario += String.fromCharCode(byte)
  const base64url = window
    .btoa(binario)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return base64url === VAPID_KEY
}

function esperarServiceWorker(timeout = 5000) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Service Worker no se registró a tiempo')), timeout)
    ),
  ])
}

export function usePushStaff() {
  const soportado = 'serviceWorker' in navigator && 'PushManager' in window && PUSH_ENABLED

  const [suscrito, setSuscrito] = useState(() => (soportado ? null : false))
  const [permiso, setPermiso] = useState(() =>
    soportado ? API_NOTIFICACIONES?.permission || 'default' : 'unsupported'
  )
  const [preferenciaActiva, setPreferenciaActiva] = useState(true)
  const [pidiendoPermiso, setPidiendoPermiso] = useState(false)
  const [error, setError] = useState('')

  // Refs: banderas del ciclo de vida y de la petición en vuelo. No son
  // estado (no se pintan) y evitan setState tras desmontar / respuestas
  // fuera de orden. Mismo patrón que `StaffBadgesContext.jsx`.
  const vivoRef = useRef(false)
  const peticionRef = useRef(null)

  useEffect(() => {
    vivoRef.current = true
    return () => {
      vivoRef.current = false
      if (peticionRef.current) peticionRef.current.abort()
    }
  }, [])

  // Preferencia del servidor (`staff.push_activo`, default true).
  const leerPreferencia = useCallback(() => {
    if (peticionRef.current) peticionRef.current.abort()
    const controller = new AbortController()
    peticionRef.current = controller
    return staffApi
      .get('/staff/push/preferencias', { signal: controller.signal })
      .then(({ data }) => {
        if (!vivoRef.current || controller.signal.aborted) return
        if (typeof data?.push_activo === 'boolean') setPreferenciaActiva(data.push_activo)
      })
      .catch(() => {
        // La preferencia es un extra: si no se puede leer se queda el
        // default (true) en vez de romper la página.
      })
      .finally(() => {
        if (peticionRef.current === controller) peticionRef.current = null
      })
  }, [])

  // Crea la suscripción del navegador con la clave VAPID vigente.
  const suscribirNavegador = useCallback(
    () =>
      esperarServiceWorker(5000).then((reg) =>
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertirClaveVapid(VAPID_KEY),
        })
      ),
    []
  )

  // Estado del dispositivo + preferencia al montar.
  useEffect(() => {
    if (!vivoRef.current) return undefined

    leerPreferencia()

    // Si el navegador no soporta push, `suscrito` ya nació en `false`
    // (inicializador del useState): NO hace falta setState aquí, y un
    // setState síncrono en un efecto lo marca react-hooks/set-state-in-effect.
    if (!soportado) return undefined

    let cancelado = false
    esperarServiceWorker(5000)
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (!sub) {
          if (!cancelado) setSuscrito(false)
          return
        }
        if (claveDeSuscripcionCoincide(sub)) {
          if (!cancelado) setSuscrito(true)
          return
        }
        // Clave VAPID rotada: la suscripción vieja está muerta. Se rehace
        // solo si el permiso ya estaba concedido (no se puede pedir
        // permiso desde un efecto: hace falta un gesto del usuario).
        await sub.unsubscribe()
        if (API_NOTIFICACIONES?.permission === 'granted') {
          const nueva = await suscribirNavegador()
          await staffApi.post('/staff/push/subscribe', nueva.toJSON())
          if (!cancelado) setSuscrito(true)
          return
        }
        if (!cancelado) setSuscrito(false)
      })
      .catch(() => {
        if (!cancelado) setSuscrito(false)
      })

    return () => {
      cancelado = true
    }
  }, [soportado, leerPreferencia, suscribirNavegador])

  const activar = useCallback(async () => {
    if (!soportado) {
      setError('Las notificaciones push no están disponibles en este navegador.')
      return
    }

    setPidiendoPermiso(true)
    setError('')

    try {
      const permisoActual = API_NOTIFICACIONES
        ? await API_NOTIFICACIONES.requestPermission()
        : 'denied'

      if (permisoActual !== 'granted') {
        setPermiso(permisoActual)
        setSuscrito(false)
        setError('El navegador no concedió el permiso de notificaciones.')
        return
      }

      const claveVapid = convertirClaveVapid(VAPID_KEY)
      if (!claveVapid) {
        setError('Error de configuración de notificaciones.')
        return
      }

      // Se reutiliza la suscripción existente si su clave sigue siendo la
      // buena: no hay que volver a pedirla al navegador.
      let suscripcion = await esperarServiceWorker(5000).then((reg) =>
        reg.pushManager.getSubscription()
      )
      if (!suscripcion || !claveDeSuscripcionCoincide(suscripcion)) {
        if (suscripcion) await suscripcion.unsubscribe()
        suscripcion = await suscribirNavegador()
      }

      // Asocia el endpoint al staff. El upsert del backend NO toca
      // `user_id`, así que la suscripción de cliente del mismo
      // dispositivo sobrevive.
      await staffApi.post('/staff/push/subscribe', suscripcion.toJSON())
      await staffApi.patch('/staff/push/preferencias', { push_activo: true })

      setSuscrito(true)
      setPermiso('granted')
      setPreferenciaActiva(true)
    } catch (err) {
      console.error('Error al activar notificaciones push del staff:', err)
      const msg = err?.response?.data?.error
      if (msg) {
        setError(msg)
      } else if (err.message?.includes('Service Worker')) {
        setError('El service worker no está listo. Recargá la página e intentá de nuevo.')
      } else {
        setError('No se pudo activar las notificaciones. Recargá la página e intentá de nuevo.')
      }
      setSuscrito(false)
    } finally {
      setPidiendoPermiso(false)
    }
  }, [soportado, suscribirNavegador])

  const desactivar = useCallback(async () => {
    setPidiendoPermiso(true)
    setError('')
    try {
      // Mute del staff, NO unsubscribe del navegador (ver cabecera del archivo).
      await staffApi.patch('/staff/push/preferencias', { push_activo: false })
      setPreferenciaActiva(false)
    } catch (err) {
      console.error('Error al desactivar notificaciones push del staff:', err)
      setError('No se pudo desactivar las notificaciones.')
    } finally {
      setPidiendoPermiso(false)
    }
  }, [])

  return {
    soportado,
    suscrito,
    permiso,
    preferenciaActiva,
    pidiendoPermiso,
    error,
    activar,
    desactivar,
    refrescarPreferencia: leerPreferencia,
  }
}

export default usePushStaff