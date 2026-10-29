import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Link2,
  MessageCircle,
  Newspaper,
  Pause,
  Play,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import api from '../api/axios'
import BottomNav from '../components/BottomNav'
import Footer from '../components/Footer'
import { NOTICIAS_ADS, NOTICIAS_BANNER, NOTICIAS_LATERAL } from '../config/noticiasAds'
import './Noticias.css'

// ---------------------------------------------------------------
// /noticias — edición digital. Prefijo de clases `ntc-` (CSS global).
// Datos: GET /noticias → [{ titulo, resumen, link, imagen, fuente, fecha }].
// Publicidad: ver src/config/noticiasAds.js (banner, lateral y feed).
// ---------------------------------------------------------------

const FEED_PAGINA = 9 // noticias que se agregan por cada "Cargar más"
const CADA_N_NOTICIAS = 6 // una tarjeta publicitaria cada N noticias del feed
const ULTIMA_HORA_CANTIDAD = 6 // titulares en la columna "Última hora"
const CINTILLO_CANTIDAD = 5 // titulares que rotan en el cintillo
const CINTILLO_MS = 5000

const ETIQUETAS_AD = {
  promocionado: 'Promocionado',
  patrocinado: 'Contenido patrocinado',
}

// ---------- helpers ----------
const activos = (lista) => lista.filter((ad) => ad.activo !== false)

function normalizar(texto) {
  return (texto || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function tiempo(fechaISO) {
  if (!fechaISO) return 0
  const t = new Date(fechaISO).getTime()
  return Number.isNaN(t) ? 0 : t
}

function fechaCorta(fechaISO) {
  const t = tiempo(fechaISO)
  if (!t) return ''
  return new Date(t).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fechaRelativa(fechaISO, ahora) {
  const t = tiempo(fechaISO)
  if (!t) return ''
  const minutos = Math.round((ahora - t) / 60000)
  if (minutos >= 0 && minutos < 60) return minutos <= 1 ? 'Hace un momento' : `Hace ${minutos} min`
  if (minutos >= 60 && minutos < 60 * 24) return `Hace ${Math.floor(minutos / 60)} h`
  return fechaCorta(fechaISO)
}

function fechaEdicion(ahora) {
  const texto = new Date(ahora).toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const esExterno = (link) => typeof link === 'string' && link.startsWith('http')

// Enlace que sirve para links internos (router) y externos (pestaña nueva).
// Los externos de publicidad llevan rel="sponsored".
function EnlaceAd({ href, className, children, ...resto }) {
  if (esExterno(href)) {
    return (
      <a href={href} target="_blank" rel="sponsored noopener noreferrer" className={className} {...resto}>
        {children}
      </a>
    )
  }
  return (
    <Link to={href || '/'} className={className} {...resto}>
      {children}
    </Link>
  )
}

// ---------- piezas ----------
function Imagen({ src, className = '' }) {
  const [fallo, setFallo] = useState(false)
  if (!src || fallo) {
    return (
      <div className={`ntc-img ntc-img--vacia ${className}`} aria-hidden="true">
        <Newspaper size={34} strokeWidth={1.5} />
      </div>
    )
  }
  return <img src={src} alt="" className={`ntc-img ${className}`} loading="lazy" onError={() => setFallo(true)} />
}

function AccionesCompartir({ noticia }) {
  const [copiado, setCopiado] = useState(false)
  const texto = `${noticia.titulo} — ${noticia.link}`

  async function copiar() {
    try {
      await navigator.clipboard.writeText(noticia.link)
    } catch {
      const area = document.createElement('textarea')
      area.value = noticia.link
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      try {
        document.execCommand('copy')
      } catch {
        // sin portapapeles disponible: no hay nada más que hacer
      }
      document.body.removeChild(area)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="ntc-compartir">
      <a
        className="ntc-compartir__btn ntc-compartir__btn--wa"
        href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartir por WhatsApp"
        title="Compartir por WhatsApp"
      >
        <MessageCircle size={17} aria-hidden="true" />
      </a>
      <button
        type="button"
        className={`ntc-compartir__btn${copiado ? ' ntc-compartir__btn--ok' : ''}`}
        onClick={copiar}
        aria-label={copiado ? 'Enlace copiado' : 'Copiar enlace'}
        title={copiado ? 'Enlace copiado' : 'Copiar enlace'}
      >
        {copiado ? <Check size={17} aria-hidden="true" /> : <Link2 size={17} aria-hidden="true" />}
      </button>
      <span className="ntc-compartir__aviso" role="status">{copiado ? 'Enlace copiado' : ''}</span>
    </div>
  )
}

function Tarjeta({ noticia, variante, ahora }) {
  return (
    <article className={`ntc-card ntc-card--${variante}`}>
      <div className="ntc-card__media">
        <Imagen src={noticia.imagen} />
      </div>
      <div className="ntc-card__cuerpo">
        <p className="ntc-kicker">{noticia.fuente || 'Fuente externa'}</p>
        <h3 className="ntc-card__titulo">
          <a href={noticia.link} target="_blank" rel="noopener noreferrer" className="ntc-card__enlace">
            {noticia.titulo}
          </a>
        </h3>
        {noticia.resumen && <p className="ntc-card__resumen">{noticia.resumen}</p>}
        <div className="ntc-card__pie">
          <time className="ntc-fecha" dateTime={noticia.fecha || undefined}>
            {fechaRelativa(noticia.fecha, ahora)}
          </time>
          <AccionesCompartir noticia={noticia} />
        </div>
      </div>
    </article>
  )
}

function TarjetaPatrocinada({ ad }) {
  const etiqueta = ETIQUETAS_AD[ad.tipo] || ETIQUETAS_AD.promocionado
  return (
    <article className="ntc-card ntc-card--feed ntc-card--ad">
      <div className="ntc-card__media">
        <Imagen src={ad.imagen} />
        <span className="ntc-sello">{etiqueta}</span>
      </div>
      <div className="ntc-card__cuerpo">
        <p className="ntc-kicker ntc-kicker--ad">
          {ad.tipo === 'patrocinado' && ad.patrocinador ? `Patrocinado por ${ad.patrocinador}` : 'Droguería Carrisan'}
        </p>
        <h3 className="ntc-card__titulo">
          <EnlaceAd href={ad.link} className="ntc-card__enlace">{ad.titulo}</EnlaceAd>
        </h3>
        {ad.texto && <p className="ntc-card__resumen">{ad.texto}</p>}
        <div className="ntc-card__pie">
          <span className="ntc-card__leer">
            Leer más <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  )
}

// Creativo publicitario: arte completo (imagen) o diseño de marca (tema + texto).
function Creativo({ ad, formato }) {
  if (!ad) return null
  const etiqueta = ad.tipo === 'patrocinado' && ad.patrocinador
    ? `Publicidad · ${ad.patrocinador}`
    : 'Publicidad'

  return (
    <aside className={`ntc-ad ntc-ad--${formato}`} aria-label={etiqueta}>
      <p className="ntc-ad__etiqueta">{etiqueta}</p>
      <EnlaceAd href={ad.link} className={`ntc-ad__creativo ntc-ad__creativo--${ad.imagen ? 'arte' : ad.tema || 'azul'}`}>
        {ad.imagen ? (
          <picture>
            {ad.imagenMovil && <source media="(max-width: 640px)" srcSet={ad.imagenMovil} />}
            <img src={ad.imagen} alt={ad.titulo} className="ntc-ad__arte" loading="lazy" />
          </picture>
        ) : (
          <>
            <span className="ntc-ad__deco" aria-hidden="true" />
            <span className="ntc-ad__texto">
              <strong className="ntc-ad__titulo">{ad.titulo}</strong>
              {ad.texto && <span className="ntc-ad__desc">{ad.texto}</span>}
            </span>
            {ad.cta && (
              <span className="ntc-ad__cta">
                {ad.cta}
                <ArrowUpRight size={16} aria-hidden="true" />
              </span>
            )}
          </>
        )}
      </EnlaceAd>
    </aside>
  )
}

// ---------- cintillo "Última hora" ----------
function Cintillo({ items }) {
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  const [encima, setEncima] = useState(false)
  const total = items.length

  useEffect(() => {
    if (pausado || encima || total < 2) return undefined
    const id = setInterval(() => setIndice((i) => (i + 1) % total), CINTILLO_MS)
    return () => clearInterval(id)
  }, [pausado, encima, total])

  if (total === 0) return null
  const actual = items[indice % total]

  return (
    <section
      className="ntc-cintillo"
      aria-label="Última hora"
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      onFocus={() => setEncima(true)}
      onBlur={() => setEncima(false)}
    >
      <span className="ntc-cintillo__sello">
        <span className="ntc-cintillo__punto" aria-hidden="true" />
        Última hora
      </span>
      <a
        key={indice}
        href={actual.link}
        target="_blank"
        rel="noopener noreferrer"
        className="ntc-cintillo__titular"
      >
        {actual.titulo}
      </a>
      {total > 1 && (
        <span className="ntc-cintillo__controles">
          <button type="button" onClick={() => setIndice((i) => (i - 1 + total) % total)} aria-label="Titular anterior">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className="ntc-cintillo__cuenta" aria-hidden="true">{(indice % total) + 1}/{total}</span>
          <button type="button" onClick={() => setIndice((i) => (i + 1) % total)} aria-label="Titular siguiente">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setPausado((p) => !p)}
            aria-label={pausado ? 'Reanudar rotación de titulares' : 'Pausar rotación de titulares'}
          >
            {pausado ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
        </span>
      )}
    </section>
  )
}

// ---------- página ----------
function Noticias() {
  const [noticias, setNoticias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)

  const [consulta, setConsulta] = useState('')
  const [fuenteActiva, setFuenteActiva] = useState('todas')
  const [limite, setLimite] = useState(FEED_PAGINA)

  // Hora de la visita (estable durante la sesión) y semilla para rotar anuncios.
  const [ahora] = useState(() => Date.now())
  const [semilla] = useState(() => Math.floor(Math.random() * 1000))

  useEffect(() => {
    let cancelado = false
    api
      .get('/noticias')
      .then(({ data }) => {
        if (cancelado) return
        setNoticias(Array.isArray(data) ? data : [])
        setCargando(false)
      })
      .catch(() => {
        if (cancelado) return
        setError(true)
        setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [intento])

  function reintentar() {
    setError(false)
    setCargando(true)
    setIntento((n) => n + 1)
  }

  // Más recientes primero (sort estable: sin fecha queda al final).
  const ordenadas = useMemo(() => [...noticias].sort((a, b) => tiempo(b.fecha) - tiempo(a.fecha)), [noticias])

  const fuentes = useMemo(() => {
    const cuenta = new Map()
    ordenadas.forEach((n) => {
      const nombre = n.fuente || 'Fuente externa'
      cuenta.set(nombre, (cuenta.get(nombre) || 0) + 1)
    })
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1])
  }, [ordenadas])

  const filtrando = consulta.trim() !== '' || fuenteActiva !== 'todas'

  const filtradas = useMemo(() => {
    if (!filtrando) return ordenadas
    const q = normalizar(consulta.trim())
    return ordenadas.filter((n) => {
      if (fuenteActiva !== 'todas' && (n.fuente || 'Fuente externa') !== fuenteActiva) return false
      if (!q) return true
      return normalizar(`${n.titulo} ${n.resumen} ${n.fuente}`).includes(q)
    })
  }, [ordenadas, filtrando, consulta, fuenteActiva])

  // Reparto de la portada (solo sin filtros).
  const lead = !filtrando ? ordenadas[0] : null
  const secundarias = !filtrando ? ordenadas.slice(1, 3) : []
  const ultimaHora = !filtrando ? ordenadas.slice(3, 3 + ULTIMA_HORA_CANTIDAD) : []
  const feedBase = filtrando ? filtradas : ordenadas.slice(3 + ULTIMA_HORA_CANTIDAD)
  const feedVisible = feedBase.slice(0, limite)
  const hayMas = feedBase.length > limite

  // Anuncios activos: una pieza por espacio, rotando por visita.
  const adsFeed = activos(NOTICIAS_ADS)
  const bannerAds = activos(NOTICIAS_BANNER)
  const lateralAds = activos(NOTICIAS_LATERAL)
  const banner = bannerAds.length ? bannerAds[semilla % bannerAds.length] : null
  const lateral = lateralAds.length ? lateralAds[semilla % lateralAds.length] : null

  // Feed con tarjetas publicitarias intercaladas (solo sin filtros).
  const feed = useMemo(() => {
    const salida = []
    let pieza = 0
    feedVisible.forEach((noticia, i) => {
      salida.push({ clave: noticia.link || `n-${i}`, tipo: 'noticia', data: noticia })
      if (!filtrando && adsFeed.length > 0 && (i + 1) % CADA_N_NOTICIAS === 0) {
        const ad = adsFeed[(semilla + pieza) % adsFeed.length]
        salida.push({ clave: `ad-${ad.id}-${pieza}`, tipo: 'ad', data: ad })
        pieza += 1
      }
    })
    return salida
    // adsFeed se recalcula igual en cada render; sus ids son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedVisible, filtrando, semilla])

  function cambiarConsulta(valor) {
    setConsulta(valor)
    setLimite(FEED_PAGINA)
  }

  function cambiarFuente(nombre) {
    setFuenteActiva(nombre)
    setLimite(FEED_PAGINA)
  }

  function limpiarFiltros() {
    setConsulta('')
    setFuenteActiva('todas')
    setLimite(FEED_PAGINA)
  }

  const sinNoticias = !cargando && !error && noticias.length === 0

  return (
    <div className="ntc-pagina">
      <div className="ntc-contenedor">
        {/* ----- Cabecera de periódico ----- */}
        <header className="ntc-cabecera">
          <div className="ntc-cabecera__tira">
            <span>{fechaEdicion(ahora)}</span>
            <span>Edición digital</span>
          </div>
          <div className="ntc-cabecera__marca">
            <p className="ntc-cabecera__sup">Drogueria Carrisan</p>
            <h1 className="ntc-cabecera__titulo">CRS News</h1>
            <p className="ntc-cabecera__sub">Política, industria y gestión farmacéutica</p>
          </div>
        </header>

        {cargando && (
          <div className="ntc-esqueleto" aria-busy="true" aria-label="Cargando noticias">
            <span className="ntc-sk ntc-sk--cinta" />
            <span className="ntc-sk ntc-sk--lead" />
            <span className="ntc-sk ntc-sk--linea" />
            <span className="ntc-sk ntc-sk--linea ntc-sk--corta" />
          </div>
        )}

        {error && (
          <div className="ntc-estado" role="alert">
            <Newspaper size={36} strokeWidth={1.5} aria-hidden="true" />
            <p>No pudimos cargar las noticias en este momento.</p>
            <button type="button" className="ntc-btn" onClick={reintentar}>
              <RefreshCw size={16} aria-hidden="true" /> Reintentar
            </button>
          </div>
        )}

        {sinNoticias && (
          <div className="ntc-estado">
            <Newspaper size={36} strokeWidth={1.5} aria-hidden="true" />
            <p>Aún no hay noticias publicadas. Vuelve pronto.</p>
          </div>
        )}

        {!cargando && !error && noticias.length > 0 && (
          <>
            <Cintillo items={ordenadas.slice(0, CINTILLO_CANTIDAD)} />

            {/* ----- Buscador y filtro por fuente ----- */}
            <div className="ntc-herramientas">
              <div className="ntc-buscador">
                <Search size={18} aria-hidden="true" className="ntc-buscador__lupa" />
                <input
                  type="search"
                  className="ntc-buscador__campo"
                  placeholder="Buscar en las noticias"
                  aria-label="Buscar noticias"
                  value={consulta}
                  onChange={(e) => cambiarConsulta(e.target.value)}
                />
                {consulta && (
                  <button type="button" className="ntc-buscador__borrar" onClick={() => cambiarConsulta('')} aria-label="Borrar búsqueda">
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
              {fuentes.length > 1 && (
                <div className="ntc-fuentes" role="group" aria-label="Filtrar por fuente">
                  <button
                    type="button"
                    className={`ntc-chip${fuenteActiva === 'todas' ? ' ntc-chip--activo' : ''}`}
                    aria-pressed={fuenteActiva === 'todas'}
                    onClick={() => cambiarFuente('todas')}
                  >
                    Todas
                  </button>
                  {fuentes.map(([nombre, cantidad]) => (
                    <button
                      key={nombre}
                      type="button"
                      className={`ntc-chip${fuenteActiva === nombre ? ' ntc-chip--activo' : ''}`}
                      aria-pressed={fuenteActiva === nombre}
                      onClick={() => cambiarFuente(nombre)}
                    >
                      {nombre} <span className="ntc-chip__n">{cantidad}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ----- Cuerpo ----- */}
            <div className={`ntc-layout${filtrando ? ' ntc-layout--filtrado' : ''}`}>
              {!filtrando && lead && (
                <section className="ntc-portada" aria-label="Portada">
                  <Tarjeta noticia={lead} variante="lead" ahora={ahora} />
                  {secundarias.length > 0 && (
                    <div className="ntc-secundarias">
                      {secundarias.map((n, i) => (
                        <Tarjeta key={n.link || `s-${i}`} noticia={n} variante="secundaria" ahora={ahora} />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {!filtrando && ultimaHora.length > 0 && (
                <aside className="ntc-ultima" aria-labelledby="ntc-t-ultima">
                  <h2 id="ntc-t-ultima" className="ntc-seccion-titulo">Última hora</h2>
                  <ol className="ntc-ultima__lista">
                    {ultimaHora.map((n, i) => (
                      <li key={n.link || `u-${i}`}>
                        <a href={n.link} target="_blank" rel="noopener noreferrer" className="ntc-ultima__item">
                          <span className="ntc-ultima__meta">
                            <span className="ntc-kicker">{n.fuente || 'Fuente externa'}</span>
                            <time className="ntc-fecha" dateTime={n.fecha || undefined}>
                              {fechaRelativa(n.fecha, ahora)}
                            </time>
                          </span>
                          <span className="ntc-ultima__titulo">{n.titulo}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </aside>
              )}

              {!filtrando && banner && (
                <div className="ntc-banner">
                  <Creativo ad={banner} formato="horizontal" />
                </div>
              )}

              <section className="ntc-feed" aria-labelledby="ntc-t-feed">
                <h2 id="ntc-t-feed" className="ntc-seccion-titulo">
                  {filtrando ? 'Resultados' : 'Más noticias'}
                </h2>

                {filtrando && (
                  <p className="ntc-resultados" role="status">
                    {filtradas.length === 0
                      ? 'No encontramos noticias con ese criterio.'
                      : `${filtradas.length} ${filtradas.length === 1 ? 'noticia' : 'noticias'}`}
                    {' · '}
                    <button type="button" className="ntc-enlace-boton" onClick={limpiarFiltros}>
                      Limpiar filtros
                    </button>
                  </p>
                )}

                {feed.length > 0 && (
                  <div className="ntc-grid">
                    {feed.map((item) =>
                      item.tipo === 'ad' ? (
                        <TarjetaPatrocinada key={item.clave} ad={item.data} />
                      ) : (
                        <Tarjeta key={item.clave} noticia={item.data} variante="feed" ahora={ahora} />
                      ),
                    )}
                  </div>
                )}

                {feedBase.length > 0 && (
                  <div className="ntc-mas">
                    <p className="ntc-mas__cuenta">
                      Mostrando {Math.min(limite, feedBase.length)} de {feedBase.length}
                    </p>
                    {hayMas && (
                      <button type="button" className="ntc-btn ntc-btn--primario" onClick={() => setLimite((l) => l + FEED_PAGINA)}>
                        Cargar más noticias
                      </button>
                    )}
                  </div>
                )}
              </section>

              {lateral && (
                <div className="ntc-lateral">
                  <div className="ntc-lateral__fijo">
                    <Creativo ad={lateral} formato="rectangulo" />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="ntc-espaciador" aria-hidden="true" />
      <BottomNav />
      <Footer />
    </div>
  )
}

export default Noticias
