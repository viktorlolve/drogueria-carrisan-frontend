import { useState, useEffect } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffFinanzas.css'
import { useStaffUI } from '../../hooks/useStaffUI'
import { formatearUSD } from '../../utils/formato'
import StaffEstado from '../../components/staff/StaffEstado'

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
  const { confirmar } = useStaffUI()
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
    if (!(await confirmar({ titulo: `¿Cancelar la orden #${orden.id} de ${orden.users?.nombre || 'cliente'}?`, texto: 'El cliente ya no podrá pagarla.', textoConfirmar: 'Cancelar orden', textoCancelar: 'Volver', peligro: true }))) return
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
    if (!(await confirmar({ titulo: `¿Confirmar que el cliente pagó la orden #${orden.id}?`, texto: `Monto: ${formatearUSD(orden.total_usd)}. El pago se marcará como verificado sin comprobante.`, textoConfirmar: 'Confirmar pago' }))) return
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
      {error && <p className="stf-error" role="alert">{error}</p>}
      {cargando && <StaffEstado tipo="cargando" />}
      {!cargando && ordenes.length === 0 && <StaffEstado tipo="vacio" titulo="No hay órdenes contado pendientes de pago." />}
      {!cargando && ordenes.length > 0 && (
        <div className="stf-tabla-wrap">
          <table className="stf-tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Total</th>
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
                  <td>{formatearUSD(o.total_usd)}</td>
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