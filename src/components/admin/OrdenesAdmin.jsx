import { useState, useEffect, useMemo } from 'react'
import api from '../../api/axios'
import OrdenDetalleModal from '../OrdenDetalleModal'
import { useEsMobile } from '../../hooks/useEsMobile'
import TableroKanbanOrdenes from './TableroKanbanOrdenes'
import TableroSwipeOrdenes from './TableroSwipeOrdenes'
import { ESTADOS_ORDEN, normalizarEstado } from '../../config/estadosOrden'
import './OrdenesAdmin.css'

const ITEMS_POR_PAGINA = 10

// Estados operativos del pipeline actual (sin legacy) — labels/colores vienen
// de la fuente única (src/config/estadosOrden.js).
const ESTADOS = Object.keys(ESTADOS_ORDEN).filter((id) => !ESTADOS_ORDEN[id].legacy)

const ESTADO_COLORES = Object.fromEntries(
  ESTADOS.map((id) => [id, {
    color: ESTADOS_ORDEN[id].color,
    bg: ESTADOS_ORDEN[id].bg,
    label: ESTADOS_ORDEN[id].label,
  }])
)

// Visual de un estado para filas/badges/selects. Estados legacy se
// normalizan al id actual para que el color/label siempre resuelva.
function estadoVisual(estado) {
  const id = normalizarEstado(estado)
  const cfg = ESTADO_COLORES[id]
  return { id, color: cfg?.color, bg: cfg?.bg, label: cfg?.label || estado }
}

function OrdenesAdmin() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)
  const [ordenAEliminar, setOrdenAEliminar] = useState(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroFecha, setFiltroFecha] = useState('todas') // todas, hoy, semana, mes
  const [ordenarPor, setOrdenarPor] = useState('fecha')
  const [ordenDireccion, setOrdenDireccion] = useState('desc')

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const [vista, setVista] = useState('tabla') // tabla, cards o kanban

  const esMobile = useEsMobile()

  useEffect(() => {
    cargarOrdenes()
  }, [])

  async function cargarOrdenes() {
    try {
      setCargando(true)
      const { data } = await api.get('/orders')
      setOrdenes(data)
    } catch (err) {
      setError('No se pudieron cargar las órdenes')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function handleCambiarEstado(ordenId, nuevoEstado) {
    try {
      await api.patch(`/orders/${ordenId}/estado`, { estado: nuevoEstado })
      setOrdenes((prev) =>
        prev.map((o) => (o.id === ordenId ? { ...o, estado: nuevoEstado } : o))
      )
    } catch (err) {
      alert('No se pudo actualizar el estado')
      console.error(err)
    }
  }

  async function handleEliminarOrden(ordenId) {
    try {
      await api.delete(`/orders/${ordenId}`)
      setOrdenes(prev => prev.filter(o => o.id !== ordenId))
      setOrdenAEliminar(null)
    } catch (err) {
      alert('No se pudo eliminar la orden')
      console.error(err)
    }
  }

  function exportarCSV() {
    const headers = ['ID', 'Cliente', 'Email', 'Total USD', 'Estado', 'Fecha', 'Items']
    const rows = ordenesFiltradas.map(o => [
      o.id,
      o.users?.nombre || 'N/A',
      o.users?.email || 'N/A',
      o.total_usd,
      estadoVisual(o.estado).label,
      new Date(o.created_at).toLocaleString('es-VE'),
      o.items?.length || 0
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ordenes_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Filtrado y ordenamiento
  const ordenesFiltradas = useMemo(() => {
    let resultado = [...ordenes]

    // Búsqueda por ID, cliente o email
    if (busqueda) {
      const texto = busqueda.toLowerCase()
      resultado = resultado.filter(o =>
        o.id.toString().includes(texto) ||
        o.users?.nombre?.toLowerCase().includes(texto) ||
        o.users?.email?.toLowerCase().includes(texto)
      )
    }

    // Filtro por estado (compara normalizado para incluir órdenes legacy)
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(o => normalizarEstado(o.estado) === filtroEstado)
    }

    // Filtro por fecha
    if (filtroFecha !== 'todas') {
      const ahora = new Date()
      const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
      const inicioSemana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

      resultado = resultado.filter(o => {
        const fechaOrden = new Date(o.created_at)
        switch(filtroFecha) {
          case 'hoy': return fechaOrden >= inicioHoy
          case 'semana': return fechaOrden >= inicioSemana
          case 'mes': return fechaOrden >= inicioMes
          default: return true
        }
      })
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      let valorA, valorB
      switch(ordenarPor) {
        case 'id':
          valorA = a.id
          valorB = b.id
          break
        case 'total':
          valorA = Number(a.total_usd)
          valorB = Number(b.total_usd)
          break
        case 'cliente':
          valorA = (a.users?.nombre || '').toLowerCase()
          valorB = (b.users?.nombre || '').toLowerCase()
          break
        case 'fecha':
        default:
          valorA = new Date(a.created_at).getTime()
          valorB = new Date(b.created_at).getTime()
      }

      if (valorA < valorB) return ordenDireccion === 'asc' ? -1 : 1
      if (valorA > valorB) return ordenDireccion === 'asc' ? 1 : -1
      return 0
    })

    return resultado
  }, [ordenes, busqueda, filtroEstado, filtroFecha, ordenarPor, ordenDireccion])

  // Paginación
  const totalPaginas = Math.ceil(ordenesFiltradas.length / ITEMS_POR_PAGINA)
  const ordenesPaginadas = ordenesFiltradas.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )

  function toggleOrden(campo) {
    if (ordenarPor === campo) {
      setOrdenDireccion(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenarPor(campo)
      setOrdenDireccion('desc')
    }
  }

  // Estadísticas (estados comparados normalizados: legacy 'pendiente' cuenta
  // como pedido_creado, 'finalizado'/'entregado' como entregado).
  const estadisticas = useMemo(() => {
    const total = ordenes.length
    const pendientes = ordenes.filter(o => ['pedido_creado', 'preparando'].includes(normalizarEstado(o.estado))).length
    const finalizadas = ordenes.filter(o => ['entregado', 'retirado'].includes(normalizarEstado(o.estado))).length
    const totalUSD = ordenes.reduce((sum, o) => sum + Number(o.total_usd), 0)

    return { total, pendientes, finalizadas, totalUSD }
  }, [ordenes])

  if (cargando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando órdenes...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={cargarOrdenes} className="btn-reintentar">
          🔄 Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="ordenes-admin">
      {/* Header */}
      <div className="section-header">
        <div className="header-top">
          <h2>📋 Órdenes</h2>
          <div className="header-actions">
            <button onClick={exportarCSV} className="btn-exportar">
              📥 Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <div className="stat-valor">{estadisticas.total}</div>
            <div className="stat-label">Total Órdenes</div>
          </div>
        </div>
        <div className="stat-card stat-pendientes">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-valor">{estadisticas.pendientes}</div>
            <div className="stat-label">Pendientes</div>
          </div>
        </div>
        <div className="stat-card stat-finalizadas">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-valor">{estadisticas.finalizadas}</div>
            <div className="stat-label">Finalizadas</div>
          </div>
        </div>
        <div className="stat-card stat-total">
          <div className="stat-icon">💵</div>
          <div className="stat-info">
            <div className="stat-valor">${estadisticas.totalUSD.toFixed(2)}</div>
            <div className="stat-label">Total USD</div>
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
              placeholder="Buscar por ID, cliente o email..."
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
            {ESTADOS.map(estado => (
              <option key={estado} value={estado}>
                {ESTADO_COLORES[estado]?.label || estado}
              </option>
            ))}
          </select>

          <select
            value={filtroFecha}
            onChange={(e) => { setFiltroFecha(e.target.value); setPaginaActual(1) }}
            className="filter-select"
          >
            <option value="todas">Todas las fechas</option>
            <option value="hoy">Hoy</option>
            <option value="semana">Última semana</option>
            <option value="mes">Este mes</option>
          </select>
        </div>

        <div className="toolbar-actions">
          <div className="vista-toggle">
            <button
              className={`vista-btn ${vista === 'tabla' ? 'active' : ''}`}
              onClick={() => setVista('tabla')}
              title="Vista tabla"
            >
              📋
            </button>
            <button
              className={`vista-btn ${vista === 'cards' ? 'active' : ''}`}
              onClick={() => setVista('cards')}
              title="Vista cards"
            >
              🎴
            </button>
            <button
              className={`vista-btn ${vista === 'kanban' ? 'active' : ''}`}
              onClick={() => setVista('kanban')}
              title="Vista kanban"
            >
              🗂️
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="resultados-info">
        Mostrando {ordenesPaginadas.length} de {ordenesFiltradas.length} órdenes
        {busqueda && ` (filtradas de ${ordenes.length} totales)`}
      </div>

      {/* Tabla / Cards / Kanban */}
      {vista === 'tabla' ? (
        <div className="table-container">
          <table className="ordenes-table">
            <thead>
              <tr>
                <th onClick={() => toggleOrden('id')} className="sortable">
                  # ID {ordenarPor === 'id' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => toggleOrden('cliente')} className="sortable">
                  Cliente {ordenarPor === 'cliente' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                </th>
                <th>Items</th>
                <th onClick={() => toggleOrden('total')} className="sortable">
                  Total USD {ordenarPor === 'total' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                </th>
                <th>Estado</th>
                <th onClick={() => toggleOrden('fecha')} className="sortable">
                  Fecha {ordenarPor === 'fecha' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenesPaginadas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="sin-resultados">
                    <div className="empty-state">
                      <span className="empty-icon">📭</span>
                      <p>No se encontraron órdenes</p>
                      {busqueda && <p className="empty-hint">Intenta con otros filtros</p>}
                    </div>
                  </td>
                </tr>
              ) : (
                ordenesPaginadas.map((orden) => {
                  const visual = estadoVisual(orden.estado)
                  return (
                  <tr key={orden.id} className={`orden-row estado-${visual.id}`}>
                    <td className="orden-id">
                      <span className="id-badge">#{orden.id}</span>
                    </td>
                    <td className="cliente-cell">
                      <div className="cliente-nombre">
                        {orden.users?.nombre || 'Cliente'}
                      </div>
                      <div className="cliente-email">
                        {orden.users?.email || 'Sin email'}
                      </div>
                    </td>
                    <td className="items-count">
                      {orden.items?.length || 0} items
                    </td>
                    <td className="total-cell">
                      ${Number(orden.total_usd).toFixed(2)}
                    </td>
                    <td>
                      <select
                        value={visual.id}
                        onChange={(e) => handleCambiarEstado(orden.id, e.target.value)}
                        className="estado-select"
                        style={{
                          '--estado-color': visual.color,
                          '--estado-bg': visual.bg
                        }}
                      >
                        {ESTADOS.map(estado => (
                          <option key={estado} value={estado}>
                            {ESTADO_COLORES[estado]?.label || estado}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="fecha-cell">
                      <div className="fecha">
                        {new Date(orden.created_at).toLocaleDateString('es-VE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="hora">
                        {new Date(orden.created_at).toLocaleTimeString('es-VE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td>
                      <div className="acciones-cell">
                        <button
                          onClick={() => setOrdenSeleccionada(orden)}
                          className="btn-icon"
                          title="Ver detalle"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => setOrdenAEliminar(orden)}
                          className="btn-icon btn-danger"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : vista === 'cards' ? (
        <div className="cards-grid">
          {ordenesPaginadas.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>No se encontraron órdenes</p>
            </div>
          ) : (
            ordenesPaginadas.map((orden) => {
              const visual = estadoVisual(orden.estado)
              return (
              <div key={orden.id} className={`orden-card estado-${visual.id}`}>
                <div className="card-header">
                  <span className="orden-id">#{orden.id}</span>
                  <span
                    className="estado-badge"
                    style={{
                      backgroundColor: visual.bg,
                      color: visual.color
                    }}
                  >
                    {visual.label}
                  </span>
                </div>

                <div className="card-body">
                  <div className="cliente-info">
                    <span className="cliente-icon">👤</span>
                    <div>
                      <div className="cliente-nombre">{orden.users?.nombre || 'Cliente'}</div>
                      <div className="cliente-email">{orden.users?.email || ''}</div>
                    </div>
                  </div>

                  <div className="card-detalles">
                    <div className="detalle-item">
                      <span>📦 Items:</span>
                      <strong>{orden.items?.length || 0}</strong>
                    </div>
                    <div className="detalle-item">
                      <span>💰 Total:</span>
                      <strong>${Number(orden.total_usd).toFixed(2)}</strong>
                    </div>
                    <div className="detalle-item">
                      <span>📅 Fecha:</span>
                      <strong>{new Date(orden.created_at).toLocaleDateString('es-VE')}</strong>
                    </div>
                  </div>

                  <select
                    value={visual.id}
                    onChange={(e) => handleCambiarEstado(orden.id, e.target.value)}
                    className="estado-select-card"
                  >
                    {ESTADOS.map(estado => (
                      <option key={estado} value={estado}>
                        {ESTADO_COLORES[estado]?.label || estado}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="card-acciones">
                  <button onClick={() => setOrdenSeleccionada(orden)}>
                    👁️ Ver detalle
                  </button>
                  <button
                    onClick={() => setOrdenAEliminar(orden)}
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
      ) : (
        esMobile ? (
          <TableroSwipeOrdenes
            ordenes={ordenesFiltradas}
            estadoColores={ESTADO_COLORES}
            onCambiarEstado={handleCambiarEstado}
            onAbrirOrden={setOrdenSeleccionada}
          />
        ) : (
          <TableroKanbanOrdenes
            ordenes={ordenesFiltradas}
            estadoColores={ESTADO_COLORES}
            onCambiarEstado={handleCambiarEstado}
            onAbrirOrden={setOrdenSeleccionada}
          />
        )
      )}

      {/* Paginación */}
      {vista !== 'kanban' && totalPaginas > 1 && (
        <div className="paginacion">
          <button
            onClick={() => setPaginaActual(1)}
            disabled={paginaActual === 1}
            className="btn-pagina"
          >
            ⏮️
          </button>
          <button
            onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="btn-pagina"
          >
            ◀️
          </button>

          {Array.from({ length: totalPaginas }, (_, i) => i + 1)
            .filter(p =>
              p === 1 ||
              p === totalPaginas ||
              Math.abs(p - paginaActual) <= 2
            )
            .map((p, i, arr) => (
              <span key={p}>
                {i > 0 && arr[i - 1] !== p - 1 && <span className="paginacion-dots">...</span>}
                <button
                  onClick={() => setPaginaActual(p)}
                  className={`btn-pagina ${paginaActual === p ? 'active' : ''}`}
                >
                  {p}
                </button>
              </span>
            ))}

          <button
            onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            className="btn-pagina"
          >
            ▶️
          </button>
          <button
            onClick={() => setPaginaActual(totalPaginas)}
            disabled={paginaActual === totalPaginas}
            className="btn-pagina"
          >
            ⏭️
          </button>
        </div>
      )}

      {/* Modal detalle */}
      <OrdenDetalleModal
        orden={ordenSeleccionada}
        onClose={() => setOrdenSeleccionada(null)}
        onCambiarEstado={handleCambiarEstado}
        estados={ESTADOS}
        estadoColores={ESTADO_COLORES}
      />

      {/* Modal confirmar eliminación */}
      {ordenAEliminar && (
        <div className="modal-overlay" onClick={() => setOrdenAEliminar(null)}>
          <div className="modal-content modal-confirmacion" onClick={(e) => e.stopPropagation()}>
            <h3>🗑️ Confirmar Eliminación</h3>
            <p>¿Estás seguro de eliminar la orden <strong>#{ordenAEliminar.id}</strong>?</p>
            <p className="warning-text">Esta acción no se puede deshacer.</p>
            <div className="modal-acciones">
              <button
                onClick={() => setOrdenAEliminar(null)}
                className="btn-cancelar"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminarOrden(ordenAEliminar.id)}
                className="btn-eliminar"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdenesAdmin