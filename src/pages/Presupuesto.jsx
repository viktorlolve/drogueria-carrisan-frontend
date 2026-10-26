import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, X, ShoppingCart, FileDown, RefreshCw, ArrowUp, ArrowDown, Calendar,
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
// Página principal: historial de presupuestos + CTA que lleva a la
// página dedicada de creación (`/presupuesto/crear`). El detalle de
// cada presupuesto se abre en un modal.
// ---------------------------------------------------------------
function Presupuesto() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [modalIdManual, setModalIdManual] = useState(null)

  // La URL manda: al crear un presupuesto se navega a
  // `/presupuesto?ver=<id>` y ese parámetro abre su detalle. Se DERIVA del
  // searchParams (no se espeja en estado con un useEffect: evita el
  // setState-en-efecto y el render de más).
  const verId = searchParams.get('ver')
  const modalId = verId ? Number(verId) || null : modalIdManual

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
    navigate('/presupuesto/crear')
  }

  // Cerrar el detalle: limpia el estado local y, si veníamos de crear
  // (`?ver=<id>`), quita el parámetro de la URL para no reabrirlo.
  function cerrarDetalle() {
    setModalIdManual(null)
    if (verId) {
      const next = new URLSearchParams(searchParams)
      next.delete('ver')
      setSearchParams(next, { replace: true })
    }
  }

  // Recotizar devuelve un presupuesto NUEVO: se abre ese y el historial se
  // recarga. Si el detalle se abrió desde `?ver=`, el parámetro deja de mandar.
  function alRecotizar(nuevoId) {
    if (verId) {
      const next = new URLSearchParams(searchParams)
      next.delete('ver')
      setSearchParams(next, { replace: true })
    }
    setModalIdManual(nuevoId)
    cargarHistorial()
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
                    onClick={() => setModalIdManual(p.id)}
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

      {modalId && (
        <PresupuestoModal
          presupuestoId={modalId}
          onClose={cerrarDetalle}
          onRecotizado={alRecotizar}
        />
      )}
    </LayoutPaginaPrincipal>
  )
}

export default Presupuesto
