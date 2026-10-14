import { useState } from 'react'
import staffApi from '../../api/staffAxios'
import './ColaOrdenes.css'
import { useStaffUI } from '../../hooks/useStaffUI'
import { formatearUSD } from '../../utils/formato'
import StaffModal from './StaffModal'
import StaffEstado from './StaffEstado'

function AgenciasEnvioModal() {
  const { confirmar, avisar } = useStaffUI()
  const [abierto, setAbierto] = useState(false)
  const [agencias, setAgencias] = useState([])
  const [cargando, setCargando] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', ubicacion: '', tarifa_sugerida: '' })
  const [editandoId, setEditandoId] = useState(null)

  async function cargar() {
    setCargando(true)
    try {
      const { data } = await staffApi.get('/staff/logistica/agencias')
      setAgencias(data || [])
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudieron cargar las agencias', 'error')
    } finally {
      setCargando(false)
    }
  }

  function abrir() {
    setAbierto(true)
    setEditandoId(null)
    setForm({ nombre: '', telefono: '', ubicacion: '', tarifa_sugerida: '' })
    cargar()
  }

  async function guardar() {
    if (!form.nombre.trim()) return avisar('El nombre es requerido', 'error')
    try {
      if (editandoId) {
        await staffApi.patch(`/staff/logistica/agencias/${editandoId}`, form)
      } else {
        await staffApi.post('/staff/logistica/agencias', form)
      }
      setEditandoId(null)
      setForm({ nombre: '', telefono: '', ubicacion: '', tarifa_sugerida: '' })
      cargar()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo guardar la agencia', 'error')
    }
  }

  function editar(a) {
    setEditandoId(a.id)
    setForm({ nombre: a.nombre, telefono: a.telefono || '', ubicacion: a.ubicacion || '', tarifa_sugerida: a.tarifa_sugerida || '' })
  }

  async function desactivar(a) {
    if (!(await confirmar({ titulo: `¿Desactivar la agencia "${a.nombre}"?`, textoConfirmar: 'Desactivar', peligro: true }))) return
    try {
      await staffApi.delete(`/staff/logistica/agencias/${a.id}`)
      cargar()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo desactivar la agencia', 'error')
    }
  }

  return (
    <>
      <button className="sp-btn sp-btn--outline" type="button" onClick={abrir}>Agencias de envío</button>
      {abierto && (
        <StaffModal titulo="Agencias de envío nacional" onCerrar={() => setAbierto(false)}>
            {cargando ? (
              <StaffEstado tipo="cargando" filas={2} />
            ) : (
              <div className="sp-agencias">
                {agencias.map((a) => (
                  <div key={a.id} className={`sp-agencia ${a.activo ? '' : 'sp-agencia--inactiva'}`}>
                    <p><strong>{a.nombre}</strong> {a.telefono ? `— ${a.telefono}` : ''}</p>
                    <p className="sp-agencia-meta">
                      {a.ubicacion ? `${a.ubicacion} · ` : ''}
                      {a.tarifa_sugerida ? `Tarifa ${formatearUSD(a.tarifa_sugerida)}` : 'Sin tarifa'}
                      {!a.activo && ' · INACTIVA'}
                    </p>
                    <div className="sp-acciones">
                      <button className="sp-btn" onClick={() => editar(a)}>Editar</button>
                      {a.activo && <button className="sp-btn sp-btn--danger" onClick={() => desactivar(a)}>Desactivar</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <hr />
            <div className="sp-agencia-form">
              <input placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              <input placeholder="Ubicación" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
              <input placeholder="Tarifa sugerida (USD)" value={form.tarifa_sugerida} onChange={(e) => setForm({ ...form, tarifa_sugerida: e.target.value })} />
              <div className="sp-acciones">
                <button className="sp-btn" onClick={() => { setEditandoId(null); setForm({ nombre: '', telefono: '', ubicacion: '', tarifa_sugerida: '' }) }}>Limpiar</button>
                <button className="sp-btn sp-btn--principal" onClick={guardar}>{editandoId ? 'Guardar cambios' : 'Crear agencia'}</button>
              </div>
            </div>
        </StaffModal>
      )}
    </>
  )
}

export default AgenciasEnvioModal
