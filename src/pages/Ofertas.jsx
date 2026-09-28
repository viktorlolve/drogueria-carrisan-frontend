import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Tabs } from '@chakra-ui/react'
import api from '../api/axios'
import HeroCarrusel from '../components/HeroCarrusel'
import OfertaCard from '../components/OfertaCard'
import ProductCardSkeleton from '../components/Productcardskeleton'
import SeccionesCarrusel from '../components/SeccionesCarrusel'
import BottomNav from '../components/BottomNav'
import './Ofertas.css'

const PRODUCTOS_POR_FILA_MOVIL = 2
const FILAS_GRID = 8
const LIMITE_GRID = PRODUCTOS_POR_FILA_MOVIL * FILAS_GRID // 16

// 🖼️ Espacio para las imágenes del hero — reemplaza este array por las
// tuyas cuando las tengas (o cárgalas desde un endpoint más adelante).
const HERO_SLIDES = []

function Ofertas() {
  const [productos, setProductos] = useState([])
  const [tasaVes, setTasaVes] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [orden, setOrden] = useState('todas') // 'todas' | 'descuento' | 'recientes' | 'vencer'

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true)
      setError('')
      try {
        const [resProductos, resTasa] = await Promise.all([
          api.get('/products'),
          api.get('/prices'),
        ])
        setProductos(resProductos.data)
        setTasaVes(resTasa.data.usd_a_ves)
      } catch (err) {
        setError('No se pudieron cargar las ofertas')
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargarDatos()
  }, [])

  const productosEnOferta = useMemo(
    () => productos.filter((p) => p.descuento_activo),
    [productos]
  )

  const productosOrdenados = useMemo(() => {
    const copia = [...productosEnOferta]
    switch (orden) {
      case 'descuento':
        return copia.sort((a, b) => {
          const ahorroA = (a.precio_original_usd || 0) - (a.precio_usd || 0)
          const ahorroB = (b.precio_original_usd || 0) - (b.precio_usd || 0)
          return ahorroB - ahorroA
        })
      case 'recientes':
        return copia.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      case 'vencer':
        return copia
          .filter((p) => p.descuento_activo?.fecha_fin)
          .sort((a, b) => new Date(a.descuento_activo.fecha_fin) - new Date(b.descuento_activo.fecha_fin))
      default:
        return copia
    }
  }, [productosEnOferta, orden])

  const enGrid = productosOrdenados.slice(0, LIMITE_GRID)
  const resto = productosOrdenados.slice(LIMITE_GRID)

  const seccionesResto = useMemo(() => {
    const mapa = new Map()
    for (const p of resto) {
      const clave = p.laboratorio || 'Más ofertas'
      if (!mapa.has(clave)) mapa.set(clave, [])
      mapa.get(clave).push(p)
    }
    return Array.from(mapa.entries())
      .filter(([, items]) => items.length >= 2)
      .map(([nombre, items]) => ({
        id: nombre,
        titulo: nombre,
        verTodoTo: `/catalogo?laboratorio=${encodeURIComponent(nombre)}`,
        productos: items,
      }))
  }, [resto])

  if (error) return <p className="ofertas-estado ofertas-error">{error}</p>

  return (
    <div className="ofertas-layout">
      <HeroCarrusel slides={HERO_SLIDES} />

      <header className="ofertas-header">
        <div className="header-titles">
          <h1>
            Ofertas <span>({cargando ? '—' : productosEnOferta.length} artículos)</span>
          </h1>
          <p className="header-subtitle">
            Los mejores precios de la semana, en un solo lugar.
          </p>
        </div>
      </header>

      <section className="ofertas-banner">
        <div className="ofertas-banner__texto">
          <span className="ofertas-banner__eyebrow">Ofertas Carrisan</span>
          <h2>Ahorra en cada pedido</h2>
          <p>Descuentos activos por producto, marca y laboratorio — actualizados constantemente.</p>
          <Link to="/catalogo" className="ofertas-banner__cta">Ver catálogo completo</Link>
        </div>
        <div className="ofertas-banner__grafico" aria-hidden="true">
          <span className="ofertas-banner__badge">%</span>
        </div>
      </section>

      <Tabs.Root
        value={orden}
        onValueChange={(e) => setOrden(e.value)}
        variant="line"
        colorPalette="blue"
        className="ofertas-tabs"
      >
        <Tabs.List>
          <Tabs.Trigger value="todas">Todas</Tabs.Trigger>
          <Tabs.Trigger value="descuento">Mayor descuento</Tabs.Trigger>
          <Tabs.Trigger value="recientes">Recién agregadas</Tabs.Trigger>
          <Tabs.Trigger value="vencer">Por vencer</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <main className="ofertas-main">
        {cargando ? (
          <div className="oferta-grid">
            {Array.from({ length: 16 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : productosOrdenados.length === 0 ? (
          <div className="ofertas-vacio">
            <span className="ofertas-vacio__icono">🏷️</span>
            <h3>Todavía no hay ofertas activas</h3>
            <p>En cuanto activemos descuentos, van a aparecer aquí automáticamente.</p>
            <Link to="/catalogo" className="ofertas-vacio__cta">Ir al catálogo</Link>
          </div>
        ) : (
          <div className="oferta-grid">
            {enGrid.map((producto) => (
              <OfertaCard key={producto.id} producto={producto} tasaVes={tasaVes} />
            ))}
          </div>
        )}
      </main>

      {!cargando && seccionesResto.length > 0 && (
        <SeccionesCarrusel
          titulo="Más ofertas por marca"
          secciones={seccionesResto}
        />
      )}

      <BottomNav />
    </div>
  )
}

export default Ofertas
