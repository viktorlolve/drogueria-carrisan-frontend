import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import './DeliveryAdmin.css'

function DeliveryAdmin() {
  const [tarifas, setTarifas] = useState([])
  const [pendientes, setPendientes] = useState([])
  const [enviadosRecientes, setEnviadosRecientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Formulario nueva tarifa
  const [nuevaCiudad, setNuevaCiudad] = useState('')
  const [nuevoCosto, setNuevoCosto] = useState('8.00')
  const [guardando, setGuardando] = useState(false)

  // Edición inline
  const [editandoId, setEditandoId] = useState(null)
  const [editandoCosto, setEditandoCosto] = useState('')

  const cargarDatos = useCallback(async () => {
    try {
      const [resTarifas, resPendientes] = await Promise.all([
        api.get('/delivery-tarifas'),
        api.get('/orders/delivery-pendientes'),
      ])
      setTarifas(Array.isArray(resTarifas.data) ? resTarifas.data : [])
      setPendientes(resPendientes.data.pendientes || [])
      setEnviadosRecientes(resPendientes.data.enviadosRecientes || [])
      setError('')
    } catch (err) {
      console.error(err)
      setError('Error cargando datos de delivery')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    let activo = true
    Promise.all([
      api.get('/delivery-tarifas'),
      api.get('/orders/delivery-pendientes'),
    ])
      .then(([resTarifas, resPendientes]) => {
        if (!activo) return
        setTarifas(Array.isArray(resTarifas.data) ? resTarifas.data : [])
        setPendientes(resPendientes.data.pendientes || [])
        setEnviadosRecientes(resPendientes.data.enviadosRecientes || [])
        setError('')
      })
      .catch((err) => {
        console.error(err)
        if (activo) setError('Error cargando datos de delivery')
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  // Auto-refresh cada 30s
  useEffect(() => {
    const interval = setInterval(cargarDatos, 30000)
    return () => clearInterval(interval)
  }, [cargarDatos])

  // Crear tarifa
  async function handleCrearTarifa(e) {
    e.preventDefault()
    if (!nuevaCiudad.trim()) return
    try {
      setGuardando(true)
      await api.post('/delivery-tarifas', {
        ciudad: nuevaCiudad.trim(),
        costo: parseFloat(nuevoCosto) || 8.00,
      })
      setNuevaCiudad('')
      setNuevoCosto('8.00')
      await cargarDatos()
    } catch (err) {
      const msg = err?.response?.data?.error || 'Error al crear tarifa'
      setError(msg)
    } finally {
      setGuardando(false)
    }
  }

  // Actualizar costo inline
  async function handleGuardarCosto(tarifa) {
    try {
      await api.put(`/delivery-tarifas/${tarifa.id}`, {
        costo: parseFloat(editandoCosto) || 0,
      })
      setEditandoId(null)
      await cargarDatos()
    } catch {
      setError('Error al actualizar tarifa')
    }
  }

  // Toggle activo
  async function handleToggleActivo(tarifa) {
    try {
      await api.put(`/delivery-tarifas/${tarifa.id}`, {
        activo: !tarifa.activo,
      })
      await cargarDatos()
    } catch {
      setError('Error al cambiar estado')
    }
  }

  // Eliminar tarifa
  async function handleEliminarTarifa(tarifa) {
    if (!confirm(`¿Eliminar la tarifa de ${tarifa.ciudad}?`)) return
    try {
      await api.delete(`/delivery-tarifas/${tarifa.id}`)
      await cargarDatos()
    } catch {
      setError('Error al eliminar tarifa')
    }
  }

  // Marcar como enviado
  async function handleMarcarEnviado(orden) {
    try {
      await api.patch(`/orders/${orden.id}/estado`, { estado: 'enviado' })
      await cargarDatos()
    } catch (err) {
      const msg = err?.response?.data?.error || 'Error al cambiar estado'
      setError(msg)
    }
  }

  function formatUSD(valor) {
    return Number(valor || 0).toFixed(2)
  }

  function formatFecha(fecha) {
    if (!fecha) return ''
    return new Date(fecha).toLocaleString('es-VE', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  if (cargando && tarifas.length === 0) {
    return <div className="delivery-admin"><p className="cargando">Cargando...</p></div>
  }

  return (
    <div className="delivery-admin">
      {error && <div className="delivery-error">{error}</div>}

      {/* KPIs */}
      <div className="delivery-kpis">
        <div className="delivery-kpi">
          <span className="kpi-valor">{pendientes.length}</span>
          <span className="kpi-label">Pendientes de envío</span>
        </div>
        <div className="delivery-kpi">
          <span className="kpi-valor">
            ${formatUSD(pendientes.reduce((sum, o) => sum + (o.costo_envio_usd || 0), 0))}
          </span>
          <span className="kpi-label">Costo total pendientes</span>
        </div>
        <div className="delivery-kpi">
          <span className="kpi-valor">{tarifas.filter(t => t.activo).length}</span>
          <span className="kpi-label">Ciudades activas</span>
        </div>
        <div className="delivery-kpi">
          <span className="kpi-valor">{enviadosRecientes.length}</span>
          <span className="kpi-label">Enviados recientes</span>
        </div>
      </div>

      {/* Sección: Tarifas por ciudad */}
      <div className="delivery-seccion">
        <h3 className="seccion-titulo">Tarifas por Ciudad</h3>

        {/* Formulario nueva tarifa */}
        <form className="tarifa-form" onSubmit={handleCrearTarifa}>
          <input
            type="text"
            placeholder="Nombre de la ciudad"
            value={nuevaCiudad}
            onChange={(e) => setNuevaCiudad(e.target.value)}
            className="tarifa-input"
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Costo USD"
            value={nuevoCosto}
            onChange={(e) => setNuevoCosto(e.target.value)}
            className="tarifa-input tarifa-input-costo"
            required
          />
          <button type="submit" className="btn-agregar" disabled={guardando}>
            {guardando ? 'Guardando...' : '+ Agregar'}
          </button>
        </form>

        {/* Tabla de tarifas */}
        <div className="tarifa-table-wrap">
          <table className="tarifa-table">
            <thead>
              <tr>
                <th>Ciudad</th>
                <th>Costo (USD)</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tarifas.map((tarifa) => (
                <tr key={tarifa.id} className={!tarifa.activo ? 'tarifa-inactiva' : ''}>
                  <td className="tarifa-ciudad">{tarifa.ciudad}</td>
                  <td>
                    {editandoId === tarifa.id ? (
                      <div className="tarifa-edit-row">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editandoCosto}
                          onChange={(e) => setEditandoCosto(e.target.value)}
                          className="tarifa-input-costo-inline"
                          autoFocus
                        />
                        <button className="btn-guardar" onClick={() => handleGuardarCosto(tarifa)}>✓</button>
                        <button className="btn-cancelar" onClick={() => setEditandoId(null)}>✕</button>
                      </div>
                    ) : (
                      <span className="tarifa-costo" onClick={() => {
                        setEditandoId(tarifa.id)
                        setEditandoCosto(String(tarifa.costo))
                      }}>
                        ${formatUSD(tarifa.costo)}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`tarifa-toggle ${tarifa.activo ? 'activo' : 'inactivo'}`}
                      onClick={() => handleToggleActivo(tarifa)}
                    >
                      {tarifa.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    <button className="btn-eliminar-small" onClick={() => handleEliminarTarifa(tarifa)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {tarifas.length === 0 && (
                <tr><td colSpan="4" className="tarifa-vacia">No hay tarifas configuradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección: Cola de envíos */}
      <div className="delivery-seccion">
        <div className="seccion-header">
          <h3 className="seccion-titulo">Envíos Pendientes</h3>
          <button className="btn-refrescar" onClick={cargarDatos}>Refrescar</button>
        </div>

        {pendientes.length === 0 ? (
          <div className="delivery-vacio">
            <span className="vacio-icono">📦</span>
            <p>No hay envíos pendientes</p>
          </div>
        ) : (
          <div className="orden-lista">
            {pendientes.map((orden) => (
              <div key={orden.id} className="orden-card pendiente">
                <div className="orden-card-header">
                  <span className="orden-id">#{orden.id?.slice(0, 8)}</span>
                  <span className="orden-fecha">{formatFecha(orden.created_at)}</span>
                </div>
                <div className="orden-card-body">
                  <div className="orden-info">
                    <span className="orden-cliente">{orden.users?.nombre || 'Sin nombre'}</span>
                    <span className="orden-email">{orden.users?.email}</span>
                  </div>
                  <div className="orden-direccion">
                    <span className="direccion-ciudad">{orden.direcciones_envio?.ciudad}</span>
                    <span className="direccion-texto">{orden.direcciones_envio?.direccion}</span>
                  </div>
                  <div className="orden-costos">
                    <span className="costo-items">{orden.ordenes_items?.length || 0} items</span>
                    <span className="costo-total">Total: ${formatUSD(orden.total_usd)}</span>
                    <span className="costo-envio">Envío: ${formatUSD(orden.costo_envio_usd)}</span>
                  </div>
                </div>
                <div className="orden-card-footer">
                  <button
                    className="btn-enviar"
                    onClick={() => handleMarcarEnviado(orden)}
                  >
                    Marcar como enviado
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección: Enviados recientes */}
      {enviadosRecientes.length > 0 && (
        <div className="delivery-seccion">
          <h3 className="seccion-titulo">Enviados Recientes</h3>
          <div className="orden-lista">
            {enviadosRecientes.map((orden) => (
              <div key={orden.id} className="orden-card enviado">
                <div className="orden-card-header">
                  <span className="orden-id">#{orden.id?.slice(0, 8)}</span>
                  <span className="orden-fecha">{formatFecha(orden.created_at)}</span>
                  <span className="orden-badge enviado">Enviado</span>
                </div>
                <div className="orden-card-body">
                  <div className="orden-info">
                    <span className="orden-cliente">{orden.users?.nombre || 'Sin nombre'}</span>
                    <span className="orden-email">{orden.users?.email}</span>
                  </div>
                  <div className="orden-direccion">
                    <span className="direccion-ciudad">{orden.direcciones_envio?.ciudad}</span>
                    <span className="direccion-texto">{orden.direcciones_envio?.direccion}</span>
                  </div>
                  <div className="orden-costos">
                    <span className="costo-items">{orden.ordenes_items?.length || 0} items</span>
                    <span className="costo-total">Total: ${formatUSD(orden.total_usd)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DeliveryAdmin
