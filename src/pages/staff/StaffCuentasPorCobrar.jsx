import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Lock, Unlock, Send, ShieldAlert, CheckCircle2,
} from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffFinanzas.css'
import './StaffCuentasPorCobrar.css'
import { useStaffUI } from '../../hooks/useStaffUI'
import { formatearUSD } from '../../utils/formato'
import StaffEstado from '../../components/staff/StaffEstado'

const TIPOS_NOTA = [
  { id: 'llamada', texto: 'Llamada' },
  { id: 'promesa_pago', texto: 'Promesa de pago' },
  { id: 'pago_parcial', texto: 'Pago parcial' },
  { id: 'reclamo', texto: 'Reclamo' },
  { id: 'otro', texto: 'Otro' },
]

const BUCKETS = [
  { id: '0-30', label: '0–30d' },
  { id: '31-60', label: '31–60d' },
  { id: '61-90', label: '61–90d' },
  { id: '90+', label: '90+d' },
]

function formatFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ------------------------------------------------------------------
// Cuentas por cobrar: lista de clientes a crédito (con aging) + ficha de
// cliente fusionada. Antes esto eran dos pantallas separadas —
// StaffCuentasPorCobrar (línea/deuda/saldo + órdenes/facturas/pagos) y la
// pestaña "Clientes" de StaffCredito.jsx (aging + bloqueo + notas) — que
// mostraban la misma situación del cliente en dos lugares distintos. Ahora
// es una sola ficha: combina /staff/contabilidad/clientes/:id (facturas,
// pagos) y /staff/credito/clientes/:id (aging, bloqueo, notas) en paralelo.
// ------------------------------------------------------------------
function StaffCuentasPorCobrar() {
  const { avisar, confirmar, pedirTexto } = useStaffUI()
  const [searchParams, setSearchParams] = useSearchParams()

  const [clientes, setClientes] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [error, setError] = useState('')
  const [buscar, setBuscar] = useState('')

  const [clienteId, setClienteId] = useState(searchParams.get('cliente') || null)
  const [detalle, setDetalle] = useState(null)
  const [errorDetalle, setErrorDetalle] = useState('')
  const [bloqueando, setBloqueando] = useState(false)

  const [formNota, setFormNota] = useState({ tipo: 'llamada', nota: '', fecha_seguimiento: '' })
  const [enviandoNota, setEnviandoNota] = useState(false)
  const [mensajeRec, setMensajeRec] = useState('')
  const [enviandoRec, setEnviandoRec] = useState(false)

  const cargarLista = useCallback(() => {
    setCargandoLista(true)
    staffApi.get('/staff/credito/aging')
      .then(({ data }) => { setClientes(data); setError('') })
      .catch((err) => setError(err.response?.data?.error || 'No se pudo cargar el resumen de clientes'))
      .finally(() => setCargandoLista(false))
  }, [])

  useEffect(() => {
    Promise.resolve().then(cargarLista)
  }, [cargarLista])

  const cargarDetalle = useCallback((id) => {
    setErrorDetalle('')
    setDetalle(null)
    Promise.all([
      staffApi.get(`/staff/contabilidad/clientes/${id}`),
      staffApi.get(`/staff/credito/clientes/${id}`),
    ])
      .then(([contab, credito]) => {
        setDetalle({
          cliente: credito.data.cliente,
          resumen: {
            linea_credito: credito.data.resumen.linea_credito,
            deuda_total: credito.data.resumen.deuda_total,
            saldo: credito.data.resumen.saldo,
            credito_bloqueado: credito.data.resumen.credito_bloqueado,
            credito_bloqueado_motivo: credito.data.resumen.credito_bloqueado_motivo,
            buckets: credito.data.resumen.buckets,
          },
          ordenes: credito.data.ordenes || [],
          facturas: contab.data.facturas || [],
          pagos: contab.data.pagos || [],
          notas: credito.data.notas || [],
        })
      })
      .catch((err) => setErrorDetalle(err.response?.data?.error || 'No se pudo cargar la ficha del cliente'))
  }, [])

  // Si se llega con ?cliente=ID (p. ej. desde las notas de cobranza en
  // Crédito y cobranza), abre esa ficha directamente.
  useEffect(() => {
    if (clienteId) Promise.resolve().then(() => cargarDetalle(clienteId))
  }, [clienteId, cargarDetalle])

  function abrir(id) {
    setClienteId(String(id))
    setSearchParams({ cliente: String(id) })
  }

  function volver() {
    setClienteId(null)
    setDetalle(null)
    setErrorDetalle('')
    const params = new URLSearchParams(searchParams)
    params.delete('cliente')
    setSearchParams(params)
  }

  async function toggleBloqueo() {
    const bloqueado = detalle.resumen.credito_bloqueado
    let motivo = null
    if (!bloqueado) {
      motivo = await pedirTexto({
        titulo: `Bloquear el crédito de ${detalle.cliente?.nombre || 'este cliente'}`,
        etiqueta: 'Motivo del bloqueo (opcional)',
        textoConfirmar: 'Bloquear',
        peligro: true,
      })
      if (motivo === null) return
    } else if (!(await confirmar({ titulo: `¿Activar de nuevo el crédito de ${detalle.cliente?.nombre || 'este cliente'}?`, textoConfirmar: 'Activar' }))) {
      return
    }
    setBloqueando(true)
    try {
      await staffApi.patch(`/staff/credito/bloquear/${clienteId}`, {
        bloqueado: !bloqueado,
        motivo: motivo || undefined,
      })
      cargarDetalle(clienteId)
      cargarLista()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo actualizar el bloqueo', 'error')
    } finally {
      setBloqueando(false)
    }
  }

  async function crearNota(e) {
    e.preventDefault()
    if (!formNota.nota.trim()) return
    setEnviandoNota(true)
    try {
      await staffApi.post('/staff/credito/notas', {
        usuario_id: Number(clienteId),
        tipo: formNota.tipo,
        nota: formNota.nota.trim(),
        fecha_seguimiento: formNota.fecha_seguimiento || null,
      })
      setFormNota({ tipo: 'llamada', nota: '', fecha_seguimiento: '' })
      await cargarDetalle(clienteId)
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo guardar la nota', 'error')
    } finally {
      setEnviandoNota(false)
    }
  }

  async function enviarRecordatorio(e) {
    e.preventDefault()
    if (!mensajeRec.trim()) return
    setEnviandoRec(true)
    try {
      await staffApi.post('/staff/credito/recordatorio', {
        usuario_id: Number(clienteId),
        mensaje: mensajeRec.trim(),
      })
      setMensajeRec('')
      avisar('Recordatorio enviado')
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo enviar el recordatorio', 'error')
    } finally {
      setEnviandoRec(false)
    }
  }

  const filtrados = clientes.filter((c) => {
    const q = buscar.trim().toLowerCase()
    if (!q) return true
    return (c.nombre || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
  })

  // ---------------- Vista de ficha de cliente ----------------
  if (clienteId) {
    return (
      <LayoutDepartamento departamento="finanzas" activo="cuentas-por-cobrar" titulo="Cuentas por cobrar">
        <div className="scc-page">
          <button type="button" className="scc-volver" onClick={volver}>
            <ArrowLeft size={15} /> Volver a clientes
          </button>

          {errorDetalle && <p className="stf-error" role="alert">{errorDetalle}</p>}

          {!detalle ? (
            <StaffEstado tipo="cargando" filas={4} />
          ) : (
            <>
              <div className="scc-ficha-header">
                <span className="scc-avatar">{(detalle.cliente?.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
                <div>
                  <h2>{detalle.cliente?.nombre || `Cliente #${clienteId}`}</h2>
                  <p>{detalle.cliente?.email}{detalle.cliente?.rif_cedula ? ` · ${detalle.cliente.rif_cedula}` : ''}</p>
                </div>
              </div>

              <div className="st-resumen-cards">
                <div className="st-resumen-card">
                  <div className="st-resumen-card__label">Línea de crédito</div>
                  <div className="st-resumen-card__valor">{formatearUSD(detalle.resumen.linea_credito)}</div>
                </div>
                <div className="st-resumen-card">
                  <div className="st-resumen-card__label">Deuda total</div>
                  <div className={`st-resumen-card__valor ${detalle.resumen.deuda_total > 0 ? 'st-resumen-card__valor--negativo' : ''}`}>
                    {formatearUSD(detalle.resumen.deuda_total)}
                  </div>
                </div>
                <div className="st-resumen-card">
                  <div className="st-resumen-card__label">Saldo disponible</div>
                  <div className="st-resumen-card__valor">{formatearUSD(detalle.resumen.saldo)}</div>
                </div>
              </div>

              <div className={`scc-bloqueo ${detalle.resumen.credito_bloqueado ? 'scc-bloqueo--bloqueado' : ''}`}>
                <span className="scc-bloqueo-info">
                  {detalle.resumen.credito_bloqueado ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
                  {detalle.resumen.credito_bloqueado
                    ? `Crédito bloqueado${detalle.resumen.credito_bloqueado_motivo ? ` — ${detalle.resumen.credito_bloqueado_motivo}` : ''}`
                    : 'Crédito activo'}
                </span>
                <button
                  type="button"
                  className={`stf-btn stf-btn--small ${detalle.resumen.credito_bloqueado ? 'stf-btn--success' : 'stf-btn--danger'}`}
                  onClick={toggleBloqueo}
                  disabled={bloqueando}
                >
                  {detalle.resumen.credito_bloqueado ? <Unlock size={13} /> : <Lock size={13} />}
                  {detalle.resumen.credito_bloqueado ? 'Activar' : 'Bloquear'}
                </button>
              </div>

              {detalle.resumen.deuda_total > 0 && (
                <div className="scc-aging-row">
                  {BUCKETS.map((b) => detalle.resumen.buckets?.[b.id] > 0 && (
                    <span key={b.id} className={`scc-aging-badge scc-aging-badge--${b.id}`}>
                      {b.label}: {formatearUSD(detalle.resumen.buckets[b.id])}
                    </span>
                  ))}
                </div>
              )}

              <h3 className="stf-subtitulo">Órdenes con deuda</h3>
              {detalle.ordenes.length === 0 ? (
                <p className="st-vacio-nota">Sin órdenes con deuda.</p>
              ) : (
                <div className="scc-lista">
                  {detalle.ordenes.map((o) => (
                    <div key={o.id} className={`scc-item ${o.vencida ? 'scc-item--vencida' : ''}`}>
                      <div className="scc-item-info">
                        <span className="scc-item-titulo">Orden #{o.id} · {o.forma_pago}</span>
                        <span className="scc-item-sub">
                          {o.estado}{o.fecha_vencimiento ? ` · Vence ${formatFecha(o.fecha_vencimiento)}` : ''}
                          {o.vencida ? ` · ${o.dias_vencida}d vencida` : ''}
                        </span>
                      </div>
                      <span className="scc-item-monto">{formatearUSD(o.total_usd)}</span>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="stf-subtitulo">Facturas</h3>
              {detalle.facturas.length === 0 ? (
                <p className="st-vacio-nota">Sin facturas.</p>
              ) : (
                <div className="scc-lista">
                  {detalle.facturas.map((f) => (
                    <div key={f.id} className="scc-item">
                      <div className="scc-item-info">
                        <span className="scc-item-titulo">Factura {f.numero_factura}</span>
                        <span className="scc-item-sub">{f.estado} · {formatFecha(f.created_at)}</span>
                      </div>
                      <span className="scc-item-monto">
                        {formatearUSD(f.monto_facturado !== null && f.monto_facturado !== undefined ? f.monto_facturado : f.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="stf-subtitulo">Pagos</h3>
              {detalle.pagos.length === 0 ? (
                <p className="st-vacio-nota">Sin pagos.</p>
              ) : (
                <div className="scc-lista">
                  {detalle.pagos.map((p) => (
                    <div key={p.id} className="scc-item">
                      <div className="scc-item-info">
                        <span className="scc-item-titulo">{p.tipo}</span>
                        <span className="scc-item-sub">{formatFecha(p.created_at)}</span>
                      </div>
                      <span className="scc-item-monto scc-item-monto--positivo">{formatearUSD(p.monto)}</span>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="stf-subtitulo">Enviar recordatorio</h3>
              <form className="scc-form-recordatorio" onSubmit={enviarRecordatorio}>
                <textarea
                  placeholder="Mensaje para el cliente..."
                  value={mensajeRec}
                  onChange={(e) => setMensajeRec(e.target.value)}
                  rows={2}
                />
                <button type="submit" className="stf-btn stf-btn--primary" disabled={enviandoRec || !mensajeRec.trim()}>
                  <Send size={14} />
                  {enviandoRec ? 'Enviando...' : 'Enviar recordatorio'}
                </button>
              </form>

              <h3 className="stf-subtitulo">Notas de cobranza</h3>
              <form className="scc-form-nota" onSubmit={crearNota}>
                <div className="scc-form-nota-fila">
                  <select value={formNota.tipo} onChange={(e) => setFormNota({ ...formNota, tipo: e.target.value })}>
                    {TIPOS_NOTA.map((t) => <option key={t.id} value={t.id}>{t.texto}</option>)}
                  </select>
                  <input
                    type="date"
                    value={formNota.fecha_seguimiento}
                    onChange={(e) => setFormNota({ ...formNota, fecha_seguimiento: e.target.value })}
                    title="Fecha de seguimiento (opcional)"
                  />
                </div>
                <textarea
                  placeholder="Nota..."
                  value={formNota.nota}
                  onChange={(e) => setFormNota({ ...formNota, nota: e.target.value })}
                  rows={2}
                />
                <button type="submit" className="stf-btn stf-btn--primary" disabled={enviandoNota || !formNota.nota.trim()}>
                  {enviandoNota ? 'Guardando...' : 'Guardar nota'}
                </button>
              </form>

              <div className="scc-notas-lista">
                {detalle.notas.length === 0 && <p className="st-vacio-nota">Sin notas de cobranza.</p>}
                {detalle.notas.map((n) => (
                  <div key={n.id} className="scc-nota-card">
                    <div className="scc-nota-header">
                      <span className="scc-nota-tipo">{TIPOS_NOTA.find((t) => t.id === n.tipo)?.texto || n.tipo}</span>
                      <span className="scc-nota-fecha">{formatFecha(n.created_at)}</span>
                    </div>
                    <p>{n.nota}</p>
                    <div className="scc-nota-footer">
                      {n.fecha_seguimiento && <span>Seguimiento: {formatFecha(n.fecha_seguimiento)}</span>}
                      {n.staff && <span>Por: {n.staff.nombre}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </LayoutDepartamento>
    )
  }

  // ---------------- Vista de lista ----------------
  return (
    <LayoutDepartamento departamento="finanzas" activo="cuentas-por-cobrar" titulo="Cuentas por cobrar">
      <div className="scc-page">
        <div className="scc-buscador">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>

        {error && <p className="stf-error" role="alert">{error}</p>}
        {cargandoLista && <StaffEstado tipo="cargando" filas={4} />}

        {!cargandoLista && filtrados.length === 0 && (
          <StaffEstado tipo="vacio" titulo="No hay clientes con línea de crédito." />
        )}

        {!cargandoLista && filtrados.length > 0 && (
          <div className="scc-lista">
            {filtrados.map((c) => (
              <div key={c.id} className="scc-cliente-card">
                <div className="scc-cliente-card__cabecera">
                  <span className="scc-avatar scc-avatar--sm">{(c.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
                  <div className="scc-cliente-card__info">
                    <strong>{c.nombre}</strong>
                    <span>{c.email}</span>
                  </div>
                  {c.credito_bloqueado && (
                    <span className="scc-badge scc-badge--bloqueado"><ShieldAlert size={12} /> Bloqueado</span>
                  )}
                </div>

                <div className="scc-cliente-card__stats">
                  <span>Línea <strong>{formatearUSD(c.linea_credito)}</strong></span>
                  <span>Deuda <strong className={c.deuda_total > 0 ? 'scc-texto-negativo' : ''}>{formatearUSD(c.deuda_total)}</strong></span>
                  <span>Vencida <strong className={c.deuda_vencida > 0 ? 'scc-texto-negativo' : ''}>{formatearUSD(c.deuda_vencida)}</strong></span>
                </div>

                {c.deuda_vencida > 0 && (
                  <div className="scc-aging-row">
                    {BUCKETS.map((b) => c.buckets?.[b.id] > 0 && (
                      <span key={b.id} className={`scc-aging-badge scc-aging-badge--${b.id}`}>
                        {b.label}: {formatearUSD(c.buckets[b.id])}
                      </span>
                    ))}
                  </div>
                )}

                <div className="scc-cliente-card__acciones">
                  <button type="button" className="stf-btn stf-btn--small" onClick={() => abrir(c.id)}>
                    Ver cuenta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </LayoutDepartamento>
  )
}

export default StaffCuentasPorCobrar