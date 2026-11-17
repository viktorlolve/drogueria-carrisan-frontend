import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import ColaOrdenes, { etiquetaEnvio } from '../../components/staff/ColaOrdenes'
import { useColaStaff } from '../../hooks/useColaStaff'
import staffApi from '../../api/staffAxios'
import './StaffComercial.css'

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

  function cambiarRango(e) {
    const id = e.target.value
    setRango(id)
    setDesde(fechaDesdeISO(RANGOS.find((r) => r.id === id)?.dias || 30))
  }

  function abrirEditor(orden) {
    setOrdenEditando(orden)
    const map = {}
    ;(orden.ordenes_items || []).forEach(it => { map[it.id] = it.cantidad })
    setCantidades(map)
    setMsg(null)
  }

  function cerrarEditor() {
    setOrdenEditando(null)
    setCantidades({})
    setMsg(null)
  }

  async function guardarDevolucion() {
    if (!ordenEditando) return
    const cambios = []
    ;(ordenEditando.ordenes_items || []).forEach(it => {
      const nueva = Number(cantidades[it.id])
      if (!Number.isFinite(nueva) || nueva < 0) return
      if (nueva !== it.cantidad) cambios.push({ id: it.id, cantidad: nueva })
    })
    if (cambios.length === 0) {
      setMsg({ tipo: 'error', texto: 'No hay cambios para guardar.' })
      return
    }
    // Validar que no aumenten y que al menos quede 1 item
    const itemsRestantes = (ordenEditando.ordenes_items || []).map(it => {
      const nueva = cambios.find(c => c.id === it.id)?.cantidad ?? it.cantidad
      return nueva
    }).filter(q => q > 0)
    if (itemsRestantes.length === 0) {
      setMsg({ tipo: 'error', texto: 'La orden debe tener al menos un item.' })
      return
    }
    setGuardando(true)
    setMsg(null)
    try {
      await staffApi.patch(`/staff/logistica/${ordenEditando.id}/devolucion`, { items: cambios })
      setMsg({ tipo: 'ok', texto: 'Devolución aplicada. El cliente verá el total corregido.' })
      await recargar()
      setTimeout(() => cerrarEditor(), 1200)
    } catch (err) {
      setMsg({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo guardar.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="devoluciones" titulo="Devoluciones">
      <div className="sp-header">
        <p className="sp-meta">Órdenes entregadas/retiradas. Ajusta cantidades o elimina items (no se pueden agregar). Solo admin/director.</p>
        <select className="sp-select--rango" value={rango} onChange={cambiarRango} aria-label="Período">
          {RANGOS.map((r) => (
            <option key={r.id} value={r.id}>{r.texto}</option>
          ))}
        </select>
      </div>

      {ordenEditando && (
        <div className="sc-modal-overlay" onClick={cerrarEditor}>
          <div className="sc-modal" onClick={e => e.stopPropagation()}>
            <h3>Devolución — Orden #{ordenEditando.id}</h3>
            <p className="sc-modal-sub">Cliente: {ordenEditando.users?.nombre || '—'} · Estado: {ordenEditando.estado}</p>
            <div className="sc-modal-body">
              {(ordenEditando.ordenes_items || []).map(it => (
                <div key={it.id} className="sc-fila-item" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ flex: 1 }}>{it.productos?.nombre_comercial || `Producto #${it.producto_id}`}</span>
                  <span style={{ color: '#666' }}>cant. original: {it.cantidad}</span>
                  <input
                    type="number"
                    min={0}
                    max={it.cantidad}
                    value={cantidades[it.id] ?? it.cantidad}
                    onChange={e => setCantidades(prev => ({ ...prev, [it.id]: parseInt(e.target.value, 10) || 0 }))}
                    style={{ width: 70 }}
                  />
                  <button
                    type="button"
                    className="sc-btn sc-btn--ghost"
                    onClick={() => setCantidades(prev => ({ ...prev, [it.id]: 0 }))}
                    title="Quitar item"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
            {msg && <p className={`sc-msg sc-msg--${msg.tipo}`}>{msg.texto}</p>}
            <div className="sc-modal-actions">
              <button type="button" className="sc-btn sc-btn--ghost" onClick={cerrarEditor} disabled={guardando}>Cancelar</button>
              <button type="button" className="sc-btn sc-btn--primary" onClick={guardarDevolucion} disabled={guardando}>
                {guardando ? <Loader2 size={16} className="spin" /> : 'Guardar devolución'}
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
        acciones={(orden) => (
          <button type="button" className="sc-btn sc-btn--sm" onClick={() => abrirEditor(orden)}>
            Ajustar items
          </button>
        )}
      />
    </LayoutDepartamento>
  )
}
