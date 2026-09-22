import { useState, useEffect } from 'react'
import api from '../../api/axios'

function MoleculasAdmin() {
  const [moleculas, setMoleculas] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [moleculaEnEdicion, setMoleculaEnEdicion] = useState(null)
  const [moleculaAEliminar, setMoleculaAEliminar] = useState(null)

  useEffect(() => {
    cargarMoleculas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Búsqueda con debounce simple: espera 350ms tras dejar de tipear
  useEffect(() => {
    const timeout = setTimeout(() => {
      cargarMoleculas()
    }, 350)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  async function cargarMoleculas() {
    try {
      setCargando(true)
      setError('')
      const params = busqueda ? { search: busqueda } : {}
      const res = await api.get('/moleculas/moleculas', { params })
      setMoleculas(res.data)
    } catch (err) {
      setError('No se pudieron cargar las moléculas')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  function abrirNuevo() {
    setMoleculaEnEdicion(null)
    setMostrarForm(true)
  }

  function abrirEdicion(molecula) {
    setMoleculaEnEdicion(molecula)
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setMoleculaEnEdicion(null)
  }

  async function handleGuardado() {
    cerrarForm()
    await cargarMoleculas()
  }

  async function eliminarMolecula(id) {
    try {
      await api.delete(`/moleculas/moleculas/${id}`)
      setMoleculaAEliminar(null)
      await cargarMoleculas()
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al eliminar la molécula'
      setError(msg)
      setMoleculaAEliminar(null)
    }
  }

  return (
    <div className="moleculas-admin">
      <div className="mol-toolbar">
        <div className="mol-search-box">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Buscar molécula (tolera errores de tipeo)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <button onClick={abrirNuevo} className="mol-btn-agregar">
          + Nueva Molécula
        </button>
      </div>

      {error && <p className="mol-error-text">{error}</p>}

      {cargando ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
      ) : moleculas.length === 0 ? (
        <div className="mol-empty-state">No hay moléculas registradas todavía.</div>
      ) : (
        <div className="mol-table-container">
          <table className="mol-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Nombre genérico (EN)</th>
                <th>Clasificación ATC</th>
                <th>Sinónimos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {moleculas.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.nombre}</strong></td>
                  <td>{m.nombre_generico_en || '-'}</td>
                  <td>
                    {m.atc_clasificaciones ? (
                      <span className="mol-badge-nivel">
                        {m.atc_clasificaciones.codigo} — {m.atc_clasificaciones.nombre}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>Sin clasificar</span>
                    )}
                  </td>
                  <td>{m.sinonimos?.length ? m.sinonimos.join(', ') : '-'}</td>
                  <td>
                    <div className="mol-acciones-cell">
                      <button onClick={() => abrirEdicion(m)} className="mol-btn-icon" title="Editar">
                        ✏️
                      </button>
                      <button
                        onClick={() => setMoleculaAEliminar(m)}
                        className="mol-btn-icon danger"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {moleculaAEliminar && (
        <div className="modal-overlay" onClick={() => setMoleculaAEliminar(null)}>
          <div className="mol-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🗑️ Confirmar eliminación</h3>
            <p>¿Eliminar <strong>{moleculaAEliminar.nombre}</strong>?</p>
            <p className="mol-error-text">
              No se podrá si hay productos asociados a esta molécula.
            </p>
            <div className="mol-modal-acciones">
              <button onClick={() => setMoleculaAEliminar(null)} className="mol-btn-cancelar">
                Cancelar
              </button>
              <button onClick={() => eliminarMolecula(moleculaAEliminar.id)} className="mol-btn-guardar">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarForm && (
        <MoleculaForm
          molecula={moleculaEnEdicion}
          onClose={cerrarForm}
          onGuardado={handleGuardado}
        />
      )}
    </div>
  )
}

function MoleculaForm({ molecula, onClose, onGuardado }) {
  const [nombre, setNombre] = useState(molecula?.nombre || '')
  const [nombreEn, setNombreEn] = useState(molecula?.nombre_generico_en || '')
  const [sinonimosTexto, setSinonimosTexto] = useState(molecula?.sinonimos?.join(', ') || '')
  const [descripcion, setDescripcion] = useState(molecula?.descripcion || '')
  const [atcBusqueda, setAtcBusqueda] = useState(
    molecula?.atc_clasificaciones ? `${molecula.atc_clasificaciones.codigo} — ${molecula.atc_clasificaciones.nombre}` : ''
  )
  const [atcResultados, setAtcResultados] = useState([])
  const [atcId, setAtcId] = useState(molecula?.atc_id || null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Autocompletado simple de nivel 5 ATC por código o nombre
  useEffect(() => {
    if (!atcBusqueda || atcId) return
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get('/moleculas/atc-clasificaciones', { params: { nivel: 5 } })
        const filtrados = res.data.filter(
          (n) =>
            n.codigo.toLowerCase().includes(atcBusqueda.toLowerCase()) ||
            n.nombre.toLowerCase().includes(atcBusqueda.toLowerCase())
        )
        setAtcResultados(filtrados.slice(0, 8))
      } catch (err) {
        console.error(err)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [atcBusqueda, atcId])

  const atcResultadosVisibles = !atcBusqueda || atcId ? [] : atcResultados

  function seleccionarAtc(nodo) {
    setAtcId(nodo.id)
    setAtcBusqueda(`${nodo.codigo} — ${nodo.nombre}`)
    setAtcResultados([])
  }

  function limpiarAtc() {
    setAtcId(null)
    setAtcBusqueda('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) {
      setError('El nombre es requerido')
      return
    }

    const sinonimos = sinonimosTexto
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      nombre,
      nombre_generico_en: nombreEn || null,
      sinonimos: sinonimos.length ? sinonimos : null,
      descripcion: descripcion || null,
      atc_id: atcId,
    }

    setGuardando(true)
    try {
      if (molecula) {
        await api.patch(`/moleculas/moleculas/${molecula.id}`, payload)
      } else {
        await api.post('/moleculas/moleculas', payload)
      }
      onGuardado()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="mol-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{molecula ? '✏️ Editar' : '+ Nueva'} Molécula</h3>

        <form onSubmit={handleSubmit}>
          <div className="mol-form-group">
            <label>Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Paracetamol"
            />
          </div>

          <div className="mol-form-group">
            <label>Nombre genérico (inglés / DCI)</label>
            <input
              type="text"
              value={nombreEn}
              onChange={(e) => setNombreEn(e.target.value)}
              placeholder="ej. Acetaminophen"
            />
          </div>

          <div className="mol-form-group">
            <label>Sinónimos (separados por coma)</label>
            <input
              type="text"
              value={sinonimosTexto}
              onChange={(e) => setSinonimosTexto(e.target.value)}
              placeholder="ej. Acetaminofén, APAP"
            />
          </div>

          <div className="mol-form-group" style={{ position: 'relative' }}>
            <label>Clasificación ATC (nivel 5)</label>
            <input
              type="text"
              value={atcBusqueda}
              onChange={(e) => {
                setAtcBusqueda(e.target.value)
                if (atcId) setAtcId(null)
              }}
              placeholder="Buscar por código o nombre..."
            />
            {atcId && (
              <button type="button" onClick={limpiarAtc} className="mol-link-btn" style={{ alignSelf: 'flex-start' }}>
                Quitar clasificación
              </button>
            )}
            {atcResultadosVisibles.length > 0 && (
              <div className="mol-autocomplete-list">
                {atcResultadosVisibles.map((nodo) => (
                  <button
                    type="button"
                    key={nodo.id}
                    className="mol-autocomplete-item"
                    onClick={() => seleccionarAtc(nodo)}
                  >
                    {nodo.codigo} — {nodo.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mol-form-group">
            <label>Descripción (opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          {error && <p className="mol-error-text">{error}</p>}

          <div className="mol-modal-acciones">
            <button type="button" onClick={onClose} className="mol-btn-cancelar">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="mol-btn-guardar">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MoleculasAdmin
