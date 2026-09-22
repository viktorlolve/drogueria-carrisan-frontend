import { useState, useEffect, useMemo } from 'react'
import api from '../../api/axios'
import DescuentoForm from './DescuentosForm'
import './DescuentosAdmin.css'

const ITEMS_POR_PAGINA = 10

const ESTADO_CONFIG = {
  vigente: { texto: 'Vigente', color: '#10b981', bg: '#d1fae5', icono: '🟢' },
  programado: { texto: 'Programado', color: '#3b82f6', bg: '#dbeafe', icono: '📅' },
  expirado: { texto: 'Expirado', color: '#ef4444', bg: '#fee2e2', icono: '⏰' },
  inactivo: { texto: 'Inactivo', color: '#94a3b8', bg: '#f1f5f9', icono: '⏸️' },
}

const ALCANCE_CONFIG = {
  producto: { texto: 'Producto', icono: '📦' },
  marca: { texto: 'Marca', icono: '🏷️' },
  laboratorio: { texto: 'Laboratorio', icono: '🧪' },
  molecula: { texto: 'Molécula', icono: '⚗️' },
  linea: { texto: 'Línea', icono: '📊' },
  forma: { texto: 'Forma', icono: '💊' },
}

export default function DescuentosAdmin() {
  const [descuentos, setDescuentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroAlcance, setFiltroAlcance] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [descuentoEditando, setDescuentoEditando] = useState(null)
  const [descuentoAEliminar, setDescuentoAEliminar] = useState(null)
  const [vista, setVista] = useState('tabla')
  const [paginaActual, setPaginaActual] = useState(1)
  const [ordenarPor, setOrdenarPor] = useState('estado')
  const [ordenDireccion, setOrdenDireccion] = useState('asc')

  useEffect(() => {
    cargarDescuentos()
  }, [])

  async function cargarDescuentos() {
    setCargando(true)
    setError('')
    try {
      const res = await api.get('/descuentos')
      setDescuentos(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar descuentos')
    } finally {
      setCargando(false)
    }
  }

  async function handleEliminar(id) {
    try {
      await api.delete(`/descuentos/${id}`)
      setDescuentos(prev => prev.filter(d => d.id !== id))
      setDescuentoAEliminar(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar el descuento')
    }
  }

  function handleGuardado() {
    setMostrarForm(false)
    setDescuentoEditando(null)
    cargarDescuentos()
  }

  function abrirEdicion(descuento) {
    setDescuentoEditando(descuento)
    setMostrarForm(true)
  }

  function abrirNuevo() {
    setDescuentoEditando(null)
    setMostrarForm(true)
  }

  function toggleOrden(campo) {
    if (ordenarPor === campo) {
      setOrdenDireccion(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenarPor(campo)
      setOrdenDireccion('asc')
    }
  }

  function etiquetaAlcance(d) {
    if (d.alcance === 'producto') return d.productos?.nombre_comercial || `Producto #${d.producto_id}`
    if (d.alcance === 'marca') return d.marcas?.nombre || `Marca #${d.marca_id}`
    return d.alcance_valor || '—'
  }

  function etiquetaValor(d) {
    return d.tipo === 'porcentaje' ? `${d.valor}%` : `$${Number(d.valor).toFixed(2)}`
  }

  function formatearFecha(f) {
    if (!f) return '—'
    return new Date(f).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Filtrado y ordenamiento
  const descuentosFiltrados = useMemo(() => {
    let resultado = [...descuentos]

    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(d => d.estado === filtroEstado)
    }

    if (filtroAlcance !== 'todos') {
      resultado = resultado.filter(d => d.alcance === filtroAlcance)
    }

    if (busqueda) {
      const texto = busqueda.toLowerCase()
      resultado = resultado.filter(d => {
        const alcanceTexto = etiquetaAlcance(d).toLowerCase()
        const tipoTexto = (d.tipo || '').toLowerCase()
        return alcanceTexto.includes(texto) || tipoTexto.includes(texto)
      })
    }

    resultado.sort((a, b) => {
      let valorA, valorB
      switch(ordenarPor) {
        case 'valor':
          valorA = Number(a.valor) || 0
          valorB = Number(b.valor) || 0
          break
        case 'inicio':
          valorA = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0
          valorB = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0
          break
        case 'fin':
          valorA = a.fecha_fin ? new Date(a.fecha_fin).getTime() : 0
          valorB = b.fecha_fin ? new Date(b.fecha_fin).getTime() : 0
          break
        case 'estado':
        default:
          valorA = a.estado || ''
          valorB = b.estado || ''
      }
      
      if (valorA < valorB) return ordenDireccion === 'asc' ? -1 : 1
      if (valorA > valorB) return ordenDireccion === 'asc' ? 1 : -1
      return 0
    })

    return resultado
  }, [descuentos, filtroEstado, filtroAlcance, busqueda, ordenarPor, ordenDireccion])

  // Paginación
  const totalPaginas = Math.ceil(descuentosFiltrados.length / ITEMS_POR_PAGINA)
  const descuentosPaginados = descuentosFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: descuentos.length,
      vigentes: descuentos.filter(d => d.estado === 'vigente').length,
      programados: descuentos.filter(d => d.estado === 'programado').length,
      expirados: descuentos.filter(d => d.estado === 'expirado').length,
    }
  }, [descuentos])

  if (cargando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando descuentos...</p>
      </div>
    )
  }

  return (
    <div className="descuentos-admin">
      {/* Header */}
      <div className="section-header">
        <div className="header-top">
          <h2>🏷️ Descuentos</h2>
          <button onClick={abrirNuevo} className="btn-agregar">
            + Nuevo Descuento
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏷️</div>
          <div className="stat-info">
            <div className="stat-valor">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
        <div className="stat-card stat-vigentes">
          <div className="stat-icon">🟢</div>
          <div className="stat-info">
            <div className="stat-valor">{stats.vigentes}</div>
            <div className="stat-label">Vigentes</div>
          </div>
        </div>
        <div className="stat-card stat-programados">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="stat-valor">{stats.programados}</div>
            <div className="stat-label">Programados</div>
          </div>
        </div>
        <div className="stat-card stat-expirados">
          <div className="stat-icon">⏰</div>
          <div className="stat-info">
            <div className="stat-valor">{stats.expirados}</div>
            <div className="stat-label">Expirados</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-filtros">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar descuentos..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1) }}
              className="search-input"
            />
          </div>

          <select 
            value={filtroEstado} 
            onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1) }}
            className="filter-select"
          >
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADO_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.icono} {val.texto}</option>
            ))}
          </select>

          <select 
            value={filtroAlcance} 
            onChange={(e) => { setFiltroAlcance(e.target.value); setPaginaActual(1) }}
            className="filter-select"
          >
            <option value="todos">Todos los alcances</option>
            {Object.entries(ALCANCE_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.icono} {val.texto}</option>
            ))}
          </select>
        </div>

        <div className="toolbar-actions">
          <div className="vista-toggle">
            <button 
              className={`vista-btn ${vista === 'tabla' ? 'active' : ''}`}
              onClick={() => setVista('tabla')}
            >📋</button>
            <button 
              className={`vista-btn ${vista === 'cards' ? 'active' : ''}`}
              onClick={() => setVista('cards')}
            >🎴</button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="resultados-info">
        Mostrando {descuentosPaginados.length} de {descuentosFiltrados.length} descuentos
      </div>

      {/* Error */}
      {error && (
        <div className="error-container">
          <div className="error-message">{error}</div>
          <button onClick={cargarDescuentos} className="btn-reintentar">
            🔄 Reintentar
          </button>
        </div>
      )}

      {/* Vista Tabla */}
      {!error && vista === 'tabla' && (
        <>
          {descuentosFiltrados.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🏷️</span>
              <p>No se encontraron descuentos</p>
              {busqueda && <p className="empty-hint">Intenta con otros filtros</p>}
            </div>
          ) : (
            <div className="table-container">
              <table className="descuentos-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleOrden('estado')} className="sortable">
                      Estado {ordenarPor === 'estado' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Alcance</th>
                    <th>Aplica a</th>
                    <th>Tipo</th>
                    <th onClick={() => toggleOrden('valor')} className="sortable">
                      Valor {ordenarPor === 'valor' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => toggleOrden('inicio')} className="sortable">
                      Inicio {ordenarPor === 'inicio' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => toggleOrden('fin')} className="sortable">
                      Fin {ordenarPor === 'fin' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {descuentosPaginados.map(d => (
                    <tr key={d.id} className={`descuento-row estado-${d.estado}`}>
                      <td>
                        <span 
                          className="estado-badge-descuento"
                          style={{
                            backgroundColor: ESTADO_CONFIG[d.estado]?.bg,
                            color: ESTADO_CONFIG[d.estado]?.color
                          }}
                        >
                          {ESTADO_CONFIG[d.estado]?.icono} {ESTADO_CONFIG[d.estado]?.texto}
                        </span>
                      </td>
                      <td>
                        <span className="alcance-badge">
                          {ALCANCE_CONFIG[d.alcance]?.icono} {ALCANCE_CONFIG[d.alcance]?.texto}
                        </span>
                      </td>
                      <td className="aplica-cell">{etiquetaAlcance(d)}</td>
                      <td>
                        <span className={`tipo-badge ${d.tipo}`}>
                          {d.tipo === 'porcentaje' ? '%' : '$'}
                        </span>
                      </td>
                      <td className="valor-cell">{etiquetaValor(d)}</td>
                      <td className="fecha-cell">{formatearFecha(d.fecha_inicio)}</td>
                      <td className="fecha-cell">{formatearFecha(d.fecha_fin)}</td>
                      <td>
                        <div className="acciones-cell">
                          <button onClick={() => abrirEdicion(d)} className="btn-icon" title="Editar">
                            ✏️
                          </button>
                          <button 
                            onClick={() => setDescuentoAEliminar(d)}
                            className="btn-icon btn-danger" 
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
        </>
      )}

      {/* Vista Cards */}
      {!error && vista === 'cards' && (
        <div className="cards-grid">
          {descuentosPaginados.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🏷️</span>
              <p>No se encontraron descuentos</p>
            </div>
          ) : (
            descuentosPaginados.map(d => {
              const estadoCfg = ESTADO_CONFIG[d.estado] || {}
              const alcanceCfg = ALCANCE_CONFIG[d.alcance] || {}
              
              return (
                <div key={d.id} className={`descuento-card estado-${d.estado}`}>
                  <div className="card-header">
                    <span 
                      className="estado-badge-descuento"
                      style={{ backgroundColor: estadoCfg.bg, color: estadoCfg.color }}
                    >
                      {estadoCfg.icono} {estadoCfg.texto}
                    </span>
                    <span className={`tipo-badge-card ${d.tipo}`}>
                      {d.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto Fijo'}
                    </span>
                  </div>
                  
                  <div className="card-body">
                    <div className="descuento-info">
                      <div className="info-row">
                        <span>Alcance:</span>
                        <strong>{alcanceCfg.icono} {alcanceCfg.texto}</strong>
                      </div>
                      <div className="info-row">
                        <span>Aplica a:</span>
                        <strong>{etiquetaAlcance(d)}</strong>
                      </div>
                      <div className="info-row valor-row">
                        <span>Descuento:</span>
                        <strong className="valor-descuento">{etiquetaValor(d)}</strong>
                      </div>
                    </div>
                    
                    <div className="fechas-info">
                      <div className="fecha-item">
                        <span>📅 Inicio</span>
                        <strong>{formatearFecha(d.fecha_inicio)}</strong>
                      </div>
                      <div className="fecha-item">
                        <span>📅 Fin</span>
                        <strong>{formatearFecha(d.fecha_fin)}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-acciones">
                    <button onClick={() => abrirEdicion(d)}>✏️ Editar</button>
                    <button 
                      onClick={() => setDescuentoAEliminar(d)}
                      className="btn-eliminar-card"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="paginacion">
          <button onClick={() => setPaginaActual(1)} disabled={paginaActual === 1} className="btn-pagina">⏮️</button>
          <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="btn-pagina">◀️</button>
          
          {Array.from({ length: totalPaginas }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 2)
            .map((p, i, arr) => (
              <span key={p}>
                {i > 0 && arr[i - 1] !== p - 1 && <span className="paginacion-dots">...</span>}
                <button onClick={() => setPaginaActual(p)} className={`btn-pagina ${paginaActual === p ? 'active' : ''}`}>{p}</button>
              </span>
            ))}
          
          <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="btn-pagina">▶️</button>
          <button onClick={() => setPaginaActual(totalPaginas)} disabled={paginaActual === totalPaginas} className="btn-pagina">⏭️</button>
        </div>
      )}

      {/* Modal formulario */}
      {mostrarForm && (
        <DescuentoForm
          descuentoExistente={descuentoEditando}
          onGuardado={handleGuardado}
          onCancelar={() => {
            setMostrarForm(false)
            setDescuentoEditando(null)
          }}
        />
      )}

      {/* Modal confirmar eliminación */}
      {descuentoAEliminar && (
        <div className="modal-overlay" onClick={() => setDescuentoAEliminar(null)}>
          <div className="modal-content modal-confirmacion" onClick={(e) => e.stopPropagation()}>
            <h3>🗑️ Confirmar Eliminación</h3>
            <p>¿Estás seguro de eliminar este descuento?</p>
            <p className="warning-text">Esta acción no se puede deshacer.</p>
            <div className="modal-acciones">
              <button onClick={() => setDescuentoAEliminar(null)} className="btn-cancelar">Cancelar</button>
              <button onClick={() => handleEliminar(descuentoAEliminar.id)} className="btn-eliminar">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}