import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import BottomNav from '../components/BottomNav'
import Footer from '../components/Footer'
import InhrrFichaModal from '../components/InhrrFichaModal'
import { useEsMobile } from '../hooks/useEsMobile'
import { CATEGORIAS, COLOR_CATEGORIA, nombreCategoria, formatFecha } from '../utils/inhrr'
import './Catalogo.css'
import './RegistroInhrr.css'

const PAGE_SIZE = 20

function RegistroInhrr() {
  const esMobile = useEsMobile(768)
  const [searchParams] = useSearchParams()
  const skuDeepLink = searchParams.get('sku')

  const [termino, setTermino] = useState('')
  const [terminoActivo, setTerminoActivo] = useState('')
  const [moleculaInput, setMoleculaInput] = useState('')
  const [moleculaActiva, setMoleculaActiva] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState('')
  const [formaActiva, setFormaActiva] = useState('')
  const [laboratorioActivo, setLaboratorioActivo] = useState('')

  const [metadata, setMetadata] = useState({ categorias: [], formas: [], laboratorios: [], total: 0 })

  const [productos, setProductos] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [fichaSku, setFichaSku] = useState('')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    categoria: true,
    forma: false,
    laboratorio: false,
    molecula: false,
  })

  useEffect(() => {
    const t = setTimeout(() => setTerminoActivo(termino.trim()), 400)
    return () => clearTimeout(t)
  }, [termino])

  useEffect(() => {
    const t = setTimeout(() => setMoleculaActiva(moleculaInput.trim()), 400)
    return () => clearTimeout(t)
  }, [moleculaInput])

  useEffect(() => {
    api
      .get('/catalogo/metadata')
      .then((res) => setMetadata(res.data || {}))
      .catch((err) => console.error('Error al cargar metadata INHRR:', err))
  }, [])

  const construirParams = useCallback(
    (page) => {
      const params = { page, page_size: PAGE_SIZE }
      if (terminoActivo) params.q = terminoActivo
      if (categoriaActiva) params.categoria = categoriaActiva
      if (formaActiva) params.forma = formaActiva
      if (laboratorioActivo) params.laboratorio = laboratorioActivo
      if (moleculaActiva) params.molecula = moleculaActiva
      return params
    },
    [terminoActivo, categoriaActiva, formaActiva, laboratorioActivo, moleculaActiva]
  )

  const cargarPagina = useCallback(
    async (page = 1) => {
      setCargando(true)
      setError('')
      try {
        const { data } = await api.get('/catalogo', { params: construirParams(page) })
        setProductos(data.rows || [])
        setTotal(data.total ?? 0)
        setPagina(data.page ?? page)
      } catch (err) {
        console.error('Error al cargar registro INHRR:', err)
        setError('No se pudieron cargar los registros del catálogo.')
      } finally {
        setCargando(false)
      }
    },
    [construirParams]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarPagina(1)
  }, [cargarPagina])

  useEffect(() => {
    if (!skuDeepLink) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFichaSku(skuDeepLink)
  }, [skuDeepLink])

  const toggleSeccion = (key) =>
    setSeccionesAbiertas((prev) => ({ ...prev, [key]: !prev[key] }))

  const togglePill = (valor, setter) =>
    setter((prev) => (prev === valor ? '' : valor))

  const limpiarFiltros = () => {
    setTermino('')
    setCategoriaActiva('')
    setFormaActiva('')
    setLaboratorioActivo('')
    setMoleculaInput('')
  }

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hayFiltros =
    termino.trim() !== '' ||
    categoriaActiva !== '' ||
    formaActiva !== '' ||
    laboratorioActivo !== '' ||
    moleculaInput.trim() !== ''

  const irAPagina = (p) => {
    if (p < 1 || p > totalPaginas || p === pagina) return
    cargarPagina(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const paginas = []
  const desde = Math.max(1, pagina - 2)
  const hasta = Math.min(totalPaginas, pagina + 2)
  for (let i = desde; i <= hasta; i++) paginas.push(i)

  const filtrosUI = () => (
    <>
      <div className="filtro-seccion">
        <button className="filtro-accordion-btn" type="button" onClick={() => toggleSeccion('categoria')}>
          <span>Categoría</span>
          <span
            className="filtro-chevron"
            style={{ transform: seccionesAbiertas.categoria ? 'rotate(180deg)' : 'none' }}
          >
            ⌄
          </span>
        </button>
        {seccionesAbiertas.categoria && (
          <div className="filtro-content">
            <div className="inhrr-pills-cat">
              {CATEGORIAS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`filtro-pill inhrr-pill-cat ${categoriaActiva === c.id ? 'active' : ''}`}
                  style={
                    categoriaActiva === c.id
                      ? { background: COLOR_CATEGORIA[c.id], borderColor: COLOR_CATEGORIA[c.id], color: '#fff' }
                      : undefined
                  }
                  onClick={() => togglePill(c.id, setCategoriaActiva)}
                >
                  {c.icono} {c.nombre}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="filtro-seccion">
        <button className="filtro-accordion-btn" type="button" onClick={() => toggleSeccion('forma')}>
          <span>Forma farmacéutica</span>
          <span className="filtro-chevron" style={{ transform: seccionesAbiertas.forma ? 'rotate(180deg)' : 'none' }}>
            ⌄
          </span>
        </button>
        {seccionesAbiertas.forma && (
          <div className="filtro-content">
            {(metadata.formas || []).length === 0 ? (
              <p className="filtro-vacio">Sin datos aún</p>
            ) : (
              <select
                className="inhrr-select"
                value={formaActiva}
                onChange={(e) => setFormaActiva(e.target.value)}
              >
                <option value="">Todas las formas</option>
                {(metadata.formas || []).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="filtro-seccion">
        <button className="filtro-accordion-btn" type="button" onClick={() => toggleSeccion('laboratorio')}>
          <span>Laboratorio</span>
          <span className="filtro-chevron" style={{ transform: seccionesAbiertas.laboratorio ? 'rotate(180deg)' : 'none' }}>
            ⌄
          </span>
        </button>
        {seccionesAbiertas.laboratorio && (
          <div className="filtro-content">
            {(metadata.laboratorios || []).length === 0 ? (
              <p className="filtro-vacio">Sin datos aún</p>
            ) : (
              <select
                className="inhrr-select"
                value={laboratorioActivo}
                onChange={(e) => setLaboratorioActivo(e.target.value)}
              >
                <option value="">Todos los laboratorios</option>
                {(metadata.laboratorios || []).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="filtro-seccion">
        <button className="filtro-accordion-btn" type="button" onClick={() => toggleSeccion('molecula')}>
          <span>Principio activo</span>
          <span className="filtro-chevron" style={{ transform: seccionesAbiertas.molecula ? 'rotate(180deg)' : 'none' }}>
            ⌄
          </span>
        </button>
        {seccionesAbiertas.molecula && (
          <div className="filtro-content filtro-content--abierto">
            <input
              type="text"
              placeholder="Ej. Amoxicilina, Insulina…"
              value={moleculaInput}
              onChange={(e) => setMoleculaInput(e.target.value)}
              className="filtro-molecula-input"
            />
            <p className="filtro-vacio">Filtra productos que contienen esa molécula (por su ATC/nombre).</p>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="catalogo-layout">
      <section className="inhrr-hero">
        <div className="inhrr-hero__inner">
          <p className="inhrr-hero__tag">Consulta pública · INHRR</p>
          <h1 className="inhrr-hero__title">Registro sanitario de medicamentos</h1>
          <p className="inhrr-hero__desc">
            {metadata.total
              ? `Catálogo de consulta con ${metadata.total.toLocaleString('es-VE')} productos con registro sanitario`
              : 'Catálogo de consulta con miles de productos con registro sanitario'}{' '}
            venezolano (INHRR): nombre, forma farmacéutica, laboratorio y molécula/ATC.
          </p>
          <div className="inhrr-search">
            <span className="inhrr-search__icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre del producto (ej. Amoxicilina, Tylenol, Insulina…)"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
            />
            {termino !== '' && (
              <button
                type="button"
                className="inhrr-search__clear"
                aria-label="Limpiar búsqueda"
                onClick={() => setTermino('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      <header className="catalogo-header inhrr-header">
        <div className="header-titles">
          <h1>
            {terminoActivo ? `Resultados para "${terminoActivo}"` : 'Registros activos'}
            {' '}
            <span>({total.toLocaleString('es-VE')})</span>
          </h1>
          <p className="header-subtitle">
            {terminoActivo
              ? 'Mostrando registros que coinciden con la búsqueda'
              : 'Consulta por nombre, forma farmacéutica, laboratorio o principio activo.'}
          </p>
        </div>

        {esMobile && (
          <button type="button" className="catalogo-filtros-btn" onClick={() => setFiltrosAbiertos(true)}>
            Filtros
          </button>
        )}

        {!esMobile && (
          <div className="catalogo-ordenar-desktop">
            <span className="catalogo-ordenar-label">Página</span>
            <span className="inhrr-pagina-info">
              {pagina} de {totalPaginas}
            </span>
          </div>
        )}
      </header>

      <div className="catalogo-body">
        {!esMobile && (
          <aside className="catalogo-filtros">
            {hayFiltros && (
              <button type="button" className="btn-limpiar-filtros" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            )}
            {filtrosUI()}
          </aside>
        )}

        <main className="catalogo-main-content">
          {cargando ? (
            <div className="product-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="inhrr-skeleton" />
              ))}
            </div>
          ) : error ? (
            <p className="catalogo-estado catalogo-error">{error}</p>
          ) : productos.length === 0 ? (
            <p className="catalogo-vacio">No encontramos registros para esta búsqueda. Prueba con otros filtros.</p>
          ) : (
            <div className="product-grid">
              {productos.map((p) => (
                <article key={p.id} className="inhrr-card">
                  <div className="inhrr-card__top">
                    <span
                      className="inhrr-card__cat"
                      style={{ background: COLOR_CATEGORIA[p.categoria] || '#6B7280' }}
                    >
                      {p.categoria} · {nombreCategoria(p.categoria)}
                    </span>
                    <span className="inhrr-card__sku">{p.sku}</span>
                  </div>
                  <h3 className="inhrr-card__nombre">{p.nombre}</h3>
                  <ul className="inhrr-card__meta">
                    {p.forma && (
                      <li>
                        <span>Forma</span>
                        {p.forma}
                      </li>
                    )}
                    {p.laboratorio && (
                      <li className="inhrr-card__lab">
                        <span>Laboratorio</span>
                        {p.laboratorio}
                      </li>
                    )}
                    {p.fecha_vigencia && (
                      <li>
                        <span>Vigente hasta</span>
                        {formatFecha(p.fecha_vigencia)}
                      </li>
                    )}
                  </ul>
                  {p.moleculas?.length > 0 && (
                    <div className="inhrr-card__mols">
                      {p.moleculas.map((m) => (
                        <span key={m.id} className="inhrr-mol-chip">
                          {m.nombre}
                          {m.atc ? ` · ${m.atc}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {!p.moleculas?.length && (
                    <p className="inhrr-card__sinmol">Sin molécula enlazada</p>
                  )}
                  <button type="button" className="inhrr-card__btn" onClick={() => setFichaSku(p.sku)}>
                    Ver ficha
                  </button>
                </article>
              ))}
            </div>
          )}

          {!cargando && total > 0 && (
            <nav className="inhrr-paginacion" aria-label="Paginación">
              <button type="button" disabled={pagina <= 1} onClick={() => irAPagina(pagina - 1)}>
                ◀ Anterior
              </button>
              {desde > 1 && (
                <button type="button" onClick={() => irAPagina(1)}>
                  1
                </button>
              )}
              {desde > 2 && <span className="inhrr-paginacion__sep">…</span>}
              {paginas.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={p === pagina ? 'activa' : ''}
                  onClick={() => irAPagina(p)}
                >
                  {p}
                </button>
              ))}
              {hasta < totalPaginas - 1 && <span className="inhrr-paginacion__sep">…</span>}
              {hasta < totalPaginas && (
                <button type="button" onClick={() => irAPagina(totalPaginas)}>
                  {totalPaginas}
                </button>
              )}
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => irAPagina(pagina + 1)}
              >
                Siguiente ▶
              </button>
            </nav>
          )}
        </main>
      </div>

      {esMobile && filtrosAbiertos && (
        <>
          <div className="catalogo-overlay" onClick={() => setFiltrosAbiertos(false)} />
          <div className="catalogo-filtros-modal">
            <div className="catalogo-filtros-modal__header">
              <span>Filtros</span>
              <button type="button" onClick={() => setFiltrosAbiertos(false)} aria-label="Cerrar filtros">
                ✕
              </button>
            </div>
            {hayFiltros && (
              <button type="button" className="btn-limpiar-filtros" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            )}
            {filtrosUI()}
            <button
              type="button"
              className="catalogo-filtros-modal__apply"
              onClick={() => setFiltrosAbiertos(false)}
            >
              Aplicar filtros
            </button>
          </div>
        </>
      )}

      {fichaSku && (
        <InhrrFichaModal fichaSku={fichaSku} onClose={() => setFichaSku('')} />
      )}

      <Footer />

      <div className="catalogo-espaciador" aria-hidden="true" />
      <BottomNav />
    </div>
  )
}

export default RegistroInhrr