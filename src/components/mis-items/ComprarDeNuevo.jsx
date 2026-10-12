import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Package, RefreshCw, Tag } from 'lucide-react'
import api from '../../api/axios'
import { useCart } from '../../context/CartContext'
import BarraHerramientas from './BarraHerramientas'
import TarjetaProducto from './TarjetaProducto'
import './MisItems.css'

// ---------------------------------------------------------------
// Pestaña "Comprar de nuevo".
// Se arma con el historial real de órdenes del usuario (GET /orders, que ya
// incluye ordenes_items con producto_id). Por cada producto único comprado
// (en órdenes no canceladas) se consulta su ficha actual (GET /products/:id)
// para tener precio y foto vigentes. La lógica es la misma de antes; cambia
// la tarjeta (unificada), se puede guardar en lista y hay reintento si falla.
// ---------------------------------------------------------------
export default function ComprarDeNuevo({ tasaVes, onGuardar, idsEnListas }) {
  const { items: cartItems, addItem } = useCart()
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [soloOfertas, setSoloOfertas] = useState(false)
  const [lineaActiva, setLineaActiva] = useState('todo')
  const [vista, setVista] = useState('grid')

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      try {
        const { data: ordenes } = await api.get('/orders')

        const conteo = new Map()
        for (const orden of ordenes) {
          if (orden.estado === 'cancelado') continue
          for (const item of orden.ordenes_items || []) {
            const actual = conteo.get(item.producto_id)
            if (!actual) {
              conteo.set(item.producto_id, { veces: 1, ultimaFecha: orden.created_at })
            } else {
              conteo.set(item.producto_id, {
                veces: actual.veces + 1,
                ultimaFecha: orden.created_at > actual.ultimaFecha ? orden.created_at : actual.ultimaFecha,
              })
            }
          }
        }

        const ids = Array.from(conteo.keys()).filter(Boolean)
        if (ids.length === 0) {
          if (!cancelado) setProductos([])
          return
        }

        const resultados = await Promise.allSettled(ids.map((id) => api.get(`/products/${id}`)))
        const conDatos = resultados
          .map((r, i) => {
            if (r.status !== 'fulfilled') return null
            const meta = conteo.get(ids[i])
            return { ...r.value.data, _veces: meta.veces, _ultimaFecha: meta.ultimaFecha }
          })
          .filter(Boolean)
          .sort((a, b) => b._veces - a._veces || new Date(b._ultimaFecha) - new Date(a._ultimaFecha))

        if (!cancelado) setProductos(conDatos)
      } catch (err) {
        console.error(err)
        if (!cancelado) setError(true)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [intento])

  function reintentar() {
    setError(false)
    setCargando(true)
    setIntento((n) => n + 1)
  }

  const esOferta = (p) => p.precio_oferta_usd || p.en_oferta
  const cantidadOfertas = useMemo(() => productos.filter(esOferta).length, [productos])

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return productos
      .filter((p) => (soloOfertas ? esOferta(p) : true))
      .filter((p) => (lineaActiva === 'todo' ? true : p.linea === lineaActiva))
      .filter((p) => (termino ? p.nombre_comercial?.toLowerCase().includes(termino) : true))
  }, [productos, soloOfertas, lineaActiva, busqueda])

  const cantidadEnCarrito = (id) => cartItems.find((i) => i.producto.id === id)?.cantidad || 0

  if (error) {
    return (
      <div className="fav-estado">
        <span className="fav-estado__icono fav-estado__icono--error"><AlertCircle size={28} /></span>
        <h2>No pudimos cargar tu historial de compras</h2>
        <p>Revisa tu conexión e inténtalo de nuevo.</p>
        <button type="button" className="fav-btn fav-btn--primario" onClick={reintentar}>
          <RefreshCw size={16} /> Reintentar
        </button>
      </div>
    )
  }

  return (
    <section aria-label="Comprar de nuevo">
      {!cargando && productos.length > 0 && (
        <p className="fav-resumen-texto">
          Productos que ya compraste, ordenados por frecuencia · {productos.length} producto{productos.length !== 1 ? 's' : ''}
        </p>
      )}

      <BarraHerramientas
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        placeholder="Buscar compras pasadas"
        lineaActiva={lineaActiva}
        onLinea={setLineaActiva}
        vista={vista}
        onVista={setVista}
        extra={
          cantidadOfertas > 0 ? (
            <button
              type="button"
              className={`fav-barra__btn ${soloOfertas ? 'fav-barra__btn--on' : ''}`}
              onClick={() => setSoloOfertas((v) => !v)}
              aria-pressed={soloOfertas}
            >
              <Tag size={16} />
              <span>Ofertas ({cantidadOfertas})</span>
            </button>
          ) : null
        }
      />

      {cargando ? (
        <div className={`fav-grid fav-grid--${vista}`} aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="fav-card fav-card--skeleton" />)}
        </div>
      ) : productos.length === 0 ? (
        <div className="fav-estado">
          <span className="fav-estado__icono"><Package size={28} /></span>
          <h2>Aún no tienes compras anteriores</h2>
          <p>Cuando hagas tu primer pedido, aquí podrás volver a pedir tus productos en un toque.</p>
          <Link to="/orders" className="fav-btn fav-btn--primario">Ver mis órdenes</Link>
        </div>
      ) : filtrados.length === 0 ? (
        <p className="fav-vacio-filtro">No hay compras que coincidan con tu búsqueda.</p>
      ) : (
        <div className={`fav-grid fav-grid--${vista}`}>
          {filtrados.map((p) => (
            <TarjetaProducto
              key={p.id}
              producto={p}
              vista={vista}
              tasaVes={tasaVes}
              cantidadEnCarrito={cantidadEnCarrito(p.id)}
              onAgregar={() => addItem(p, 1)}
              onGuardar={() => onGuardar(p)}
              enAlgunaLista={idsEnListas.has(p.id)}
              badge={p._veces > 1 ? `Comprado ${p._veces} veces` : null}
            />
          ))}
        </div>
      )}
    </section>
  )
}