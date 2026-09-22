import { useState, useEffect, useMemo } from 'react'
import api from '../../api/axios'
import './DocumentosAdmin.css'

const COLUMNAS = [
  { estado: 'pendiente', titulo: 'Pendientes', color: '#f59e0b', bg: '#fef3c7' },
  { estado: 'aprobada', titulo: 'Aprobadas / Enviadas', color: '#10b981', bg: '#d1fae5' },
  { estado: 'rechazada', titulo: 'Rechazadas', color: '#ef4444', bg: '#fee2e2' },
]

const LABELS = {
  rif: 'RIF',
  estado_cuenta: 'Estado de cuenta',
  referencia_comercial: 'Referencia comercial',
  otro: 'Otro documento',
}

function DocCardKanban({ solicitud, onClick }) {
  return (
    <button type="button" className="kb-card" onClick={onClick}>
      <div className="kb-card__top">
        <span className="kb-card__id">#{solicitud.id}</span>
        {solicitud.es_automatica && <span className="kb-card__vencida">Automática</span>}
      </div>
      <p className="kb-card__producto">{LABELS[solicitud.tipo_documento] || solicitud.tipo_documento}</p>
      <div className="kb-card__cliente">
        <span>{solicitud.users?.nombre || 'Cliente'}</span>
        <span className="kb-card__cliente-email">{solicitud.users?.email}</span>
      </div>
      <p className="kb-card__fecha">
        {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
      </p>
    </button>
  )
}

function ModalDocumento({ solicitud, onClose, onAprobar, onRechazar }) {
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  if (!solicitud) return null

  const iniciales = (solicitud.users?.nombre || solicitud.users?.email || '?').trim().charAt(0).toUpperCase()

  async function handleAprobar() {
    setEnviando(true)
    setError('')
    try {
      await onAprobar(solicitud.id, { nota_admin: nota || undefined })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al aprobar')
    } finally {
      setEnviando(false)
    }
  }

  async function handleRechazar() {
    setEnviando(true)
    setError('')
    try {
      await onRechazar(solicitud.id, { nota_admin: nota || undefined })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al rechazar')
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
            <p className="odm-numero">Solicitud #{solicitud.id}</p>
            <p className="odm-fecha">{new Date(solicitud.fecha_solicitud).toLocaleString('es-VE')}</p>
          </div>
          <span
            className="odm-badge"
            style={{
              backgroundColor: COLUMNAS.find((c) => c.estado === solicitud.estado)?.bg,
              color: COLUMNAS.find((c) => c.estado === solicitud.estado)?.color,
            }}
          >
            {COLUMNAS.find((c) => c.estado === solicitud.estado)?.titulo}
          </span>
        </div>

        <div className="odm-cliente">
          <div className="odm-cliente-avatar">{iniciales}</div>
          <div className="odm-cliente-info">
            <strong>{solicitud.users?.nombre || 'Cliente'}</strong>
            <span>{solicitud.users?.email}</span>
          </div>
        </div>

        <div className="odm-divider" />

        <div className="odm-section">
          <p className="odm-section-title">
            <span className="odm-section-icon">📄</span> {LABELS[solicitud.tipo_documento]}
          </p>
          {solicitud.descripcion && <p className="odm-notas">{solicitud.descripcion}</p>}
          {solicitud.es_automatica && (
            <p className="odm-notas">Esta solicitud se aprueba y entrega sola — no requiere acción tuya.</p>
          )}
        </div>

        {solicitud.estado === 'pendiente' && !solicitud.es_automatica && (
          <div className="odm-section">
            <textarea
              placeholder="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              className="odm-estado-select"
              style={{ resize: 'vertical', marginBottom: 10 }}
            />
            {error && <p className="kb-error">{error}</p>}
            <div className="kb-modal-acciones">
              <button className="kb-btn-rechazar" onClick={handleRechazar} disabled={enviando}>
                Rechazar
              </button>
              <button className="kb-btn-responder" onClick={handleAprobar} disabled={enviando}>
                {enviando ? 'Guardando...' : 'Marcar como enviado'}
              </button>
            </div>
          </div>
        )}

        {solicitud.nota_admin && solicitud.estado !== 'pendiente' && (
          <div className="odm-section">
            <p className="odm-section-title">Nota</p>
            <p className="odm-notas">{solicitud.nota_admin}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function DocumentosAdmin() {
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccionada, setSeleccionada] = useState(null)

  useEffect(() => {
    let activo = true
    api.get('/documentos')
      .then(({ data }) => {
        if (activo) setSolicitudes(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        console.error('Error al cargar documentos', err)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  async function handleAprobar(id, payload) {
    const { data } = await api.patch(`/documentos/${id}/aprobar`, payload)
    setSolicitudes((prev) => prev.map((s) => (s.id === id ? data : s)))
  }

  async function handleRechazar(id, payload) {
    const { data } = await api.patch(`/documentos/${id}/rechazar`, payload)
    setSolicitudes((prev) => prev.map((s) => (s.id === id ? data : s)))
  }

  const columnas = useMemo(() => {
    return COLUMNAS.map((col) => ({
      ...col,
      items: solicitudes.filter((s) => s.estado === col.estado),
    }))
  }, [solicitudes])

  if (cargando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando solicitudes...</p>
      </div>
    )
  }

  return (
    <div className="kb-board-wrap">
      <div className="section-header">
        <div className="header-top">
          <h2>📄 Solicitudes de Documentos</h2>
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
                col.items.map((s) => (
                  <DocCardKanban key={s.id} solicitud={s} onClick={() => setSeleccionada(s)} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <ModalDocumento
        solicitud={seleccionada}
        onClose={() => setSeleccionada(null)}
        onAprobar={handleAprobar}
        onRechazar={handleRechazar}
      />
    </div>
  )
}

export default DocumentosAdmin