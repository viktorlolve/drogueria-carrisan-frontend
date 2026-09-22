import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Minus, X, ShoppingCart, FileDown, RefreshCw, ArrowUp, ArrowDown,
} from 'lucide-react'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
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
    } finally {
      setRecotizando(false)
    }
  }

  async function exportarPDF() {
    if (!detalle) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    // Encabezado corporativo
    doc.setFillColor(0, 82, 220)
    doc.rect(0, 0, 210, 26, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('Droguería Carrisán', 14, 13)
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Presupuesto #${detalle.numero}`, 14, 21)

    doc.setTextColor(26, 26, 58)
    doc.setFontSize(9)
    doc.text(`Emitido: ${new Date(detalle.fecha_creacion).toLocaleString('es-VE')}`, 14, 34)
    doc.text(`Válido hasta: ${new Date(detalle.fecha_expiracion).toLocaleString('es-VE')}`, 14, 40)

    let y = 52
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('Producto', 14, y)
    doc.text('Cant.', 122, y)
    doc.text('Precio', 148, y)
    doc.text('Subtotal', 175, y)
    y += 3
    doc.setDrawColor(220, 220, 220)
    doc.line(14, y, 196, y)
    y += 6
    doc.setFont(undefined, 'normal')

    const disponibles = detalle.items.filter((i) => i.disponible)
    const noDisponibles = detalle.items.filter((i) => !i.disponible)

    disponibles.forEach((item) => {
      if (y > 270) { doc.addPage(); y = 20 }
      const lineasNombre = doc.splitTextToSize(item.nombre_comercial, 100)
      doc.text(lineasNombre, 14, y)
      doc.text(String(item.cantidad), 122, y)
      doc.text(`$${formatUSD(item.precio_unitario)}`, 148, y)
      doc.text(`$${formatUSD(item.subtotal)}`, 175, y)
      y += Math.max(6, lineasNombre.length * 5)
    })

    if (noDisponibles.length > 0) {
      y += 4
      doc.setFontSize(8)
      doc.setTextColor(140, 140, 140)
      doc.text('No disponibles (excluidos del total):', 14, y)
      y += 5
      noDisponibles.forEach((item) => {
        if (y > 270) { doc.addPage(); y = 20 }
        const lineasNombre = doc.splitTextToSize(`${item.nombre_comercial} — Cant. ${item.cantidad}`, 175)
        doc.text(lineasNombre, 14, y)
        y += Math.max(5, lineasNombre.length * 5)
      })
      doc.setTextColor(26, 26, 58)
    }

    y += 6
    doc.setDrawColor(220, 220, 220)
    doc.line(122, y, 196, y)
    y += 7
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    const totalDisponible = disponibles.reduce((acc, i) => acc + i.subtotal, 0)
    doc.text('Total', 148, y)
    doc.text(`$${formatUSD(totalDisponible)}`, 175, y)

    doc.save(`presupuesto-${detalle.numero}.pdf`)
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

  return (
    <div className="pres-modal-overlay" onClick={onClose}>
      <div className="pres-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pres-modal__header">
          <div>
            <h2>Presupuesto #{detalle.numero}</h2>
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
// Página principal: buscador para armar el borrador, listado
// acumulado con cantidades, botón de cierre, e historial recurrente
// de presupuestos ya generados.
// ---------------------------------------------------------------
function Presupuesto() {
  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [borrador, setBorrador] = useState([])
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [creando, setCreando] = useState(false)
  const [modalId, setModalId] = useState(null)

  useEffect(() => {
    cargarHistorial()
  }, [])

  useEffect(() => {
    if (query.trim().length < 1) {
      return
    }
    const debounce = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await api.get(`/products?search=${encodeURIComponent(query.trim())}&limit=8`)
        setSugerencias(data)
      } catch (err) {
        console.error('Error buscando productos', err)
      } finally {
        setBuscando(false)
      }
    }, 250)
    return () => clearTimeout(debounce)
  }, [query])

  const sugerenciasVisibles = query.trim().length < 1 ? [] : sugerencias

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

  function agregarAlBorrador(producto) {
    setBorrador((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id)
      if (existente) {
        return prev.map((i) => (i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      return [...prev, { producto, cantidad: 1 }]
    })
    setQuery('')
    setSugerencias([])
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

  const subtotalBorrador = borrador.reduce((acc, i) => acc + Number(i.producto.precio_usd) * i.cantidad, 0)

  async function cerrarPresupuesto() {
    if (borrador.length === 0) return
    setCreando(true)
    try {
      const items = borrador.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad }))
      const { data } = await api.post('/presupuestos', { items })
      setBorrador([])
      cargarHistorial()
      setModalId(data.id)
    } catch (err) {
      console.error('Error al crear presupuesto', err)
    } finally {
      setCreando(false)
    }
  }

  return (
    <LayoutPaginaPrincipal
      activo="presupuesto"
      titulo="Presupuesto"
      subtitulo="Arma tu listado y genera un presupuesto con precio fijo por 24 horas"
      nav={NAV_UNIFICADO}
    >
      <div className="pres-page">
        <div className="pres-buscador">
          <div className="pres-buscador__input-wrap">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar producto para agregar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
                  <button key={p.id} type="button" className="pres-buscador__item" onClick={() => agregarAlBorrador(p)}>
                    <ProductoImagen src={p.foto_url} alt={p.nombre_comercial} />
                    <span className="pres-buscador__nombre">{p.nombre_comercial}</span>
                    <span className="pres-buscador__precio">${formatUSD(p.precio_usd)}</span>
                    <Plus size={16} />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {borrador.length > 0 && (
          <div className="pres-borrador">
            <h2>Tu listado</h2>
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
                <span className="pres-borrador__subtotal">${formatUSD(i.producto.precio_usd * i.cantidad)}</span>
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

            <div className="pres-borrador__footer">
              <span className="pres-borrador__total">Total: ${formatUSD(subtotalBorrador)}</span>
              <button type="button" className="pres-borrador__cerrar-btn" onClick={cerrarPresupuesto} disabled={creando}>
                {creando ? 'Generando...' : 'Cerrar presupuesto'}
              </button>
            </div>
          </div>
        )}

        <div className="pres-historial">
          <h2>Tus presupuestos</h2>

          {cargandoHistorial ? (
            <div className="pres-loading">Cargando tus presupuestos...</div>
          ) : historial.length === 0 ? (
            <div className="pres-vacio">
              <p>Todavía no has generado ningún presupuesto. Busca productos arriba para armar el primero.</p>
            </div>
          ) : (
            <div className="pres-historial__lista">
              {historial.map((p) => {
                const vencido = new Date(p.fecha_expiracion) <= new Date()
                return (
                  <button key={p.id} type="button" className="pres-historial__card" onClick={() => setModalId(p.id)}>
                    <div className="pres-historial__info">
                      <span className="pres-historial__numero">Presupuesto #{p.numero}</span>
                      <span className={`pres-historial__estado ${vencido ? 'pres-historial__estado--vencido' : 'pres-historial__estado--vigente'}`}>
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