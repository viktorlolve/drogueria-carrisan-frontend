import { useState, useEffect } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffFinanzas.css'
import { formatearUSD } from '../../utils/formato'
import StaffEstado from '../../components/staff/StaffEstado'

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ------------------------------------------------------------------
// Cuentas por cobrar: clientes con línea de crédito + estado de cuenta
// ------------------------------------------------------------------
function StaffCuentasPorCobrar() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [clienteActivo, setClienteActivo] = useState(null)
  const [detalle, setDetalle] = useState(null)

  async function verDetalle(cliente) {
    setError('')
    setDetalle(null)
    setClienteActivo(cliente)
    try {
      const { data } = await staffApi.get(`/staff/contabilidad/clientes/${cliente.id}`)
      setDetalle(data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar el estado de cuenta')
    }
  }

  useEffect(() => {
    let activo = true
    staffApi.get('/staff/contabilidad/clientes')
      .then(({ data }) => { if (activo) setClientes(data) })
      .catch((err) => { if (activo) setError(err.response?.data?.error || 'No se pudo cargar el resumen de clientes') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  if (clienteActivo) {
    return (
      <LayoutDepartamento departamento="finanzas" activo="cuentas-por-cobrar" titulo="Cuentas por cobrar">
        <button className="stf-btn stf-btn--ghost" onClick={() => { setClienteActivo(null); setDetalle(null) }}>
          ← Volver a clientes
        </button>

        {error && <p className="stf-error" role="alert">{error}</p>}
        {detalle && (
          <>
            <div className="stf-grid-3">
              <div className="stf-stat">
                <span className="stf-stat-label">Línea de crédito</span>
                <span className="stf-stat-valor">{formatearUSD(detalle.resumen.linea_credito)}</span>
              </div>
              <div className="stf-stat">
                <span className="stf-stat-label">Deuda actual</span>
                <span className="stf-stat-valor">{formatearUSD(detalle.resumen.deuda_actual)}</span>
              </div>
              <div className="stf-stat">
                <span className="stf-stat-label">Saldo disponible</span>
                <span className="stf-stat-valor">{formatearUSD(detalle.resumen.saldo)}</span>
              </div>
            </div>

            <h3 className="stf-subtitulo">Órdenes pendientes</h3>
            <div className="stf-tabla-wrap">
              <table className="stf-tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Total</th>
                    <th>Forma pago</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {(detalle.ordenes_pendientes || []).length === 0 ? (
                    <tr><td colSpan="5">Sin órdenes pendientes</td></tr>
                  ) : (
                    detalle.ordenes_pendientes.map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{formatearUSD(o.total_usd)}</td>
                        <td>{o.forma_pago}</td>
                        <td>{o.estado}</td>
                        <td>{formatFecha(o.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="stf-subtitulo">Facturas</h3>
            <div className="stf-tabla-wrap">
              <table className="stf-tabla">
                <thead>
                  <tr>
                    <th>N° Factura</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {(detalle.facturas || []).length === 0 ? (
                    <tr><td colSpan="4">Sin facturas</td></tr>
                  ) : (
                    detalle.facturas.map((f) => (
                      <tr key={f.id}>
                        <td>{f.numero_factura}</td>
                        <td>{formatearUSD(f.monto_facturado !== null && f.monto_facturado !== undefined ? f.monto_facturado : f.monto)}</td>
                        <td>{f.estado}</td>
                        <td>{formatFecha(f.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="stf-subtitulo">Pagos</h3>
            <div className="stf-tabla-wrap">
              <table className="stf-tabla">
                <thead>
                  <tr>
                    <th>Monto</th>
                    <th>Tipo</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {(detalle.pagos || []).length === 0 ? (
                    <tr><td colSpan="3">Sin pagos</td></tr>
                  ) : (
                    detalle.pagos.map((p) => (
                      <tr key={p.id}>
                        <td>{formatearUSD(p.monto)}</td>
                        <td>{p.tipo}</td>
                        <td>{formatFecha(p.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </LayoutDepartamento>
    )
  }

  return (
    <LayoutDepartamento departamento="finanzas" activo="cuentas-por-cobrar" titulo="Cuentas por cobrar">
      {cargando && <StaffEstado tipo="cargando" />}
      {error && <p className="stf-error" role="alert">{error}</p>}
      {!cargando && (
        <div className="stf-tabla-wrap">
          <table className="stf-tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Línea</th>
                <th>Deuda</th>
                <th>Saldo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr><td colSpan="5">No hay clientes con línea de crédito</td></tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="stf-cliente-cell">
                        <strong>{c.nombre}</strong>
                        <span>{c.email}</span>
                      </div>
                    </td>
                    <td>{formatearUSD(c.linea_credito)}</td>
                    <td style={{ color: Number(c.deuda_actual) > 0 ? '#DC2626' : 'inherit' }}>{formatearUSD(c.deuda_actual)}</td>
                    <td>{formatearUSD(c.saldo)}</td>
                    <td>
                      <button className="stf-btn stf-btn--small" onClick={() => verDetalle(c)}>Ver cuenta</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </LayoutDepartamento>
  )
}

export default StaffCuentasPorCobrar