import { useState, useCallback, useEffect } from 'react'
import api from '../api/axios'

// La clave llega del entorno y se pega a mano en el dashboard de Vercel. Un
// solo carácter fuera de lugar —el `\r` de un CRLF de Windows, unas comillas,
// espacios— hace fallar atob() con un DOMException críptico ("String contains
// an invalid character"). Peor todavía: si la clave está sucia,
// `claveDeSuscripcionCoincide` nunca coincide, entonces cada montaje desuscribe
// la suscripción buena e intenta rehacerla (y vuelve a fallar) — o sea que el
// usuario pierde el push que ya tenía funcionando, sin avisar. Por eso se
// sanea UNA vez acá y el resultado se usa en todos lados.
function sanitizarClaveVapid(clave) {
  if (!clave) return null
  const limpia = String(clave).replace(/[^A-Za-z0-9\-_=+/]/g, '')
  return limpia || null
}

// Clave VAPID pública, ya sin suciedad de entorno.
const VAPID_KEY = sanitizarClaveVapid(import.meta.env.VITE_VAPID_PUBLIC_KEY)
const PUSH_ENABLED = !!VAPID_KEY

function convertirClaveVapid(claveBase64) {
  if (!claveBase64) return null
  const padding = '='.repeat((4 - (claveBase64.length % 4)) % 4)
  const base64 = (claveBase64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

// La suscripción del navegador queda ATADA a la applicationServerKey con la que
// se creó. Si se rotan las claves VAPID, getSubscription() sigue devolviendo la
// suscripción vieja (la UI mostraría "activado") pero TODOS los envíos fallan con
// 410/403. Por eso no basta con mirar que exista: hay que comparar la clave.
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

// iOS (Safari/Chrome) no expone la API de notificaciones fuera de un PWA
// instalado: `Notification` es un global NO declarado y `Notification?.x` lanza
// ReferenceError igual (el optional chaining no protege identificadores
// no declarados). Siempre se resuelve vía typeof para leer bajo el nombre.
const API_NOTIFICACIONES = typeof Notification !== 'undefined' ? Notification : null

if (!PUSH_ENABLED) {
  console.error(
    '🚨  VITE_VAPID_PUBLIC_KEY no está definida o quedó vacía tras sanearla. Las notificaciones push están deshabilitadas.'
  )
}

function esperarServiceWorker(timeout = 5000) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Service Worker no se registró a tiempo')), timeout)
    ),
  ])
}

/**
 * Hook para gestionar notificaciones push (suscribir / desuscribir).
 * Detecta automáticamente el estado actual al montar.
 */
export function usePush() {
  const soportado = 'serviceWorker' in navigator && 'PushManager' in window && PUSH_ENABLED
  const [suscrito, setSuscrito] = useState(() => (soportado ? null : false))
  const [permiso, setPermiso] = useState(() => (soportado ? null : API_NOTIFICACIONES?.permission || 'default'))
  const [pidiendoPermiso, setPidiendoPermiso] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!soportado) return

    let cancelled = false

    async function detectarEstado() {
      try {
        const reg = await esperarServiceWorker(5000)
        const sub = await reg.pushManager.getSubscription()

        if (!sub) {
          if (!cancelled) {
            setSuscrito(false)
            setPermiso(API_NOTIFICACIONES?.permission || 'default')
          }
          return
        }

        // Clave VAPID rotada: la suscripción vieja está muerta pero sigue
        // pareciendo activa. Se rehace en silencio. NO se llama a
        // requestPermission() porque el permiso ya está concedido; si no lo
        // estuviera no se puede pedir desde un efecto (hace falta un gesto del
        // usuario), así que en ese caso solo se marca como no suscrito y se
        // deja que active el botón.
        if (!claveDeSuscripcionCoincide(sub)) {
          await sub.unsubscribe()

          if (API_NOTIFICACIONES?.permission === 'granted') {
            const claveVapid = convertirClaveVapid(VAPID_KEY)
            const nueva = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: claveVapid
            })
            await api.post('/push/subscribe', nueva.toJSON())
            if (!cancelled) {
              setSuscrito(true)
              setPermiso('granted')
            }
            return
          }

          if (!cancelled) {
            setSuscrito(false)
            setPermiso(API_NOTIFICACIONES?.permission || 'default')
          }
          return
        }

        if (!cancelled) {
          setSuscrito(true)
          setPermiso(API_NOTIFICACIONES?.permission || 'default')
        }
      } catch {
        if (!cancelled) {
          setSuscrito(false)
          setPermiso('default')
        }
      }
    }

    detectarEstado()
    return () => { cancelled = true }
  }, [soportado])

  const activar = useCallback(async () => {
    if (!soportado) {
      setError('Las notificaciones push no están disponibles en este navegador.')
      return
    }

    setPidiendoPermiso(true)
    setError('')

    try {
      const registro = await esperarServiceWorker(5000)
      const permisoActual = API_NOTIFICACIONES ? await API_NOTIFICACIONES.requestPermission() : 'denied'

      if (permisoActual !== 'granted') {
        setPermiso(permisoActual)
        setSuscrito(false)
        return
      }

      const claveVapid = convertirClaveVapid(VAPID_KEY)
      // Una clave pública VAPID válida decodifica a 65 bytes (P-256 sin
      // comprimir). Otra longitud es la clave equivocada —p. ej. la privada—
      // y el error del navegador sería críptico, así que lo decimos acá.
      if (!claveVapid || claveVapid.length !== 65) {
        setError('La clave VAPID pública no es válida. Revisá VITE_VAPID_PUBLIC_KEY en el deploy.')
        return
      }

      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: claveVapid,
      })

      await api.post('/push/subscribe', suscripcion.toJSON())
      setSuscrito(true)
      setPermiso('granted')
    } catch (err) {
      console.error('Error al activar notificaciones push:', err)
      const msg = err?.response?.data?.error
      if (msg) {
        setError(msg)
      } else if (err?.name === 'InvalidCharacterError') {
        // atob() rechazó la clave: quedó un carácter inválido pese al saneado.
        setError('La clave VAPID pública no es válida. Revisá VITE_VAPID_PUBLIC_KEY en el deploy.')
      } else if (err.message?.includes('Service Worker')) {
        setError('El service worker no está listo. Recargá la página e intentá de nuevo.')
      } else {
        setError('No se pudo activar las notificaciones. Recargá la página e intentá de nuevo.')
      }
      setSuscrito(false)
    } finally {
      setPidiendoPermiso(false)
    }
  }, [soportado])

  const desactivar = useCallback(async () => {
    setPidiendoPermiso(true)
    setError('')

    try {
      const registro = await esperarServiceWorker(5000)
      const sub = await registro.pushManager.getSubscription()

      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await api.delete('/push/subscribe', { data: { endpoint } })
      }

      setSuscrito(false)
    } catch (err) {
      console.error('Error al desactivar notificaciones push:', err)
      setError('No se pudo desactivar las notificaciones.')
    } finally {
      setPidiendoPermiso(false)
    }
  }, [])

  return { soportado, suscrito, permiso, pidiendoPermiso, error, activar, desactivar }
}
