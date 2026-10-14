import { useState } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import ColaOrdenes from '../../components/staff/ColaOrdenes'
import { useColaStaff } from '../../hooks/useColaStaff'
import { exportarGuiaDespacho } from '../../utils/exportUtils'
import { useStaffUI } from '../../hooks/useStaffUI'

// Cola de ordenes listas para retirar en el mostrador. El unico rol que
// confirma el retiro es el almacenista (decision del dueno 2026-09-30).
export default function StaffPedidosRetiros() {
  const { avisar } = useStaffUI()
  const { datos, cargando, error, recargar, recargarTodo } = useColaStaff('/staff/logistica/retiros')
  const [procesando, setProcesando] = useState(null)

  async function marcarRetirado(orden) {
    setProcesando(orden.id)
    try {
      await staffApi.patch(`/staff/logistica/${orden.id}/retirado`)
      await recargarTodo()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo marcar como retirado', 'error')
    } finally {
      setProcesando(null)
    }
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="retiros" titulo="Retiros">
      <ColaOrdenes
        ordenes={datos}
        cargando={cargando}
        error={error}
        onReintentar={recargar}
        vacio="No hay retiros por confirmar."
        descripcion="Órdenes que el cliente ya recogió o está por recoger en el mostrador."
        renderAcciones={(orden) => (
          <>
            <button className="sp-btn sp-btn--principal" onClick={() => marcarRetirado(orden)} disabled={procesando === orden.id}>
              Marcar retirado
            </button>
            <button className="sp-btn sp-btn--ghost" onClick={() => exportarGuiaDespacho(orden)}>Imprimir guía</button>
          </>
        )}
      />
    </LayoutDepartamento>
  )
}