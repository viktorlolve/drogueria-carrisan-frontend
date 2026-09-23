import { useState, useEffect } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import { ModalCrearPresupuesto } from '../../components/staff/StaffComercialModals'
import './StaffComercial.css'
import './StaffClientes.css'
import './StaffPresupuestos.css'

function formatUSD(v) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ESTADOS_PRESUPUESTO = [
  { id: '', titulo: 'Todos' },
  { id: 'vigente', titulo: 'Vigentes' },
  { id: 'convertido', titulo: 'Convertidos' },
  { id: 'vencido', titulo: 'Vencidos' },
]

function ModalPresupuestoDetalle({ presupuesto, onClose, onRecotizar, onGenerarPedido }) {
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [prevPresupuestoId, setPrevPresupuestoId] = useState(presupuesto?.id)
  if (presupuesto?.id !== prevPresupuestoId) {
    setPrevPresupuestoId(presupuesto?.id)
    setDetalle(null)
    setCargando(true)
    setError('')
  }

  useEffect(() => {
    if (!presupuesto) return
    let vivo = true
    staffApi.get(`/staff/presupuestos/${presupuesto.id}`)
      .then(({ data }) => { if (vivo) setDetalle(data) })
      .catch((err) => { if (vivo) setError(err.response?.data?.error || 'Error al cargar detalle') })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [presupuesto])

  if (!presupuesto) return null

  return (
    <div className="odm-overlay" onClick={onClose}>
      <div className="odm-content" onClick={(e) => e.stopPropagation()}>
        <button className="odm-close" onClick={onClose}>✕</button>
        <div className="odm-header">
          <div>
            <p className="odm-numero">Presupuesto #{presupuesto.numero || presupuesto.id}</p>
            <p className="odm-fecha">{formatFecha(presupuesto.fecha_creacion)}</p>
          </div>
          <span className="odm-badge" style={{
            background: presupuesto.estado === 'vigente' ? '#d1fae5' : '#f3f4f6',
            color: presupuesto.estado === 'vigente' ? '#059669' : '#6b7280',
          }}>{presupuesto.estado}</span>
        </div>

        {presupuesto.usuario && (
          <div className="odm-cliente">
            <div className="odm-cliente-avatar">{(presupuesto.usuario.nombre || '?').trim().charAt(0).toUpperCase()}</div>
            <div className="odm-cliente-info">
              <strong>{presupuesto.usuario.nombre}</strong>
              <span>{presupuesto.usuario.email}</span>
            </div>
          </div>
        )}

        <div className="odm-divider" />

        {error && <p className="kb-error">{error}</p>}
        {cargando ? (
          <p style={{ padding: '16px 0', fontSize: '0.9rem', color: '#6b7280' }}>Cargando detalle...</p>
        ) : detalle ? (
          <>
            <div className="odm-section">
              <p className="odm-section-title">Productos</p>
              {(detalle.items || []).map((item, i) => (
                <div key={i} className="odm-item">
                  <div className="odm-item-body">
                    <p className="odm-item-nombre">{item.nombre_comercial} × {item.cantidad}</p>
                    <p className="odm-item-cantidad">
                      {item.disponible
                        ? `$${formatUSD(item.precio_unitario)} · Subtotal $${formatUSD(item.subtotal)}`
                        : 'Sin precio disponible'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {detalle.vencido && presupuesto.estado === 'vigente' && (
              <p className="odm-notas" style={{ color: '#dc2626' }}>Vencido — recotiza antes de generar pedido.</p>
            )}
            <div className="odm-totales">
              <div className="odm-total-final">
                <span>Total</span>
                <span className="odm-total-valor">${formatUSD(detalle.total_usd)}</span>
              </div>
            </div>
          </>
        ) : null}

        <div className="kb-modal-acciones" style={{ marginTop: 12 }}>
          <button className="kb-btn-rechazar" onClick={() => { onClose(); onRecotizar(presupuesto.id) }}>Recotizar</button>
          <button className="kb-btn-responder" onClick={() => { onClose(); onGenerarPedido(presupuesto.id) }}>Generar pedido</button>
        </div>
      </div>
    </div>
  )
}

function StaffPresupuestos({ departamento = 'comercial', activo = 'presupuestos', titulo = 'Presupuestos' }) {
  const [estado, setEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  const [presupuestos, setPresupuestos] = useState([])
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(null)
  const [crearModal, setCrearModal] = useState(false)

  useEffect(() => {
    let vivo = true
    staffApi.get('/staff/presupuestos', { params: { estado: estado || undefined, pagina } })
      .then(({ data }) => {
        if (!vivo) return
        setPresupuestos(data?.presupuestos || [])
        setTotalPaginas(data?.total_paginas || 1)
      })
      .catch((err) => { console.error('Error al listar presupuestos', err) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [estado, pagina])

  async function recotizar(id) {
    try {
      await staffApi.post(`/staff/presupuestos/${id}/recotizar`)
      const { data } = await staffApi.get('/staff/presupuestos', { params: { estado: estado || undefined, pagina } })
      setPresupuestos(data?.presupuestos || [])
    } catch (err) {
      window.alert(err.response?.data?.error || 'Error al recotizar')
    }
  }

  async function generarPedido(id) {
    if (!window.confirm('¿Generar pedido desde este presupuesto?')) return
    try {
      await staffApi.post(`/staff/presupuestos/${id}/generar-pedido`)
      window.alert(`Pedido generado desde el presupuesto #${id}.`)
      const { data } = await staffApi.get('/staff/presupuestos', { params: { estado: estado || undefined, pagina } })
      setPresupuestos(data?.presupuestos || [])
    } catch (err) {
      window.alert(err.response?.data?.error || 'Error al generar pedido')
    }
  }

  if (cargando) {
    return (
      <LayoutDepartamento departamento={departamento} activo={activo} titulo={titulo}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando presupuestos...</p>
        </div>
      </LayoutDepartamento>
    )
  }

  return (
    <LayoutDepartamento departamento={departamento} activo={activo} titulo={titulo}>
      <div className="spu-toolbar">
        <select className="sp-input" value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1) }}>
          {ESTADOS_PRESUPUESTO.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
        </select>
        <button className="sc-btn sc-btn--primary" onClick={() => setCrearModal(true)}>Nuevo presupuesto</button>
      </div>

      <div className="sc-lista-solicitudes" style={{ marginTop: 12 }}>
        {presupuestos.length === 0 ? (
          <p className="sc-vacio">Sin presupuestos.</p>
        ) : (
          presupuestos.map((p) => (
            <div key={p.id} className="sc-solicitud-card" onClick={() => setModal(p)}>
              <div className="sc-solicitud-info">
                <span className="sc-solicitud-id">#{p.numero || p.id}</span>
                <span className="sc-solicitud-meta" style={{ marginLeft: 8 }}>
                  {p.usuario?.nombre || `Cliente #${p.usuario_id}`} · {formatFecha(p.fecha_creacion)} · ${formatUSD(p.total_usd)}
                </span>
              </div>
              <span className={`sc-badge ${p.estado === 'vigente' ? 'sc-badge--activo' : 'sc-badge--tipo'}`}>{p.estado}</span>
            </div>
          ))
        )}
      </div>

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <button className="sc-btn sc-btn--outline" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
          <span style={{ fontSize: '0.85rem' }}>Pág {pagina} de {totalPaginas}</span>
          <button className="sc-btn sc-btn--outline" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
        </div>
      )}

      <ModalPresupuestoDetalle
        presupuesto={modal}
        onClose={() => setModal(null)}
        onRecotizar={recotizar}
        onGenerarPedido={generarPedido}
      />
      {crearModal && (
        <ModalCrearPresupuesto
          onClose={() => setCrearModal(false)}
          onCreado={() => {
            staffApi.get('/staff/presupuestos', { params: { estado: estado || undefined, pagina } })
              .then(({ data }) => setPresupuestos(data?.presupuestos || []))
              .catch(() => {})
            setCrearModal(false)
          }}
        />
      )}
    </LayoutDepartamento>
  )
}

export default StaffPresupuestos
