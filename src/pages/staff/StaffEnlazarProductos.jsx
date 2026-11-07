import { useState, useEffect, useCallback } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffEnlazarProductos.css'

const PROVEEDORES = [
  { id: 'cobeca', nombre: 'COBECA' },
  { id: 'drovencentro', nombre: 'Drovencentro' },
  { id: 'med-importados', nombre: 'MED IMPORTADOS' },
  { id: 'bioglass', nombre: 'BIOGLASS' },
  { id: 'bc-group', nombre: 'BC GROUP' },
]

export default function StaffEnlazarProductos() {
  const [provSel, setProvSel] = useState('cobeca')
  const [buscar, setBuscar] = useState('')
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  // Resultado de búsqueda de productos del catálogo por fila: { [filaIdx]: [{ id, nombre_comercial, laboratorio, sku }] }
  const [resultadosBusqueda, setResultadosBusqueda] = useState({})
  // Producto elegido por fila: { [filaIdx]: { id, nombre_comercial } }
  const [elegido, setElegido] = useState({})
  // Filas en proceso de enlace (para deshabilitar botón)
  const [enlazando, setEnlazando] = useState({})

  const cargar = useCallback(() => {
    setCargando(true)
    setError('')
    staffApi.get('/staff/proveedores/pendientes', {
      params: { tipo: 'sin_enlazar', proveedor: provSel, buscar, pagina: 1 },
    })
      .then(r => {
        setFilas(r.data.filas || [])
        setElegido({})
        setResultadosBusqueda({})
      })
      .catch(e => setError(e.response?.data?.mensaje || 'Error al cargar sin enlazar'))
      .finally(() => setCargando(false))
  }, [provSel, buscar])

  useEffect(() => {
    let activo = true
    Promise.resolve().then(() => {
      if (!activo) return
      cargar()
    })
    return () => { activo = false }
  }, [cargar])

  function buscarProductos(idx, fila) {
    const term = (fila.descripcion || '').trim()
    if (!term) return
    setResultadosBusqueda({ ...resultadosBusqueda, [idx]: null }) // cargando
    staffApi.get('/staff/precios/productos', {
      params: { search: term, limit: 10 },
    })
      .then(r => {
        const data = r.data?.productos || r.data || []
        setResultadosBusqueda({ ...resultadosBusqueda, [idx]: data })
      })
      .catch(() => setResultadosBusqueda({ ...resultadosBusqueda, [idx]: [] }))
  }

  function seleccionarProducto(idx, producto) {
    setElegido({ ...elegido, [idx]: producto })
    setResultadosBusqueda({ ...resultadosBusqueda, [idx]: [] })
  }

  async function enlazar(idx, fila) {
    const prod = elegido[idx]
    if (!prod) { setError('Selecciona un producto del catálogo'); return }
    setEnlazando({ ...enlazando, [idx]: true })
    try {
      await staffApi.post('/staff/proveedores/enlazar', {
        proveedor: provSel,
        producto_id: prod.id,
        costo_usd: fila.costo_usd,
        subida_id: fila.subida_id,
        descripcion: fila.descripcion,
      })
      // Quitar la fila enlazada de la lista local
      setFilas(filas.filter((_, i) => i !== idx))
      setElegido(Object.fromEntries(Object.entries(elegido).filter(([k]) => Number(k) !== idx)))
      setResultadosBusqueda(Object.fromEntries(Object.entries(resultadosBusqueda).filter(([k]) => Number(k) !== idx)))
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al enlazar')
    } finally {
      setEnlazando({ ...enlazando, [idx]: false })
    }
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="enlazar-productos" titulo="Enlazar productos del proveedor">
      <div className="sep-page">
        <div className="sep-toolbar">
          <select className="sep-select" value={provSel} onChange={e => { setProvSel(e.target.value); setBuscar('') }}>
            {PROVEEDORES.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input
            className="sep-input"
            placeholder="Buscar descripción…"
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
          <button className="sep-btn sep-btn--primary" onClick={cargar} disabled={cargando}>
            {cargando ? 'Cargando…' : 'Buscar'}
          </button>
          {error && <span className="sep-error">{error}</span>}
        </div>

        {cargando ? (
          <div className="sep-vacio">Cargando filas sin enlazar…</div>
        ) : filas.length === 0 ? (
          <div className="sep-vacio">No hay filas sin enlazar para este proveedor.</div>
        ) : (
          <table className="sep-table">
            <thead>
              <tr>
                <th>Descripción (Excel)</th>
                <th>Laboratorio</th>
                <th>Costo USD</th>
                <th>Pack</th>
                <th>Enlazar a producto del catálogo</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, idx) => {
                const prod = elegido[idx]
                const res = resultadosBusqueda[idx]
                const cargandoRes = res === null
                return (
                  <tr key={idx}>
                    <td className="sep-desc">{fila.descripcion || '-'}</td>
                    <td>{fila.laboratorio || '-'}</td>
                    <td>{fila.costo_usd != null ? `$${Number(fila.costo_usd).toFixed(2)}` : '-'}</td>
                    <td>{fila.pack != null ? fila.pack : '-'}</td>
                    <td className="sep-accion">
                      <div className="sep-buscar">
                        <input
                          className="sep-input sep-input--sm"
                          placeholder="Buscar producto…"
                          onChange={e => buscarProductos(idx, { ...fila, descripcion: e.target.value })}
                        />
                        {cargandoRes && <span className="sep-badge sep-badge--cargando">Buscando…</span>}
                      </div>
                      {res && res.length > 0 && (
                        <div className="sep-opciones">
                          {res.map(p => (
                            <button
                              key={p.id}
                              className={`sep-opcion ${elegido[idx]?.id === p.id ? 'sep-opcion--sel' : ''}`}
                              onClick={() => seleccionarProducto(idx, p)}
                            >
                              {p.nombre_comercial} {p.sku ? `(${p.sku})` : ''}
                            </button>
                          ))}
                        </div>
                      )}
                      {!prod ? (
                        <button
                          className="sep-btn sep-btn--xs"
                          disabled={!fila.descripcion}
                          onClick={() => buscarProductos(idx, fila)}
                        >
                          Buscar producto
                        </button>
                      ) : (
                        <div className="sep-elegido">
                          <span className="sep-badge sep-badge--ok">Elegido: {prod.nombre_comercial}</span>
                          <button
                            className="sep-btn sep-btn--xs sep-btn--primary"
                            disabled={enlazando[idx]}
                            onClick={() => enlazar(idx, fila)}
                          >
                            {enlazando[idx] ? 'Enlazando…' : 'Enlazar'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </LayoutDepartamento>
  )
}
