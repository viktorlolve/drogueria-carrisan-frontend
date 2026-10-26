import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, Minus, X, ShoppingCart, ArrowLeft, Filter, ChevronDown,
} from 'lucide-react'
import api from '../api/axios'
import { toaster } from '../components/ui/toaster'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import { ProductoImagen } from '../components/icons/ProductoImagen'
import './PresupuestoCrear.css'

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PresupuestoCrear() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [borrador, setBorrador] = useState([])
  const [creando, setCreando] = useState(false)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [filtroLaboratorio, setFiltroLaboratorio] = useState('')
  const [filtroForma, setFiltroForma] = useState('')

  useEffect(() => {
    const termino = query.trim()
    if (termino.length < 1) {
      setSugerencias([])
      return undefined
    }

    let activo = true
    const debounce = setTimeout(() => {
      setBuscando(true)
      api.get(`/products/buscar?q=${encodeURIComponent(termino)}&limit=30`)
        .then(({ data }) => {
          if (!activo) return
          setSugerencias(data || [])
          setBuscando(false)
        })
        .catch((err) => {
          console.error('Error buscando productos', err)
          if (!activo) return
          setSugerencias([])
          setBuscando(false)
        })
    }, 250)

    return () => {
      activo = false
      clearTimeout(debounce)
    }
  }, [query])

  const laboratoriosDisponibles = useMemo(() => {
    const set = new Set()
    sugerencias.forEach((p) => {
      if (p.laboratorio) set.add(p.laboratorio)
    })
    return Array.from(set).sort()
  }, [sugerencias])

  const formasDisponibles = useMemo(() => {
    const set = new Set()
    sugerencias.forEach((p) => {
      if (p.forma) set.add(p.forma)
    })
    return Array.from(set).sort()
  }, [sugerencias])

  const sugerenciasFiltradas = useMemo(() => {
    return sugerencias.filter((p) => {
      const cumpleLab = !filtroLaboratorio || p.laboratorio === filtroLaboratorio
      const cumpleForma = !filtroForma || p.forma === filtroForma
      return cumpleLab && cumpleForma
    })
  }, [sugerencias, filtroLaboratorio, filtroForma])

  const sugerenciasVisibles = query.trim().length < 1 ? [] : sugerenciasFiltradas

  function agregarAlBorrador(producto) {
    if (producto.precio_usd == null) return
    setBorrador((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id)
      if (existente) {
        return prev.map((i) => (i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  function alTeclar(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const primero = sugerenciasVisibles.find((p) => p.precio_usd != null)
    if (primero) agregarAlBorrador(primero)
  }

  function cambiarCantidad(productoId, delta) {
    setBorrador((prev) =>
      prev
        .map((i) => (i.producto.id === productoId ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0)
    )
  }

  function quitarDelBorrador(productoId) {
    setBorrador((prev) => prev.filter((i) => i.producto.id !== productoId))
  }

  function limpiarFiltros() {
    setFiltroLaboratorio('')
    setFiltroForma('')
  }

  const subtotalBorrador = borrador.reduce(
    (acc, i) => acc + Number(i.producto.precio_usd ?? 0) * i.cantidad,
    0
  )

  async function crearPresupuesto() {
    const items = borrador.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad }))
    if (items.length === 0) return

    setCreando(true)
    try {
      const { data } = await api.post('/presupuestos', { items })
      toaster.create({ title: `Presupuesto #${data.numero} generado`, type: 'success' })
      navigate(`/presupuesto?ver=${data.id}`)
    } catch (err) {
      console.error('Error al crear presupuesto', err)
      toaster.create({
        title: err.response?.data?.error || 'No se pudo crear el presupuesto',
        type: 'error',
      })
    } finally {
      setCreando(false)
    }
  }

  function volver() {
    if (borrador.length > 0 && !window.confirm('Tienes productos en el listado. ¿Quieres salir sin guardar?')) {
      return
    }
    navigate('/presupuesto')
  }

  return (
    <LayoutPaginaPrincipal
      activo="presupuesto"
      titulo="Crear presupuesto"
      subtitulo="Busca productos, agrega cantidades y genera tu presupuesto con precio fijo por 24 horas"
      nav={NAV_UNIFICADO}
    >
      <div className="presc-page">
        <div className="presc-header">
          <button type="button" className="presc-back" onClick={volver}>
            <ArrowLeft size={18} />
            Volver a mis presupuestos
          </button>
        </div>

        <div className="presc-grid">
          <section className="presc-col presc-col--search">
            <div className="presc-card">
              <div className="presc-card__header">
                <h2>Buscar productos</h2>
                <button
                  type="button"
                  className={`presc-filtros-toggle ${mostrarFiltros ? 'presc-filtros-toggle--activo' : ''}`}
                  onClick={() => setMostrarFiltros((v) => !v)}
                >
                  <Filter size={16} />
                  Filtros
                  <ChevronDown size={16} className={`presc-filtros-chevron ${mostrarFiltros ? 'presc-filtros-chevron--abierto' : ''}`} />
                </button>
              </div>

              <div className="presc-buscador">
                <div className="presc-buscador__input-wrap">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, laboratorio o principio activo..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={alTeclar}
                    autoFocus
                  />
                </div>
              </div>

              {mostrarFiltros && (
                <div className="presc-filtros">
                  <div className="presc-filtro">
                    <label>Laboratorio</label>
                    <select value={filtroLaboratorio} onChange={(e) => setFiltroLaboratorio(e.target.value)}>
                      <option value="">Todos</option>
                      {laboratoriosDisponibles.map((lab) => (
                        <option key={lab} value={lab}>
                          {lab}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="presc-filtro">
                    <label>Forma farmacéutica</label>
                    <select value={filtroForma} onChange={(e) => setFiltroForma(e.target.value)}>
                      <option value="">Todas</option>
                      {formasDisponibles.map((forma) => (
                        <option key={forma} value={forma}>
                          {forma}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(filtroLaboratorio || filtroForma) && (
                    <button type="button" className="presc-filtros-limpiar" onClick={limpiarFiltros}>
                      Limpiar filtros
                    </button>
                  )}
                </div>
              )}

              <div className="presc-resultados">
                {query.trim().length < 1 ? (
                  <div className="presc-resultados__vacio">
                    <Search size={22} />
                    <p>Empieza a escribir para buscar productos</p>
                    <span>Escribe al menos una letra para ver resultados</span>
                  </div>
                ) : buscando ? (
                  <div className="presc-resultados__vacio">
                    <p>Buscando productos...</p>
                  </div>
                ) : sugerenciasVisibles.length === 0 ? (
                  <div className="presc-resultados__vacio">
                    <p>Sin resultados para "{query}"</p>
                    <span>Prueba con otro término o ajusta los filtros</span>
                  </div>
                ) : (
                  <div className="presc-lista">
                    {sugerenciasVisibles.map((p) => (
                      <div key={p.id} className="presc-item">
                        <ProductoImagen src={p.foto_url} alt={p.nombre_comercial} />
                        <div className="presc-item__info">
                          <p className="presc-item__nombre">{p.nombre_comercial}</p>
                          <p className="presc-item__meta">
                            {p.laboratorio && <span>{p.laboratorio}</span>}
                            {p.laboratorio && p.forma && <span className="presc-item__punto">·</span>}
                            {p.forma && <span>{p.forma}</span>}
                          </p>
                        </div>
                        <div className="presc-item__acciones">
                          {p.precio_usd != null ? (
                            <>
                              <span className="presc-item__precio">${formatUSD(p.precio_usd)}</span>
                              <button
                                type="button"
                                className="presc-item__agregar"
                                onClick={() => agregarAlBorrador(p)}
                                aria-label={`Agregar ${p.nombre_comercial}`}
                              >
                                <Plus size={16} />
                                Agregar
                              </button>
                            </>
                          ) : (
                            <span className="presc-item__sin-precio">Sin precio</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="presc-col presc-col--cart">
            <div className="presc-card presc-card--sticky">
              <div className="presc-card__header">
                <h2>
                  Mi presupuesto
                  {borrador.length > 0 && <span className="presc-contador">{borrador.length}</span>}
                </h2>
              </div>

              <div className="presc-cart">
                {borrador.length === 0 ? (
                  <div className="presc-cart__vacio">
                    <ShoppingCart size={26} />
                    <p>Tu presupuesto está vacío</p>
                    <span>Busca y agrega productos desde la columna izquierda</span>
                  </div>
                ) : (
                  <div className="presc-cart__lista">
                    {borrador.map((i) => (
                      <div key={i.producto.id} className="presc-cart__item">
                        <ProductoImagen src={i.producto.foto_url} alt={i.producto.nombre_comercial} />
                        <div className="presc-cart__info">
                          <p className="presc-cart__nombre">{i.producto.nombre_comercial}</p>
                          <p className="presc-cart__precio">${formatUSD(i.producto.precio_usd)} c/u</p>
                          <div className="presc-cart__row">
                            <div className="presc-stepper">
                              <button type="button" onClick={() => cambiarCantidad(i.producto.id, -1)} aria-label="Restar">
                                <Minus size={14} />
                              </button>
                              <span>{i.cantidad}</span>
                              <button type="button" onClick={() => cambiarCantidad(i.producto.id, 1)} aria-label="Sumar">
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="presc-cart__subtotal">
                              ${formatUSD(Number(i.producto.precio_usd ?? 0) * i.cantidad)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="presc-cart__quitar"
                          onClick={() => quitarDelBorrador(i.producto.id)}
                          aria-label="Quitar del presupuesto"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="presc-cart__footer">
                <div className="presc-cart__total">
                  <span>Total</span>
                  <span>${formatUSD(subtotalBorrador)}</span>
                </div>
                <p className="presc-cart__nota">Los precios se mantienen fijos por 24 horas al generar el presupuesto</p>
                <button
                  type="button"
                  className="presc-cart__generar"
                  onClick={crearPresupuesto}
                  disabled={borrador.length === 0 || creando}
                >
                  {creando ? 'Generando...' : 'Generar presupuesto'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </LayoutPaginaPrincipal>
  )
}

export default PresupuestoCrear
