import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import { useStaffAuth } from '../../context/StaffAuthContext'
import { getConfigTipo } from '../../utils/notificacionesCatalogo'
import { formatFecha } from '../../utils/notificacionesUI'
import { RUTA_BANDEJA_STAFF, urlDestinoStaff } from '../../utils/notificacionesStaffLinks'
import './StaffCampanaNotificaciones.css'

// ---------------------------------------------------------------
// Campana de notificaciones del personal interno.
//
// Es la pieza "siempre visible": el contador se refresca cada 60 s
// (pausado con la pestaña oculta) y el desplegable muestra las 5 más
// recientes. Al tocar una:
//   1. la marca leída (`PATCH /staff/notificaciones/:id`), y
//   2. navega al módulo donde hay que trabajar (`urlDestinoStaff`).
//
// Va en el header de `LayoutDepartamento` y en el de `StaffDashboard`
// (que es standalone, sin layout). Nunca se montan los dos a la vez.
//
// Patrón de polling: idéntico al de `StaffBadgesContext.jsx` —
// peticiones encadenadas con AbortController, sin superponer, y un
// fallo NO borra el contador conocido (mejor un badge con el dato de
// hace un minuto que un badge que parpadea).
// ---------------------------------------------------------------

const INTERVALO_MS = 60 * 1000
const MAX_PREVIAS = 5

export default function StaffCampanaNotificaciones() {
  const { token } = useStaffAuth()
  const navigate = useNavigate()

  const [noLeidas, setNoLeidas] = useState(0)
  const [previas, setPrevias] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [cargandoPrevias, setCargandoPrevias] = useState(false)

  const contRef = useRef(null)
  const prevRef = useRef(null)
  const cajaRef = useRef(null)
  const vivoRef = useRef(false)
  const sesionRef = useRef(false)

  useEffect(() => {
    vivoRef.current = true
    return () => {
      vivoRef.current = false
      if (contRef.current) contRef.current.abort()
      if (prevRef.current) prevRef.current.abort()
    }
  }, [])

  const refrescarContador = useCallback(() => {
    if (!vivoRef.current || !sesionRef.current) return Promise.resolve()

    if (contRef.current) contRef.current.abort()
    const controller = new AbortController()
    contRef.current = controller

    return staffApi
      .get('/staff/notificaciones/unread-count', { signal: controller.signal })
      .then(({ data }) => {
        if (!vivoRef.current || controller.signal.aborted) return
        setNoLeidas(data?.count || 0)
      })
      .catch(() => {
        // Silencioso a propósito: ver cabecera. El badge conserva el
        // último valor conocido.
      })
      .finally(() => {
        if (contRef.current === controller) contRef.current = null
      })
  }, [])

  const cargarPrevias = useCallback(() => {
    if (!vivoRef.current || !sesionRef.current) return Promise.resolve()

    if (prevRef.current) prevRef.current.abort()
    const controller = new AbortController()
    prevRef.current = controller

    return staffApi
      .get('/staff/notificaciones', {
        params: { limite: MAX_PREVIAS, solo_no_leidas: true },
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (!vivoRef.current || controller.signal.aborted) return
        setPrevias(data?.notificaciones || [])
      })
      .catch(() => {
        // Igual: no se vacía la lista previa.
      })
      .finally(() => {
        if (prevRef.current === controller) prevRef.current = null
        if (vivoRef.current && !controller.signal.aborted) setCargandoPrevias(false)
      })
  }, [])

  // Polling del contador. Sin sesión staff no se pide nada: un 401
  // dispararía el redirect a /staff/login del interceptor de staffAxios.
  useEffect(() => {
    sesionRef.current = Boolean(token)
    if (!token) return undefined

    let cancelado = false
    Promise.resolve().then(() => {
      if (!cancelado) refrescarContador()
    })

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refrescarContador()
    }, INTERVALO_MS)

    const alVolver = () => {
      if (document.visibilityState === 'visible') refrescarContador()
    }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      cancelado = true
      sesionRef.current = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', alVolver)
      if (contRef.current) {
        contRef.current.abort()
        contRef.current = null
      }
    }
  }, [token, refrescarContador])

  // Cerrar el desplegable: click fuera o Escape.
  useEffect(() => {
    if (!abierto) return undefined

    function alClickFuera(e) {
      if (cajaRef.current && !cajaRef.current.contains(e.target)) setAbierto(false)
    }
    function alEsc(e) {
      if (e.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('mousedown', alClickFuera)
    document.addEventListener('keydown', alEsc)
    return () => {
      document.removeEventListener('mousedown', alClickFuera)
      document.removeEventListener('keydown', alEsc)
    }
  }, [abierto])

  function alternar() {
    const siguiente = !abierto
    setAbierto(siguiente)
    if (siguiente) {
      setCargandoPrevias(true)
      cargarPrevias()
      refrescarContador()
    }
  }

  function abrirNotificacion(notif) {
    setAbierto(false)
    if (!notif.leida) {
      // El PATCH va con la sesión staff. Si falla, el contador se
      // recalcula al siguiente refresco.
      staffApi.patch(`/staff/notificaciones/${notif.id}`).catch(() => {})
      setNoLeidas((prev) => Math.max(0, prev - 1))
    }
    navigate(urlDestinoStaff(notif.tipo))
  }

  const badge = useMemo(() => (noLeidas > 9 ? '9+' : String(noLeidas)), [noLeidas])

  return (
    <div className="snc" ref={cajaRef}>
      <button
        type="button"
        className={`snc-btn ${abierto ? 'snc-btn--abierto' : ''}`}
        onClick={alternar}
        aria-label={noLeidas > 0 ? `Notificaciones (${noLeidas} sin leer)` : 'Notificaciones'}
        aria-expanded={abierto}
      >
        <Bell size={19} />
        {noLeidas > 0 && <span className="snc-badge">{badge}</span>}
      </button>

      {abierto && (
        <div className="snc-panel">
          <div className="snc-panel__header">
            <span>Notificaciones</span>
            {noLeidas > 0 && <span className="snc-panel__n">{noLeidas} sin leer</span>}
          </div>

          {cargandoPrevias && previas.length === 0 ? (
            <div className="snc-panel__cargando">Cargando…</div>
          ) : previas.length === 0 ? (
            <div className="snc-panel__vacio">
              <p>No tenés notificaciones sin leer.</p>
            </div>
          ) : (
            <ul className="snc-panel__lista">
              {previas.map((notif) => {
                const config = getConfigTipo(notif.tipo)
                const Icono = config.icono
                return (
                  <li key={notif.id}>
                    <button type="button" className="snc-item" onClick={() => abrirNotificacion(notif)}>
                      <span className={`snc-item__icon snc-item__icon--${config.color}`}>
                        <Icono size={14} />
                      </span>
                      <span className="snc-item__body">
                        <strong>{notif.titulo}</strong>
                        <span className="snc-item__fecha">{formatFecha(notif.created_at)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <button
            type="button"
            className="snc-panel__pie"
            onClick={() => {
              setAbierto(false)
              navigate(RUTA_BANDEJA_STAFF)
            }}
          >
            Ver todas
          </button>
        </div>
      )}
    </div>
  )
}