import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Accordion,
  Badge,
  Text,
} from '@chakra-ui/react'
import { ChevronDown, Filter, CheckCheck, DollarSign, CheckCircle } from 'lucide-react'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_NOTIFICACIONES } from '../components/paginas-principales/NavNotificaciones'
import api from '../api/axios'
import { safeGetItem, safeSetItem } from '../utils/safeStorage'
import {
  CATEGORIAS,
  ORDEN_CATEGORIAS,
  DESCRIPCION_CATEGORIA,
  getCategoriaDeTipo,
} from '../utils/notificacionesCatalogo'
import { agruparPorFecha } from '../utils/notificacionesUI'
import TarjetaNotificacion from '../components/notificaciones/TarjetaNotificacion'
import NotifSkeleton from '../components/notificaciones/NotifSkeleton'
import './Notificaciones.css'

// ---------------------------------------------------------------
// Notificaciones: filtro por categoría (Tabs), agrupado por fecha,
// preferencias de silencio por categoría (localStorage, sin
// backend) y una leyenda explicando qué significa cada tipo.
// ---------------------------------------------------------------

const CLAVE_SILENCIADAS = 'notif_categorias_silenciadas'

// La leyenda tiene UNA fila por sección. Casi todas muestran el ícono de
// la sección; Pagos es la excepción porque sus tarjetas usan dos íconos
// (el de pago ámbar = reportaste y falta verificación, la tilde verde =
// verificado).
const ICONOS_LEYENDA = {
  pagos: [
    { icono: DollarSign, color: 'amber' },
    { icono: CheckCircle, color: 'green' },
  ],
}

function leerSilenciadas() {
  try {
    return JSON.parse(safeGetItem(CLAVE_SILENCIADAS)) || []
  } catch {
    return []
  }
}

function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const [silenciadas, setSilenciadas] = useState(leerSilenciadas)
  const navigate = useNavigate()

  const cargarNotificaciones = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications')
      setNotificaciones(data)
    } catch (err) {
      setError('No se pudieron cargar las notificaciones')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    async function iniciar() {
      await cargarNotificaciones()
    }
    iniciar()
  }, [cargarNotificaciones])

  async function marcarLeida(id) {
    try {
      await api.patch(`/notifications/${id}`)
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)))
    } catch (err) {
      console.error('Error al marcar leída:', err)
    }
  }

  async function marcarTodasLeidas() {
    try {
      await api.patch('/notifications/read-all')
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
    } catch (err) {
      console.error('Error al marcar todas:', err)
    }
  }

  function toggleSilenciar(categoriaId, silenciar) {
    const nuevas = silenciar
      ? [...silenciadas, categoriaId]
      : silenciadas.filter((c) => c !== categoriaId)
    setSilenciadas(nuevas)
    safeSetItem(CLAVE_SILENCIADAS, JSON.stringify(nuevas))
  }

  function handleClick(notificacion) {
    if (!notificacion.leida) marcarLeida(notificacion.id)
    if (notificacion.tipo === 'chat_mensaje') {
      navigate(notificacion.orden_id ? `/chat/orden/${notificacion.orden_id}` : '/chat')
    } else if (notificacion.orden_id) {
      navigate('/orders')
    }
  }

  // Visibles = todo lo que no pertenece a una categoría silenciada
  const visibles = useMemo(
    () => notificaciones.filter((n) => !silenciadas.includes(getCategoriaDeTipo(n.tipo))),
    [notificaciones, silenciadas]
  )

  const conteosPorCategoria = useMemo(() => {
    const conteo = { todas: visibles.length }
    for (const cat of ORDEN_CATEGORIAS) conteo[cat] = 0
    for (const n of visibles) {
      const cat = getCategoriaDeTipo(n.tipo)
      conteo[cat] = (conteo[cat] || 0) + 1
    }
    return conteo
  }, [visibles])

  const filtradas = useMemo(() => {
    if (filtro === 'todas') return visibles
    return visibles.filter((n) => getCategoriaDeTipo(n.tipo) === filtro)
  }, [visibles, filtro])

  const gruposPorFecha = useMemo(() => agruparPorFecha(filtradas), [filtradas])
  const noLeidas = notificaciones.filter((n) => !n.leida).length

  if (error) {
    return (
      <LayoutPaginaPrincipal titulo="Notificaciones" nav={NAV_NOTIFICACIONES({ silenciadas, onToggleSilenciar: toggleSilenciar })}>
        <p className="notif-error">{error}</p>
      </LayoutPaginaPrincipal>
    )
  }

  const navConfig = NAV_NOTIFICACIONES({ silenciadas, onToggleSilenciar: toggleSilenciar })

  return (
    <LayoutPaginaPrincipal
      activo="notificaciones"
      titulo="Notificaciones"
      nav={navConfig}
      acciones={
        <button
          className="notif-marcar-btn"
          onClick={marcarTodasLeidas}
          disabled={noLeidas === 0}
        >
          <CheckCheck size={16} />
          <span className="notif-marcar-btn__texto">Marcar todas leídas</span>
          {noLeidas > 0 && (
            <span className="notif-marcar-btn__badge">{noLeidas}</span>
          )}
        </button>
      }
    >
      <div className="notif-page">
        {/* Sidebar de filtros (desktop) */}
        <aside className="notif-sidebar">
          <div className="notif-sidebar__header">
            <Filter size={15} />
            <span>Filtrar por</span>
          </div>
          <button
            className={`notif-sidebar__btn ${filtro === 'todas' ? 'notif-sidebar__btn--active' : ''}`}
            onClick={() => setFiltro('todas')}
          >
            <span>Todas</span>
            {conteosPorCategoria.todas > 0 && (
              <Badge size="sm" variant="subtle">{conteosPorCategoria.todas}</Badge>
            )}
          </button>
          {ORDEN_CATEGORIAS.map((catId) => {
            const cat = CATEGORIAS[catId]
            const Icono = cat.icono
            return (
              <button
                key={catId}
                className={`notif-sidebar__btn ${filtro === catId ? 'notif-sidebar__btn--active' : ''}`}
                onClick={() => setFiltro(catId)}
              >
                <span className={`notif-icon notif-icon--${cat.color} notif-icon--sm`}>
                  <Icono size={14} />
                </span>
                <span>{cat.nombre}</span>
                {conteosPorCategoria[catId] > 0 && (
                  <Badge size="sm" variant="subtle" colorPalette={cat.color}>{conteosPorCategoria[catId]}</Badge>
                )}
              </button>
            )
          })}
        </aside>

        <div className="notif-container">
          {/* Tabs móviles (solo visible en móvil via CSS) */}
          <div className="notif-tabs-mobile">
            <button
              className={`notif-tabs-mobile__btn ${filtro === 'todas' ? 'notif-tabs-mobile__btn--active' : ''}`}
              onClick={() => setFiltro('todas')}
            >
              Todas
              {conteosPorCategoria.todas > 0 && (
                <Badge ml="1" size="sm" variant="subtle">{conteosPorCategoria.todas}</Badge>
              )}
            </button>
            {ORDEN_CATEGORIAS.map((catId) => {
              const cat = CATEGORIAS[catId]
              return (
                <button
                  key={catId}
                  className={`notif-tabs-mobile__btn ${filtro === catId ? 'notif-tabs-mobile__btn--active' : ''}`}
                  onClick={() => setFiltro(catId)}
                >
                  {cat.nombre}
                  {conteosPorCategoria[catId] > 0 && (
                    <Badge ml="1" size="sm" variant="subtle" colorPalette={cat.color}>{conteosPorCategoria[catId]}</Badge>
                  )}
                </button>
              )
            })}
          </div>

          {/* Leyenda */}
          <Accordion.Root collapsible className="notif-accordion">
            <Accordion.Item value="leyenda">
              <Accordion.ItemTrigger className="notif-accordion__trigger">
                <Text>¿Qué significa cada notificación?</Text>
                <ChevronDown size={16} className="notif-accordion__chevron" />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <Accordion.ItemBody className="notif-leyenda">
                  {ORDEN_CATEGORIAS.map((catId) => {
                    const cat = CATEGORIAS[catId]
                    const special = ICONOS_LEYENDA[catId]
                    const IconoSeccion = cat.icono
                    return (
                      <div key={catId} className="notif-leyenda__item">
                        {special ? (
                          <span className="notif-leyenda__iconos">
                            {special.map(({ icono: Icono, color }) => (
                              <span
                                key={color}
                                className={`notif-icon notif-icon--${color} notif-icon--sm`}
                              >
                                <Icono size={13} />
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className={`notif-icon notif-icon--${cat.color} notif-icon--sm`}>
                            <IconoSeccion size={14} />
                          </span>
                        )}
                        <span className="notif-leyenda__texto">
                          <strong>{cat.nombre}.</strong> {DESCRIPCION_CATEGORIA[catId]}
                        </span>
                      </div>
                    )
                  })}
                </Accordion.ItemBody>
              </Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>

          {cargando ? (
            <div className="notif-list">
              {Array.from({ length: 5 }).map((_, i) => (
                <NotifSkeleton key={i} />
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <div className="notif-vacio">
              <div className="notif-vacio__icon">🔔</div>
              <h2>No tienes notificaciones{filtro !== 'todas' ? ' en esta categoría' : ''}</h2>
              <p>Aquí verás novedades sobre tus órdenes y tu cuenta.</p>
            </div>
          ) : (
            gruposPorFecha.map(([grupo, items]) => (
              <div key={grupo} className="notif-grupo">
                <p className="notif-grupo__titulo">{grupo}</p>
                <div className="notif-list">
                  {items.map((notif) => (
                    <TarjetaNotificacion
                      key={notif.id}
                      notif={notif}
                      onClick={handleClick}
                      clickable={!!notif.orden_id || notif.tipo === 'chat_mensaje'}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </LayoutPaginaPrincipal>
  )
}

export default Notificaciones
