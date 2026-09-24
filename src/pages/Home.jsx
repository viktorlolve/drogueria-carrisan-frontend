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

// ── Helpers de vitrina ──────────────────────────────────────────
// Selección al azar de `n` elementos de una lista (no muta la original).
function sampleAleatorio(lista, n) {
  if (!lista || lista.length === 0) return []
  const arr = [...lista]
  const m = Math.min(n, arr.length)
  for (let i = arr.length - 1; i >= arr.length - m; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(arr.length - m)
}

// Merge de un bloque del bento configurado con sus defaults del archivo.
function bentoDe(vitrina, clase, defaults) {
  const lista = vitrina.bento?.bloques
  if (!Array.isArray(lista)) return defaults
  const match = lista.find((b) => b && b.id === clase)
  if (!match) return defaults
  return {
    ...defaults,
    ...match,
    imagen: match.imagen || defaults.imagen,
    titulo: match.titulo || defaults.titulo,
    subtitulo: match.subtitulo || defaults.subtitulo,
    textoCta: match.textoCta || defaults.textoCta,
    link: match.link || defaults.link,
  }
}

// Título de un carrusel fijo con fallback al título actual del archivo.
function tituloSeccion(vitrina, id, fallback) {
  const lista = vitrina.carruseles?.secciones
  if (!Array.isArray(lista)) return fallback
  const match = lista.find((s) => s && s.id === id)
  return match && match.titulo ? match.titulo : fallback
}

// Visibilidad de un carrusel fijo (true por defecto).
function seccionVisible(vitrina, id, fallback = true) {
  const lista = vitrina.carruseles?.secciones
  if (!Array.isArray(lista)) return fallback
  const match = lista.find((s) => s && s.id === id)
  return match ? match.visible !== false : fallback
}

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

  // Config de vitrina (hero, promos, bento, carruseles, cargas). `vitrina`
  // dispara re-render; `vitrinaRef` es la fuente para cargarMas (solo refs).
  const [vitrina, setVitrina] = useState({})
  const vitrinaRef = useRef({})

  // Estado del infinite scroll
  const [cargasRestantes, setCargasRestantes] = useState(MAX_CARGAS)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [seccionesDinamicas, setSeccionesDinamicas] = useState([])

  const productosIniciales = todosProductos.slice(0, PRODUCTOS_POR_CARGA)
  const labSuperior = seccionesLab[0]
  const labInferior = seccionesLab[1]

  // ── Bloques del bento (config de vitrina con fallback a los defaults) ──
  const bloqueA = bentoDe(vitrina, 'home__bloque-a', {
    imagen: 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/quirofano.png',
    tamano: 'grande',
    posicionTexto: 'arriba',
    titulo: 'Insumos quirúrgicos para cada procedimiento',
    subtitulo: 'Todo el equipamiento que tu quirófano necesita',
    textoCta: 'Comprar ahora',
    link: '/hospitalaria',
  })
  const bloqueB = bentoDe(vitrina, 'home__bloque-b', {
    imagen: 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/medicamentos.png',
    tamano: 'mediano',
    posicionTexto: 'arriba',
    titulo: 'Tu línea de farmacia completa, en un solo lugar',
    subtitulo: 'Todo el catálogo de medicamentos para consumo masivo',
    textoCta: 'Ver línea farmacia',
    estiloCta: 'enlace',
    link: '/farmacia',
  })
  const bloqueC = bentoDe(vitrina, 'home__bloque-c', {
    imagen: 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/vervademecum.png',
    tamano: 'pequeno',
    titulo: 'Vademécum clínico al alcance',
    textoCta: 'Buscar molécula',
    link: '/vademecum',
  })
  const bloqueE = bentoDe(vitrina, 'home__bloque-e', {
    imagen: 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/ampolla.jpg',
    tamano: 'pequeno',
    variante: 'oferta',
    titulo: 'Cada producto con registro sanitario verificado',
    textoCta: 'Ver registro',
    estiloCta: 'enlace',
    link: '/registro-inhrr',
  })
  const bloqueD = bentoDe(vitrina, 'home__bloque-d', {
    imagen: 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/verpresupuesto.png',
    tamano: 'grande',
    posicionTexto: 'arriba',
    titulo: 'Sin llamadas ni esperas',
    textoCta: 'Generar presupuesto',
    link: '/presupuesto',
  })

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

    // Config de vitrina (hero, promos, cargas…) — se lee en el mount y se
    // guarda también en un ref para que cargarMas (useCallback sin deps)
    // pueda consultarla sin depender de re-renders.
    api
      .get('/vitrina')
      .then((res) => {
        const data = res.data && typeof res.data === 'object' ? res.data : {}
        vitrinaRef.current = data
        setVitrina(data)
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
  // Cada ronda = UNA entrada de la config de cargas (CARGAS_INFINITO como
  // fallback): carrusel simple + promo (mitad imagen / mitad carrusel) con
  // productos filtrados según el modo de la carga (categoria/laboratorio,
  // molecula o lista por ids) y seleccionados al azar por ronda.
  const cargarMas = useCallback(() => {
    // La config de la vitrina define las cargas (modo/valor) con fallback a
    // CARGAS_INFINITO cuando no hay config. Solo se leen refs (`vitrinaRef`)
    // para no meter la config en las deps del useCallback.
    const cargasConfig = vitrinaRef.current?.cargas?.cargas?.length
      ? vitrinaRef.current.cargas.cargas
      : CARGAS_INFINITO
    const maxCargas = cargasConfig.length
    if (cargasRef.current >= maxCargas) return
    cargandoMasRef.current = true
    setCargandoMas(true)

    const cargaIdx = cargasRef.current
    const carga = cargasConfig[cargaIdx]
    if (!carga) {
      cargandoMasRef.current = false
      setCargandoMas(false)
      return
    }

    const labVal = Array.isArray(carga.valor) ? carga.valor.join(',') : ''

    const resolver = (data) => {
      const lista = Array.isArray(data) ? data : (data.productos || [])
      const activos = lista.filter((p) => p.activo)
      if (activos.length === 0) {
        cargandoMasRef.current = false
        setCargandoMas(false)
        return
      }

      const seleccion = sampleAleatorio(activos, PRODUCTOS_POR_CARGA)
      const verTodoCategoria =
        carga.modo === 'molecula'
          ? `/catalogo?molecula=${encodeURIComponent(carga.valor[0])}`
          : carga.modo === 'lista'
            ? '/catalogo'
            : labVal
              ? `/catalogo?laboratorio=${encodeURIComponent(labVal)}${carga.categoria ? `&categoria=${encodeURIComponent(carga.categoria)}` : ''}`
              : carga.categoria
                ? `/catalogo?categoria=${encodeURIComponent(carga.categoria)}`
                : '/catalogo'
      const labPromo = carga.promo?.laboratorio
      const productosPromo = labPromo
        ? activos
            .filter((p) => p.laboratorio && p.laboratorio.toUpperCase().includes(labPromo.toUpperCase()))
            .slice(0, PRODUCTOS_POR_CARGA)
        : []
      const verTodoPromo = labPromo
        ? `${verTodoCategoria}&laboratorio=${encodeURIComponent(labPromo)}`
        : verTodoCategoria

      setSeccionesDinamicas((prev) => [
        ...prev,
        {
          id: `dinamica-${cargaIdx}-${Date.now()}`,
          titulo: carga.titulo,
          productos: seleccion,
          verTodoTo: verTodoCategoria,
          promo: carga.promo
            ? {
                imagen: carga.promo.imagen,
                alt: carga.promo.alt || '',
                linkImagen: verTodoPromo,
                tituloCarrusel: carga.promo.tituloCarrusel || 'Productos destacados',
                verTodoTo: verTodoPromo,
                productos: productosPromo,
              }
            : undefined,
        },
      ])
      cargasRef.current += 1
      setCargasRestantes(maxCargas - cargasRef.current)
      cargandoMasRef.current = false
      setCargandoMas(false)
    }

    // Clave de caché por modo+valor (el pool se cachea por sesión). Los
    // params vacíos/undefined se filtran para no mandar `laboratorio=...` de
    // más cuando la carga no trae valor (fallback a categoría sola).
    const paramsRaw =
      carga.modo === 'molecula'
        ? { molecula: carga.valor[0] }
        : carga.modo === 'lista'
          ? { ids: labVal }
          : { categoria: carga.categoria || undefined, laboratorio: labVal || undefined }
    const params = Object.fromEntries(Object.entries(paramsRaw).filter(([, v]) => v !== undefined && v !== ''))
    const claveCarga = `${carga.modo}:${JSON.stringify(params)}`

    const cacheado = cachéCategoriasRef.current.get(claveCarga)
    if (cacheado) {
      resolver(cacheado)
      return
    }

    api
      .get('/products', { params })
      .then((res) => {
        cachéCategoriasRef.current.set(claveCarga, res.data)
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
  }, [cargasRestantes, cargarMas, cargandoVitrina])

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="home">
      <div className="home__container">
      {/* ── Hero banner ── */}
      <section className="home__hero">
        <HeroCarrusel slides={vitrina.hero?.slides?.length ? vitrina.hero.slides : HERO_SLIDES} intervaloMs={5000} />
      </section>

      {/* ── Vitrina: carruseles fijos + ads ── */}
      <div className="home__vitrina">
        {/* ── Explorá por categoría (colocado justo tras el hero) ── */}
        <CategoriasCarrusel categorias={categoriasTienda.length ? categoriasTienda : undefined} />

        {seccionVisible(vitrina, 'ofertas') ? (
          <HomeCarrusel
            titulo={tituloSeccion(vitrina, 'ofertas', 'Ofertas destacadas')}
            subtitulo="Precios con descuento activo"
            productos={ofertas}
            tasaVes={tasa}
            verTodoTo="/catalogo"
            cargando={cargandoVitrina}
          />
        ) : null}

        {/* ── Bloques promocionales: grid tipo bento, pensado como 5 "pilares de marca" ──
          Orden de lectura (desktop, según grid-template-areas "a b b d" / "a c e d"):
            A → línea hospitalaria   B → línea farmacia   D → presupuesto/cotizaciones B2B
            C + E → vademécum + registro sanitario (confianza, en el "valle" entre A y D)
          Los 5 bloques tienen imagen propia; ninguno cae en modo placeholder. */}
      <section className="home__bloques-promocionales">
        {(vitrina.bento?.bloques?.some((b) => b.id === 'home__bloque-a' && b.visible === false)) ? null : (
          <BloquePromocional {...bloqueA} className="home__bloque-a" />
        )}
        {(vitrina.bento?.bloques?.some((b) => b.id === 'home__bloque-b' && b.visible === false)) ? null : (
          <BloquePromocional {...bloqueB} className="home__bloque-b" />
        )}
        {(vitrina.bento?.bloques?.some((b) => b.id === 'home__bloque-c' && b.visible === false)) ? null : (
          <BloquePromocional {...bloqueC} className="home__bloque-c" />
        )}
        {(vitrina.bento?.bloques?.some((b) => b.id === 'home__bloque-e' && b.visible === false)) ? null : (
          <BloquePromocional {...bloqueE} className="home__bloque-e" />
        )}
        {(vitrina.bento?.bloques?.some((b) => b.id === 'home__bloque-d' && b.visible === false)) ? null : (
          <BloquePromocional {...bloqueD} className="home__bloque-d" />
        )}
      </section>


{seccionVisible(vitrina, 'rollbacks') ? (
          <SeccionesCarrusel
            titulo={tituloSeccion(vitrina, 'rollbacks', 'Rollbacks y más')}
            secciones={secciones}
            cargando={cargandoVitrina}
          />
        ) : null}

        {/* ── Explorá por laboratorio (logos dinámicos, top labs) ── */}
        <LaboratoriosCarrusel laboratoriosTop={laboratoriosTienda.length ? laboratoriosTienda : undefined} />

        {/* ── Sección promocional: panel de campaña (solo imagen, sin texto)
          + carrusel del laboratorio destacado #1 (labSuperior) ── */}
        {vitrina.promos?.seccion1?.visible === false ? null : (
          <SeccionPromocional
            imagen={vitrina.promos?.seccion1?.imagen || 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/ads/letipromo.jpg'}
            alt={vitrina.promos?.seccion1?.alt || (labSuperior ? `Productos ${labSuperior.lab}` : 'Selección destacada')}
            linkImagen={labSuperior ? `/catalogo?laboratorio=${encodeURIComponent(labSuperior.lab)}` : '/catalogo'}
            productos={labSuperior ? labSuperior.productos : ofertas}
            tasaVes={tasa}
            tituloCarrusel={labSuperior ? `Productos ${labSuperior.lab}` : 'Más vendidos'}
            verTodoTo={labSuperior ? `/catalogo?laboratorio=${encodeURIComponent(labSuperior.lab)}` : '/catalogo'}
            cargando={cargandoVitrina}
          />
        )}

        {/* ── Sección promocional invertida: panel de campaña (solo imagen)
          + carrusel del laboratorio destacado #2 (labInferior) ── */}
        {vitrina.promos?.seccion2?.visible === false ? null : (
          <SeccionPromocional
            invertido
            imagen={vitrina.promos?.seccion2?.imagen || 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/ads/caloxpromo2.jpg'}
            alt={vitrina.promos?.seccion2?.alt || (labInferior ? `Productos ${labInferior.lab}` : 'Recomendados para ti')}
            linkImagen={labInferior ? `/catalogo?laboratorio=${encodeURIComponent(labInferior.lab)}` : '/catalogo'}
            productos={labInferior ? labInferior.productos : productosIniciales}
            tasaVes={tasa}
            tituloCarrusel={labInferior ? `Productos ${labInferior.lab}` : 'Recomendados para ti'}
            verTodoTo={labInferior ? `/catalogo?laboratorio=${encodeURIComponent(labInferior.lab)}` : '/catalogo'}
            cargando={cargandoVitrina}
          />
        )}


        <AdRotativo ads={(vitrina.promos?.rotativo?.length ? vitrina.promos.rotativo : ADS_ROTATIVO_TEMPORADA).filter((ad) => ad.visible !== false)} />

        {seccionVisible(vitrina, 'rollbacks2') ? (
          <SeccionesCarrusel
            titulo={tituloSeccion(vitrina, 'rollbacks2', 'Más rollbacks')}
            secciones={seccionesRollback2}
            cargando={cargandoVitrina}
          />
        ) : null}

        {seccionVisible(vitrina, 'recomendados') ? (
          <HomeCarrusel
            titulo={tituloSeccion(vitrina, 'recomendados', 'Recomendados para ti')}
            subtitulo="Seleccionados para tu clínica o farmacia"
            productos={productosIniciales}
            tasaVes={tasa}
            verTodoTo="/catalogo"
            cargando={cargandoVitrina}
          />
        ) : null}

        <div className="home__ads-pair">
          {(vitrina.promos?.adsPar?.length ? vitrina.promos.adsPar : ADS)
            .filter((ad) => ad.visible !== false)
            .filter((ad) => !esMobile || !ad.soloTabletDesktop)
            .map((ad) => (
              <AdCard key={ad.id} {...ad} />
            ))}
        </div>

        <CarruselCortos />

        <NoticiasTeaser />

        {/* ── Secciones dinámicas (cargadas por infinite scroll) ──
          Cada ronda = carrusel simple + promo (mitad imagen / mitad carrusel);
          el contenido y destino lo define la carga de la vitrina (ver
          cargarMas). ── */}
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
