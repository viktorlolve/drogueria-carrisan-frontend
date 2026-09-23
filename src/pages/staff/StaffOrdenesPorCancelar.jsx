import { useState, useEffect } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffFinanzas.css'

function formatUSD(valor) {
  return Number(valor || 0).toFixed(2)
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ------------------------------------------------------------------
// En espera de pago: cola de órdenes CONTADO sin pago verificado
// (estado 'preparando' o legacy 'procesando'). Cancelar aquí evita que
// queden colgadas por cobrar.
// ------------------------------------------------------------------
function StaffOrdenesPorCancelar() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(null)

  async function cargar() {
    try {
      const { data } = await staffApi.get('/staff/contabilidad/ordenes-procesando')
      setOrdenes(data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar las órdenes por cancelar')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    let activo = true
    staffApi.get('/staff/contabilidad/ordenes-procesando')
      .then(({ data }) => { if (activo) { setOrdenes(data); setError('') } })
      .catch((err) => { if (activo) setError(err.response?.data?.error || 'No se pudieron cargar las órdenes por cancelar') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  async function cancelar(orden) {
    if (!window.confirm(`¿Cancelar la orden #${orden.id} de ${orden.users?.nombre || 'cliente'}? El cliente ya no podrá pagarla.`)) return
    setProcesando(orden.id)
    try {
      await staffApi.patch(`/staff/contabilidad/ordenes/${orden.id}/cancelar`)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cancelar la orden')
    } finally {
      setProcesando(null)
    }
  }

  async function confirmarPago(orden) {
    if (!window.confirm(`¿Confirmar que el cliente pagó la orden #${orden.id} (${formatUSD(orden.total_usd)} USD)? El pago se marcará como verificado sin comprobante.`)) return
    setProcesando(orden.id)
    try {
      await staffApi.patch(`/staff/contabilidad/ordenes/${orden.id}/confirmar-pago`)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo confirmar el pago')
    } finally {
      setProcesando(null)
    }
  }

  return (
    <LayoutDepartamento departamento="finanzas" activo="ordenes-por-cancelar" titulo="En espera de pago">
      {error && <p style={{ color: '#DC2626', marginBottom: 8 }}>{error}</p>}
      {cargando && <p>Cargando...</p>}
      {!cargando && ordenes.length === 0 && <p>No hay órdenes contado pendientes de pago.</p>}
      {!cargando && ordenes.length > 0 && (
        <div className="stf-tabla-wrap">
          <table className="stf-tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Total USD</th>
                <th>Estado pago</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.users?.nombre || `#${o.usuario_id}`}</td>
                  <td>${formatUSD(o.total_usd)}</td>
                  <td>{o.estado_pago === 'reportado' ? 'Pago reportado' : 'Esperando pago'}</td>
                  <td>{formatFecha(o.created_at)}</td>
                  <td>
                    <button
                      className="stf-btn stf-btn--small stf-btn--success"
                      onClick={() => confirmarPago(o)}
                      disabled={procesando === o.id}
                      style={{ marginRight: 6 }}
                    >
                      {procesando === o.id ? 'Procesando...' : 'Pago verificado'}
                    </button>
                    <button
                      className="stf-btn stf-btn--small stf-btn--danger"
                      onClick={() => cancelar(o)}
                      disabled={procesando === o.id}
                    >
                      {procesando === o.id ? 'Cancelando...' : 'Cancelar pedido'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </LayoutDepartamento>
  )
}

export default StaffOrdenesPorCancelar