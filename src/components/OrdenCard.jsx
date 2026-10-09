import { Link } from 'react-router-dom'
import { ChevronRight, Scooter, Store, Truck } from 'lucide-react'
import { getEstadoVisual } from '../config/estadosOrden'
import { formatearMonto, formatearFechaCorta } from '../utils/formato'
import './OrdenCard.css'


// Tipo de envío → etiqueta con icono y color (ver .orden-card__envio--<id>).
const ENVIO_META = {
  delivery: { label: 'Delivery', icono: Scooter },
  envio_nacional: { label: 'Envío nacional', icono: Truck },
  retiro: { label: 'Retiro en tienda', icono: Store },
}

// props:
//   orden — la orden de GET /orders
//   aviso — nodo opcional a la derecha del monto (ej. "Pago pendiente")
export function OrdenCard({ orden, aviso = null }) {
  const estado = getEstadoVisual(orden.estado)

  const fechaCreacion = formatearFechaCorta(orden.created_at)

  // Los ítems anulados no cuentan para la orden.
  const items = (orden.ordenes_items || []).filter((item) => item.anulado !== true)
  const itemsTexto = items.length === 1 ? '1 artículo' : `${items.length} artículos`

  const comprador = orden.sub_usuarios?.nombre
  const hayMonto = orden.total_usd !== null && orden.total_usd !== undefined

  // Sin tipo_envio reconocido se asume retiro (mismo fallback que la UI previa).
  const envioId = ENVIO_META[orden.tipo_envio] ? orden.tipo_envio : 'retiro'
  const envio = ENVIO_META[envioId]
  const EnvioIcono = envio.icono

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

      {/* 1b · tipo de envío — etiqueta debajo de la identidad */}
      <span className={`orden-card__envio orden-card__envio--${envioId}`}>
        <EnvioIcono size={13} aria-hidden="true" />
        {envio.label}
      </span>

      {/* 2 · hechos */}
      <div className="orden-card__facts">
        {items.length > 0 && <span>{itemsTexto}</span>}
        {comprador && <span>Realizado por: {comprador}</span>}
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
