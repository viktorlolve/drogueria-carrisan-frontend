import { useState, useEffect, useMemo } from 'react'
import api from '../../api/axios'
import './CotizacionesAdmin.css'

const COLUMNAS = [
  { estado: 'pendiente', titulo: 'Pendientes', color: '#f59e0b', bg: '#fef3c7' },
  { estado: 'cotizada', titulo: 'Cotizadas', color: '#3b82f6', bg: '#dbeafe' },
  { estado: 'rechazada', titulo: 'Rechazadas', color: '#ef4444', bg: '#fee2e2' },
]

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function esVencida(cotizacion) {
  return cotizacion.estado === 'cotizada' &&
    cotizacion.fecha_expiracion &&
    new Date(cotizacion.fecha_expiracion) < new Date()
}

function CotizacionCardKanban({ cotizacion, onClick }) {
  const vencida = esVencida(cotizacion)
  return (
    <button type="button" className="kb-card" onClick={onClick}>
      <div className="kb-card__top">
        <span className="kb-card__id">#{cotizacion.id}</span>
        {vencida && <span className="kb-card__vencida">Vencida</span>}
      </div>
      <p className="kb-card__producto">{cotizacion.productos?.nombre_comercial || 'Producto'}</p>
      <div className="kb-card__cliente">
        <span>{cotizacion.users?.nombre || 'Cliente'}</span>
        <span className="kb-card__cliente-email">{cotizacion.users?.email}</span>
      </div>
      {cotizacion.estado === 'cotizada' && !vencida && (
        <p className="kb-card__precio">${formatUSD(cotizacion.precio_unitario)}</p>
      )}
      <p className="kb-card__fecha">
        {new Date(cotizacion.fecha_solicitud).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
      </p>
    </button>
  )
}

function ModalCotizacion({ cotizacion, onClose, onResponder, onRechazar }) {
  const [precio, setPrecio] = useState('')
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  if (!cotizacion) return null

  const vencida = esVencida(cotizacion)
  const iniciales = (cotizacion.users?.nombre || cotizacion.users?.email || '?').trim().charAt(0).toUpperCase()

  async function handleResponder() {
    const valor = Number(precio)
    if (!valor || valor <= 0) {
      setError('Ingresa un precio válido')
      return
    }
    setEnviando(true)
    setError('')
    try {
      await onResponder(cotizacion.id, { precio_unitario: valor, nota_admin: nota || undefined })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al responder la cotización')
    } finally {
      setEnviando(false)
    }
  }

  async function handleRechazar() {
    setEnviando(true)
    setError('')
    try {
      await onRechazar(cotizacion.id, { nota_admin: nota || undefined })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al rechazar la cotización')
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
            <p className="odm-numero">Cotización #{cotizacion.id}</p>
            <p className="odm-fecha">
              {new Date(cotizacion.fecha_solicitud).toLocaleString('es-VE')}
            </p>
          </div>
          <span
            className="odm-badge"
            style={{
              backgroundColor: vencida ? '#f1f5f9' : COLUMNAS.find(c => c.estado === cotizacion.estado)?.bg,
              color: vencida ? '#64748b' : COLUMNAS.find(c => c.estado === cotizacion.estado)?.color,
            }}
          >
            {vencida ? 'Vencida' : COLUMNAS.find(c => c.estado === cotizacion.estado)?.titulo}
          </span>
        </div>

        <div className="odm-cliente">
          <div className="odm-cliente-avatar">{iniciales}</div>
          <div className="odm-cliente-info">
            <strong>{cotizacion.users?.nombre || 'Cliente'}</strong>
            <span>{cotizacion.users?.email}</span>
          </div>
        </div>

        <div className="odm-divider" />

        <div className="odm-section">
          <p className="odm-section-title">
            <span className="odm-section-icon">💊</span> Producto
          </p>
          <div className="odm-item">
            <div className="odm-item-media">
              {cotizacion.productos?.foto_url ? (
                <img src={cotizacion.productos.foto_url} alt={cotizacion.productos.nombre_comercial} />
              ) : (
                <span className="odm-item-placeholder">📦</span>
              )}
            </div>
            <div className="odm-item-body">
              <p className="odm-item-nombre">{cotizacion.productos?.nombre_comercial}</p>
              {cotizacion.productos?.disponible === false && (
                <p className="odm-item-cantidad">Producto marcado no disponible</p>
              )}
            </div>
          </div>
        </div>

        <div className="odm-divider" />

        {cotizacion.estado === 'pendiente' && (
          <div className="odm-section">
            <p className="odm-section-title">
              <span className="odm-section-icon">💵</span> Responder cotización
            </p>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Precio en USD"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="odm-estado-select"
              style={{ marginBottom: 10 }}
            />
            <textarea
              placeholder="Nota para el cliente (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              className="odm-estado-select"
              style={{ resize: 'vertical' }}
            />
            {error && <p className="kb-error">{error}</p>}
            <div className="kb-modal-acciones">
              <button className="kb-btn-rechazar" onClick={handleRechazar} disabled={enviando}>
                Rechazar
              </button>
              <button className="kb-btn-responder" onClick={handleResponder} disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar cotización'}
              </button>
            </div>
          </div>
        )}

        {cotizacion.estado === 'cotizada' && (
          <div className="odm-section">
            <p className="odm-section-title">
              <span className="odm-section-icon">💵</span> Precio asignado
            </p>
            <div className="odm-totales">
              <div className="odm-total-final">
                <span>Precio</span>
                <span className="odm-total-valor">${formatUSD(cotizacion.precio_unitario)}</span>
              </div>
              <div className="odm-total-row">
                <span>{vencida ? 'Venció' : 'Vence'}</span>
                <span>{new Date(cotizacion.fecha_expiracion).toLocaleString('es-VE')}</span>
              </div>
            </div>
            {cotizacion.nota_admin && <p className="odm-notas">{cotizacion.nota_admin}</p>}
          </div>
        )}

        {cotizacion.estado === 'rechazada' && cotizacion.nota_admin && (
          <div className="odm-section">
            <p className="odm-section-title">Motivo</p>
            <p className="odm-notas">{cotizacion.nota_admin}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CotizacionesAdmin() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccionada, setSeleccionada] = useState(null)

  useEffect(() => {
    let activo = true
    api.get('/cotizaciones')
      .then(({ data }) => {
        if (activo) setCotizaciones(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        console.error('Error al cargar cotizaciones', err)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  async function handleResponder(id, payload) {
    const { data } = await api.patch(`/cotizaciones/${id}/responder`, payload)
    setCotizaciones((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
  }

  async function handleRechazar(id, payload) {
    const { data } = await api.patch(`/cotizaciones/${id}/rechazar`, payload)
    setCotizaciones((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
  }

  const columnas = useMemo(() => {
    return COLUMNAS.map((col) => ({
      ...col,
      items: cotizaciones.filter((c) => c.estado === col.estado),
    }))
  }, [cotizaciones])

  if (cargando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando cotizaciones...</p>
      </div>
    )
  }

  return (
    <div className="kb-board-wrap">
      <div className="section-header">
        <div className="header-top">
          <h2>💬 Cotizaciones</h2>
        </div>
      </div>

      <div className="kb-board">
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
                col.items.map((c) => (
                  <CotizacionCardKanban key={c.id} cotizacion={c} onClick={() => setSeleccionada(c)} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <ModalCotizacion
        cotizacion={seleccionada}
        onClose={() => setSeleccionada(null)}
        onResponder={handleResponder}
        onRechazar={handleRechazar}
      />
    </div>
  )
}

export default CotizacionesAdmin