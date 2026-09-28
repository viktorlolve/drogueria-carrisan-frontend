import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search,
  X,
  SlidersHorizontal,
  Pill,
  Factory,
  CalendarCheck,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  SearchX,
  Shapes,
} from 'lucide-react'
import api from '../api/axios'
import BottomNav from '../components/BottomNav'
import Footer from '../components/Footer'
import InhrrFichaModal from '../components/InhrrFichaModal'
import { useEsMobile } from '../hooks/useEsMobile'
import { CATEGORIAS, COLOR_CATEGORIA, nombreCategoria, formatFecha, estadoRegistro } from '../utils/inhrr'
import { ICONO_CATEGORIA, ICONO_ESTADO } from '../utils/iconosConsulta'
import './RegistroInhrr.css'

const PAGE_SIZE = 20

function RegistroInhrr() {
  const esMobile = useEsMobile(768)
  const [params, setParams] = useSearchParams()

  // Fuente única de verdad: la URL (filtros compartibles y con botón "atrás")
  const q = params.get('q') || ''
  const categoria = params.get('categoria') || ''
  const forma = params.get('forma') || ''
  const laboratorio = params.get('laboratorio') || ''
  const molecula = params.get('molecula') || ''
  const pagina = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  const fichaSku = params.get('sku') || ''

  const [termino, setTermino] = useState(q)
  const [moleculaInput, setMoleculaInput] = useState(molecula)

  const [metadata, setMetadata] = useState({ formas: [], laboratorios: [], total: 0 })
  const [productos, setProductos] = useState([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [reintento, setReintento] = useState(0)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  const actualizar = useCallback(
    (patch, { reiniciarPagina = true, push = false } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          Object.entries(patch).forEach(([k, v]) => {
            if (v === '' || v == null) next.delete(k)
            else next.set(k, String(v))
          })
          if (reiniciarPagina && !('page' in patch)) next.delete('page')
          return next
        },
        { replace: !push }
      )
    },
    [setParams]
  )

  // Sincroniza los inputs si la URL cambia desde fuera (botón atrás, enlaces)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTermino(q)
  }, [q])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMoleculaInput(molecula)
  }, [molecula])

  // Inputs → URL con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      const v = termino.trim()
      if (v !== q) actualizar({ q: v })
    }, 400)
    return () => clearTimeout(t)
  }, [termino, q, actualizar])

  useEffect(() => {
    const t = setTimeout(() => {
      const v = moleculaInput.trim()
      if (v !== molecula) actualizar({ molecula: v })
    }, 400)
    return () => clearTimeout(t)
  }, [moleculaInput, molecula, actualizar])

  useEffect(() => {
    api
      .get('/catalogo/metadata')
      .then((res) => setMetadata(res.data || {}))
      .catch((err) => console.error('Error al cargar metadata INHRR:', err))
  }, [])

  // Carga de resultados
  useEffect(() => {
    let activo = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true)
    setError('')
    const consulta = { page: pagina, page_size: PAGE_SIZE }
    if (q) consulta.q = q
    if (categoria) consulta.categoria = categoria
    if (forma) consulta.forma = forma
    if (laboratorio) consulta.laboratorio = laboratorio
    if (molecula) consulta.molecula = molecula
    api
      .get('/catalogo', { params: consulta })
      .then(({ data }) => {
        if (!activo) return
        setProductos(data.rows || [])
        setTotal(data.total ?? 0)
      })
      .catch((err) => {
        console.error('Error al cargar registro INHRR:', err)
        if (activo) setError('No se pudieron cargar los registros. Inténtalo de nuevo.')
      })
      .finally(() => activo && setCargando(false))
    return () => {
      activo = false
    }
  }, [q, categoria, forma, laboratorio, molecula, pagina, reintento])

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const irAPagina = (p) => {
    if (p < 1 || p > totalPaginas || p === pagina) return
    actualizar({ page: p > 1 ? p : '' }, { reiniciarPagina: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const abrirFicha = (sku) => actualizar({ sku }, { reiniciarPagina: false, push: true })
  const cerrarFicha = useCallback(() => actualizar({ sku: '' }, { reiniciarPagina: false }), [actualizar])

  const chipsActivos = [
    q && { clave: 'q', etiqueta: `“${q}”` },
    categoria && { clave: 'categoria', etiqueta: nombreCategoria(categoria) },
    forma && { clave: 'forma', etiqueta: forma },
    laboratorio && { clave: 'laboratorio', etiqueta: laboratorio },
    molecula && { clave: 'molecula', etiqueta: `Molécula: ${molecula}` },
  ].filter(Boolean)
  const hayFiltros = chipsActivos.length > 0
  const filtrosLateralesActivos = [forma, laboratorio, molecula].filter(Boolean).length

  const limpiarTodo = () => {
    setTermino('')
    setMoleculaInput('')
    setParams(new URLSearchParams(fichaSku ? { sku: fichaSku } : {}), { replace: true })
  }

  const desde = Math.max(1, pagina - 1)
  const hasta = Math.min(totalPaginas, pagina + 1)
  const numeros = []
  for (let i = desde; i <= hasta; i++) numeros.push(i)

  const panelFiltros = (
    <div className="cs-panel__grupos">
      <div className="cs-campo">
        <label htmlFor="cs-forma">Forma farmacéutica</label>
        <select
          id="cs-forma"
          className="cs-select"
          value={forma}
          onChange={(e) => actualizar({ forma: e.target.value })}
          disabled={(metadata.formas || []).length === 0}
        >
          <option value="">Todas las formas</option>
          {(metadata.formas || []).map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="cs-campo">
        <label htmlFor="cs-lab">Laboratorio</label>
        <select
          id="cs-lab"
          className="cs-select"
          value={laboratorio}
          onChange={(e) => actualizar({ laboratorio: e.target.value })}
          disabled={(metadata.laboratorios || []).length === 0}
        >
          <option value="">Todos los laboratorios</option>
          {(metadata.laboratorios || []).map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="cs-campo">
        <label htmlFor="cs-mol">Principio activo</label>
        <div className="cs-input-icono">
          <FlaskConical size={16} aria-hidden="true" />
          <input
            id="cs-mol"
            type="text"
            placeholder="Ej. Amoxicilina, Insulina…"
            value={moleculaInput}
            onChange={(e) => setMoleculaInput(e.target.value)}
          />
        </div>
        <p className="cs-ayuda">Filtra productos que contienen esa molécula.</p>
      </div>
    </div>
  )

  return (
    <div className="cs-page">
      <section className="cs-hero">
        <div className="cs-container">
          <nav className="cs-crumbs" aria-label="Ruta">
            <Link to="/">Inicio</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span>Registro sanitario</span>
          </nav>
          <p className="cs-hero__tag">Consulta pública · INHRR</p>
          <h1 className="cs-hero__title">Registro sanitario de medicamentos</h1>
          <p className="cs-hero__desc">
            Verifica el registro sanitario venezolano (INHRR) de cada producto: forma farmacéutica,
            laboratorio, vigencia y principio activo con su clasificación ATC.
          </p>

          <form
            className="cs-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              actualizar({ q: termino.trim() })
            }}
          >
            <Search size={20} aria-hidden="true" className="cs-search__icono" />
            <input
              type="text"
              aria-label="Buscar por nombre del producto"
              placeholder="Buscar por nombre del producto (ej. Amoxicilina, Tylenol, Insulina…)"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
            />
            {termino !== '' && (
              <button
                type="button"
                className="cs-search__limpiar"
                aria-label="Limpiar búsqueda"
                onClick={() => setTermino('')}
              >
                <X size={16} />
              </button>
            )}
            <button type="submit" className="cs-search__btn">
              Buscar
            </button>
          </form>

          <ul className="cs-stats">
            <li>
              <strong>{metadata.total ? metadata.total.toLocaleString('es-VE') : '+7.000'}</strong>
              <span>registros consultables</span>
            </li>
            <li>
              <strong>4</strong>
              <span>categorías</span>
            </li>
            <li>
              <strong>ATC</strong>
              <span>enlazado al vademécum</span>
            </li>
          </ul>
        </div>
      </section>

      <div className="cs-tabs-wrap">
        <div className="cs-container">
          <div className="cs-tabs" role="tablist" aria-label="Categoría">
            <button
              type="button"
              role="tab"
              aria-selected={!categoria}
              className={`cs-tab ${!categoria ? 'activa' : ''}`}
              onClick={() => actualizar({ categoria: '' })}
            >
              <Shapes size={16} aria-hidden="true" /> Todos
            </button>
            {CATEGORIAS.map((c) => {
              const Icono = ICONO_CATEGORIA[c.id]
              const activa = categoria === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  className={`cs-tab ${activa ? 'activa' : ''}`}
                  style={{ '--cat': COLOR_CATEGORIA[c.id] }}
                  onClick={() => actualizar({ categoria: activa ? '' : c.id })}
                >
                  <Icono size={16} aria-hidden="true" /> {c.nombre}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="cs-container cs-layout">
        {!esMobile && (
          <aside className="cs-aside">
            <div className="cs-panel">
              <div className="cs-panel__head">
                <h2>Filtros</h2>
                {hayFiltros && (
                  <button type="button" className="cs-link" onClick={limpiarTodo}>
                    Limpiar todo
                  </button>
                )}
              </div>
              {panelFiltros}
            </div>
          </aside>
        )}

        <main className="cs-main">
          <div className="cs-resultados-head">
            <div>
              <h2 className="cs-resultados-head__titulo">
                {q ? `Resultados para “${q}”` : 'Registros sanitarios'}
                <span> · {total.toLocaleString('es-VE')}</span>
              </h2>
              <p className="cs-resultados-head__sub">
                {total > 0
                  ? `Página ${pagina} de ${totalPaginas}`
                  : 'Consulta por nombre, forma farmacéutica, laboratorio o principio activo.'}
              </p>
            </div>
            {esMobile && (
              <button type="button" className="cs-boton cs-boton--suave" onClick={() => setFiltrosAbiertos(true)}>
                <SlidersHorizontal size={16} /> Filtros
                {filtrosLateralesActivos > 0 && <span className="cs-contador">{filtrosLateralesActivos}</span>}
              </button>
            )}
          </div>

          {hayFiltros && (
            <div className="cs-activos" aria-label="Filtros activos">
              {chipsActivos.map((c) => (
                <button
                  key={c.clave}
                  type="button"
                  className="cs-activo"
                  onClick={() => {
                    if (c.clave === 'q') setTermino('')
                    if (c.clave === 'molecula') setMoleculaInput('')
                    actualizar({ [c.clave]: '' })
                  }}
                >
                  {c.etiqueta} <X size={13} aria-hidden="true" />
                  <span className="cs-sr">Quitar filtro</span>
                </button>
              ))}
            </div>
          )}

          {cargando ? (
            <div className="cs-grid" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="cs-skeleton" />
              ))}
            </div>
          ) : error ? (
            <div className="cs-vacio-grande">
              <p>{error}</p>
              <button type="button" className="cs-boton cs-boton--primario" onClick={() => setReintento((n) => n + 1)}>
                Reintentar
              </button>
            </div>
          ) : productos.length === 0 ? (
            <div className="cs-vacio-grande">
              <SearchX size={40} aria-hidden="true" />
              <h3>No encontramos registros</h3>
              <p>Revisa la ortografía o prueba con menos filtros.</p>
              {hayFiltros && (
                <button type="button" className="cs-boton cs-boton--primario" onClick={limpiarTodo}>
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="cs-grid">
              {productos.map((p) => {
                const estado = estadoRegistro(p)
                const IconoEstado = ICONO_ESTADO[estado.clave]
                const IconoCat = ICONO_CATEGORIA[p.categoria] || ICONO_CATEGORIA.MI
                return (
                  <article
                    key={p.id}
                    className="cs-card"
                    style={{ '--cat': COLOR_CATEGORIA[p.categoria] || '#6B7280' }}
                  >
                    <div className="cs-card__top">
                      <span className="cs-tag">
                        <IconoCat size={13} aria-hidden="true" /> {nombreCategoria(p.categoria)}
                      </span>
                      <span className={`cs-estado cs-estado--${estado.clave}`}>
                        <IconoEstado size={12} aria-hidden="true" /> {estado.etiqueta}
                      </span>
                    </div>

                    <h3 className="cs-card__nombre">{p.nombre}</h3>

                    <ul className="cs-card__meta">
                      {p.forma && (
                        <li>
                          <Pill size={14} aria-hidden="true" />
                          <span>{p.forma}</span>
                        </li>
                      )}
                      {p.laboratorio && (
                        <li>
                          <Factory size={14} aria-hidden="true" />
                          <span>{p.laboratorio}</span>
                        </li>
                      )}
                      {p.fecha_vigencia && (
                        <li>
                          <CalendarCheck size={14} aria-hidden="true" />
                          <span>Vigente hasta {formatFecha(p.fecha_vigencia)}</span>
                        </li>
                      )}
                    </ul>

                    {p.moleculas?.length > 0 ? (
                      <div className="cs-card__mols">
                        {p.moleculas.map((m, i) =>
                          m.id ? (
                            <Link
                              key={m.id}
                              to={`/vademecum/${m.id}`}
                              className="cs-mol"
                              title={`Ver ficha clínica de ${m.nombre}`}
                            >
                              <FlaskConical size={12} aria-hidden="true" />
                              {m.nombre}
                              {m.atc && <em>{m.atc}</em>}
                            </Link>
                          ) : (
                            <span key={m.nombre || i} className="cs-mol cs-mol--sin-enlace">
                              <FlaskConical size={12} aria-hidden="true" />
                              {m.nombre}
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="cs-card__sinmol">Sin molécula enlazada</p>
                    )}

                    <div className="cs-card__pie">
                      <span className="cs-card__sku">{p.sku}</span>
                      <button type="button" className="cs-card__btn" onClick={() => abrirFicha(p.sku)}>
                        Ver registro <ArrowRight size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!cargando && !error && total > 0 && totalPaginas > 1 && (
            <nav className="cs-pag" aria-label="Paginación">
              <button type="button" disabled={pagina <= 1} onClick={() => irAPagina(pagina - 1)} aria-label="Página anterior">
                <ChevronLeft size={18} />
              </button>
              {desde > 1 && (
                <>
                  <button type="button" onClick={() => irAPagina(1)}>
                    1
                  </button>
                  {desde > 2 && <span className="cs-pag__sep">…</span>}
                </>
              )}
              {numeros.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === pagina ? 'activa' : ''}
                  aria-current={n === pagina ? 'page' : undefined}
                  onClick={() => irAPagina(n)}
                >
                  {n}
                </button>
              ))}
              {hasta < totalPaginas && (
                <>
                  {hasta < totalPaginas - 1 && <span className="cs-pag__sep">…</span>}
                  <button type="button" onClick={() => irAPagina(totalPaginas)}>
                    {totalPaginas}
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => irAPagina(pagina + 1)}
                aria-label="Página siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </nav>
          )}
        </main>
      </div>

      {esMobile && filtrosAbiertos && (
        <>
          <div className="cs-sheet-overlay" onClick={() => setFiltrosAbiertos(false)} />
          <div className="cs-sheet" role="dialog" aria-modal="true" aria-label="Filtros">
            <div className="cs-sheet__head">
              <h2>Filtros</h2>
              <button type="button" onClick={() => setFiltrosAbiertos(false)} aria-label="Cerrar filtros">
                <X size={20} />
              </button>
            </div>
            <div className="cs-sheet__body">{panelFiltros}</div>
            <div className="cs-sheet__pie">
              {hayFiltros && (
                <button type="button" className="cs-boton cs-boton--suave" onClick={limpiarTodo}>
                  Limpiar
                </button>
              )}
              <button type="button" className="cs-boton cs-boton--primario" onClick={() => setFiltrosAbiertos(false)}>
                Ver {total.toLocaleString('es-VE')} resultados
              </button>
            </div>
          </div>
        </>
      )}

      {fichaSku && <InhrrFichaModal fichaSku={fichaSku} onClose={cerrarFicha} />}

      <Footer />
      <div className="cs-espaciador" aria-hidden="true" />
      <BottomNav />
    </div>
  )
}

export default RegistroInhrr