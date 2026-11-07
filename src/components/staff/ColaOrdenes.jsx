import { useState } from 'react'
import { Bike, Clock, Download, Eye, MapPin, Phone, Store, Truck } from 'lucide-react'
import { getEstadoConfig, getLabelEstado, normalizarEstado } from '../../config/estadosOrden'
import { formatearUSD } from '../../utils/formato'
import StaffEstado from './StaffEstado'
import StaffModal from './StaffModal'
import './ColaOrdenes.css'

// Componentes y helpers compartidos por las 7 colas logisticas (Ordenes
// Nuevas, Preparar, Retiros, Delivery, Envios, Incidencias, Completadas).
//
// REGLA DE ORO (spec 5.1): un item anulado NUNCA se oculta y SIEMPRE se tacha,
// con su nota y su importe explicito ($12.00 -> $0.00). Un item que desaparece
// de la lista es indistinguible de uno que nunca se pidio, que es justo la
// incoherencia que reporto el dueno. Este archivo es el UNICO lugar del
// frontend staff que sabe como se ve un item agotado — por eso ModalVerOrden
// (mas abajo) reusa ItemsOrden en vez de reimplementar su propia lista.

export function formatUSD(valor) {
  return Number(valor || 0).toFixed(2)
}

export function formatFecha(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function formatFechaHora(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const fecha = d.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })
    const hora = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
    return `${fecha} · ${hora}`
  } catch {
    return ''
  }
}

export function etiquetaEnvio(orden) {
  const t = orden.tipo_envio
  if (t === 'delivery') return 'Delivery'
  if (t === 'envio_nacional') return 'Envío nacional'
  return 'Retiro en tienda'
}

export function direccion(orden) {
  if (orden.tipo_envio === 'delivery') {
    const d = orden.direcciones_envio
    return d ? `${d.direccion || ''}, ${d.ciudad || ''} ${d.estado || ''}`.replace(/^,\s*/, '').trim() || 'Dirección no disponible' : 'Dirección no disponible'
  }
  if (orden.tipo_envio === 'envio_nacional') return `Envío nacional — ${orden.agencia_envio || 'agencia'}`
  return 'Retiro en tienda'
}

// Icono + color por tipo de envío — un único lugar para esa asociación,
// reusado por la tarjeta compacta y por ModalVerOrden.
function infoEnvio(orden) {
  if (orden.tipo_envio === 'delivery') return { Icono: Bike, color: '#D97706' }
  if (orden.tipo_envio === 'envio_nacional') return { Icono: Truck, color: '#0052DC' }
  return { Icono: Store, color: '#1A1A3A' }
}

// Lista de items de una orden. Escribe "$importe -> $0.00" en los agotados para
// que la vista cuadre con orden.total_usd (el backend ya lo recalculo
// excluyendolos) y para que se vea POR QUE bajo el total.
export function ItemsOrden({ items = [] }) {
  return (
    <ul className="sp-card-items">
      {items.map((item) => (
        <li key={item.id} className={item.anulado ? 'sp-item--anulado' : ''}>
          <span className="sp-item__nombre">
            {item.cantidad}x {item.productos?.nombre_comercial}
          </span>
          {item.anulado ? (
            <>
              <span className="sp-item__agotado"> — agotado{item.nota_anulacion ? `: ${item.nota_anulacion}` : ''}</span>
              <span className="sp-item__importe">
                {' '}${formatUSD(Number(item.precio_unitario || 0) * item.cantidad)} → $0.00
              </span>
            </>
          ) : (
            <span className="sp-item__importe"> — ${formatUSD(item.precio_unitario)} c/u</span>
          )}
        </li>
      ))}
    </ul>
  )
}

// Botón "Ver orden completa" — mismo trigger en las 7 colas (las 5 que pasan
// por ColaOrdenes lo reciben solas; Delivery y Envíos, que tienen su propia
// tarjeta, lo importan y lo colocan a mano junto a "Orden #123").
export function BotonVerOrden({ onClick }) {
  return (
    <button type="button" className="sp-ver-btn" onClick={onClick} aria-label="Ver orden completa">
      <Eye size={15} aria-hidden="true" />
    </button>
  )
}

// Detalle de una orden, de solo lectura — mismo nivel de información que
// OrdenDetalleModal.jsx (cliente/admin), pero con los items vía ItemsOrden
// (ver REGLA DE ORO arriba) y con las claves reales que trae el staff
// (`item.productos`, plural). Incluye el mismo generador de PDF que usa el
// cliente en /orders/:id (utils/generarOrdenPDF.js), cargado bajo demanda.
export function ModalVerOrden({ orden, onClose }) {
  const [descargando, setDescargando] = useState(false)
  if (!orden) return null

  const items = Array.isArray(orden.ordenes_items) ? orden.ordenes_items : []
  const envio = infoEnvio(orden)
  const EnvioIcono = envio.Icono
  const estadoNorm = normalizarEstado(orden.estado)
  const estadoCfg = getEstadoConfig(estadoNorm) || { color: '#64748b', bg: '#f1f5f9' }
  const tieneDireccion = orden.tipo_envio === 'delivery' || orden.tipo_envio === 'envio_nacional'

  async function descargarPDF() {
    setDescargando(true)
    try {
      const { default: generarOrdenPDF } = await import('../../utils/generarOrdenPDF')
      await generarOrdenPDF({ orden, cliente: null })
    } catch (err) {
      console.error('Error al generar el PDF de la orden', err)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <StaffModal titulo={`Orden #${orden.id}`} ancho="sm" onCerrar={onClose}>
      <div className="odm-header">
        <p className="odm-fecha">{formatFechaHora(orden.created_at)}</p>
        <span className="odm-badge" style={{ color: estadoCfg.color, background: estadoCfg.bg }}>
          {getLabelEstado(estadoNorm, { rol: 'staff' })}
        </span>
      </div>

      <div className="odm-cliente">
        <div className="odm-cliente-avatar">{(orden.users?.nombre || '?').trim().charAt(0).toUpperCase()}</div>
        <div className="odm-cliente-info">
          <strong>{orden.users?.nombre || 'Cliente'}</strong>
          {orden.users?.email && <span>{orden.users.email}</span>}
          {orden.users?.telefono && (
            <span><Phone size={12} aria-hidden="true" /> {orden.users.telefono}</span>
          )}
        </div>
      </div>

      <div className="odm-divider" />

      <div className="odm-envio-card" style={{ borderLeftColor: envio.color }}>
        <div className="odm-envio-row">
          <span className="odm-envio-label"><EnvioIcono size={14} aria-hidden="true" /> Envío</span>
          <span className="odm-envio-valor">{etiquetaEnvio(orden)}</span>
        </div>
        {tieneDireccion && (
          <div className="odm-envio-direccion">
            <span className="odm-envio-label"><MapPin size={12} aria-hidden="true" /></span>
            <span className="odm-envio-valor">{direccion(orden)}</span>
          </div>
        )}
      </div>

      <div className="odm-divider" />

      <div className="odm-section">
        <p className="odm-section-title">Productos ({items.length})</p>
        <ItemsOrden items={items} />
      </div>

      <div className="odm-divider" />

      <div className="odm-totales">
        <div className="odm-total-final">
          <span>Total</span>
          <span className="odm-total-valor">{formatearUSD(orden.total_usd)}</span>
        </div>
      </div>

      <button type="button" className="odm-descargar-btn" onClick={descargarPDF} disabled={descargando}>
        <Download size={16} aria-hidden="true" />
        {descargando ? 'Generando PDF…' : 'Descargar PDF'}
      </button>
    </StaffModal>
  )
}

// Card de una orden en una cola logistica. No tiene acciones propias: las
// inyecta cada pagina con `renderAcciones`.
export default function ColaOrdenes({
  ordenes = [],
  cargando = false,
  error = '',
  titulo = '',
  descripcion = '',
  vacio = 'No hay nada por aquí.',
  renderAcciones,
  badge,
  onReintentar,
}) {
  const [ordenVista, setOrdenVista] = useState(null)

  if (cargando) return <StaffEstado tipo="cargando" />
  if (error) return <StaffEstado tipo="error" mensaje={error} onReintentar={onReintentar} />
  if (ordenes.length === 0) return <StaffEstado tipo="vacio" titulo={vacio} />

  return (
    <div>
      {titulo && <h2 className="sp-titulo-cola">{titulo}</h2>}
      {descripcion && <p className="sp-meta">{descripcion}</p>}
      <div className="sp-lista">
        {ordenes.map((orden) => {
          const items = Array.isArray(orden.ordenes_items) ? orden.ordenes_items : []
          const agotados = items.filter((i) => i.anulado).length
          const envio = infoEnvio(orden)
          const EnvioIcono = envio.Icono
          const estadoNorm = normalizarEstado(orden.estado)
          const estadoCfg = getEstadoConfig(estadoNorm)
          return (
            <div key={orden.id} className="sp-card-wrap">
              <div className="sp-card">
                <div className="sp-card-head">
                  <div className="sp-card-head__id">
                    <p className="sp-card-titulo">Orden #{orden.id}</p>
                    <BotonVerOrden onClick={() => setOrdenVista(orden)} />
                  </div>
                  <span className="sp-card-total">{formatearUSD(orden.total_usd)}</span>
                </div>

                <div className="sp-card-chips">
                  {badge ? badge(orden) : (
                    <span className={`sp-badge ${orden.forma_pago === 'credito' ? 'sp-badge--credito' : 'sp-badge--contado'}`}>
                      {orden.forma_pago === 'credito' ? 'Crédito' : 'Contado'}
                    </span>
                  )}
                  {estadoCfg && (
                    <span className="sp-chip" style={{ color: estadoCfg.color, background: estadoCfg.bg }}>
                      {getLabelEstado(estadoNorm, { rol: 'staff' })}
                    </span>
                  )}
                  {orden.created_at && (
                    <span className="sp-chip sp-chip--neutro">
                      <Clock size={12} aria-hidden="true" /> {formatFecha(orden.created_at)}
                    </span>
                  )}
                </div>

                <p className="sp-card-cliente">
                  <strong>{orden.users?.nombre}</strong>
                  {orden.users?.telefono && (
                    <span><Phone size={12} aria-hidden="true" /> {orden.users.telefono}</span>
                  )}
                </p>

                {(orden.direcciones_envio || orden.agencia_envio) && (
                  <p className="sp-card-meta">
                    <EnvioIcono size={13} aria-hidden="true" /> {direccion(orden)}
                  </p>
                )}

                <ItemsOrden items={items} />
                {agotados > 0 && (
                  <p className="sp-ajuste">
                    {agotados} {agotados === 1 ? 'producto agotado' : 'productos agotados'} · total ajustado
                  </p>
                )}
              </div>
              {renderAcciones && <div className="sp-acciones">{renderAcciones(orden)}</div>}
            </div>
          )
        })}
      </div>
      <ModalVerOrden orden={ordenVista} onClose={() => setOrdenVista(null)} />
    </div>
  )
}