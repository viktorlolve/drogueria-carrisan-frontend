import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import ColaOrdenes, { etiquetaEnvio, formatUSD } from '../../components/staff/ColaOrdenes'
import { useColaStaff } from '../../hooks/useColaStaff'
import staffApi from '../../api/staffAxios'
import './StaffDevoluciones.css'

const RANGOS = [
  { id: '7', texto: 'Últimos 7 días', dias: 7 },
  { id: '30', texto: 'Últimos 30 días', dias: 30 },
  { id: '90', texto: 'Últimos 90 días', dias: 90 },
]

function fechaDesdeISO(dias) {
  return new Date(Date.now() - dias * 86400000).toISOString()
}

const extraerOrdenes = (data) => data?.ordenes || []

export default function StaffDevoluciones() {
  const [rango, setRango] = useState('30')
  const [desde, setDesde] = useState(() => fechaDesdeISO(30))
  const dias = RANGOS.find((r) => r.id === rango)?.dias || 30
  const { datos, cargando, error, recargar } = useColaStaff('/staff/logistica/completadas', {
    params: { desde },
    extraer: extraerOrdenes,
  })

  const [ordenEditando, setOrdenEditando] = useState(null)
  const [cantidades, setCantidades] = useState({}) // itemId -> nuevaCantidad
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)

  // Bloquear el scroll del fondo mientras el modal está abierto, restaurando
  // el valor previo (no '': puede haber otro overlay debajo).
  useEffect(() => {
    if (!ordenEditando) return undefined
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previo }
  }, [ordenEditando])

  const items = ordenEditando?.ordenes_items || []
  const cambios = items
    .filter((it) => (cantidades[it.id] ?? it.cantidad) !== it.cantidad)
    .map((it) => ({ id: it.id, cantidad: Number(cantidades[it.id] ?? it.cantidad) }))
  const quitados = items.filter((it) => (cantidades[it.id] ?? it.cantidad) === 0)
  // Misma fórmula del backend: items no anulados + costo de envío, redondeado a 2 decimales.
  const totalPrevisto = Math.round((items.reduce(
    (sum, it) => it.anulado ? sum : sum + Number(it.precio_unitario || 0) * (cantidades[it.id] ?? it.cantidad),
    0,
  ) + Number(ordenEditando?.costo_envio_usd || 0)) * 100) / 100

  function cambiarRango(e) {
    const id = e.target.value
    setRango(id)
    setDesde(fechaDesdeISO(RANGOS.find((r) => r.id === id)?.dias || 30))
  }

  function abrirEditor(orden) {
    const map = {}
    ;(orden.ordenes_items || []).forEach((it) => { map[it.id] = it.cantidad })
    setOrdenEditando(orden)
    setCantidades(map)
    setMsg(null)
  }

  // forzar = cierre tras guardar con éxito (no debe preguntar "cambios sin guardar").
  function cerrarEditor(forzar = false) {
    if (!forzar && cambios.length > 0 &&
        !window.confirm('Hay cambios sin guardar. ¿Cerrar de todos modos?')) return
    setOrdenEditando(null)
    setCantidades({})
    setMsg(null)
  }

  function cambiarCantidad(it, valor) {
    const n = parseInt(valor, 10)
    const nueva = Number.isFinite(n) ? Math.min(Math.max(n, 0), it.cantidad) : 0
    setCantidades((prev) => ({ ...prev, [it.id]: nueva }))
  }

  async function guardarDevolucion() {
    if (!ordenEditando) return
    if (cambios.length === 0) {
      setMsg({ tipo: 'error', texto: 'No hay cambios para guardar.' })
      return
    }
    const conItems = items.filter((it) => (cantidades[it.id] ?? it.cantidad) > 0)
    if (conItems.length === 0) {
      setMsg({ tipo: 'error', texto: 'La orden debe tener al menos un item. Quita solo parte de los items.' })
      return
    }
    if (!window.confirm('¿Aplicar la devolución? El total del pedido se ajustará y el cliente lo verá corregido.')) return

    setGuardando(true)
    setMsg(null)
    try {
      await staffApi.patch(`/staff/logistica/${ordenEditando.id}/devolucion`, { items: cambios })
      await recargar()
      cerrarEditor(true)
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo guardar.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="devoluciones" titulo="Devoluciones">
      <div className="sd-header">
        <p className="sd-header__texto">
          Órdenes entregadas o retiradas. Ajusta cantidades o quita items (no se pueden agregar
          productos ni aumentar cantidades). Solo administrador, director o admin.
        </p>
        <select className="sd-select" value={rango} onChange={cambiarRango} aria-label="Período">
          {RANGOS.map((r) => (
            <option key={r.id} value={r.id}>{r.texto}</option>
          ))}
        </select>
      </div>

      {ordenEditando && (
        <div className="sd-overlay" onClick={() => cerrarEditor()}>
          <div
            className="sd-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Devolución de la orden ${ordenEditando.id}`}
          >
            <div className="sd-modal__head">
              <div>
                <h3>Devolución — Orden #{ordenEditando.id}</h3>
                <p className="sd-modal__sub">
                  Cliente: {ordenEditando.users?.nombre || '—'} · Estado: {ordenEditando.estado}
                </p>
              </div>
              <button
                type="button"
                className="sd-cerrar"
                onClick={() => cerrarEditor()}
                disabled={guardando}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="sd-modal__body">
              <p className="sd-ayuda">
                Modifica la cantidad entregada de cada item. Poner 0 lo quita del pedido.
              </p>

              <div className="sd-items">
                {items.map((it) => {
                  const nueva = cantidades[it.id] ?? it.cantidad
                  return (
                    <div key={it.id} className={`sd-item ${nueva === 0 ? 'sd-item--quitado' : ''}`}>
                      <div className="sd-item__nombre">
                        {it.productos?.nombre_comercial || `Producto #${it.producto_id}`}
                        {it.anulado && <span className="sd-chip">anulado</span>}
                        {nueva === 0 && <span className="sd-chip sd-chip--quitado">Quitado</span>}
                        <small>{formatUSD(it.precio_unitario)} c/u · original {it.cantidad}</small>
                      </div>
                      <input
                        className="sd-item__input"
                        type="number"
                        min={0}
                        max={it.cantidad}
                        value={nueva}
                        disabled={guardando}
                        onChange={(e) => cambiarCantidad(it, e.target.value)}
                        aria-label={`Cantidad de ${it.productos?.nombre_comercial || it.id}`}
                      />
                      <button
                        type="button"
                        className="sd-btn sd-btn--ghost"
                        disabled={guardando}
                        onClick={() => setCantidades((prev) => ({ ...prev, [it.id]: nueva === 0 ? it.cantidad : 0 }))}
                      >
                        {nueva === 0 ? 'Restaurar' : 'Quitar'}
                      </button>
                    </div>
                  )
                })}
              </div>

              {quitados.length > 0 && (
                <div className="sd-quitados">
                  <h4>Quitados ({quitados.length})</h4>
                  <ul>
                    {quitados.map((it) => (
                      <li key={it.id}>
                        {it.productos?.nombre_comercial || `Producto #${it.producto_id}`}
                        <span>{it.cantidad} × {formatUSD(it.precio_unitario)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="sd-preview">
                <div className="sd-preview__caja">
                  <span>Total actual</span>
                  <strong>{formatUSD(ordenEditando.total_usd)}</strong>
                </div>
                <div className="sd-preview__caja sd-preview__caja--nuevo">
                  <span>Total previsto</span>
                  <strong>{formatUSD(totalPrevisto)}</strong>
                </div>
                <div className="sd-preview__caja">
                  <span>Diferencia</span>
                  <strong>{formatUSD(totalPrevisto - Number(ordenEditando.total_usd || 0))}</strong>
                </div>
              </div>

              {msg && <p className={`sd-msg sd-msg--${msg.tipo}`}>{msg.texto}</p>}
            </div>

            <div className="sd-modal__foot">
              <button type="button" className="sd-btn sd-btn--ghost" onClick={() => cerrarEditor()} disabled={guardando}>
                Cancelar
              </button>
              <button type="button" className="sd-btn sd-btn--primary" onClick={guardarDevolucion} disabled={guardando}>
                {guardando ? <Loader2 size={16} className="sd-spin" /> : 'Confirmar devolución'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ColaOrdenes
        ordenes={datos}
        cargando={cargando}
        error={error}
        onReintentar={recargar}
        vacio={`Sin órdenes completadas en los últimos ${dias} días.`}
        badge={(orden) => <span className="sp-badge sp-badge--entregado">{etiquetaEnvio(orden)}</span>}
        renderAcciones={(orden) => (
          <button type="button" className="sd-btn sd-btn--sm" onClick={() => abrirEditor(orden)}>
            Ajustar items
          </button>
        )}
      />
    </LayoutDepartamento>
  )
}
