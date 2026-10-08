import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  BarChart3,
  Banknote,
  CalendarClock,
  Download,
  Eye,
  EyeOff,
  History,
  Landmark,
  Loader2,
  Package,
  Receipt,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import OrdenClienteModal from '../components/OrdenClienteModal'
import PagoClienteModal from '../components/PagoClienteModal'
import FacturaClienteModal from '../components/FacturaClienteModal'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import generarFacturaPDF from '../utils/generarFacturaPDF'
import generarComprobantePagoPDF from '../utils/generarComprobantePagoPDF'
import { formatearUSD, formatearFechaCorta } from '../utils/formato'

// ---------------------------------------------------------------
// Estado de Cuenta — interfaz estilo banca en línea.
//
//   1. Tarjeta de cuenta (Índigo): disponible en grande, barra de uso de
//      la línea, estado de la cuenta y próximo vencimiento. Se pueden
//      ocultar los montos (ojo), preferencia guardada en localStorage.
//   2. Acciones rápidas circulares (Pagar / Pagos / Facturas / Reportes /
//      Ampliar / Estado en PDF).
//   3. Extracto de movimientos agrupado por fecha, con buscador y filtros.
//   4. Columna lateral (desktop): ficha de la cuenta + comparativa mensual.
//
// existiendo porque Facturas/Pagos/Reportes/Ampliación todavía lo usan
// y se rediseñan una por una después.
// ---------------------------------------------------------------

const CLAVE_OCULTAR = 'ec_ocultar_saldos'
const PASO_EXTRACTO = 15

// Mismo patrón ESTADOS_CONFIG con fallback para valores desconocidos del backend
const ESTADOS_CONFIG = {
  verificado: { label: 'Verificado', tono: 'ok' },
  pagado: { label: 'Pagado', tono: 'ok' },
  registrado: { label: 'Registrado', tono: 'neutro' },
  emitida: { label: 'Emitida', tono: 'neutro' },
  pendiente: { label: 'Pendiente', tono: 'aviso' },
  vencido: { label: 'Vencida', tono: 'error' },
}

function chipDeEstado(estado) {
  const clave = estado || 'registrado'
  return (
    ESTADOS_CONFIG[clave] || {
      label: String(clave).charAt(0).toUpperCase() + String(clave).slice(1),
      tono: 'neutro',
    }
  )
}

function chipDeOrden(orden) {
  if (orden.vencida) return { label: 'Vencida', tono: 'error' }
  if (orden.estado_pago === 'reportado') return { label: 'Pago en revisión', tono: 'info' }
  if (orden.estado_pago === 'rechazado') return { label: 'Pago rechazado', tono: 'error' }
  return { label: 'Por pagar', tono: 'aviso' }
}

function claveGrupoFecha(fecha) {
  const hoy = new Date()
  const d = new Date(fecha)
  const esMismoDia = (a, b) => a.toDateString() === b.toDateString()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)

  if (esMismoDia(d, hoy)) return 'Hoy'
  if (esMismoDia(d, ayer)) return 'Ayer'
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatearHora(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' })
}

function diasHasta(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

function textoVencimiento(dias) {
  if (dias === null) return null
  if (dias < 0) return `Vencida hace ${-dias} ${-dias === 1 ? 'día' : 'días'}`
  if (dias === 0) return 'Vence hoy'
  if (dias === 1) return 'Vence mañana'
  return `Vence en ${dias} días`
}

async function exportarFacturaPDF(factura, cliente) {
  await generarFacturaPDF({ factura, cliente })
}

async function exportarComprobantePago(pago, cliente, facturas) {
  await generarComprobantePagoPDF({ pago, cliente, facturas })
}

// ---------------------------------------------------------------
// Piezas pequeñas
// ---------------------------------------------------------------
const MASCARA = '••••••'

// Cifra "bancaria": moneda pequeña + enteros grandes + decimales pequeños
function Cifra({ valor, oculto = false, className = '' }) {
  if (oculto) {
    return (
      <span className={`ecb-cifra ${className}`}>
        <small className="ecb-cifra__moneda">USD</small>
        {MASCARA}
      </span>
    )
  }
  const n = Number(valor || 0)
  const [entero, decimales] = Math.abs(n).toFixed(2).split('.')
  return (
    <span className={`ecb-cifra ${className}`}>
      {n < 0 && <span className="ecb-cifra__signo">−</span>}
      <small className="ecb-cifra__moneda">USD</small>
      {Number(entero).toLocaleString('en-US')}
      <small className="ecb-cifra__dec">.{decimales}</small>
    </span>
  )
}

function Skeleton() {
  return (
    <div className="ecb-root" aria-busy="true" aria-live="polite">
      <div className="ecb-skel ecb-skel--tarjeta" />
      <div className="ecb-skel-acciones">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ecb-skel ecb-skel--circulo" />
        ))}
      </div>
      <div className="ecb-skel ecb-skel--extracto" />
    </div>
  )
}

// ---------------------------------------------------------------
// Tarjeta de cuenta
// ---------------------------------------------------------------
function TarjetaCuenta({ resumen, cliente, tieneCredito, porcentajeUsado, nivel, porPagarContado, oculto, onAlternar }) {
  const monto = (v) => (oculto ? `USD ${MASCARA}` : formatearUSD(v))
  const tieneVencidas = resumen.cantidad_ordenes_vencidas > 0

  // Estado de la cuenta (texto + tono; nunca solo color)
  let estado
  if (tieneCredito) {
    if (tieneVencidas) estado = { label: 'Órdenes vencidas', tono: 'error' }
    else if (nivel === 'critico') estado = { label: 'Límite cercano', tono: 'error' }
    else if (nivel === 'alto') estado = { label: 'Uso alto', tono: 'aviso' }
    else estado = { label: 'Al día', tono: 'ok' }
  } else {
    estado = porPagarContado > 0
      ? { label: 'Pagos pendientes', tono: 'aviso' }
      : { label: 'Al día', tono: 'ok' }
  }

  const proxima = resumen.proxima_orden_vencer
  const diasProxima = proxima ? diasHasta(proxima.fecha_vencimiento) : null

  return (
    <section className="ecb-tarjeta" aria-label="Resumen de tu cuenta">
      <div className="ecb-tarjeta__brillo" aria-hidden="true" />

      <header className="ecb-tarjeta__cab">
        <div className="ecb-tarjeta__marca">
          <span className="ecb-tarjeta__logo">
            {tieneCredito ? <Landmark size={16} /> : <Wallet size={16} />}
          </span>
          <span>{tieneCredito ? 'Línea de crédito' : 'Cuenta de contado'}</span>
        </div>
        <div className="ecb-tarjeta__der">
          <span className={`ecb-estado ecb-estado--${estado.tono}`}>
            <span className="ecb-estado__punto" aria-hidden="true" />
            {estado.label}
          </span>
          <button
            type="button"
            className="ecb-ojo"
            onClick={onAlternar}
            aria-pressed={oculto}
            aria-label={oculto ? 'Mostrar montos' : 'Ocultar montos'}
          >
            {oculto ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </header>

      <div className="ecb-tarjeta__saldo">
        <span className="ecb-tarjeta__etiqueta">{tieneCredito ? 'Disponible' : 'Por pagar'}</span>
        <Cifra
          valor={tieneCredito ? resumen.saldo : porPagarContado}
          oculto={oculto}
          className={tieneCredito && resumen.saldo < 0 ? 'ecb-cifra--negativa' : ''}
        />
      </div>

      {tieneCredito ? (
        <div className="ecb-uso">
          <div
            className="ecb-uso__pista"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(porcentajeUsado)}
            aria-label="Uso de la línea de crédito"
          >
            <div
              className={`ecb-uso__relleno ecb-uso__relleno--${nivel || 'normal'}`}
              style={{ width: `${porcentajeUsado}%` }}
            />
          </div>
          <div className="ecb-uso__cifras">
            <span>Usado <strong>{monto(resumen.deuda_actual)}</strong> · {Math.round(porcentajeUsado)}%</span>
            <span>Línea <strong>{monto(resumen.linea_credito)}</strong></span>
          </div>
        </div>
      ) : (
        <p className="ecb-tarjeta__nota">
          No tienes línea de crédito activa. Paga cada orden y reporta tu comprobante.
        </p>
      )}

      <footer className="ecb-tarjeta__pie">
        <div className="ecb-tarjeta__cliente">
          <strong>{cliente?.nombre || 'Cliente'}</strong>
          {cliente?.rif_cedula && <span>{cliente.rif_cedula}</span>}
        </div>

        {tieneCredito && (
          <div className={`ecb-vence ${tieneVencidas ? 'ecb-vence--alerta' : ''}`}>
            <CalendarClock size={15} />
            {tieneVencidas ? (
              <span>
                {resumen.cantidad_ordenes_vencidas} {resumen.cantidad_ordenes_vencidas === 1 ? 'vencida' : 'vencidas'} · {monto(resumen.deuda_vencida)}
              </span>
            ) : proxima ? (
              <span>
                Orden #{proxima.id} · {formatearFechaCorta(proxima.fecha_vencimiento)}
                {textoVencimiento(diasProxima) ? ` · ${textoVencimiento(diasProxima)}` : ''}
              </span>
            ) : (
              <span>Sin vencimientos próximos</span>
            )}
          </div>
        )}
      </footer>
    </section>
  )
}

// ---------------------------------------------------------------
// Acciones rápidas (circulares)
// ---------------------------------------------------------------
function AccionRapida({ icono: Icono, label, to, onClick, primaria = false, badge = 0, cargando = false, disabled = false }) {
  const contenido = (
    <>
      <span className={`ecb-accion__circulo ${primaria ? 'ecb-accion__circulo--primaria' : ''}`}>
        {cargando ? <Loader2 size={22} className="ecb-giro" /> : <Icono size={22} />}
        {badge > 0 && <span className="ecb-accion__badge" aria-label={`${badge} por pagar`}>{badge > 9 ? '9+' : badge}</span>}
      </span>
      <span className="ecb-accion__label">{label}</span>
    </>
  )
  if (to) return <Link to={to} className="ecb-accion">{contenido}</Link>
  return (
    <button type="button" className="ecb-accion" onClick={onClick} disabled={disabled || cargando}>
      {contenido}
    </button>
  )
}

// ---------------------------------------------------------------
// Extracto de movimientos
// ---------------------------------------------------------------
function Extracto({ movimientos, ocultar, onVerOrden, onVerFactura, onVerPago, onExportarFactura, onExportarComprobante, onPagarOrden }) {
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [visibles, setVisibles] = useState(PASO_EXTRACTO)

  const conteos = useMemo(() => {
    const c = { todos: movimientos.length, ordenes: 0, facturas: 0, pagos: 0 }
    movimientos.forEach((m) => {
      if (m.tipo === 'orden') c.ordenes += 1
      else if (m.tipo === 'factura') c.facturas += 1
      else c.pagos += 1
    })
    return c
  }, [movimientos])

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return movimientos.filter((m) => {
      if (filtro === 'ordenes' && m.tipo !== 'orden') return false
      if (filtro === 'facturas' && m.tipo !== 'factura') return false
      if (filtro === 'pagos' && m.tipo !== 'pago') return false
      if (termino) return m.textoBusqueda.includes(termino)
      return true
    })
  }, [movimientos, filtro, busqueda])

  const grupos = useMemo(() => {
    const out = []
    filtrados.slice(0, visibles).forEach((m) => {
      const clave = claveGrupoFecha(m.fecha)
      const ultimo = out[out.length - 1]
      if (ultimo && ultimo.clave === clave) ultimo.items.push(m)
      else out.push({ clave, items: [m] })
    })
    return out
  }, [filtrados, visibles])

  function cambiarFiltro(f) {
    setFiltro(f)
    setVisibles(PASO_EXTRACTO)
  }
  function cambiarBusqueda(v) {
    setBusqueda(v)
    setVisibles(PASO_EXTRACTO)
  }

  const FILTROS = [
    { key: 'todos', label: 'Todos' },
    { key: 'ordenes', label: 'Por pagar' },
    { key: 'facturas', label: 'Facturas' },
    { key: 'pagos', label: 'Pagos' },
  ]

  function abrir(m) {
    if (m.tipo === 'pago') onVerPago(m.raw)
    else if (m.tipo === 'factura') onVerFactura(m.raw)
    else onVerOrden(m.raw)
  }

  return (
    <section className="ecb-extracto" aria-label="Movimientos">
      <div className="ecb-extracto__cab">
        <h2 className="ecb-extracto__titulo">Movimientos</h2>
        <div className="ecb-buscador">
          <Search size={17} />
          <input
            type="search"
            placeholder="Buscar por # o monto"
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            aria-label="Buscar movimientos"
          />
          {busqueda && (
            <button type="button" className="ecb-buscador__limpiar" onClick={() => cambiarBusqueda('')} aria-label="Limpiar búsqueda">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="ecb-filtros" role="tablist" aria-label="Filtrar movimientos">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filtro === f.key}
            className={`ecb-filtro ${filtro === f.key ? 'ecb-filtro--activo' : ''}`}
            onClick={() => cambiarFiltro(f.key)}
          >
            {f.label}
            <span className="ecb-filtro__n">{conteos[f.key]}</span>
          </button>
        ))}
      </div>

      {grupos.length === 0 ? (
        <div className="ecb-vacio">
          <span className="ecb-vacio__icono"><Receipt size={26} /></span>
          {movimientos.length === 0 ? (
            <>
              <strong>Aún no tienes movimientos</strong>
              <p>Aquí verás tus órdenes por pagar, facturas y pagos.</p>
            </>
          ) : (
            <>
              <strong>Sin resultados</strong>
              <p>Prueba con otro número, monto o filtro.</p>
              <button type="button" className="ecb-link" onClick={() => { cambiarFiltro('todos'); cambiarBusqueda('') }}>
                Limpiar filtros
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {grupos.map((g) => (
            <div key={g.clave} className="ecb-grupo">
              <p className="ecb-grupo__titulo">{g.clave}</p>
              <ul className="ecb-lista">
                {g.items.map((m) => (
                  <li key={m.key} className="ecb-mov">
                    <button type="button" className="ecb-mov__main" onClick={() => abrir(m)}>
                      <span className={`ecb-mov__icono ecb-mov__icono--${m.tipo}${m.chip.tono === 'error' && m.tipo === 'orden' ? ' ecb-mov__icono--alerta' : ''}`}>
                        {m.tipo === 'pago' ? <ArrowDownLeft size={18} /> : m.tipo === 'factura' ? <Receipt size={18} /> : <Package size={18} />}
                      </span>
                      <span className="ecb-mov__info">
                        <span className="ecb-mov__titulo">{m.titulo}</span>
                        <span className="ecb-mov__sub">
                          {m.subtitulo && <span>{m.subtitulo}</span>}
                          <span className={`ecb-chip ecb-chip--${m.chip.tono}`}>{m.chip.label}</span>
                        </span>
                      </span>
                      <span className={`ecb-mov__monto ecb-mov__monto--${m.tipo}${m.chip.tono === 'error' && m.tipo === 'orden' ? ' ecb-mov__monto--alerta' : ''}`}>
                        {ocultar ? MASCARA : `${m.signo}${formatearUSD(m.monto)}`}
                      </span>
                    </button>

                    <div className="ecb-mov__acciones">
                      {m.pagable && (
                        <button type="button" className="ecb-mini ecb-mini--pagar" onClick={() => onPagarOrden(m.raw.id)}>
                          Pagar
                        </button>
                      )}
                      {m.tipo === 'factura' && (
                        <button type="button" className="ecb-mini" onClick={() => onExportarFactura(m.raw)} aria-label={`Descargar factura ${m.raw.numero_factura}`}>
                          <Download size={15} />
                        </button>
                      )}
                      {m.tipo === 'pago' && (
                        <button type="button" className="ecb-mini" onClick={() => onExportarComprobante(m.raw)} aria-label={`Descargar comprobante del pago ${m.raw.id}`}>
                          <Download size={15} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {filtrados.length > visibles && (
            <button type="button" className="ecb-vermas" onClick={() => setVisibles((v) => v + PASO_EXTRACTO)}>
              Ver más movimientos ({filtrados.length - visibles})
            </button>
          )}
        </>
      )}
    </section>
  )
}

// ---------------------------------------------------------------
// Columna lateral: ficha de cuenta + comparativa mensual
// ---------------------------------------------------------------
function FichaCuenta({ resumen, tieneCredito, porPagarCount, oculto }) {
  const monto = (v) => (oculto ? `USD ${MASCARA}` : formatearUSD(v))
  const filas = [
    ...(tieneCredito
      ? [
          { label: 'Disponible', valor: monto(resumen.saldo), negativo: resumen.saldo < 0 },
          { label: 'Deuda actual', valor: monto(resumen.deuda_actual) },
          { label: 'Línea total', valor: monto(resumen.linea_credito) },
          { label: 'Deuda vencida', valor: monto(resumen.deuda_vencida), negativo: resumen.deuda_vencida > 0 },
        ]
      : []),
    { label: 'Órdenes por pagar', valor: String(porPagarCount) },
  ]
  return (
    <section className="ecb-ficha" aria-label="Ficha de la cuenta">
      <h2 className="ecb-ficha__titulo">Tu cuenta</h2>
      <dl className="ecb-ficha__lista">
        {filas.map((f) => (
          <div key={f.label} className="ecb-ficha__fila">
            <dt>{f.label}</dt>
            <dd className={f.negativo ? 'ecb-ficha__neg' : ''}>{f.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function ComparativaMensual({ comparativa, oculto }) {
  const { mes_actual, mes_pasado, variacion_porcentaje } = comparativa
  const max = Math.max(1, mes_actual, mes_pasado)
  const alto = (v) => `${Math.max((v / max) * 100, v > 0 ? 6 : 0)}%`

  return (
    <section className="ecb-comp" aria-label="Comparativa mensual">
      <div className="ecb-comp__cab">
        <h2 className="ecb-ficha__titulo">Compras del mes</h2>
        {variacion_porcentaje !== null && variacion_porcentaje !== undefined && (
          <span className={`ecb-chip ${variacion_porcentaje >= 0 ? 'ecb-chip--info' : 'ecb-chip--neutro'}`}>
            {variacion_porcentaje >= 0 ? '↑' : '↓'} {Math.abs(variacion_porcentaje).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="ecb-comp__barras">
        {[
          { label: 'Este mes', valor: mes_actual, clase: 'actual' },
          { label: 'Mes pasado', valor: mes_pasado, clase: 'pasado' },
        ].map((b) => (
          <div key={b.label} className="ecb-comp__col">
            <div className="ecb-comp__pista">
              <div className={`ecb-comp__barra ecb-comp__barra--${b.clase}`} style={{ height: alto(b.valor) }} />
            </div>
            <span className="ecb-comp__valor">{oculto ? MASCARA : formatearUSD(b.valor)}</span>
            <span className="ecb-comp__label">{b.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------
// Página
// ---------------------------------------------------------------
export default function EstadoCuenta() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [datos, setDatos] = useState(null)
  const [comparativa, setComparativa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null)
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
  const [exportando, setExportando] = useState(false)
  const [errorPdf, setErrorPdf] = useState('')
  const [ocultar, setOcultar] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_OCULTAR) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      try {
        const { data } = await api.get(`/clientes/${user.id}/estado-cuenta`)
        if (cancelado) return
        setDatos(data)
        setError(false)
      } catch (err) {
        console.error(err)
        if (!cancelado) setError(true)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    api.get(`/clientes/${user.id}/estado-cuenta/comparativa`)
      .then(({ data }) => { if (!cancelado) setComparativa(data) })
      .catch(() => {})

    return () => { cancelado = true }
  }, [user.id, intento])

  function reintentar() {
    setError(false)
    setCargando(true)
    setIntento((n) => n + 1)
  }

  function alternarOcultar() {
    const nuevo = !ocultar
    setOcultar(nuevo)
    try {
      localStorage.setItem(CLAVE_OCULTAR, nuevo ? '1' : '0')
    } catch {
      /* sin storage: la preferencia vive solo en esta sesión */
    }
  }

  async function exportarEstadoCompletoPDF() {
    if (!datos) return
    setExportando(true)
    setErrorPdf('')
    try {
      // Reporte completo: desde el primer movimiento registrado hasta hoy.
      const fechas = [...datos.facturas, ...datos.pagos, ...datos.ordenes_pendientes]
        .map((m) => m.created_at)
        .filter(Boolean)
        .sort()
      const hoy = new Date().toISOString().split('T')[0]
      const desde = fechas.length ? fechas[0].split('T')[0] : hoy
      const { default: generarReporteEstadoCuentaPDF } = await import('../utils/generarReporteEstadoCuentaPDF')
      await generarReporteEstadoCuentaPDF({
        cliente: datos.cliente,
        resumen: datos.resumen,
        facturas: datos.facturas,
        pagos: datos.pagos,
        ordenes: datos.ordenes_pendientes,
        vencimientos: datos.ordenes_pendientes,
        desde,
        hasta: hoy,
      })
    } catch (err) {
      console.error(err)
      setErrorPdf('No se pudo generar el PDF. Inténtalo de nuevo.')
    } finally {
      setExportando(false)
    }
  }

  // Órdenes a contado que el cliente todavía puede pagar/reportar
  const ordenesPorPagarContado = useMemo(
    () => (datos?.ordenes_pendientes || []).filter(
      (o) => o.forma_pago === 'contado' && ['esperando', 'rechazado'].includes(o.estado_pago)
    ),
    [datos]
  )
  const porPagarContado = ordenesPorPagarContado.reduce((s, o) => s + Number(o.total_usd), 0)

  // Movimientos normalizados (una sola forma para pintar el extracto)
  const movimientos = useMemo(() => {
    if (!datos) return []
    const pagables = new Set(ordenesPorPagarContado.map((o) => o.id))

    const ordenes = (datos.ordenes_pendientes || []).map((o) => {
      const vence = o.fecha_vencimiento && !o.vencida ? textoVencimiento(diasHasta(o.fecha_vencimiento)) : null
      return {
        key: `orden-${o.id}`,
        tipo: 'orden',
        raw: o,
        fecha: o.created_at,
        titulo: `Orden #${o.id}`,
        subtitulo: [formatearHora(o.created_at), vence].filter(Boolean).join(' · '),
        monto: Number(o.total_usd || 0),
        signo: '',
        chip: chipDeOrden(o),
        pagable: pagables.has(o.id),
      }
    })
    const facturas = (datos.facturas || []).map((f) => ({
      key: `factura-${f.id}`,
      tipo: 'factura',
      raw: f,
      fecha: f.created_at,
      titulo: `Factura #${f.numero_factura}`,
      subtitulo: formatearHora(f.created_at),
      monto: Number(f.monto_facturado || f.monto || f.total_usd || 0),
      signo: '−',
      chip: chipDeEstado(f.estado === 'registrado' ? 'emitida' : f.estado),
      pagable: false,
    }))
    const pagos = (datos.pagos || []).map((p) => ({
      key: `pago-${p.id}`,
      tipo: 'pago',
      raw: p,
      fecha: p.created_at,
      titulo: `Pago #${p.id}`,
      subtitulo: formatearHora(p.created_at),
      monto: Number(p.monto || p.monto_facturado || p.total_usd || 0),
      signo: '+',
      chip: chipDeEstado(p.estado || 'verificado'),
      pagable: false,
    }))

    return [...ordenes, ...facturas, ...pagos]
      .map((m) => ({
        ...m,
        textoBusqueda: `${m.titulo} ${m.raw.id} ${m.raw.numero_factura || ''} ${m.monto}`.toLowerCase(),
      }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }, [datos, ordenesPorPagarContado])

  const resumen = datos?.resumen
  const tieneCredito = !!resumen && resumen.linea_credito > 0
  const porcentajeUsado = tieneCredito
    ? Math.min((resumen.deuda_actual / resumen.linea_credito) * 100, 100)
    : 0
  const tieneVencidas = !!resumen && resumen.cantidad_ordenes_vencidas > 0
  const nivel = porcentajeUsado >= 90 ? 'critico' : porcentajeUsado >= 80 ? 'alto' : null
  const nivelAlerta = tieneVencidas ? 'critico' : nivel
  const monto = (v) => (ocultar ? `USD ${MASCARA}` : formatearUSD(v))

  return (
    <LayoutPaginaPrincipal
      activo="estado-cuenta"
      titulo="Estado de cuenta"
      subtitulo="Tu línea de crédito y movimientos en un vistazo"
      nav={NAV_UNIFICADO}
    >
      {cargando ? (
        <Skeleton />
      ) : error || !datos ? (
        <div className="ecb-root">
          <div className="ecb-error">
            <span className="ecb-error__icono"><AlertCircle size={28} /></span>
            <h2>No pudimos cargar tu estado de cuenta</h2>
            <p>Revisa tu conexión e inténtalo de nuevo.</p>
            <button type="button" className="ecb-btn" onClick={reintentar}>
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        </div>
      ) : (
        <div className="ecb-root">
          <TarjetaCuenta
            resumen={resumen}
            cliente={datos.cliente}
            tieneCredito={tieneCredito}
            porcentajeUsado={porcentajeUsado}
            nivel={nivel}
            porPagarContado={porPagarContado}
            oculto={ocultar}
            onAlternar={alternarOcultar}
          />

          {errorPdf && (
            <div className="ecb-alerta ecb-alerta--aviso" role="alert">
              <AlertCircle size={18} />
              <div className="ecb-alerta__texto"><p>{errorPdf}</p></div>
              <button type="button" className="ecb-alerta__cerrar" onClick={() => setErrorPdf('')} aria-label="Cerrar aviso">
                <X size={15} />
              </button>
            </div>
          )}

          {tieneCredito && nivelAlerta && (
            <div className={`ecb-alerta ecb-alerta--${nivelAlerta === 'critico' ? 'critico' : 'aviso'}`} role="alert">
              <AlertTriangle size={20} />
              <div className="ecb-alerta__texto">
                {tieneVencidas ? (
                  <>
                    <strong>Tienes {resumen.cantidad_ordenes_vencidas} {resumen.cantidad_ordenes_vencidas === 1 ? 'orden vencida' : 'órdenes vencidas'}</strong>
                    <p>Suman {monto(resumen.deuda_vencida)}. Reporta el pago para evitar que se pause tu cuenta.</p>
                  </>
                ) : (
                  <>
                    <strong>{nivelAlerta === 'critico' ? 'Estás muy cerca de tu límite de crédito' : 'Tu línea de crédito se está agotando'}</strong>
                    <p>Usaste {Math.round(porcentajeUsado)}% de tu línea. Reporta un pago o solicita una ampliación.</p>
                  </>
                )}
              </div>
              <Link to={tieneVencidas ? '/pagos' : '/estado-de-cuenta/ampliacion'} className="ecb-alerta__cta">
                {tieneVencidas ? 'Pagar ahora' : 'Ver ampliación'}
              </Link>
            </div>
          )}

          <nav className="ecb-acciones" aria-label="Acciones rápidas">
            <AccionRapida icono={Banknote} label="Pagar" to="/pagos" primaria badge={ordenesPorPagarContado.length} />
            <AccionRapida icono={History} label="Pagos" to="/estado-de-cuenta/pagos" />
            <AccionRapida icono={Receipt} label="Facturas" to="/estado-de-cuenta/facturas" />
            <AccionRapida icono={BarChart3} label="Reportes" to="/estado-de-cuenta/reportes" />
            {tieneCredito && (
              <AccionRapida icono={TrendingUp} label="Ampliar" to="/estado-de-cuenta/ampliacion" />
            )}
            <AccionRapida icono={Download} label="Estado PDF" onClick={exportarEstadoCompletoPDF} cargando={exportando} />
          </nav>

          <div className="ecb-grid">
            <Extracto
              movimientos={movimientos}
              ocultar={ocultar}
              onVerOrden={setOrdenSeleccionada}
              onVerFactura={setFacturaSeleccionada}
              onVerPago={setPagoSeleccionado}
              onExportarFactura={(f) => exportarFacturaPDF(f, datos.cliente)}
              onExportarComprobante={(p) => exportarComprobantePago(p, datos.cliente, datos.facturas)}
              onPagarOrden={(id) => navigate('/pagos', { state: { ordenIds: [id] } })}
            />

            <aside className="ecb-lateral">
              <FichaCuenta
                resumen={resumen}
                tieneCredito={tieneCredito}
                porPagarCount={(datos.ordenes_pendientes || []).length}
                oculto={ocultar}
              />
              {comparativa && <ComparativaMensual comparativa={comparativa} oculto={ocultar} />}
            </aside>
          </div>
        </div>
      )}

      {ordenSeleccionada && <OrdenClienteModal orden={ordenSeleccionada} onClose={() => setOrdenSeleccionada(null)} />}
      {facturaSeleccionada && (
        <FacturaClienteModal
          factura={facturaSeleccionada}
          cliente={datos?.cliente}
          onClose={() => setFacturaSeleccionada(null)}
        />
      )}
      {pagoSeleccionado && (
        <PagoClienteModal
          pago={pagoSeleccionado}
          cliente={datos?.cliente}
          facturas={datos?.facturas}
          onClose={() => setPagoSeleccionado(null)}
        />
      )}
    </LayoutPaginaPrincipal>
  )
}
