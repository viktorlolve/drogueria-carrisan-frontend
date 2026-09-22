import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
import { useFavoritos } from '../context/FavoritosContext'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import './MisItems.css'

// Sugerencias de listas rápidas. Solo crea la lista con este nombre;
// no llevan lógica especial más allá de eso.
const LISTAS_SUGERIDAS = [
  { nombre: 'Favoritos', icon: '⭐' },
  { nombre: 'Antibióticos', icon: '💊' },
  { nombre: 'Cuidado Personal', icon: '🧴' },
  { nombre: 'Vitaminas', icon: '🛡️' },
]

// Filtros por línea de producto — iguales en "Mis Items" y "Comprar de nuevo"
// para que ambas pestañas se vean y se comporten de forma consistente.
const LINEAS_FILTRO = [
  { id: 'todo', nombre: 'Todo' },
  { id: 'Linea Hospitalaria', nombre: 'Línea hospitalaria' },
  { id: 'Linea Farmacia', nombre: 'Línea farmacia' },
  { id: 'Material Medico', nombre: 'Material Médico' },
]

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Separa parte entera y centavos para formato superíndice: $1⁰⁶
function PrecioSuperIndice({ valor }) {
  if (valor == null) return <span>—</span>
  const partes = Number(valor).toFixed(2).split('.')
  return (
    <>
      <span className="precio-simbolo">$</span>
      <span className="precio-entero">{partes[0]}</span>
      <sup className="precio-centavos">{partes[1]}</sup>
    </>
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

function IconoFiltro() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M4.5 8h7M7 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CarruselSkeleton() {
  return (
    <div className="itemcard itemcard--skeleton">
      <div className="itemcard__media itemcard__media--skeleton" />
      <div className="skel-line skel-line--btn" />
      <div className="skel-line skel-line--sm" />
      <div className="skel-line skel-line--md" />
    </div>
  )
}

// ---------------------------------------------------------
// ItemsCard — tarjeta compacta de producto (grid 2 columnas móvil /
// grid de N columnas desktop). Usada en Mis Favoritos y Comprar de nuevo.
// ---------------------------------------------------------
function ItemsCard({ producto, cantidadEnCarrito, onAgregar, onQuitar, mostrarQuitar, badge, tasaVes }) {
  const tieneDescuento = producto?.precio_original_usd != null && producto?.descuento_activo
  const precioVes = tasaVes && producto?.precio_usd != null
    ? Number((producto.precio_usd * tasaVes).toFixed(2)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null

  return (
    <div className="itemcard">
      <Link to={`/producto/${producto?.id}`} className="itemcard__media">
        {producto?.foto_url ? (
          <img src={producto.foto_url} alt={producto.nombre_comercial} loading="lazy" />
        ) : (
          <div className="itemcard__media-placeholder">Sin imagen</div>
        )}

        {badge && <span className="itemcard__badge">{badge}</span>}

        {mostrarQuitar && (
          <button
            type="button"
            className="itemcard__quitar"
            onClick={(e) => { e.preventDefault(); onQuitar() }}
            aria-label="Quitar de la lista"
          >
            ✕
          </button>
        )}
      </Link>

      <div className="itemcard__body">
        <p className="itemcard__nombre">{producto?.nombre_comercial}</p>
        <div className="itemcard__footer">
          <div className="itemcard__precios">
            {tieneDescuento ? (
              <>
                <span className="itemcard__precio-ahora">
                  <span className="itemcard__precio-ahora-label">Ahora</span>
                  <PrecioSuperIndice valor={producto.precio_usd} />
                </span>
                <span className="itemcard__precio-original">
                  <PrecioSuperIndice valor={producto.precio_original_usd} />
                </span>
              </>
            ) : (
              <span className="itemcard__precio-normal">
                <PrecioSuperIndice valor={producto?.precio_usd} />
              </span>
            )}
            {precioVes && (
              <span className="itemcard__precio-ves">
                ≈ Bs. {precioVes}
              </span>
            )}
          </div>
          <button
            type="button"
            className={`itemcard__cta ${cantidadEnCarrito ? 'itemcard__cta--cantidad' : ''}`}
            onClick={onAgregar}
          >
            {cantidadEnCarrito ? cantidadEnCarrito : '+ Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// Modal genérico de confirmación / formulario, estilo Amazon
// ("Crear una nueva lista", "Filtrar y ordenar", etc.)
//
// Se renderiza vía portal directo a document.body a propósito: así
// queda completamente afuera de .ppal-shift (el contenedor que
// LayoutPaginaPrincipal empuja/encoge cuando el drawer móvil está
// abierto). Si el modal fuera descendiente de ese contenedor, mientras
// el drawer cierra (overflow:hidden + transform en transición) el
// modal podría recortarse o mal-posicionarse por una fracción de
// segundo — con el portal, nunca depende de ese estado.
// ---------------------------------------------------------
function Modal({ titulo, onCerrar, children }) {
  return createPortal(
    <div className="misitems-modal-overlay" onClick={onCerrar}>
      <div className="misitems-modal" onClick={(e) => e.stopPropagation()}>
        <div className="misitems-modal__header">
          <h3>{titulo}</h3>
          <button type="button" className="misitems-modal__cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="misitems-modal__body">{children}</div>
      </div>
    </div>,
    document.body
  )
}

// ---------------------------------------------------------
// Carrusel de listas ("Listas y listas de regalos")
// ---------------------------------------------------------
function CarruselListas({ listas, cargando, onCrearNueva, onEliminar }) {
  return (
    <section className="carrusel-listas">
      <div className="carrusel-listas__header">
        <h2 className="misitems-section-title">Listas y listas de regalos</h2>
        <button
          type="button"
          className="carrusel-listas__agregar"
          onClick={onCrearNueva}
          aria-label="Crear nueva lista"
        >
          +
        </button>
      </div>

      {cargando ? (
        <div className="carrusel-listas__scroll">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="lista-chip lista-chip--skeleton" />
          ))}
        </div>
      ) : (
        <div className="carrusel-listas__scroll">
          {listas.map((lista) => (
            <div key={lista.id} className="lista-chip-wrap">
              {!lista.es_predeterminada && (
                <button
                  type="button"
                  className="lista-chip__eliminar"
                  onClick={(e) => { e.preventDefault(); onEliminar(lista) }}
                  aria-label={`Eliminar lista ${lista.nombre}`}
                >
                  ✕
                </button>
              )}
              <Link to={`/listas/${lista.id}`} className="lista-chip">
                <span className="lista-chip__icon">
                  {lista.es_predeterminada ? '📌' : '📋'}
                </span>
                <span className="lista-chip__nombre">{lista.nombre}</span>
              </Link>
            </div>
          ))}
          <button type="button" className="lista-chip lista-chip--nueva" onClick={onCrearNueva}>
            <span className="lista-chip__icon">+</span>
            <span className="lista-chip__nombre">Nueva lista</span>
          </button>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------
// Buscador simple para el modal "Agregar producto": sin botón de
// buscar, muestra resultados en vivo con debounce (mismo patrón que
// BuscadorMovil.jsx) y al tocar un resultado ejecuta onSeleccionar.
// ---------------------------------------------------------
function BuscadorProducto({ onSeleccionar }) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (query.trim().length < 1) {
      return
    }
    const debounce = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await api.get(`/products?search=${encodeURIComponent(query.trim())}&limit=8`)
        setResultados(data.slice(0, 8))
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 250)
    return () => clearTimeout(debounce)
  }, [query])

  const resultadosVisibles = query.trim().length < 1 ? [] : resultados

  return (
    <div className="buscador-producto">
      <div className="misitems-buscador buscador-producto__input">
        <IconoBuscar />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto por nombre…"
          autoFocus
        />
      </div>

      {buscando && <p className="buscador-producto__estado">Buscando…</p>}

      {!buscando && query.trim().length > 0 && resultadosVisibles.length === 0 && (
        <p className="buscador-producto__estado">No se encontraron productos para "{query}".</p>
      )}

      {resultadosVisibles.length > 0 && (
        <ul className="buscador-producto__resultados">
          {resultadosVisibles.map((producto) => (
            <li key={producto.id}>
              <button
                type="button"
                className="buscador-producto__resultado"
                onClick={() => onSeleccionar(producto)}
              >
                <span className="buscador-producto__resultado-media">
                  {producto.foto_url ? (
                    <img src={producto.foto_url} alt={producto.nombre_comercial} loading="lazy" />
                  ) : (
                    <span className="itemcard__media-placeholder">Sin imagen</span>
                  )}
                </span>
                <span className="buscador-producto__resultado-info">
                  <span className="buscador-producto__resultado-nombre">{producto.nombre_comercial}</span>
                  <span className="buscador-producto__resultado-precio">${formatUSD(producto.precio_usd)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------
// Tab: Mis Items (favoritos + carrusel de listas + filtro por línea)
// ---------------------------------------------------------
function TabMisItems({ mostrarCrear, setMostrarCrear, tasaVes }) {
  const { items: cartItems, addItem } = useCart()
  const { favoritos, toggleFavorito, loading: cargandoFav } = useFavoritos()

  const [listas, setListas] = useState([])
  const [cargandoListas, setCargandoListas] = useState(true)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [creando, setCreando] = useState(false)

  const [mostrarAgregarProducto, setMostrarAgregarProducto] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [lineaActiva, setLineaActiva] = useState('todo')
  const [vista, setVista] = useState('grid') // 'grid' | 'lista'
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  const cargarListas = useCallback(async () => {
    try {
      const { data } = await api.get('/lists')
      setListas(data)
    } catch {
      console.error('Error al cargar listas')
    } finally {
      setCargandoListas(false)
    }
  }, [])

  useEffect(() => {
    async function iniciar() {
      await cargarListas()
    }
    iniciar()
  }, [cargarListas])

  async function crearLista(nombre) {
    if (!nombre.trim()) return
    setCreando(true)
    try {
      await api.post('/lists', { nombre })
      setNuevoNombre('')
      setMostrarCrear(false)
      await cargarListas()
    } catch {
      alert('Error al crear lista')
    } finally {
      setCreando(false)
    }
  }

  async function eliminarLista(lista) {
    if (!confirm(`¿Eliminar la lista "${lista.nombre}"?`)) return
    try {
      await api.delete(`/lists/${lista.id}`)
      setListas((prev) => prev.filter((l) => l.id !== lista.id))
    } catch {
      alert('No se pudo eliminar la lista')
    }
  }

  const nombresExistentes = listas.map((l) => l.nombre.toLowerCase())
  const sugerenciasDisponibles = LISTAS_SUGERIDAS.filter(
    (s) => !nombresExistentes.includes(s.nombre.toLowerCase())
  )

  async function quitarItem(productoId) {
    const producto = favoritos.find((item) => item.id === productoId)
    if (producto) await toggleFavorito(producto)
  }

  function cantidadEnCarrito(productoId) {
    const linea = cartItems.find((i) => i.producto.id === productoId)
    return linea?.cantidad || 0
  }

  const itemsFiltrados = useMemo(() => {
    let resultado = favoritos
    if (lineaActiva !== 'todo') {
      resultado = resultado.filter((p) => p.linea === lineaActiva)
    }
    if (busqueda.trim()) {
      const termino = busqueda.trim().toLowerCase()
      resultado = resultado.filter((p) => p.nombre_comercial?.toLowerCase().includes(termino))
    }
    return resultado
  }, [favoritos, lineaActiva, busqueda])

  const cargando = cargandoFav

  return (
    <>
      <CarruselListas
        listas={listas}
        cargando={cargandoListas}
        onCrearNueva={() => setMostrarCrear(true)}
        onEliminar={eliminarLista}
      />

      <section className="misitems-section misitems-section--favoritos">
        <div className="misitems-section__header">
          <div>
            <h2 className="misitems-section-title">Todos los artículos guardados</h2>
            {!cargando && favoritos.length > 0 && (
              <p className="misitems-section-subtitulo">
                {favoritos.length} producto{favoritos.length !== 1 ? 's' : ''} guardado{favoritos.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            className="misitems-agregar-todos"
            onClick={() => setMostrarAgregarProducto(true)}
          >
            + Agregar producto
          </button>
        </div>


        {!cargando && favoritos.length > 0 && (
          <>
            {/* Toolbar: buscador + filtros + toggle vista */}
            <div className="misitems-toolbar">
              <div className="misitems-buscador">
                <IconoBuscar />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar en esta lista"
                />
              </div>
              <button
                type="button"
                className={`misitems-toolbar__btn ${lineaActiva !== 'todo' ? 'misitems-toolbar__btn--activo' : ''}`}
                onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
                aria-expanded={filtrosAbiertos}
              >
                <IconoFiltro /> Filtros
              </button>
              <div className="misitems-toolbar__vista">
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
            </div>

            {/* Filtros colapsables — solo cuando se abre el botón Filtros */}
            {filtrosAbiertos && (
              <div className="misitems-filtros">
                <p className="misitems-filtros__titulo">Tipo de producto</p>
                <div className="misitems-filtros__chips">
                  {LINEAS_FILTRO.map((linea) => (
                    <button
                      key={linea.id}
                      type="button"
                      className={`filtro-chip ${lineaActiva === linea.id ? 'filtro-chip--activo' : ''}`}
                      onClick={() => setLineaActiva(linea.id)}
                    >
                      {linea.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {itemsFiltrados.length === 0 ? (
              <p className="misitems-vacio-filtro">
                No hay favoritos que coincidan con los filtros actuales.
              </p>
            ) : (
              <div className={vista === 'grid' ? 'product-grid' : 'product-lista'}>
                {itemsFiltrados.map((producto) => (
                  <ItemsCard
                    key={producto.id}
                    producto={producto}
                    cantidadEnCarrito={cantidadEnCarrito(producto.id)}
                    onAgregar={() => addItem(producto, 1)}
                    onQuitar={() => quitarItem(producto.id)}
                    mostrarQuitar
                    tasaVes={tasaVes}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {cargando && (
          <div className="product-grid">
            {Array.from({ length: 4 }).map((_, i) => <CarruselSkeleton key={i} />)}
          </div>
        )}

        {!cargando && favoritos.length === 0 && (
          <div className="misitems-vacio">
            <span className="misitems-vacio__icon">⭐</span>
            <p>Todavía no tienes productos favoritos.</p>
            <Link to="/catalogo" className="misitems-vacio__cta">Explorar catálogo</Link>
          </div>
        )}
      </section>

      {/* Modal: Crear una nueva lista o lista de regalos (estilo Amazon) */}
      {mostrarCrear && (
        <Modal
          titulo="Crear una nueva lista o lista de regalos"
          onCerrar={() => { setMostrarCrear(false); setNuevoNombre('') }}
        >
          <label className="misitems-modal__label" htmlFor="nombre-lista">
            Nombre de la lista (requerido)
          </label>
          <input
            id="nombre-lista"
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Ej. Lista de compras"
            className="misitems-modal__input"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && crearLista(nuevoNombre)}
          />

          {sugerenciasDisponibles.length > 0 && (
            <div className="misitems-modal__sugerencias">
              {sugerenciasDisponibles.map((s) => (
                <button
                  key={s.nombre}
                  type="button"
                  className="sugerencia-chip"
                  onClick={() => setNuevoNombre(s.nombre)}
                >
                  <span className="sugerencia-chip__icon">{s.icon}</span>
                  <span>{s.nombre}</span>
                </button>
              ))}
            </div>
          )}

          <p className="misitems-modal__nota">
            Utiliza listas para guardar artículos para más adelante. Todas las listas son privadas a menos que las compartas con otras personas.
          </p>
          <div className="misitems-modal__acciones">
            <button
              type="button"
              className="misitems-modal__btn misitems-modal__btn--cancelar"
              onClick={() => { setMostrarCrear(false); setNuevoNombre('') }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="misitems-modal__btn misitems-modal__btn--crear"
              onClick={() => crearLista(nuevoNombre)}
              disabled={creando || !nuevoNombre.trim()}
            >
              Crear
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Agregar producto (buscador en vivo → agrega a favoritos) */}
      {mostrarAgregarProducto && (
        <Modal titulo="Agregar producto" onCerrar={() => setMostrarAgregarProducto(false)}>
          <BuscadorProducto
            onSeleccionar={async (producto) => {
              const yaEsFavorito = favoritos.some((f) => f.id === producto.id)
              if (!yaEsFavorito) await toggleFavorito(producto)
              setMostrarAgregarProducto(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}

// ---------------------------------------------------------
// Tab: Comprar de nuevo
// Se arma a partir del historial real de órdenes del usuario
// (GET /orders, que ya incluye ordenes_items con producto_id).
// Por cada producto único comprado se consulta su ficha actual
// (GET /products/:id) para tener precio y foto vigentes.
// ---------------------------------------------------------
function TabComprarDeNuevo({ tasaVes }) {
  const { items: cartItems, addItem } = useCart()
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroActivo, setFiltroActivo] = useState('todo') // 'todo' | 'ofertas'
  const [lineaActiva, setLineaActiva] = useState('todo')
  const [vista, setVista] = useState('grid') // 'grid' | 'lista'
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  const cargarRecompras = useCallback(async () => {
    try {
      const { data: ordenes } = await api.get('/orders')

      const conteoPorProducto = new Map()
      for (const orden of ordenes) {
        if (orden.estado === 'cancelado') continue
        for (const item of orden.ordenes_items || []) {
          const actual = conteoPorProducto.get(item.producto_id)
          const fechaOrden = orden.created_at
          if (!actual) {
            conteoPorProducto.set(item.producto_id, { veces: 1, ultimaFecha: fechaOrden })
          } else {
            conteoPorProducto.set(item.producto_id, {
              veces: actual.veces + 1,
              ultimaFecha: fechaOrden > actual.ultimaFecha ? fechaOrden : actual.ultimaFecha,
            })
          }
        }
      }

      const idsUnicos = Array.from(conteoPorProducto.keys()).filter(Boolean)

      if (idsUnicos.length === 0) {
        setProductos([])
        return
      }

      const resultados = await Promise.allSettled(
        idsUnicos.map((id) => api.get(`/products/${id}`))
      )

      const productosConDatos = resultados
        .map((r, i) => {
          if (r.status !== 'fulfilled') return null
          const producto = r.value.data
          const meta = conteoPorProducto.get(idsUnicos[i])
          return { ...producto, _veces: meta.veces, _ultimaFecha: meta.ultimaFecha }
        })
        .filter(Boolean)
        .sort((a, b) => b._veces - a._veces || new Date(b._ultimaFecha) - new Date(a._ultimaFecha))

      setProductos(productosConDatos)
    } catch (err) {
      setError('No se pudo cargar tu historial de compras')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    async function iniciar() {
      await cargarRecompras()
    }
    iniciar()
  }, [cargarRecompras])

  function cantidadEnCarrito(productoId) {
    const linea = cartItems.find((i) => i.producto.id === productoId)
    return linea?.cantidad || 0
  }

  if (error) return <p className="misitems-error">{error}</p>

  // "Ofertas" = productos con descuento activo, si el campo existe en el producto
  const productosFiltrados = productos
    .filter((p) => (filtroActivo === 'ofertas' ? p.precio_oferta_usd || p.en_oferta : true))
    .filter((p) => (lineaActiva === 'todo' ? true : p.linea === lineaActiva))
    .filter((p) =>
      busqueda.trim()
        ? p.nombre_comercial?.toLowerCase().includes(busqueda.trim().toLowerCase())
        : true
    )

  const cantidadOfertas = productos.filter((p) => p.precio_oferta_usd || p.en_oferta).length

  return (
    <section className="comprar-nuevo">
      {cantidadOfertas > 0 && (
        <div className="comprar-nuevo__chips">
          <button
            type="button"
            className={`comprar-nuevo__chip-oferta ${filtroActivo === 'ofertas' ? 'comprar-nuevo__chip-oferta--activo' : ''}`}
            onClick={() => setFiltroActivo(filtroActivo === 'ofertas' ? 'todo' : 'ofertas')}
          >
            <span className="comprar-nuevo__chip-oferta-icono">🏷️</span>
            <span>
              <strong>Ofertas</strong>
              <br />
              {cantidadOfertas} producto{cantidadOfertas !== 1 ? 's' : ''}
            </span>
          </button>
        </div>
      )}

      {/* Toolbar: buscador + filtros + toggle vista (igual que Mis Items) */}
      <div className="misitems-toolbar">
        <div className="misitems-buscador">
          <IconoBuscar />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar compras pasadas"
          />
        </div>
        <button
          type="button"
          className={`misitems-toolbar__btn ${lineaActiva !== 'todo' ? 'misitems-toolbar__btn--activo' : ''}`}
          onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
          aria-expanded={filtrosAbiertos}
        >
          <IconoFiltro /> Filtros
        </button>
        <div className="misitems-toolbar__vista">
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
      </div>

      {/* Filtros colapsables — igual que Mis Items */}
      {filtrosAbiertos && (
        <div className="misitems-filtros">
          <p className="misitems-filtros__titulo">Tipo de producto</p>
          <div className="misitems-filtros__chips">
            {LINEAS_FILTRO.map((linea) => (
              <button
                key={linea.id}
                type="button"
                className={`filtro-chip ${lineaActiva === linea.id ? 'filtro-chip--activo' : ''}`}
                onClick={() => setLineaActiva(linea.id)}
              >
                {linea.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {cargando ? (
        <div className={vista === 'grid' ? 'comprar-nuevo__lista' : 'comprar-nuevo__lista comprar-nuevo__lista--filas'}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="comprar-nuevo-card comprar-nuevo-card--skeleton" />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="misitems-vacio">
          <span className="misitems-vacio__icon">🔁</span>
          <p>Todavía no tienes compras anteriores para recomprar.</p>
          <Link to="/orders" className="misitems-vacio__cta">Ver mis órdenes</Link>
        </div>
      ) : productosFiltrados.length === 0 ? (
        <p className="misitems-vacio-filtro">No hay compras que coincidan con tu búsqueda.</p>
      ) : (
        <div className={vista === 'grid' ? 'comprar-nuevo__lista' : 'comprar-nuevo__lista comprar-nuevo__lista--filas'}>
          {productosFiltrados.map((producto) => {
            const tieneDescuentoCN = producto.precio_original_usd != null && producto.descuento_activo
            const precioVesCN = tasaVes && producto.precio_usd != null
              ? Number((producto.precio_usd * tasaVes).toFixed(2)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : null
            return (
              <div key={producto.id} className="comprar-nuevo-card">
                <Link to={`/producto/${producto.id}`} className="comprar-nuevo-card__media">
                  {producto.foto_url ? (
                    <img src={producto.foto_url} alt={producto.nombre_comercial} loading="lazy" />
                  ) : (
                    <div className="itemcard__media-placeholder">Sin imagen</div>
                  )}
                </Link>
                <div className="comprar-nuevo-card__info">
                  <Link to={`/producto/${producto.id}`} className="comprar-nuevo-card__nombre">
                    {producto.nombre_comercial}
                  </Link>
                  <div className="comprar-nuevo-card__precios">
                    {tieneDescuentoCN ? (
                      <>
                        <span className="comprar-nuevo-card__precio-ahora">
                          <span className="comprar-nuevo-card__precio-ahora-label">Ahora</span>
                          <PrecioSuperIndice valor={producto.precio_usd} />
                        </span>
                        <span className="comprar-nuevo-card__precio-original">
                          <PrecioSuperIndice valor={producto.precio_original_usd} />
                        </span>
                      </>
                    ) : (
                      <span className="comprar-nuevo-card__precio-normal">
                        <PrecioSuperIndice valor={producto.precio_usd} />
                      </span>
                    )}
                    {precioVesCN && (
                      <span className="comprar-nuevo-card__precio-ves">
                        ≈ Bs. {precioVesCN}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`comprar-nuevo-card__cta ${cantidadEnCarrito(producto.id) ? 'comprar-nuevo-card__cta--cantidad' : ''}`}
                    onClick={() => addItem(producto, 1)}
                  >
                    {cantidadEnCarrito(producto.id)
                      ? `En el carrito (${cantidadEnCarrito(producto.id)})`
                      : 'Agregar al carrito'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------
// Componente principal
// ---------------------------------------------------------
const TABS = [
  { id: 'items', label: 'Mis Items' },
  { id: 'recomprar', label: 'Comprar de nuevo' },
]

function MisItems() {
  // La pestaña activa vive en la URL (?tab=recomprar) en vez de un
  // useState suelto: así el link "Comprar de nuevo" del menú de
  // Páginas Principales puede llevar directo a esa pestaña, y el
  // botón "atrás" del navegador también funciona como uno espera.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabActivo = searchParams.get('tab') === 'recomprar' ? 'recomprar' : 'items'

  // Tasa de cambio VES — global, se carga una sola vez.
  const [tasaVes, setTasaVes] = useState(null)
  useEffect(() => {
    api
      .get('/prices')
      .then((res) => setTasaVes(res.data.usd_a_ves))
      .catch(() => setTasaVes(null))
  }, [])

  function cambiarTab(id) {
    setSearchParams(id === 'recomprar' ? { tab: 'recomprar' } : {})
  }

  // "Crear lista" vive como acción del menú (no una ruta): la
  // controlamos acá arriba para poder dispararla tanto desde el botón
  // "+" del carrusel de listas como desde el link del sidebar/drawer.
  const [mostrarCrear, setMostrarCrear] = useState(false)

  function manejarAccionNav(accion) {
    if (accion === 'crear-lista') {
      cambiarTab('items')
      setMostrarCrear(true)
    }
  }

  return (
    <LayoutPaginaPrincipal
      activo={tabActivo}
      titulo="Mis Items"
      subtitulo="Tus favoritos, listas y compras frecuentes"
      nav={NAV_UNIFICADO}
      onAccion={manejarAccionNav}
    >
      <div className="misitems-page">
        <div className="misitems-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`misitems-tab ${tabActivo === tab.id ? 'misitems-tab--activo' : ''}`}
              onClick={() => cambiarTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="misitems-container">
          {tabActivo === 'items' && <TabMisItems mostrarCrear={mostrarCrear} setMostrarCrear={setMostrarCrear} tasaVes={tasaVes} />}
          {tabActivo === 'recomprar' && <TabComprarDeNuevo tasaVes={tasaVes} />}
        </div>
      </div>
    </LayoutPaginaPrincipal>
  )
}

export default MisItems
