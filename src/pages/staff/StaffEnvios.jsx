import { useState } from 'react'
import { Phone, MessageCircle, Clock } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import AgenciasEnvioModal from '../../components/staff/AgenciasEnvioModal'
import { ItemsOrden } from '../../components/staff/ColaOrdenes'
import StaffEstado from '../../components/staff/StaffEstado'
import StaffModal from '../../components/staff/StaffModal'
import { formatearUSD } from '../../utils/formato'
import { useColaStaff } from '../../hooks/useColaStaff'
import { exportarGuiaDespacho } from '../../utils/exportUtils'
import { resumirHorario } from '../../utils/horario'
import '../../components/staff/ColaOrdenes.css'
import './StaffEnvios.css'
import { useStaffUI } from '../../hooks/useStaffUI'

function telAEnlace(tel) {
  const limpio = String(tel || '').replace(/[^\d+]/g, '')
  return limpio
}

const MOTIVOS = [
  'No se encontró al cliente',
  'Dirección errada',
  'El cliente no responde',
  'Otro',
]

function StaffEnvios() {
  const { avisar } = useStaffUI()
  const { datos: ordenes, cargando, error, recargar, recargarTodo } = useColaStaff('/staff/despacho', {
    params: { tipo: 'envio_nacional' },
  })
  const [procesando, setProcesando] = useState(null)
  const [incidenciaDe, setIncidenciaDe] = useState(null)
  const [motivo, setMotivo] = useState(MOTIVOS[0])

  async function marcarEntregado(id) {
    setProcesando(id)
    try {
      await staffApi.patch(`/staff/despacho/${id}/entregar`)
      await recargarTodo()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo marcar como entregado', 'error')
    } finally {
      setProcesando(null)
    }
  }

  async function registrarIncidencia() {
    if (!incidenciaDe) return
    setProcesando(incidenciaDe)
    try {
      await staffApi.post(`/staff/logistica/${incidenciaDe}/incidencia`, { motivo })
      setIncidenciaDe(null)
      await recargarTodo()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo registrar la incidencia', 'error')
    } finally {
      setProcesando(null)
    }
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="envios" titulo="Envíos por agencia">
      <div className="se-page">
        <div className="se-encabezado">
          <p className="se-intro">Envíos por agencia — prepara la guía y despacha.</p>
          <AgenciasEnvioModal />
        </div>

        {cargando && <StaffEstado tipo="cargando" />}
        {error && <StaffEstado tipo="error" mensaje={error} onReintentar={recargar} />}
        {!cargando && !error && ordenes.length === 0 && <StaffEstado tipo="vacio" titulo="No hay envíos por agencia pendientes ahora mismo." />}

        <div className="se-list">
          {ordenes.map((orden) => {
            const tel = telAEnlace(orden.users?.telefono)
            const dir = orden.direcciones_envio
            return (
              <div key={orden.id} className="se-card">
                <div className="se-card-head">
                  <p className="se-card-orden">Orden #{orden.id}</p>
                  <span className="se-tag se-tag--nacional">Envío nacional</span>
                </div>

                <p className="se-card-cliente">
                  {orden.users?.nombre} — {formatearUSD(orden.total_usd)}
                </p>

                <div className="se-card-contacto">
                  {tel ? (
                    <>
                      <a className="se-btn-sec" href={`tel:+${tel}`}><Phone size={15} /> Llamar</a>
                      <a className="se-btn-wa" href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
                    </>
                  ) : (
                    <span className="se-num-ausente">Sin teléfono registrado</span>
                  )}
                </div>

                <div className="se-card-direccion">
                  <p>Enviar por agencia — <strong>{orden.agencia_envio || 'sin agencia'}</strong></p>
                  {dir?.nota_entrega && <p className="se-nota">Nota: {dir.nota_entrega}</p>}
                  {resumirHorario(orden.horario_recepcion).length > 0 && (
                    <div className="se-horario">
                      {resumirHorario(orden.horario_recepcion).map((linea) => (
                        <p key={linea}><Clock size={13} /> {linea}</p>
                      ))}
                    </div>
                  )}
                </div>

                <ItemsOrden items={orden.ordenes_items || []} />

                <div className="se-card-acciones">
                  <button className="se-btn-main" onClick={() => marcarEntregado(orden.id)} disabled={procesando === orden.id}>
                    {procesando === orden.id ? 'Procesando...' : 'Marcar entregado a la agencia'}
                  </button>
                  <button className="se-btn-sec" onClick={() => exportarGuiaDespacho(orden)} disabled={procesando === orden.id}>Guía</button>
                  <button className="se-btn-inc" onClick={() => setIncidenciaDe(orden.id)} disabled={procesando === orden.id}>Incidencia</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {incidenciaDe && (
        <StaffModal titulo="Registrar incidencia" ancho="sm" onCerrar={() => setIncidenciaDe(null)} bloqueado={procesando === incidenciaDe}>
          <div className="se-modal-content">
            <p className="se-modal-meta">El pedido dejará de verse en tu cola y pasará a revisión.</p>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="se-card-acciones">
              <button className="se-btn-sec" onClick={() => setIncidenciaDe(null)}>Volver</button>
              <button className="se-btn-inc" onClick={registrarIncidencia} disabled={procesando === incidenciaDe}>
                {procesando === incidenciaDe ? 'Registrando...' : 'Confirmar incidencia'}
              </button>
            </div>
          </div>
        </StaffModal>
      )}
    </LayoutDepartamento>
  )
}

export default StaffEnvios
