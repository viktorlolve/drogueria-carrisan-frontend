import { useState, useCallback, useEffect } from 'react'
import api from '../api/axios'

function convertirClaveVapid(claveBase64) {
  if (!claveBase64) return null
  const padding = '='.repeat((4 - (claveBase64.length % 4)) % 4)
  const base64 = (claveBase64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
const PUSH_ENABLED = !!VAPID_KEY

// iOS (Safari/Chrome) no expone la API de notificaciones fuera de un PWA
// instalado: `Notification` es un global NO declarado y `Notification?.x` lanza
// ReferenceError igual (el optional chaining no protege identificadores
// no declarados). Siempre se resuelve vía typeof para leer bajo el nombre.
const API_NOTIFICACIONES = typeof Notification !== 'undefined' ? Notification : null

if (!PUSH_ENABLED) {
  console.error('🚨  VITE_VAPID_PUBLIC_KEY no está definida. Las notificaciones push están deshabilitadas.')
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
        if (!cancelled) {
          setSuscrito(!!sub)
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
      if (!claveVapid) {
        setError('Error de configuración de notificaciones.')
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
