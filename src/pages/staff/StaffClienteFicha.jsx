// StaffClienteFicha.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ModalCotizacion, ModalRequerimientoDetalle, ModalCrearPresupuesto } from '../../components/staff/StaffComercialModals'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffTabs from '../../components/staff/StaffTabs'
import { normalizarEstado, getEstadoConfig, getLabelEstado, FULFILLMENT_METHODS } from '../../config/estadosOrden'
import { resumirHorario } from '../../utils/horario'
import './StaffComercial.css'
import './StaffTesoreria.css'
import './StaffClientes.css'
import { useStaffUI } from '../../hooks/useStaffUI'
import StaffModal from '../../components/staff/StaffModal'
import { Pencil } from 'lucide-react'
import StaffEstado from '../../components/staff/StaffEstado'
import { formatearUSD } from '../../utils/formato'

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------
function formatFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const DOC_LABELS = { rif: 'RIF', estado_cuenta: 'Estado de cuenta', referencia_comercial: 'Referencia comercial', otro: 'Otro documento' }

// -----------------------------------------------------------------
// Tab: Resumen
// -----------------------------------------------------------------
function TabResumen({ cliente, perfil, credito }) {
  if (!cliente) return <StaffEstado tipo="cargando" filas={3} />

  return (
    <>
      {/* Contacto */}
      <div className="sc-section">
        <p className="sc-section-title">Datos de contacto</p>
        <div className="sc-contacto-grid">
          <div className="sc-contacto-item"><label>Nombre</label><span>{cliente.nombre || '—'}</span></div>
          <div className="sc-contacto-item"><label>Email</label><span>{cliente.email || '—'}</span></div>
          <div className="sc-contacto-item"><label>Teléfono</label><span>{cliente.telefono || '—'}</span></div>
          <div className="sc-contacto-item"><label>RIF / Cédula</label><span>{cliente.rif_cedula || '—'}</span></div>
          <div className="sc-contacto-item"><label>Tipo</label><span>{cliente.tipo_usuario || '—'}</span></div>
          <div className="sc-contacto-item"><label>Etiqueta</label><span>{cliente.etiqueta || '—'}</span></div>
          <div className="sc-contacto-item"><label>Registro</label><span>{formatFecha(cliente.created_at)}</span></div>
          <div className="sc-contacto-item"><label>Estado</label><span>{cliente.activo ? 'Activo' : 'Inactivo'}</span></div>
        </div>
      </div>

      {/* Perfil por tipo */}
      {perfil && (
        <div className="sc-section">
          <p className="sc-section-title">
            Perfil {cliente.tipo_usuario === 'institucional' ? 'Institucional' : cliente.tipo_usuario === 'profesional' ? 'Profesional' : 'Honorífico'}
          </p>
          <div className="sc-perfil-grid">
            {cliente.tipo_usuario === 'institucional' && <>
              <div className="sc-perfil-item"><label>Razón social</label><span>{perfil.razon_social || '—'}</span></div>
              <div className="sc-perfil-item"><label>Nombre comercial</label><span>{perfil.nombre_comercial || '—'}</span></div>
              <div className="sc-perfil-item"><label>Tipo de institución</label><span>{perfil.tipo_institucion || '—'}</span></div>
              <div className="sc-perfil-item"><label>RIF</label><span>{perfil.rif || '—'}</span></div>
              <div className="sc-perfil-item"><label>Dirección fiscal</label><span>{perfil.direccion_fiscal || '—'}</span></div>
              <div className="sc-perfil-item"><label>Representante</label><span>{perfil.nombre_representante || '—'}</span></div>
              <div className="sc-perfil-item"><label>Tel. representante</label><span>{perfil.telefono_representante || '—'}</span></div>
              <div className="sc-perfil-item"><label>Horario</label><span>{resumirHorario(perfil.horario_recepcion).join(' — ') || '—'}</span></div>
            </>}
            {cliente.tipo_usuario === 'profesional' && <>
              <div className="sc-perfil-item"><label>Profesión</label><span>{perfil.profesion || '—'}</span></div>
              <div className="sc-perfil-item"><label>Título</label><span>{perfil.titulo || '—'}</span></div>
              <div className="sc-perfil-item"><label>Nombre</label><span>{perfil.nombre || '—'}</span></div>
              <div className="sc-perfil-item"><label>Apellido</label><span>{perfil.apellido || '—'}</span></div>
              <div className="sc-perfil-item"><label>Cédula</label><span>{perfil.numero_cedula || '—'}</span></div>
              <div className="sc-perfil-item"><label>Especialidad</label><span>{perfil.especialidad || '—'}</span></div>
              <div className="sc-perfil-item"><label>RIF</label><span>{perfil.rif || '—'}</span></div>
            </>}
            {cliente.tipo_usuario === 'honorifico' && <>
              <div className="sc-perfil-item"><label>Tratamiento</label><span>{perfil.tratamiento || '—'}</span></div>
              <div className="sc-perfil-item"><label>Nombre</label><span>{perfil.nombre || '—'}</span></div>
              <div className="sc-perfil-item"><label>Apellido</label><span>{perfil.apellido || '—'}</span></div>
              <div className="sc-perfil-item"><label>Código de invitación</label><span>{perfil.codigo_invitacion_usado || '—'}</span></div>
            </>}
          </div>
        </div>
      )}

      {/* Crédito read-only */}
      {credito && (
        <div className="sc-section">
          <p className="sc-section-title">Crédito</p>
          <div className="sc-credito-cards">
            <div className="st-resumen-card" style={{ background: '#f0fdf4' }}>
              <span>Línea de crédito</span>
              <strong>{formatearUSD(credito.linea_credito)}</strong>
            </div>
            <div className="st-resumen-card" style={{ background: '#fef2f2' }}>
              <span>Deuda total</span>
              <strong style={{ color: credito.deuda_total > 0 ? '#dc2626' : '#111827' }}>{formatearUSD(credito.deuda_total)}</strong>
            </div>
            <div className="st-resumen-card" style={{ background: credito.deuda_vencida > 0 ? '#fef2f2' : '#f9fafb' }}>
              <span>Deuda vencida</span>
              <strong style={{ color: credito.deuda_vencida > 0 ? '#dc2626' : '#111827' }}>{formatearUSD(credito.deuda_vencida)}</strong>
            </div>
            <div className="st-resumen-card" style={{ background: '#eff6ff' }}>
              <span>Saldo disponible</span>
              <strong>{formatearUSD(credito.saldo)}</strong>
            </div>
          </div>
          {credito.credito_bloqueado && (
            <p style={{ marginTop: 10, fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>
              Crédito bloqueado{credito.credito_bloqueado_motivo ? `: ${credito.credito_bloqueado_motivo}` : ''}
            </p>
          )}
        </div>
      )}
    </>
  )
}

// -----------------------------------------------------------------
// Tab: Pedidos
// -----------------------------------------------------------------
function TabPedidos({ clienteId }) {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vivo = true
    staffApi.get(`/staff/clientes/${clienteId}/ordenes`)
      .then(({ data }) => {
        if (!vivo) return
        setOrdenes(data || [])
        setError('')
      })
      .catch((err) => {
        if (vivo) setError(err.response?.data?.error || 'No se pudieron cargar las órdenes del cliente')
      })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [clienteId, intento])

  if (cargando) return <StaffEstado tipo="cargando" filas={3} />
  if (error) return <StaffEstado tipo="error" mensaje={error} onReintentar={() => { setCargando(true); setIntento((n) => n + 1) }} />
  if (!ordenes.length) return <StaffEstado tipo="vacio" titulo="Este cliente no tiene órdenes." />

  return (
    <div className="sc-pedidos-lista">
      {ordenes.map((o) => {
        const estadoReal = normalizarEstado(o.estado)
        const est = getEstadoConfig(estadoReal)
        const label = getLabelEstado(estadoReal, { rol: 'staff', fulfillmentMethod: o.tipo_envio })
        const fulfillment = FULFILLMENT_METHODS[o.tipo_envio]
        return (
          <div key={o.id} className="sc-pedido-card">
            <div className="sc-pedido-top">
              <div>
                <span className="sc-pedido-id">#{o.id}</span>
                <span className="sc-pedido-fecha" style={{ marginLeft: 8 }}>{formatFecha(o.created_at)}</span>
              </div>
              <span className="sc-pedido-badge" style={{ background: est?.bg, color: est?.color }}>
                {label}
              </span>
            </div>
            <div className="sc-pedido-items">
              {(o.ordenes_items || []).map((item, i) => (
                <div key={i} className={item.anulado ? 'sc-pedido-item-anulado' : ''}>
                  {item.productos?.nombre_comercial || `Producto #${item.producto_id}`} × {item.cantidad}
                  {item.anulado && ' (anulado)'}
                </div>
              ))}
            </div>
            <div className="sc-pedido-footer">
              <span className="sc-pedido-pago">
                {fulfillment?.label || o.tipo_envio} · {o.forma_pago === 'credito' ? 'Crédito' : 'Contado'}
                {o.estado_pago ? ` · Pago: ${o.estado_pago}` : ''}
              </span>
              <span className="sc-pedido-total">{formatearUSD(o.total_usd)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// -----------------------------------------------------------------
// Tab: Presupuestos (unificado: presupuestos + cotizaciones + requerimientos)
// -----------------------------------------------------------------
function TabPresupuestos({ clienteId, crearModal, setCrearModal }) {
  const { confirmar, avisar } = useStaffUI()
  const [presupuestos, setPresupuestos] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [requerimientos, setRequerimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const [modal, setModal] = useState(null) // { tipo: 'presupuesto'|'cotizacion'|'requerimiento', data }

  useEffect(() => {
    let vivo = true
    Promise.all([
      staffApi.get(`/staff/clientes/${clienteId}/presupuestos`).then(({ data }) => setPresupuestos(data || [])),
      staffApi.get(`/staff/clientes/${clienteId}/cotizaciones`).then(({ data }) => setCotizaciones(data || [])),
      staffApi.get(`/staff/clientes/${clienteId}/requerimientos`).then(({ data }) => setRequerimientos(data || [])),
    ])
      .then(() => { if (vivo) setError('') })
      .catch((err) => {
        if (vivo) setError(err.response?.data?.error || 'No se pudieron cargar las solicitudes del cliente')
      })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [clienteId, intento])

  async function recotizar(id) {
    try {
      await staffApi.post(`/staff/presupuestos/${id}/recotizar`)
      const { data } = await staffApi.get(`/staff/clientes/${clienteId}/presupuestos`)
      setPresupuestos(data || [])
    } catch (err) {
      avisar(err.response?.data?.error || 'Error al recotizar', 'error')
    }
  }

  async function generarPedido(id) {
    if (!(await confirmar({ titulo: '¿Generar pedido desde este presupuesto?', textoConfirmar: 'Generar pedido' }))) return
    try {
      await staffApi.post(`/staff/presupuestos/${id}/generar-pedido`)
      const { data } = await staffApi.get(`/staff/clientes/${clienteId}/presupuestos`)
      setPresupuestos(data || [])
    } catch (err) {
      avisar(err.response?.data?.error || 'Error al generar pedido', 'error')
    }
  }

  async function responderCotizacion(id, payload) {
    const { data } = await staffApi.patch(`/staff/cotizaciones/${id}/responder`, payload)
    setCotizaciones((prev) => prev.map((c) => (c.id === id ? data : c)))
  }

  async function rechazarCotizacion(id, payload) {
    const { data } = await staffApi.patch(`/staff/cotizaciones/${id}/rechazar`, payload)
    setCotizaciones((prev) => prev.map((c) => (c.id === id ? data : c)))
  }

  async function responderRequerimiento(id, payload) {
    const { data } = await staffApi.patch(`/staff/requerimientos/${id}/responder`, payload)
    setRequerimientos((prev) => prev.map((r) => (r.id === id ? data : r)))
  }

  if (cargando) return <StaffEstado tipo="cargando" filas={3} />
  if (error) return <StaffEstado tipo="error" mensaje={error} onReintentar={() => { setCargando(true); setIntento((n) => n + 1) }} />

  return (
    <>
      {/* Presupuestos propios del cliente y del staff */}
      <div className="sc-subseccion">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p className="sc-subseccion-title" style={{ margin: 0, border: 'none', padding: 0 }}>Presupuestos</p>
          <button className="sc-btn sc-btn--primary" onClick={() => setCrearModal(true)}>Crear presupuesto</button>
        </div>
        {presupuestos.length === 0 ? (
          <p className="sc-vacio">Sin presupuestos.</p>
        ) : (
          <div className="sc-lista-solicitudes">
            {presupuestos.map((p) => (
              <div key={p.id} className="sc-solicitud-card" onClick={() => setModal({ tipo: 'presupuesto', data: p })}>
                <div className="sc-solicitud-info">
                  <span className="sc-solicitud-id">#{p.numero || p.id}</span>
                  <span className="sc-solicitud-meta" style={{ marginLeft: 8 }}>{formatFecha(p.fecha_creacion)} · {formatearUSD(p.total_usd)}</span>
                </div>
                <div className="sc-solicitud-acciones">
                  <span className={`sc-badge ${p.estado === 'vigente' ? 'sc-badge--activo' : 'sc-badge--tipo'}`}>{p.estado}</span>
                  <button onClick={(e) => { e.stopPropagation(); recotizar(p.id) }}>Recotizar</button>
                  <button onClick={(e) => { e.stopPropagation(); generarPedido(p.id) }}>Generar pedido</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cotizaciones */}
      <div className="sc-subseccion">
        <p className="sc-subseccion-title">Cotizaciones</p>
        {cotizaciones.length === 0 ? (
          <p className="sc-vacio">Sin cotizaciones.</p>
        ) : (
          <div className="sc-lista-solicitudes">
            {cotizaciones.map((c) => (
              <div key={c.id} className="sc-solicitud-card" onClick={() => setModal({ tipo: 'cotizacion', data: c })}>
                <div className="sc-solicitud-info">
                  <span className="sc-solicitud-id">#{c.id}</span>
                  <span className="sc-solicitud-meta" style={{ marginLeft: 8 }}>
                    {c.productos?.nombre_comercial || 'Producto'} · {formatFecha(c.fecha_solicitud)}
                  </span>
                </div>
                <div className="sc-solicitud-acciones">
                  <span className={`sc-badge ${c.estado === 'pendiente' ? 'sc-badge--tipo' : c.estado === 'cotizada' ? 'sc-badge--activo' : 'sc-badge--bloqueado'}`}>{c.estado}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Requerimientos */}
      <div className="sc-subseccion">
        <p className="sc-subseccion-title">Requerimientos</p>
        {requerimientos.length === 0 ? (
          <p className="sc-vacio">Sin requerimientos.</p>
        ) : (
          <div className="sc-lista-solicitudes">
            {requerimientos.map((r) => (
              <div key={r.id} className="sc-solicitud-card" onClick={() => setModal({ tipo: 'requerimiento', data: r })}>
                <div className="sc-solicitud-info">
                  <span className="sc-solicitud-id">#{r.id}</span>
                  <span className="sc-solicitud-meta" style={{ marginLeft: 8 }}>
                    {r.requerimiento_items?.length || 0} items · {formatFecha(r.fecha_solicitud)}
                  </span>
                </div>
                <div className="sc-solicitud-acciones">
                  <span className={`sc-badge ${r.estado === 'pendiente' ? 'sc-badge--tipo' : 'sc-badge--activo'}`}>{r.estado}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detalle Presupuesto */}
      {modal?.tipo === 'presupuesto' && (
        <StaffModal titulo={`Presupuesto #${modal.data.numero || modal.data.id}`} ancho="sm" onCerrar={() => setModal(null)}>
          <div className="odm-header">
            <div>
              <p className="odm-fecha">{formatFecha(modal.data.fecha_creacion)}</p>
            </div>
            <span className="odm-badge" style={{
              background: modal.data.estado === 'vigente' ? '#d1fae5' : '#f3f4f6',
              color: modal.data.estado === 'vigente' ? '#059669' : '#6b7280',
            }}>{modal.data.estado}</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '8px 0 16px' }}>
            Expira: {formatFecha(modal.data.fecha_expiracion)} · Total: {formatearUSD(modal.data.total_usd)}
          </p>
          <div className="kb-modal-acciones">
            <button className="kb-btn-rechazar" onClick={() => { setModal(null); recotizar(modal.data.id) }}>Recotizar</button>
            <button className="kb-btn-responder" onClick={() => { setModal(null); generarPedido(modal.data.id) }}>Generar pedido</button>
          </div>
        </StaffModal>
      )}

      {/* Modal Detalle Cotización */}
      {modal?.tipo === 'cotizacion' && (
        <ModalCotizacion
          cotizacion={modal.data}
          onClose={() => setModal(null)}
          onResponder={responderCotizacion}
          onRechazar={rechazarCotizacion}
        />
      )}

      {/* Modal Detalle Requerimiento */}
      {modal?.tipo === 'requerimiento' && (
        <ModalRequerimientoDetalle
          requerimiento={modal.data}
          onClose={() => setModal(null)}
          onResponder={responderRequerimiento}
        />
      )}

      {/* Modal Crear Presupuesto */}
      {crearModal && (
        <ModalCrearPresupuesto
          clienteId={clienteId}
          onClose={() => setCrearModal(false)}
          onCreado={async () => {
            const { data } = await staffApi.get(`/staff/clientes/${clienteId}/presupuestos`)
            setPresupuestos(data || [])
            setCrearModal(false)
          }}
        />
      )}
    </>
  )
}



// -----------------------------------------------------------------
// Tab: Documentos
// -----------------------------------------------------------------
function TabDocumentos({ clienteId }) {
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccionada, setSeleccionada] = useState(null)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vivo = true
    staffApi.get('/staff/documentos', { params: { usuario_id: clienteId } })
      .then(({ data }) => {
        if (!vivo) return
        setSolicitudes(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((err) => {
        if (vivo) setError(err.response?.data?.error || 'No se pudieron cargar los documentos del cliente')
      })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [clienteId, intento])

  async function handleAprobar(id, payload) {
    const { data } = await staffApi.patch(`/staff/documentos/${id}/aprobar`, payload)
    setSolicitudes((prev) => prev.map((s) => (s.id === id ? data : s)))
  }

  async function handleRechazar(id, payload) {
    const { data } = await staffApi.patch(`/staff/documentos/${id}/rechazar`, payload)
    setSolicitudes((prev) => prev.map((s) => (s.id === id ? data : s)))
  }

  if (cargando) return <StaffEstado tipo="cargando" filas={3} />
  if (error) return <StaffEstado tipo="error" mensaje={error} onReintentar={() => { setCargando(true); setIntento((n) => n + 1) }} />
  if (!solicitudes.length) return <StaffEstado tipo="vacio" titulo="Sin solicitudes de documentos." />

  return (
    <>
      <div className="sc-lista-solicitudes">
        {solicitudes.map((s) => (
          <div key={s.id} className="sc-doc-card" onClick={() => setSeleccionada(s)}>
            <div className="sc-solicitud-info">
              <span className="sc-solicitud-id">#{s.id}</span>
              <span className="sc-solicitud-meta" style={{ marginLeft: 8 }}>
                {DOC_LABELS[s.tipo_documento] || s.tipo_documento} · {formatFecha(s.fecha_solicitud)}
              </span>
            </div>
            <span className={`sc-badge ${s.estado === 'pendiente' ? 'sc-badge--tipo' : s.estado === 'aprobada' ? 'sc-badge--activo' : 'sc-badge--bloqueado'}`}>
              {s.estado}
            </span>
          </div>
        ))}
      </div>

      {/* Modal Documento — reutiliza patrón de StaffDocumentos */}
      {seleccionada && (
        <ModalDocumentoCompacto
          solicitud={seleccionada}
          onClose={() => setSeleccionada(null)}
          onAprobar={handleAprobar}
          onRechazar={handleRechazar}
        />
      )}
    </>
  )
}

function ModalDocumentoCompacto({ solicitud, onClose, onAprobar, onRechazar }) {
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  if (!solicitud) return null

  async function handleAprobar() {
    setEnviando(true)
    try { await onAprobar(solicitud.id, { nota_admin: nota || undefined }); onClose() }
    catch (err) { setError(err.response?.data?.error || 'Error') }
    finally { setEnviando(false) }
  }

  async function handleRechazar() {
    setEnviando(true)
    try { await onRechazar(solicitud.id, { nota_admin: nota || undefined }); onClose() }
    catch (err) { setError(err.response?.data?.error || 'Error') }
    finally { setEnviando(false) }
  }

  return (
    <StaffModal titulo={`Solicitud #${solicitud.id}`} ancho="sm" onCerrar={onClose} bloqueado={enviando}>
      <div className="odm-header">
        <div>
          <p className="odm-fecha">{formatFecha(solicitud.fecha_solicitud)}</p>
        </div>
        <span className="odm-badge" style={{
          background: solicitud.estado === 'pendiente' ? '#fef3c7' : solicitud.estado === 'aprobada' ? '#d1fae5' : '#fee2e2',
          color: solicitud.estado === 'pendiente' ? '#f59e0b' : solicitud.estado === 'aprobada' ? '#059669' : '#dc2626',
        }}>{solicitud.estado}</span>
      </div>
      <div className="odm-section" style={{ marginTop: 12 }}>
        <p className="odm-section-title">{DOC_LABELS[solicitud.tipo_documento]}</p>
        {solicitud.descripcion && <p className="odm-notas">{solicitud.descripcion}</p>}
      </div>
      {solicitud.estado === 'pendiente' && !solicitud.es_automatica && (
        <div className="odm-section" style={{ marginTop: 12 }}>
          <textarea placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)}
            rows={2} className="odm-estado-select" style={{ resize: 'vertical', marginBottom: 10, width: '100%', boxSizing: 'border-box' }} />
          {error && <p className="kb-error">{error}</p>}
          <div className="kb-modal-acciones">
            <button className="kb-btn-rechazar" onClick={handleRechazar} disabled={enviando}>Rechazar</button>
            <button className="kb-btn-responder" onClick={handleAprobar} disabled={enviando}>
              {enviando ? 'Guardando...' : 'Marcar como enviado'}
            </button>
          </div>
        </div>
      )}
    </StaffModal>
  )
}

// -----------------------------------------------------------------
// Página principal: Ficha del Cliente
// -----------------------------------------------------------------
function StaffClienteFicha() {
  const { avisar } = useStaffUI()
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('resumen')
  const [cliente, setCliente] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [credito, setCredito] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [crearModal, setCrearModal] = useState(false)
  const [etiquetas, setEtiquetas] = useState([])
  const [editandoEtiqueta, setEditandoEtiqueta] = useState(false)
  const [etiquetaDraft, setEtiquetaDraft] = useState('')
  const [guardandoEtiqueta, setGuardandoEtiqueta] = useState(false)

  useEffect(() => {
    let vivo = true
    staffApi.get(`/staff/clientes/${id}/detalle`)
      .then(({ data }) => {
        if (!vivo) return
        setCliente(data.cliente)
        setPerfil(data.perfil)
        setCredito(data.credito)
        setEtiquetas(data.etiquetas || [])
      })
      .catch((err) => {
        if (!vivo) return
        setError(err.response?.data?.error || 'Error al cargar cliente')
      })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [id])

  function iniciarEdicionEtiqueta() {
    setEtiquetaDraft(cliente?.etiqueta || '')
    setEditandoEtiqueta(true)
  }

  async function guardarEtiqueta() {
    setGuardandoEtiqueta(true)
    try {
      const { data } = await staffApi.patch(`/staff/clientes/${id}`, { etiqueta: etiquetaDraft })
      setCliente((prev) => ({ ...prev, etiqueta: data.cliente?.etiqueta ?? null }))
      if (Array.isArray(data.etiquetas)) setEtiquetas(data.etiquetas)
      setEditandoEtiqueta(false)
    } catch (err) {
      avisar(err.response?.data?.error || 'Error al guardar la etiqueta', 'error')
    } finally {
      setGuardandoEtiqueta(false)
    }
  }

  function porcentajeDeEtiqueta(etiqueta) {
    const e = (etiquetas || []).find((x) => x.etiqueta === etiqueta)
    return e ? Number(e.porcentaje) : null
  }

  const tabs = [
    { id: 'resumen', texto: 'Resumen' },
    { id: 'pedidos', texto: 'Pedidos' },
    { id: 'presupuestos', texto: 'Solicitudes' },
    { id: 'documentos', texto: 'Documentos' },
  ]

  if (cargando) {
    return (
      <LayoutDepartamento departamento="comercial" activo="clientes" titulo="Ficha del cliente">
        <StaffEstado tipo="cargando" filas={4} />
      </LayoutDepartamento>
    )
  }

  if (error) {
    return (
      <LayoutDepartamento departamento="comercial" activo="clientes" titulo="Ficha del cliente">
        <p className="sc-vacio">{error}</p>
      </LayoutDepartamento>
    )
  }

  const iniciales = (cliente?.nombre || '?').trim().charAt(0).toUpperCase()

  return (
    <LayoutDepartamento departamento="comercial" activo="clientes" titulo={cliente?.nombre || 'Ficha del cliente'}>
      <div className="sc-ficha">
        <div className="sc-ficha__header">
          <div className="sc-avatar">{iniciales}</div>
          <div className="sc-ficha__info">
            <h2 className="sc-ficha__nombre">{cliente?.nombre || 'Sin nombre'}</h2>
            <div className="sc-ficha__badges">
              <span className="sc-badge sc-badge--tipo">{cliente?.tipo_usuario}</span>
              <span className="sc-badge sc-badge--tipo">
                {cliente?.etiqueta || 'Sin etiqueta'}
                {(() => {
                  const p = porcentajeDeEtiqueta(cliente?.etiqueta)
                  return p != null ? (p > 0 ? ` · −${p}%` : ` · +${-p}%`) : ''
                })()}
              </span>
              {editandoEtiqueta && (
                <span className="sc-etiqueta-editor">
                  <select value={etiquetaDraft} onChange={(e) => setEtiquetaDraft(e.target.value)}>
                    <option value="">— Sin etiqueta —</option>
                    {etiquetas.map((e) => (
                      <option key={e.etiqueta} value={e.etiqueta}>
                        {e.etiqueta} · {Number(e.porcentaje) > 0 ? `−${e.porcentaje}%` : `+${-Number(e.porcentaje)}%`}
                      </option>
                    ))}
                  </select>
                  <button className="sc-btn" onClick={guardarEtiqueta} disabled={guardandoEtiqueta}>
                    {guardandoEtiqueta ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button className="sc-btn sc-btn--outline" onClick={() => setEditandoEtiqueta(false)}>Cancelar</button>
                </span>
              )}
              {!editandoEtiqueta && (
                <button className="sc-etiqueta-editar" onClick={iniciarEdicionEtiqueta}><Pencil size={12} /> Cambiar etiqueta</button>
              )}
              {!cliente?.activo && <span className="sc-badge sc-badge--bloqueado">Inactivo</span>}
              {credito?.credito_bloqueado && <span className="sc-badge sc-badge--bloqueado">Crédito bloqueado</span>}
            </div>
          </div>
          <div className="sc-ficha__acciones">
            <button className="sc-btn sc-btn--primary" onClick={() => navigate(`/staff/ordenes?cliente=${id}`)}>
              Crear orden
            </button>
            <button
              className="sc-btn sc-btn--primary"
              onClick={() => {
                setTab('presupuestos')
                setCrearModal(true)
              }}
            >
              Crear presupuesto
            </button>
          </div>
        </div>

        <StaffTabs tabs={tabs} activo={tab} onChange={setTab} />

        <div style={{ paddingTop: 16 }}>
          {tab === 'resumen' && <TabResumen cliente={cliente} perfil={perfil} credito={credito} />}
          {tab === 'pedidos' && <TabPedidos clienteId={id} />}
          {tab === 'presupuestos' && <TabPresupuestos clienteId={id} crearModal={crearModal} setCrearModal={setCrearModal} />}
          {tab === 'documentos' && <TabDocumentos clienteId={id} />}
        </div>
      </div>
    </LayoutDepartamento>
  )
}

export default StaffClienteFicha