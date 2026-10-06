import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Accordion,
  Badge,
  Text,
} from '@chakra-ui/react'
import { ChevronDown, Filter, CheckCheck } from 'lucide-react'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import PreferenciasNotificaciones from '../components/paginas-principales/PreferenciasNotificaciones'
import api from '../api/axios'
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
// Notificaciones: el sidebar izquierdo es el ÚNICO mecanismo de
// filtrado (una vista reversible, sin persistencia), las preferencias
// de avisos push viven en un acordeón colapsado por defecto, y abajo
// hay una leyenda explicando qué significa cada tipo.
//
// Antes había además una segunda lista ("Qué se ve en esta lista")
// que escondía categorías de forma permanente en
// `notif_categorias_silenciadas`. Se eliminó: el usuario la confundía
// con el filtro del sidebar y perdía notificaciones sin aviso.
// ---------------------------------------------------------------

function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refPreferencias = useRef(null)
  // Se deriva de la URL en el primer render (inicializador perezoso), no en
  // un useEffect: el deep link "?preferencias=1" ya abre el acordeón desde
  // el primer pintado. El efecto de abajo se queda SOLO con el scroll, que
  // sí es una operación de DOM.
  const [prefsAbiertas, setPrefsAbiertas] = useState(() => searchParams.get('preferencias') === '1')

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

  // Deep link desde Mi Cuenta: "?preferencias=1" hace scroll al acordeón.
  // El estado ya está abierto desde el primer render (inicializador de
  // arriba); acá solo se espera a que el DOM tenga su altura final.
  // Dos frames: uno para el pintado y otro para el layout estable.
  useEffect(() => {
    if (searchParams.get('preferencias') !== '1') return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        refPreferencias.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClick(notificacion) {
    if (!notificacion.leida) marcarLeida(notificacion.id)
    if (notificacion.tipo === 'chat_mensaje') {
      navigate(notificacion.orden_id ? `/chat/orden/${notificacion.orden_id}` : '/chat')
    } else if (notificacion.url) {
      navigate(notificacion.url)
    } else if (notificacion.orden_id) {
      navigate('/orders')
    }
  }

  const conteosPorCategoria = useMemo(() => {
    const conteo = { todas: notificaciones.length }
    for (const cat of ORDEN_CATEGORIAS) conteo[cat] = 0
    for (const n of notificaciones) {
      const cat = getCategoriaDeTipo(n.tipo)
      conteo[cat] = (conteo[cat] || 0) + 1
    }
    return conteo
  }, [notificaciones])

  const filtradas = useMemo(() => {
    if (filtro === 'todas') return notificaciones
    return notificaciones.filter((n) => getCategoriaDeTipo(n.tipo) === filtro)
  }, [notificaciones, filtro])

  const gruposPorFecha = useMemo(() => agruparPorFecha(filtradas), [filtradas])
  const noLeidas = notificaciones.filter((n) => !n.leida).length

  if (error) {
    return (
      <LayoutPaginaPrincipal activo="notificaciones" titulo="Notificaciones">
        <p className="notif-error">{error}</p>
      </LayoutPaginaPrincipal>
    )
  }


  // El header del layout (donde vive la prop "acciones") se oculta por
  // completo en <1024px, así que el botón se pinta dos veces: arriba del
  // todo en desktop y como fila propia dentro de la página en móvil.
  const botonMarcarTodas = (
    <>
      <CheckCheck size={16} />
      <span className="notif-marcar-btn__texto">Marcar todas leídas</span>
      {noLeidas > 0 && (
        <span className="notif-marcar-btn__badge">{noLeidas}</span>
      )}
    </>
  )

  return (
    <LayoutPaginaPrincipal
      activo="notificaciones"
      titulo="Notificaciones"
      acciones={
        <button
          className="notif-marcar-btn"
          onClick={marcarTodasLeidas}
          disabled={noLeidas === 0}
        >
          {botonMarcarTodas}
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
          {/* Preferencias de push: acordeón colapsado por defecto para no
              saturar la página al entrar. El sidebar de la izquierda es el
              filtro visible; esto solo configura qué avisos manda el servidor. */}
          <div ref={refPreferencias}>
            <Accordion.Root
              collapsible
              className="notif-accordion notif-accordion--prefs"
              value={prefsAbiertas ? ['preferencias'] : []}
              onValueChange={(det) => setPrefsAbiertas((det?.value?.length ?? 0) > 0)}
            >
              <Accordion.Item value="preferencias">
                <Accordion.ItemTrigger className="notif-accordion__trigger">
                  <Text>Preferencias de notificación</Text>
                  <ChevronDown size={16} className="notif-accordion__chevron" />
                </Accordion.ItemTrigger>
                <Accordion.ItemContent>
                  <Accordion.ItemBody>
                    <PreferenciasNotificaciones />
                  </Accordion.ItemBody>
                </Accordion.ItemContent>
              </Accordion.Item>
            </Accordion.Root>
          </div>
          {/* Móvil: el header del layout no se ve, así que "Marcar todas
              leídas" vive aquí como fila propia */}
          <div className="notif-mobile-acciones">
            <button
              className="notif-marcar-btn"
              onClick={marcarTodasLeidas}
              disabled={noLeidas === 0}
            >
              {botonMarcarTodas}
            </button>
          </div>

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

          {/* Leyenda. Tiene UNA fila por sección y muestra el ícono de la
              sección (el mismo que usa el filtro). Antes Pagos pintaba
              además el ícono del pago verificado (tilde verde); el dueño lo
              quitó porque ensuciaba la lectura. */}
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
                    const IconoSeccion = cat.icono
                    return (
                      <div key={catId} className="notif-leyenda__item">
                        <span className={`notif-icon notif-icon--${cat.color} notif-icon--sm`}>
                          <IconoSeccion size={14} />
                        </span>
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
                      clickable={!!notif.url || !!notif.orden_id || notif.tipo === 'chat_mensaje'}
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
