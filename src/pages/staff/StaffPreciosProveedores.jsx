import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffPreciosProveedores.css'
import { useStaffUI } from '../../hooks/useStaffUI'
import StaffEstado from '../../components/staff/StaffEstado'

const PROVEEDORES = [
  { id: 'cobeca', nombre: 'COBECA' },
  { id: 'drovencentro', nombre: 'Drovencentro' },
  { id: 'bioglass', nombre: 'BIOGLASS' },
  { id: 'bc-group', nombre: 'BC GROUP' },
  { id: 'med-importados', nombre: 'MED IMPORTADOS' },
]

function formatoFecha(f) {
  if (!f) return '-'
  try {
    const d = new Date(f)
    return d.toLocaleString()
  } catch {
    return f
  }
}

export default function StaffPreciosProveedores() {
  const { avisar } = useStaffUI()
  const navigate = useNavigate()
  const [resumen, setResumen] = useState({ proveedores: [], totales: {} })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [provSel, setProvSel] = useState('cobeca')
  const [archivo, setArchivo] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [resultado, setResultado] = useState(null)

  function cargar() {
    setCargando(true)
    setError('')
    staffApi.get('/staff/proveedores/resumen')
      .then(r => setResumen(r.data || { proveedores: [], totales: {} }))
      .catch(e => setError(e.response?.data?.mensaje || 'Error al cargar resumen'))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    let activo = true
    Promise.resolve().then(() => {
      if (!activo) return
      setCargando(true)
      setError('')
      staffApi.get('/staff/proveedores/resumen')
        .then(r => { if (activo) setResumen(r.data || { proveedores: [], totales: {} }) })
        .catch(e => { if (activo) setError(e.response?.data?.mensaje || 'Error al cargar resumen') })
        .finally(() => { if (activo) setCargando(false) })
    })
    return () => { activo = false }
  }, [])

  async function importar() {
    if (!archivo) { setError('Selecciona un archivo'); return }
    setSubiendo(true)
    setError('')
    setResultado(null)
    const fd = new FormData()
    fd.append('archivo', archivo)
    try {
      const { data } = await staffApi.post(`/staff/proveedores/${provSel}/importar`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      })
      setResultado(data)
      avisar('Importación completada')
      setArchivo(null)
      cargar()
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al importar')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="precios-proveedores" titulo="Actualización de precios por proveedor">
      <div className="spp-page">
        <div className="spp-grid">
          <div className="spp-card">
            <div className="spp-card__titulo">Subir archivo</div>
            <div className="spp-fila">
              <select className="spp-select" value={provSel} onChange={e => setProvSel(e.target.value)}>
                {PROVEEDORES.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <label className="spp-file">
                {archivo ? archivo.name : 'Elegir archivo (.xlsx/.xls/.csv)'}
                <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setArchivo(e.target.files?.[0] || null)} />
              </label>
              <button className="spp-btn spp-btn--primary" onClick={importar} disabled={subiendo}>{subiendo ? 'Importando...' : 'Importar'}</button>
            </div>
            <div className="spp-hint">Solo se actualizan precios/costos. No se crean productos nuevos. Los sin enlazar van a Pendientes.</div>
            {error && <p className="spp-error">{error}</p>}
            {resultado && (
              <div className="spp-recibo">
                <div className="spp-recibo__titulo">Recibo de importación</div>
                <div className="spp-recibo__grid">
                  <div><span>Filas leídas</span><strong>{resultado.total || 0}</strong></div>
                  <div><span>Actualizados</span><strong>{resultado.actualizados || 0}</strong></div>
                  <div><span>Subieron</span><strong>{resultado.subieron || 0}</strong></div>
                  <div><span>Bajaron</span><strong>{resultado.bajaron || 0}</strong></div>
                  <div><span>Iguales</span><strong>{resultado.iguales || 0}</strong></div>
                  <div><span>Puestos en 0</span><strong>{resultado.puestosEnCero || 0}</strong></div>
                  <div><span>Sin enlazar</span><strong>{resultado.sin_enlazar || 0}</strong></div>
                </div>
              </div>
            )}
          </div>
          <div className="spp-card">
            <div className="spp-card__titulo">Estado por proveedor</div>
            {cargando ? <StaffEstado tipo="cargando" filas={5} /> : (
              <table className="spp-table">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>Última subida</th>
                    <th>Sin enlazar</th>
                    <th>Precios viejos (&gt;60d)</th>
                  </tr>
                </thead>
                <tbody>
                  {(resumen.proveedores || []).map(p => (
                    <tr key={p.proveedor}>
                      <td>{p.nombre}</td>
                      <td>{p.ultimaSubida ? `${formatoFecha(p.ultimaSubida.fecha)} (${p.ultimaSubida.dias}d)` : '-'}</td>
                      <td>{p.sinEnlazar || 0}</td>
                      <td>{p.preciosViejos || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="spp-totales">
              <span>Sin proveedor: <strong>{resumen.totales?.sinProveedor || 0}</strong></span>
              <span>Sin enlazar total: <strong>{resumen.totales?.sinEnlazarTotal || 0}</strong></span>
              <button className="spp-btn" onClick={() => navigate('/staff/pendientes-inventario')}>Ver pendientes</button>
            </div>
          </div>
        </div>
      </div>
    </LayoutDepartamento>
  )
}
