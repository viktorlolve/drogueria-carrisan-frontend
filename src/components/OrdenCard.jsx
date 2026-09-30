import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { getEstadoVisual } from '../config/estadosOrden'
import { formatearMonto, formatearFechaCorta } from '../utils/formato'
import './OrdenCard.css'

// ---------------------------------------------------------------
// OrdenCard — la tarjeta de un pedido, compartida por el carrusel de
// "Tus pedidos" (Mi Cuenta) y el grid de "Mis Órdenes".
//
// Cuatro rangos, un trabajo cada uno:
//   1. identidad → "Orden #123" + fecha de creación (sello dd/mm/yy)
//   2. hechos    → envío · artículos válidos · última actualización · quién
//   3. dinero    → el total, en línea propia (nunca compite con el estado)
//   4. estado    → banda a sangre con el label de estadosOrden.js
//
// El label y los colores del estado SIEMPRE salen de getEstadoVisual()
// (fuente única: src/config/estadosOrden.js). Nada de "pago pendiente":
// es una condición de estado_pago, no un estado logístico — por eso el
// consumidor la pasa como `aviso` y la card no sabe de pagos.
//
// La card NO trae ancho: el contenedor decide (carrusel horizontal en
// Mi Cuenta, grid en Mis Órdenes). Solo define su propia caja.
// ---------------------------------------------------------------

const ETIQUETAS_ENVIO = {
  delivery: 'Delivery',
  envio_nacional: 'Envío nacional',
  retiro: 'Retiro en tienda',
}

// Última actualización SOLO si cae en otro día calendario que la creación:
// el updated_at se toca al crear la orden, así que el mismo día es ruido.
function fechaActualizacion(orden) {
  const creada = orden.created_at ? new Date(orden.created_at) : null
  const actualizada = orden.updated_at ? new Date(orden.updated_at) : null
  if (!creada || Number.isNaN(creada.getTime())) return null
  if (!actualizada || Number.isNaN(actualizada.getTime())) return null
  const dia = (f) => `${f.getFullYear()}-${f.getMonth() + 1}-${f.getDate()}`
  return dia(actualizada) === dia(creada) ? null : formatearFechaCorta(orden.updated_at)
}

// props:
//   orden           — la orden de GET /orders
//   mostrarCliente  — admin: agrega el nombre del titular como hecho
//                     (para un cliente normal sería "vos misma", o sea ruido)
//   aviso           — nodo opcional a la derecha del monto (ej. "Pago pendiente")
export function OrdenCard({ orden, mostrarCliente = false, aviso = null }) {
  const estado = getEstadoVisual(orden.estado)

  const fechaCreacion = formatearFechaCorta(orden.created_at)
  const fechaCambio = fechaActualizacion(orden)

  // Los ítems anulados no cuentan para la orden.
  const items = (orden.ordenes_items || []).filter((item) => item.anulado !== true)
  const itemsTexto = items.length === 1 ? '1 artículo' : `${items.length} artículos`

  const comprador = orden.sub_usuarios?.nombre
  const cliente = mostrarCliente ? orden.users?.nombre : null
  const hayMonto = orden.total_usd !== null && orden.total_usd !== undefined

  return (
    <Link to={`/orders/${orden.id}`} className="orden-card">
      {/* 1 · identidad */}
      <div className="orden-card__top">
        <span className="orden-card__titulo">Orden #{orden.id}</span>
        {fechaCreacion && (
          <span className="orden-card__fecha">
            <time dateTime={orden.created_at}>{fechaCreacion}</time>
          </span>
        )}
        <span className="orden-card__ir" aria-hidden="true">
          <ChevronRight size={14} />
        </span>
      </div>

      {/* 2 · hechos */}
      <div className="orden-card__facts">
        <span>{ETIQUETAS_ENVIO[orden.tipo_envio] || ETIQUETAS_ENVIO.retiro}</span>
        {items.length > 0 && <span>{itemsTexto}</span>}
        {fechaCambio && <span>Cambió {fechaCambio}</span>}
        {comprador && <span>Realizado por: {comprador}</span>}
        {cliente && <span>Cliente: {cliente}</span>}
      </div>

      {/* 3 · dinero — línea propia, nunca recortada */}
      <div className="orden-card__linea-monto">
        <span className="orden-card__monto">
          {hayMonto ? formatearMonto(orden.total_usd) : '—'}
        </span>
        {aviso}
      </div>

      {/* 4 · estado — banda a sangre; los colores entran por --estado-color */}
      <span
        className="orden-card__estado"
        style={{ background: estado.bg, '--estado-color': estado.color }}
      >
        {estado.label}
      </span>
    </Link>
  )
}

// Silueta de la card para el estado de carga: misma caja, misma banda, sin
// datos. No es un <Link> (no lleva a ningún lado mientras carga).
export function OrdenCardSkeleton() {
  return (
    <div className="orden-card orden-card--skeleton" aria-hidden="true">
      <div className="orden-card__top">
        <div className="orden-skeleton-line orden-skeleton-line--titulo" />
        <div className="orden-skeleton-line orden-skeleton-line--fecha" />
      </div>
      <div className="orden-card__facts">
        <div className="orden-skeleton-line orden-skeleton-line--hecho" />
      </div>
      <div className="orden-card__linea-monto">
        <div className="orden-skeleton-line orden-skeleton-line--monto" />
      </div>
      <span className="orden-card__estado orden-card__estado--cargando" />
    </div>
  )
}
