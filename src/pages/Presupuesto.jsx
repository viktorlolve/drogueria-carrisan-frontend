import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Minus, X, ShoppingCart, FileDown, RefreshCw, ArrowUp, ArrowDown, Calendar,
} from 'lucide-react'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
import { toaster } from '../components/ui/toaster'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import { ProductoImagen } from '../components/icons/ProductoImagen'
import './Presupuesto.css'

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function tiempoRestante(fechaExpiracion) {
  const ms = new Date(fechaExpiracion) - new Date()
  if (ms <= 0) return null
  const horas = Math.floor(ms / (1000 * 60 * 60))
  const minutos = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${horas}h ${minutos}m`
}

const HORA = new Intl.DateTimeFormat('es', { hour: 'numeric', minute: '2-digit' })
const DIA_MES = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })
const FECHA_LARGA = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' })

// "Hoy, 9:42 a.m." / "Ayer, 4:05 p.m." / "12 oct" (con año si es otro año).
function formatFechaCorta(iso) {
  if (!iso) return ''
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''

  const ahora = new Date()
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()
  const momento = fecha.getTime()

  if (momento >= inicioHoy) return `Hoy, ${HORA.format(fecha)}`
  if (momento >= inicioHoy - 24 * 60 * 60 * 1000) return `Ayer, ${HORA.format(fecha)}`

  const partes = [DIA_MES.format(fecha)]
  if (fecha.getFullYear() !== ahora.getFullYear()) partes.push(fecha.getFullYear())
  return partes.join(' ')
}

// Versión completa para el title (tooltip) de la tarjeta.
function fechaTitulo(iso) {
  if (!iso) return undefined
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return undefined
  return `${FECHA_LARGA.format(fecha)}, ${HORA.format(fecha)}`
}

// Flechita de subida/bajada/igual — solo aparece cuando hay un
// presupuesto anterior contra el cual comparar (recotizaciones).
function IndicadorPrecio({ cambio }) {
  if (cambio === 'subio') {
    return <span className="pres-indicador pres-indicador--subio"><ArrowUp size={12} strokeWidth={3} /> subió</span>
  }
  if (cambio === 'bajo') {
    return <span className="pres-indicador pres-indicador--bajo"><ArrowDown size={12} strokeWidth={3} /> bajó</span>
  }
  if (cambio === 'igual') {
    return <span className="pres-indicador pres-indicador--igual">= igual</span>
  }
  return null
}

// ---------------------------------------------------------------
// Modal de creación rápida: buscador + listado con cantidades.
// Es el mismo flujo que antes vivía en la página, movido aquí para
// que la página sea solo el historial. Los productos sin precio se
// muestran pero NO se pueden agregar (el presupuesto guardaría un
// snapshot de $0).
// ---------------------------------------------------------------
function NuevoPresupuestoModal({ onClose, onCreado }) {
  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [borrador, setBorrador] = useState([])
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    const termino = query.trim()
    if (termino.length < 1) return undefined

    let activo = true
    const debounce = setTimeout(() => {
      setBuscando(true)
      api.get(`/products/buscar?q=${encodeURIComponent(termino)}&limit=8`)
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

  const sugerenciasVisibles = query.trim().length < 1 ? [] : sugerencias

  function agregarAlBorrador(producto) {
    if (producto.precio_usd == null) return
    setBorrador((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id)
      if (existente) {
        return prev.map((i) => (i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      return [...prev, { producto, cantidad: 1 }]
    })
    setQuery('')
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

  const subtotalBorrador = borrador.reduce(
    (acc, i) => acc + Number(i.producto.precio_usd ?? 0) * i.cantidad,
    0
  )

  function cerrar() {
    if (borrador.length > 0 && !window.confirm('Tienes productos en el listado. ¿Quieres descartarlos?')) {
      return
    }
    onClose()
  }

  async function crearPresupuesto() {
    const items = borrador.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad }))
    if (items.length === 0) return

    setCreando(true)
    try {
      const { data } = await api.post('/presupuestos', { items })
      toaster.create({ title: `Presupuesto #${data.numero} generado`, type: 'success' })
      onCreado(data.id)
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

  return (
    <div className="pres-modal-overlay" onClick={cerrar}>
      <div className="pres-modal pres-modal--nuevo" onClick={(e) => e.stopPropagation()}>
        <div className="pres-modal__header">
          <div>
            <h2>Nuevo presupuesto</h2>
            <p className="pres-modal__subtitulo">Agrega productos y bloquea sus precios por 24 horas</p>
          </div>
          <button type="button" className="pres-modal__cerrar" onClick={cerrar} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="pres-buscador pres-buscador--modal">
          <div className="pres-buscador__input-wrap">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar producto para agregar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={alTeclar}
            />
          </div>

          {query.trim() && (
            <div className="pres-buscador__resultados">
              {buscando ? (
                <div className="pres-buscador__mensaje">Buscando...</div>
              ) : sugerenciasVisibles.length === 0 ? (
                <div className="pres-buscador__mensaje">Sin resultados para "{query}"</div>
              ) : (
                sugerenciasVisibles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="pres-buscador__item"
                    onClick={() => agregarAlBorrador(p)}
                    disabled={p.precio_usd == null}
                    title={p.precio_usd == null ? 'Este producto todavía no tiene precio' : undefined}
                  >
                    <ProductoImagen src={p.foto_url} alt={p.nombre_comercial} />
                    <span className="pres-buscador__nombre">{p.nombre_comercial}</span>
                    {p.precio_usd != null ? (
                      <span className="pres-buscador__precio">${formatUSD(p.precio_usd)}</span>
                    ) : (
                      <span className="pres-buscador__sin-precio">Sin precio</span>
                    )}
                    {p.precio_usd != null && <Plus size={16} />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="pres-modal__body">
          {borrador.length === 0 ? (
            <div className="pres-nuevo__vacio">
              <ShoppingCart size={26} />
              <p>Busca productos arriba para armar tu listado.</p>
            </div>
          ) : (
            <div className="pres-borrador">
              {borrador.map((i) => (
                <div key={i.producto.id} className="pres-borrador__item">
                  <ProductoImagen src={i.producto.foto_url} alt={i.producto.nombre_comercial} />
                  <div className="pres-borrador__info">
                    <p className="pres-borrador__nombre">{i.producto.nombre_comercial}</p>
                    <p className="pres-borrador__precio">${formatUSD(i.producto.precio_usd)} c/u</p>
                  </div>
                  <div className="pres-borrador__stepper">
                    <button type="button" onClick={() => cambiarCantidad(i.producto.id, -1)} aria-label="Restar">
                      <Minus size={14} />
                    </button>
                    <span>{i.cantidad}</span>
                    <button type="button" onClick={() => cambiarCantidad(i.producto.id, 1)} aria-label="Sumar">
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="pres-borrador__subtotal">
                    ${formatUSD(Number(i.producto.precio_usd ?? 0) * i.cantidad)}
                  </span>
                  <button
                    type="button"
                    className="pres-borrador__quitar"
                    onClick={() => quitarDelBorrador(i.producto.id)}
                    aria-label="Quitar del listado"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pres-modal__footer pres-nuevo__footer">
          <div className="pres-modal__total">
            <span>
              {borrador.length} {borrador.length === 1 ? 'producto' : 'productos'}
            </span>
            <span>${formatUSD(subtotalBorrador)}</span>
          </div>
          <button
            type="button"
            className="pres-nuevo__crear"
            onClick={crearPresupuesto}
            disabled={borrador.length === 0 || creando}
          >
            {creando ? 'Generando...' : 'Generar presupuesto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Modal de detalle de un presupuesto: agregar al carrito (todos los
// seleccionados o individual por línea), exportar PDF corporativo
// (sin flechitas de precio — esas son solo UI web), y recotizar
// cuando ya venció.
// ---------------------------------------------------------------
function PresupuestoModal({ presupuestoId, onClose, onRecotizado }) {
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [agregados, setAgregados] = useState(new Set())
  const [recotizando, setRecotizando] = useState(false)
  const { addItem } = useCart()

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get(`/presupuestos/${presupuestoId}`)
      setDetalle(data)
      setSeleccionados(new Set(data.items.filter((i) => i.disponible).map((i) => i.id)))
      setAgregados(new Set())
    } catch (err) {
      console.error('Error al cargar presupuesto', err)
    } finally {
      setCargando(false)
    }
  }, [presupuestoId])

  useEffect(() => {
    async function iniciar() {
      await cargar()
    }
    iniciar()
  }, [cargar])

  function toggleSeleccion(itemId) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function agregarItem(item) {
    if (!item.disponible) return
    addItem(
      {
        id: item.producto_id,
        nombre_comercial: item.nombre_comercial,
        foto_url: item.foto_url,
        precio_usd: item.precio_unitario,
        disponible: item.disponible,
      },
      item.cantidad
    )
    setAgregados((prev) => new Set(prev).add(item.id))
  }

  function agregarSeleccionados() {
    detalle.items
      .filter((i) => i.disponible && seleccionados.has(i.id) && !agregados.has(i.id))
      .forEach(agregarItem)
  }

  async function recotizar() {
    setRecotizando(true)
    try {
      const { data } = await api.post(`/presupuestos/${presupuestoId}/recotizar`)
      onRecotizado(data.id)
    } catch (err) {
      console.error('Error al recotizar presupuesto', err)
      toaster.create({ title: 'No se pudo cotizar de nuevo', type: 'error' })
    } finally {
      setRecotizando(false)
    }
  }

  async function exportarPDF() {
    if (!detalle) return
    const { default: generarPresupuestoPDF } = await import('../utils/generarPresupuestoPDF')
    await generarPresupuestoPDF({ detalle })
  }

  if (cargando || !detalle) {
    return (
      <div className="pres-modal-overlay" onClick={onClose}>
        <div className="pres-modal" onClick={(e) => e.stopPropagation()}>
          <div className="pres-modal__loading">Cargando presupuesto...</div>
        </div>
      </div>
    )
  }

  const hayDisponibles = detalle.items.some((i) => i.disponible)
  const restante = !detalle.vencido ? tiempoRestante(detalle.fecha_expiracion) : null
  const totalActual = detalle.items.filter((i) => i.disponible).reduce((acc, i) => acc + i.subtotal, 0)
  const creadoEn = fechaTitulo(detalle.fecha_creacion)

  return (
    <div className="pres-modal-overlay" onClick={onClose}>
      <div className="pres-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pres-modal__header">
          <div>
            <h2>Presupuesto #{detalle.numero}</h2>
            {creadoEn && (
              <p className="pres-modal__subtitulo">Creado el {creadoEn}</p>
            )}
            {detalle.vencido ? (
              <span className="pres-modal__estado pres-modal__estado--vencido">Vencido</span>
            ) : (
              <span className="pres-modal__estado pres-modal__estado--vigente">Vence en {restante}</span>
            )}
          </div>
          <button type="button" className="pres-modal__cerrar" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="pres-modal__body">
          {detalle.items.map((item) => (
            <div key={item.id} className={`pres-modal__item ${!item.disponible ? 'pres-modal__item--bloqueado' : ''}`}>
              {!detalle.vencido && item.disponible && (
                <input
                  type="checkbox"
                  checked={seleccionados.has(item.id)}
                  onChange={() => toggleSeleccion(item.id)}
                  className="pres-modal__check"
                  aria-label={`Seleccionar ${item.nombre_comercial}`}
                />
              )}

              <ProductoImagen src={item.foto_url} alt={item.nombre_comercial} className="pres-modal__item-img" />

              <div className="pres-modal__item-info">
                <p className="pres-modal__item-nombre">{item.nombre_comercial}</p>
                <p className="pres-modal__item-detalle">
                  {item.cantidad} × ${formatUSD(item.precio_unitario)}
                  <IndicadorPrecio cambio={item.cambio_precio} />
                </p>
                {!item.disponible && <span className="pres-modal__no-disponible">No disponible</span>}
              </div>

              <span className="pres-modal__item-subtotal">${formatUSD(item.subtotal)}</span>

              {!detalle.vencido && (
                <button
                  type="button"
                  className="pres-modal__item-agregar"
                  onClick={() => agregarItem(item)}
                  disabled={!item.disponible || agregados.has(item.id)}
                  aria-label={`Agregar ${item.nombre_comercial} al carrito`}
                >
                  {agregados.has(item.id) ? '✓' : <ShoppingCart size={15} />}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="pres-modal__footer">
          <div className="pres-modal__total">
            <span>Total</span>
            <span>${formatUSD(totalActual)}</span>
          </div>

          <div className="pres-modal__acciones">
            <button type="button" className="pres-modal__btn pres-modal__btn--outline" onClick={exportarPDF}>
              <FileDown size={16} /> Exportar PDF
            </button>

            {detalle.vencido ? (
              <button
                type="button"
                className="pres-modal__btn pres-modal__btn--primario"
                onClick={recotizar}
                disabled={recotizando}
              >
                <RefreshCw size={16} /> {recotizando ? 'Cotizando...' : 'Cotizar de nuevo'}
              </button>
            ) : (
              <button
                type="button"
                className="pres-modal__btn pres-modal__btn--primario"
                onClick={agregarSeleccionados}
                disabled={!hayDisponibles || seleccionados.size === 0}
              >
                <ShoppingCart size={16} /> Agregar todos al carrito
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Página principal: solo el historial de presupuestos, con un CTA
// que abre el modal de creación rápida.
// ---------------------------------------------------------------
function Presupuesto() {
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [modalId, setModalId] = useState(null)
  const [creandoNuevo, setCreandoNuevo] = useState(false)

  useEffect(() => {
    cargarHistorial()
  }, [])

  async function cargarHistorial() {
    setCargandoHistorial(true)
    try {
      const { data } = await api.get('/presupuestos/mios')
      setHistorial(data)
    } catch (err) {
      console.error('Error al cargar historial de presupuestos', err)
    } finally {
      setCargandoHistorial(false)
    }
  }

  function abrirCreacion() {
    setCreandoNuevo(true)
  }

  return (
    <LayoutPaginaPrincipal
      activo="presupuesto"
      titulo="Presupuesto"
      subtitulo="Genera un presupuesto con precio fijo por 24 horas"
      nav={NAV_UNIFICADO}
    >
      <div className="pres-page">
        <div className="pres-cta">
          <div className="pres-cta__texto">
            <h2>Genera un presupuesto en minutos</h2>
            <p>Arma tu lista de productos y podras agregarlo al carrito cuando quieras.</p>
          </div>
          <button type="button" className="pres-cta__btn" onClick={abrirCreacion}>
            <Plus size={18} /> Crear presupuesto
          </button>
        </div>

        <div className="pres-historial">
          <h2>
            Tus presupuestos
            {historial.length > 0 && <span className="pres-historial__conteo">{historial.length}</span>}
          </h2>

          {cargandoHistorial ? (
            <div className="pres-loading">Cargando tus presupuestos...</div>
          ) : historial.length === 0 ? (
            <div className="pres-vacio">
              <p>Todavía no has generado ningún presupuesto.</p>
              <button type="button" className="pres-vacio__btn" onClick={abrirCreacion}>
                <Plus size={16} /> Crear el primero
              </button>
            </div>
          ) : (
            <div className="pres-historial__lista">
              {historial.map((p) => {
                const vencido = new Date(p.fecha_expiracion) <= new Date()
                const items = p.cantidad_items ?? 0
                const unidades = p.unidades ?? 0

                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`pres-historial__card ${vencido ? 'pres-historial__card--vencido' : 'pres-historial__card--vigente'}`}
                    onClick={() => setModalId(p.id)}
                    title={fechaTitulo(p.fecha_creacion)}
                  >
                    <div className="pres-historial__info">
                      <span className="pres-historial__numero">Presupuesto #{p.numero}</span>
                      <span className="pres-historial__meta">
                        <Calendar size={12} />
                        {formatFechaCorta(p.fecha_creacion)}
                        <span className="pres-historial__punto">·</span>
                        {items} {items === 1 ? 'producto' : 'productos'}
                        {unidades > items && ` · ${unidades} und.`}
                      </span>
                      <span
                        className={`pres-historial__estado ${vencido ? 'pres-historial__estado--vencido' : 'pres-historial__estado--vigente'}`}
                      >
                        {vencido ? 'Vencido' : `Vence en ${tiempoRestante(p.fecha_expiracion)}`}
                      </span>
                    </div>
                    <span className="pres-historial__total">${formatUSD(p.total_usd)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {creandoNuevo && (
        <NuevoPresupuestoModal
          onClose={() => setCreandoNuevo(false)}
          onCreado={(nuevoId) => {
            setCreandoNuevo(false)
            cargarHistorial()
            setModalId(nuevoId)
          }}
        />
      )}

      {modalId && (
        <PresupuestoModal
          presupuestoId={modalId}
          onClose={() => setModalId(null)}
          onRecotizado={(nuevoId) => {
            setModalId(nuevoId)
            cargarHistorial()
          }}
        />
      )}
    </LayoutPaginaPrincipal>
  )
}

export default Presupuesto
