import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getEstadoProducto } from '../utils/productoEstado'
import { ProductoImagen } from './icons/ProductoImagen'
import './OfertaCard.css'
 

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function OfertaCard({ producto, tasaVes }) {
  const { user } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [agregado, setAgregado] = useState(false)

  const estado = getEstadoProducto(producto)
  const precioVes = tasaVes && producto.precio_usd
    ? (Number(producto.precio_usd) * tasaVes).toLocaleString('es-VE', { maximumFractionDigits: 0 })
    : null

  function handleAgregar(e) {
    e.stopPropagation()
    if (!user) return navigate('/login')
    addItem(producto, 1)
    setAgregado(true)
    setTimeout(() => setAgregado(false), 1500)
  }

  return (
    <div className="oferta-card" onClick={() => navigate(`/producto/${producto.id}`)}>
      <div className="oferta-card__imagen-wrap">
        <ProductoImagen
          src={producto.foto_url}
          alt={producto.nombre_comercial}
          className="oferta-card__imagen"
          loading="lazy"
        />
        {producto.descuento_activo && (
          <span className="oferta-card__badge">
            -{producto.descuento_activo.tipo === 'porcentaje'
              ? `${producto.descuento_activo.valor}%`
              : `$${producto.descuento_activo.valor}`}
          </span>
        )}
        {estado === 'normal' && producto.disponible && (
          <button
            type="button"
            className={`oferta-card__btn-agregar ${agregado ? 'oferta-card__btn-agregar--ok' : ''}`}
            onClick={handleAgregar}
            aria-label="Agregar al carrito"
          >
            {agregado ? <Check size={18} /> : <Plus size={18} />}
          </button>
        )}
      </div>

      <p className="oferta-card__nombre">{producto.nombre_comercial}</p>

      <div className="oferta-card__precio">
        {estado === 'normal' ? (
          <>
            <span className="oferta-card__precio-actual">${formatUSD(producto.precio_usd)}</span>
            {producto.precio_original_usd && (
              <span className="oferta-card__precio-original">${formatUSD(producto.precio_original_usd)}</span>
            )}
            {precioVes && <span className="oferta-card__precio-ves">Bs. {precioVes}</span>}
          </>
        ) : (
          <span className="oferta-card__precio-especial">
            {estado === 'cotizacion' ? 'Consultar precio' : 'Llegará pronto'}
          </span>
        )}
      </div>
    </div>
  )
}

export default OfertaCard
