import { useState, useEffect } from 'react'
import api from '../../api/axios'

function FichasProductoAdmin() {
  const [busqueda, setBusqueda] = useState('')
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)

  useEffect(() => {
    if (!busqueda.trim()) return
    const timeout = setTimeout(async () => {
      try {
        setCargando(true)
        const res = await api.get('/products', { params: { search: busqueda } })
        setProductos(res.data)
      } catch (err) {
        console.error(err)
        setError('No se pudieron buscar productos')
      } finally {
        setCargando(false)
      }
    }, 350)
    return () => clearTimeout(timeout)
  }, [busqueda])

  const productosVisibles = busqueda.trim() ? productos : []

  if (productoSeleccionado) {
    return (
      <FichaProductoEditor
        producto={productoSeleccionado}
        onVolver={() => setProductoSeleccionado(null)}
      />
    )
  }

  return (
    <div className="fichas-admin">
      <div className="mol-toolbar">
        <div className="mol-search-box">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Buscar producto por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="mol-error-text">{error}</p>}

      {cargando ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Buscando...</p>
        </div>
      ) : !busqueda.trim() ? (
        <div className="mol-empty-state">Busca un producto para editar su ficha técnica.</div>
      ) : productosVisibles.length === 0 ? (
        <div className="mol-empty-state">No se encontraron productos con ese nombre.</div>
      ) : (
        <div className="mol-table-container">
          <table className="mol-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                <th>Laboratorio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosVisibles.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.nombre_comercial}</strong></td>
                  <td>{p.marcas?.nombre || '-'}</td>
                  <td>{p.laboratorio || '-'}</td>
                  <td>
                    <button onClick={() => setProductoSeleccionado(p)} className="mol-btn-agregar">
                      Editar ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FichaProductoEditor({ producto, onVolver }) {
  const [existeFicha, setExisteFicha] = useState(false)
  const [moleculas, setMoleculas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [mostrarFormMolecula, setMostrarFormMolecula] = useState(false)

  const [form, setForm] = useState({
    indicaciones: '',
    contraindicaciones: '',
    dosis_recomendada: '',
    via_administracion: '',
    efectos_secundarios: '',
    precauciones: '',
    codigo_atc_producto: '',
    titular_registro: '',
    registro_sanitario: '',
    presentacion: '',
    unidades_por_presentacion: '',
    condiciones_almacenamiento: '',
  })
  const [imagenesTexto, setImagenesTexto] = useState('')

  useEffect(() => {
    let activo = true
    Promise.allSettled([
      api.get(`/moleculas/productos/${producto.id}/detalles`),
      api.get(`/moleculas/productos/${producto.id}/moleculas`),
    ])
      .then(([resDetalles, resMoleculas]) => {
        if (!activo) return
        if (resDetalles.status === 'fulfilled') {
          setExisteFicha(true)
          setForm({
            indicaciones: resDetalles.value.data.indicaciones || '',
            contraindicaciones: resDetalles.value.data.contraindicaciones || '',
            dosis_recomendada: resDetalles.value.data.dosis_recomendada || '',
            via_administracion: resDetalles.value.data.via_administracion || '',
            efectos_secundarios: resDetalles.value.data.efectos_secundarios || '',
            precauciones: resDetalles.value.data.precauciones || '',
            codigo_atc_producto: resDetalles.value.data.codigo_atc_producto || '',
            titular_registro: resDetalles.value.data.titular_registro || '',
            registro_sanitario: resDetalles.value.data.registro_sanitario || '',
            presentacion: resDetalles.value.data.presentacion || '',
            unidades_por_presentacion: resDetalles.value.data.unidades_por_presentacion || '',
            condiciones_almacenamiento: resDetalles.value.data.condiciones_almacenamiento || '',
          })
          setImagenesTexto((resDetalles.value.data.imagen_secundaria_urls || []).join(', '))
        } else {
          setExisteFicha(false)
        }

        if (resMoleculas.status === 'fulfilled') {
          setMoleculas(resMoleculas.value.data)
        }
      })
      .catch((err) => {
        if (!activo) return
        console.error(err)
        setError('Error al cargar la ficha del producto')
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [producto.id])

  function handleChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleGuardarFicha(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    setMensajeExito('')

    const payload = {
      ...form,
      unidades_por_presentacion: form.unidades_por_presentacion
        ? Number(form.unidades_por_presentacion)
        : null,
      imagen_secundaria_urls: imagenesTexto
        ? imagenesTexto.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
    }

    try {
      if (existeFicha) {
        await api.patch(`/moleculas/productos/${producto.id}/detalles`, payload)
      } else {
        await api.post(`/moleculas/productos/${producto.id}/detalles`, payload)
        setExisteFicha(true)
      }
      setMensajeExito('Ficha técnica guardada correctamente')
      setTimeout(() => setMensajeExito(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la ficha técnica')
    } finally {
      setGuardando(false)
    }
  }

  async function quitarMolecula(id) {
    try {
      await api.delete(`/moleculas/producto-moleculas/${id}`)
      setMoleculas((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      setError(err.response?.data?.error || 'Error al quitar la molécula')
    }
  }

  async function handleMoleculaAgregada() {
    setMostrarFormMolecula(false)
    const res = await api.get(`/moleculas/productos/${producto.id}/moleculas`)
    setMoleculas(res.data)
  }

  if (cargando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando ficha...</p>
      </div>
    )
  }

  return (
    <div className="ficha-editor">
      <button onClick={onVolver} className="mol-link-btn" style={{ marginBottom: '1rem' }}>
        ← Volver a la búsqueda
      </button>

      <h3 style={{ color: '#1a1a3a' }}>{producto.nombre_comercial}</h3>

      {/* -------- Moléculas asociadas -------- */}
      <div className="ficha-seccion">
        <div className="mol-toolbar">
          <h4>Moléculas / principios activos</h4>
          <button onClick={() => setMostrarFormMolecula(true)} className="mol-btn-agregar">
            + Asociar molécula
          </button>
        </div>

        {moleculas.length === 0 ? (
          <div className="mol-empty-state">Este producto no tiene moléculas asociadas.</div>
        ) : (
          <div className="mol-table-container">
            <table className="mol-table">
              <thead>
                <tr>
                  <th>Molécula</th>
                  <th>Concentración</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {moleculas.map((m) => (
                  <tr key={m.id}>
                    <td>{m.moleculas_referencias?.nombre}</td>
                    <td>
                      {m.concentracion ? `${m.concentracion} ${m.unidad_concentracion || ''}` : '-'}
                    </td>
                    <td>
                      <button onClick={() => quitarMolecula(m.id)} className="mol-btn-icon danger" title="Quitar">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* -------- Ficha técnica -------- */}
      <div className="ficha-seccion">
        <h4>Ficha técnica</h4>
        <form onSubmit={handleGuardarFicha}>
          <div className="mol-form-group">
            <label>Indicaciones</label>
            <textarea value={form.indicaciones} onChange={(e) => handleChange('indicaciones', e.target.value)} />
          </div>
          <div className="mol-form-group">
            <label>Contraindicaciones</label>
            <textarea value={form.contraindicaciones} onChange={(e) => handleChange('contraindicaciones', e.target.value)} />
          </div>
          <div className="mol-form-row">
            <div className="mol-form-group">
              <label>Dosis recomendada</label>
              <input type="text" value={form.dosis_recomendada} onChange={(e) => handleChange('dosis_recomendada', e.target.value)} />
            </div>
            <div className="mol-form-group">
              <label>Vía de administración</label>
              <input type="text" value={form.via_administracion} onChange={(e) => handleChange('via_administracion', e.target.value)} placeholder="ej. Oral" />
            </div>
          </div>
          <div className="mol-form-group">
            <label>Efectos secundarios</label>
            <textarea value={form.efectos_secundarios} onChange={(e) => handleChange('efectos_secundarios', e.target.value)} />
          </div>
          <div className="mol-form-group">
            <label>Precauciones / advertencias</label>
            <textarea value={form.precauciones} onChange={(e) => handleChange('precauciones', e.target.value)} />
          </div>

          <hr className="ficha-divider" />

          <div className="mol-form-row">
            <div className="mol-form-group">
              <label>Código ATC del producto</label>
              <input type="text" value={form.codigo_atc_producto} onChange={(e) => handleChange('codigo_atc_producto', e.target.value.toUpperCase())} placeholder="ej. N02BE01" />
            </div>
            <div className="mol-form-group">
              <label>Registro sanitario (INHRR)</label>
              <input type="text" value={form.registro_sanitario} onChange={(e) => handleChange('registro_sanitario', e.target.value)} />
            </div>
          </div>
          <div className="mol-form-group">
            <label>Titular del registro (laboratorio)</label>
            <input type="text" value={form.titular_registro} onChange={(e) => handleChange('titular_registro', e.target.value)} />
          </div>

          <hr className="ficha-divider" />

          <div className="mol-form-row">
            <div className="mol-form-group">
              <label>Presentación</label>
              <input type="text" value={form.presentacion} onChange={(e) => handleChange('presentacion', e.target.value)} placeholder="ej. Caja x 20 tabletas" />
            </div>
            <div className="mol-form-group">
              <label>Unidades por presentación</label>
              <input type="number" value={form.unidades_por_presentacion} onChange={(e) => handleChange('unidades_por_presentacion', e.target.value)} />
            </div>
          </div>
          <div className="mol-form-group">
            <label>Condiciones de almacenamiento</label>
            <input type="text" value={form.condiciones_almacenamiento} onChange={(e) => handleChange('condiciones_almacenamiento', e.target.value)} placeholder="ej. Conservar entre 15-30°C" />
          </div>

          <hr className="ficha-divider" />

          <div className="mol-form-group">
            <label>Imágenes de galería (URLs separadas por coma)</label>
            <textarea
              value={imagenesTexto}
              onChange={(e) => setImagenesTexto(e.target.value)}
              placeholder="https://.../foto2.jpg, https://.../foto3.jpg"
            />
          </div>

          {error && <p className="mol-error-text">{error}</p>}
          {mensajeExito && <p className="mol-success-text">{mensajeExito}</p>}

          <div className="mol-modal-acciones">
            <button type="submit" disabled={guardando} className="mol-btn-guardar">
              {guardando ? 'Guardando...' : existeFicha ? 'Actualizar ficha' : 'Crear ficha'}
            </button>
          </div>
        </form>
      </div>

      {mostrarFormMolecula && (
        <AsociarMoleculaForm
          productoId={producto.id}
          onClose={() => setMostrarFormMolecula(false)}
          onGuardado={handleMoleculaAgregada}
        />
      )}
    </div>
  )
}

function AsociarMoleculaForm({ productoId, onClose, onGuardado }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [moleculaId, setMoleculaId] = useState(null)
  const [nombreSeleccionado, setNombreSeleccionado] = useState('')
  const [concentracion, setConcentracion] = useState('')
  const [unidad, setUnidad] = useState('mg')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!busqueda.trim() || moleculaId) return
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get('/moleculas/moleculas', { params: { search: busqueda } })
        setResultados(res.data.slice(0, 8))
      } catch (err) {
        console.error(err)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [busqueda, moleculaId])

  const resultadosVisibles = !busqueda.trim() || moleculaId ? [] : resultados

  function seleccionar(m) {
    setMoleculaId(m.id)
    setNombreSeleccionado(m.nombre)
    setBusqueda(m.nombre)
    setResultados([])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!moleculaId) {
      setError('Selecciona una molécula de la lista')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await api.post(`/moleculas/productos/${productoId}/moleculas`, {
        molecula_id: moleculaId,
        concentracion: concentracion ? Number(concentracion) : null,
        unidad_concentracion: unidad || null,
      })
      onGuardado()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al asociar la molécula')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="mol-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>+ Asociar molécula</h3>
        <form onSubmit={handleSubmit}>
          <div className="mol-form-group" style={{ position: 'relative' }}>
            <label>Molécula</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                if (moleculaId) setMoleculaId(null)
              }}
              placeholder="Buscar molécula..."
            />
            {resultadosVisibles.length > 0 && (
              <div className="mol-autocomplete-list">
                {resultadosVisibles.map((m) => (
                  <button type="button" key={m.id} className="mol-autocomplete-item" onClick={() => seleccionar(m)}>
                    {m.nombre}
                  </button>
                ))}
              </div>
            )}
            {nombreSeleccionado && !resultadosVisibles.length && (
              <span style={{ fontSize: '0.8rem', color: '#059669' }}>✓ {nombreSeleccionado} seleccionada</span>
            )}
          </div>

          <div className="mol-form-row">
            <div className="mol-form-group">
              <label>Concentración</label>
              <input type="number" step="any" value={concentracion} onChange={(e) => setConcentracion(e.target.value)} placeholder="ej. 500" />
            </div>
            <div className="mol-form-group">
              <label>Unidad</label>
              <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                <option value="mg">mg</option>
                <option value="mg/ml">mg/ml</option>
                <option value="mcg">mcg</option>
                <option value="%">%</option>
                <option value="g">g</option>
                <option value="UI">UI</option>
              </select>
            </div>
          </div>

          {error && <p className="mol-error-text">{error}</p>}

          <div className="mol-modal-acciones">
            <button type="button" onClick={onClose} className="mol-btn-cancelar">Cancelar</button>
            <button type="submit" disabled={guardando} className="mol-btn-guardar">
              {guardando ? 'Guardando...' : 'Asociar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FichasProductoAdmin
