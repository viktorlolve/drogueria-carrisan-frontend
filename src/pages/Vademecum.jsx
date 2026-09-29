import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ShoppingBag,
  FlaskConical,
  Info,
  BookOpenText,
  SearchX,
} from 'lucide-react'
import api from '../api/axios'
import BottomNav from '../components/BottomNav'
import Footer from '../components/Footer'
import SECCIONES_FICHA from '../config/seccionesFicha'
import { COLOR_CATEGORIA, nombreCategoria } from '../utils/inhrr'
import { ICONO_SECCION } from '../utils/iconosConsulta'
import './RegistroInhrr.css'
import './Vademecum.css'

const POR_PAGINA = 25

function Vademecum() {
  const { id } = useParams()
  const navigate = useNavigate()
  const cajaRef = useRef(null)

  const [termino, setTermino] = useState('')
  const [terminoActivo, setTerminoActivo] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false)

  const [molecula, setMolecula] = useState(null)
  const [cargandoFicha, setCargandoFicha] = useState(!!id)
  const [errorFicha, setErrorFicha] = useState(false)
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({})
  const [productosPagina, setProductosPagina] = useState(1)

  // Debounce de la búsqueda en vivo
  useEffect(() => {
    const t = setTimeout(() => setTerminoActivo(termino.trim()), 300)
    return () => clearTimeout(t)
  }, [termino])

  // Bug corregido: al vaciar la caja, se limpian resultados y sugerencias
  // en vez de dejar visible la última búsqueda. El ajuste se hace durante el
  // render (patrón "set state on prop change") en vez de un efecto con setState.
  const [terminoAnterior, setTerminoAnterior] = useState(terminoActivo)
  if (terminoActivo !== terminoAnterior) {
    setTerminoAnterior(terminoActivo)
    if (!terminoActivo) {
      setResultados([])
      setSugerenciasAbiertas(false)
      setBuscando(false)
    } else {
      setBuscando(true)
    }
  }

  useEffect(() => {
    if (!terminoActivo) return
    let activo = true
    api
      .get('/moleculas/moleculas', { params: { search: terminoActivo } })
      .then((res) => {
        if (!activo) return
        setResultados(Array.isArray(res.data) ? res.data : [])
        setSugerenciasAbiertas(true)
      })
      .catch((err) => {
        console.error('Error al buscar moléculas:', err)
        if (activo) {
          setResultados([])
          setSugerenciasAbiertas(true)
        }
      })
      .finally(() => activo && setBuscando(false))
    return () => {
      activo = false
    }
  }, [terminoActivo])

  // Cierra el dropdown de sugerencias al hacer clic fuera de la caja
  useEffect(() => {
    const onClick = (e) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target)) setSugerenciasAbiertas(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Bug corregido: la ficha depende únicamente de :id en la URL. Al volver
  // a /vademecum (id undefined) se limpia la molécula cargada, así que
  // "← Buscar otra molécula" ya no se queda pegado en la ficha anterior.
  // El reset se ajusta durante el render (patrón "set state on prop change").
  const [idFichaAnterior, setIdFichaAnterior] = useState(id)
  if (id !== idFichaAnterior) {
    setIdFichaAnterior(id)
    setCargandoFicha(!!id)
    setErrorFicha(false)
    setMolecula(null)
    setProductosPagina(1)
    setSeccionesAbiertas({})
  }

  // La carga va en un .then() y no en una async fn invocada desde el efecto:
  // React trata el setState como callback de un sistema externo y, además,
  // `activo` descarta la respuesta si el id cambia o el componente se desmonta.
  useEffect(() => {
    if (!id) return undefined
    let activo = true
    api
      .get(`/moleculas/moleculas/${id}`)
      .then((res) => {
        if (!activo) return
        setMolecula(res.data)
      })
      .catch((err) => {
        if (!activo) return
        console.error('Error al cargar la molécula:', err)
        setErrorFicha(true)
      })
      .finally(() => {
        if (activo) setCargandoFicha(false)
      })
    return () => { activo = false }
  }, [id])

  const cambiarPaginaProductos = useCallback(
    async (page) => {
      if (!molecula) return
      const totalPaginas = Math.max(1, (molecula.paginacion || {}).total_paginas || 1)
      if (page < 1 || page > totalPaginas || page === productosPagina) return
      setProductosPagina(page)
      try {
        const { data } = await api.get(`/moleculas/moleculas/${molecula.id}`, {
          params: { pagina: page, por_pagina: POR_PAGINA },
        })
        setMolecula(data)
        document.getElementById('vad-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch (err) {
        console.error('Error al cambiar de página:', err)
      }
    },
    [molecula, productosPagina]
  )

  const abrirMolecula = (m) => {
    setTermino('')
    setResultados([])
    setSugerenciasAbiertas(false)
    navigate(`/vademecum/${m.id}`)
  }

  const toggleSeccion = (clave) => setSeccionesAbiertas((prev) => ({ ...prev, [clave]: !prev[clave] }))

  const cajaBusqueda = (variante) => (
    <div className={`cs-buscador cs-buscador--${variante}`} ref={variante === 'hero' ? cajaRef : undefined}>
      <div className="cs-search cs-search--sola">
        <Search size={20} aria-hidden="true" className="cs-search__icono" />
        <input
          type="text"
          aria-label="Buscar molécula o principio activo"
          placeholder="Buscar por principio activo (ej. Paracetamol, Amoxicilina, Insulina…)"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          onFocus={() => termino && setSugerenciasAbiertas(true)}
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
      </div>

      {sugerenciasAbiertas && (
        <div className="cs-sugerencias" role="listbox">
          {buscando ? (
            <p className="cs-sugerencias__estado">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="cs-sugerencias__estado">
              <SearchX size={15} aria-hidden="true" /> Sin resultados para “{terminoActivo}”.
            </p>
          ) : (
            resultados.slice(0, 8).map((m) => (
              <button key={m.id} type="button" className="cs-sugerencia" onClick={() => abrirMolecula(m)}>
                <FlaskConical size={15} aria-hidden="true" />
                <span className="cs-sugerencia__texto">
                  <strong>{m.nombre}</strong>
                  {m.nombre_generico_en && <em>{m.nombre_generico_en}</em>}
                </span>
                {m.atc_clasificaciones?.codigo && (
                  <span className="cs-sugerencia__atc">{m.atc_clasificaciones.codigo}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )

  // ---- Ficha de una molécula ----
  if (id) {
    if (cargandoFicha) {
      return (
        <div className="cs-page">
          <section className="cs-hero cs-hero--vad">
            <div className="cs-container">
              <p className="cs-hero__tag">Vademécum clínico</p>
              <h1 className="cs-hero__title">Consultando ficha…</h1>
            </div>
          </section>
          <div className="cs-container">
            <div className="cs-skeleton cs-skeleton--ficha" aria-busy="true" />
          </div>
        </div>
      )
    }

    if (errorFicha || !molecula) {
      return (
        <div className="cs-page">
          <section className="cs-hero cs-hero--vad">
            <div className="cs-container">
              <p className="cs-hero__tag">Vademécum clínico</p>
              <h1 className="cs-hero__title">Molécula no encontrada</h1>
              <p className="cs-hero__desc">No pudimos cargar esta ficha. Puede que ya no exista o haya un problema de conexión.</p>
              <button type="button" className="cs-boton cs-boton--claro" onClick={() => navigate('/vademecum')}>
                <ArrowLeft size={16} /> Volver a buscar
              </button>
            </div>
          </section>
        </div>
      )
    }

    const atcArbol = molecula.atc_arbol || []
    const sinonimos = Array.isArray(molecula.sinonimos) ? molecula.sinonimos : []
    const ficha = molecula.ficha_tecnica
    const productos = molecula.productos || []
    const pag = molecula.paginacion || { total: 0, pagina: 1, total_paginas: 1 }
    const totalPaginas = Math.max(1, pag.total_paginas || 1)
    const irACatalogo = () => navigate(`/catalogo?molecula=${encodeURIComponent(molecula.nombre)}`)
    const irARegistro = (sku) => navigate(`/registro-inhrr?sku=${encodeURIComponent(sku)}`)

    return (
      <div className="cs-page">
        <section className="cs-hero cs-hero--vad">
          <div className="cs-container">
            <nav className="cs-crumbs cs-crumbs--claro" aria-label="Ruta">
              <Link to="/">Inicio</Link>
              <ChevronRight size={13} aria-hidden="true" />
              <Link to="/vademecum">Vademécum</Link>
              <ChevronRight size={13} aria-hidden="true" />
              <span>{molecula.nombre}</span>
            </nav>
            <p className="cs-hero__tag">Vademécum clínico</p>
            <h1 className="cs-hero__title">{molecula.nombre}</h1>
            {molecula.nombre_generico_en && <p className="vad-hero__en">{molecula.nombre_generico_en}</p>}
            {sinonimos.length > 0 && (
              <p className="vad-hero__sinonimos">
                <strong>Sinónimos:</strong> {sinonimos.join(', ')}
              </p>
            )}
            <div className="vad-hero__acciones">
              <button type="button" className="cs-boton cs-boton--claro" onClick={() => navigate('/vademecum')}>
                <ArrowLeft size={16} /> Buscar otra molécula
              </button>
              <button type="button" className="cs-boton cs-boton--primario" onClick={irACatalogo}>
                <ShoppingBag size={16} /> Ver en el catálogo
              </button>
            </div>
          </div>
        </section>

        {atcArbol.length > 0 && (
          <nav className="cs-tabs-wrap vad-atc" aria-label="Clasificación ATC">
            <div className="cs-container vad-atc__inner">
              {atcArbol.map((n, i) => (
                <span key={n.id || i} className="vad-atc__item">
                  {i > 0 && <ChevronRight size={13} className="vad-atc__sep" aria-hidden="true" />}
                  <span className="vad-atc__codigo">{n.codigo}</span>
                  <span className="vad-atc__nombre">{n.nombre}</span>
                </span>
              ))}
            </div>
          </nav>
        )}

        <main className="cs-container vad-body">
          <section className="vad-seccion">
            <h2 className="vad-seccion__titulo">
              <BookOpenText size={20} aria-hidden="true" /> Ficha clínica
            </h2>

            {ficha && (
              <p className="vad-fuente-banner">
                <Info size={15} aria-hidden="true" />
                Información clínica de referencia: {ficha.fuente || 'AEMPS – CIMA (Agencia Española de Medicamentos)'}.
                No sustituye el prospecto ni la indicación de un profesional de la salud.
              </p>
            )}

            {!ficha ? (
              <p className="cs-vacio">Ficha en revisión — aún no disponible para esta molécula.</p>
            ) : (
              <div className="vad-acordeon">
                {SECCIONES_FICHA.map(({ clave, etiqueta }) => {
                  const texto = ficha[clave]
                  if (!texto) return null
                  const abierta = !!seccionesAbiertas[clave]
                  const Icono = ICONO_SECCION[clave] || Info
                  return (
                    <div key={clave} className={`vad-acordeon__item ${abierta ? 'abierta' : ''}`}>
                      <button
                        type="button"
                        className="vad-acordeon__head"
                        aria-expanded={abierta}
                        onClick={() => toggleSeccion(clave)}
                      >
                        <span className="vad-acordeon__icono" aria-hidden="true">
                          <Icono size={17} />
                        </span>
                        <span className="vad-acordeon__etiqueta">{etiqueta}</span>
                        <ChevronDown
                          size={16}
                          aria-hidden="true"
                          className="vad-acordeon__chevron"
                          style={{ transform: abierta ? 'rotate(180deg)' : 'none' }}
                        />
                      </button>
                      {abierta && <div className="vad-acordeon__body">{texto}</div>}
                    </div>
                  )
                })}
                {ficha.cima_nregistro && (
                  <p className="vad-fuente">
                    Fuente: {ficha.fuente || 'AEMPS - CIMA (España)'} (nº registro {ficha.cima_nregistro}).
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="vad-seccion" id="vad-productos">
            <h2 className="vad-seccion__titulo">
              Registros INHRR con esta molécula <span>({pag.total.toLocaleString('es-VE')})</span>
            </h2>
            {productos.length === 0 ? (
              <p className="cs-vacio">Sin productos con registro relacionado.</p>
            ) : (
              <>
                <div className="vad-productos">
                  {productos.map((p) => (
                    <button
                      key={p.sku}
                      type="button"
                      className="vad-producto"
                      onClick={() => irARegistro(p.sku)}
                      title="Ver ficha del registro sanitario"
                    >
                      <div className="vad-producto__info">
                        <span className="vad-producto__nombre">{p.nombre}</span>
                        <span className="vad-producto__meta">{p.laboratorio || 'Laboratorio no informado'}</span>
                      </div>
                      <span className="cs-tag" style={{ '--cat': COLOR_CATEGORIA[p.categoria] || '#6B7280' }}>
                        {nombreCategoria(p.categoria)}
                      </span>
                      <ChevronRight size={16} aria-hidden="true" className="vad-producto__flecha" />
                    </button>
                  ))}
                </div>

                {totalPaginas > 1 && (
                  <nav className="cs-pag" aria-label="Paginación de productos">
                    <button type="button" disabled={productosPagina <= 1} onClick={() => cambiarPaginaProductos(productosPagina - 1)}>
                      ←
                    </button>
                    <span className="cs-pag__texto">
                      {productosPagina} de {totalPaginas}
                    </span>
                    <button
                      type="button"
                      disabled={productosPagina >= totalPaginas}
                      onClick={() => cambiarPaginaProductos(productosPagina + 1)}
                    >
                      →
                    </button>
                  </nav>
                )}
              </>
            )}
            <p className="cs-nota vad-productos__nota">
              Listado informativo del registro sanitario INHRR. Toca un producto para ver su ficha completa, o usa
              “Ver en el catálogo” para precios y compra.
            </p>
          </section>
        </main>

        <Footer />
        <div className="cs-espaciador" aria-hidden="true" />
        <BottomNav />
      </div>
    )
  }

  // ---- Buscador (portada del vademécum) ----
  return (
    <div className="cs-page">
      <section className="cs-hero cs-hero--vad">
        <div className="cs-container">
          <nav className="cs-crumbs cs-crumbs--claro" aria-label="Ruta">
            <Link to="/">Inicio</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span>Vademécum</span>
          </nav>
          <p className="cs-hero__tag">Vademécum clínico</p>
          <h1 className="cs-hero__title">Vademécum clínico</h1>
          <p className="cs-hero__desc">
            Consulta la ficha de cada principio activo: indicaciones, posología, contraindicaciones,
            interacciones y más. Información farmacológica de referencia — no sustituye la consulta con un
            profesional de la salud.
          </p>
          {cajaBusqueda('hero')}
        </div>
      </section>

      <main className="cs-container vad-body">
        {!terminoActivo && (
          <div className="vad-sugerido">
            <FlaskConical size={28} aria-hidden="true" />
            <p>Escribe el nombre de un principio activo para ver su ficha clínica y los registros INHRR que lo contienen.</p>
          </div>
        )}
      </main>

      <Footer />
      <div className="cs-espaciador" aria-hidden="true" />
      <BottomNav />
    </div>
  )
}

export default Vademecum