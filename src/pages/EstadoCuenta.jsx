import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
  Wallet, FileText, DollarSign, Download, Loader2,
  AlertCircle, CreditCard, Search, Package, Clock, CalendarClock, History, Eye,
  X, Upload,
} from 'lucide-react'
import OrdenClienteModal from '../components/OrdenClienteModal'
import PagoClienteModal from '../components/PagoClienteModal'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import './EstadoCuenta.css'
import generarFacturaPDF from '../utils/generarFacturaPDF'
import generarComprobantePagoPDF from '../utils/generarComprobantePagoPDF'
import { formatearUSD } from '../utils/formato'

// ---------------------------------------------------------------
// Estado de Cuenta — ahora migrada a <LayoutPaginaPrincipal> (mismo
// patrón que MisOrdenes/MisItems/MiCuenta): ya no trae su propio
// sidebar/drawer, usa NAV_ESTADO_CUENTA como menú propio.
//
// Rediseño estilo "dashboard bancario": gauge semicircular de línea
// de crédito como pieza central (SVG a mano, sin librería de charts),
// fila de KPIs, comparativa mensual en mini-barras, banner de alerta
// cuando el uso de crédito es alto, y dos placeholders (próximo
// corte / órdenes por vencer) que quedan reservados a propósito —
// ver nota de "Próximamente" más abajo.
// ---------------------------------------------------------------

async function exportarFacturaPDF(factura, cliente) {
  await generarFacturaPDF({ factura, cliente })
}

async function exportarComprobantePago(pago, cliente, facturas) {
  await generarComprobantePagoPDF({ pago, cliente, facturas })
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

export default function EstadoCuenta() {
  const { user } = useAuth()
  const [datos, setDatos] = useState(null)
  const [comparativa, setComparativa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null)
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false)

  useEffect(() => {
    cargarEstadoCuenta()
    api.get(`/clientes/${user.id}/estado-cuenta/comparativa`)
      .then(({ data }) => setComparativa(data))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarEstadoCuenta() {
    setCargando(true)
    try {
      const { data } = await api.get(`/clientes/${user.id}/estado-cuenta`)
      setDatos(data)
      setError('')
    } catch (err) {
      setError('No se pudo cargar el estado de cuenta')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function reportarPago({ orden_ids, url_comprobante }) {
    await api.post('/reportes-pago', { orden_ids, url_comprobante })
    await cargarEstadoCuenta()
  }

  async function exportarEstadoCompletoPDF() {
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
  }

  const historial = useMemo(() => {
    if (!datos) return []
    return [
      ...datos.ordenes_pendientes.map(o => ({ ...o, tipo: 'orden_pendiente' })),
      ...datos.facturas.map(f => ({ ...f, tipo: 'factura' })),
      ...datos.pagos.map(p => ({ ...p, tipo: 'pago' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [datos])

  const historialFiltrado = useMemo(() => {
    return historial.filter((mov) => {
      if (filtro === 'facturas' && mov.tipo !== 'factura') return false
      if (filtro === 'pagos' && mov.tipo !== 'pago') return false
      if (filtro === 'ordenes' && mov.tipo !== 'orden_pendiente') return false
      if (busqueda.trim()) {
        const termino = busqueda.trim().toLowerCase()
        const idTexto = `${mov.numero_factura || mov.id}`
        const montoTexto = `${mov.monto_facturado || mov.monto || mov.total_usd}`
        return idTexto.toLowerCase().includes(termino) || montoTexto.includes(termino)
      }
      return true
    })
  }, [historial, filtro, busqueda])

  const gruposPorFecha = useMemo(() => {
    const grupos = {}
    historialFiltrado.forEach((mov) => {
      const clave = claveGrupoFecha(mov.created_at)
      if (!grupos[clave]) grupos[clave] = []
      grupos[clave].push(mov)
    })
    return grupos
  }, [historialFiltrado])

  const ordenesPendientesContado = useMemo(() => {
    if (!datos) return []
    return (datos.ordenes_pendientes || []).filter(
      (o) => o.forma_pago === 'contado' && ['esperando', 'rechazado'].includes(o.estado_pago)
    )
  }, [datos])

  const acciones = (
    <button className="ec-btn-exportar" onClick={exportarEstadoCompletoPDF} disabled={!datos}>
      <Download size={16} />
      <span>Exportar</span>
    </button>
  )

  return (
    <LayoutPaginaPrincipal
      activo="estado-cuenta"
      titulo="Estado de cuenta"
      subtitulo="Tu línea de crédito y movimientos en un vistazo"
      nav={NAV_UNIFICADO}
      acciones={acciones}
    >
      <div className="ec-dashboard">
        {error && (
          <div className="ec-alerta-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {cargando ? (
          <div className="ec-estado-cargando">
            <Loader2 className="ec-spinner" size={28} />
            <p>Cargando estado de cuenta…</p>
          </div>
        ) : datos && (
          <ContenidoDashboard
            datos={datos}
            comparativa={comparativa}
            gruposPorFecha={gruposPorFecha}
            filtro={filtro}
            setFiltro={setFiltro}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            onSeleccionarOrden={setOrdenSeleccionada}
            onSeleccionarPago={setPagoSeleccionado}
            onReportarPago={() => setModalPagoAbierto(true)}
            onExportarFactura={exportarFacturaPDF}
            onExportarComprobante={(p, c) => exportarComprobantePago(p, c, datos?.facturas)}
          />
        )}
      </div>

      {ordenSeleccionada && <OrdenClienteModal orden={ordenSeleccionada} onClose={() => setOrdenSeleccionada(null)} />}
      {pagoSeleccionado && <PagoClienteModal pago={pagoSeleccionado} cliente={datos?.cliente} facturas={datos?.facturas} onClose={() => setPagoSeleccionado(null)} />}
      
      {modalPagoAbierto && (
        <ModalReportarPago
          ordenesDisponibles={ordenesPendientesContado}
          onCerrar={() => setModalPagoAbierto(false)}
          onEnviar={reportarPago}
        />
      )}
    </LayoutPaginaPrincipal>
  )
}

// ---------------------------------------------------------------
// Modal para reportar pago de órdenes a contado
// ---------------------------------------------------------------
function ModalReportarPago({ ordenesDisponibles, onCerrar, onEnviar }) {
  const [seleccionadas, setSeleccionadas] = useState([])
  const [comprobante, setComprobante] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  function alternarOrden(id) {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const totalSeleccionado = ordenesDisponibles
    .filter((o) => seleccionadas.includes(o.id))
    .reduce((sum, o) => sum + Number(o.total_usd), 0)

  // TODO: conectar con el mecanismo real de subida (Supabase Storage /
  // endpoint /upload propio) — debe devolver la URL pública del archivo.
  async function subirComprobante() {
    throw new Error('subirComprobante() no implementado todavía')
  }

  async function manejarEnvio(e) {
    e.preventDefault()
    if (seleccionadas.length === 0) {
      setError('Selecciona al menos una orden a pagar')
      return
    }
    if (!comprobante) {
      setError('Adjunta el comprobante de pago')
      return
    }
    setEnviando(true)
    setError('')
    try {
      const url_comprobante = await subirComprobante(comprobante)
      await onEnviar({ orden_ids: seleccionadas, url_comprobante })
      onCerrar()
    } catch {
      setError('No se pudo enviar el reporte de pago. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={manejarEnvio}>
        <div className="modal__encabezado">
          <h3>Reportar pago</h3>
          <button type="button" onClick={onCerrar}><X size={20} /></button>
        </div>

        <div className="modal__cuerpo modal__cuerpo--form">
          {ordenesDisponibles.length === 0 ? (
            <p>No tienes órdenes a contado pendientes de pago.</p>
          ) : (
            <>
              <p className="modal__label-grupo">¿Qué órdenes estás pagando?</p>
              <ul className="modal__ordenes-lista">
                {ordenesDisponibles.map((o) => (
                  <li key={o.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={seleccionadas.includes(o.id)}
                        onChange={() => alternarOrden(o.id)}
                      />
                      <span>Orden #{o.id} — {formatearUSD(o.total_usd)}</span>
                    </label>
                  </li>
                ))}
              </ul>

              {seleccionadas.length > 0 && (
                <p className="modal__total-seleccionado">
                  Total a reportar: <strong>{formatearUSD(totalSeleccionado)}</strong>
                </p>
              )}

              <label>
                Comprobante de pago
                <div className="modal__upload">
                  <Upload size={16} />
                  <span>{comprobante ? comprobante.name : 'Subir imagen o PDF'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                  />
                </div>
              </label>
            </>
          )}

          {error && <p className="modal__error"><AlertCircle size={14} /> {error}</p>}
        </div>

        <div className="modal__pie">
          <button type="button" className="btn btn--secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn btn--primario" disabled={enviando || ordenesDisponibles.length === 0}>
            {enviando ? 'Enviando…' : 'Enviar reporte'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------
// Contenido principal — separado del componente de página para
// que el early-return de "cargando" arriba se mantenga simple.
// ---------------------------------------------------------------
function ContenidoDashboard({
  datos, comparativa, gruposPorFecha, filtro, setFiltro, busqueda, setBusqueda,
  onSeleccionarOrden, onSeleccionarPago, onReportarPago,
  onExportarFactura, onExportarComprobante,
}) {
  const { resumen, cliente } = datos
  const tieneCredito = resumen.linea_credito > 0
  const porcentajeUsado = tieneCredito
    ? Math.min((resumen.deuda_actual / resumen.linea_credito) * 100, 100)
    : 0
  const tieneVencidas = resumen.cantidad_ordenes_vencidas > 0
  const nivelAlerta = tieneVencidas
    ? 'critico'
    : porcentajeUsado >= 90 ? 'critico' : porcentajeUsado >= 80 ? 'alto' : null

  return (
    <>
      {tieneCredito ? (
        <GaugeCredito resumen={resumen} porcentajeUsado={porcentajeUsado} />
      ) : (
        <BannerContado onReportarPago={onReportarPago} />
      )}

      {nivelAlerta && (
        <div className={`ec-banner-alerta ec-banner-alerta--${nivelAlerta}`}>
          <AlertCircle size={18} />
          <div>
            {tieneVencidas ? (
              <>
                <strong>Tenés {resumen.cantidad_ordenes_vencidas} {resumen.cantidad_ordenes_vencidas === 1 ? 'orden vencida' : 'órdenes vencidas'}</strong>
                <p>Suman {formatearUSD(resumen.deuda_vencida)}. Reportá el pago para evitar que se pause tu cuenta.</p>
              </>
            ) : (
              <>
                <strong>{nivelAlerta === 'critico' ? 'Estás muy cerca de tu límite de crédito' : 'Tu línea de crédito se está agotando'}</strong>
                <p>Usaste {Math.round(porcentajeUsado)}% de tu línea disponible. Considera reportar un pago o solicitar una ampliación.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Fila de KPIs */}
      <section className="ec-kpis">
        <div className="ec-kpi">
          <span className="ec-kpi__label">Disponible</span>
          <strong className={`ec-kpi__valor ${resumen.saldo < 0 ? 'ec-kpi__valor--negativo' : ''}`}>
            {formatearUSD(resumen.saldo)}
          </strong>
        </div>
        <div className="ec-kpi">
          <span className="ec-kpi__label">Deuda actual</span>
          <strong className="ec-kpi__valor">{formatearUSD(resumen.deuda_actual)}</strong>
        </div>
        <div className="ec-kpi">
          <span className="ec-kpi__label">Línea total</span>
          <strong className="ec-kpi__valor">{formatearUSD(resumen.linea_credito)}</strong>
        </div>
      </section>

      {/* Vencimientos */}
      <section className="ec-proximamente">
        <div className="ec-proximamente__card">
          <div className="ec-proximamente__icono"><CalendarClock size={18} /></div>
          <div className="ec-proximamente__texto">
            <span className="ec-proximamente__titulo">Próxima orden por vencer</span>
            {resumen.proxima_orden_vencer ? (
              <span className="ec-proximamente__valor">
                Orden #{resumen.proxima_orden_vencer.id} — {new Date(resumen.proxima_orden_vencer.fecha_vencimiento).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
              </span>
            ) : (
              <span className="ec-proximamente__etiqueta">Sin órdenes con vencimiento</span>
            )}
          </div>
        </div>
        <div className="ec-proximamente__card">
          <div className={`ec-proximamente__icono ${resumen.cantidad_ordenes_vencidas > 0 ? 'ec-proximamente__icono--alerta' : ''}`}><Clock size={18} /></div>
          <div className="ec-proximamente__texto">
            <span className="ec-proximamente__titulo">Órdenes vencidas</span>
            {resumen.cantidad_ordenes_vencidas > 0 ? (
              <span className="ec-proximamente__valor ec-proximamente__valor--alerta">
                {resumen.cantidad_ordenes_vencidas} · {formatearUSD(resumen.deuda_vencida)}
              </span>
            ) : (
              <span className="ec-proximamente__etiqueta">Al día</span>
            )}
          </div>
        </div>
      </section>

      {comparativa && <ComparativaMensual comparativa={comparativa} />}

      {/* Accesos rápidos */}
      <section className="ec-accesos">
        <button className="ec-acceso" onClick={onReportarPago}>
          <div className="ec-acceso__icono"><DollarSign size={20} /></div>
          <span>Reportar pago</span>
        </button>
        <Link className="ec-acceso" to="/estado-de-cuenta/pagos">
          <div className="ec-acceso__icono"><History size={20} /></div>
          <span>Historial de pagos</span>
        </Link>
        <Link className="ec-acceso" to="/estado-de-cuenta/facturas">
          <div className="ec-acceso__icono"><FileText size={20} /></div>
          <span>Ver facturas</span>
        </Link>
        <button className="ec-acceso" onClick={() => window.print()}>
          <div className="ec-acceso__icono"><CreditCard size={20} /></div>
          <span>Descargar estado</span>
        </button>
      </section>

      {/* Movimientos */}
      <section className="ec-movimientos">
        <div className="ec-movimientos__toolbar">
          <div className="ec-buscador">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar transacción (# o monto)"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="ec-filtros">
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'ordenes', label: 'Por pagar' },
              { key: 'facturas', label: 'Facturas' },
              { key: 'pagos', label: 'Pagos' },
            ].map((f) => (
              <button
                key={f.key}
                className={`ec-filtros__pill ${filtro === f.key ? 'ec-filtros__pill--activo' : ''}`}
                onClick={() => setFiltro(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {Object.keys(gruposPorFecha).length === 0 ? (
          <p className="ec-movimientos__vacio">No hay movimientos que coincidan</p>
        ) : (
          Object.entries(gruposPorFecha).map(([fechaLabel, movimientos]) => (
            <div key={fechaLabel} className="ec-grupo-fecha">
              <p className="ec-grupo-fecha__titulo">{fechaLabel}</p>
              <ul className="ec-movimientos__lista">
                {movimientos.map((mov) => (
                  <li
                    key={`${mov.tipo}-${mov.id}`}
                    className="ec-movimiento"
                    onClick={() => {
                      if (mov.tipo === 'pago') onSeleccionarPago(mov)
                      else if (mov.tipo === 'orden_pendiente') onSeleccionarOrden(mov)
                    }}
                  >
                    <div className={`ec-movimiento__icono ec-movimiento__icono--${mov.tipo === 'factura' ? 'factura' : mov.tipo === 'pago' ? 'pago' : 'orden'}`}>
                      {mov.tipo === 'factura' ? <FileText size={18} /> : mov.tipo === 'pago' ? <DollarSign size={18} /> : <Package size={18} />}
                    </div>
                    <div className="ec-movimiento__info">
                      <span className="ec-movimiento__titulo">
                        {mov.tipo === 'factura' ? `Factura #${mov.numero_factura}` : mov.tipo === 'pago' ? `Pago #${mov.id}` : `Orden #${mov.id}`}
                      </span>
                      <span className={`ec-badge ec-badge--${mov.tipo === 'orden_pendiente' ? (mov.vencida ? 'vencido' : 'pendiente') : (mov.estado || 'registrado')}`}>
                        {mov.tipo === 'orden_pendiente' ? (mov.vencida ? 'vencida' : 'por pagar') : (mov.estado || 'registrado')}
                      </span>
                    </div>
                    <strong className={`ec-movimiento__monto ${mov.tipo === 'pago' ? 'ec-movimiento__monto--verde' : 'ec-movimiento__monto--rojo'}`}>
                      {mov.tipo === 'pago' ? '+' : '-'}{formatearUSD(mov.monto_facturado || mov.monto || mov.total_usd)}
                    </strong>
                    
                    <div className="movimiento__acciones" onClick={(e) => e.stopPropagation()}>
                      {mov.tipo === 'factura' ? (
                        <>
                          <button title="Ver orden" onClick={() => onSeleccionarOrden(mov)}>
                            <Eye size={16} />
                          </button>
                          <button title="Exportar PDF" onClick={() => onExportarFactura(mov, cliente)}>
                            <Download size={16} />
                          </button>
                        </>
                      ) : mov.tipo === 'pago' ? (
                        <button title="Exportar comprobante" onClick={() => onExportarComprobante(mov, cliente)}>
                          <Download size={16} />
                        </button>
                      ) : (
                        <button title="Ver orden" onClick={() => onSeleccionarOrden(mov)}>
                          <Eye size={16} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </>
  )
}

// ---------------------------------------------------------------
// Gauge semicircular de línea de crédito — SVG a mano (sin librería
// de charts). El arco de fondo es la línea completa, el arco de
// color es lo usado; el centro muestra el disponible en grande.
// El color del arco cambia según qué tan cerca está del límite,
// igual criterio que BloqueCredito en MiCuenta.jsx.
// ---------------------------------------------------------------
function GaugeCredito({ resumen, porcentajeUsado }) {
  const RADIO = 80
  const CX = 100
  const CY = 100
  const CIRC_MEDIA = Math.PI * RADIO // longitud de un semicírculo

  const colorArco = porcentajeUsado >= 90 ? 'var(--ec-negativo)' : porcentajeUsado >= 60 ? 'var(--ec-warning)' : 'var(--ec-accent-glow)'

  // Arco de 180°, de izquierda (9 en punto) a derecha (3 en punto), pasando por arriba
  const puntoArco = (porcentaje) => {
    const angulo = Math.PI - (porcentaje / 100) * Math.PI
    return {
      x: CX + RADIO * Math.cos(angulo),
      y: CY - RADIO * Math.sin(angulo),
    }
  }

  const inicio = puntoArco(0)
  const finProgreso = puntoArco(porcentajeUsado)
  const finTotal = puntoArco(100)
  const largeArcProgreso = porcentajeUsado > 50 ? 1 : 0

  return (
    <section className="ec-gauge-card">
      <div className="ec-gauge-card__cabecera">
        <span className="ec-gauge-card__label">Estado de tu línea de crédito</span>
        <span className="ec-gauge-card__porcentaje">{Math.round(porcentajeUsado)}% usado</span>
      </div>

      <div className="ec-gauge">
        <svg viewBox="0 0 200 115" className="ec-gauge__svg">
          <path
            d={`M ${inicio.x} ${inicio.y} A ${RADIO} ${RADIO} 0 1 1 ${finTotal.x} ${finTotal.y}`}
            className="ec-gauge__fondo"
            strokeDasharray={CIRC_MEDIA}
          />
          <path
            d={`M ${inicio.x} ${inicio.y} A ${RADIO} ${RADIO} 0 ${largeArcProgreso} 1 ${finProgreso.x} ${finProgreso.y}`}
            className="ec-gauge__progreso"
            style={{ stroke: colorArco }}
          />
        </svg>

        <div className="ec-gauge__centro">
          <span className="ec-gauge__centro-label">Disponible</span>
          <strong className={`ec-gauge__centro-monto ${resumen.saldo < 0 ? 'ec-gauge__centro-monto--negativo' : ''}`}>
            {formatearUSD(resumen.saldo)}
          </strong>
        </div>
      </div>

      <div className="ec-gauge-card__cifras">
        <div className="ec-gauge-card__cifra">
          <span className="ec-gauge-card__punto" style={{ background: colorArco }} />
          <span>Deuda: <strong>{formatearUSD(resumen.deuda_actual)}</strong></span>
        </div>
        <div className="ec-gauge-card__cifra">
          <span className="ec-gauge-card__punto ec-gauge-card__punto--fondo" />
          <span>Línea: <strong>{formatearUSD(resumen.linea_credito)}</strong></span>
        </div>
      </div>
    </section>
  )
}

// Cliente de contado — no tiene línea de crédito, así que en vez del
// gauge mostramos un banner simple con CTA a reportar pago.
function BannerContado({ onReportarPago }) {
  return (
    <section className="ec-banner-contado">
      <div className="ec-banner-contado__icono"><Wallet size={22} /></div>
      <div className="ec-banner-contado__texto">
        <strong>Cliente de contado</strong>
        <p>No tenés línea de crédito activa. Reportá tus pagos aquí después de cada compra.</p>
      </div>
      <button className="ec-banner-contado__cta" onClick={onReportarPago}>Reportar pago</button>
    </section>
  )
}

// Comparativa mensual — mini gráfico de dos barras (mes actual vs
// mes pasado) reemplazando el badge de texto que había antes.
function ComparativaMensual({ comparativa }) {
  const { mes_actual, mes_pasado, variacion_porcentaje } = comparativa
  const max = Math.max(1, mes_actual, mes_pasado)

  return (
    <section className="ec-comparativa">
      <div className="ec-comparativa__header">
        <span className="ec-comparativa__titulo">Comparativa mensual</span>
        {variacion_porcentaje !== null && (
          <span className={`ec-comp-badge ${variacion_porcentaje >= 0 ? 'ec-comp-badge--sube' : 'ec-comp-badge--baja'}`}>
            {variacion_porcentaje >= 0 ? '↑' : '↓'} {Math.abs(variacion_porcentaje).toFixed(0)}%
          </span>
        )}
      </div>

      <div className="ec-comparativa__barras">
        <div className="ec-comparativa__columna">
          <div className="ec-comparativa__barra-wrap">
            <div className="ec-comparativa__barra ec-comparativa__barra--actual" style={{ height: `${Math.max((mes_actual / max) * 100, mes_actual > 0 ? 6 : 0)}%` }} />
          </div>
          <span className="ec-comparativa__valor">{formatearUSD(mes_actual)}</span>
          <span className="ec-comparativa__mes-label">Este mes</span>
        </div>
        <div className="ec-comparativa__columna">
          <div className="ec-comparativa__barra-wrap">
            <div className="ec-comparativa__barra ec-comparativa__barra--pasado" style={{ height: `${Math.max((mes_pasado / max) * 100, mes_pasado > 0 ? 6 : 0)}%` }} />
          </div>
          <span className="ec-comparativa__valor">{formatearUSD(mes_pasado)}</span>
          <span className="ec-comparativa__mes-label">Mes pasado</span>
        </div>
      </div>
    </section>
  )
}