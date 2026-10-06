import { X, Package } from 'lucide-react'
import { getEtapas, getLabelEstado, normalizarEstado } from '../config/estadosOrden'
import { formatearUSD } from '../utils/formato'
import './OrdenClienteModal.css'

export default function OrdenClienteModal({ orden, onClose }) {
  if (!orden) return null

  const fulfillment = orden.tipo_envio || 'delivery'
  const etapas = getEtapas(fulfillment)
  const estadoNormalizado = normalizarEstado(orden.estado)
  const esCancelada = estadoNormalizado === 'cancelado'
  const pasoActual = etapas.findIndex((e) => e.id === estadoNormalizado)
  const items = orden.items || orden.ordenes_items || orden.productos || []

  return (
    <div className="ocm-overlay" onClick={onClose}>
      <div className="ocm-content" onClick={(e) => e.stopPropagation()}>
        <button className="ocm-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        <div className="ocm-header">
          <h2 className="ocm-numero">Orden #{orden.id}</h2>
          <p className="ocm-fecha">
            {new Date(orden.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Progreso con puntos */}
        {esCancelada ? (
          <div className="ocm-estado-cancelado">
            <span className="ocm-badge ocm-badge--cancelado">Cancelada</span>
          </div>
        ) : (
          <div className="ocm-progreso">
            <div className="ocm-progreso-dots">
              {etapas.map((etapa, i) => (
                <div key={etapa.id} className={`ocm-dot ${i <= pasoActual ? 'ocm-dot--activo' : ''} ${i === pasoActual ? 'ocm-dot--actual' : ''}`} />
              ))}
            </div>
            <p className="ocm-progreso-label">
              {getLabelEstado(estadoNormalizado, { rol: 'cliente', fulfillmentMethod: fulfillment })}
              {pasoActual >= 0 && (
                <span className="ocm-progreso-contador"> · Paso {pasoActual + 1} de {etapas.length}</span>
              )}
            </p>
          </div>
        )}

        <div className="ocm-divider" />

        {/* Resumen de productos, compacto */}
        <div className="ocm-section">
          <h3 className="ocm-section-title"><Package size={16} /> Productos ({items.length})</h3>
          <div className="ocm-items">
            {items.map((item, i) => (
              <div key={item.id || i} className="ocm-item">
                <span className="ocm-item-nombre">
                  {item.nombre || item.producto?.nombre_comercial || item.productos?.nombre_comercial || 'Producto'}
                </span>
                <span className="ocm-item-cant">×{item.cantidad || 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ocm-divider" />

        <div className="ocm-total-row">
          <span>Total</span>
          <strong>{formatearUSD(orden.total_usd)}</strong>
        </div>

        <p className="ocm-estado-pago-nota">
          {orden.estado_pago === 'verificado'
            ? '✅ Esta orden ya fue pagada'
            : orden.estado_pago === 'reportado'
              ? '⏳ Pago reportado, en revisión'
              : '💳 Pendiente de pago'}
        </p>
      </div>
    </div>
  )
}