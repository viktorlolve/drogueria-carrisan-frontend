import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useFavoritos } from '../context/FavoritosContext'
import AgregarAItemsModal from './AgregarAItemsModal'
import { ProductoImagen } from './icons/ProductoImagen'
import './ProductCard.css'

function formatUSD(valor) {
  if (valor == null) return '—'
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Separa parte entera y centavos para formato superíndice: $1⁰⁶
function PrecioSuperIndice({ valor }) {
  if (valor == null) return <span>—</span>
  const partes = Number(valor).toFixed(2).split('.')
  return (
    <>
      <span className="pcard__precio-simbolo">$</span>
      <span className="pcard__precio-entero">{partes[0]}</span>
      <sup className="pcard__precio-centavos">{partes[1]}</sup>
    </>
  )
}

// Renderiza estrellas (llenas, medias, vacías) + total de reseñas.
// Si el producto no tiene valoraciones, muestra 5 estrellas grises y (S/V).
function Estrellas({ promedio, total }) {
  const sinValoraciones = promedio == null || promedio === 0 || !total

  const estrellas = []
  for (let i = 1; i <= 5; i++) {
    if (sinValoraciones) {
      estrellas.push('☆')
    } else if (i <= Math.floor(promedio)) {
      estrellas.push('★')
    } else if (i - promedio < 1 && i - promedio > 0) {
      estrellas.push('★') // media estrella se muestra como llena por simplicidad
    } else {
      estrellas.push('☆')
    }
  }

  return (
    <span className={`pcard__rating ${sinValoraciones ? 'pcard__rating--vacio' : ''}`}>
      <span className="pcard__rating-stars">{estrellas.join('')}</span>
      <span className="pcard__rating-count">{sinValoraciones ? '(S/V)' : `(${total})`}</span>
    </span>
  )
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
  if (hora >= 7 && hora < 11) return (<><span>Entrega en </span><strong>30 a 45 min</strong></>)
  if (hora >= 11 && hora < 15) return (<><span>Entrega en </span><strong>1 hora</strong></>)
  if (hora >= 15) return (<><span>Entrega para </span><strong>mañana</strong></>) // 3pm–12am
  return (<><span>Entrega para las </span><strong>10:00 am</strong></>) // 12am–7am
}

// Retiro en tienda: corte a las 4:30pm. Si ya pasó, avisamos que es
// hasta mañana en vez de mostrar un horario que ya venció hoy.
function obtenerMensajeRetiro() {
  const ahora = new Date()
  const antesDelCorte = ahora.getHours() < 16 || (ahora.getHours() === 16 && ahora.getMinutes() <= 30)
  return antesDelCorte ? (<><span>Retiro en tienda hasta las </span><strong>4:30 pm</strong></>) : (<><span>Retiro en tienda disponible </span><strong>mañana</strong></>)
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
    ? Number((producto.precio_usd * tasaVes).toFixed(2)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null

  const tieneDescuento = producto.precio_original_usd != null && producto.descuento_activo
  const etiquetaDescuento = tieneDescuento ? obtenerEtiquetaDescuento(producto.descuento_activo) : null

  // Producto sin precio ("consultar precio"): no se puede agregar al
  // carrito; la CTA llevará a la ficha para solicitarlo por requerimiento.
  const sinPrecio = producto.precio_usd == null || Number(producto.precio_usd) <= 0

  const badgeSocial = producto.badge_social || null
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
              <Heart size={18} fill={favorito ? 'currentColor' : 'none'} strokeWidth={2} />
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
                    <span className="pcard__precio-ahora-label">Ahora</span>
                    <PrecioSuperIndice valor={producto.precio_usd} />
                  </span>
                  <span className="pcard__precio-original">
                    ${formatUSD(producto.precio_original_usd)}
                  </span>
                </>
              ) : (
                <span className="pcard__precio-normal">
                  <PrecioSuperIndice valor={producto.precio_usd} />
                </span>
              )}
            </div>

            {sinPrecio ? (
              <button
                className="pcard__btn-consultar pcard__btn-consultar--horizontal"
                onClick={(e) => { e.stopPropagation(); navigate(`/producto/${producto.id}`) }}
              >
                Consultar
              </button>
            ) : (mostrarContador || cantidad > 0) ? (
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

        {/* Badge de descuento ARRIBA de la foto (todos los tamaños).
            Así el toast (top: 14px) cae sobre esta etiqueta y no tapa
            la foto. El contenedor reserva SIEMPRE el mismo alto (con
            la pastilla en blanco si no hay descuento) para que todas
            las tarjetas queden parejas. */}
        <div className="pcard__top-badge pcard__top-badge--descuento">
          {etiquetaDescuento && (
            <span className={`pcard__badge-descuento-pill ${etiquetaDescuento === 'Super Oferta' ? 'pcard__badge-descuento-pill--fuerte' : ''}`}>
              {etiquetaDescuento}
            </span>
          )}
        </div>

        {/* Bloque 1: Media */}
        <div
          className="pcard__media"
          onClick={() => navigate(`/producto/${producto.id}`)}
        >
          <button
            type="button"
            className={`pcard__fav ${favorito ? 'pcard__fav--activo' : ''} ${favoritoPop ? 'pcard__fav--pop' : ''}`}
            onClick={handleFavorito}
            aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart size={18} fill={favorito ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>

          <ProductoImagen
            src={producto.foto_url}
            alt={producto.nombre_comercial}
            className="pcard__image"
            loading="lazy"
          />
        </div>

        {/* Bloque 2: Contenido — el orden natural es precio → nombre →
            marca → delivery → acciones. En mobile el CSS reordena las
            acciones al fondo con `order`. */}
        <div className="pcard__body">
          <div className="pcard__precios">
            {tieneDescuento ? (
              <>
                <span className="pcard__precio-ahora">
                  <span className="pcard__precio-ahora-label">Ahora</span>
                  <PrecioSuperIndice valor={producto.precio_usd} />
                </span>
                <span className="pcard__precio-original">
                  <PrecioSuperIndice valor={producto.precio_original_usd} />
                </span>
              </>
            ) : (
              <span className="pcard__precio-normal">
                <PrecioSuperIndice valor={producto.precio_usd} />
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

          <Estrellas promedio={producto.rating_promedio} total={producto.rating_total} />

          <p className="pcard__marca">
            {producto.marcas?.nombre || producto.laboratorio || ''}
          </p>

          <p className="pcard__save-with">Ahorra con <strong>Plan Carrisan+</strong></p>

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

        {/* Bloque 3: Acciones — sección separada de ancho completo,
            como el badge de descuento arriba. En mobile ocupa toda
            la fila inferior del card. */}
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

          {sinPrecio ? (
            <button
              className="pcard__btn-consultar"
              onClick={(e) => { e.stopPropagation(); navigate(`/producto/${producto.id}`) }}
            >
              Consultar
            </button>
          ) : (mostrarContador || cantidad > 0) ? (
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