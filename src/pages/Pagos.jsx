import { useState, useEffect, useMemo } from 'react'
import { useLocation, Link } from 'react-router-dom'
import api from '../api/axios'
import { formatearUSD, formatearVES } from '../utils/formato'
import './Pagos.css'

// ---------------------------------------------------------------
// Datos bancarios de la empresa. Fijos por ahora (igual que el resto
// del proyecto trata sus constantes de marca); si más adelante se
// necesita editarlos desde el admin, se puede mover a una tabla como
// se hizo con la tasa de cambio.
// ---------------------------------------------------------------
const DATOS_BANCARIOS = [
  { banco: 'Banesco', tipo: 'Cuenta Corriente', numero: '0134-XXXX-XX-XXXXXXXXXX', titular: 'Droguería Carrisan, C.A.', rif: 'J-XXXXXXXX-X' },
  { banco: 'Pago Móvil', tipo: '', numero: 'Tel: 0414-XXXXXXX', titular: 'Droguería Carrisan, C.A.', rif: 'J-XXXXXXXX-X' },
]

function PasoIndicador({ pasoActual }) {
  const pasos = ['Monto y datos', 'Confirmar pago', 'Subir comprobante']
  return (
    <div className="pagos-pasos">
      {pasos.map((label, i) => (
        <div key={label} className={`pagos-paso ${i + 1 <= pasoActual ? 'pagos-paso--activo' : ''}`}>
          <span className="pagos-paso__numero">{i + 1}</span>
          <span className="pagos-paso__label">{label}</span>
        </div>
      ))}
    </div>
  )
}

function Pagos() {
  const location = useLocation()

  const [ordenes, setOrdenes] = useState([])
  const [seleccionadas, setSeleccionadas] = useState(() => location.state?.ordenIds || [])
  const [tasaVes, setTasaVes] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [paso, setPaso] = useState(1)
  const [comprobante, setComprobante] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [reporteCreado, setReporteCreado] = useState(null)

  useEffect(() => {
    async function cargar() {
      try {
        const [resOrdenes, resTasa] = await Promise.all([
          api.get('/orders/pendientes-pago'),
          api.get('/prices'),
        ])
        setOrdenes(resOrdenes.data)
        setTasaVes(resTasa.data.usd_a_ves)
      } catch (err) {
        console.error(err)
        setError('No pudimos cargar tus órdenes pendientes de pago.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const ordenesSeleccionadas = useMemo(
    () => ordenes.filter((o) => seleccionadas.includes(o.id)),
    [ordenes, seleccionadas]
  )

  const totalUsd = ordenesSeleccionadas.reduce((sum, o) => sum + Number(o.total_usd), 0)
  const totalVes = tasaVes ? totalUsd * tasaVes : null

  function toggleOrden(id) {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubirComprobante() {
  if (!comprobante) {
    setError('Debes adjuntar el comprobante de pago')
    return
  }
  setError('')
  setSubiendo(true)

  try {
    const formData = new FormData()
    formData.append('archivo', comprobante)

    
    const { data: subida } = await api.post('/uploads/comprobante', formData)

    const { data } = await api.post('/reportes-pago', {
      orden_ids: seleccionadas,
      url_comprobante: subida.url,
    })

    setReporteCreado(data)
    setPaso(4)
  } catch (err) {
    setError(err.response?.data?.error || 'No pudimos registrar tu reporte de pago')
  } finally {
    setSubiendo(false)
  }
}

  if (cargando) {
    return <div className="pagos-page pagos-page--centrado">Cargando...</div>
  }

  if (ordenes.length === 0 && !reporteCreado) {
    return (
      <div className="pagos-page pagos-page--centrado">
        <div className="pagos-vacio">
          <div className="pagos-vacio__icon">✅</div>
          <h1>No tienes pagos pendientes</h1>
          <p>Cuando tengas una orden lista para pagar, aparecerá aquí.</p>
          <Link to="/orders" className="pagos-vacio__cta">Ver mis órdenes</Link>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------
  // Confirmación final (después de crear el reporte)
  // ---------------------------------------------------------------
  if (reporteCreado) {
    return (
      <div className="pagos-page pagos-page--centrado">
        <div className="pagos-exito">
          <div className="pagos-exito__icon">📨</div>
          <h1>¡Pago reportado!</h1>
          <p>
            Reportaste tu pago por <strong>VES {formatearVES(reporteCreado.monto_bs)}</strong>.
            Lo verificaremos pronto y te avisaremos.
          </p>
          <Link to="/orders" className="pagos-exito__cta">Volver a mis órdenes</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pagos-page">
      <div className="pagos-container">
        <Link to="/orders" className="pagos-volver">← Volver a Mis Órdenes</Link>
        <h1 className="pagos-title">Pagar orden{seleccionadas.length > 1 ? 'es' : ''}</h1>

        <PasoIndicador pasoActual={paso} />

        {error && <p className="pagos-error">{error}</p>}

        {/* ---------- PASO 1: elegir órdenes (si no vino preseleccionado) y ver monto ---------- */}
        {paso === 1 && (
          <section className="pagos-seccion">
            <h2 className="pagos-seccion__titulo">Selecciona las órdenes a pagar</h2>
            <div className="pagos-ordenes-lista">
              {ordenes.map((orden) => (
                <label key={orden.id} className={`pagos-orden-item ${seleccionadas.includes(orden.id) ? 'pagos-orden-item--activa' : ''}`}>
                  <input
                    type="checkbox"
                    checked={seleccionadas.includes(orden.id)}
                    onChange={() => toggleOrden(orden.id)}
                  />
                  <div className="pagos-orden-item__body">
                    <span className="pagos-orden-item__numero">Orden #{orden.id}</span>
                    {orden.estado_pago === 'rechazado' && (
                      <span className="pagos-orden-item__badge">Rechazado — reintentar</span>
                    )}
                  </div>
                  <span className="pagos-orden-item__monto">{formatearUSD(orden.total_usd)}</span>
                </label>
              ))}
            </div>

            <div className="pagos-resumen-monto">
              <div className="pagos-resumen-monto__row">
                <span>Total en dólares</span>
                <span>{formatearUSD(totalUsd)}</span>
              </div>
              <div className="pagos-resumen-monto__row pagos-resumen-monto__row--destacado">
                <span>Total a pagar en bolívares</span>
                <span>VES {formatearVES(totalVes)}</span>
              </div>
              {tasaVes && <p className="pagos-tasa-nota">Tasa aplicada: {formatearVES(tasaVes)} VES/USD</p>}
            </div>

            <button
              type="button"
              className="pagos-boton pagos-boton--primario"
              disabled={seleccionadas.length === 0}
              onClick={() => setPaso(2)}
            >
              Continuar
            </button>
          </section>
        )}

        {/* ---------- PASO 2: datos bancarios ---------- */}
        {paso === 2 && (
          <section className="pagos-seccion">
            <h2 className="pagos-seccion__titulo">Datos para tu pago</h2>
            <p className="pagos-monto-recordatorio">
              Debes transferir <strong>VES {formatearVES(totalVes)}</strong>
            </p>

            <div className="pagos-datos-bancarios">
              {DATOS_BANCARIOS.map((cuenta, i) => (
                <div key={i} className="pagos-cuenta-card">
                  <p className="pagos-cuenta-card__banco">{cuenta.banco}</p>
                  {cuenta.tipo && <p className="pagos-cuenta-card__linea">{cuenta.tipo}</p>}
                  <p className="pagos-cuenta-card__linea">{cuenta.numero}</p>
                  <p className="pagos-cuenta-card__linea">{cuenta.titular}</p>
                  <p className="pagos-cuenta-card__linea">{cuenta.rif}</p>
                </div>
              ))}
            </div>

            <div className="pagos-nav-botones">
              <button type="button" className="pagos-boton pagos-boton--secundario" onClick={() => setPaso(1)}>
                Atrás
              </button>
              <button type="button" className="pagos-boton pagos-boton--primario" onClick={() => setPaso(3)}>
                Ya pagué
              </button>
            </div>
          </section>
        )}

        {/* ---------- PASO 3: subir comprobante ---------- */}
        {paso === 3 && (
          <section className="pagos-seccion">
            <h2 className="pagos-seccion__titulo">Sube tu comprobante</h2>
            <p className="pagos-seccion__desc">
              Adjunta la foto o captura del comprobante de tu pago por VES {formatearVES(totalVes)}.
            </p>

            <label className="pagos-upload">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setComprobante(e.target.files?.[0] || null)}
              />
              {comprobante ? (
                <span className="pagos-upload__nombre">{comprobante.name}</span>
              ) : (
                <span className="pagos-upload__placeholder">Toca para elegir un archivo</span>
              )}
            </label>

            <div className="pagos-nav-botones">
              <button type="button" className="pagos-boton pagos-boton--secundario" onClick={() => setPaso(2)} disabled={subiendo}>
                Atrás
              </button>
              <button type="button" className="pagos-boton pagos-boton--primario" onClick={handleSubirComprobante} disabled={subiendo}>
                {subiendo ? 'Enviando...' : 'Enviar comprobante'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default Pagos
