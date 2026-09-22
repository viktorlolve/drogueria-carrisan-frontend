import { useState, useEffect } from 'react'
import api from '../../api/axios'
import './FacturaForm.css'

function FacturaForm({ clienteId, factura, onClose, onGuardado }) {
  const esEdicion = Boolean(factura)

  const [ordenesDisponibles, setOrdenesDisponibles] = useState([])
  const [ordenesSeleccionadas, setOrdenesSeleccionadas] = useState([])
  const [numeroFactura, setNumeroFactura] = useState(factura?.numero_factura || '')
  const [montoFacturado, setMontoFacturado] = useState(factura?.monto_facturado || '')
  const [nota, setNota] = useState(factura?.nota || '')
  const [montoEditadoManualmente, setMontoEditadoManualmente] = useState(esEdicion)
  const [cargando, setCargando] = useState(!esEdicion)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [errores, setErrores] = useState({})

  useEffect(() => {
    if (esEdicion) return
    let activo = true
    api.get(`/facturas/sin-facturar/${clienteId}`)
      .then(({ data }) => {
        if (activo) setOrdenesDisponibles(data)
      })
      .catch((err) => {
        if (!activo) return
        setError('No se pudieron cargar las órdenes del cliente')
        console.error(err)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [clienteId, esEdicion])

  const sumaOrdenes = ordenesDisponibles
    .filter((o) => ordenesSeleccionadas.includes(o.id))
    .reduce((acc, o) => acc + Number(o.total_usd), 0)

  const montoVisible = !montoEditadoManualmente && !esEdicion ? sumaOrdenes.toFixed(2) : montoFacturado

  function toggleOrden(ordenId) {
    setOrdenesSeleccionadas((prev) =>
      prev.includes(ordenId)
        ? prev.filter((id) => id !== ordenId)
        : [...prev, ordenId]
    )
  }

  function handleMontoChange(e) {
    setMontoEditadoManualmente(true)
    setMontoFacturado(e.target.value)
  }

  function validar() {
    const errs = {}
    if (!numeroFactura.trim()) errs.numeroFactura = 'El número de factura es requerido'
    if (!montoFacturado || Number(montoFacturado) <= 0) errs.monto = 'Ingresa un monto válido'
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!validar()) return
    setGuardando(true)

    try {
      if (esEdicion) {
        await api.patch(`/facturas/${factura.id}`, {
          numero_factura: numeroFactura,
          monto_facturado: Number(montoFacturado),
          nota: nota || undefined,
        })
      } else {
        await api.post('/facturas', {
          usuario_id: clienteId,
          numero_factura: numeroFactura,
          monto_facturado: Number(montoFacturado),
          nota: nota || undefined,
          orden_ids: ordenesSeleccionadas,
        })
      }
      onGuardado()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la factura')
      setGuardando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content factura-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{esEdicion ? '✏️ Editar Factura' : '🧾 Nueva Factura'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-group">
              <label>Número de Factura *</label>
              <input
                value={numeroFactura}
                onChange={(e) => { setNumeroFactura(e.target.value); setErrores({...errores, numeroFactura: ''}) }}
                className={errores.numeroFactura ? 'error' : ''}
                placeholder="Ej: FAC-001"
                required
              />
              {errores.numeroFactura && <span className="error-text">{errores.numeroFactura}</span>}
            </div>

            {!esEdicion && (
              <div className="form-group">
                <label>Órdenes sin facturar</label>
                {cargando ? (
                  <div className="loading-small">
                    <div className="spinner-small-dark"></div>
                    Cargando órdenes...
                  </div>
                ) : ordenesDisponibles.length === 0 ? (
                  <p className="text-muted">Este cliente no tiene órdenes pendientes de facturar</p>
                ) : (
                  <div className="ordenes-checklist">
                    <div className="checklist-header">
                      <span>{ordenesSeleccionadas.length} seleccionadas</span>
                      <span className="checklist-total">
                        Total: ${sumaOrdenes.toFixed(2)}
                      </span>
                    </div>
                    {ordenesDisponibles.map((orden) => (
                      <label key={orden.id} className="checklist-item">
                        <input
                          type="checkbox"
                          checked={ordenesSeleccionadas.includes(orden.id)}
                          onChange={() => toggleOrden(orden.id)}
                        />
                        <div className="checklist-item-info">
                          <strong>Orden #{orden.id}</strong>
                          <span>{new Date(orden.created_at).toLocaleDateString('es-VE')}</span>
                        </div>
                        <span className="checklist-item-monto">
                          ${Number(orden.total_usd).toFixed(2)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Monto Facturado (USD) *</label>
              <div className="input-precio">
                <span className="precio-simbolo">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoVisible}
                  onChange={handleMontoChange}
                  className={errores.monto ? 'error' : ''}
                  placeholder="0.00"
                  required
                />
              </div>
              {errores.monto && <span className="error-text">{errores.monto}</span>}
            </div>

            <div className="form-group">
              <label>Nota (opcional)</label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows="2"
                placeholder="Nota interna sobre esta factura..."
              />
            </div>
          </div>

          <div className="form-navegacion">
            <button type="button" onClick={onClose} className="btn-secundario">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn-guardar">
              {guardando ? (
                <><span className="spinner-small"></span> Guardando...</>
              ) : (
                esEdicion ? '💾 Guardar Cambios' : '🧾 Crear Factura'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FacturaForm