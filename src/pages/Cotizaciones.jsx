import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import './Cotizaciones.css'

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function tiempoRestante(fechaExpiracion) {
  const ms = new Date(fechaExpiracion) - new Date()
  if (ms <= 0) return null
  const horas = Math.floor(ms / (1000 * 60 * 60))
  const minutos = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${horas}h ${minutos}m`
}

function CotizacionCard({ cotizacion, onAgregar, yaEnCarrito }) {
  const { producto } = cotizacion
  const vencida = cotizacion.estado === 'cotizada' &&
    new Date(cotizacion.fecha_expiracion) < new Date()

  return (
    <div className="cotizacion-card">
      <div className="cotizacion-card__media">
        {producto?.foto_url ? (
          <img src={producto.foto_url} alt={producto.nombre_comercial} />
        ) : (
          <div className="cotizacion-card__media-placeholder">Sin imagen</div>
        )}
      </div>

      <div className="cotizacion-card__body">
        <h3 className="cotizacion-card__nombre">
          <Link to={`/producto/${producto?.id}`}>{producto?.nombre_comercial}</Link>
        </h3>

        {cotizacion.estado === 'pendiente' && (
          <p className="cotizacion-card__estado cotizacion-card__estado--pendiente">
            Esperando respuesta del administrador
          </p>
        )}

        {cotizacion.estado === 'rechazada' && (
          <p className="cotizacion-card__estado cotizacion-card__estado--rechazada">
            No fue posible cotizar este producto
            {cotizacion.nota_admin && <span className="cotizacion-card__nota"> — {cotizacion.nota_admin}</span>}
          </p>
        )}

        {cotizacion.estado === 'cotizada' && !vencida && (
          <>
            <p className="cotizacion-card__precio">${formatUSD(cotizacion.precio_unitario)}</p>
            <p className="cotizacion-card__vigencia">
              Vence en {tiempoRestante(cotizacion.fecha_expiracion)}
            </p>
            <button
              className="cotizacion-card__btn"
              onClick={() => onAgregar(cotizacion)}
              disabled={yaEnCarrito || producto?.disponible === false}
            >
              {producto?.disponible === false
                ? 'Producto no disponible'
                : (yaEnCarrito ? '✓ En el carrito' : 'Agregar al carrito')}
            </button>
          </>
        )}

        {cotizacion.estado === 'cotizada' && vencida && (
          <p className="cotizacion-card__estado cotizacion-card__estado--vencida">
            Cotización vencida — vuelve al producto para solicitar de nuevo
          </p>
        )}
      </div>
    </div>
  )
}

function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const { items, addItemCotizado } = useCart()

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/cotizaciones/mias')
      setCotizaciones(data)
    } catch (err) {
      console.error('Error al cargar cotizaciones', err)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    async function iniciar() {
      await cargar()
    }
    iniciar()
  }, [cargar])

  function handleAgregar(cotizacion) {
    addItemCotizado(cotizacion.producto, cotizacion)
  }

  return (
  <LayoutPaginaPrincipal activo="cotizaciones" titulo="Cotizaciones" nav={NAV_UNIFICADO}>
    <div className="cot-page">
      {cargando ? (
        <div className="cot-loading">Cargando tus cotizaciones...</div>
      ) : cotizaciones.length === 0 ? (
        <div className="cot-vacio">
          <p>Todavía no has solicitado ninguna cotización.</p>
          <Link to="/catalogo">Ir al catálogo</Link>
        </div>
      ) : (
        <div className="cot-grid">
          {cotizaciones.map((c) => (
            <CotizacionCard
              key={c.id}
              cotizacion={c}
              onAgregar={handleAgregar}
              yaEnCarrito={items.some((item) => item.producto.id === c.producto?.id)}
            />
          ))}
        </div>
      )}
    </div>
  </LayoutPaginaPrincipal>
)
}

export default Cotizaciones