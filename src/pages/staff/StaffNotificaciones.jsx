import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Accordion, Badge, Text } from '@chakra-ui/react'
import { Bell, BellOff, CheckCheck, ChevronDown, Filter, Search } from 'lucide-react'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import staffApi from '../../api/staffAxios'
import { useStaffAuth } from '../../context/StaffAuthContext'
import { usePushStaff } from '../../hooks/usePushStaff'
import {
  CATEGORIAS,
  ORDEN_CATEGORIAS,
  DESCRIPCION_CATEGORIA,
  getCategoriaDeTipo,
} from '../../utils/notificacionesCatalogo'
import { agruparPorFecha } from '../../utils/notificacionesUI'
import { urlDestinoStaff } from '../../utils/notificacionesStaffLinks'
import { DEPARTAMENTOS, MODULOS } from '../../components/staff/NavStaff'
import TarjetaNotificacion from '../../components/notificaciones/TarjetaNotificacion'
import NotifSkeleton from '../../components/notificaciones/NotifSkeleton'
import { safeGetItem, safeSetItem } from '../../utils/safeStorage'
import '../Notificaciones.css'
import './StaffNotificaciones.css'

// ---------------------------------------------------------------
// Centro de notificaciones del personal interno.
//
// Consume `staffApi` + `/staff/notificaciones*` (verifyStaffJWT).
// Misma lista visual que el centro del cliente pero con datos del
// staff: los eventos del equipo (pedidos, pagos, solicitudes,
// documentos, chat, catálogo) y deep-link al módulo donde trabajar.
//
// Reutiliza las clases `.notif-*` de `pages/Notificaciones.css`
// (importada aquí) y solo añade lo propio de esta página con `.snt-*`.
// ---------------------------------------------------------------

const LIMITE = 50
const CLAVE_SILENCIADAS = 'notif_staff_categorias_silenciadas'

function leerSilenciadas() {
  try {
    return JSON.parse(safeGetItem(CLAVE_SILENCIADAS)) || []
  } catch {
    return []
  }
}

/**
 * La bandeja es transversal a los 3 departamentos, así que la ruta se
 * declara en los tres. El layout, en cambio, debe mostrar el sidebar del
 * departamento donde el rol SÍ tiene módulos: si un despachador entra por
 * `/staff/notificaciones` (ruta de Finanzas, la primera en generarse) y
 * pintáramos el sidebar de Finanzas vería "No tienes módulos en este
 * departamento".
 *
 * `notificaciones` NO cuenta como módulo del departamento: es visible
 * para los 7 roles en los 3 deptos, así que si contara, TODO rol tendría
 * "módulos" en todas partes y esta función devolvería siempre el
 * departamento de la ruta (el de Finanzas) en vez del que le sirve.
 */
function deptoParaRol(rol, preferido) {
  const tieneModulos = (id) =>
    (MODULOS[id] || [])
      .flatMap((grupo) => grupo.items)
      .some((item) => item.id !== 'notificaciones' && item.roles.includes(rol))
  if (preferido && tieneModulos(preferido)) return preferido
  const conAcceso = DEPARTAMENTOS.find((d) => tieneModulos(d.id))
  return conAcceso?.id || preferido || 'comercial'
}

function ItemLeyenda({ catId }) {
  const cat = CATEGORIAS[catId]
  const Icono = cat.icono
  return (
    <div className="notif-leyenda__item">
      <span className={`notif-icon notif-icon--${cat.color} notif-icon--sm`}>
        <Icono size={14} />
      </span>
      <span className="notif-leyenda__texto">
        <strong>{cat.nombre}.</strong> {DESCRIPCION_CATEGORIA[catId]}
      </span>
    </div>
  )
}

export default function StaffNotificaciones({ departamento }) {
  const { staff } = useStaffAuth()
  const navigate = useNavigate()

  const deptos = useMemo(() => deptoParaRol(staff?.rol, departamento), [staff?.rol, departamento])

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [noLeidas, setNoLeidas] = useState(0)
  const [offset, setOffset] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState('')

  const [filtro, setFiltro] = useState('todas')
  const [soloNoLeidas, setSoloNoLeidas] = useState(false)
  const [termino, setTermino] = useState('')
  const [terminoAplicado, setTerminoAplicado] = useState('')
  const [silenciadas, setSilenciadas] = useState(leerSilenciadas)

  // Contador de petición: si llegan dos respuestas fuera de orden (el
  // filtro cambió mientras viajaba la anterior), solo se aplica la última.
  const reqRef = useRef(0)

  const cargar = useCallback((nuevoOffset, { soloNoLeidas: solo, buscar } = {}) => {
    const id = ++reqRef.current
    return staffApi
      .get('/staff/notificaciones', {
        params: {
          limite: LIMITE,
          offset: nuevoOffset,
          ...(solo ? { solo_no_leidas: true } : {}),
          ...(buscar ? { buscar } : {}),
        },
      })
      .then(({ data }) => {
        if (id !== reqRef.current) return
        const pagina = data?.notificaciones || []
        setItems(nuevoOffset === 0 ? pagina : (prev) => [...prev, ...pagina])
        setTotal(data?.total || 0)
        // El contador del backend se calcula SIN los filtros de la
        // consulta, así que es el total real de no leídas de esta persona.
        setNoLeidas(data?.no_leidas || 0)
        setOffset(nuevoOffset)
        setError('')
      })
      .catch(() => {
        if (id !== reqRef.current) return
        setError('No se pudieron cargar las notificaciones')
      })
      .finally(() => {
        if (id !== reqRef.current) return
        setCargando(false)
        setCargandoMas(false)
      })
  }, [])

  // Primera página (o recarga) cuando cambian los filtros de servidor.
  // El setState va dentro de un microtask: `react-hooks/set-state-in-effect`
  // marca cualquier setState síncrono dentro del cuerpo del efecto.
  useEffect(() => {
    let cancelado = false
    Promise.resolve().then(() => {
      if (cancelado) return
      setCargando(true)
      cargar(0, { soloNoLeidas, buscar: terminoAplicado })
    })
    return () => {
      cancelado = true
    }
  }, [cargar, soloNoLeidas, terminoAplicado])

  // Debounce del buscador: 350 ms como en los buscadores del proyecto.
  useEffect(() => {
    const timer = setTimeout(() => setTerminoAplicado(termino.trim()), 350)
    return () => clearTimeout(timer)
  }, [termino])

  function cargarMas() {
    setCargandoMas(true)
    cargar(offset + LIMITE, { soloNoLeidas, buscar: terminoAplicado })
  }

  async function marcarLeida(id) {
    try {
      await staffApi.patch(`/staff/notificaciones/${id}`)
      setItems((prev) =>
        soloNoLeidas
          ? prev.filter((n) => n.id !== id)
          : prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      )
      setTotal((prev) => (soloNoLeidas ? Math.max(0, prev - 1) : prev))
      setNoLeidas((prev) => Math.max(0, prev - 1))
    } catch {
      // Silencioso: el próximo refresco vuelve a preguntarle al servidor.
    }
  }

  async function marcarTodasLeidas() {
    try {
      await staffApi.patch('/staff/notificaciones/leer-todas')
      setItems((prev) => (soloNoLeidas ? [] : prev.map((n) => ({ ...n, leida: true }))))
      if (soloNoLeidas) setTotal(0)
      setNoLeidas(0)
    } catch {
      setError('No se pudieron marcar las notificaciones como leídas')
    }
  }

  function toggleSilenciar(catId) {
    const silenciar = silenciadas.includes(catId)
    const nuevas = silenciar
      ? silenciadas.filter((c) => c !== catId)
      : [...silenciadas, catId]
    setSilenciadas(nuevas)
    safeSetItem(CLAVE_SILENCIADAS, JSON.stringify(nuevas))
  }

  function handleClick(notif) {
    if (!notif.leida) marcarLeida(notif.id)
    navigate(urlDestinoStaff(notif.tipo))
  }

  // Categorías silenciadas por esta persona (solo local, igual que el
  // centro de notificaciones del cliente).
  const visibles = useMemo(
    () => items.filter((n) => !silenciadas.includes(getCategoriaDeTipo(n.tipo))),
    [items, silenciadas]
  )

  const filtradas = useMemo(
    () => (filtro === 'todas' ? visibles : visibles.filter((n) => getCategoriaDeTipo(n.tipo) === filtro)),
    [visibles, filtro]
  )

  const conteos = useMemo(() => {
    const acc = { todas: visibles.length }
    for (const catId of ORDEN_CATEGORIAS) acc[catId] = 0
    for (const n of visibles) {
      const cat = getCategoriaDeTipo(n.tipo)
      acc[cat] = (acc[cat] || 0) + 1
    }
    return acc
  }, [visibles])

  const grupos = useMemo(() => agruparPorFecha(filtradas), [filtradas])
  const hayMas = offset + items.length < total

  return (
    <LayoutDepartamento departamento={deptos} activo="notificaciones" titulo="Notificaciones">
      <div className="snt-toolbar">
        <div className="snt-toolbar__buscador">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            placeholder="Buscar en notificaciones"
            aria-label="Buscar en notificaciones"
          />
        </div>

        <button
          type="button"
          className={`snt-chip-btn ${soloNoLeidas ? 'snt-chip-btn--activo' : ''}`}
          onClick={() => setSoloNoLeidas((v) => !v)}
          aria-pressed={soloNoLeidas}
        >
          <Bell size={15} />
          Solo no leídas{noLeidas > 0 && <span className="snt-chip-btn__n">{noLeidas}</span>}
        </button>

        <button
          type="button"
          className="notif-marcar-btn"
          onClick={marcarTodasLeidas}
          disabled={noLeidas === 0 || cargando}
        >
          <CheckCheck size={16} />
          <span className="notif-marcar-btn__texto">Marcar todas leídas</span>
        </button>
      </div>

      <PanelPush />

      <div className="notif-page">
        <aside className="notif-sidebar">
          <div className="notif-sidebar__header">
            <Filter size={15} />
            <span>Filtrar por</span>
          </div>
          <button
            type="button"
            className={`notif-sidebar__btn ${filtro === 'todas' ? 'notif-sidebar__btn--active' : ''}`}
            onClick={() => setFiltro('todas')}
          >
            <span>Todas</span>
            {conteos.todas > 0 && (
              <Badge size="sm" variant="subtle">
                {conteos.todas}
              </Badge>
            )}
          </button>
          {ORDEN_CATEGORIAS.map((catId) => {
            const cat = CATEGORIAS[catId]
            const Icono = cat.icono
            const silenciada = silenciadas.includes(catId)
            return (
              <div key={catId} className="snt-fila-categoria">
                <button
                  type="button"
                  className={`notif-sidebar__btn ${filtro === catId ? 'notif-sidebar__btn--active' : ''}`}
                  onClick={() => setFiltro(catId)}
                >
                  <span className={`notif-icon notif-icon--${cat.color} notif-icon--sm`}>
                    <Icono size={14} />
                  </span>
                  <span>{cat.nombre}</span>
                  {conteos[catId] > 0 && (
                    <Badge size="sm" variant="subtle" colorPalette={cat.color}>
                      {conteos[catId]}
                    </Badge>
                  )}
                </button>
                <button
                  type="button"
                  className={`snt-silenciar ${silenciada ? 'snt-silenciar--activo' : ''}`}
                  onClick={() => toggleSilenciar(catId)}
                  aria-label={`${silenciada ? 'Mostrar' : 'Ocultar'} notificaciones de ${cat.nombre}`}
                  title={silenciada ? `Mostrar ${cat.nombre}` : `Ocultar ${cat.nombre}`}
                >
                  {silenciada ? <BellOff size={14} /> : <Bell size={14} />}
                </button>
              </div>
            )
          })}
        </aside>

        <div className="notif-container">
          <div className="notif-tabs-mobile">
            <button
              type="button"
              className={`notif-tabs-mobile__btn ${filtro === 'todas' ? 'notif-tabs-mobile__btn--active' : ''}`}
              onClick={() => setFiltro('todas')}
            >
              Todas
              {conteos.todas > 0 && (
                <Badge ml="1" size="sm" variant="subtle">
                  {conteos.todas}
                </Badge>
              )}
            </button>
            {ORDEN_CATEGORIAS.map((catId) => (
              <button
                key={catId}
                type="button"
                className={`notif-tabs-mobile__btn ${filtro === catId ? 'notif-tabs-mobile__btn--active' : ''}`}
                onClick={() => setFiltro(catId)}
              >
                {CATEGORIAS[catId].nombre}
                {conteos[catId] > 0 && (
                  <Badge ml="1" size="sm" variant="subtle" colorPalette={CATEGORIAS[catId].color}>
                    {conteos[catId]}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          <Accordion.Root collapsible className="notif-accordion">
            <Accordion.Item value="leyenda">
              <Accordion.ItemTrigger className="notif-accordion__trigger">
                <Text>¿Qué significa cada notificación?</Text>
                <ChevronDown size={16} className="notif-accordion__chevron" />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <Accordion.ItemBody className="notif-leyenda">
                  {ORDEN_CATEGORIAS.map((catId) => (
                    <ItemLeyenda key={catId} catId={catId} />
                  ))}
                </Accordion.ItemBody>
              </Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>

          {error && <p className="notif-error">{error}</p>}

          {cargando && items.length === 0 ? (
            <div className="notif-list">
              {Array.from({ length: 5 }).map((_, i) => (
                <NotifSkeleton key={i} />
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <div className="notif-vacio">
              <div className="notif-vacio__icon">🔔</div>
              <h2>
                No hay notificaciones
                {filtro !== 'todas' ? ' en esta categoría' : soloNoLeidas ? ' sin leer' : ''}
              </h2>
              <p>Aquí verás los eventos del equipo: pedidos, pagos, solicitudes y documentos.</p>
            </div>
          ) : (
            <>
              {grupos.map(([grupo, itemsGrupo]) => (
                <div key={grupo} className="notif-grupo">
                  <p className="notif-grupo__titulo">{grupo}</p>
                  <div className="notif-list">
                    {itemsGrupo.map((notif) => (
                      <TarjetaNotificacion key={notif.id} notif={notif} onClick={handleClick} />
                    ))}
                  </div>
                </div>
              ))}

              {hayMas && (
                <div className="snt-mas">
                  <p className="snt-mas__info">
                    Mostrando {items.length} de {total}
                  </p>
                  <button
                    type="button"
                    className="snt-mas__btn"
                    onClick={cargarMas}
                    disabled={cargandoMas}
                  >
                    {cargandoMas ? 'Cargando...' : 'Cargar más'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </LayoutDepartamento>
  )
}

// ---------------------------------------------------------------
// Bloque de preferencias push. Delega en `usePushStaff`.
// ---------------------------------------------------------------
function PanelPush() {
  const {
    soportado,
    suscrito,
    permiso,
    preferenciaActiva,
    pidiendoPermiso,
    error,
    activar,
    desactivar,
  } = usePushStaff()

  const activo = soportado && !!suscrito && preferenciaActiva && permiso === 'granted'

  let estado = ''
  if (!soportado) estado = 'Tu navegador no soporta notificaciones push.'
  else if (permiso === 'denied') estado = 'Las notificaciones están bloqueadas en la configuración del navegador.'
  else if (!suscrito && preferenciaActiva) estado = 'Tu dispositivo todavía no está registrado para recibir avisos.'

  return (
    <div className="snt-push">
      <div className="snt-push__texto">
        <strong>Alertas push en este dispositivo</strong>
        <span>
          {activo
            ? 'Recibirás avisos aunque tengas la app cerrada.'
            : estado || 'Activa las alertas para enterarte aunque no tengas la app abierta.'}
        </span>
      </div>
      <button
        type="button"
        className={`snt-push__btn ${activo ? 'snt-push__btn--activo' : ''}`}
        onClick={activo ? desactivar : activar}
        disabled={!soportado || pidiendoPermiso}
      >
        {activo ? <BellOff size={16} /> : <Bell size={16} />}
        <span>
          {!soportado
            ? 'No disponible'
            : pidiendoPermiso
              ? 'Guardando...'
              : activo
                ? 'Desactivar'
                : 'Activar'}
        </span>
      </button>
      {error && <p className="snt-push__error">{error}</p>}
    </div>
  )
}