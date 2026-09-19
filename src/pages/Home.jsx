import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import HeroCarrusel from '../components/HeroCarrusel'
import HomeCarrusel from '../components/HomeCarrusel'
import MiniPromoCard from '../components/MiniPromoCard'
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
import BloquePromocional from '../components/BloquePromocional'
import SeccionPromocional from '../components/SeccionPromocional'
import NoticiasTeaser from '../components/NoticiasTeaser'
import TrustBar from '../components/TrustBar'
import './Home.css'

// ── Constantes ──────────────────────────────────────────────────
const PRODUCTOS_POR_CARGA = 12
const MAX_CARGAS = 3

// Configuración de las secciones dinámicas que se cargan al scrollear.
// Cada entrada del array = una "carga" (etapa) del infinite scroll.
const SECCIONES_DINAMICAS = [
  [
    { titulo: 'Nuevos para ti', verTodoTo: '/catalogo' },
    { titulo: 'Explorá el catálogo', verTodoTo: '/catalogo' },
  ],
  [
    { titulo: 'Más populares', verTodoTo: '/catalogo' },
    { titulo: 'Descubrí más', verTodoTo: '/catalogo' },
  ],
  [
    { titulo: 'Elegidos para tu farmacia', verTodoTo: '/catalogo' },
    { titulo: 'Últimas unidades', verTodoTo: '/catalogo' },
  ],
]

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
  const [seccionesLab, setSeccionesLab] = useState([])
  const [cargandoVitrina, setCargandoVitrina] = useState(true)

  // Estado del infinite scroll
  const [cargasRestantes, setCargasRestantes] = useState(MAX_CARGAS)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [seccionesDinamicas, setSeccionesDinamicas] = useState([])

  const productosIniciales = todosProductos.slice(0, PRODUCTOS_POR_CARGA)
  const labSuperior = seccionesLab[0]
  const labInferior = seccionesLab[1]

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

        const gruposLab = activos.reduce((acc, p) => {
          if (!p.laboratorio) return acc
          acc[p.laboratorio] = acc[p.laboratorio] || []
          acc[p.laboratorio].push(p)
          return acc
        }, {})
        const seccionesLabTop = Object.entries(gruposLab)
          .filter(([, items]) => items.length >= 2)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 2)
          .map(([lab, items]) => ({ lab, productos: items.slice(0, 9) }))
        setSeccionesLab(seccionesLabTop)
      })
      .catch((err) => console.error(err))
      .finally(() => setCargandoVitrina(false))
  }, [])

  // ── Infinite scroll (carga por etapas mientras se scrollea) ──
  const cargarMas = useCallback(() => {
    if (cargasRef.current >= MAX_CARGAS) return
    setCargandoMas(true)

    setTimeout(() => {
      const cargaIdx = cargasRef.current
      const inicio = PRODUCTOS_POR_CARGA * (cargaIdx + 1)
      const fin = inicio + PRODUCTOS_POR_CARGA
      const nuevosProductos = todosProductos.slice(inicio, fin)

      const configs = SECCIONES_DINAMICAS[cargaIdx] || []
      const nuevasSecciones = configs.map((cfg, i) => ({
        id: `dinamica-${cargaIdx}-${i}`,
        titulo: cfg.titulo,
        productos: nuevosProductos.slice(i * 6, (i + 1) * 6),
        verTodoTo: cfg.verTodoTo,
      }))

      setSeccionesDinamicas((prev) => [...prev, ...nuevasSecciones])
      cargasRef.current += 1
      setCargasRestantes(MAX_CARGAS - cargasRef.current)
      setCargandoMas(false)
    }, 200)
  }, [todosProductos])

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
          Los 5 bloques tienen imagen propia (vervademecum.png / verpresupuesto.png
          en `crsnimages`); ningún bloque queda en modo placeholder. */}
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
          subtitulo="Desde antibióticos hasta presentación de venta libre"
          textoCta="Ver línea farmacia"
          estiloCta="enlace"
          link="/farmacia"
        />
        <BloquePromocional
          imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/vervademecum.png"
          className="home__bloque-c"
          tamano="pequeno"
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
          imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/verpresupuesto.png"
          className="home__bloque-d"
          tamano="grande"
          posicionTexto="arriba"
          titulo="Presupuestos institucionales, sin llamadas ni esperas"
          textoCta="Solicitar presupuesto"
          link="/presupuesto"
        />
      </section>

      {/* ── Barra de confianza (tras los bloques promocionales):
        habla de la empresa — entregas, pagos, registro y verificación ── */}
      <TrustBar />

      <SeccionesCarrusel
          titulo="Rollbacks y más"
          secciones={secciones}
          cargando={cargandoVitrina}
        />

        {/* ── Explorá por laboratorio (logos dinámicos, top labs) ── */}
        <LaboratoriosCarrusel />

        {/* ── Sección promocional: imagen + carrusel (imagen a la izquierda) ── */}
      <SeccionPromocional
        imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/quirofano.png"
        alt="Productos hospitalarios"
        titulo="Insumos quirúrgicos para cada procedimiento"
        subtitulo="Equipamiento completo para tu clínica"
        badgeTexto="Desde 20% off"
        textoCta="Comprar ahora"
        linkCta="/hospitalaria"
        linkImagen="/hospitalaria"
        productos={labSuperior ? labSuperior.productos : ofertas}
        tasaVes={tasa}
        tituloCarrusel={labSuperior ? `Productos ${labSuperior.lab}` : 'Más vendidos'}
        verTodoTo={labSuperior ? `/catalogo?laboratorio=${encodeURIComponent(labSuperior.lab)}` : '/catalogo'}
        cargando={cargandoVitrina}
      />

        {/* ── Sección promocional invertida: imagen a la derecha ── */}
        <SeccionPromocional
          invertido
          imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/ampollas.png"
          alt="Inyectables"
          titulo="Inyectables con cadena de frío garantizada"
          textoCta="Conocer más"
          linkCta="/ayuda"
          linkImagen="/ayuda"
          productos={labInferior ? labInferior.productos : productosIniciales}
          tasaVes={tasa}
          tituloCarrusel={labInferior ? `Productos ${labInferior.lab}` : 'Recomendados para ti'}
          verTodoTo={labInferior ? `/catalogo?laboratorio=${encodeURIComponent(labInferior.lab)}` : '/catalogo'}
          cargando={cargandoVitrina}
        />


        <AdRotativo
          ads={ADS.map((ad) => ({
            imagen: ad.imagen,
            link: ad.link,
            alt: ad.alt,
            titulo: ad.titulo,
            subtitulo: ad.subtitulo,
          }))}
        />

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
          Cada ronda del infinite scroll trae 2 secciones (ver SECCIONES_DINAMICAS).
          Entre ambas se intercala UN momento editorial (no producto), alternando
          formato por ronda para que no se sienta un shelf repetitivo. ── */}
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

              {/* Ronda final: grilla 2x2/4-col (rompe la monotonía del shelf) */}
              {rondaIdx === 2 ? (
                <section className="home__grilla">
                  <div className="home__grilla-header">
                    <h2>{seccion.titulo}</h2>
                    <Link to={seccion.verTodoTo}>Ver todo</Link>
                  </div>
                  <div className="home__grilla-grid">
                    {seccion.productos.slice(0, 4).map((producto) => (
                      <MiniPromoCard key={producto.id} producto={producto} />
                    ))}
                  </div>
                </section>
              ) : (
                <HomeCarrusel
                  titulo={seccion.titulo}
                  productos={seccion.productos}
                  tasaVes={tasa}
                  verTodoTo={seccion.verTodoTo}
                  cargando={false}
                />
              )}
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
