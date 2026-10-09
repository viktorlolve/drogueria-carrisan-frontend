import { useState, useEffect, useMemo } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import {
  Package,
  ArrowRight,
  History,
  LayoutGrid,
  ClipboardList,
  Wallet,
  Boxes,
  Truck,
  Store,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { OrdenCard, OrdenCardSkeleton } from '../components/OrdenCard'
import { normalizarEstado } from '../config/estadosOrden'
import './MisOrdenes.css'


// ---------------------------------------------------------------

// Estados que ya cerraron su ciclo: viven en la pestaña Historial.
const ESTADOS_HISTORIAL = new Set(['entregado', 'retirado', 'cancelado'])
const esHistorial = (orden) => ESTADOS_HISTORIAL.has(normalizarEstado(orden.estado))

// Contado cuya aprobación abrió la ventana de pago y todavía no se pagó.
// estado_pago: esperando / reportado / rechazado ⇒ pendiente; verificado
// (o NULL en crédito) ⇒ no aplica.
function requierePago(orden) {
  if (orden.forma_pago !== 'contado') return false
  const ep = orden.estado_pago
  return ep !== null && ep !== '' && ep !== 'verificado'
}

// Pills por grupo. El orden de definición es el orden de la UI y religa el
// ciclo de vida (todas la tests se evalúan sobre el estado NORMALIZADO).
const FILTROS_ACTIVOS = [
  { id: 'pedido_creado', label: 'Orden Creada', icono: ClipboardList, test: (o) => normalizarEstado(o.estado) === 'pedido_creado' },
  { id: 'pendiente_pago', label: 'Pendiente de Pago', icono: Wallet, test: requierePago },
  { id: 'preparando', label: 'Preparando', icono: Boxes, test: (o) => normalizarEstado(o.estado) === 'preparando' },
  { id: 'enviado', label: 'Enviados', icono: Truck, test: (o) => normalizarEstado(o.estado) === 'enviado' },
  { id: 'listo_para_retiro', label: 'Listo para retiro', icono: Store, test: (o) => normalizarEstado(o.estado) === 'listo_para_retiro' },
]

const FILTROS_HISTORIAL = [
  { id: 'entregado', label: 'Entregados', icono: CheckCircle, test: (o) => ['entregado', 'retirado'].includes(normalizarEstado(o.estado)) },
  { id: 'cancelado', label: 'Cancelados', icono: XCircle, test: (o) => normalizarEstado(o.estado) === 'cancelado' },
]

const GRUPOS = [
  { id: 'activos', label: 'Activos', icono: Package, esDeGrupo: (o) => !esHistorial(o) },
  { id: 'historial', label: 'Historial', icono: History, esDeGrupo: esHistorial },
]

function MisOrdenes() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [grupo, setGrupo] = useState('activos')
  const [filtro, setFiltro] = useState('todos')
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    async function cargarOrdenes() {
      try {
        const { data } = await api.get('/orders')
        setOrdenes(data)
      } catch (err) {
        setError('No se pudieron cargar las órdenes')
        console.error(err)
      } finally {
        setCargando(false)
      }
    }

    cargarOrdenes()
  }, [])

  // Cambiar de grupo resetea el filtro — cada tab trae sus propias pills.
  function cambiarGrupo(g) {
    setGrupo(g)
    setFiltro('todos')
  }

  const grupoActivo = GRUPOS.find((g) => g.id === grupo)

  const ordenesDelGrupo = useMemo(
    () => ordenes.filter((o) => grupoActivo.esDeGrupo(o)),
    [ordenes, grupoActivo]
  )

  const filtrosDelGrupo = grupo === 'activos' ? FILTROS_ACTIVOS : FILTROS_HISTORIAL

  const ordenesFiltradas = useMemo(() => {
    if (filtro === 'todos') return ordenesDelGrupo
    const f = filtrosDelGrupo.find((x) => x.id === filtro)
    return f ? ordenesDelGrupo.filter(f.test) : []
  }, [ordenesDelGrupo, filtro, filtrosDelGrupo])

  // Cuántas órdenes propias (no aplica a la vista admin) están esperando
  // pago o fueron rechazadas — para ofrecer el acceso directo a /pagos.
  const ordenesPendientesPago = useMemo(() => ordenes.filter(requierePago), [ordenes])

  const titulo = user?.es_admin ? 'Todas las Órdenes' : 'Mis Órdenes'
  const subtitulo = user?.es_admin
    ? 'Seguimiento operativo de todos los pedidos de la plataforma'
    : 'Revisa el estado y el historial de tus pedidos'

  return (
    <LayoutPaginaPrincipal activo="ordenes" titulo={titulo} subtitulo={subtitulo}>
      <div className="mo-page">
        {error && <p className="mo-error">{error}</p>}

        {!user?.es_admin && ordenesPendientesPago.length > 0 && (
          <button type="button" className="mo-banner-pago" onClick={() => navigate('/pagos')}>
            <span>
              Tienes {ordenesPendientesPago.length}{' '}
              {ordenesPendientesPago.length === 1 ? 'orden pendiente de pago' : 'órdenes pendientes de pago'}
            </span>
            <span className="mo-banner-pago__cta">
              Gestionar pagos <ArrowRight size={15} />
            </span>
          </button>
        )}

        {cargando ? (
          <div className="mo-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <OrdenCardSkeleton key={i} />
            ))}
          </div>
        ) : ordenes.length === 0 ? (
          <div className="mo-vacio">
            <div className="mo-vacio__icon">
              <Package size={32} />
            </div>
            <h2>No tenés órdenes todavía</h2>
            <p>Cuando confirmes un pedido, aparecerá aquí.</p>
            <Link to="/catalogo" className="mo-vacio__cta">Ir al catálogo</Link>
          </div>
        ) : (
          <>
            <div className="mo-grupos">
              {GRUPOS.map((g) => {
                const conteo = ordenes.filter(g.esDeGrupo).length
                const Icono = g.icono
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`mo-grupo ${grupo === g.id ? 'mo-grupo--activo' : ''}`}
                    onClick={() => cambiarGrupo(g.id)}
                  >
                    <Icono size={16} className="mo-icono" aria-hidden="true" />
                    {g.label}
                    <span className="mo-grupo__count">{conteo}</span>
                  </button>
                )
              })}
            </div>

            {ordenesDelGrupo.length > 0 && (
              <div className="mo-filtros">
                <button
                  type="button"
                  className={`mo-filtro ${filtro === 'todos' ? 'mo-filtro--activo' : ''}`}
                  onClick={() => setFiltro('todos')}
                >
                  <LayoutGrid size={14} className="mo-icono" aria-hidden="true" />
                  Todos
                  <span className="mo-filtro__count">{ordenesDelGrupo.length}</span>
                </button>
                {filtrosDelGrupo.map((f) => {
                  const conteo = ordenesDelGrupo.filter(f.test).length
                  const Icono = f.icono
                  return (
                    <button
                      key={f.id}
                      type="button"
                      className={`mo-filtro ${filtro === f.id ? 'mo-filtro--activo' : ''}`}
                      onClick={() => setFiltro(f.id)}
                    >
                      <Icono size={14} className="mo-icono" aria-hidden="true" />
                      {f.label}
                      <span className="mo-filtro__count">{conteo}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {ordenesDelGrupo.length === 0 ? (
              <p className="mo-vacio-filtro">
                {grupo === 'activos'
                  ? 'No tenés órdenes en curso por ahora.'
                  : 'Aún no tenés órdenes completadas.'}
              </p>
            ) : ordenesFiltradas.length === 0 ? (
              <p className="mo-vacio-filtro">No hay órdenes con este filtro.</p>
            ) : (
              <div className="mo-grid">
                {ordenesFiltradas.map((orden) => (
                  <OrdenCard
                    key={orden.id}
                    orden={orden}
                    aviso={
                      requierePago(orden) && (
                        <span className="orden-card__alerta">Pago pendiente</span>
                      )
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </LayoutPaginaPrincipal>
  )
}

export default MisOrdenes