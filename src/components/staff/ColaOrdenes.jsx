import { getLabelEstado } from '../../config/estadosOrden'
import './ColaOrdenes.css'

// Componentes y helpers compartidos por las 6 colas logisticas.
//
// REGLA DE ORO (spec 5.1): un item anulado NUNCA se oculta y SIEMPRE se tacha,
// con su nota y su importe explicito ($12.00 -> $0.00). Un item que desaparece
// de la lista es indistinguible de uno que nunca se pidio, que es justo la
// incoherencia que reporto el dueno. Este archivo es el UNICO lugar del
// frontend staff que sabe como se ve un item agotado.

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
}) {
  if (cargando) return <p>Cargando...</p>
  if (error) return <p className="sp-error">{error}</p>
  if (ordenes.length === 0) return <p>{vacio}</p>

  return (
    <div>
      {titulo && <h2 className="sp-titulo-cola">{titulo}</h2>}
      {descripcion && <p className="sp-meta">{descripcion}</p>}
      {ordenes.map((orden) => {
        const items = Array.isArray(orden.ordenes_items) ? orden.ordenes_items : []
        const agotados = items.filter((i) => i.anulado).length
        return (
          <div key={orden.id} className="sp-card-wrap">
            <div className="sp-card">
              <div className="sp-card-head">
                <p className="sp-card-titulo">Orden #{orden.id} — ${formatUSD(orden.total_usd)}</p>
                {badge ? badge(orden) : (
                  <span className={`sp-badge ${orden.forma_pago === 'credito' ? 'sp-badge--credito' : 'sp-badge--contado'}`}>
                    {orden.forma_pago === 'credito' ? 'Crédito' : 'Contado'}
                  </span>
                )}
              </div>
              <p className="sp-card-cliente">
                {orden.users?.nombre} {orden.users?.telefono ? `— ${orden.users.telefono}` : ''}
                {orden.estado ? ` · ${getLabelEstado(orden.estado, { rol: 'staff' })}` : ''}
                {orden.created_at ? ` · ${formatFecha(orden.created_at)}` : ''}
              </p>
              {(orden.direcciones_envio || orden.agencia_envio) && (
                <p className="sp-card-meta"><strong>Envío:</strong> {direccion(orden)}</p>
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
  )
}
