import { useState, useEffect } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffPendientesInventario.css'
import StaffEstado from '../../components/staff/StaffEstado'
import { Tooltip } from '@chakra-ui/react'

const TABS = [
  { id: 'sin_enlazar', label: 'Sin enlazar' },
  { id: 'sin_proveedor', label: 'Sin proveedor' },
  { id: 'precios_viejos', label: 'Precios viejos' },
]

export default function StaffPendientesInventario() {
  const [tab, setTab] = useState('sin_enlazar')
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)
  const [costoEdit, setCostoEdit] = useState({ id: null, valor: '' })

  function cargar() {
    setCargando(true)
    setError('')
    staffApi.get('/staff/proveedores/pendientes', { params: { tipo: tab, buscar, pagina } })
      .then(r => { setFilas(r.data.filas || []) })
      .catch(e => setError(e.response?.data?.mensaje || 'Error al cargar pendientes'))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    let activo = true
    Promise.resolve().then(() => {
      if (!activo) return
      setCargando(true)
      setError('')
      staffApi.get('/staff/proveedores/pendientes', { params: { tipo: tab, buscar, pagina } })
        .then(r => { if (activo) { setFilas(r.data.filas || []) } })
        .catch(e => { if (activo) setError(e.response?.data?.mensaje || 'Error al cargar pendientes') })
        .finally(() => { if (activo) setCargando(false) })
    })
    return () => { activo = false }
  }, [tab, pagina, buscar])

  function buscarAhora(e) {
    e.preventDefault()
    setPagina(1)
    cargar()
  }

  async function guardarCostoManual() {
    const producto_id = costoEdit.id
    const costo_usd = Number(costoEdit.valor)
    if (!producto_id || !Number.isFinite(costo_usd) || costo_usd < 0) return
    try {
      await staffApi.post('/staff/proveedores/costo-manual', { producto_id, costo_usd })
      setCostoEdit({ id: null, valor: '' })
      cargar()
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al asignar costo')
    }
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="pendientes-inventario" titulo="Pendientes de inventario">
      <div className="spi-page">
        <div className="spi-tabs">
          {TABS.map(t => <button key={t.id} className={`spi-tab ${tab === t.id ? 'spi-tab--active' : ''}`} onClick={() => { setTab(t.id); setPagina(1) }}>{t.label}</button>)}
        </div>
        <form className="spi-toolbar" onSubmit={buscarAhora}>
          <input className="spi-input" value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar..." />
          <button className="spi-btn">Buscar</button>
        </form>
        {error && <p className="spi-error">{error}</p>}
        {cargando ? <StaffEstado tipo="cargando" filas={6} /> : (
          <table className="spi-table">
            <thead>
              <tr>
                {tab === 'sin_enlazar' && (<><th>Descripción</th><th>Laboratorio</th><th>Costo USD</th><th>Proveedor</th></>)}
                {tab === 'sin_proveedor' && (<><th>Producto</th><th>Laboratorio</th><th>Precio USD</th><th>Acción</th></>)}
                {tab === 'precios_viejos' && (<><th>Producto</th><th>Proveedor</th><th>Costo USD</th><th>Días</th><th>Acción</th></>)}
              </tr>
            </thead>
            <tbody>
              {tab === 'sin_enlazar' && filas.map((f, i) => (
                <tr key={i}>
                  <td>{f.descripcion}</td>
                  <td>{f.laboratorio}</td>
                  <td>{f.costo_usd != null ? `$${Number(f.costo_usd).toFixed(2)}` : '-'}</td>
                  <td>{f.subidas_proveedor?.proveedor || '-'}</td>
                </tr>
              ))}
              {tab === 'sin_proveedor' && filas.map(f => (
                <tr key={f.id}>
                  <td>{f.nombre_comercial}</td>
                  <td>{f.laboratorio}</td>
                  <td>{f.precio_usd != null ? `$${Number(f.precio_usd).toFixed(2)}` : 'Sin precio'}</td>
                  <td>
                    {costoEdit.id === f.id ? (
                      <div className="spi-inline">
                        <input className="spi-input spi-input--sm" type="number" step="0.01" value={costoEdit.valor} onChange={e => setCostoEdit({ id: f.id, valor: e.target.value })} />
                        <button className="spi-btn spi-btn--xs" onClick={guardarCostoManual}>Guardar</button>
                        <button className="spi-btn spi-btn--xs" onClick={() => setCostoEdit({ id: null, valor: '' })}>Cancelar</button>
                      </div>
                    ) : (
                      <button className="spi-btn spi-btn--xs" onClick={() => setCostoEdit({ id: f.id, valor: '' })}>Asignar costo</button>
                    )}
                  </td>
                </tr>
              ))}
              {tab === 'precios_viejos' && filas.map((f, i) => (
                <tr key={i}>
                  <td>{f.producto?.nombre_comercial || f.producto_id}</td>
                  <td>{f.proveedor}</td>
                  <td>{f.costo_usd != null ? `$${Number(f.costo_usd).toFixed(2)}` : '-'}</td>
                  <td>{f.dias}</td>
                  <td>
                    <Tooltip label="Crear producto deshabilitado" placement="top">
                      <button className="spi-btn spi-btn--xs" disabled>Crear producto</button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </LayoutDepartamento>
  )
}
