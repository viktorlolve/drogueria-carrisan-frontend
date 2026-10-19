import { useState, useEffect } from 'react'
import api from '../../api/axios'
import './TasaCambio.css'

function TasaCambio() {
  const [tasaActual, setTasaActual] = useState(null)
  const [nuevaTasa, setNuevaTasa] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [tasaReferencia, setTasaReferencia] = useState(null)
  const [cargandoReferencia, setCargandoReferencia] = useState(false)
  const [errorReferencia, setErrorReferencia] = useState('')

  useEffect(() => {
    cargarTasa()
  }, [])

  async function cargarTasa() {
    try {
      const { data } = await api.get('/prices')
      setTasaActual(data)
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'No se pudo cargar la tasa actual' })
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function obtenerTasaReferencia() {
    setCargandoReferencia(true)
    setErrorReferencia('')

    const tasa = await consultarTasaExterna()

    if (tasa) {
      setTasaReferencia({
        valor: tasa.valor,
        fuente: tasa.fuente,
        fecha: new Date().toISOString()
      })
    } else {
      setErrorReferencia('No se pudo obtener tasa de referencia de ninguna fuente')
      setTasaReferencia(null)
    }

    setCargandoReferencia(false)
  }

  async function consultarTasaExterna() {
    const fuentes = [
      {
        nombre: 'ExchangeRate-API',
        url: 'https://open.er-api.com/v6/latest/USD',
        extraer: (data) => data?.rates?.VES
      },
      {
        nombre: 'DolarToday',
        url: 'https://s3.amazonaws.com/dolartoday/data.json',
        extraer: (data) => data?.USD?.promedio
      },
      {
        nombre: 'DolarAPI',
        url: 'https://ve.dolar-api.com/api/rate/usd/ves',
        extraer: (data) => data?.price
      }
    ]

    for (const fuente of fuentes) {
      try {
        const response = await fetch(fuente.url)

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = await response.json()
        const valor = fuente.extraer(data)

        if (valor && !isNaN(valor) && valor > 0) {
          return {
            valor: parseFloat(valor),
            fuente: fuente.nombre
          }
        }
      } catch (error) {
        console.log(`Fuente ${fuente.nombre} falló:`, error.message)
        continue
      }
    }

    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMensaje({ tipo: '', texto: '' })

    if (!nuevaTasa || Number(nuevaTasa) <= 0) {
      setMensaje({ tipo: 'error', texto: 'Por favor ingresa una tasa válida' })
      return
    }

    setGuardando(true)

    try {
      await api.patch('/prices/tasa-cambio', { usd_a_ves: Number(Number(nuevaTasa).toFixed(4)) })

      setMensaje({
        tipo: 'exito',
        texto: '✅ Tasa actualizada correctamente'
      })
      setNuevaTasa('')
      await cargarTasa()

      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000)
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al actualizar la tasa'
      })
    } finally {
      setGuardando(false)
    }
  }

  function usarTasaReferencia() {
    if (tasaReferencia?.valor) {
      setNuevaTasa(Number(tasaReferencia.valor).toString())
    }
  }

  if (cargando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando información de tasa...</p>
      </div>
    )
  }

  return (
    <div className="tasa-cambio-container">
      <div className="section-header">
        <h2>💱 Tasa de Cambio</h2>
        <p className="section-description">
          Administra la tasa de cambio para conversiones de moneda
        </p>
      </div>

      <div className="tasa-actual-card">
        <div className="tasa-info">
          <div className="tasa-valor">
            <span className="label">Tasa Actual</span>
            <span className="valor">
              {tasaActual
                ? `${Number(tasaActual.usd_a_ves).toFixed(4)} Bs/USD`
                : 'No disponible'}
            </span>
          </div>
          {tasaActual?.updated_at && (
            <div className="tasa-meta">
              <span className="fecha-actualizacion">
                📅 Actualizada: {new Date(tasaActual.updated_at).toLocaleString('es-VE', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            </div>
          )}
          <div className="auto-update-status activa">
            <div className="auto-update-info">
              <span className="auto-update-icon">🟢</span>
              <div>
                <strong>Actualización Automática</strong>
                <span className="auto-update-detalle">
                  Se actualiza automáticamente todos los días a las 9pm (hora Venezuela)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="tasa-referencia">
          <h4>📊 Tasa de Referencia del Mercado</h4>

          {cargandoReferencia ? (
            <div className="loading-small">
              <div className="spinner-small"></div>
              Consultando tasas del mercado...
            </div>
          ) : errorReferencia ? (
            <div className="referencia-error">
              <p className="no-disponible">{errorReferencia}</p>
            </div>
          ) : tasaReferencia ? (
            <div className="referencia-info">
              <div className="referencia-valor">
                {Number(tasaReferencia.valor).toFixed(4)} Bs/USD
              </div>
              <div className="referencia-fuente">
                Fuente: {tasaReferencia.fuente}
              </div>
              <div className="referencia-acciones">
                <button
                  className="btn-usar-tasa"
                  onClick={usarTasaReferencia}
                >
                  Usar esta tasa
                </button>
              </div>
            </div>
          ) : (
            <p className="no-disponible">Tasa de referencia no disponible</p>
          )}

          <button
            className="btn-refrescar"
            onClick={obtenerTasaReferencia}
            disabled={cargandoReferencia}
          >
            {cargandoReferencia ? 'Consultando...' : '🔄 Consultar tasa de referencia'}
          </button>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`mensaje ${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="form-container">
        <h3>Actualizar Tasa Manualmente</h3>
        <form onSubmit={handleSubmit} className="tasa-form">
          <div className="input-group">
            <label htmlFor="nuevaTasa">Nueva tasa (Bs. por USD)</label>
            <div className="input-wrapper">
              <span className="input-prefix">Bs.</span>
              <input
                id="nuevaTasa"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.0000"
                value={nuevaTasa}
                onChange={(e) => setNuevaTasa(e.target.value)}
                required
              />
              <span className="input-suffix">/ USD</span>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <span className="spinner-small"></span>
                  Guardando...
                </>
              ) : (
                '💾 Actualizar Tasa'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TasaCambio
