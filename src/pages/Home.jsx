import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import HeroCarrusel from '../components/HeroCarrusel'
import HomeCarrusel from '../components/HomeCarrusel'
import LaboratoriosCarrusel from '../components/LaboratoriosCarrusel'
import CategoriasCarrusel from '../components/CategoriasCarrusel'
import SeccionesCarrusel from '../components/SeccionesCarrusel'
import AdRotativo from '../components/AdRotativo'
import AdCard from '../components/AdCard'
import CarruselCortos from '../components/CarruselCortos'
import InfiniteScrollLoader from '../components/InfiniteScrollLoader'
import { useEsMobile } from '../hooks/useEsMobile'
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

// Cargas del scroll infinito. Cada entrada es UNA ronda = carrusel simple de
// la categoría + promo (mitad imagen / mitad carrusel) con los productos de esa
// categoría filtrados por laboratorio (coincidencia parcial, `ilike %...%`).
// `categoria` es el slug de `categorias_tienda` (lo resuelve el backend vía
// producto_categorias). Para agregar una carga nueva, sumá una entrada acá.
const CARGAS_INFINITO = [
  {
    titulo: 'Analgésicos',
    categoria: 'analgesicos',
    promo: {
      imagen: `${BASE_URL}/ads/dol.jpg`,
      alt: 'Analgésicos Calox',
      laboratorio: 'CALOX',
      tituloCarrusel: 'Productos Calox',
    },
  },
]

const MAX_CARGAS = CARGAS_INFINITO.length

// ── Componente ──────────────────────────────────────────────────
function Home() {
  const { user } = useAuth()

  const esMobile = useEsMobile()

  const sentinelRef = useRef(null)
  const cargasRef = useRef(0)
  const cargandoMasRef = useRef(false)
  const sentinelEnVistaRef = useRef(false)
  const cachéCategoriasRef = useRef(new Map())

  const [tasa, setTasa] = useState(null)
  const [ofertas, setOfertas] = useState([])
  const [todosProductos, setTodosProductos] = useState([])
  const [secciones, setSecciones] = useState([])
  const [seccionesRollback2, setSeccionesRollback2] = useState([])
  const [seccionesLab, setSeccionesLab] = useState([])
  const [categoriasTienda, setCategoriasTienda] = useState([])
  const [laboratoriosTienda, setLaboratoriosTienda] = useState([])
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

    // Metadata de categorías/laboratorios (una sola vez, para no duplicar
    // el fetch que CategoriasCarrusel y LaboratoriosCarrusel hacen aparte).
    api
      .get('/products/metadata')
      .then((res) => {
        setCategoriasTienda(Array.isArray(res.data?.categorias) ? res.data.categorias : [])
        setLaboratoriosTienda(Array.isArray(res.data?.laboratoriosTop) ? res.data.laboratoriosTop : [])
      })
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

        // Top 2 laboratorios para las secciones promocionales: panel de
        // campaña (solo imagen) + carrusel de "Productos {lab}". Requiere al
        // menos 2 productos por laboratorio para llenar el carrusel.
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
  // Cada ronda = UNA entrada de CARGAS_INFINITO: carrusel simple de la
  // categoría + promo (mitad imagen / mitad carrusel) con los productos de esa
  // categoría filtrados por laboratorio (coincidencia parcial).
  const cargarMas = useCallback(() => {
    if (cargasRef.current >= MAX_CARGAS) return
    cargandoMasRef.current = true
    setCargandoMas(true)

    const cargaIdx = cargasRef.current
    const carga = CARGAS_INFINITO[cargaIdx]
    if (!carga) {
      cargandoMasRef.current = false
      setCargandoMas(false)
      return
    }

    const resolver = (data) => {
      const lista = Array.isArray(data) ? data : (data.productos || [])
      const activos = lista.filter((p) => p.activo)
      if (activos.length === 0) {
        cargandoMasRef.current = false
        setCargandoMas(false)
        return
      }

      const verTodoCategoria = `/catalogo?categoria=${encodeURIComponent(carga.categoria)}`
      const labPromo = carga.promo?.laboratorio
      const productosPromo = labPromo
        ? activos
            .filter((p) => p.laboratorio && p.laboratorio.toUpperCase().includes(labPromo.toUpperCase()))
            .slice(0, 12)
        : []
      const verTodoPromo = labPromo
        ? `${verTodoCategoria}&laboratorio=${encodeURIComponent(labPromo)}`
        : verTodoCategoria

      setSeccionesDinamicas((prev) => [
        ...prev,
        {
          id: `dinamica-${cargaIdx}`,
          titulo: carga.titulo,
          productos: activos.slice(0, 12),
          verTodoTo: verTodoCategoria,
          promo: {
            imagen: carga.promo?.imagen,
            alt: carga.promo?.alt || '',
            linkImagen: verTodoPromo,
            tituloCarrusel: carga.promo?.tituloCarrusel || 'Productos destacados',
            verTodoTo: verTodoPromo,
            productos: productosPromo,
          },
        },
      ])
      cargasRef.current += 1
      setCargasRestantes(MAX_CARGAS - cargasRef.current)
      cargandoMasRef.current = false
      setCargandoMas(false)
    }

    const cacheado = cachéCategoriasRef.current.get(carga.categoria)
    if (cacheado) {
      resolver(cacheado)
      return
    }

    api
      .get('/products', { params: { categoria: carga.categoria } })
      .then((res) => {
        cachéCategoriasRef.current.set(carga.categoria, res.data)
        resolver(res.data)
      })
      .catch((err) => {
        console.error(err)
        cargandoMasRef.current = false
        setCargandoMas(false)
      })
  }, [])

  // ── Infinite scroll (carga por etapas mientras se scrollea) ──
  // El observer solo dispara cuando el sentinel ENTRÓ a la zona visible (en
  // un evento de intersección real), no sobre cada reconexión del observer.
  // Con el guard de "ya visto" (sentinelEnVistaRef) se evita que las rondas
  // se encadenen solas sin que el usuario scrollee.
  useEffect(() => {
    if (cargasRestantes <= 0) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entrante = entries[0]
        if (!entrante.isIntersecting) {
          sentinelEnVistaRef.current = false
          return
        }
        if (sentinelEnVistaRef.current || cargandoMasRef.current) return
        sentinelEnVistaRef.current = true
        cargarMas()
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [cargasRestantes, cargarMas])

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
        <CategoriasCarrusel categorias={categoriasTienda.length ? categoriasTienda : undefined} />

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
          Los 5 bloques tienen imagen propia; ninguno cae en modo placeholder. */}
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
          imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/medicamentos.png"
          className="home__bloque-b"
          tamano="mediano"
          posicionTexto="arriba"
          titulo="Tu línea de farmacia completa, en un solo lugar"
          subtitulo="Todo el catálogo de medicamentos para consumo masivo"
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
        <LaboratoriosCarrusel laboratoriosTop={laboratoriosTienda.length ? laboratoriosTienda : undefined} />

        {/* ── Sección promocional: panel de campaña (solo imagen, sin texto)
          + carrusel del laboratorio destacado #1 (labSuperior) ── */}
        <SeccionPromocional
          imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/ads/letipromo.jpg"
          alt={labSuperior ? `Productos ${labSuperior.lab}` : 'Selección destacada'}
          linkImagen={labSuperior ? `/catalogo?laboratorio=${encodeURIComponent(labSuperior.lab)}` : '/catalogo'}
          productos={labSuperior ? labSuperior.productos : ofertas}
          tasaVes={tasa}
          tituloCarrusel={labSuperior ? `Productos ${labSuperior.lab}` : 'Más vendidos'}
          verTodoTo={labSuperior ? `/catalogo?laboratorio=${encodeURIComponent(labSuperior.lab)}` : '/catalogo'}
          cargando={cargandoVitrina}
        />

        {/* ── Sección promocional invertida: panel de campaña (solo imagen)
          + carrusel del laboratorio destacado #2 (labInferior) ── */}
        <SeccionPromocional
          invertido
          imagen="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/ads/caloxpromo2.jpg"
          alt={labInferior ? `Productos ${labInferior.lab}` : 'Recomendados para ti'}
          linkImagen={labInferior ? `/catalogo?laboratorio=${encodeURIComponent(labInferior.lab)}` : '/catalogo'}
          productos={labInferior ? labInferior.productos : productosIniciales}
          tasaVes={tasa}
          tituloCarrusel={labInferior ? `Productos ${labInferior.lab}` : 'Recomendados para ti'}
          verTodoTo={labInferior ? `/catalogo?laboratorio=${encodeURIComponent(labInferior.lab)}` : '/catalogo'}
          cargando={cargandoVitrina}
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
          {ADS.filter((ad) => !esMobile || !ad.soloTabletDesktop).map((ad) => (
            <AdCard key={ad.id} {...ad} />
          ))}
        </div>

        <CarruselCortos />

        <NoticiasTeaser />

        {/* ── Secciones dinámicas (cargadas por infinite scroll) ──
          Cada ronda = carrusel simple de una categoría + promo (mitad
          imagen / mitad carrusel) de esa misma categoría (ver CARGAS_INFINITO
          / cargarMas). ── */}
        {seccionesDinamicas.map((seccion) => (
          <div key={seccion.id} className="home__bloque-dinamico">
            <HomeCarrusel
              titulo={seccion.titulo}
              productos={seccion.productos}
              tasaVes={tasa}
              verTodoTo={seccion.verTodoTo}
              cargando={false}
            />
            {seccion.promo && (
              <SeccionPromocional
                imagen={seccion.promo.imagen}
                alt={seccion.promo.alt}
                linkImagen={seccion.promo.linkImagen}
                productos={seccion.promo.productos}
                tasaVes={tasa}
                tituloCarrusel={seccion.promo.tituloCarrusel}
                verTodoTo={seccion.promo.verTodoTo}
                cargando={false}
              />
            )}
          </div>
        ))}

        {/* ── Sentinel para infinite scroll ── */}
        {cargasRestantes > 0 && !cargandoVitrina && (
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
