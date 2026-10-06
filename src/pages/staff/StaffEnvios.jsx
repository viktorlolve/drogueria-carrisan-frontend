import { useEffect, useState } from 'react'
import { Phone, MessageCircle } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import AgenciasEnvioModal from '../../components/staff/AgenciasEnvioModal'
import { ItemsOrden, formatUSD } from '../../components/staff/ColaOrdenes'
import { exportarGuiaDespacho } from '../../utils/exportUtils'
import { resumirHorario } from '../../utils/horario'
import '../../components/staff/ColaOrdenes.css'
import './StaffEnvios.css'

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
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(null)
  const [incidenciaDe, setIncidenciaDe] = useState(null)
  const [motivo, setMotivo] = useState(MOTIVOS[0])

  useEffect(() => {
    let activo = true
    staffApi.get('/staff/despacho')
      .then(({ data }) => { if (activo) setOrdenes(data) })
      .catch((err) => { if (activo) setError(err.response?.data?.error || 'No se pudo cargar la cola de envíos') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  async function marcarEntregado(id) {
    setProcesando(id)
    try {
      await staffApi.patch(`/staff/despacho/${id}/entregar`)
      setOrdenes((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo marcar como entregado')
    } finally {
      setProcesando(null)
    }
  }

  async function registrarIncidencia() {
    if (!incidenciaDe) return
    setProcesando(incidenciaDe)
    try {
      await staffApi.post(`/staff/logistica/${incidenciaDe}/incidencia`, { motivo })
      setOrdenes((prev) => prev.filter((o) => o.id !== incidenciaDe))
      setIncidenciaDe(null)
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo registrar la incidencia')
    } finally {
      setProcesando(null)
    }
  }

  function etiquetaEnvio(tipo) {
    if (tipo === 'delivery') return 'Delivery'
    if (tipo === 'envio_nacional') return 'Envío nacional'
    return 'Retiro'
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="envios" titulo="Envíos">
      <div className="se-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <p className="se-intro">Pedidos en ruta — entrega hoy y confirma.</p>
          <AgenciasEnvioModal />
        </div>

        {cargando && <p>Cargando...</p>}
        {error && <p className="se-error">{error}</p>}
        {!cargando && !error && ordenes.length === 0 && <p>No hay pedidos por entregar ahora mismo.</p>}

        <div className="se-list">
          {ordenes.map((orden) => {
            const tel = telAEnlace(orden.users?.telefono)
            const esNacional = orden.tipo_envio === 'envio_nacional'
            const dir = orden.direcciones_envio
            return (
              <div key={orden.id} className="se-card">
                <div className="se-card-head">
                  <p className="se-card-orden">Orden #{orden.id}</p>
                  <span className={`se-tag se-tag--${orden.tipo_envio === 'delivery' ? 'delivery' : esNacional ? 'nacional' : 'retiro'}`}>
                    {etiquetaEnvio(orden.tipo_envio)}
                  </span>
                </div>

                <p className="se-card-cliente">
                  {orden.users?.nombre} — ${formatUSD(orden.total_usd)}
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
                  {esNacional ? (
                    <p>Enviar por agencia — <strong>{orden.agencia_envio || 'sin agencia'}</strong></p>
                  ) : dir ? (
                    <p>{dir.direccion}, {dir.ciudad} {dir.estado}</p>
                  ) : (
                    <p>Sin dirección</p>
                  )}
                  {dir?.nota_entrega && <p className="se-nota">Nota: {dir.nota_entrega}</p>}
                  {!esNacional && dir?.telefono_contacto && <p className="se-num-ausente">Contacto: {dir.telefono_contacto}</p>}
                  {resumirHorario(orden.horario_recepcion).length > 0 && (
                    <div className="se-horario">
                      {resumirHorario(orden.horario_recepcion).map((linea) => (
                        <p key={linea}>{linea}</p>
                      ))}
                    </div>
                  )}
                </div>

                <ItemsOrden items={orden.ordenes_items || []} />

                <div className="se-card-acciones">
                  <button className="se-btn-main" onClick={() => marcarEntregado(orden.id)} disabled={procesando === orden.id}>
                    {procesando === orden.id ? 'Procesando...' : esNacional ? 'Marcar entregado a la agencia' : 'Marcar entregado'}
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
        <div className="se-modal" onClick={() => setIncidenciaDe(null)}>
          <div className="se-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Registrar incidencia</h3>
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
        </div>
      )}
    </LayoutDepartamento>
  )
}

export default StaffEnvios
