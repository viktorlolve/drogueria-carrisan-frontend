import { useState, useEffect, useMemo } from 'react'
import api from '../../api/axios'
import '../admin/EstadoCuentaAdmin.css'
import './PagosAdmin.css'

function formatUSD(valor) {
  return Number(valor || 0).toFixed(2)
}

function formatVES(valor) {
  return Number(valor || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function PagosAdmin() {
  const [reportes, setReportes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('pendiente_verificacion')
  const [reporteAbierto, setReporteAbierto] = useState(null)
  const [notaRechazo, setNotaRechazo] = useState('')
  const [accionEnCurso, setAccionEnCurso] = useState(null) // 'verificar' | 'rechazar' | null
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    let activo = true
    api.get('/reportes-pago', {
      params: filtroEstado !== 'todos' ? { estado: filtroEstado } : {},
    })
      .then(({ data }) => {
        if (!activo) return
        setReportes(data)
        setError('')
      })
      .catch((err) => {
        if (!activo) return
        setError('No se pudo cargar la cola de pagos')
        console.error(err)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [filtroEstado])

  async function cargarReportes() {
    try {
      setCargando(true)
      const { data } = await api.get('/reportes-pago', {
        params: filtroEstado !== 'todos' ? { estado: filtroEstado } : {}
      })
      setReportes(data)
      setError('')
    } catch (err) {
      setError('No se pudo cargar la cola de pagos')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  const stats = useMemo(() => {
    const pendientes = reportes.filter(r => r.estado === 'pendiente_verificacion').length
    const totalUsdPendiente = reportes
      .filter(r => r.estado === 'pendiente_verificacion')
      .reduce((sum, r) => sum + Number(r.monto_usd), 0)
    return { pendientes, totalUsdPendiente }
  }, [reportes])

  function abrirVerificar(reporte) {
    setReporteAbierto(reporte)
    setAccionEnCurso('verificar')
  }

  function abrirRechazar(reporte) {
    setReporteAbierto(reporte)
    setAccionEnCurso('rechazar')
    setNotaRechazo('')
  }

  function cerrarModal() {
    setReporteAbierto(null)
    setAccionEnCurso(null)
  }

  async function confirmarVerificar() {
    setProcesando(true)
    setError('')
    try {
      await api.patch(`/reportes-pago/${reporteAbierto.id}/verificar`)
      cerrarModal()
      await cargarReportes()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo verificar el pago')
    } finally {
      setProcesando(false)
    }
  }

  async function confirmarRechazar() {
    setProcesando(true)
    setError('')
    try {
      await api.patch(`/reportes-pago/${reporteAbierto.id}/rechazar`, {
        nota_rechazo: notaRechazo.trim() || undefined,
      })
      cerrarModal()
      await cargarReportes()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo rechazar el pago')
    } finally {
      setProcesando(false)
    }
  }

  if (cargando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando reportes de pago...</p>
      </div>
    )
  }

  return (
    <div className="pagos-admin">
      <div className="section-header">
        <div className="header-top">
          <h2>💵 Pagos Reportados</h2>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-pendiente">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-valor">{stats.pendientes}</div>
            <div className="stat-label">Por Verificar</div>
          </div>
        </div>
        <div className="stat-card stat-monto">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="stat-valor">${formatUSD(stats.totalUsdPendiente)}</div>
            <div className="stat-label">Monto Pendiente</div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-filtros">
          <select
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value); setCargando(true) }}
            className="filter-select"
          >
            <option value="pendiente_verificacion">⏳ Pendientes de verificar</option>
            <option value="verificado">✅ Verificados</option>
            <option value="rechazado">❌ Rechazados</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="resultados-info">
        Mostrando {reportes.length} reporte{reportes.length !== 1 ? 's' : ''}
      </div>

      <div className="table-container">
        <table className="estado-cuenta-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Órdenes</th>
              <th>Monto USD</th>
              <th>Monto Bs</th>
              <th>Tasa usada</th>
              <th>Fecha</th>
              <th>Comprobante</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {reportes.length === 0 ? (
              <tr>
                <td colSpan="8" className="sin-resultados">
                  <div className="empty-state">
                    <span className="empty-icon">📭</span>
                    <p>No hay reportes en este filtro</p>
                  </div>
                </td>
              </tr>
            ) : (
              reportes.map((reporte) => (
                <tr key={reporte.id} className={reporte.estado === 'pendiente_verificacion' ? 'tiene-deuda' : 'al-dia'}>
                  <td>
                    <div className="cliente-cell">
                      <div className="cliente-avatar">
                        {(reporte.users?.nombre?.[0] || 'C').toUpperCase()}
                      </div>
                      <div>
                        <div className="cliente-nombre">{reporte.users?.nombre || 'Sin nombre'}</div>
                        {reporte.users?.email && <div className="cliente-email">{reporte.users.email}</div>}
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="pagos-orden-tags">
                      {reporte.reporte_pago_ordenes?.map(v => (
                        <span key={v.orden_id} className="pagos-orden-tag">#{v.orden_id}</span>
                      ))}
                    </div>
                  </td>

                  <td className="monto-cell">${formatUSD(reporte.monto_usd)}</td>
                  <td className="monto-cell">Bs. {formatVES(reporte.monto_bs)}</td>
                  <td className="monto-cell">{formatVES(reporte.tasa_usada)}</td>
                  <td>{formatFecha(reporte.created_at)}</td>

                  <td>
                    <a href={reporte.url_comprobante} target="_blank" rel="noreferrer" className="pagos-comprobante-link">
                      Ver comprobante
                    </a>
                  </td>

                  <td>
                    {reporte.estado === 'pendiente_verificacion' ? (
                      <div className="pagos-acciones">
                        <button onClick={() => abrirVerificar(reporte)} className="btn-verificar">✅ Verificar</button>
                        <button onClick={() => abrirRechazar(reporte)} className="btn-rechazar">❌ Rechazar</button>
                      </div>
                    ) : (
                      <span className={`reporte-badge ${reporte.estado === 'verificado' ? 'verificado' : 'rechazado'}`}>
                        {reporte.estado === 'verificado' ? 'Verificado' : 'Rechazado'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {reporteAbierto && accionEnCurso === 'verificar' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pagos-modal-body">
              <h3>Verificar pago #{reporteAbierto.id}</h3>
              <p className="pagos-modal-info">
                Se confirmará el pago y avanzará la(s) orden(es){' '}
                {reporteAbierto.reporte_pago_ordenes?.map(v => `#${v.orden_id}`).join(', ')} a "Preparando".
                La factura o recibo de cobro se genera aparte en Facturación.
              </p>
              {error && <p className="pagos-modal-error">{error}</p>}
              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button className="btn-refrescar" onClick={cerrarModal} disabled={procesando}>Cancelar</button>
                <button className="btn-primary" onClick={confirmarVerificar} disabled={procesando}>
                  {procesando ? 'Verificando...' : 'Confirmar pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reporteAbierto && accionEnCurso === 'rechazar' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pagos-modal-body">
              <h3>Rechazar pago #{reporteAbierto.id}</h3>
              <p className="pagos-modal-info">
                La(s) orden(es) volverán a estar disponibles para que el cliente reintente el pago.
              </p>
              <div className="input-group">
                <label>Motivo (opcional)</label>
                <textarea
                  value={notaRechazo}
                  onChange={(e) => setNotaRechazo(e.target.value)}
                  placeholder="Ej: comprobante ilegible"
                  rows={3}
                />
              </div>
              {error && <p className="pagos-modal-error">{error}</p>}
              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button className="btn-refrescar" onClick={cerrarModal} disabled={procesando}>Cancelar</button>
                <button className="btn-primary" onClick={confirmarRechazar} disabled={procesando} style={{ background: '#ef4444' }}>
                  {procesando ? 'Rechazando...' : 'Confirmar rechazo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PagosAdmin