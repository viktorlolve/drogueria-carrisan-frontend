import { useState, useEffect } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffComercial.css'
import { useStaffUI } from '../../hooks/useStaffUI'
import StaffEstado from '../../components/staff/StaffEstado'

const LINEAS = ['Linea Hospitalaria', 'Linea Farmacia', 'Material Medico']
const ITEMS_POR_PAGINA = 20

const formato = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function StaffPrecios() {
  const { avisar } = useStaffUI()
  const [productos, setProductos] = useState([])
  const [laboratorios, setLaboratorios] = useState([])
  const [formas, setFormas] = useState([])
  const [atcs, setAtcs] = useState([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroLinea, setFiltroLinea] = useState('')
  const [filtroForma, setFiltroForma] = useState('')
  const [filtroLaboratorio, setFiltroLaboratorio] = useState('')
  const [filtroAtc, setFiltroAtc] = useState('')
  const [filtroSinPrecio, setFiltroSinPrecio] = useState(false)
  const [paginaActual, setPaginaActual] = useState(1)
  const [sort, setSort] = useState('nombre_asc')
  const [precioEditando, setPrecioEditando] = useState({ id: null, valor: '' })
  const [seleccion, setSeleccion] = useState([])
  const [loteModo, setLoteModo] = useState('fijo') // fijo | sumar | restar | porciento
  const [loteValor, setLoteValor] = useState('')
  const [aplicando, setAplicando] = useState(false)
  const [recarga, setRecarga] = useState(0)

  // Importación de precios por proveedor (COBECA / Drovencentro)
  const [importProveedorSel, setImportProveedorSel] = useState('cobeca')
  const [importArchivo, setImportArchivo] = useState(null)
  const [importCargando, setImportCargando] = useState(false)
  const [importResultado, setImportResultado] = useState(null)
  const [importError, setImportError] = useState('')

  const PROVEEDORES_IMPORT = [
    { id: 'cobeca', nombre: 'COBECA', ext: '.xlsx', ejemplo: 'inventario-cobeca.xlsx' },
    { id: 'drovencentro', nombre: 'Drovencentro', ext: '.xls / .xlsx', ejemplo: 'inventario-drovencentro.XLS' },
  ]

  async function subirImportacion() {
    if (!importArchivo) { setImportError('Selecciona un archivo del proveedor'); return }
    setImportCargando(true)
    setImportError('')
    setImportResultado(null)
    const fd = new FormData()
    fd.append('proveedor', importProveedorSel)
    fd.append('archivo', importArchivo)
    try {
      const { data } = await staffApi.post('/staff/precios/importar-proveedor', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 240000,
      })
      setImportResultado(data)
    } catch (err) {
      setImportError(err.response?.data?.error || 'Error al importar precios del proveedor')
      console.error(err)
    } finally {
      setImportCargando(false)
    }
  }

  function descargarCsv() {
    if (!importResultado?.csv) return
    const blob = new Blob([importResultado.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `precios_${importProveedorSel}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Opciones de filtros (laboratorios, formas, grupos ATC nivel 2)
  useEffect(() => {
    Promise.all([
      staffApi.get('/products/metadata'),
      staffApi.get('/moleculas/atc-clasificaciones', { params: { nivel: 2 } }),
    ])
      .then(([rMeta, rAtc]) => {
        setLaboratorios(rMeta.data.laboratorios || [])
        setFormas(rMeta.data.formas || [])
        setAtcs((rAtc.data || []).map((a) => ({ codigo: a.codigo, nombre: a.nombre })))
      })
      .catch((err) => console.error('Error al cargar filtros de precios:', err))
  }, [])

  // Listado server-side (el spinner inicial sale de `cargando: true`)
  useEffect(() => {
    let activo = true
    const params = new URLSearchParams()
    if (busqueda) params.set('search', busqueda)
    if (filtroLinea) params.set('linea', filtroLinea)
    if (filtroForma) params.set('forma', filtroForma)
    if (filtroLaboratorio) params.set('laboratorio', filtroLaboratorio)
    if (filtroAtc) params.set('atc', filtroAtc)
    if (filtroSinPrecio) params.set('sin_precio', 'true')
    params.set('sort', sort)
    params.set('page', String(paginaActual))
    params.set('limit', String(ITEMS_POR_PAGINA))

    staffApi.get(`/staff/precios?${params.toString()}`)
      .then((res) => {
        if (!activo) return
        setError('')
        setProductos(res.data.productos || res.data)
        setTotal(res.data.total != null ? res.data.total : (res.data.length || 0))
        setSeleccion((prev) => prev.filter((id) => (res.data.productos || res.data).some((p) => p.id === id)))
      })
      .catch((err) => {
        if (!activo) return
        setError('No se pudieron cargar los precios')
        console.error(err)
      })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [busqueda, filtroLinea, filtroForma, filtroLaboratorio, filtroAtc, filtroSinPrecio, sort, paginaActual, recarga])

  // Cambia un filtro y vuelve a la página 1 (se llama desde los onChange)
  function cambiarFiltro(setter, valor) {
    if (paginaActual !== 1) setPaginaActual(1)
    setter(valor)
  }

  function toggleSort(campo) {
    const asc = `${campo}_asc`
    const desc = `${campo}_desc`
    setSort((s) => (s === asc ? desc : s === desc ? asc : asc))
    if (paginaActual !== 1) setPaginaActual(1)
  }

  function toggleSeleccion(id) {
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function guardarPrecioInline(id) {
    const valor = precioEditando.valor
    setPrecioEditando({ id: null, valor: '' })
    const precio = Number(valor)
    if (!Number.isFinite(precio) || precio < 0) return
    try {
      await staffApi.patch(`/staff/precios/${id}`, { precio_usd: precio })
      setError('')
      setRecarga((r) => r + 1)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el precio')
      console.error(err)
    }
  }

  async function aplicarLote() {
    const ids = seleccion
    if (ids.length === 0) { setError('Selecciona al menos un producto'); return }

    const items = []
    let omitidos = 0

    for (const p of productos) {
      if (!ids.includes(p.id)) continue
      const base = p.precio_usd != null ? Number(p.precio_usd) : null
      let precio
      if (loteModo === 'fijo') {
        precio = Number(loteValor)
      } else if (base == null) {
        omitidos++
        continue // sumar/restar/porciento requieren precio base
      } else if (loteModo === 'porciento') {
        precio = base * (1 + (Number(loteValor) / 100))
      } else {
        const delta = Number(loteValor)
        precio = loteModo === 'sumar' ? base + delta : base - delta
      }

      if (!Number.isFinite(precio) || precio < 0) { omitidos++; continue }
      items.push({ id: p.id, precio_usd: Math.round(precio * 100) / 100 })
    }

    if (items.length === 0) { setError('No hay precios que aplicar en la selección'); return }

    setAplicando(true)
    setError('')
    try {
      const { data } = await staffApi.patch('/staff/precios/lote', { items })
      setSeleccion([])
      setLoteValor('')
      setRecarga((r) => r + 1)
      const nota = omitidos ? ` — ${omitidos} sin precio base omitidos` : ''
      avisar(`Precios aplicados: ${data.actualizados}${nota}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al aplicar precios en lote')
      console.error(err)
    } finally {
      setAplicando(false)
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / ITEMS_POR_PAGINA))

  return (
    <LayoutDepartamento departamento="comercial" activo="precios" titulo="Precios">
      <div className="sp-page">
        <div className="sp-toolbar">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => cambiarFiltro(setBusqueda, e.target.value)}
            className="sp-input sp-input--buscar"
          />
          <select value={filtroLinea} onChange={(e) => cambiarFiltro(setFiltroLinea, e.target.value)} className="sp-select">
            <option value="">Todas las líneas</option>
            {LINEAS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={filtroForma} onChange={(e) => cambiarFiltro(setFiltroForma, e.target.value)} className="sp-select">
            <option value="">Todas las formas</option>
            {formas.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={filtroLaboratorio} onChange={(e) => cambiarFiltro(setFiltroLaboratorio, e.target.value)} className="sp-select">
            <option value="">Todos los laboratorios</option>
            {laboratorios.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={filtroAtc} onChange={(e) => cambiarFiltro(setFiltroAtc, e.target.value)} className="sp-select">
            <option value="">Todos los grupos ATC</option>
            {atcs.map((a) => <option key={a.codigo} value={a.codigo}>{a.codigo} — {a.nombre}</option>)}
          </select>
          <label className="sp-check">
            <input
              type="checkbox"
              checked={filtroSinPrecio}
              onChange={(e) => cambiarFiltro(setFiltroSinPrecio, e.target.checked)}
            />
            Solo sin precio
          </label>
        </div>

        <div className="sp-importar">
          <div className="sp-importar__titulo">Importar precios de proveedor</div>
          <div className="sp-importar__fila">
            <select
              value={importProveedorSel}
              onChange={(e) => setImportProveedorSel(e.target.value)}
              className="sp-select"
            >
              {PROVEEDORES_IMPORT.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <label className="sp-importar__file">
              {importArchivo ? importArchivo.name : 'Elegir archivo'}
              <input
                type="file"
                accept={PROVEEDORES_IMPORT.find((p) => p.id === importProveedorSel)?.ext || ''}
                onChange={(e) => setImportArchivo(e.target.files?.[0] || null)}
              />
            </label>
            <button className="sp-btn-aplicar" onClick={subirImportacion} disabled={importCargando}>
              {importCargando ? 'Importando...' : 'Importar'}
            </button>
          </div>
          <div className="sp-importar__hint">
            Formato esperado: {PROVEEDORES_IMPORT.find((p) => p.id === importProveedorSel)?.ejemplo}. La importación actualiza costos ({PROVEEDORES_IMPORT.find((p) => p.id === importProveedorSel)?.nombre}
            ), recalcula precio = costo / 0.6 y aplica "el más barato gana". Los sin-match salen en el CSV de control.
          </div>
          {importError && <p className="sp-error">{importError}</p>}
          {importResultado?.resumen && (
            <div className="sp-importar__resumen">
              <div className="sp-importar__resumen-item">
                <span>Filas</span><strong>{importResultado.resumen.total}</strong>
              </div>
              <div className="sp-importar__resumen-item">
                <span>Matched</span><strong>{importResultado.resumen.matched}</strong>
              </div>
              <div className="sp-importar__resumen-item">
                <span>Sin match</span><strong>{importResultado.resumen.sinMatch}</strong>
              </div>
              <div className="sp-importar__resumen-item">
                <span>Actualizados</span><strong>{importResultado.resumen.actualizados}</strong>
              </div>
              <div className="sp-importar__resumen-item">
                <span>Publicados</span><strong>{importResultado.resumen.publicados}</strong>
              </div>
              {importResultado.csv && (
                <button className="sp-btn-descargar" onClick={descargarCsv}>Descargar CSV</button>
              )}
            </div>
          )}
        </div>

        <div className="sp-resumen">
          Mostrando {productos.length} de {total} productos
        </div>

        {error && <p className="sp-error" role="alert">{error}</p>}

        {cargando ? (
          <StaffEstado tipo="cargando" filas={5} />
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={productos.length > 0 && seleccion.length === productos.length}
                      onChange={(e) => setSeleccion(e.target.checked ? productos.map((p) => p.id) : [])}
                    />
                  </th>
                  <th onClick={() => toggleSort('nombre')} className="sp-sortable">
                    Nombre {sort === 'nombre_asc' ? '↑' : sort === 'nombre_desc' ? '↓' : ''}
                  </th>
                  <th>Laboratorio</th>
                  <th>Línea / Forma</th>
                  <th onClick={() => toggleSort('precio')} className="sp-sortable">
                    Precio USD {sort === 'precio_asc' ? '↑' : sort === 'precio_desc' ? '↓' : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={seleccion.includes(p.id)}
                        onChange={() => toggleSeleccion(p.id)}
                      />
                    </td>
                    <td className="sp-nombre">
                      <div>{p.nombre_comercial}</div>
                      {p.molecula && <div className="sp-mol">{p.molecula}</div>}
                    </td>
                    <td>{p.laboratorio}</td>
                    <td>
                      <span className="spc-badge">{p.linea || '-'}</span>{' '}
                      <span className="spc-badge">{p.forma || '-'}</span>
                    </td>
                    <td className="sp-precio">
                      {precioEditando.id === p.id ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          autoFocus
                          className="sp-input-inline"
                          value={precioEditando.valor}
                          onChange={(e) => setPrecioEditando({ id: p.id, valor: e.target.value })}
                          onBlur={() => guardarPrecioInline(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') guardarPrecioInline(p.id)
                            if (e.key === 'Escape') setPrecioEditando({ id: null, valor: '' })
                          }}
                        />
                      ) : (
                        <button
                          className="sp-precio-btn"
                          onClick={() => setPrecioEditando({ id: p.id, valor: p.precio_usd != null ? String(p.precio_usd) : '' })}
                          title="Editar precio"
                        >
                          {p.precio_usd != null ? `$${formato(p.precio_usd)}` : 'Sin precio'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="sp-paginacion">
            <button disabled={paginaActual === 1} onClick={() => setPaginaActual(1)}>⏮️</button>
            <button disabled={paginaActual === 1} onClick={() => setPaginaActual((p) => p - 1)}>◀️</button>
            <span>Página {paginaActual} de {totalPaginas}</span>
            <button disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual((p) => p + 1)}>▶️</button>
            <button disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual(totalPaginas)}>⏭️</button>
          </div>
        )}

        {seleccion.length > 0 && (
          <div className="sp-lote">
            <strong>Aplicar a {seleccion.length} seleccionados:</strong>
            <select value={loteModo} onChange={(e) => setLoteModo(e.target.value)} className="sp-select sp-select--modo">
              <option value="fijo">Fijar precio</option>
              <option value="sumar">Sumar (+)</option>
              <option value="restar">Restar (−)</option>
              <option value="porciento">Porcentaje (%)</option>
            </select>
            <input
              type="number"
              step="0.01"
              placeholder={loteModo === 'porciento' ? '%' : 'Monto'}
              value={loteValor}
              onChange={(e) => setLoteValor(e.target.value)}
              className="sp-input sp-input--lote"
            />
            <button className="sp-btn-aplicar" onClick={aplicarLote} disabled={aplicando}>
              {aplicando ? 'Aplicando...' : 'Aplicar'}
            </button>
            {loteModo !== 'fijo' && (
              <span className="sp-hint">sumar/restar/% requieren precio base; los sin precio se omiten</span>
            )}
          </div>
        )}
      </div>
    </LayoutDepartamento>
  )
}

export default StaffPrecios