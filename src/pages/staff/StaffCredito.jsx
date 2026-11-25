import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, ArrowRight } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffTabs from '../../components/staff/StaffTabs'
import BuscadorCliente from '../../components/staff/BuscadorCliente'
import './StaffFinanzas.css'
import './StaffTesoreria.css'
import './StaffCredito.css'
import { formatearUSD, formatearVES } from '../../utils/formato'
import StaffEstado from '../../components/staff/StaffEstado'
import StaffModal from '../../components/staff/StaffModal'

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

// La pestaña "Clientes" (aging + bloqueo + detalle) se fusionó con
// StaffCuentasPorCobrar.jsx — ahí vive una sola ficha de cliente en vez de
// dos pantallas separadas. Aquí quedan las 4 pestañas restantes.
const TABS = [
  { id: 'linea', texto: 'Línea de crédito' },
  { id: 'cobros', texto: 'Cobros' },
  { id: 'por-verificar', texto: 'Por verificar' },
  { id: 'notas', texto: 'Notas de cobranza' },
]

// ------------------------------------------------------------------
// Tab: Cobros (registrar abono + historial)
// ------------------------------------------------------------------
function TabCobros() {
  const [pagos, setPagos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [cliente, setCliente] = useState(null)
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState('abono')
  const [detalleTexto, setDetalleTexto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargarPagos = useCallback(() => {
    staffApi.get('/staff/contabilidad/pagos')
      .then(({ data }) => { setPagos(data); setError('') })
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar los pagos'))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    Promise.resolve().then(cargarPagos)
  }, [cargarPagos])

  async function registrarPago(e) {
    e.preventDefault()
    if (!cliente || !monto) return
    setError('')
    setGuardando(true)
    try {
      await staffApi.post('/staff/contabilidad/pagos', {
        usuario_id: cliente.id,
        monto: Number(monto),
        tipo,
        detalle: detalleTexto.trim() || undefined,
      })
      setCliente(null)
      setMonto('')
      setTipo('abono')
      setDetalleTexto('')
      cargarPagos()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar el pago')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="scr-seccion">
      <h3 className="stf-subtitulo">Registrar abono</h3>
      <form className="scr-form-card" onSubmit={registrarPago}>
        <BuscadorCliente value={cliente} onSeleccionar={setCliente} />
        <div className="scr-form-fila">
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Monto USD"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="abono">Abono</option>
            <option value="contado">Contado</option>
            <option value="reporte_cliente">Reporte de cliente</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Detalle (opcional)"
          value={detalleTexto}
          onChange={(e) => setDetalleTexto(e.target.value)}
        />
        <button type="submit" className="stf-btn stf-btn--primary" disabled={guardando || !cliente || !monto}>
          {guardando ? 'Guardando...' : 'Registrar abono'}
        </button>
      </form>

      {error && <p className="stf-error" role="alert">{error}</p>}

      <h3 className="stf-subtitulo">Historial de pagos</h3>
      {cargando && <StaffEstado tipo="cargando" />}
      {!cargando && pagos.length === 0 && <p className="st-vacio-nota">Sin pagos registrados.</p>}
      {!cargando && pagos.length > 0 && (
        <div className="scr-lista">
          {pagos.map((p) => (
            <div key={p.id} className="scr-item">
              <div className="scr-item-info">
                <span className="scr-item-titulo">{p.users?.nombre || `Cliente #${p.usuario_id}`}</span>
                <span className="scr-item-sub">{p.tipo}{p.detalle ? ` · ${p.detalle}` : ''} · {formatFecha(p.created_at)}</span>
              </div>
              <span className="scr-item-monto scr-item-monto--positivo">{formatearUSD(p.monto)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Tab: Por verificar (reportes de pago pendientes)
// ------------------------------------------------------------------
function TabPorVerificar() {
  const [reportes, setReportes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [reporteAbierto, setReporteAbierto] = useState(null)
  const [accion, setAccion] = useState(null) // 'verificar' | 'rechazar'
  const [notaRechazo, setNotaRechazo] = useState('')
  const [procesando, setProcesando] = useState(false)

  const cargarReportes = useCallback(() => {
    staffApi.get('/staff/contabilidad/reportes-pago', { params: { estado: 'pendiente_verificacion' } })
      .then(({ data }) => { setReportes(data); setError('') })
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar los reportes'))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    Promise.resolve().then(cargarReportes)
  }, [cargarReportes])

  function abrirVerificar(r) { setReporteAbierto(r); setAccion('verificar') }
  function abrirRechazar(r) { setReporteAbierto(r); setAccion('rechazar'); setNotaRechazo('') }
  function cerrar() { setReporteAbierto(null); setAccion(null); setError('') }

  async function confirmarVerificar() {
    setProcesando(true); setError('')
    try {
      await staffApi.patch(`/staff/contabilidad/reportes-pago/${reporteAbierto.id}/verificar`)
      cerrar()
      cargarReportes()
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
      cargarReportes()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo rechazar el pago')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="scr-seccion">
      {error && <p className="stf-error" role="alert">{error}</p>}
      {cargando && <StaffEstado tipo="cargando" />}
      {!cargando && reportes.length === 0 && <p className="st-vacio-nota">No hay reportes de pago pendientes de verificar.</p>}
      {!cargando && reportes.length > 0 && (
        <div className="scr-lista">
          {reportes.map((r) => (
            <div key={r.id} className="scr-card">
              <div className="scr-card-cabecera">
                <span className="scr-card-titulo">{r.users?.nombre || `Cliente #${r.usuario_id}`}</span>
                <span className="scr-item-monto">{formatearUSD(r.monto_usd)}</span>
              </div>
              <div className="scr-card-meta">
                <span>Órdenes: {(r.reporte_pago_ordenes || []).map((v) => `#${v.orden_id}`).join(', ') || '—'}</span>
                <span>{formatearVES(r.monto_bs)}</span>
                <span>{formatFecha(r.created_at)}</span>
                {r.url_comprobante && (
                  <a href={r.url_comprobante} target="_blank" rel="noreferrer" className="scr-link">
                    <ExternalLink size={12} /> Comprobante
                  </a>
                )}
              </div>
              <div className="stf-acciones">
                <button type="button" className="stf-btn stf-btn--small stf-btn--primary" onClick={() => abrirVerificar(r)}>Verificar</button>
                <button type="button" className="stf-btn stf-btn--small stf-btn--danger" onClick={() => abrirRechazar(r)}>Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reporteAbierto && accion === 'verificar' && (
        <StaffModal titulo={`Verificar pago #${reporteAbierto.id}`} ancho="sm" onCerrar={cerrar} bloqueado={procesando}>
          <div className="stf-modal-content">
            <p>
              Se confirmará el pago y se avanzará la(s) orden(es) a "Preparando". La factura o recibo
              de cobro se genera aparte en Facturación.
            </p>
            {error && <p className="stf-error" role="alert">{error}</p>}
            <div className="stf-acciones scr-modal-acciones">
              <button type="button" className="stf-btn" onClick={cerrar} disabled={procesando}>Cancelar</button>
              <button type="button" className="stf-btn stf-btn--primary" onClick={confirmarVerificar} disabled={procesando}>
                {procesando ? 'Verificando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </StaffModal>
      )}

      {reporteAbierto && accion === 'rechazar' && (
        <StaffModal titulo={`Rechazar pago #${reporteAbierto.id}`} ancho="sm" onCerrar={cerrar} bloqueado={procesando}>
          <div className="stf-modal-content">
            <textarea
              className="stf-input"
              value={notaRechazo}
              onChange={(e) => setNotaRechazo(e.target.value)}
              placeholder="Motivo (opcional)"
              rows={3}
            />
            {error && <p className="stf-error" role="alert">{error}</p>}
            <div className="stf-acciones scr-modal-acciones">
              <button type="button" className="stf-btn" onClick={cerrar} disabled={procesando}>Cancelar</button>
              <button type="button" className="stf-btn stf-btn--danger" onClick={confirmarRechazar} disabled={procesando}>
                {procesando ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </StaffModal>
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

  const cargar = useCallback(() => {
    staffApi.get('/staff/credito/linea/clientes')
      .then(({ data }) => { setClientes(data); setError('') })
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar los clientes'))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    Promise.resolve().then(cargar)
  }, [cargar])

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
      cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la línea de crédito')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="scr-seccion">
      <div className="scr-buscador-texto">
        <input
          type="text"
          placeholder="Buscar por nombre, email o RIF/CI..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
      </div>

      {error && <p className="stf-error" role="alert">{error}</p>}
      {cargando && <StaffEstado tipo="cargando" />}
      {!cargando && filtrados.length === 0 && <p className="st-vacio-nota">Sin clientes.</p>}
      {!cargando && filtrados.length > 0 && (
        <div className="scr-lista">
          {filtrados.map((c) => (
            <div key={c.id} className="scr-card">
              <div className="scr-card-cabecera">
                <span className="scr-card-titulo">{c.nombre}</span>
                {c.credito_bloqueado ? (
                  <span className="scr-estado scr-estado--bloqueado">Bloqueado</span>
                ) : c.linea_credito > 0 ? (
                  <span className="scr-estado scr-estado--activo">Activo</span>
                ) : (
                  <span className="scr-estado">Sin línea</span>
                )}
              </div>
              <div className="scr-card-meta">
                <span>{c.email}</span>
                <span>Línea {formatearUSD(c.linea_credito)}</span>
                <span className={c.deuda_total > 0 ? 'scr-texto-negativo' : ''}>Deuda {formatearUSD(c.deuda_total)}</span>
                <span>Saldo {formatearUSD(c.saldo_disponible)}</span>
              </div>
              <div className="stf-acciones">
                <button type="button" className="stf-btn stf-btn--small" onClick={() => abrirEditar(c)}>Editar línea</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <StaffModal titulo={`Línea de crédito — ${editando.nombre}`} ancho="sm" onCerrar={() => setEditando(null)} bloqueado={guardando}>
          <div className="stf-modal-content">
            <p className="scr-modal-info">Línea actual: {formatearUSD(editando.linea_credito)} · Deuda: {formatearUSD(editando.deuda_total)}</p>
            <form onSubmit={guardar} className="scr-form-card">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Monto de la línea USD"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                autoFocus
              />
              <textarea
                placeholder="Motivo (opcional)"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
              />
              {error && <p className="stf-error" role="alert">{error}</p>}
              <div className="stf-acciones scr-modal-acciones">
                <button type="button" className="stf-btn" onClick={() => setEditando(null)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="stf-btn stf-btn--primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar línea'}
                </button>
              </div>
            </form>
          </div>
        </StaffModal>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Tab: Notas de cobranza (listado global + formulario + próximos seguimientos)
// ------------------------------------------------------------------
function TabNotas() {
  const navigate = useNavigate()
  const [notas, setNotas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [cliente, setCliente] = useState(null)
  const [tipo, setTipo] = useState('llamada')
  const [nota, setNota] = useState('')
  const [fechaSeguimiento, setFechaSeguimiento] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargarNotas = useCallback(() => {
    staffApi.get('/staff/credito/notas')
      .then(({ data }) => { setNotas(data); setError('') })
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar las notas'))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    Promise.resolve().then(cargarNotas)
  }, [cargarNotas])

  async function crearNota(e) {
    e.preventDefault()
    if (!cliente || !nota.trim()) return
    setEnviando(true)
    try {
      await staffApi.post('/staff/credito/notas', {
        usuario_id: cliente.id,
        tipo,
        nota: nota.trim(),
        fecha_seguimiento: fechaSeguimiento || null,
      })
      setCliente(null)
      setTipo('llamada')
      setNota('')
      setFechaSeguimiento('')
      cargarNotas()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la nota')
    } finally {
      setEnviando(false)
    }
  }

  function verCliente(usuarioId) {
    if (usuarioId) navigate(`/staff/cuentas-por-cobrar?cliente=${usuarioId}`)
  }

  const seguimientos = notas
    .filter((n) => n.fecha_seguimiento)
    .sort((a, b) => new Date(a.fecha_seguimiento) - new Date(b.fecha_seguimiento))

  return (
    <div className="scr-seccion">
      <h3 className="stf-subtitulo">Nueva nota</h3>
      <form className="scr-form-card" onSubmit={crearNota}>
        <BuscadorCliente value={cliente} onSeleccionar={setCliente} />
        <div className="scr-form-fila">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_NOTA.map((t) => <option key={t.id} value={t.id}>{t.texto}</option>)}
          </select>
          <input
            type="date"
            value={fechaSeguimiento}
            onChange={(e) => setFechaSeguimiento(e.target.value)}
            title="Fecha de seguimiento (opcional)"
          />
        </div>
        <textarea
          placeholder="Nota de cobranza..."
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
        />
        <button type="submit" className="stf-btn stf-btn--primary" disabled={enviando || !cliente || !nota.trim()}>
          {enviando ? 'Guardando...' : 'Guardar nota'}
        </button>
      </form>

      {error && <p className="stf-error" role="alert">{error}</p>}

      <h3 className="stf-subtitulo">Próximos seguimientos</h3>
      {cargando && <StaffEstado tipo="cargando" />}
      {!cargando && seguimientos.length === 0 && <p className="st-vacio-nota">Sin seguimientos pendientes.</p>}
      {!cargando && seguimientos.length > 0 && (
        <div className="scr-lista">
          {seguimientos.map((n) => {
            const vencido = new Date(n.fecha_seguimiento) < new Date()
            return (
              <button key={n.id} type="button" className="scr-seguimiento" onClick={() => verCliente(n.usuario_id)}>
                <div className="scr-seguimiento-info">
                  <span className="scr-card-titulo">{n.users?.nombre || `Cliente #${n.usuario_id}`}</span>
                  <span className="scr-item-sub">{TIPOS_NOTA.find((t) => t.id === n.tipo)?.texto || n.tipo} · {n.nota}</span>
                </div>
                <span className={`scr-seguimiento-fecha ${vencido ? 'scr-texto-negativo' : ''}`}>
                  {formatFecha(n.fecha_seguimiento)}
                </span>
                <ArrowRight size={15} className="scr-seguimiento-flecha" />
              </button>
            )
          })}
        </div>
      )}

      <h3 className="stf-subtitulo">Notas recientes</h3>
      {!cargando && notas.length === 0 && <p className="st-vacio-nota">Sin notas de cobranza.</p>}
      {!cargando && notas.length > 0 && (
        <div className="scr-lista">
          {notas.map((n) => (
            <div key={n.id} className="scr-nota-card" onClick={() => verCliente(n.usuario_id)} role="button" tabIndex={0}>
              <div className="scr-nota-header">
                <span className="scr-nota-tipo">{TIPOS_NOTA.find((t) => t.id === n.tipo)?.texto || n.tipo}</span>
                <span className="scr-nota-cliente">{n.users?.nombre || `Cliente #${n.usuario_id}`}</span>
                <span className="scr-nota-fecha">{formatFecha(n.created_at)}</span>
              </div>
              <p>{n.nota}</p>
              {n.fecha_seguimiento && <span className="scr-nota-seguimiento">Seguimiento: {formatFecha(n.fecha_seguimiento)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StaffCredito() {
  const [tab, setTab] = useState('linea')

  return (
    <LayoutDepartamento departamento="finanzas" activo="credito" titulo="Crédito y cobranza">
      <StaffTabs tabs={TABS} activo={tab} onChange={setTab} />

      {tab === 'linea' && <TabLinea />}
      {tab === 'cobros' && <TabCobros />}
      {tab === 'por-verificar' && <TabPorVerificar />}
      {tab === 'notas' && <TabNotas />}
    </LayoutDepartamento>
  )
}

export default StaffCredito