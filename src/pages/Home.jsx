import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import HeroCarrusel from '../components/HeroCarrusel'
import HomeCarrusel from '../components/HomeCarrusel'
import LaboratoriosCarrusel from '../components/LaboratoriosCarrusel'
import CategoriasCarrusel from '../components/CategoriasCarrusel'
import SeccionesCarrusel from '../components/SeccionesCarrusel'
import AdBanner from '../components/AdBanner'
import AdRotativo from '../components/AdRotativo'
import AdCard from '../components/AdCard'
import CarruselCortos from '../components/CarruselCortos'
import InfiniteScrollLoader from '../components/InfiniteScrollLoader'
import Footer from '../components/Footer'
import BottomNav from '../components/BottomNav'
import CookieConsent from '../components/CookieConsent'
import { agruparEspecifico } from '../utils/agruparEspecifico'
import { ADS } from '../config/adsImagenes'
import { ADS_ROTATIVO_TEMPORADA } from '../config/adRotativoTemporada'
import BloquePromocional from '../components/BloquePromocional'
import SeccionPromocional from '../components/SeccionPromocional'
import NoticiasTeaser from '../components/NoticiasTeaser'
import './Home.css'

// ── Constantes ──────────────────────────────────────────────────
const PRODUCTOS_POR_CARGA = 12
const MAX_CARGAS = 3

// ── Imágenes de los banners hero (Supabase Storage, mismo patrón que Landing) ──
const BASE_URL = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'

const urlsHero = {
  banner1: `${BASE_URL}/banner1.png`,
  banner2: `${BASE_URL}/banner2.png`,
  banner3: `${BASE_URL}/banner3.png`,
}

// Slides del hero. Cada slide usa una sola imagen como fondo; el CSS la
// recorta sola en móvil (object-fit: cover).
// Para cambiar texto/botón/imagen editá acá directo.
const HERO_SLIDES = [
  {
    id: 1,
    imagen: urlsHero.banner1,
    alt: 'Descuentos de temporada',
    subtitulo: 'Descuentos de temporada',
    titulo: 'Tu farmacia ahorra hasta 30% en cada compra',
    botonTexto: 'Ver ofertas',
    botonLink: '/catalogo',
  },
  {
    id: 2,
    imagen: urlsHero.banner2,
    alt: 'Nuevos productos',
    subtitulo: 'Recién llegados',
    titulo: 'Descubrí los nuevos productos para tu clínica',
    botonTexto: 'Explorar catálogo',
    botonLink: '/catalogo',
  },
  {
    id: 3,
    imagen: urlsHero.banner3,
    alt: 'Ofertas relámpago',
    subtitulo: 'Solo por hoy',
    titulo: 'Ofertas relámpago con la mejor tasa del día',
    botonTexto: 'Aprovechar ahora',
    botonLink: '/catalogo',
  },
]

// ── Componente ──────────────────────────────────────────────────
function Home() {
  const { user } = useAuth()

  const sentinelRef = useRef(null)
  const cargasRef = useRef(0)

  const [tasa, setTasa] = useState(null)
  const [ofertas, setOfertas] = useState([])
  const [todosProductos, setTodosProductos] = useState([])
  const [secciones, setSecciones] = useState([])
  const [seccionesRollback2, setSeccionesRollback2] = useState([])
  const [categoriasParaScroll, setCategoriasParaScroll] = useState([])
  const [cargandoVitrina, setCargandoVitrina] = useState(true)

  // Estado del infinite scroll
  const [cargasRestantes, setCargasRestantes] = useState(MAX_CARGAS)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [seccionesDinamicas, setSeccionesDinamicas] = useState([])

  const productosIniciales = todosProductos.slice(0, PRODUCTOS_POR_CARGA)

  // ── Carga inicial ───────────────────────────────────────────
  useEffect(() => {
    api
      .get('/prices')
      .then((res) => setTasa(res.data.usd_a_ves))
      .catch((err) => console.error(err))

    api
      .get('/products')
      .then((res) => {
        const lista = Array.isArray(res.data) ? res.data : (res.data.productos || [])
        const activos = lista.filter((p) => p.activo)
        setTodosProductos(activos)
        setOfertas(activos.filter((p) => p.descuento_activo).slice(0, 12))
        const rollback1 = agruparEspecifico(activos)
        setSecciones(rollback1)
        const idsRollback1 = new Set(rollback1.flatMap((s) => s.productos.map((p) => p.id)))
        setSeccionesRollback2(agruparEspecifico(activos.filter((p) => !idsRollback1.has(p.id)), 6, 4))

        // Categorías reales para las rondas del infinite scroll (en vez de
        // cortes genéricos del catálogo). Necesita al menos 6 productos
        // para llenar una sección completa; toma hasta 6 categorías
        // (3 rondas × 2 secciones).
        const gruposCategoria = activos.reduce((acc, p) => {
          if (!p.categoria) return acc
          acc[p.categoria] = acc[p.categoria] || []
          acc[p.categoria].push(p)
          return acc
        }, {})
        const categoriasTop = Object.entries(gruposCategoria)
          .filter(([, items]) => items.length >= 6)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 6)
          .map(([categoria, items]) => ({ categoria, productos: items }))
        setCategoriasParaScroll(categoriasTop)
      })
      .catch((err) => console.error(err))
      .finally(() => setCargandoVitrina(false))
  }, [])

  // ── Infinite scroll (carga por etapas mientras se scrollea) ──
  // Cada ronda usa 2 categorías reales del catálogo (ver categoriasParaScroll).
  // Si no hay suficientes categorías con stock, cae a un corte genérico del
  // catálogo restante como respaldo, para que el infinite scroll nunca se
  // quede sin contenido.
  const cargarMas = useCallback(() => {
    if (cargasRef.current >= MAX_CARGAS) return
    setCargandoMas(true)

    setTimeout(() => {
      const cargaIdx = cargasRef.current
      const grupo = categoriasParaScroll.slice(cargaIdx * 2, cargaIdx * 2 + 2)

      const nuevasSecciones = grupo.length > 0
        ? grupo.map((g, i) => ({
            id: `dinamica-${cargaIdx}-${i}`,
            titulo: g.categoria,
            productos: g.productos.slice(0, 12),
            verTodoTo: `/catalogo?categoria=${encodeURIComponent(g.categoria)}`,
          }))
        : (() => {
            const inicio = PRODUCTOS_POR_CARGA * (cargaIdx + 1)
            const nuevosProductos = todosProductos.slice(inicio, inicio + PRODUCTOS_POR_CARGA)
            return [
              { id: `dinamica-${cargaIdx}-0`, titulo: 'Explorá el catálogo', productos: nuevosProductos.slice(0, 6), verTodoTo: '/catalogo' },
              { id: `dinamica-${cargaIdx}-1`, titulo: 'Más del catálogo', productos: nuevosProductos.slice(6, 12), verTodoTo: '/catalogo' },
            ]
          })()

      setSeccionesDinamicas((prev) => [...prev, ...nuevasSecciones])
      cargasRef.current += 1
      setCargasRestantes(MAX_CARGAS - cargasRef.current)
      setCargandoMas(false)
    }, 200)
  }, [todosProductos, categoriasParaScroll])

  useEffect(() => {
    if (cargasRestantes <= 0 || cargandoMas) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) cargarMas()
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [cargasRestantes, cargandoMas, cargarMas])

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="home">
      <div className="home__container">
      {/* ── Hero banner ── */}
      <section className="home__hero">
        <HeroCarrusel slides={HERO_SLIDES} intervaloMs={5000} />
      </section>

      {/* ── Vitrina: carruseles fijos + ads ── */}
      <div className="home__vitrina">
        {/* ── Explorá por categoría (colocado justo tras el hero) ── */}
        <CategoriasCarrusel />

        <HomeCarrusel
          titulo="Ofertas destacadas"
          subtitulo="Precios con descuento activo"
          productos={ofertas}
          tasaVes={tasa}
          verTodoTo="/catalogo"
          cargando={cargandoVitrina}
        />

        {/* ── Bloques promocionales: grid tipo bento, pensado como 5 "pilares de marca" ──
          Orden de lectura (desktop, según grid-template-areas "a b b d" / "a c e d"):
            A → línea hospitalaria   B → línea farmacia   D → presupuesto/cotizaciones B2B
            C + E → vademécum + registro sanitario (confianza, en el "valle" entre A y D)
          C y D sin `imagen`: el mensaje cambió de lo que mostraba la foto original
          (medicamentos / repartidor), así que caen en modo placeholder hasta tener
          artes que representen vademécum y presupuesto de verdad. */}
      <section className="home__bloques-promocionales">
        <BloquePromocional
          imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/quirofano.png"
          className="home__bloque-a"
          tamano="grande"
          posicionTexto="arriba"
          titulo="Insumos quirúrgicos para cada procedimiento"
          subtitulo="Todo el equipamiento que tu quirófano necesita"
          textoCta="Comprar ahora"
          link="/hospitalaria"
        />
        <BloquePromocional
          imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/ampollas.png"
          className="home__bloque-b"
          tamano="mediano"
          posicionTexto="arriba"
          titulo="Tu línea de farmacia completa, en un solo lugar"
          subtitulo="Desde inyectables hasta presentaciones de venta libre"
          textoCta="Ver línea farmacia"
          estiloCta="enlace"
          link="/farmacia"
        />
        <BloquePromocional
          className="home__bloque-c"
          tamano="pequeno"
          variante="nuevo"
          titulo="Vademécum clínico al alcance"
          textoCta="Buscar molécula"
          link="/vademecum"
        />
        <BloquePromocional
          imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/ampolla.jpg"
          className="home__bloque-e"
          tamano="pequeno"
          variante="oferta"
          titulo="Cada producto con registro sanitario verificado"
          textoCta="Ver registro"
          estiloCta="enlace"
          link="/registro-inhrr"
        />
        <BloquePromocional
          className="home__bloque-d"
          tamano="grande"
          posicionTexto="arriba"
          variante="default"
          titulo="Sin llamadas ni esperas"
          textoCta="Generar presupuesto"
          link="/presupuesto"
        />
      </section>


      <SeccionesCarrusel
          titulo="Rollbacks y más"
          secciones={secciones}
          cargando={cargandoVitrina}
        />

        {/* ── Explorá por laboratorio (logos dinámicos, top labs) ── */}
        <LaboratoriosCarrusel />

        {/* ── Sección promocional: solo imagen (banner de campaña, sin texto
          ni carrusel — el mensaje ya viene en la imagen) ── */}
      <SeccionPromocional
        soloImagen
        imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/ads/caloxpromo.jpg"
        alt="Promoción Calox"
        linkCta="/catalogo"
      />

        {/* ── Sección promocional invertida: solo imagen (banner de campaña) ── */}
        <SeccionPromocional
          soloImagen
          imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/ads/letipromo.jpg"
          alt="Promoción Leti"
          linkCta="/catalogo"
        />


        <AdRotativo ads={ADS_ROTATIVO_TEMPORADA} />

        <SeccionesCarrusel
          titulo="Más rollbacks"
          secciones={seccionesRollback2}
          cargando={cargandoVitrina}
        />

        <HomeCarrusel
          titulo="Recomendados para ti"
          subtitulo="Seleccionados para tu clínica o farmacia"
          productos={productosIniciales}
          tasaVes={tasa}
          verTodoTo="/catalogo"
          cargando={cargandoVitrina}
        />
        
<div className="home__ads-pair">
          {ADS.map((ad) => (
            <AdCard key={ad.id} {...ad} />
          ))}
        </div>

        <CarruselCortos />

        <NoticiasTeaser />

        {/* ── Secciones dinámicas (cargadas por infinite scroll) ──
          Cada ronda del infinite scroll trae 2 categorías reales del catálogo
          (ver categoriasParaScroll / cargarMas). Entre ambas se intercala UN
          momento editorial (no producto), alternando formato por ronda para
          que no se sienta un shelf repetitivo. ── */}
        {seccionesDinamicas.map((seccion, idx) => {
          const rondaIdx = Math.floor(idx / 2)
          const esMitadDeRonda = idx % 2 === 1

          return (
            <div key={seccion.id} className="home__bloque-dinamico">
              {esMitadDeRonda && (
                rondaIdx % 2 === 0 ? (
                  <AdBanner
                    titulo="Promoción exclusiva"
                    subtitulo="Solo por tiempo limitado"
                    variante="nuevo"
                    link="/catalogo"
                  />
                ) : (
                  <div className="home__ads-pair">
                    <AdCard
                      titulo="Te puede interesar"
                      subtitulo="Productos que otros compran"
                      link="/catalogo"
                    />
                    <AdCard
                      titulo="Ofertas del día"
                      subtitulo="Precios que no vas a encontrar mañana"
                      variante="oferta"
                      link="/catalogo"
                    />
                  </div>
                )
              )}
              <HomeCarrusel
                titulo={seccion.titulo}
                productos={seccion.productos}
                tasaVes={tasa}
                verTodoTo={seccion.verTodoTo}
                cargando={false}
              />
            </div>
          )
        })}

        {/* ── Sentinel para infinite scroll ── */}
        {cargasRestantes > 0 && (
          <div ref={sentinelRef} className="home__sentinel" />
        )}
        {cargandoMas && <InfiniteScrollLoader />}
      </div>

      {/* ── Footer (solo tras agotar las cargas) ── */}
      {cargasRestantes <= 0 && (
        <div className="home__footer-wrapper">
          <Footer />
        </div>
      )}

      </div>{/* fin home__container */}

      {/* Espaciador para bottom nav */}
      <div className="home__espaciador" aria-hidden="true" />
      <BottomNav />

      {user && <CookieConsent />}
    </div>
  )
}

export default Home
