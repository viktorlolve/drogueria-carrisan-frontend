import { useState } from 'react'
import staffApi from '../../api/staffAxios'
import './ColaOrdenes.css'

function AgenciasEnvioModal() {
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
      alert(err.response?.data?.error || 'No se pudieron cargar las agencias')
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
    if (!form.nombre.trim()) return alert('El nombre es requerido')
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
      alert(err.response?.data?.error || 'No se pudo guardar la agencia')
    }
  }

  function editar(a) {
    setEditandoId(a.id)
    setForm({ nombre: a.nombre, telefono: a.telefono || '', ubicacion: a.ubicacion || '', tarifa_sugerida: a.tarifa_sugerida || '' })
  }

  async function desactivar(a) {
    if (!window.confirm(`¿Desactivar la agencia "${a.nombre}"?`)) return
    try {
      await staffApi.delete(`/staff/logistica/agencias/${a.id}`)
      cargar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo desactivar la agencia')
    }
  }

  return (
    <>
      <button className="sp-btn sp-btn--outline" type="button" onClick={abrir}>Agencias de envío</button>
      {abierto && (
        <div className="sp-modal" onClick={() => setAbierto(false)}>
          <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="sp-modal-titulo">Agencias de envío nacional</h3>
            {cargando ? (
              <p>Cargando...</p>
            ) : (
              <div className="sp-agencias">
                {agencias.map((a) => (
                  <div key={a.id} className={`sp-agencia ${a.activo ? '' : 'sp-agencia--inactiva'}`}>
                    <p><strong>{a.nombre}</strong> {a.telefono ? `— ${a.telefono}` : ''}</p>
                    <p className="sp-agencia-meta">
                      {a.ubicacion ? `${a.ubicacion} · ` : ''}
                      {a.tarifa_sugerida ? `Tarifa $${a.tarifa_sugerida}` : 'Sin tarifa'}
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
              <input placeholder="Tarifa sugerida ($)" value={form.tarifa_sugerida} onChange={(e) => setForm({ ...form, tarifa_sugerida: e.target.value })} />
              <div className="sp-acciones">
                <button className="sp-btn" onClick={() => { setEditandoId(null); setForm({ nombre: '', telefono: '', ubicacion: '', tarifa_sugerida: '' }) }}>Limpiar</button>
                <button className="sp-btn sp-btn--principal" onClick={guardar}>{editandoId ? 'Guardar cambios' : 'Crear agencia'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AgenciasEnvioModal
