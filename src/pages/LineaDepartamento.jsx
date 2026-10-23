import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  Pill, Hospital, Syringe, FlaskConical, Droplets, Bandage, Wind, Package,
  ShieldCheck, BookOpen, Truck, ReceiptText, MessageCircle,
  Search, X, ChevronDown, ChevronRight, ArrowRight, Check, PackageSearch,
  RotateCcw, TriangleAlert,
} from 'lucide-react'
import api from '../api/axios'
import { LINEAS_DEPARTAMENTO } from '../config/lineasDepartamento'
import { logoParaLaboratorio, nombreVisible } from '../config/laboratoriosLogos'
import CONTACTO from '../config/contacto'
import { calcularDespacho, fraseDespacho } from '../utils/horarioDespacho'
import ProductCard from '../components/ProductCard'
import ProductCardSkeleton from '../components/Productcardskeleton'
import HomeCarrusel from '../components/HomeCarrusel'
import BloquePromocional from '../components/BloquePromocional'
import Footer from '../components/Footer'
import BottomNav from '../components/BottomNav'
import './LineaDepartamento.css'

// ── Constantes ──────────────────────────────────────────────────
const POR_PAGINA = 20
const MAX_FORMAS_TILES = 8
const MAX_LABS_TILES = 12
const ORDENES_VALIDOS = ['destacados', 'precio_asc', 'precio_desc', 'nombre']
const COLLATOR = new Intl.Collator('es')

// Íconos referenciados por nombre desde config/lineasDepartamento.js
const ICONOS = { Pill, Hospital, ShieldCheck, BookOpen, Truck, ReceiptText, MessageCircle }

// ── Helpers ─────────────────────────────────────────────────────
const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const fmt = (n) => Number(n).toLocaleString('es-VE')

const precioDe = (p) => {
  const n = Number(p.precio_usd)
  return Number.isFinite(n) && n > 0 ? n : null
}

const capitalizar = (s) => {
  const t = String(s ?? '').trim().toLowerCase()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

function iconoDeForma(forma) {
  const f = norm(forma)
  if (/inyect|ampolla|ampolleta|vial|jeringa|parenteral|liofiliz/.test(f)) return Syringe
  if (/gota|colirio|oftalm|otic/.test(f)) return Droplets
  if (/tablet|capsula|comprimido|gragea|perla|softgel/.test(f)) return Pill
  if (/jarabe|suspension|solucion|elixir|emulsion/.test(f)) return FlaskConical
  if (/crema|unguento|ungüento|gel|pomada|locion|parche|aposito/.test(f)) return Bandage
  if (/inhal|spray|aerosol|nebuliz|nasal/.test(f)) return Wind
  return Package
}

function ordenar(lista, orden) {
  const copia = [...lista]
  const porNombre = (a, b) => COLLATOR.compare(a.nombre_comercial || '', b.nombre_comercial || '')

  if (orden === 'precio_asc' || orden === 'precio_desc') {
    const dir = orden === 'precio_asc' ? 1 : -1
    return copia.sort((a, b) => {
      const pa = precioDe(a)
      const pb = precioDe(b)
      if (pa == null && pb == null) return porNombre(a, b)
      if (pa == null) return 1
      if (pb == null) return -1
      return (pa - pb) * dir || porNombre(a, b)
    })
  }
  if (orden === 'nombre') return copia.sort(porNombre)

  // Destacados: disponibles primero, luego con descuento, luego con precio.
  return copia.sort(
    (a, b) =>
      Number(!!b.disponible) - Number(!!a.disponible) ||
      Number(!!b.descuento_activo) - Number(!!a.descuento_activo) ||
      Number(precioDe(b) != null) - Number(precioDe(a) != null) ||
      porNombre(a, b)
  )
}

function irACatalogo() {
  const el = document.getElementById('lin-catalogo')
  if (!el) return
  const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' })
}

// ── Piezas ──────────────────────────────────────────────────────
function Kpi({ valor, etiqueta, cargando }) {
  return (
    <div className="lin-kpi">
      {cargando ? (
        <span className="lin-skel lin-kpi__skel" aria-hidden="true" />
      ) : (
        <span className="lin-kpi__valor">{valor}</span>
      )}
      <span className="lin-kpi__etiqueta">{etiqueta}</span>
    </div>
  )
}

function ItemConfianza({ item, textoDespacho }) {
  const Icono = ICONOS[item.icono] || ShieldCheck
  const texto = item.dinamico === 'despacho' ? textoDespacho : item.texto
  const cuerpo = (
    <>
      <span className="lin-trust__icono" aria-hidden="true">
        <Icono size={22} strokeWidth={1.9} />
      </span>
      <span className="lin-trust__textos">
        <span className="lin-trust__titulo">{item.titulo}</span>
        <span className="lin-trust__texto">{texto}</span>
      </span>
      {item.to && <ArrowRight className="lin-trust__flecha" size={16} aria-hidden="true" />}
    </>
  )

  if (item.to === 'whatsapp') {
    return (
      <a
        className="lin-trust__item lin-trust__item--link"
        href={CONTACTO.whatsapp.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {cuerpo}
      </a>
    )
  }
  if (item.to) {
    return (
      <Link className="lin-trust__item lin-trust__item--link" to={item.to}>
        {cuerpo}
      </Link>
    )
  }
  return <div className="lin-trust__item">{cuerpo}</div>
}

function LogoLab({ nombre }) {
  const [fallo, setFallo] = useState(false)
  const match = logoParaLaboratorio(nombre)
  if (!match || fallo) {
    return (
      <span className="lin-lab__inicial" aria-hidden="true">
        {nombre.trim().charAt(0).toUpperCase()}
      </span>
    )
  }
  return (
    <img
      className="lin-lab__logo"
      src={match.logo}
      alt=""
      loading="lazy"
      onError={() => setFallo(true)}
    />
  )
}

function Campo({ etiqueta, children }) {
  return (
    <label className="lin-campo">
      <span className="lin-campo__etiqueta">{etiqueta}</span>
      <span className="lin-campo__control">
        {children}
        <ChevronDown className="lin-campo__chevron" size={16} aria-hidden="true" />
      </span>
    </label>
  )
}

// ── Página ──────────────────────────────────────────────────────
function LineaDepartamento({ linea }) {
  const config = LINEAS_DEPARTAMENTO[linea] || LINEAS_DEPARTAMENTO.farmacia
  const IconoLinea = ICONOS[config.icono] || Pill
  const location = useLocation()
  const [params, setParams] = useSearchParams()

  const [productos, setProductos] = useState([])
  const [tasaVes, setTasaVes] = useState(null)
  const [estado, setEstado] = useState('cargando') // cargando | ok | error
  const [intento, setIntento] = useState(0)
  const [texto, setTexto] = useState('')
  const [mostrar, setMostrar] = useState({ firma: '', n: POR_PAGINA })

  const textoDiferido = useDeferredValue(texto)

  // Filtros en la URL (deep-link): ?forma=&lab=&orden=&disp=1&oferta=1
  const forma = params.get('forma') || ''
  const lab = params.get('lab') || ''
  const ordenParam = params.get('orden') || 'destacados'
  const orden = ORDENES_VALIDOS.includes(ordenParam) ? ordenParam : 'destacados'
  const soloDisp = params.get('disp') === '1'
  const soloOferta = params.get('oferta') === '1'

  const actualizar = useCallback(
    (cambios) => {
      setParams(
        (prev) => {
          const sig = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(cambios)) {
            if (v === '' || v == null || v === false) sig.delete(k)
            else sig.set(k, v === true ? '1' : String(v))
          }
          return sig
        },
        { replace: true }
      )
    },
    [setParams]
  )

  // Título de pestaña
  useEffect(() => {
    const previo = document.title
    document.title = `${config.titulo} · Droguería Carrisan`
    return () => {
      document.title = previo
    }
  }, [config.titulo])

  // Carga: toda la línea en un solo fetch (el filtrado y el orden son locales)
  useEffect(() => {
    let vivo = true
    Promise.all([
      api.get('/products', { params: { linea: config.apiLinea } }),
      api.get('/prices').catch(() => null),
    ])
      .then(([resProductos, resTasa]) => {
        if (!vivo) return
        const data = resProductos.data
        const lista = Array.isArray(data) ? data : data?.productos || []
        setProductos(lista.filter((p) => p.activo))
        setTasaVes(resTasa?.data?.usd_a_ves ?? null)
        setEstado('ok')
      })
      .catch((err) => {
        console.error(err)
        if (vivo) setEstado('error')
      })
    return () => {
      vivo = false
    }
  }, [config.apiLinea, intento])

  // Deep-link a la sección del catálogo (ej. "Ver todo" de ofertas)
  useEffect(() => {
    if (location.hash !== '#lin-catalogo') return undefined
    const t = setTimeout(irACatalogo, 80)
    return () => clearTimeout(t)
  }, [location.hash, location.search])

  const reintentar = () => {
    setEstado('cargando')
    setIntento((n) => n + 1)
  }

  // ── Derivados ─────────────────────────────────────────────────
  const indexados = useMemo(
    () =>
      productos.map((p) => ({
        p,
        texto: norm(`${p.nombre_comercial || ''} ${p.molecula || ''} ${p.laboratorio || ''} ${p.sku || ''}`),
        formaKey: norm(p.forma),
        labKey: p.laboratorio ? nombreVisible(p.laboratorio) : '',
      })),
    [productos]
  )

  const { formas, labs } = useMemo(() => {
    const mapaFormas = new Map()
    const mapaLabs = new Map()
    for (const x of indexados) {
      if (x.formaKey) {
        const act = mapaFormas.get(x.formaKey)
        if (act) act.total += 1
        else mapaFormas.set(x.formaKey, { key: x.formaKey, nombre: capitalizar(x.p.forma), total: 1 })
      }
      if (x.labKey) {
        const act = mapaLabs.get(x.labKey)
        if (act) act.total += 1
        else mapaLabs.set(x.labKey, { key: x.labKey, nombre: x.labKey, total: 1 })
      }
    }
    const porTotal = (a, b) => b.total - a.total || COLLATOR.compare(a.nombre, b.nombre)
    return {
      formas: [...mapaFormas.values()].sort(porTotal),
      labs: [...mapaLabs.values()].sort(porTotal),
    }
  }, [indexados])

  const kpis = useMemo(
    () => ({
      total: productos.length,
      disponibles: productos.filter((p) => p.disponible).length,
      ofertas: productos.filter((p) => p.descuento_activo).length,
    }),
    [productos]
  )

  const ofertas = useMemo(() => {
    const pct = (p) => (p.descuento_activo?.tipo === 'monto' ? 0 : Number(p.descuento_activo?.valor) || 0)
    return productos
      .filter((p) => p.descuento_activo && precioDe(p) != null)
      .sort((a, b) => pct(b) - pct(a))
      .slice(0, 12)
  }, [productos])

  const filtrados = useMemo(() => {
    const tokens = norm(textoDiferido).split(/\s+/).filter(Boolean)
    const base = indexados
      .filter(
        (x) =>
          tokens.every((t) => x.texto.includes(t)) &&
          (!forma || x.formaKey === forma) &&
          (!lab || x.labKey === lab) &&
          (!soloDisp || x.p.disponible) &&
          (!soloOferta || x.p.descuento_activo)
      )
      .map((x) => x.p)
    return ordenar(base, orden)
  }, [indexados, textoDiferido, forma, lab, soloDisp, soloOferta, orden])

  // Cantidad visible: se reinicia sola cuando cambia la combinación de filtros
  const firma = [textoDiferido, forma, lab, soloDisp, soloOferta, orden].join('|')
  const visibles = mostrar.firma === firma ? mostrar.n : POR_PAGINA
  const lista = filtrados.slice(0, visibles)
  const restantes = filtrados.length - lista.length

  const textoDespacho = useMemo(() => {
    const { prefijo, destacado } = fraseDespacho(calcularDespacho())
    return `Si pides ahora, tu orden ${prefijo} ${destacado}.`
  }, [])

  const cargando = estado === 'cargando'
  const filtrosActivos = []
  if (forma) filtrosActivos.push({ id: 'forma', etiqueta: formas.find((f) => f.key === forma)?.nombre || forma, quitar: () => actualizar({ forma: '' }) })
  if (lab) filtrosActivos.push({ id: 'lab', etiqueta: lab, quitar: () => actualizar({ lab: '' }) })
  if (soloDisp) filtrosActivos.push({ id: 'disp', etiqueta: 'Solo disponibles', quitar: () => actualizar({ disp: false }) })
  if (soloOferta) filtrosActivos.push({ id: 'oferta', etiqueta: 'En oferta', quitar: () => actualizar({ oferta: false }) })
  if (texto.trim()) filtrosActivos.push({ id: 'q', etiqueta: `“${texto.trim()}”`, quitar: () => setTexto('') })

  const limpiarTodo = () => {
    setTexto('')
    setParams({}, { replace: true })
  }

  const elegirFacet = (cambios) => {
    actualizar(cambios)
    irACatalogo()
  }

  const bloquesBento = config.bento.slice(0, 4)
  const letrasBento = ['a', 'b', 'c', 'd']
  const tamanosBento = ['grande', 'mediano', 'pequeno', 'pequeno']

  return (
    <div className={`lin lin--${config.slug}`}>
      {/* ═══════════ HERO ═══════════ */}
      <header className="lin-hero">
        <div className="lin-hero__media" aria-hidden="true">
          <img
            className="lin-hero__img"
            src={config.imagen}
            alt=""
            fetchPriority="high"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="lin-hero__scrim" />
        </div>
        <span className="lin-hero__puntos" aria-hidden="true" />
        <span className="lin-hero__brillo" aria-hidden="true" />

        <div className="lin-hero__contenido">
          <nav className="lin-migas" aria-label="Ruta de navegación">
            <Link to="/">Inicio</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">{config.titulo}</span>
          </nav>

          <span className="lin-eyebrow">
            <IconoLinea size={15} strokeWidth={2.2} aria-hidden="true" />
            {config.eyebrow}
          </span>

          <h1 className="lin-hero__titulo">
            {config.titular[0]} <span className="lin-hero__acento">{config.titular[1]}</span>
          </h1>
          <p className="lin-hero__bajada">{config.bajada}</p>

          <div className="lin-hero__acciones">
            <button type="button" className="lin-btn lin-btn--primario" onClick={irACatalogo}>
              Ver el catálogo
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <Link className="lin-btn lin-btn--secundario" to={config.ctaSecundario.to}>
              {config.ctaSecundario.texto}
            </Link>
          </div>

          <div className="lin-kpis" aria-live="polite">
            <Kpi valor={fmt(kpis.total)} etiqueta="Productos" cargando={cargando} />
            <Kpi valor={fmt(labs.length)} etiqueta="Laboratorios" cargando={cargando} />
            <Kpi valor={fmt(kpis.disponibles)} etiqueta="Disponibles ahora" cargando={cargando} />
            {!cargando && kpis.ofertas > 0 && (
              <Kpi valor={fmt(kpis.ofertas)} etiqueta="Con descuento" cargando={false} />
            )}
          </div>
        </div>
      </header>

      <div className="lin-contenedor">
        {/* ═══════════ CONFIANZA ═══════════ */}
        <section className="lin-trust" aria-label="Por qué comprar en esta línea">
          {config.confianza.map((item) => (
            <ItemConfianza key={item.titulo} item={item} textoDespacho={textoDespacho} />
          ))}
        </section>

        {estado === 'error' ? (
          <section className="lin-estado" role="alert">
            <span className="lin-estado__icono lin-estado__icono--alerta" aria-hidden="true">
              <TriangleAlert size={28} />
            </span>
            <h2>No pudimos cargar la {config.titulo}</h2>
            <p>Revisa tu conexión e inténtalo de nuevo. Tus filtros se conservan.</p>
            <button type="button" className="lin-btn lin-btn--primario" onClick={reintentar}>
              <RotateCcw size={16} aria-hidden="true" />
              Reintentar
            </button>
          </section>
        ) : (
          <>
            {/* ═══════════ OFERTAS ═══════════ */}
            {(cargando || ofertas.length >= 2) && (
              <div className="lin-seccion lin-seccion--shelf">
                <HomeCarrusel
                  titulo={`Ofertas en ${config.tituloCorto}`}
                  subtitulo="Precios con descuento activo en esta línea"
                  productos={ofertas}
                  tasaVes={tasaVes}
                  verTodoTo={`${config.ruta}?oferta=1#lin-catalogo`}
                  cargando={cargando}
                />
              </div>
            )}

            {/* ═══════════ PRESENTACIONES ═══════════ */}
            {!cargando && formas.length >= 3 && (
              <section className="lin-seccion" aria-labelledby="lin-formas-t">
                <div className="lin-seccion__cabecera">
                  <div>
                    <h2 id="lin-formas-t" className="lin-seccion__titulo">{config.seccionFormas.titulo}</h2>
                    <p className="lin-seccion__sub">{config.seccionFormas.subtitulo}</p>
                  </div>
                </div>
                <div className="lin-formas">
                  {formas.slice(0, MAX_FORMAS_TILES).map((f) => {
                    const Icono = iconoDeForma(f.nombre)
                    return (
                      <button
                        key={f.key}
                        type="button"
                        className={`lin-forma ${forma === f.key ? 'lin-forma--activa' : ''}`}
                        onClick={() => elegirFacet({ forma: forma === f.key ? '' : f.key })}
                        aria-pressed={forma === f.key}
                      >
                        <span className="lin-forma__icono" aria-hidden="true">
                          <Icono size={22} strokeWidth={1.9} />
                        </span>
                        <span className="lin-forma__nombre">{f.nombre}</span>
                        <span className="lin-forma__total">{fmt(f.total)} productos</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ═══════════ BENTO (enlaces cruzados) ═══════════ */}
            <section className="lin-seccion" aria-label="Más herramientas de la plataforma">
              <div className="lin-bento">
                {bloquesBento.map((b, i) => (
                  <BloquePromocional
                    key={b.id}
                    {...b}
                    tamano={tamanosBento[i]}
                    posicionTexto="arriba"
                    className={`lin-bento__${letrasBento[i]}`}
                  />
                ))}
              </div>
            </section>

            {/* ═══════════ LABORATORIOS ═══════════ */}
            {!cargando && labs.length >= 3 && (
              <section className="lin-seccion" aria-labelledby="lin-labs-t">
                <div className="lin-seccion__cabecera">
                  <div>
                    <h2 id="lin-labs-t" className="lin-seccion__titulo">Laboratorios de la línea</h2>
                    <p className="lin-seccion__sub">Toca uno para ver solo sus productos.</p>
                  </div>
                </div>
                <div className="lin-labs">
                  {labs.slice(0, MAX_LABS_TILES).map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      className={`lin-lab ${lab === l.key ? 'lin-lab--activo' : ''}`}
                      onClick={() => elegirFacet({ lab: lab === l.key ? '' : l.key })}
                      aria-pressed={lab === l.key}
                    >
                      <span className="lin-lab__marco">
                        <LogoLab nombre={l.nombre} />
                      </span>
                      <span className="lin-lab__nombre">{l.nombre}</span>
                      <span className="lin-lab__total">{fmt(l.total)} productos</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ═══════════ CATÁLOGO DE LA LÍNEA ═══════════ */}
            <section id="lin-catalogo" className="lin-seccion lin-catalogo" aria-labelledby="lin-cat-t">
              <div className="lin-seccion__cabecera">
                <div>
                  <h2 id="lin-cat-t" className="lin-seccion__titulo">Todo el catálogo · {config.titulo}</h2>
                  <p className="lin-seccion__sub" aria-live="polite">
                    {cargando
                      ? 'Cargando productos…'
                      : `${fmt(filtrados.length)} ${filtrados.length === 1 ? 'producto' : 'productos'}${filtrosActivos.length ? ' con tus filtros' : ''}`}
                  </p>
                </div>
              </div>

              <div className="lin-toolbar">
                <label className="lin-buscador">
                  <Search size={18} aria-hidden="true" />
                  <input
                    type="search"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder={`Buscar en ${config.titulo}: nombre, molécula o laboratorio`}
                    aria-label={`Buscar en ${config.titulo}`}
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                  {texto && (
                    <button type="button" className="lin-buscador__limpiar" onClick={() => setTexto('')} aria-label="Borrar búsqueda">
                      <X size={16} />
                    </button>
                  )}
                </label>

                <Campo etiqueta="Presentación">
                  <select value={forma} onChange={(e) => actualizar({ forma: e.target.value })}>
                    <option value="">Todas</option>
                    {formas.map((f) => (
                      <option key={f.key} value={f.key}>{f.nombre} ({f.total})</option>
                    ))}
                  </select>
                </Campo>

                <Campo etiqueta="Laboratorio">
                  <select value={lab} onChange={(e) => actualizar({ lab: e.target.value })}>
                    <option value="">Todos</option>
                    {labs.map((l) => (
                      <option key={l.key} value={l.key}>{l.nombre} ({l.total})</option>
                    ))}
                  </select>
                </Campo>

                <Campo etiqueta="Ordenar por">
                  <select value={orden} onChange={(e) => actualizar({ orden: e.target.value === 'destacados' ? '' : e.target.value })}>
                    <option value="destacados">Destacados</option>
                    <option value="precio_asc">Precio: menor a mayor</option>
                    <option value="precio_desc">Precio: mayor a menor</option>
                    <option value="nombre">Nombre (A–Z)</option>
                  </select>
                </Campo>

                <div className="lin-toggles">
                  <button type="button" className={`lin-chip ${soloDisp ? 'lin-chip--activo' : ''}`} aria-pressed={soloDisp} onClick={() => actualizar({ disp: !soloDisp })}>
                    {soloDisp && <Check size={14} aria-hidden="true" />}
                    Solo disponibles
                  </button>
                  <button type="button" className={`lin-chip ${soloOferta ? 'lin-chip--activo' : ''}`} aria-pressed={soloOferta} onClick={() => actualizar({ oferta: !soloOferta })}>
                    {soloOferta && <Check size={14} aria-hidden="true" />}
                    En oferta
                  </button>
                </div>
              </div>

              {filtrosActivos.length > 0 && (
                <div className="lin-activos">
                  {filtrosActivos.map((f) => (
                    <button key={f.id} type="button" className="lin-activo" onClick={f.quitar} aria-label={`Quitar filtro ${f.etiqueta}`}>
                      {f.etiqueta}
                      <X size={13} aria-hidden="true" />
                    </button>
                  ))}
                  <button type="button" className="lin-activos__limpiar" onClick={limpiarTodo}>
                    Limpiar todo
                  </button>
                </div>
              )}

              {cargando ? (
                <div className="lin-grid">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div className="lin-grid__item" key={i}>
                      <ProductCardSkeleton />
                    </div>
                  ))}
                </div>
              ) : productos.length === 0 ? (
                <div className="lin-estado">
                  <span className="lin-estado__icono" aria-hidden="true"><PackageSearch size={28} /></span>
                  <h3>Estamos cargando esta línea</h3>
                  <p>Todavía no hay productos publicados aquí. Mientras tanto, explora el catálogo completo.</p>
                  <Link className="lin-btn lin-btn--primario" to="/catalogo">Ir al catálogo completo</Link>
                </div>
              ) : filtrados.length === 0 ? (
                <div className="lin-estado">
                  <span className="lin-estado__icono" aria-hidden="true"><PackageSearch size={28} /></span>
                  <h3>No encontramos productos con esos filtros</h3>
                  <p>Prueba con otra palabra o quita algún filtro. Si buscas algo puntual, escríbenos y lo conseguimos.</p>
                  <div className="lin-estado__acciones">
                    <button type="button" className="lin-btn lin-btn--primario" onClick={limpiarTodo}>
                      <RotateCcw size={16} aria-hidden="true" />
                      Limpiar filtros
                    </button>
                    <a className="lin-btn lin-btn--secundario" href={CONTACTO.whatsapp.url} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={16} aria-hidden="true" />
                      Escribir por WhatsApp
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <div className="lin-grid">
                    {lista.map((producto) => (
                      <div className="lin-grid__item" key={producto.id}>
                        <ProductCard producto={producto} tasaVes={tasaVes} />
                      </div>
                    ))}
                  </div>
                  {restantes > 0 && (
                    <div className="lin-mas">
                      <button
                        type="button"
                        className="lin-btn lin-btn--secundario lin-btn--ancho"
                        onClick={() => setMostrar({ firma, n: visibles + POR_PAGINA })}
                      >
                        Mostrar más productos
                        <span className="lin-mas__resto">{fmt(restantes)} restantes</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}

        {/* ═══════════ CIERRE ═══════════ */}
        <section className="lin-cierre" aria-labelledby="lin-cierre-t">
          <span className="lin-cierre__brillo" aria-hidden="true" />
          <div className="lin-cierre__texto">
            <h2 id="lin-cierre-t">¿No encuentras lo que necesitas?</h2>
            <p>Arma un presupuesto con varios productos a la vez, o escríbenos y lo buscamos por ti.</p>
          </div>
          <div className="lin-cierre__acciones">
            <Link className="lin-btn lin-btn--claro" to="/presupuesto">
              Generar presupuesto
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a className="lin-btn lin-btn--fantasma" href={CONTACTO.whatsapp.url} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} aria-hidden="true" />
              Escribir por WhatsApp
            </a>
          </div>
        </section>
      </div>

      <Footer />
      <div className="lin-espaciador" aria-hidden="true" />
      <BottomNav />
    </div>
  )
}

export default LineaDepartamento