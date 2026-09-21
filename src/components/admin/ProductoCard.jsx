import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useFavoritos } from '../../context/FavoritosContext'
import AgregarAItemsModal from '../AgregarAItemsModal'
import { ProductoImagen } from '../icons/ProductoImagen'
import './ProductoCard.css'

function formatUSD(valor) {
  if (valor == null) return '—'
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function obtenerEtiquetaDescuento(descuento) {
  if (!descuento) return null
  if (descuento.tipo === 'monto') return 'Oferta Especial'
  const valor = Number(descuento.valor)
  if (valor >= 30) return 'Super Oferta'
  if (valor >= 20) return 'Descuento Promocional'
  if (valor >= 15) return 'Descuento Flash'
  return 'Descuento'
}

// Franja horaria → mensaje de entrega. El tramo 11am-12pm (no cubierto
// explícitamente) lo dejé dentro del bloque de "1 hora" (11am-3pm).
function obtenerMensajeEntrega(disponible) {
  if (!disponible) return 'Se despachará cuando esté disponible'
  const hora = new Date().getHours()
  if (hora >= 7 && hora < 11) return 'Entrega en 30 a 45 min'
  if (hora >= 11 && hora < 15) return 'Entrega en 1 hora'
  if (hora >= 15) return 'Entrega para mañana' // 3pm–12am
  return 'Entrega para las 10:00 am' // 12am–7am
}

// Retiro en tienda: corte a las 4:30pm. Si ya pasó, avisamos que es
// hasta mañana en vez de mostrar un horario que ya venció hoy.
function obtenerMensajeRetiro() {
  const ahora = new Date()
  const antesDelCorte = ahora.getHours() < 16 || (ahora.getHours() === 16 && ahora.getMinutes() <= 30)
  return antesDelCorte ? 'Retiro en tienda hasta las 4:30 pm' : 'Retiro en tienda disponible mañana'
}

function ProductCard({ producto, tasaVes, variante = 'vertical' }) {
  const { items: cartItems, addItem, removeItem, updateCantidad } = useCart()
  const { user } = useAuth()
  const { esFavorito, toggleFavorito } = useFavoritos()
  const navigate = useNavigate()

  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarContador, setMostrarContador] = useState(false)
  // toast: { tipo: 'carrito' | 'favorito-on' | 'favorito-off', key: number }
  // key fuerza remount para reiniciar la animación en clicks consecutivos
  const [toast, setToast] = useState(null)
  const [favoritoPop, setFavoritoPop] = useState(false)

  const confirmTimerRef = useRef(null)
  const hideConfirmTimerRef = useRef(null)
  const favoritoPopTimerRef = useRef(null)
  const toastKeyRef = useRef(0)

  function dispararToast(tipo) {
    clearTimeout(hideConfirmTimerRef.current)
    toastKeyRef.current += 1
    setToast({ tipo, key: toastKeyRef.current })
    hideConfirmTimerRef.current = setTimeout(() => setToast(null), 1800)
  }

  const precioVes = tasaVes && producto.precio_usd != null
    ? (producto.precio_usd * tasaVes).toFixed(2)
    : null

  const tieneDescuento = producto.precio_original_usd != null && producto.descuento_activo
  const etiquetaDescuento = tieneDescuento ? obtenerEtiquetaDescuento(producto.descuento_activo) : null

  const badgeSocial = producto.badge_social || null
  const esPatrocinado = producto.sponsored || false
  const favorito = esFavorito(producto.id)

  const itemEnCarrito = cartItems.find(i => i.producto.id === producto.id)
  const cantidad = itemEnCarrito?.cantidad || 0

  function handleAgregar(e) {
    e.stopPropagation()
    if (cantidad === 0) addItem(producto, 1)
    setMostrarContador(true)

    clearTimeout(confirmTimerRef.current)
    confirmTimerRef.current = setTimeout(() => {
      dispararToast('carrito')
    }, 500)
  }

  function handleSumar(e) {
    e.stopPropagation()
    updateCantidad(producto.id, cantidad + 1)
  }

  function handleRestar(e) {
    e.stopPropagation()
    if (cantidad <= 1) {
      removeItem(producto.id)
      setMostrarContador(false)
      setToast(null)
      clearTimeout(confirmTimerRef.current)
      clearTimeout(hideConfirmTimerRef.current)
    } else {
      updateCantidad(producto.id, cantidad - 1)
    }
  }

  function handleFavorito(e) {
    e.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    const estabaFavorito = favorito
    toggleFavorito(producto)
    dispararToast(estabaFavorito ? 'favorito-off' : 'favorito-on')

    clearTimeout(favoritoPopTimerRef.current)
    setFavoritoPop(true)
    favoritoPopTimerRef.current = setTimeout(() => setFavoritoPop(false), 260)
  }

  useEffect(() => {
    return () => {
      clearTimeout(confirmTimerRef.current)
      clearTimeout(hideConfirmTimerRef.current)
      clearTimeout(favoritoPopTimerRef.current)
    }
  }, [])

  const mensajeToast = {
    'carrito': '✓ Agregado al carrito',
    'favorito-on': '♥ Agregado a favoritos',
    'favorito-off': 'Quitado de favoritos',
  }

  // ---------- Variante horizontal (compacta, para carruseles) ----------
  if (variante === 'horizontal') {
    return (
      <>
        <div className="pcard pcard--horizontal">
          <div
            className="pcard__media"
            onClick={() => navigate(`/producto/${producto.id}`)}
          >
            {etiquetaDescuento && (
              <span className="pcard__badge-descuento pcard__badge-descuento--chip">{etiquetaDescuento}</span>
            )}

            <button
              type="button"
              className={`pcard__fav ${favorito ? 'pcard__fav--activo' : ''} ${favoritoPop ? 'pcard__fav--pop' : ''}`}
              onClick={handleFavorito}
              aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <Heart size={16} fill={favorito ? 'currentColor' : 'none'} strokeWidth={2} />
            </button>

            <ProductoImagen
              src={producto.foto_url}
              alt={producto.nombre_comercial}
              className="pcard__image"
              loading="lazy"
            />
          </div>

          <div className="pcard__body pcard__body--horizontal">
            <h3
              className="pcard__nombre pcard__nombre--horizontal"
              onClick={() => navigate(`/producto/${producto.id}`)}
            >
              {producto.nombre_comercial}
            </h3>

            <div className="pcard__precios">
              {tieneDescuento ? (
                <>
                  <span className="pcard__precio-ahora">
                    <span className="pcard__precio-simbolo">$</span><span className="pcard__precio-numero">{formatUSD(producto.precio_usd)}</span>
                  </span>
                  <span className="pcard__precio-original">
                    ${formatUSD(producto.precio_original_usd)}
                  </span>
                </>
              ) : (
                <span className="pcard__precio-normal">
                  <span className="pcard__precio-simbolo">$</span><span className="pcard__precio-numero">{formatUSD(producto.precio_usd)}</span>
                </span>
              )}
            </div>

            {(mostrarContador || cantidad > 0) ? (
              <div className="pcard__contador">
                <button className="contador-btn" onClick={handleRestar} aria-label="Quitar uno">−</button>
                <span className="contador-cantidad">{cantidad}</span>
                <button className="contador-btn" onClick={handleSumar} aria-label="Agregar uno">+</button>
              </div>
            ) : (
              <button className="pcard__btn-agregar pcard__btn-agregar--horizontal" onClick={handleAgregar}>
                + Agregar
              </button>
            )}
          </div>

          {toast && (
            <div key={toast.key} className={`pcard__toast pcard__toast--${toast.tipo}`} role="status">
              {mensajeToast[toast.tipo]}
            </div>
          )}
        </div>

        {mostrarModal && (
          <AgregarAItemsModal
            producto={producto}
            onClose={() => setMostrarModal(false)}
          />
        )}
      </>
    )
  }

  // ---------- Variante vertical (default — catálogo/grid, diseño Walmart) ----------
  return (
    <>
      <div className="pcard">
        {badgeSocial && (
          <div className="pcard__top-badge">
            <span className="pcard__badge-social">{badgeSocial}</span>
          </div>
        )}

        {/* Versión "arriba de la tarjeta" — solo visible en mobile (ver CSS).
            En escritorio se sigue mostrando montada sobre la imagen, dentro
            de .pcard__media, sin ningún cambio. */}
        {etiquetaDescuento && (
          <div className="pcard__top-badge pcard__top-badge--descuento-mobile">
            <span className={`pcard__badge-descuento-pill ${etiquetaDescuento === 'Super Oferta' ? 'pcard__badge-descuento-pill--fuerte' : ''}`}>
              {etiquetaDescuento}
            </span>
          </div>
        )}

        {/* Bloque 1: Media */}
        <div
          className="pcard__media"
          onClick={() => navigate(`/producto/${producto.id}`)}
        >
          {etiquetaDescuento && (
            <span className={`pcard__badge-descuento ${etiquetaDescuento === 'Super Oferta' ? 'pcard__badge-descuento--fuerte' : 'pcard__badge-descuento--chip'}`}>
              {etiquetaDescuento}
            </span>
          )}

          <button
            type="button"
            className={`pcard__fav ${favorito ? 'pcard__fav--activo' : ''} ${favoritoPop ? 'pcard__fav--pop' : ''}`}
            onClick={handleFavorito}
            aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart size={16} fill={favorito ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>

          <ProductoImagen
            src={producto.foto_url}
            alt={producto.nombre_comercial}
            className="pcard__image"
            loading="lazy"
          />
        </div>

        {/* Bloque 2: Contenido — el orden de aquí en adelante es
            "botón, precio, nombre..." en desktop/tablet. En mobile
            el CSS reordena el botón al final con `order`. */}
        <div className="pcard__body">
          <div className="pcard__acciones">
            {user && (
              <button
                className="pcard__btn-items"
                onClick={(e) => { e.stopPropagation(); setMostrarModal(true) }}
                title="Agregar a una lista"
                aria-label="Agregar a una lista"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"></path>
                </svg>
                <span className="pcard__btn-items-label">Agregar a lista</span>
              </button>
            )}

            {(mostrarContador || cantidad > 0) ? (
              <div className="pcard__contador">
                <button className="contador-btn" onClick={handleRestar} aria-label="Quitar uno">−</button>
                <span className="contador-cantidad">{cantidad}</span>
                <button className="contador-btn" onClick={handleSumar} aria-label="Agregar uno">+</button>
              </div>
            ) : (
              <button className="pcard__btn-agregar" onClick={handleAgregar}>
                + Agregar
              </button>
            )}
          </div>

          {esPatrocinado && (
            <p className="pcard__sponsored">
              Patrocinado <span className="pcard__sponsored-info" title="Producto patrocinado">ⓘ</span>
            </p>
          )}

          <div className="pcard__precios">
            {tieneDescuento ? (
              <>
                <span className="pcard__precio-ahora">
                  Ahora <span className="pcard__precio-simbolo">$</span><span className="pcard__precio-numero">{formatUSD(producto.precio_usd)}</span>
                </span>
                <span className="pcard__precio-original">
                  ${formatUSD(producto.precio_original_usd)}
                </span>
              </>
            ) : (
              <span className="pcard__precio-normal">
                <span className="pcard__precio-simbolo">$</span><span className="pcard__precio-numero">{formatUSD(producto.precio_usd)}</span>
              </span>
            )}
            {precioVes && (
              <span className="pcard__precio-ves">
                ≈ Bs. {precioVes}
              </span>
            )}
          </div>

          <h3
            className="pcard__nombre"
            onClick={() => navigate(`/producto/${producto.id}`)}
          >
            {producto.nombre_comercial}
          </h3>
          <p className="pcard__marca">
            {producto.marcas?.nombre || producto.laboratorio || ''}
          </p>

          <p className="pcard__save-with">Ahorra con <strong>Plan Carrisán+</strong></p>

          <div className="pcard__delivery-info">
            <p className="pcard__delivery-arrive">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="pcard__delivery-rayo">
                <path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z" />
              </svg>
              {obtenerMensajeEntrega(producto.disponible)}
            </p>
            <p className="pcard__delivery-pickup">{obtenerMensajeRetiro()}</p>
          </div>

        </div>

        {toast && (
          <div key={toast.key} className={`pcard__toast pcard__toast--${toast.tipo}`} role="status">
            {mensajeToast[toast.tipo]}
          </div>
        )}
      </div>

      {mostrarModal && (
        <AgregarAItemsModal
          producto={producto}
          onClose={() => setMostrarModal(false)}
        />
      )}
    </>
  )
}

export default ProductCard