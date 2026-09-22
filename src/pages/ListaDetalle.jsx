import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import './ListaDetalle.css'

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function IconoGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function IconoLista() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="2.5" cy="4" r="1" fill="currentColor" />
      <circle cx="2.5" cy="9" r="1" fill="currentColor" />
      <circle cx="2.5" cy="14" r="1" fill="currentColor" />
      <path d="M6 4H16M6 9H16M6 14H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function IconoBuscar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 11.5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Modal genérico reutilizado del mismo patrón de MisItems
function Modal({ titulo, onCerrar, children }) {
  return (
    <div className="lista-detalle-modal-overlay" onClick={onCerrar}>
      <div className="lista-detalle-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lista-detalle-modal__header">
          <h3>{titulo}</h3>
          <button type="button" className="lista-detalle-modal__cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="lista-detalle-modal__body">{children}</div>
      </div>
    </div>
  )
}

// Menú contextual "⋯" de cada tarjeta: Mover a otra lista / Compartir / Eliminar
function MenuAcciones({ item, onMover, onCompartir, onEliminar }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="menu-acciones">
      <button
        type="button"
        className="menu-acciones__trigger"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Más acciones"
      >
        ⋯
      </button>
      {abierto && (
        <>
          <div className="menu-acciones__overlay" onClick={() => setAbierto(false)} />
          <div className="menu-acciones__dropdown">
            <button type="button" onClick={() => { setAbierto(false); onMover(item) }}>
              📂 Mover a otra lista
            </button>
            <button type="button" onClick={() => { setAbierto(false); onCompartir(item) }}>
              🔗 Compartir producto
            </button>
            <button type="button" className="menu-acciones__eliminar" onClick={() => { setAbierto(false); onEliminar(item) }}>
              🗑️ Eliminar de la lista
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ListaDetalle() {
  const { id } = useParams()
  const { items: cartItems, addItem } = useCart()

  const [lista, setLista] = useState(null)
  const [todasLasListas, setTodasLasListas] = useState([])
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [vista, setVista] = useState('lista') // 'grid' | 'lista' — Amazon abre en modo lista por defecto
  const [busqueda, setBusqueda] = useState('')

  const [itemAMover, setItemAMover] = useState(null)
  const [moviendo, setMoviendo] = useState(false)
  const [toast, setToast] = useState('')

  const cargarDatos = useCallback(async () => {
    try {
      const respuestaItems = await api.get(`/lists/${id}/items`)
      const respuestaListas = await api.get('/lists')
      setItems(respuestaItems.data)
      setTodasLasListas(respuestaListas.data)
      setLista(respuestaListas.data.find((l) => l.id === Number(id)))
    } catch (err) {
      setError('No se pudo cargar la lista')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => {
    async function iniciar() {
      await cargarDatos()
    }
    iniciar()
  }, [cargarDatos])

  async function quitarItem(productoId) {
    try {
      await api.delete(`/lists/${id}/items/${productoId}`)
      setItems((prev) => prev.filter((item) => item.producto_id !== productoId))
    } catch (err) {
      console.error('Error al quitar item:', err)
    }
  }

  async function moverItem(item, listaDestinoId) {
    setMoviendo(true)
    try {
      await api.post(`/lists/${listaDestinoId}/items`, { producto_id: item.producto_id })
      await api.delete(`/lists/${id}/items/${item.producto_id}`)
      setItems((prev) => prev.filter((i) => i.producto_id !== item.producto_id))
      const destino = todasLasListas.find((l) => l.id === listaDestinoId)
      mostrarToast(`Movido a "${destino?.nombre || 'la lista'}"`)
    } catch (err) {
      console.error('Error al mover item:', err)
      alert('No se pudo mover el producto')
    } finally {
      setMoviendo(false)
      setItemAMover(null)
    }
  }

  function compartirProducto(item) {
    const url = `${window.location.origin}/producto/${item.producto_id}`
    const texto = item.productos?.nombre_comercial || 'este producto'

    if (navigator.share) {
      navigator.share({ title: texto, text: `Mira este producto: ${texto}`, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      mostrarToast('Enlace copiado al portapapeles')
    }
  }

  function mostrarToast(mensaje) {
    setToast(mensaje)
    setTimeout(() => setToast(''), 2500)
  }

  function cantidadEnCarrito(productoId) {
    const linea = cartItems.find((i) => i.producto.id === productoId)
    return linea?.cantidad || 0
  }

  function agregarTodos() {
    itemsFiltrados.forEach((item) => addItem(item.productos, 1))
  }

  const itemsFiltrados = !busqueda.trim()
    ? items
    : items.filter((item) => item.productos?.nombre_comercial?.toLowerCase().includes(busqueda.trim().toLowerCase()))

  const otrasListas = todasLasListas.filter((l) => l.id !== Number(id))

  if (cargando) {
    return (
      <LayoutPaginaPrincipal activo="items" titulo="Lista" nav={NAV_UNIFICADO}>
        <div className="lista-detalle">
          <p className="lista-detalle-cargando">Cargando lista…</p>
        </div>
      </LayoutPaginaPrincipal>
    )
  }

  if (error) {
    return (
      <LayoutPaginaPrincipal activo="items" titulo="Lista" nav={NAV_UNIFICADO}>
        <div className="lista-detalle">
          <p className="lista-detalle-error">{error}</p>
          <Link to="/mis-items">← Volver a Mis Items</Link>
        </div>
      </LayoutPaginaPrincipal>
    )
  }

  return (
    <LayoutPaginaPrincipal activo="items" titulo={lista?.nombre || 'Lista'} subtitulo={`${items.length} producto${items.length !== 1 ? 's' : ''}`} nav={NAV_UNIFICADO}>
      <div className="lista-detalle">
        <Link to="/mis-items" className="lista-detalle-volver">← Mis Items</Link>

        {/* Header: título + Agregar producto */}
        <header className="lista-detalle-header">
          <div className="lista-detalle-header__titulo">
            <h1>{lista?.nombre || 'Lista'}</h1>
            <span className="lista-detalle-header__privada">Privada</span>
          </div>
          <div className="lista-detalle-header__acciones">
            <Link to="/catalogo" className="lista-detalle-btn-agregar">+ Agregar producto</Link>
          </div>
        </header>

        {items.length > 0 && (
          <>
            {/* Toolbar: toggle grid/lista + buscador + agregar todos */}
            <div className="lista-detalle-toolbar">
              <div className="lista-detalle-toolbar__vista">
                <button
                  type="button"
                  className={vista === 'lista' ? 'activo' : ''}
                  onClick={() => setVista('lista')}
                  aria-label="Vista de lista"
                >
                  <IconoLista />
                </button>
                <button
                  type="button"
                  className={vista === 'grid' ? 'activo' : ''}
                  onClick={() => setVista('grid')}
                  aria-label="Vista de cuadrícula"
                >
                  <IconoGrid />
                </button>
              </div>

              <div className="lista-detalle-buscador">
                <IconoBuscar />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar en esta lista"
                />
              </div>

              <button type="button" className="lista-detalle-btn-todos" onClick={agregarTodos}>
                Agregar todos al carrito
              </button>
            </div>

            <p className="lista-detalle-contador">
              {itemsFiltrados.length} producto{itemsFiltrados.length !== 1 ? 's' : ''}
            </p>
          </>
        )}

        {items.length === 0 ? (
          <div className="lista-detalle-vacia">
            <p>Esta lista está vacía</p>
            <Link to="/catalogo" className="lista-detalle-cta">Ir al catálogo</Link>
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <p className="lista-detalle-sin-resultados">No hay productos que coincidan con "{busqueda}".</p>
        ) : (
          <div className={vista === 'grid' ? 'lista-detalle-grid' : 'lista-detalle-filas'}>
            {itemsFiltrados.map((item) => (
              <div key={item.id} className="lista-item-card">
                <Link to={`/producto/${item.producto_id}`} className="lista-item-imagen">
                  {item.productos?.foto_url ? (
                    <img src={item.productos.foto_url} alt={item.productos.nombre_comercial} />
                  ) : (
                    <div className="lista-item-sin-imagen">Sin imagen</div>
                  )}
                </Link>

                <div className="lista-item-info">
                  <Link to={`/producto/${item.producto_id}`} className="lista-item-nombre">
                    {item.productos?.nombre_comercial}
                  </Link>
                  <p className="lista-item-precio">${formatUSD(item.productos?.precio_usd)} USD</p>

                  <div className="lista-item-acciones">
                    <button
                      type="button"
                      className={`lista-item-carrito ${cantidadEnCarrito(item.producto_id) ? 'en-carrito' : ''}`}
                      onClick={() => addItem(item.productos, 1)}
                    >
                      {cantidadEnCarrito(item.producto_id)
                        ? `En el carrito (${cantidadEnCarrito(item.producto_id)})`
                        : 'Agregar al Carrito'}
                    </button>

                    <MenuAcciones
                      item={item}
                      onMover={setItemAMover}
                      onCompartir={compartirProducto}
                      onEliminar={(i) => quitarItem(i.producto_id)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Mover a otra lista */}
        {itemAMover && (
          <Modal titulo="Mover a otra lista" onCerrar={() => setItemAMover(null)}>
            <p className="lista-detalle-modal__nota">
              Elige a qué lista quieres mover "{itemAMover.productos?.nombre_comercial}".
            </p>
            {otrasListas.length === 0 ? (
              <p className="lista-detalle-modal__nota">No tienes otras listas todavía. Crea una desde Mis Items.</p>
            ) : (
              <div className="lista-detalle-modal__opciones">
                {otrasListas.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className="lista-detalle-modal__opcion"
                    disabled={moviendo}
                    onClick={() => moverItem(itemAMover, l.id)}
                  >
                    <span>{l.es_predeterminada ? '📌' : '📋'}</span>
                    <span>{l.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </Modal>
        )}

        {toast && <div className="lista-detalle-toast">{toast}</div>}
      </div>
    </LayoutPaginaPrincipal>
  )
}

export default ListaDetalle
