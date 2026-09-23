import { useState, useEffect, useCallback } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffTabs from '../../components/staff/StaffTabs'
import './StaffFinanzas.css'

function formatUSD(v) { return Number(v || 0).toFixed(2) }
function formatFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TIPOS_NOTA = [
  { id: 'llamada', texto: 'Llamada' },
  { id: 'promesa_pago', texto: 'Promesa de pago' },
  { id: 'pago_parcial', texto: 'Pago parcial' },
  { id: 'reclamo', texto: 'Reclamo' },
  { id: 'otro', texto: 'Otro' },
]

const TABS = [
  { id: 'clientes', texto: 'Clientes' },
  { id: 'linea', texto: 'Línea de crédito' },
  { id: 'cobros', texto: 'Cobros' },
  { id: 'por-verificar', texto: 'Por verificar' },
  { id: 'notas', texto: 'Notas de cobranza' },
]

function AgingBadge({ monto, label }) {
  if (!monto) return null
  let color = '#16A34A'
  if (label === '31-60') color = '#CA8A04'
  else if (label === '61-90') color = '#EA580C'
  else if (label === '90+') color = '#DC2626'
  return (
    <span className="scr-aging-badge" style={{ background: color + '18', color, borderColor: color }}>
      {label}d: ${formatUSD(monto)}
    </span>
  )
}

// ------------------------------------------------------------------
// Tab: Cobros (registrar abono + historial) — migrado de StaffPagos
// ------------------------------------------------------------------
function TabCobros() {
  const [pagos, setPagos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [nuevo, setNuevo] = useState({ usuario_id: '', monto: '', tipo: 'abono', detalle: '' })
  const [guardando, setGuardando] = useState(false)

  async function cargarPagos() {
    try {
      const { data } = await staffApi.get('/staff/contabilidad/pagos')
      setPagos(data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los pagos')
    } finally {
      setCargando(false)
    }
  }

  async function registrarPago(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await staffApi.post('/staff/contabilidad/pagos', {
        usuario_id: nuevo.usuario_id,
        monto: Number(nuevo.monto),
        tipo: nuevo.tipo,
        detalle: nuevo.detalle || undefined,
      })
      setNuevo({ usuario_id: '', monto: '', tipo: 'abono', detalle: '' })
      await cargarPagos()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar el pago')
    } finally {
      setGuardando(false)
    }
  }

  useEffect(() => {
    let activo = true
    staffApi.get('/staff/contabilidad/pagos')
      .then(({ data }) => { if (activo) setPagos(data) })
      .catch((err) => { if (activo) setError(err.response?.data?.error || 'No se pudieron cargar los pagos') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  return (
    <div>
      <h3 className="stf-subtitulo">Registrar abono</h3>
      <form className="stf-form" onSubmit={registrarPago}>
        <div className="stf-form-row">
          <input
            className="stf-input"
            placeholder="ID del cliente (usuario)"
            value={nuevo.usuario_id}
            onChange={(e) => setNuevo({ ...nuevo, usuario_id: e.target.value })}
            required
          />
          <input
            className="stf-input"
            placeholder="Monto USD"
            type="number"
            step="0.01"
            value={nuevo.monto}
            onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value })}
            required
          />
          <select className="stf-input" value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}>
            <option value="abono">Abono</option>
            <option value="contado">Contado</option>
            <option value="reporte_cliente">Reporte de cliente</option>
          </select>
          <input
            className="stf-input"
            placeholder="Detalle (opcional)"
            value={nuevo.detalle}
            onChange={(e) => setNuevo({ ...nuevo, detalle: e.target.value })}
          />
          <button className="stf-btn stf-btn--primary" type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </form>

      {error && <p style={{ color: '#DC2626', marginTop: 8 }}>{error}</p>}

      <h3 className="stf-subtitulo">Historial de pagos</h3>
      {cargando && <p>Cargando...</p>}
      {!cargando && (
        <div className="stf-tabla-wrap">
          <table className="stf-tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Tipo</th>
                <th>Detalle</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr><td colSpan="5">Sin pagos registrados</td></tr>
              ) : (
                pagos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.users?.nombre || `#${p.usuario_id}`}</td>
                    <td>${formatUSD(p.monto)}</td>
                    <td>{p.tipo}</td>
                    <td>{p.detalle || '—'}</td>
                    <td>{formatFecha(p.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Tab: Por verificar (reportes de pago pendientes) — migrado de StaffPagos
// ------------------------------------------------------------------
function TabPorVerificar() {
  const [reportes, setReportes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [reporteAbierto, setReporteAbierto] = useState(null)
  const [accion, setAccion] = useState(null) // 'verificar' | 'rechazar'
  const [notaRechazo, setNotaRechazo] = useState('')
  const [procesando, setProcesando] = useState(false)

  async function cargarReportes() {
    try {
      const { data } = await staffApi.get('/staff/contabilidad/reportes-pago', {
        params: { estado: 'pendiente_verificacion' },
      })
      setReportes(data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los reportes')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    let activo = true
    staffApi.get('/staff/contabilidad/reportes-pago', {
      params: { estado: 'pendiente_verificacion' },
    })
      .then(({ data }) => { if (activo) setReportes(data) })
      .catch((err) => { if (activo) setError(err.response?.data?.error || 'No se pudieron cargar los reportes') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  function abrirVerificar(r) { setReporteAbierto(r); setAccion('verificar') }
  function abrirRechazar(r) { setReporteAbierto(r); setAccion('rechazar'); setNotaRechazo('') }
  function cerrar() { setReporteAbierto(null); setAccion(null); setError('') }

  async function confirmarVerificar() {
    setProcesando(true); setError('')
    try {
      await staffApi.patch(`/staff/contabilidad/reportes-pago/${reporteAbierto.id}/verificar`)
      cerrar()
      await cargarReportes()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo verificar el pago')
    } finally {
      setProcesando(false)
    }
  }

  async function confirmarRechazar() {
    setProcesando(true); setError('')
    try {
      await staffApi.patch(`/staff/contabilidad/reportes-pago/${reporteAbierto.id}/rechazar`, {
        nota_rechazo: notaRechazo.trim() || undefined,
      })
      cerrar()
      await cargarReportes()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo rechazar el pago')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div>
      {error && <p style={{ color: '#DC2626', marginBottom: 8 }}>{error}</p>}
      {cargando && <p>Cargando...</p>}
      {!cargando && reportes.length === 0 && <p>No hay reportes de pago pendientes de verificar.</p>}
      {!cargando && reportes.length > 0 && (
        <div className="stf-tabla-wrap">
          <table className="stf-tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Órdenes</th>
                <th>Monto USD</th>
                <th>Monto Bs</th>
                <th>Fecha</th>
                <th>Comprobante</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {reportes.map((r) => (
                <tr key={r.id}>
                  <td>{r.users?.nombre || `#${r.usuario_id}`}</td>
                  <td>{(r.reporte_pago_ordenes || []).map((v) => `#${v.orden_id}`).join(', ')}</td>
                  <td>${formatUSD(r.monto_usd)}</td>
                  <td>Bs. {Number(r.monto_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                  <td>{formatFecha(r.created_at)}</td>
                  <td>
                    {r.url_comprobante ? (
                      <a href={r.url_comprobante} target="_blank" rel="noreferrer">Ver</a>
                    ) : '—'}
                  </td>
                  <td>
                    <div className="stf-acciones">
                      <button className="stf-btn stf-btn--small stf-btn--primary" onClick={() => abrirVerificar(r)}>Verificar</button>
                      <button className="stf-btn stf-btn--small stf-btn--danger" onClick={() => abrirRechazar(r)}>Rechazar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reporteAbierto && accion === 'verificar' && (
        <div className="stf-modal" onClick={cerrar}>
          <div className="stf-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Verificar pago #{reporteAbierto.id}</h3>
            <p>
              Se confirmará el pago y se avanzará la(s) orden(es) a "Preparando". La factura o recibo
              de cobro se genera aparte en Facturación.
            </p>
            {error && <p style={{ color: '#DC2626', marginTop: 8 }}>{error}</p>}
            <div className="stf-acciones" style={{ marginTop: 14 }}>
              <button className="stf-btn" onClick={cerrar} disabled={procesando}>Cancelar</button>
              <button className="stf-btn stf-btn--primary" onClick={confirmarVerificar} disabled={procesando}>
                {procesando ? 'Verificando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reporteAbierto && accion === 'rechazar' && (
        <div className="stf-modal" onClick={cerrar}>
          <div className="stf-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Rechazar pago #{reporteAbierto.id}</h3>
            <textarea
              className="stf-input"
              value={notaRechazo}
              onChange={(e) => setNotaRechazo(e.target.value)}
              placeholder="Motivo (opcional)"
              rows={3}
            />
            {error && <p style={{ color: '#DC2626', marginTop: 8 }}>{error}</p>}
            <div className="stf-acciones" style={{ marginTop: 14 }}>
              <button className="stf-btn" onClick={cerrar} disabled={procesando}>Cancelar</button>
              <button className="stf-btn stf-btn--danger" onClick={confirmarRechazar} disabled={procesando}>
                {procesando ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Tab: Línea de crédito (aprobar / ajustar monto manualmente)
// ------------------------------------------------------------------
function TabLinea() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [buscar, setBuscar] = useState('')
  const [editando, setEditando] = useState(null)
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    try {
      const { data } = await staffApi.get('/staff/credito/linea/clientes')
      setClientes(data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los clientes')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    let activo = true
    staffApi.get('/staff/credito/linea/clientes')
      .then(({ data }) => { if (activo) setClientes(data) })
      .catch((err) => { if (activo) setError(err.response?.data?.error || 'No se pudieron cargar los clientes') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  const filtrados = clientes.filter((c) => {
    const q = buscar.trim().toLowerCase()
    if (!q) return true
    return (
      (c.nombre || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.rif_cedula || '').toLowerCase().includes(q)
    )
  })

  function abrirEditar(c) {
    setEditando(c)
    setMonto(String(c.linea_credito || ''))
    setMotivo('')
    setError('')
  }

  async function guardar(e) {
    e.preventDefault()
    const valor = Number(monto)
    if (!Number.isFinite(valor) || valor < 0) {
      setError('Ingresa un monto válido (mayor o igual a 0)')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await staffApi.patch(`/staff/credito/linea/clientes/${editando.id}`, {
        linea_credito: valor,
        motivo: motivo.trim() || undefined,
      })
      setEditando(null)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la línea de crédito')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <div className="scr-form-row" style={{ marginBottom: 12 }}>
        <input
          className="stf-input"
          placeholder="Buscar por nombre, email o RIF/CI..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
      </div>

      {error && <p style={{ color: '#DC2626', marginBottom: 8 }}>{error}</p>}
      {cargando && <p>Cargando...</p>}
      {!cargando && (
        <div className="stf-tabla-wrap">
          <table className="stf-tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Línea actual</th>
                <th>Deuda total</th>
                <th>Saldo disponible</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan="6">Sin clientes</td></tr>
              ) : (
                filtrados.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="stf-cliente-cell">
                        <strong>{c.nombre}</strong>
                        <span>{c.email}</span>
                      </div>
                    </td>
                    <td>${formatUSD(c.linea_credito)}</td>
                    <td style={{ color: c.deuda_total > 0 ? '#DC2626' : 'inherit' }}>
                      ${formatUSD(c.deuda_total)}
                    </td>
                    <td>${formatUSD(c.saldo_disponible)}</td>
                    <td>
                      {c.credito_bloqueado
                        ? <span style={{ color: '#DC2626', fontWeight: 600 }}>Bloqueado</span>
                        : c.linea_credito > 0
                          ? <span style={{ color: '#16A34A' }}>Activo</span>
                          : <span style={{ color: '#6B7280' }}>Sin línea</span>
                      }
                    </td>
                    <td>
                      <button className="stf-btn stf-btn--small" onClick={() => abrirEditar(c)}>
                        Editar línea
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <div className="stf-modal" onClick={() => setEditando(null)}>
          <div className="stf-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Línea de crédito — {editando.nombre}</h3>
            <p style={{ margin: '8px 0 4px' }}>Línea actual: ${formatUSD(editando.linea_credito)} · Deuda: ${formatUSD(editando.deuda_total)}</p>
            <form onSubmit={guardar}>
              <div className="stf-form-row" style={{ marginTop: 8 }}>
                <input
                  className="stf-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Monto de la línea USD"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <textarea
                className="stf-input"
                placeholder="Motivo (opcional)"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                style={{ marginTop: 8, width: '100%' }}
              />
              {error && <p style={{ color: '#DC2626', marginTop: 8 }}>{error}</p>}
              <div className="stf-acciones" style={{ marginTop: 14 }}>
                <button className="stf-btn" onClick={() => setEditando(null)} disabled={guardando}>Cancelar</button>
                <button className="stf-btn stf-btn--primary" type="submit" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar línea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function StaffCredito() {
  const [tab, setTab] = useState('clientes')
  const [aging, setAging] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Detalle de cliente
  const [clienteId, setClienteId] = useState(null)
  const [detalle, setDetalle] = useState(null)

  // Notas
  const [notas, setNotas] = useState([])
  const [formNota, setFormNota] = useState({ usuario_id: '', tipo: 'llamada', nota: '', fecha_seguimiento: '' })
  const [enviandoNota, setEnviandoNota] = useState(false)

  // Recordatorio
  const [formRec, setFormRec] = useState({ usuario_id: '', mensaje: '' })
  const [enviandoRec, setEnviandoRec] = useState(false)

  // Cargar aging
  const cargarAging = useCallback(async () => {
    try {
      const { data } = await staffApi.get('/staff/credito/aging')
      setAging(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }, [])

  // Cargar detalle cliente
  const cargarDetalle = useCallback(async (id) => {
    setClienteId(id)
    setDetalle(null)
    try {
      const { data } = await staffApi.get(`/staff/credito/clientes/${id}`)
      setDetalle(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar detalle')
    }
  }, [])

  // Cargar todas las notas
  const cargarNotas = useCallback(async () => {
    try {
      const { data } = await staffApi.get('/staff/credito/notas')
      setNotas(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar notas')
    }
  }, [])

  useEffect(() => {
    let activo = true
    staffApi.get('/staff/credito/aging')
      .then(({ data }) => { if (activo) setAging(data) })
      .catch((err) => { if (activo) setError(err.response?.data?.error || 'Error al cargar datos') })
      .finally(() => { if (activo) setCargando(false) })
    staffApi.get('/staff/credito/notas')
      .then(({ data }) => { if (activo) setNotas(data) })
      .catch((err) => { if (activo) setError(err.response?.data?.error || 'Error al cargar notas') })
    return () => { activo = false }
  }, [])

  // Crear nota
  async function crearNota(e) {
    e.preventDefault()
    if (!formNota.usuario_id || !formNota.nota) return
    setEnviandoNota(true)
    try {
      await staffApi.post('/staff/credito/notas', {
        usuario_id: Number(formNota.usuario_id),
        tipo: formNota.tipo,
        nota: formNota.nota,
        fecha_seguimiento: formNota.fecha_seguimiento || null,
      })
      setFormNota({ usuario_id: '', tipo: 'llamada', nota: '', fecha_seguimiento: '' })
      cargarNotas()
      if (clienteId) cargarDetalle(clienteId)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear nota')
    } finally {
      setEnviandoNota(false)
    }
  }

  // Enviar recordatorio
  async function enviarRecordatorio(e) {
    e.preventDefault()
    if (!formRec.usuario_id || !formRec.mensaje) return
    setEnviandoRec(true)
    try {
      await staffApi.post('/staff/credito/recordatorio', {
        usuario_id: Number(formRec.usuario_id),
        mensaje: formRec.mensaje,
      })
      setFormRec({ usuario_id: '', mensaje: '' })
      alert('Recordatorio enviado')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar recordatorio')
    } finally {
      setEnviandoRec(false)
    }
  }

  // Toggle bloqueo
  async function toggleBloqueo(cliente) {
    const accion = cliente.credito_bloqueado ? 'desbloquear' : 'bloquear'
    const motivo = accion === 'bloquear'
      ? prompt('Motivo del bloqueo (opcional):')
      : null
    if (accion === 'bloquear' && motivo === null) return // cancelado

    try {
      await staffApi.patch(`/staff/credito/bloquear/${cliente.id}`, {
        bloqueado: accion === 'bloquear',
        motivo: motivo || undefined,
      })
      cargarAging()
      if (detalle?.cliente?.id === cliente.id) cargarDetalle(cliente.id)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar bloqueo')
    }
  }

  // --- Vista detalle de cliente ---
  if (clienteId && detalle) {
    return (
      <LayoutDepartamento departamento="finanzas" activo="credito" titulo="Crédito y cobranza">
        <button className="stf-btn stf-btn--ghost" onClick={() => { setClienteId(null); setDetalle(null) }}>
          ← Volver a lista
        </button>

        {error && <p style={{ color: '#DC2626' }}>{error}</p>}

        <div className="scr-detalle-header">
          <h3>{detalle.cliente.nombre}</h3>
          <span>{detalle.cliente.email}</span>
          {detalle.cliente.rif_cedula && <span>RIF/CI: {detalle.cliente.rif_cedula}</span>}
        </div>

        {/* Resumen */}
        <div className="stf-grid-3">
          <div className="stf-stat">
            <span className="stf-stat-label">Línea de crédito</span>
            <span className="stf-stat-valor">${formatUSD(detalle.resumen.linea_credito)}</span>
          </div>
          <div className="stf-stat">
            <span className="stf-stat-label">Deuda total</span>
            <span className="stf-stat-valor" style={{ color: detalle.resumen.deuda_total > 0 ? '#DC2626' : 'inherit' }}>
              ${formatUSD(detalle.resumen.deuda_total)}
            </span>
          </div>
          <div className="stf-stat">
            <span className="stf-stat-label">Saldo disponible</span>
            <span className="stf-stat-valor">${formatUSD(detalle.resumen.saldo)}</span>
          </div>
        </div>

        {/* Bloqueo */}
        <div className="scr-bloqueo-bar">
          <span>
            Estado: {detalle.resumen.credito_bloqueado
              ? <strong style={{ color: '#DC2626' }}>BLOQUEADO</strong>
              : <strong style={{ color: '#16A34A' }}>Activo</strong>
            }
            {detalle.resumen.credito_bloqueado_motivo && ` — ${detalle.resumen.credito_bloqueado_motivo}`}
          </span>
          <button
            className={`stf-btn stf-btn--small ${detalle.resumen.credito_bloqueado ? 'stf-btn--success' : 'stf-btn--danger'}`}
            onClick={() => toggleBloqueo({ id: clienteId, credito_bloqueado: detalle.resumen.credito_bloqueado })}
          >
            {detalle.resumen.credito_bloqueado ? 'Desbloquear crédito' : 'Bloquear crédito'}
          </button>
        </div>

        {/* Aging buckets */}
        <h4 className="stf-subtitulo">Deuda por antigüedad</h4>
        <div className="scr-aging-row">
          <AgingBadge monto={detalle.resumen.buckets['0-30']} label="0-30" />
          <AgingBadge monto={detalle.resumen.buckets['31-60']} label="31-60" />
          <AgingBadge monto={detalle.resumen.buckets['61-90']} label="61-90" />
          <AgingBadge monto={detalle.resumen.buckets['90+']} label="90+" />
        </div>

        {/* Órdenes */}
        <h4 className="stf-subtitulo">Órdenes con deuda</h4>
        <div className="stf-tabla-wrap">
          <table className="stf-tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Total</th>
                <th>Forma pago</th>
                <th>Estado</th>
                <th>Vencimiento</th>
                <th>Días vencida</th>
              </tr>
            </thead>
            <tbody>
              {detalle.ordenes.length === 0 ? (
                <tr><td colSpan="6">Sin órdenes con deuda</td></tr>
              ) : (
                detalle.ordenes.map((o) => (
                  <tr key={o.id} style={{ opacity: o.vencida ? 1 : 0.7 }}>
                    <td>#{o.id}</td>
                    <td>${formatUSD(o.total_usd)}</td>
                    <td>{o.forma_pago}</td>
                    <td>{o.estado}</td>
                    <td>{o.fecha_vencimiento ? formatFecha(o.fecha_vencimiento) : '—'}</td>
                    <td>{o.vencida ? `${o.dias_vencida}d` : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recordatorio */}
        <h4 className="stf-subtitulo">Enviar recordatorio</h4>
        <form className="scr-form-recordatorio" onSubmit={enviarRecordatorio}>
          <input type="hidden" value={clienteId} />
          <textarea
            placeholder="Mensaje para el cliente..."
            value={formRec.mensaje}
            onChange={(e) => setFormRec({ ...formRec, usuario_id: clienteId, mensaje: e.target.value })}
            rows={2}
          />
          <button className="stf-btn stf-btn--primary" disabled={enviandoRec || !formRec.mensaje}>
            {enviandoRec ? 'Enviando...' : 'Enviar recordatorio'}
          </button>
        </form>

        {/* Notas de cobranza */}
        <h4 className="stf-subtitulo">Notas de cobranza</h4>
        <form className="scr-form-nota" onSubmit={crearNota}>
          <select value={formNota.tipo} onChange={(e) => setFormNota({ ...formNota, tipo: e.target.value })}>
            {TIPOS_NOTA.map((t) => <option key={t.id} value={t.id}>{t.texto}</option>)}
          </select>
          <textarea
            placeholder="Nota..."
            value={formNota.nota}
            onChange={(e) => setFormNota({ ...formNota, usuario_id: clienteId, nota: e.target.value })}
            rows={2}
          />
          <input
            type="date"
            value={formNota.fecha_seguimiento}
            onChange={(e) => setFormNota({ ...formNota, fecha_seguimiento: e.target.value })}
            title="Fecha de seguimiento (opcional)"
          />
          <button className="stf-btn stf-btn--primary" disabled={enviandoNota || !formNota.nota}>
            {enviandoNota ? 'Guardando...' : 'Guardar nota'}
          </button>
        </form>

        <div className="scr-notas-lista">
          {detalle.notas.map((n) => (
            <div key={n.id} className="scr-nota-card">
              <div className="scr-nota-header">
                <span className="scr-nota-tipo">{TIPOS_NOTA.find(t => t.id === n.tipo)?.texto || n.tipo}</span>
                <span className="scr-nota-fecha">{formatFecha(n.created_at)}</span>
              </div>
              <p>{n.nota}</p>
              {n.fecha_seguimiento && (
                <span className="scr-nota-seguimiento">Seguimiento: {formatFecha(n.fecha_seguimiento)}</span>
              )}
              {n.staff && <span className="scr-nota-staff">Por: {n.staff.nombre}</span>}
            </div>
          ))}
          {detalle.notas.length === 0 && <p style={{ color: '#6B7280' }}>Sin notas de cobranza</p>}
        </div>
      </LayoutDepartamento>
    )
  }

  // --- Vistas principales (tabs) ---
  return (
    <LayoutDepartamento departamento="finanzas" activo="credito" titulo="Crédito y cobranza">
      <StaffTabs tabs={TABS} activo={tab} onChange={setTab} />

      {error && <p style={{ color: '#DC2626' }}>{error}</p>}

      {/* Tab CLIENTES — Aging dashboard */}
      {tab === 'clientes' && (
        <>
          {cargando && <p>Cargando...</p>}
          {!cargando && (
            <div className="stf-tabla-wrap">
              <table className="stf-tabla">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Línea</th>
                    <th>Deuda total</th>
                    <th>Vencida</th>
                    <th>0-30d</th>
                    <th>31-60d</th>
                    <th>61-90d</th>
                    <th>90+d</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {aging.length === 0 ? (
                    <tr><td colSpan="10">No hay clientes con línea de crédito</td></tr>
                  ) : (
                    aging.map((c) => (
                      <tr key={c.id} style={{ opacity: c.deuda_vencida > 0 ? 1 : 0.6 }}>
                        <td>
                          <div className="stf-cliente-cell">
                            <strong>{c.nombre}</strong>
                            <span>{c.email}</span>
                          </div>
                        </td>
                        <td>${formatUSD(c.linea_credito)}</td>
                        <td>${formatUSD(c.deuda_total)}</td>
                        <td style={{ color: c.deuda_vencida > 0 ? '#DC2626' : 'inherit', fontWeight: c.deuda_vencida > 0 ? 600 : 400 }}>
                          ${formatUSD(c.deuda_vencida)}
                        </td>
                        <td>{c.buckets['0-30'] > 0 ? `$${formatUSD(c.buckets['0-30'])}` : '—'}</td>
                        <td>{c.buckets['31-60'] > 0 ? `$${formatUSD(c.buckets['31-60'])}` : '—'}</td>
                        <td>{c.buckets['61-90'] > 0 ? `$${formatUSD(c.buckets['61-90'])}` : '—'}</td>
                        <td>{c.buckets['90+'] > 0 ? `$${formatUSD(c.buckets['90+'])}` : '—'}</td>
                        <td>
                          {c.credito_bloqueado
                            ? <span style={{ color: '#DC2626', fontWeight: 600 }}>Bloqueado</span>
                            : <span style={{ color: '#16A34A' }}>Activo</span>
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="stf-btn stf-btn--small" onClick={() => cargarDetalle(c.id)}>Ver</button>
                            <button
                              className={`stf-btn stf-btn--small ${c.credito_bloqueado ? 'stf-btn--success' : 'stf-btn--danger'}`}
                              onClick={() => toggleBloqueo(c)}
                            >
                              {c.credito_bloqueado ? 'Activar' : 'Bloquear'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab LÍNEA DE CRÉDITO — aprobar/ajustar línea manualmente */}
      {tab === 'linea' && <TabLinea />}

      {/* Tab COBROS — registrar abonos + historial */}
      {tab === 'cobros' && <TabCobros />}

      {/* Tab POR VERIFICAR — reportes de pago pendientes */}
      {tab === 'por-verificar' && <TabPorVerificar />}

      {/* Tab NOTAS — Listado global + formulario + próximos seguimientos */}
      {tab === 'notas' && (
        <>
          <form className="scr-form-nota-global" onSubmit={crearNota}>
            <div className="scr-form-row">
              <input
                type="number"
                placeholder="ID cliente"
                value={formNota.usuario_id}
                onChange={(e) => setFormNota({ ...formNota, usuario_id: e.target.value })}
                required
              />
              <select value={formNota.tipo} onChange={(e) => setFormNota({ ...formNota, tipo: e.target.value })}>
                {TIPOS_NOTA.map((t) => <option key={t.id} value={t.id}>{t.texto}</option>)}
              </select>
              <input
                type="date"
                value={formNota.fecha_seguimiento}
                onChange={(e) => setFormNota({ ...formNota, fecha_seguimiento: e.target.value })}
                title="Fecha de seguimiento"
              />
            </div>
            <textarea
              placeholder="Nota de cobranza..."
              value={formNota.nota}
              onChange={(e) => setFormNota({ ...formNota, nota: e.target.value })}
              rows={2}
            />
            <button className="stf-btn stf-btn--primary" disabled={enviandoNota || !formNota.usuario_id || !formNota.nota}>
              {enviandoNota ? 'Guardando...' : 'Guardar nota'}
            </button>
          </form>

          <div className="scr-notas-lista">
            {notas.map((n) => (
              <div key={n.id} className="scr-nota-card" style={{ cursor: 'pointer' }} onClick={() => n.usuario_id && cargarDetalle(n.usuario_id)}>
                <div className="scr-nota-header">
                  <span className="scr-nota-tipo">{TIPOS_NOTA.find(t => t.id === n.tipo)?.texto || n.tipo}</span>
                  <span className="scr-nota-cliente">{n.users?.nombre || `Cliente #${n.usuario_id}`}</span>
                  <span className="scr-nota-fecha">{formatFecha(n.created_at)}</span>
                </div>
                <p>{n.nota}</p>
                {n.fecha_seguimiento && (
                  <span className="scr-nota-seguimiento">Seguimiento: {formatFecha(n.fecha_seguimiento)}</span>
                )}
              </div>
            ))}
            {notas.length === 0 && <p style={{ color: '#6B7280' }}>Sin notas de cobranza</p>}
          </div>

          <h3 className="stf-subtitulo">Próximos seguimientos</h3>
          <div className="stf-tabla-wrap">
            <table className="stf-tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Fecha seguimiento</th>
                  <th>Tipo</th>
                  <th>Nota</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {notas
                  .filter((n) => n.fecha_seguimiento)
                  .sort((a, b) => new Date(a.fecha_seguimiento) - new Date(b.fecha_seguimiento))
                  .map((n) => (
                    <tr key={n.id}>
                      <td>{n.users?.nombre || `Cliente #${n.usuario_id}`}</td>
                      <td style={{
                        color: new Date(n.fecha_seguimiento) < new Date() ? '#DC2626' : 'inherit',
                        fontWeight: new Date(n.fecha_seguimiento) < new Date() ? 600 : 400,
                      }}>
                        {formatFecha(n.fecha_seguimiento)}
                      </td>
                      <td>{TIPOS_NOTA.find(t => t.id === n.tipo)?.texto || n.tipo}</td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nota}</td>
                      <td>
                        <button className="stf-btn stf-btn--small" onClick={() => cargarDetalle(n.usuario_id)}>Ver cliente</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </>
      )}
    </LayoutDepartamento>
  )
}

export default StaffCredito