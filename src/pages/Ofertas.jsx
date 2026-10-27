import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Clock, Percent, Sparkles, Tag, ArrowRight, RotateCcw, TriangleAlert, PackageSearch,
} from 'lucide-react'
import api from '../api/axios'
import { nombreVisible } from '../config/laboratoriosLogos'
import { finDe, etiquetaUrgencia } from '../utils/tiempoOferta'
import useAhora from '../hooks/useAhora'
import CuentaRegresiva from '../components/CuentaRegresiva'
import OfertaCard from '../components/OfertaCard'
import ProductCardSkeleton from '../components/Productcardskeleton'
import SeccionesCarrusel from '../components/SeccionesCarrusel'
import { ProductoImagen } from '../components/icons/ProductoImagen'
import Footer from '../components/Footer'
import BottomNav from '../components/BottomNav'
import './Ofertas.css'

// ── Constantes ──────────────────────────────────────────────────
const POR_PAGINA = 16
const MAX_LABS = 12
const DIAS_NUEVAS = 14
const MS_DIA = 86_400_000
const ORDENES = [
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'descuento', etiqueta: 'Mayor descuento' },
  { id: 'recientes', etiqueta: 'Recién agregadas' },
  { id: 'vencer', etiqueta: 'Por vencer' },
]
const IDS_ORDEN = ORDENES.map((o) => o.id)

// ── Helpers ─────────────────────────────────────────────────────
const fmt = (n) => Number(n).toLocaleString('es-VE')
const usd = (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Porcentaje real de ahorro (sirve igual para descuentos por % o por monto)
function pctDe(p) {
  const o = Number(p.precio_original_usd)
  const a = Number(p.precio_usd)
  if (!(o > 0) || !Number.isFinite(a)) return 0
  return Math.max(0, Math.round((1 - a / o) * 100))
}
const ahorroUsd = (p) => Math.max(0, Number(p.precio_original_usd) - Number(p.precio_usd)) || 0
const creadoEn = (p) => {
  const t = new Date(p.created_at).getTime()
  return Number.isNaN(t) ? 0 : t
}

function irAGrid() {
  const el = document.getElementById('of-grid')
  if (!el) return
  const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' })
}

// ── Piezas ──────────────────────────────────────────────────────
function Destacado({ producto, grande }) {
  const pct = pctDe(producto)
  return (
    <Link to={`/producto/${producto.id}`} className={`of-dest ${grande ? 'of-dest--grande' : ''}`}>
      <span className="of-dest__marco">
        <ProductoImagen
          src={producto.foto_url}
          alt={producto.nombre_comercial}
          className="of-dest__img"
          loading={grande ? 'eager' : 'lazy'}
        />
        {pct > 0 && <span className="of-dest__pct">-{pct}%</span>}
      </span>
      <span className="of-dest__nombre">{producto.nombre_comercial}</span>
      <span className="of-dest__precios">
        <strong>${usd(producto.precio_usd)}</strong>
        {Number(producto.precio_original_usd) > 0 && <s>${usd(producto.precio_original_usd)}</s>}
      </span>
    </Link>
  )
}

function TileBento({ clase, icono: Icono, valor, titulo, texto, activo, onClick, cargando }) {
  return (
    <button
      type="button"
      className={`of-tile ${clase} ${activo ? 'of-tile--activo' : ''}`}
      onClick={onClick}
      aria-pressed={activo}
    >
      <span className="of-tile__icono" aria-hidden="true"><Icono size={20} strokeWidth={2} /></span>
      {cargando ? (
        <span className="of-skel of-tile__skel" aria-hidden="true" />
      ) : (
        <span className="of-tile__valor">{valor}</span>
      )}
      <span className="of-tile__titulo">{titulo}</span>
      <span className="of-tile__texto">{texto}</span>
      <ArrowRight className="of-tile__flecha" size={18} aria-hidden="true" />
    </button>
  )
}

// ── Página ──────────────────────────────────────────────────────
function Ofertas() {
  const [params, setParams] = useSearchParams()
  const ordenParam = params.get('orden') || 'todas'
  const orden = IDS_ORDEN.includes(ordenParam) ? ordenParam : 'todas'

  const [productos, setProductos] = useState([])
  const [tasaVes, setTasaVes] = useState(null)
  const [estado, setEstado] = useState('cargando') // cargando | ok | error
  const [intento, setIntento] = useState(0)
  const [mostrar, setMostrar] = useState({ clave: '', n: POR_PAGINA })
  const [ahora, refrescar] = useAhora(30000)

  useEffect(() => {
    const previo = document.title
    document.title = 'Ofertas · Droguería Carrisan'
    return () => {
      document.title = previo
    }
  }, [])

  useEffect(() => {
    let vivo = true
    Promise.all([api.get('/products'), api.get('/prices').catch(() => null)])
      .then(([resProductos, resTasa]) => {
        if (!vivo) return
        const data = resProductos.data
        setProductos(Array.isArray(data) ? data : data?.productos || [])
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
  }, [intento])

  const reintentar = () => {
    setEstado('cargando')
    setIntento((n) => n + 1)
  }

  const elegirOrden = useCallback(
    (id, { scroll = false } = {}) => {
      setParams(
        (prev) => {
          const sig = new URLSearchParams(prev)
          if (id === 'todas') sig.delete('orden')
          else sig.set('orden', id)
          return sig
        },
        { replace: true }
      )
      if (scroll) irAGrid()
    },
    [setParams]
  )

  // ── Derivados ─────────────────────────────────────────────────
  // Ofertas vigentes: con descuento activo y que no hayan vencido todavía.
  const ofertas = useMemo(
    () =>
      productos.filter((p) => {
        if (!p.activo || !p.descuento_activo) return false
        const fin = finDe(p)
        return fin == null || fin > ahora
      }),
    [productos, ahora]
  )

  const conFecha = useMemo(
    () => ofertas.filter((p) => finDe(p) != null).sort((a, b) => finDe(a) - finDe(b)),
    [ofertas]
  )

  // Hero: la oferta que vence primero (grupo = productos del mismo descuento)
  const proximo = conFecha[0] || null
  const finProximo = proximo ? finDe(proximo) : null
  const grupoProximo = useMemo(
    () => (proximo ? conFecha.filter((p) => p.descuento_activo.id === proximo.descuento_activo.id) : []),
    [conFecha, proximo]
  )
  const maxPctGrupo = grupoProximo.reduce((m, p) => Math.max(m, pctDe(p)), 0)

  const destacados = useMemo(() => {
    const porPct = [...ofertas].sort((a, b) => pctDe(b) - pctDe(a) || ahorroUsd(b) - ahorroUsd(a))
    const conFoto = porPct.filter((p) => p.foto_url)
    return (conFoto.length >= 3 ? conFoto : porPct).slice(0, 3)
  }, [ofertas])

  const stats = useMemo(() => {
    const maxPct = ofertas.reduce((m, p) => Math.max(m, pctDe(p)), 0)
    const hoy = conFecha.filter((p) => etiquetaUrgencia(finDe(p), ahora)?.nivel === 'critica').length
    const nuevas = ofertas.filter((p) => ahora - creadoEn(p) <= DIAS_NUEVAS * MS_DIA && creadoEn(p) > 0).length
    return { total: ofertas.length, maxPct, hoy, nuevas, conFecha: conFecha.length }
  }, [ofertas, conFecha, ahora])

  const ordenadas = useMemo(() => {
    const copia = [...ofertas]
    if (orden === 'descuento') return copia.sort((a, b) => pctDe(b) - pctDe(a) || ahorroUsd(b) - ahorroUsd(a))
    if (orden === 'recientes') return copia.sort((a, b) => creadoEn(b) - creadoEn(a))
    if (orden === 'vencer') return copia.filter((p) => finDe(p) != null).sort((a, b) => finDe(a) - finDe(b))
    // "Todas": las que cierran primero arriba; luego las que no tienen fecha, por % de ahorro
    return copia.sort((a, b) => {
      const fa = finDe(a)
      const fb = finDe(b)
      if (fa != null && fb != null) return fa - fb
      if (fa != null) return -1
      if (fb != null) return 1
      return pctDe(b) - pctDe(a)
    })
  }, [ofertas, orden])

  // Carruseles por laboratorio: se arman con TODAS las ofertas (no solo las que sobran)
  const seccionesLab = useMemo(() => {
    const mapa = new Map()
    for (const p of ofertas) {
      if (!p.laboratorio) continue
      const clave = nombreVisible(p.laboratorio)
      if (!clave) continue
      const act = mapa.get(clave)
      if (act) act.items.push(p)
      else mapa.set(clave, { raw: p.laboratorio, items: [p] })
    }
    return [...mapa.entries()]
      .filter(([, v]) => v.items.length >= 2)
      .sort((a, b) => b[1].items.length - a[1].items.length)
      .slice(0, MAX_LABS)
      .map(([nombre, v]) => ({
        id: nombre,
        titulo: nombre,
        verTodoTo: `/catalogo?laboratorio=${encodeURIComponent(v.raw)}`,
        productos: [...v.items].sort((a, b) => pctDe(b) - pctDe(a)).slice(0, 4),
      }))
  }, [ofertas])

  const clave = orden
  const visibles = mostrar.clave === clave ? mostrar.n : POR_PAGINA
  const lista = ordenadas.slice(0, visibles)
  const restantes = ordenadas.length - lista.length
  const sinFecha = ofertas.length - conFecha.length

  const cargando = estado === 'cargando'
  const hayOfertas = !cargando && estado === 'ok' && ofertas.length > 0

  const etiquetaProxima = proximo ? etiquetaUrgencia(finProximo, ahora) : null
  const textoTileVencer =
    stats.hoy > 0
      ? `${fmt(stats.hoy)} ${stats.hoy === 1 ? 'termina' : 'terminan'} hoy`
      : etiquetaProxima
        ? `La próxima: ${etiquetaProxima.texto.charAt(0).toLowerCase()}${etiquetaProxima.texto.slice(1)}`
        : 'Aún sin fechas de cierre'

  return (
    <div className="of">
      {/* ═══════════ HERO ═══════════ */}
      <header className="of-hero">
        <span className="of-hero__brillo" aria-hidden="true" />
        <span className="of-hero__puntos" aria-hidden="true" />

        <div className="of-hero__interior">
          <div className="of-hero__texto">
            <nav className="of-migas" aria-label="Ruta de navegación">
              <Link to="/">Inicio</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Ofertas</span>
            </nav>

            <span className="of-eyebrow">
              <span className="of-pulso" aria-hidden="true" />
              Precios por tiempo limitado
            </span>
            <h1 className="of-hero__titulo">
              Ofertas que <span className="of-hero__acento">se acaban.</span>
            </h1>
            <p className="of-hero__bajada">
              Descuentos activos en la plataforma. Cuando el reloj llega a cero, el precio vuelve a la normalidad.
            </p>

            {cargando && (
              <div className="of-reloj of-reloj--cargando" aria-hidden="true">
                <span className="of-skel of-reloj__skel" />
              </div>
            )}

            {finProximo != null && (
              <div className="of-reloj">
                <span className="of-reloj__etiqueta">Próxima oferta en terminar</span>
                <CuentaRegresiva key={finProximo} fin={finProximo} onFin={refrescar} />
                <span className="of-reloj__detalle">
                  {fmt(grupoProximo.length)} {grupoProximo.length === 1 ? 'producto' : 'productos'}
                  {maxPctGrupo > 0 && ` · hasta -${maxPctGrupo}%`}
                </span>
              </div>
            )}

            {hayOfertas && finProximo == null && (
              <p className="of-hero__aviso">Estas ofertas están activas y no tienen fecha de cierre definida.</p>
            )}

            <div className="of-hero__acciones">
              <button type="button" className="of-btn of-btn--claro" onClick={irAGrid}>
                Ver las ofertas
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <Link className="of-btn of-btn--fantasma" to="/catalogo">Ir al catálogo</Link>
            </div>
          </div>

          {(cargando || destacados.length > 0) && (
            <div className="of-mosaico" aria-label="Los productos con mayor ahorro">
              {cargando
                ? [0, 1, 2].map((i) => <span key={i} className={`of-skel of-dest-skel ${i === 0 ? 'of-dest-skel--grande' : ''}`} />)
                : destacados.map((p, i) => <Destacado key={p.id} producto={p} grande={i === 0} />)}
            </div>
          )}
        </div>
      </header>

      <div className="of-contenedor">
        {estado === 'error' ? (
          <section className="of-estado" role="alert">
            <span className="of-estado__icono of-estado__icono--alerta" aria-hidden="true"><TriangleAlert size={28} /></span>
            <h2>No pudimos cargar las ofertas</h2>
            <p>Revisa tu conexión e inténtalo de nuevo.</p>
            <button type="button" className="of-btn of-btn--primario" onClick={reintentar}>
              <RotateCcw size={16} aria-hidden="true" />
              Reintentar
            </button>
          </section>
        ) : (
          <>
            {/* ═══════════ BENTO ═══════════ */}
            {(cargando || ofertas.length > 0) && (
              <section className="of-seccion" aria-label="Atajos de ofertas">
                <div className="of-bento">
                  <TileBento
                    clase="of-tile--vencer of-bento__a"
                    icono={Clock}
                    valor={fmt(stats.conFecha)}
                    titulo="Por vencer"
                    texto={textoTileVencer}
                    activo={orden === 'vencer'}
                    cargando={cargando}
                    onClick={() => elegirOrden('vencer', { scroll: true })}
                  />
                  <TileBento
                    clase="of-tile--descuento of-bento__b"
                    icono={Percent}
                    valor={stats.maxPct > 0 ? `-${stats.maxPct}%` : '—'}
                    titulo="Mayor descuento"
                    texto="Los productos con el mayor ahorro"
                    activo={orden === 'descuento'}
                    cargando={cargando}
                    onClick={() => elegirOrden('descuento', { scroll: true })}
                  />
                  <TileBento
                    clase="of-tile--nuevas of-bento__c"
                    icono={Sparkles}
                    valor={fmt(stats.nuevas)}
                    titulo="Recién agregadas"
                    texto={stats.nuevas > 0 ? `En los últimos ${DIAS_NUEVAS} días` : 'Sin novedades recientes'}
                    activo={orden === 'recientes'}
                    cargando={cargando}
                    onClick={() => elegirOrden('recientes', { scroll: true })}
                  />
                  <TileBento
                    clase="of-tile--todas of-bento__d"
                    icono={Tag}
                    valor={fmt(stats.total)}
                    titulo="Todas las ofertas"
                    texto="Las que cierran primero, arriba"
                    activo={orden === 'todas'}
                    cargando={cargando}
                    onClick={() => elegirOrden('todas', { scroll: true })}
                  />
                </div>
              </section>
            )}

            {/* ═══════════ GRILLA ═══════════ */}
            <section id="of-grid" className="of-seccion of-grid-seccion" aria-labelledby="of-grid-t">
              <div className="of-seccion__cabecera">
                <div>
                  <h2 id="of-grid-t" className="of-seccion__titulo">
                    {orden === 'todas' ? 'Todas las ofertas' : ORDENES.find((o) => o.id === orden).etiqueta}
                  </h2>
                  <p className="of-seccion__sub" aria-live="polite">
                    {cargando ? 'Cargando ofertas…' : `${fmt(ordenadas.length)} ${ordenadas.length === 1 ? 'producto' : 'productos'}`}
                  </p>
                </div>
                <div className="of-segmentos" role="group" aria-label="Ordenar ofertas">
                  {ORDENES.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className={`of-segmento ${orden === o.id ? 'of-segmento--activo' : ''}`}
                      aria-pressed={orden === o.id}
                      onClick={() => elegirOrden(o.id)}
                    >
                      {o.etiqueta}
                    </button>
                  ))}
                </div>
              </div>

              {orden === 'vencer' && sinFecha > 0 && !cargando && (
                <p className="of-nota">
                  {fmt(sinFecha)} {sinFecha === 1 ? 'oferta no tiene' : 'ofertas no tienen'} fecha de cierre y se ven en «Todas».
                </p>
              )}

              {cargando ? (
                <div className="of-grid">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : ordenadas.length === 0 ? (
                <div className="of-estado">
                  <span className="of-estado__icono" aria-hidden="true"><PackageSearch size={28} /></span>
                  <h3>{ofertas.length === 0 ? 'Todavía no hay ofertas activas' : 'No hay ofertas en esta vista'}</h3>
                  <p>
                    {ofertas.length === 0
                      ? 'Vuelve pronto: los descuentos nuevos aparecen aquí apenas se activan.'
                      : 'Ninguna oferta cumple este criterio por ahora. Prueba con otra vista.'}
                  </p>
                  {ofertas.length === 0 ? (
                    <Link className="of-btn of-btn--primario" to="/catalogo">Explorar el catálogo</Link>
                  ) : (
                    <button type="button" className="of-btn of-btn--primario" onClick={() => elegirOrden('todas')}>
                      Ver todas las ofertas
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="of-grid">
                    {lista.map((p) => (
                      <OfertaCard key={p.id} producto={p} tasaVes={tasaVes} ahora={ahora} />
                    ))}
                  </div>
                  {restantes > 0 && (
                    <div className="of-mas">
                      <button
                        type="button"
                        className="of-btn of-btn--contorno"
                        onClick={() => setMostrar({ clave, n: visibles + POR_PAGINA })}
                      >
                        Mostrar más ofertas
                        <span className="of-mas__resto">{fmt(restantes)} restantes</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ═══════════ POR LABORATORIO ═══════════ */}
            {(cargando || seccionesLab.length > 0) && (
              <div className="of-seccion">
                <SeccionesCarrusel
                  titulo="Ofertas por laboratorio"
                  secciones={seccionesLab}
                  cargando={cargando}
                />
              </div>
            )}
          </>
        )}

        {/* ═══════════ CIERRE ═══════════ */}
        <section className="of-cierre" aria-labelledby="of-cierre-t">
          <span className="of-cierre__brillo" aria-hidden="true" />
          <div>
            <h2 id="of-cierre-t">¿Buscas algo que no está en oferta?</h2>
            <p>Explora el catálogo completo o arma un presupuesto con todo lo que necesitas.</p>
          </div>
          <div className="of-cierre__acciones">
            <Link className="of-btn of-btn--claro" to="/catalogo">
              Ir al catálogo
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="of-btn of-btn--fantasma" to="/presupuesto">Pedir presupuesto</Link>
          </div>
        </section>
      </div>

      <Footer />
      <div className="of-espaciador" aria-hidden="true" />
      <BottomNav />
    </div>
  )
}

export default Ofertas
