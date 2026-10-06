import { useState } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import ColaOrdenes, { formatFecha } from '../../components/staff/ColaOrdenes'
import { useColaStaff } from '../../hooks/useColaStaff'

// Cola de RESOLUCION de incidencias. La incidencia se LEVANTA desde la pagina
// de Envios (el despachador es quien la reporta); aqui el almacenista decide:
// reenviar o cancelar. Las dos colas son disjuntas porque getColaDespacho
// filtra las ordenes con incidencia abierta.
export default function StaffPedidosIncidencias() {
  const { datos, cargando, error, recargarTodo } = useColaStaff('/staff/logistica/incidencias')
  const [procesando, setProcesando] = useState(null)

  async function reintentar(orden) {
    setProcesando(orden.id)
    try {
      await staffApi.patch(`/staff/logistica/${orden.id}/reintentar`)
      await recargarTodo()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo reintentar el envío')
    } finally {
      setProcesando(null)
    }
  }

  async function cancelar(orden) {
    if (!window.confirm(`¿Cancelar la orden #${orden.id} de ${orden.users?.nombre || 'cliente'}? Esta acción no se puede deshacer.`)) return
    setProcesando(orden.id)
    try {
      await staffApi.patch(`/staff/almacen/${orden.id}/cancelar`)
      await recargarTodo()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo cancelar la orden')
    } finally {
      setProcesando(null)
    }
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="incidencias" titulo="Incidencias">
      <p className="sp-meta">Envíos que el motorizado no pudo entregar. Reenvía o cancela la orden.</p>
      <ColaOrdenes
        ordenes={datos}
        cargando={cargando}
        error={error}
        vacio="No hay incidencias."
        renderAcciones={(orden) => (
          <>
            <p className="sp-incidencia">
              <strong>Incidencia:</strong> {orden.incidencia_motivo} ({formatFecha(orden.incidencia_fecha)})
            </p>
            <button className="sp-btn sp-btn--principal" onClick={() => reintentar(orden)} disabled={procesando === orden.id}>Reenviar</button>
            <button className="sp-btn sp-btn--danger" onClick={() => cancelar(orden)} disabled={procesando === orden.id}>Cancelar pedido</button>
          </>
        )}
        badge={() => <span className="sp-badge sp-badge--alerta">Incidencia</span>}
      />
    </LayoutDepartamento>
  )
}