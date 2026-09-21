import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useFavoritos } from '../context/FavoritosContext'
import { ProductoImagen } from './icons/ProductoImagen'
import './PromoCardGrande.css'

function PrecioSuperIndice({ valor }) {
  if (valor == null) return <span>—</span>
  const partes = Number(valor).toFixed(2).split('.')
  return (
    <>
      <span className="promocard-g__precio-simbolo">$</span>
      <span className="promocard-g__precio-entero">{partes[0]}</span>
      <sup className="promocard-g__precio-centavos">{partes[1]}</sup>
    </>
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

// Card grande para carruseles de la sección promocional: misma
// funcionalidad que PromoCard (favorito, agregar al carrito, precios)
// pero con dimensiones más grandes para mostrar 3 por vez.
function PromoCardGrande({ producto, tasaVes }) {
  const navigate = useNavigate()
  const { items: cartItems, addItem, removeItem, updateCantidad } = useCart()
  const { user } = useAuth()
  const { esFavorito, toggleFavorito } = useFavoritos()

  const [mostrarContador, setMostrarContador] = useState(false)
  const [favoritoPop, setFavoritoPop] = useState(false)
  const favoritoPopTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      clearTimeout(favoritoPopTimerRef.current)
    }
  }, [])

  const precioVes = tasaVes && producto.precio_usd != null
    ? (producto.precio_usd * tasaVes).toFixed(2)
    : null

  const tieneDescuento = producto.precio_original_usd != null && producto.descuento_activo
  const etiquetaDescuento = tieneDescuento ? obtenerEtiquetaDescuento(producto.descuento_activo) : null

  const itemEnCarrito = cartItems.find(i => i.producto.id === producto.id)
  const cantidad = itemEnCarrito?.cantidad || 0
  const favorito = esFavorito(producto.id)

  function handleAgregar(e) {
    e.stopPropagation()
    if (cantidad === 0) addItem(producto, 1)
    setMostrarContador(true)
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
    toggleFavorito(producto)

    clearTimeout(favoritoPopTimerRef.current)
    setFavoritoPop(true)
    favoritoPopTimerRef.current = setTimeout(() => setFavoritoPop(false), 260)
  }

  return (
    <div
      className={`promocard-g ${tieneDescuento ? 'promocard-g--oferta' : ''}`}
      onClick={() => navigate(`/producto/${producto.id}`)}
    >
      <div className="promocard-g__top-badge">
        {etiquetaDescuento && (
          <span className="promocard-g__badge">{etiquetaDescuento}</span>
        )}
      </div>

      <div className="promocard-g__media">
        <button
          type="button"
          className={`promocard-g__fav ${favorito ? 'promocard-g__fav--activo' : ''} ${favoritoPop ? 'promocard-g__fav--pop' : ''}`}
          onClick={handleFavorito}
          aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Heart size={22} fill={favorito ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
        <ProductoImagen
          src={producto.foto_url}
          alt={producto.nombre_comercial}
          className="promocard-g__image"
          loading="lazy"
        />
      </div>

      {(mostrarContador || cantidad > 0) ? (
        <div className="promocard-g__contador" onClick={(e) => e.stopPropagation()}>
          <button className="promocard-g__contador-btn" onClick={handleRestar} aria-label="Quitar uno">−</button>
          <span className="promocard-g__contador-cantidad">{cantidad}</span>
          <button className="promocard-g__contador-btn" onClick={handleSumar} aria-label="Agregar uno">+</button>
        </div>
      ) : (
        <button className="promocard-g__btn-agregar" onClick={handleAgregar}>
          + Agregar
        </button>
      )}

      <div className="promocard-g__precios">
        {tieneDescuento ? (
          <>
            <span className="promocard-g__precio-ahora">
              <span className="promocard-g__precio-ahora-label">Ahora</span>
              <PrecioSuperIndice valor={producto.precio_usd} />
            </span>
            <span className="promocard-g__precio-original">
              <PrecioSuperIndice valor={producto.precio_original_usd} />
            </span>
          </>
        ) : (
          <span className="promocard-g__precio-normal">
            <PrecioSuperIndice valor={producto.precio_usd} />
          </span>
        )}
      </div>

      {precioVes && <span className="promocard-g__precio-ves">≈ Bs. {precioVes}</span>}

      <h4 className="promocard-g__nombre">{producto.nombre_comercial}</h4>
    </div>
  )
}

export default PromoCardGrande
