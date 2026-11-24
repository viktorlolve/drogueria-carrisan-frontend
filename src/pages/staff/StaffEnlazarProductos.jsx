import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Check } from 'lucide-react'
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
  const [searchParams] = useSearchParams()
  // Si se llega desde "Proveedores" (?proveedor=cobeca), arranca ya con ese
  // proveedor elegido en vez del primero de la lista.
  const proveedorInicial = searchParams.get('proveedor')
  const [provSel, setProvSel] = useState(
    PROVEEDORES.some((p) => p.id === proveedorInicial) ? proveedorInicial : 'cobeca'
  )
  const [buscar, setBuscar] = useState('')
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  // Texto escrito en el buscador de CADA fila: { [filaIdx]: 'texto' }
  const [queryPorFila, setQueryPorFila] = useState({})
  // Resultado de búsqueda de productos del catálogo por fila:
  // { [filaIdx]: undefined (sin buscar aún) | null (buscando) | [] (sin resultados) | [{ id, nombre_comercial, laboratorio, sku }] }
  const [resultadosBusqueda, setResultadosBusqueda] = useState({})
  // Error de la búsqueda por fila: un 403/500 NO es lo mismo que "sin coincidencias".
  const [errorBusqueda, setErrorBusqueda] = useState({})
  // Producto elegido por fila: { [filaIdx]: { id, nombre_comercial } }
  const [elegido, setElegido] = useState({})
  // Filas en proceso de enlace (para deshabilitar botón)
  const [enlazando, setEnlazando] = useState({})

  // Un timer de debounce por fila, para no pegarle al backend en cada tecla.
  const timersRef = useRef({})
  useEffect(() => () => {
    Object.values(timersRef.current).forEach(clearTimeout)
  }, [])

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
        setErrorBusqueda({})
        setQueryPorFila({})
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

  function buscarProductos(idx, term) {
    if (timersRef.current[idx]) clearTimeout(timersRef.current[idx])

    const limpio = (term || '').trim()
    if (!limpio) {
      setResultadosBusqueda((prev) => ({ ...prev, [idx]: undefined }))
      setErrorBusqueda((prev) => ({ ...prev, [idx]: '' }))
      return
    }

    timersRef.current[idx] = setTimeout(() => {
      setResultadosBusqueda((prev) => ({ ...prev, [idx]: null })) // cargando
      setErrorBusqueda((prev) => ({ ...prev, [idx]: '' }))
      // El buscador real del catálogo es GET /staff/precios (sin `page` → array plano).
      // /staff/precios/productos no existe: caía en el catch y parecía "sin resultados".
      staffApi.get('/staff/precios', { params: { search: limpio, limit: 10 } })
        .then(r => {
          const data = r.data?.productos || r.data || []
          setResultadosBusqueda((prev) => ({ ...prev, [idx]: data }))
        })
        .catch(e => {
          const mensaje = e.response?.data?.error || e.response?.data?.mensaje || 'No se pudo buscar en el catálogo'
          setErrorBusqueda((prev) => ({ ...prev, [idx]: mensaje }))
          setResultadosBusqueda((prev) => ({ ...prev, [idx]: undefined }))
        })
    }, 280)
  }

  function onCambiarQuery(idx, valor) {
    setQueryPorFila((prev) => ({ ...prev, [idx]: valor }))
    buscarProductos(idx, valor)
  }

  function seleccionarProducto(idx, producto) {
    setElegido((prev) => ({ ...prev, [idx]: producto }))
    setResultadosBusqueda((prev) => ({ ...prev, [idx]: undefined }))
    setErrorBusqueda((prev) => ({ ...prev, [idx]: '' }))
    setQueryPorFila((prev) => ({ ...prev, [idx]: '' }))
  }

  function cambiarEleccion(idx) {
    setElegido((prev) => {
      const siguiente = { ...prev }
      delete siguiente[idx]
      return siguiente
    })
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
        // id de la fila de subidas_sin_enlazar: borrar SOLO esta, no toda la subida.
        fila_id: fila.id,
        descripcion: fila.descripcion,
      })
      // Quitar la fila enlazada de la lista local
      setFilas(filas.filter((_, i) => i !== idx))
      setElegido(Object.fromEntries(Object.entries(elegido).filter(([k]) => Number(k) !== idx)))
      setResultadosBusqueda(Object.fromEntries(Object.entries(resultadosBusqueda).filter(([k]) => Number(k) !== idx)))
      setErrorBusqueda(Object.fromEntries(Object.entries(errorBusqueda).filter(([k]) => Number(k) !== idx)))
      setQueryPorFila(Object.fromEntries(Object.entries(queryPorFila).filter(([k]) => Number(k) !== idx)))
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al enlazar')
    } finally {
      setEnlazando({ ...enlazando, [idx]: false })
    }
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="enlazar-productos" titulo="Enlazar productos del proveedor">
      <div className="sep-page">
        <p className="sep-label">Proveedor</p>
        <div className="sep-chips">
          {PROVEEDORES.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`sep-chip ${provSel === p.id ? 'sep-chip--activo' : ''}`}
              onClick={() => { setProvSel(p.id); setBuscar('') }}
            >
              {p.nombre}
            </button>
          ))}
        </div>

        <div className="sep-toolbar">
          <div className="sep-buscador-global">
            <Search size={15} />
            <input
              placeholder="Buscar por descripción del Excel..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') cargar() }}
            />
          </div>
          <button type="button" className="sep-btn-buscar" onClick={cargar} disabled={cargando}>
            {cargando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {error && <p className="sep-error">{error}</p>}

        {cargando ? (
          <div className="sep-vacio">Cargando filas sin enlazar...</div>
        ) : filas.length === 0 ? (
          <div className="sep-vacio">No hay filas sin enlazar para este proveedor.</div>
        ) : (
          <div className="sep-lista">
            {filas.map((fila, idx) => {
              const prod = elegido[idx]
              const res = resultadosBusqueda[idx]
              const errorRes = errorBusqueda[idx]
              const cargandoRes = res === null
              const sinResultados = Array.isArray(res) && res.length === 0 && !errorRes && (queryPorFila[idx] || '').trim()

              return (
                <div key={idx} className="sep-card">
                  <p className="sep-card-desc">{fila.descripcion || 'Sin descripción'}</p>
                  <div className="sep-card-meta">
                    {fila.laboratorio && <span>{fila.laboratorio}</span>}
                    <span>{fila.costo_usd != null ? `$${Number(fila.costo_usd).toFixed(2)}` : 'Sin costo'}</span>
                    {fila.pack != null && <span>Pack {fila.pack}</span>}
                  </div>

                  {!prod ? (
                    <div className="sep-buscador-fila">
                      <div className="sep-buscador">
                        <Search size={15} />
                        <input
                          placeholder="Buscar producto del catálogo..."
                          value={queryPorFila[idx] || ''}
                          onChange={e => onCambiarQuery(idx, e.target.value)}
                        />
                      </div>

                      {cargandoRes && <p className="sep-aviso">Buscando...</p>}
                      {sinResultados && <p className="sep-aviso">Sin productos que coincidan</p>}
                      {errorRes && <p className="sep-error sep-error--fila">Error al buscar: {errorRes}</p>}

                      {Array.isArray(res) && res.length > 0 && (
                        <div className="sep-opciones">
                          {res.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className="sep-opcion"
                              onClick={() => seleccionarProducto(idx, p)}
                            >
                              <span className="sep-opcion-nombre">{p.nombre_comercial}</span>
                              {p.sku && <span className="sep-opcion-sku">{p.sku}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="sep-elegido">
                      <span className="sep-badge sep-badge--ok">
                        <Check size={13} />
                        {prod.nombre_comercial}
                      </span>
                      <button type="button" className="sep-link-btn" onClick={() => cambiarEleccion(idx)}>
                        Cambiar
                      </button>
                    </div>
                  )}

                  {prod && (
                    <button
                      type="button"
                      className="sep-btn-enlazar"
                      disabled={enlazando[idx]}
                      onClick={() => enlazar(idx, fila)}
                    >
                      {enlazando[idx] ? 'Enlazando...' : 'Enlazar'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </LayoutDepartamento>
  )
}