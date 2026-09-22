import { useState, useEffect, useMemo } from 'react'
import api from '../../api/axios'
import './RequerimientosAdmin.css'

const COLUMNAS = [
  { estado: 'pendiente', titulo: 'Pendientes', color: '#f59e0b', bg: '#fef3c7' },
  { estado: 'respondido', titulo: 'Respondidos', color: '#10b981', bg: '#d1fae5' },
]

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function RequerimientoCardKanban({ requerimiento, onClick }) {
  const pendientes = requerimiento.requerimiento_items.filter((i) => i.estado_item === 'pendiente').length

  return (
    <button type="button" className="kb-card" onClick={onClick}>
      <div className="kb-card__top">
        <span className="kb-card__id">#{requerimiento.id}</span>
        <span className="kb-card__vencida">{requerimiento.requerimiento_items.length} items</span>
      </div>
      <div className="kb-card__cliente">
        <span>{requerimiento.users?.nombre || 'Cliente'}</span>
        <span className="kb-card__cliente-email">{requerimiento.users?.email}</span>
      </div>
      {pendientes > 0 && requerimiento.estado === 'pendiente' && (
        <p className="kb-card__precio" style={{ color: '#f59e0b' }}>{pendientes} sin precio</p>
      )}
      <p className="kb-card__fecha">
        {new Date(requerimiento.fecha_solicitud).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
      </p>
    </button>
  )
}

function FilaItem({ item, valores, onChange, soloLectura }) {
  const rechazado = valores.rechazado

  if (soloLectura) {
    return (
      <div className="ra-fila ra-fila--lectura">
        <span className="ra-fila__original">{item.nombre_solicitado} (x{item.cantidad})</span>
        {item.estado_item === 'listo' && item.productos ? (
          <span className="ra-fila__resultado ra-fila__resultado--ok">
            {item.productos.nombre_comercial} — ${formatUSD(item.productos.precio_usd)}
          </span>
        ) : (
          <span className="ra-fila__resultado ra-fila__resultado--rechazado">Rechazado</span>
        )}
      </div>
    )
  }

  return (
    <div className={`ra-fila ${rechazado ? 'ra-fila--rechazada' : ''}`}>
      <div className="ra-fila__original">
        <span>{item.nombre_solicitado}</span>
        <span className="ra-fila__cantidad">x{item.cantidad}</span>
        {item.nota_usuario && <span className="ra-fila__nota">{item.nota_usuario}</span>}
      </div>
      <input
        type="text"
        placeholder="Nombre final"
        value={valores.nombre_final}
        onChange={(e) => onChange({ ...valores, nombre_final: e.target.value })}
        disabled={rechazado}
        className="ra-fila__input ra-fila__input--nombre"
      />
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="Precio"
        value={valores.precio_unitario}
        onChange={(e) => onChange({ ...valores, precio_unitario: e.target.value })}
        disabled={rechazado}
        className="ra-fila__input ra-fila__input--precio"
      />
      <label className="ra-fila__rechazar">
        <input
          type="checkbox"
          checked={rechazado}
          onChange={(e) => onChange({ ...valores, rechazado: e.target.checked })}
        />
        Rechazar
      </label>
    </div>
  )
}

function ModalRequerimiento({ requerimiento, onClose, onResponder }) {
  const [valores, setValores] = useState(() => {
    if (!requerimiento) return {}
    const iniciales = {}
    requerimiento.requerimiento_items.forEach((item) => {
      iniciales[item.id] = {
        nombre_final: item.nombre_solicitado,
        precio_unitario: '',
        rechazado: false,
      }
    })
    return iniciales
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  if (!requerimiento) return null

  const soloLectura = requerimiento.estado === 'respondido'
  const iniciales = (requerimiento.users?.nombre || requerimiento.users?.email || '?').trim().charAt(0).toUpperCase()

  async function handleGuardar() {
    const items = []
    const items_rechazados = []

    for (const item of requerimiento.requerimiento_items) {
      const v = valores[item.id]
      if (v.rechazado) {
        items_rechazados.push(item.id)
        continue
      }
      if (!v.nombre_final.trim() || !v.precio_unitario || Number(v.precio_unitario) <= 0) {
        setError(`Falta nombre o precio para "${item.nombre_solicitado}" — o márcalo como rechazado`)
        return
      }
      items.push({ id: item.id, nombre_final: v.nombre_final.trim(), precio_unitario: Number(v.precio_unitario) })
    }

    setEnviando(true)
    setError('')
    try {
      await onResponder(requerimiento.id, { items, items_rechazados })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al responder el requerimiento')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="odm-overlay" onClick={onClose}>
      <div className="odm-content" onClick={(e) => e.stopPropagation()}>
        <button className="odm-close" onClick={onClose} aria-label="Cerrar">✕</button>

        <div className="odm-header">
          <div>
            <p className="odm-numero">Requerimiento #{requerimiento.id}</p>
            <p className="odm-fecha">{new Date(requerimiento.fecha_solicitud).toLocaleString('es-VE')}</p>
          </div>
          <span
            className="odm-badge"
            style={{
              backgroundColor: soloLectura ? '#d1fae5' : '#fef3c7',
              color: soloLectura ? '#10b981' : '#f59e0b',
            }}
          >
            {soloLectura ? 'Respondido' : 'Pendiente'}
          </span>
        </div>

        <div className="odm-cliente">
          <div className="odm-cliente-avatar">{iniciales}</div>
          <div className="odm-cliente-info">
            <strong>{requerimiento.users?.nombre || 'Cliente'}</strong>
            <span>{requerimiento.users?.email}</span>
          </div>
        </div>

        <div className="odm-divider" />

        <div className="odm-section">
          <p className="odm-section-title">
            <span className="odm-section-icon">📝</span> Productos solicitados
          </p>
          <div className="ra-filas">
            {requerimiento.requerimiento_items.map((item) => (
              <FilaItem
                key={item.id}
                item={item}
                valores={valores[item.id] || { nombre_final: '', precio_unitario: '', rechazado: false }}
                onChange={(v) => setValores((prev) => ({ ...prev, [item.id]: v }))}
                soloLectura={soloLectura}
              />
            ))}
          </div>
        </div>

        {!soloLectura && (
          <>
            {error && <p className="kb-error">{error}</p>}
            <div className="kb-modal-acciones">
              <button className="kb-btn-responder" style={{ flex: 1 }} onClick={handleGuardar} disabled={enviando}>
                {enviando ? 'Guardando...' : 'Guardar respuesta'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function RequerimientosAdmin() {
  const [requerimientos, setRequerimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null)

  useEffect(() => {
    let activo = true
    api.get('/requerimientos')
      .then(({ data }) => {
        if (activo) setRequerimientos(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        console.error('Error al cargar requerimientos', err)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  async function handleResponder(id, payload) {
    const { data } = await api.patch(`/requerimientos/${id}/responder`, payload)
    setRequerimientos((prev) => prev.map((r) => (r.id === id ? data : r)))
  }

  const columnas = useMemo(() => {
    return COLUMNAS.map((col) => ({
      ...col,
      items: requerimientos.filter((r) => r.estado === col.estado),
    }))
  }, [requerimientos])

  if (cargando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando requerimientos...</p>
      </div>
    )
  }

  return (
    <div className="kb-board-wrap">
      <div className="section-header">
        <div className="header-top">
          <h2>📦 Requerimientos</h2>
        </div>
      </div>

      <div className="kb-board" style={{ gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))' }}>
        {columnas.map((col) => (
          <div key={col.estado} className="kb-columna">
            <div className="kb-columna__header">
              <span className="kb-columna__titulo">{col.titulo}</span>
              <span className="kb-columna__count" style={{ background: col.bg, color: col.color }}>
                {col.items.length}
              </span>
            </div>
            <div className="kb-columna__cards">
              {col.items.length === 0 ? (
                <p className="kb-columna__vacio">Sin solicitudes</p>
              ) : (
                col.items.map((r) => (
                  <RequerimientoCardKanban key={r.id} requerimiento={r} onClick={() => setSeleccionado(r)} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <ModalRequerimiento
        key={seleccionado?.id || 'cerrado'}
        requerimiento={seleccionado}
        onClose={() => setSeleccionado(null)}
        onResponder={handleResponder}
      />
    </div>
  )
}

export default RequerimientosAdmin