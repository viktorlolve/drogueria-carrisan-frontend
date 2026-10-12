import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, Check, ShoppingCart, X } from 'lucide-react'
import './MisItems.css'

// Separa parte entera y centavos para formato superíndice: $1⁰⁶
// (clases fav-precio-*: autocontenidas, no dependen de Catalogo.css/Ofertas.css)
function Precio({ valor }) {
  if (valor == null) return <span>—</span>
  const [entero, centavos] = Number(valor).toFixed(2).split('.')
  return (
    <>
      <span className="fav-precio__simbolo">$</span>
      <span className="fav-precio__entero">{entero}</span>
      <sup className="fav-precio__centavos">{centavos}</sup>
    </>
  )
}

function aVes(precioUsd, tasaVes) {
  if (!tasaVes || precioUsd == null) return null
  return Number((precioUsd * tasaVes).toFixed(2)).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ---------------------------------------------------------------
// Tarjeta de producto única para Mis Items (favoritos, listas y
// "Comprar de nuevo"): antes eran tres tarjetas casi iguales.
//
//  · Guardar en lista (marcador) y quitar (✕) como botones sobre la foto.
//  · En modo selección la tarjeta entera marca/desmarca y los botones se ocultan.
//  · vista: 'grid' (tarjeta vertical) | 'lista' (fila).
// ---------------------------------------------------------------
export default function TarjetaProducto({
  producto,
  vista = 'grid',
  tasaVes,
  cantidadEnCarrito = 0,
  onAgregar,
  onGuardar,
  enAlgunaLista = false,
  onQuitar,
  etiquetaQuitar = 'Quitar',
  badge,
  modoSeleccion = false,
  seleccionado = false,
  onToggleSeleccion,
}) {
  // CartContext.addItem ignora en silencio los productos sin precio (se piden por
  // requerimiento); por eso en vez de un "Agregar" que no hace nada, se ofrece "Consultar".
  const sinPrecio = producto?.precio_usd == null || Number(producto.precio_usd) <= 0
  const tieneDescuento = producto?.precio_original_usd != null && producto?.descuento_activo
  const precioVes = aVes(producto?.precio_usd, tasaVes)

  const imagen = producto?.foto_url ? (
    <img src={producto.foto_url} alt={producto.nombre_comercial} loading="lazy" />
  ) : (
    <span className="fav-card__sin-imagen">Sin imagen</span>
  )

  return (
    <article
      className={`fav-card fav-card--${vista} ${seleccionado ? 'fav-card--sel' : ''} ${modoSeleccion ? 'fav-card--modo-sel' : ''}`}
      onClick={modoSeleccion ? onToggleSeleccion : undefined}
    >
      <div className="fav-card__media-wrap">
        {modoSeleccion ? (
          <button
            type="button"
            className="fav-card__media"
            onClick={(e) => { e.stopPropagation(); onToggleSeleccion() }}
            aria-pressed={seleccionado}
            aria-label={`${seleccionado ? 'Quitar de la selección' : 'Seleccionar'}: ${producto?.nombre_comercial}`}
          >
            {imagen}
          </button>
        ) : (
          <Link to={`/producto/${producto?.id}`} className="fav-card__media">
            {imagen}
          </Link>
        )}

        {badge && <span className="fav-card__badge">{badge}</span>}

        {modoSeleccion ? (
          <span className={`fav-card__check ${seleccionado ? 'fav-card__check--on' : ''}`} aria-hidden="true">
            {seleccionado && <Check size={14} strokeWidth={3} />}
          </span>
        ) : (
          <div className="fav-card__acciones">
            {onGuardar && (
              <button
                type="button"
                className={`fav-card__icono ${enAlgunaLista ? 'fav-card__icono--on' : ''}`}
                onClick={onGuardar}
                aria-label={`Guardar en una lista: ${producto?.nombre_comercial}`}
              >
                {enAlgunaLista ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
              </button>
            )}
            {onQuitar && (
              <button
                type="button"
                className="fav-card__icono"
                onClick={onQuitar}
                aria-label={`${etiquetaQuitar}: ${producto?.nombre_comercial}`}
              >
                <X size={17} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="fav-card__body">
        <div className="fav-card__info">
          {modoSeleccion ? (
            <p className="fav-card__nombre">{producto?.nombre_comercial}</p>
          ) : (
            <Link to={`/producto/${producto?.id}`} className="fav-card__nombre">
              {producto?.nombre_comercial}
            </Link>
          )}

          <div className="fav-card__precios">
            {sinPrecio ? (
              <span className="fav-card__consultar">Consultar precio</span>
            ) : tieneDescuento ? (
              <>
                <span className="fav-card__precio-ahora">
                  <span className="fav-card__ahora-label">Ahora</span>
                  <Precio valor={producto.precio_usd} />
                </span>
                <span className="fav-card__precio-original">
                  <Precio valor={producto.precio_original_usd} />
                </span>
              </>
            ) : (
              <span className="fav-card__precio-normal">
                <Precio valor={producto?.precio_usd} />
              </span>
            )}
            {!sinPrecio && precioVes && <span className="fav-card__precio-ves">≈ Bs. {precioVes}</span>}
          </div>
        </div>

        {sinPrecio && !modoSeleccion ? (
          <Link to={`/producto/${producto?.id}`} className="fav-card__cta fav-card__cta--consultar">
            Consultar
          </Link>
        ) : (
          <button
            type="button"
            className={`fav-card__cta ${cantidadEnCarrito ? 'fav-card__cta--en-carrito' : ''}`}
            onClick={(e) => { e.stopPropagation(); onAgregar() }}
            disabled={modoSeleccion || sinPrecio}
          >
            <ShoppingCart size={15} />
            {cantidadEnCarrito ? `En carrito · ${cantidadEnCarrito}` : 'Agregar'}
          </button>
        )}
      </div>
    </article>
  )
}