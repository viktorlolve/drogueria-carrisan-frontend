import { useState, useEffect } from 'react'
import { Clock, FileCheck2 } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffFinanzas.css'
import './StaffOrdenesPorCancelar.css'
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
      <div className="sopc-page">
        {error && <p className="stf-error" role="alert">{error}</p>}
        {cargando && <StaffEstado tipo="cargando" />}
        {!cargando && ordenes.length === 0 && <StaffEstado tipo="vacio" titulo="No hay órdenes contado pendientes de pago." />}

        {!cargando && ordenes.length > 0 && (
          <div className="sopc-lista">
            {ordenes.map((o) => {
              const reportado = o.estado_pago === 'reportado'
              const enProceso = procesando === o.id
              return (
                <div key={o.id} className="sopc-card">
                  <div className="sopc-card-cabecera">
                    <div>
                      <span className="sopc-orden-id">#{o.id}</span>
                      <span className="sopc-cliente">{o.users?.nombre || `Cliente #${o.usuario_id}`}</span>
                    </div>
                    <span className={`sopc-badge ${reportado ? 'sopc-badge--reportado' : 'sopc-badge--espera'}`}>
                      {reportado ? <FileCheck2 size={13} /> : <Clock size={13} />}
                      {reportado ? 'Pago reportado' : 'Esperando pago'}
                    </span>
                  </div>

                  <div className="sopc-card-meta">
                    <span className="sopc-monto">{formatearUSD(o.total_usd)}</span>
                    <span className="sopc-fecha">{formatFecha(o.created_at)}</span>
                  </div>

                  <div className="sopc-acciones">
                    <button
                      className="stf-btn stf-btn--small stf-btn--success"
                      onClick={() => confirmarPago(o)}
                      disabled={enProceso}
                    >
                      {enProceso ? 'Procesando...' : 'Pago verificado'}
                    </button>
                    <button
                      className="stf-btn stf-btn--small stf-btn--danger"
                      onClick={() => cancelar(o)}
                      disabled={enProceso}
                    >
                      {enProceso ? 'Cancelando...' : 'Cancelar pedido'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </LayoutDepartamento>
  )
}

export default StaffOrdenesPorCancelar