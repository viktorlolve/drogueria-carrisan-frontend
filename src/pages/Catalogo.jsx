import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import ProductCard from '../components/ProductCard'
import ProductCardSkeleton from '../components/Productcardskeleton'
import BottomNav from '../components/BottomNav'
import InfiniteScrollLoader from '../components/InfiniteScrollLoader'
import Footer from '../components/Footer'
import CategoriasCarruselCatalogo from '../components/CategoriasCarruselCatalogo'
import './Catalogo.css'

const PAGE_SIZE = 24

function Catalogo() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const searchTerm = searchParams.get('search') || ''
  const categoriaParam = searchParams.get('categoria') || ''
  const laboratorioParam = searchParams.get('laboratorio') || ''
  const moleculaParam = searchParams.get('molecula') || ''
  const lineaParam = searchParams.get('linea') || ''

  const [productos, setProductos] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [tasaVes, setTasaVes] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState('')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [sort, setSort] = useState('nombre_asc')
  const [categoriaActiva, setCategoriaActiva] = useState(categoriaParam || 'todos')
  const [laboratoriosActivos, setLaboratoriosActivos] = useState(
    laboratorioParam ? [laboratorioParam] : []
  )
  const [formasActivas, setFormasActivas] = useState([])
  const [soloDisponibles, setSoloDisponibles] = useState(false)
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [moleculaInput, setMoleculaInput] = useState(moleculaParam)
const [moleculaActiva, setMoleculaActiva] = useState(moleculaParam)
  const [lineaActiva, setLineaActiva] = useState(lineaParam)
  const [laboratoriosTop, setLaboratoriosTop] = useState([])
  const [labsVisibles, setLabsVisibles] = useState(20)
  const [formasDisponibles, setFormasDisponibles] = useState([])
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([])

  // Lista de pills: "Todo" + las categorías reales desde /products/metadata
  const categoriasLista = useMemo(
    () => [{ id: 'todos', nombre: 'Todo', icono: 'LayoutGrid' }, ...categoriasDisponibles],
    [categoriasDisponibles]
  )
  const nombreCategoriaActiva =
    categoriasLista.find((c) => c.id === categoriaActiva)?.nombre || categoriaActiva

  // Etiqueta legible para el filtro por línea (param `?linea=`).
  const LINEAS_TITULO = {
    farmacia: 'Línea Farmacia',
    hospitalaria: 'Línea Hospitalaria',
    'material-medico': 'Material Médico',
  }
  const tituloSeccion =
    searchTerm
      ? `Resultados para "${searchTerm}"`
      : `Resultados para "${lineaActiva ? LINEAS_TITULO[lineaActiva] || lineaActiva : categoriaActiva === 'todos' ? 'Catálogo' : nombreCategoriaActiva}"`

  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    laboratorio: false,
    forma: false,
    disponibilidad: false,
    precio: false,
    molecula: moleculaParam !== '',
  })

  const mainRef = useRef(null)

const [esDesktop, setEsDesktop] = useState(
  typeof window !== 'undefined' ? window.innerWidth > 768 : true
)

useEffect(() => {
  function handleResize() {
    setEsDesktop(window.innerWidth > 768)
  }
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])

useEffect(() => {
  const t = setTimeout(() => setMoleculaActiva(moleculaInput.trim()), 400)
  return () => clearTimeout(t)
}, [moleculaInput])

// Sincroniza la línea activa cuando la URL cambia (ej. /catalogo?linea=farmacia),
// porque el componente no se remonta entre cambios de query del mismo path.
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setLineaActiva(lineaParam)
}, [lineaParam])

  // ── Metadata de filtros (laboratorios/formas/categorías) — un solo fetch ligero ──
  useEffect(() => {
    api
      .get('/products/metadata', { params: { disponibles: 'true' } })
      .then((res) => {
        setLaboratoriosTop(res.data.laboratoriosTop || [])
        setFormasDisponibles(res.data.formas || [])
        setCategoriasDisponibles(res.data.categorias || [])
      })
      .catch((err) => console.error('Error al cargar metadata de filtros:', err))
  }, [])

  // Construye los parámetros de consulta a partir del estado actual de filtros.
  const construirQuery = useCallback((
    { search = searchTerm, page = 1, limit = PAGE_SIZE } = {}
  ) => {
    const params = { sort, page, limit }
    if (search) params.search = search
    if (lineaActiva) params.linea = lineaActiva
    if (categoriaActiva !== 'todos') params.categoria = categoriaActiva
    if (laboratoriosActivos.length > 0) params.laboratorio = laboratoriosActivos.join(',')
    if (formasActivas.length > 0) params.forma = formasActivas.join(',')
    if (soloDisponibles) params.disponible = 'true'
    if (precioMin !== '') params.precio_min = precioMin
    if (precioMax !== '') params.precio_max = precioMax
    if (moleculaActiva) params.molecula = moleculaActiva
    return params
  }, [searchTerm, sort, categoriaActiva, lineaActiva, laboratoriosActivos, formasActivas, soloDisponibles, precioMin, precioMax, moleculaActiva])

  // Carga una página determinada. Si `reset` es true, reemplaza la lista
  // (primera página); si es false, agrega al final (infinite scroll).
  // El estado de carga se maneja aquí dentro (no en el body de un effect).
  const cargarPagina = useCallback(async ({ page, reset } = {}) => {
    if (reset) {
      setCargando(true)
      setError('')
    } else {
      setCargandoMas(true)
    }
    try {
      const { data } = await api.get('/products', { params: construirQuery({ page }) })
      const nuevos = data.productos || []
      setTotal(data.total ?? nuevos.length)
      setHasMore(!!data.hasMore)
      setPagina(data.page ?? page)
      setProductos(prev => (reset ? nuevos : [...prev, ...nuevos]))
    } catch (err) {
      console.error('Error al cargar productos:', err)
      setError('No se pudieron cargar los productos')
    } finally {
      if (reset) setCargando(false)
      else setCargandoMas(false)
    }
  }, [construirQuery])

  // Carga inicial + cada vez que cambian búsqueda, orden o filtros → página 1.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarPagina({ page: 1, reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, sort, categoriaActiva, lineaActiva, laboratoriosActivos, formasActivas, soloDisponibles, precioMin, precioMax, moleculaActiva])

  // Tasa de cambio ves — global, se carga una sola vez.
  useEffect(() => {
    api
      .get('/prices')
      .then((res) => setTasaVes(res.data.usd_a_ves))
      .catch((err) => console.error(err))
  }, [])

  // ── Infinite scroll: sentinel al final de la grilla → carga siguiente página ──
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (cargando || !hasMore || cargandoMas) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          cargarPagina({ page: pagina + 1, reset: false })
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [cargando, hasMore, cargandoMas, pagina, cargarPagina])

  function toggleSeccion(key) {
    setSeccionesAbiertas((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleEnArray(valor, array, setArray) {
    setArray((prev) =>
      prev.includes(valor) ? prev.filter((v) => v !== valor) : [...prev, valor]
    )
  }

  function quitarBusqueda() {
    const params = new URLSearchParams(searchParams)
    params.delete('search')
    const qs = params.toString()
    navigate(qs ? `/catalogo?${qs}` : '/catalogo')
  }

  function limpiarFiltros() {
    setCategoriaActiva('todos')
    setLineaActiva('')
    setLaboratoriosActivos([])
    setFormasActivas([])
    setSoloDisponibles(false)
    setPrecioMin('')
    setPrecioMax('')
    setMoleculaInput('')
    setMoleculaActiva('')
    quitarBusqueda()
  }

  function seleccionarCategoria(id) {
    setCategoriaActiva(id)
    mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (error) return <p className="catalogo-estado catalogo-error">{error}</p>

  const filtrosActivos = []
  if (searchTerm) filtrosActivos.push({ id: 'busqueda', tipo: 'Búsqueda', etiqueta: searchTerm, remover: quitarBusqueda })
  if (categoriaActiva !== 'todos') filtrosActivos.push({ id: 'categoria', tipo: 'Categoría', etiqueta: nombreCategoriaActiva, remover: () => setCategoriaActiva('todos') })
  if (lineaActiva) filtrosActivos.push({ id: 'linea', tipo: 'Línea', etiqueta: LINEAS_TITULO[lineaActiva] || lineaActiva, remover: () => setLineaActiva('') })
  laboratoriosActivos.forEach((l) => filtrosActivos.push({ id: `lab-${l}`, tipo: 'Laboratorio', etiqueta: l, remover: () => toggleEnArray(l, laboratoriosActivos, setLaboratoriosActivos) }))
  formasActivas.forEach((f) => filtrosActivos.push({ id: `forma-${f}`, tipo: 'Forma', etiqueta: f, remover: () => toggleEnArray(f, formasActivas, setFormasActivas) }))
  if (soloDisponibles) filtrosActivos.push({ id: 'disponible', tipo: 'Disponible', etiqueta: 'Solo disponibles', remover: () => setSoloDisponibles(false) })
  if (precioMin !== '' || precioMax !== '') {
    const etiquetaPrecio = precioMin !== '' && precioMax !== ''
      ? `$${precioMin} – $${precioMax}`
      : precioMin !== '' ? `desde $${precioMin}` : `hasta $${precioMax}`
    filtrosActivos.push({ id: 'precio', tipo: 'Precio', etiqueta: etiquetaPrecio, remover: () => { setPrecioMin(''); setPrecioMax('') } })
  }
  if (moleculaActiva) filtrosActivos.push({ id: 'molecula', tipo: 'Principio activo', etiqueta: moleculaActiva, remover: () => { setMoleculaInput(''); setMoleculaActiva('') } })

  const hayFiltrosActivos =
    lineaActiva !== '' ||
    categoriaActiva !== 'todos' ||
    laboratoriosActivos.length > 0 ||
    formasActivas.length > 0 ||
    soloDisponibles ||
    precioMin !== '' ||
    precioMax !== '' ||
    moleculaActiva !== ''

  const totalFiltrosActivos =
    (lineaActiva !== '' ? 1 : 0) +
    (categoriaActiva !== 'todos' ? 1 : 0) +
    (sort !== 'relevancia' ? 1 : 0) +
    laboratoriosActivos.length +
    formasActivas.length +
    (soloDisponibles ? 1 : 0) +
    (precioMin !== '' || precioMax !== '' ? 1 : 0) +
    (moleculaActiva !== '' ? 1 : 0)

  return (
    <div className="catalogo-layout">
      {/* Carrusel compacto de categorías — chips que filtran la grilla en vivo */}
      <CategoriasCarruselCatalogo
        categorias={categoriasDisponibles}
        activoId={categoriaActiva}
        onSeleccionar={seleccionarCategoria}
      />

      <header className="catalogo-header">
        <div className="header-titles">
          <h1>
            {tituloSeccion}
            {' '}
            <span>({total} artículos)</span>
          </h1>
          <p className="header-subtitle">
            {searchTerm
              ? `Mostrando productos que coinciden con "${searchTerm}"`
              : 'Usa los detalles del artículo. Precio al comprar por la plataforma.'
            }
          </p>
        </div>

        {/* Botón Filtros — solo mobile */}
        {!esDesktop && (
          <button
            type="button"
            className="catalogo-filtros-btn"
            onClick={() => setFiltrosAbiertos(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"></circle>
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"></circle>
              <line x1="4" y1="18" x2="20" y2="18"></line>
              <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none"></circle>
            </svg>
            Filtros
          </button>
        )}

        {/* Ordenar por — desktop */}
        {esDesktop && (
          <div className="catalogo-ordenar-desktop">
            <span className="catalogo-ordenar-label">Ordenar por</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="catalogo-sort-select"
            >
              <option value="relevancia">Mejor coincidencia</option>
              <option value="nombre_asc">Nombre (A-Z)</option>
              <option value="nombre_desc">Nombre (Z-A)</option>
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
            </select>
          </div>
        )}
      </header>

      <div className="catalogo-body">
        {/* Sidebar filtros — solo desktop */}
        {esDesktop && (
          <aside className="catalogo-filtros">
            {hayFiltrosActivos && (
              <button type="button" className="btn-limpiar-filtros" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            )}

<div className="filtro-seccion">
  <button className="filtro-accordion-btn" onClick={() => toggleSeccion('molecula')}>
    <span>Principio activo</span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ transform: seccionesAbiertas.molecula ? 'rotate(180deg)' : 'none' }}>
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </button>
  {seccionesAbiertas.molecula && (
    <div className="filtro-content">
      <input
        type="text"
        placeholder="Ej. Paracetamol, Ibuprofeno..."
        value={moleculaInput}
        onChange={(e) => setMoleculaInput(e.target.value)}
        className="filtro-molecula-input"
      />
    </div>
  )}
</div>

            {/* Laboratorio */}
            <div className="filtro-seccion">
              <button className="filtro-accordion-btn" onClick={() => toggleSeccion('laboratorio')}>
                <span>Laboratorio</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: seccionesAbiertas.laboratorio ? 'rotate(180deg)' : 'none' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {seccionesAbiertas.laboratorio && (
                <div className="filtro-content">
                  {laboratoriosTop.length === 0 && (
                    <p className="filtro-vacio">Sin datos aún</p>
                  )}
                  {laboratoriosTop.slice(0, labsVisibles).map((lab) => (
                    <button
                      key={lab.nombre}
                      className={`filtro-pill ${laboratoriosActivos.includes(lab.nombre) ? 'active' : ''}`}
                      onClick={() => toggleEnArray(lab.nombre, laboratoriosActivos, setLaboratoriosActivos)}
                    >
                      {lab.nombre} <span className="filtro-pill__count">{lab.total}</span>
                    </button>
                  ))}
                  {labsVisibles < laboratoriosTop.length && (
                    <button
                      className="filtro-ver-mas"
                      onClick={() => setLabsVisibles((v) => v + 20)}
                    >
                      Cargar más ({laboratoriosTop.length - labsVisibles} restantes)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Forma */}
            <div className="filtro-seccion">
              <button className="filtro-accordion-btn" onClick={() => toggleSeccion('forma')}>
                <span>Forma</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: seccionesAbiertas.forma ? 'rotate(180deg)' : 'none' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {seccionesAbiertas.forma && (
                <div className="filtro-content">
                  {formasDisponibles.length === 0 && (
                    <p className="filtro-vacio">Sin datos aún</p>
                  )}
                  {formasDisponibles.map((forma) => (
                    <button
                      key={forma}
                      className={`filtro-pill ${formasActivas.includes(forma) ? 'active' : ''}`}
                      onClick={() => toggleEnArray(forma, formasActivas, setFormasActivas)}
                    >
                      {forma}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Disponibilidad */}
            <div className="filtro-seccion">
              <button className="filtro-accordion-btn" onClick={() => toggleSeccion('disponibilidad')}>
                <span>Disponibilidad</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: seccionesAbiertas.disponibilidad ? 'rotate(180deg)' : 'none' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {seccionesAbiertas.disponibilidad && (
                <div className="filtro-content">
                  <label className="filtro-checkbox">
                    <input
                      type="checkbox"
                      checked={soloDisponibles}
                      onChange={(e) => setSoloDisponibles(e.target.checked)}
                    />
                    Solo productos disponibles
                  </label>
                </div>
              )}
            </div>

            {/* Precio */}
            <div className="filtro-seccion">
              <button className="filtro-accordion-btn" onClick={() => toggleSeccion('precio')}>
                <span>Precio (USD)</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: seccionesAbiertas.precio ? 'rotate(180deg)' : 'none' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {seccionesAbiertas.precio && (
                <div className="filtro-precio-rango">
                  <input
                    type="number"
                    placeholder="Mín"
                    value={precioMin}
                    onChange={(e) => setPrecioMin(e.target.value)}
                    min="0"
                  />
                  <span>—</span>
                  <input
                    type="number"
                    placeholder="Máx"
                    value={precioMax}
                    onChange={(e) => setPrecioMax(e.target.value)}
                    min="0"
                  />
                </div>
              )}
            </div>
          </aside>
        )}

        <main className="catalogo-main-content" ref={mainRef}>
          {filtrosActivos.length > 0 && (
            <div className="catalogo-filtros-activos">
              {filtrosActivos.map((f) => (
                <button key={f.id} type="button" className="catalogo-filtros-activos__chip" onClick={f.remover}>
                  <span className="catalogo-filtros-activos__tipo">{f.tipo}:</span>
                  <span className="catalogo-filtros-activos__valor">{f.etiqueta}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              ))}
              <button type="button" className="btn-limpiar-filtros catalogo-filtros-activos__limpiar" onClick={limpiarFiltros}>
                Limpiar todo
              </button>
            </div>
          )}
          {cargando ? (
            <div className="product-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : productos.length === 0 ? (
            <p className="catalogo-vacio">No encontramos productos para esta búsqueda.</p>
          ) : (
            <div className="product-grid">
              {productos.map((producto) => (
                <ProductCard key={producto.id} producto={producto} tasaVes={tasaVes} />
              ))}
            </div>
          )}

          {/* Sentinel para infinite scroll */}
          {!cargando && productos.length > 0 && hasMore && (
            <div ref={sentinelRef} className="catalogo-sentinel" />
          )}
          {cargandoMas && <InfiniteScrollLoader />}
        </main>
      </div>

      {/* Bloque informativo + footer — solo al llegar al final de los resultados */}
      {!cargando && total > 0 && !hasMore && (
        <div className="catalogo-final">
          <section className="catalogo-contacto">
            <div className="catalogo-contacto__info">
              <h2>¿No encuentras lo que buscas?</h2>
              <p>
                Cuéntanos qué producto necesitas y haremos todo lo posible por conseguirlo
                para ti. Nuestro equipo lo revisará y te responderá a la brevedad.
              </p>
            </div>
            <Link to="/mis-solicitudes/requerimientos" className="catalogo-contacto__btn">
              ¡Solicítalo aquí!
            </Link>
          </section>
          <Footer />
        </div>
      )}

      {/* Modal filtros — solo mobile (bottom sheet propio, distinto al sidebar desktop) */}
      {!esDesktop && filtrosAbiertos && (
        <>
          <div className="catalogo-overlay" onClick={() => setFiltrosAbiertos(false)} />
          <div className="cfm-sheet" role="dialog" aria-modal="true" aria-label="Filtros del catálogo">
            <div className="cfm-sheet__grip" aria-hidden="true" />

            <div className="cfm-sheet__header">
              <div className="cfm-sheet__titulo">
                Filtros
                {totalFiltrosActivos > 0 && (
                  <span className="cfm-sheet__contador">{totalFiltrosActivos}</span>
                )}
              </div>
              <button
                type="button"
                className="cfm-sheet__cerrar"
                onClick={() => setFiltrosAbiertos(false)}
                aria-label="Cerrar filtros"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="cfm-sheet__body">
              {/* Ordenar por — filas tipo radio */}
              <section className="cfm-seccion">
                <h3 className="cfm-seccion__titulo">Ordenar por</h3>
                <div className="cfm-sort">
                  {[
                    { value: 'relevancia', label: 'Mejor coincidencia' },
                    { value: 'nombre_asc', label: 'Nombre (A-Z)' },
                    { value: 'nombre_desc', label: 'Nombre (Z-A)' },
                    { value: 'precio_asc', label: 'Precio: menor a mayor' },
                    { value: 'precio_desc', label: 'Precio: mayor a menor' },
                  ].map((opt) => {
                    const activa = sort === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`cfm-sort__opcion${activa ? ' cfm-sort__opcion--activa' : ''}`}
                        onClick={() => setSort(opt.value)}
                      >
                        <span className="cfm-sort__radio" aria-hidden="true">
                          {activa && <span className="cfm-sort__radio-dot" />}
                        </span>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Principio activo */}
              <section className="cfm-seccion">
                <button
                  type="button"
                  className="cfm-seccion__head"
                  onClick={() => toggleSeccion('molecula')}
                  aria-expanded={seccionesAbiertas.molecula}
                >
                  <span className="cfm-seccion__label">
                    Principio activo
                    {moleculaActiva !== '' && <span className="cfm-seccion__contador">1</span>}
                  </span>
                  <svg
                    className={`cfm-seccion__chevron${seccionesAbiertas.molecula ? ' cfm-seccion__chevron--abierto' : ''}`}
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {seccionesAbiertas.molecula && (
                  <div className="cfm-seccion__contenido">
                    <input
                      type="text"
                      placeholder="Ej. Paracetamol, Ibuprofeno..."
                      value={moleculaInput}
                      onChange={(e) => setMoleculaInput(e.target.value)}
                      className="cfm-input"
                    />
                  </div>
                )}
              </section>

              {/* Laboratorio */}
              <section className="cfm-seccion">
                <button
                  type="button"
                  className="cfm-seccion__head"
                  onClick={() => toggleSeccion('laboratorio')}
                  aria-expanded={seccionesAbiertas.laboratorio}
                >
                  <span className="cfm-seccion__label">
                    Laboratorio
                    {laboratoriosActivos.length > 0 && (
                      <span className="cfm-seccion__contador">{laboratoriosActivos.length}</span>
                    )}
                  </span>
                  <svg
                    className={`cfm-seccion__chevron${seccionesAbiertas.laboratorio ? ' cfm-seccion__chevron--abierto' : ''}`}
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {seccionesAbiertas.laboratorio && (
                  <div className="cfm-seccion__contenido">
                    {laboratoriosTop.length === 0 && (
                      <p className="cfm-seccion__vacio">Sin datos aún</p>
                    )}
                    <div className="cfm-chips">
                      {laboratoriosTop.slice(0, labsVisibles).map((lab) => (
                        <button
                          key={lab.nombre}
                          type="button"
                          className={`cfm-chip ${laboratoriosActivos.includes(lab.nombre) ? 'cfm-chip--activo' : ''}`}
                          onClick={() => toggleEnArray(lab.nombre, laboratoriosActivos, setLaboratoriosActivos)}
                        >
                          {lab.nombre} <span className="cfm-chip__count">{lab.total}</span>
                        </button>
                      ))}
                    </div>
                    {labsVisibles < laboratoriosTop.length && (
                      <button
                        className="cfm-ver-mas"
                        onClick={() => setLabsVisibles((v) => v + 20)}
                      >
                        Cargar más ({laboratoriosTop.length - labsVisibles} restantes)
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Forma */}
              <section className="cfm-seccion">
                <button
                  type="button"
                  className="cfm-seccion__head"
                  onClick={() => toggleSeccion('forma')}
                  aria-expanded={seccionesAbiertas.forma}
                >
                  <span className="cfm-seccion__label">
                    Forma
                    {formasActivas.length > 0 && (
                      <span className="cfm-seccion__contador">{formasActivas.length}</span>
                    )}
                  </span>
                  <svg
                    className={`cfm-seccion__chevron${seccionesAbiertas.forma ? ' cfm-seccion__chevron--abierto' : ''}`}
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {seccionesAbiertas.forma && (
                  <div className="cfm-seccion__contenido">
                    {formasDisponibles.length === 0 && (
                      <p className="cfm-seccion__vacio">Sin datos aún</p>
                    )}
                    <div className="cfm-chips">
                      {formasDisponibles.map((forma) => (
                        <button
                          key={forma}
                          type="button"
                          className={`cfm-chip ${formasActivas.includes(forma) ? 'cfm-chip--activo' : ''}`}
                          onClick={() => toggleEnArray(forma, formasActivas, setFormasActivas)}
                        >
                          {forma}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Disponibilidad — switch */}
              <section className="cfm-seccion">
                <div className="cfm-seccion__head cfm-seccion__head--fila">
                  <span className="cfm-seccion__label">
                    Disponibilidad
                    {soloDisponibles && <span className="cfm-seccion__contador">1</span>}
                  </span>
                  <label className="cfm-switch">
                    <input
                      type="checkbox"
                      checked={soloDisponibles}
                      onChange={(e) => setSoloDisponibles(e.target.checked)}
                    />
                    <span className="cfm-switch__track" aria-hidden="true" />
                  </label>
                </div>
                <p className="cfm-seccion__nota">Solo productos disponibles</p>
              </section>

              {/* Precio */}
              <section className="cfm-seccion">
                <button
                  type="button"
                  className="cfm-seccion__head"
                  onClick={() => toggleSeccion('precio')}
                  aria-expanded={seccionesAbiertas.precio}
                >
                  <span className="cfm-seccion__label">
                    Precio (USD)
                    {(precioMin !== '' || precioMax !== '') && <span className="cfm-seccion__contador">1</span>}
                  </span>
                  <svg
                    className={`cfm-seccion__chevron${seccionesAbiertas.precio ? ' cfm-seccion__chevron--abierto' : ''}`}
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {seccionesAbiertas.precio && (
                  <div className="cfm-seccion__contenido">
                    <div className="cfm-precio">
                      <input
                        type="number"
                        placeholder="Mín"
                        value={precioMin}
                        onChange={(e) => setPrecioMin(e.target.value)}
                        min="0"
                      />
                      <span>—</span>
                      <input
                        type="number"
                        placeholder="Máx"
                        value={precioMax}
                        onChange={(e) => setPrecioMax(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="cfm-sheet__footer">
              {hayFiltrosActivos && (
                <button type="button" className="cfm-sheet__limpiar" onClick={limpiarFiltros}>
                  Limpiar todo
                </button>
              )}
              <button type="button" className="cfm-sheet__aplicar" onClick={() => setFiltrosAbiertos(false)}>
                Aplicar filtros{totalFiltrosActivos > 0 ? ` (${totalFiltrosActivos})` : ''}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="catalogo-espaciador" aria-hidden="true" />

      <BottomNav />
    </div>
  )
}

export default Catalogo