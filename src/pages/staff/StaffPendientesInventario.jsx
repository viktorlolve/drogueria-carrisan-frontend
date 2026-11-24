import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
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

// Mismos 5 proveedores que StaffPreciosProveedores.jsx — solo para mostrar
// el nombre bonito del chip de filtro ("Filtrando: COBECA"), no se llama a
// esa página desde aquí así que se repite la lista en vez de acoplarlas.
const NOMBRES_PROVEEDOR = {
  cobeca: 'COBECA',
  drovencentro: 'Drovencentro',
  bioglass: 'BIOGLASS',
  'bc-group': 'BC GROUP',
  'med-importados': 'MED IMPORTADOS',
}

// Nombre del producto de forma totalmente defensiva. El backend devuelve
// `producto` como objeto completo ({ id, nombre_comercial, ... }) o null cuando
// no se encuentra en el mapa. Renderizar ese objeto directamente dispara el
// error #130 de React ("Objects are not valid as a React child").
function nombreProducto(fila) {
  const p = fila && fila.producto
  if (!p) return String((fila && fila.producto_id) ?? '-')
  if (typeof p === 'string') return p || '-'
  if (typeof p === 'object') {
    if (Array.isArray(p)) return p.map(nombreProducto).join(', ') || '-'
    const nombre = p.nombre_comercial ?? p.nombre ?? p.id
    return nombre != null ? String(nombre) : '-'
  }
  return String(p)
}

export default function StaffPendientesInventario() {
  const [searchParams, setSearchParams] = useSearchParams()
  // Si se llega desde "Proveedores" (p. ej. ?tipo=sin_enlazar&proveedor=cobeca),
  // arranca ya en esa pestaña y con ese proveedor filtrado.
  const tipoInicial = searchParams.get('tipo')
  const [tab, setTab] = useState(TABS.some(t => t.id === tipoInicial) ? tipoInicial : 'sin_enlazar')
  const [proveedorFiltro, setProveedorFiltro] = useState(searchParams.get('proveedor') || '')
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)
  const [costoEdit, setCostoEdit] = useState({ id: null, valor: '' })

  const cargar = useCallback(() => {
    setCargando(true)
    setError('')
    staffApi.get('/staff/proveedores/pendientes', { params: { tipo: tab, proveedor: proveedorFiltro || undefined, buscar, pagina } })
      .then(r => { setFilas(Array.isArray(r.data?.filas) ? r.data.filas : []) })
      .catch(e => setError(e.response?.data?.mensaje || 'Error al cargar pendientes'))
      .finally(() => setCargando(false))
  }, [tab, proveedorFiltro, buscar, pagina])

  // El fetch se dispara desde un microtask con guarda de cancelación para no
  // tocar setState directamente dentro del body del efecto (regla
  // react-hooks/set-state-in-effect) y evitar carreras al cambiar de tab.
  useEffect(() => {
    let cancelado = false
    Promise.resolve().then(() => {
      if (!cancelado) cargar()
    })
    return () => { cancelado = true }
  }, [cargar])

  function quitarFiltroProveedor() {
    setProveedorFiltro('')
    setPagina(1)
    const params = new URLSearchParams(searchParams)
    params.delete('proveedor')
    setSearchParams(params)
  }

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
        {proveedorFiltro && (
          <div className="spi-filtro-proveedor">
            Filtrando: {NOMBRES_PROVEEDOR[proveedorFiltro] || proveedorFiltro}
            <button type="button" onClick={quitarFiltroProveedor} aria-label="Quitar filtro de proveedor">
              <X size={13} />
            </button>
          </div>
        )}
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
                  <td>{String(f.descripcion ?? '-')}</td>
                  <td>{String(f.laboratorio ?? '-')}</td>
                  <td>{f.costo_usd != null ? `$${Number(f.costo_usd).toFixed(2)}` : '-'}</td>
                  <td>{String(f.subidas_proveedor?.proveedor ?? '-')}</td>
                </tr>
              ))}
              {tab === 'sin_proveedor' && filas.map(f => (
                <tr key={f.id}>
                  <td>{String(f.nombre_comercial ?? '-')}</td>
                  <td>{String(f.laboratorio ?? '-')}</td>
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
                <tr key={f.producto_id || String(f.fecha) || i}>
                  <td>{nombreProducto(f)}</td>
                  <td>{String(f.proveedor ?? '-')}</td>
                  <td>{f.costo_usd != null ? `$${Number(f.costo_usd).toFixed(2)}` : '-'}</td>
                  <td>{f.dias != null ? String(f.dias) : '-'}</td>
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