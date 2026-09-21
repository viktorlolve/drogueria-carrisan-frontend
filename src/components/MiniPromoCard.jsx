import { useNavigate } from 'react-router-dom'
import { ProductoImagen } from './icons/ProductoImagen'
import './MiniPromoCard.css'

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
      <span className="minipromocard__precio-simbolo">$</span>
      <span className="minipromocard__precio-entero">{partes[0]}</span>
      <sup className="minipromocard__precio-centavos">{partes[1]}</sup>
    </>
  )
}

function obtenerEtiquetaDescuento(descuento) {
  if (!descuento) return null
  if (descuento.tipo === 'monto') return 'Oferta'
  const valor = Number(descuento.valor)
  if (valor >= 30) return 'Super Oferta'
  if (valor >= 20) return 'Promoción'
  if (valor >= 15) return 'Flash'
  return 'Descuento'
}

// Card mínima para los mini-grids de categoría (estilo "Rollbacks & more"
// de Walmart): etiqueta, foto, precio USD y nombre.
function MiniPromoCard({ producto }) {
  const navigate = useNavigate()

  const tieneDescuento = producto.precio_original_usd != null && producto.descuento_activo
  const etiqueta = tieneDescuento ? obtenerEtiquetaDescuento(producto.descuento_activo) : null

  return (
    <button
      type="button"
      className="minipromocard"
      onClick={() => navigate(`/producto/${producto.id}`)}
    >
      <div className="minipromocard__badge-slot">
        {etiqueta && <span className="minipromocard__badge">{etiqueta}</span>}
      </div>

      <div className="minipromocard__media">
        <ProductoImagen
          src={producto.foto_url}
          alt={producto.nombre_comercial}
          className="minipromocard__image"
          loading="lazy"
        />
      </div>

      <div className="minipromocard__precios">
        {tieneDescuento ? (
          <>
            <span className="minipromocard__precio-ahora">
              <span className="minipromocard__precio-ahora-label">Ahora</span>
              <PrecioSuperIndice valor={producto.precio_usd} />
            </span>
            <span className="minipromocard__precio-original">
              $<span className="minipromocard__precio-original-text">{formatUSD(producto.precio_original_usd)}</span>
            </span>
          </>
        ) : (
          <span className="minipromocard__precio-normal">
            <PrecioSuperIndice valor={producto.precio_usd} />
          </span>
        )}
      </div>

      <span className="minipromocard__nombre">{producto.nombre_comercial}</span>
    </button>
  )
}

export default MiniPromoCard
