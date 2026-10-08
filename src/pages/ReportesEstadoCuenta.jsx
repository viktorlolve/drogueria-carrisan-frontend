import { useState, useEffect, useMemo, useRef } from 'react'
import {
  AlertCircle,
  CalendarRange,
  CheckCircle2,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import { formatearUSD } from '../utils/formato'
// Base visual compartida con el resto del estado de cuenta (clases ecb-*)
import './ReportesEstadoCuenta.css'

// ---------------------------------------------------------------
// Reportes — extracto en PDF por período, estilo banca en línea.
//
// Los datos se piden una sola vez al entrar y todo el filtrado por fecha
// es client-side. La tarjeta Índigo muestra el período elegido y lo que
// caerá dentro (facturado, pagado, movimientos) ANTES de generar el PDF.
//
// Las fechas se manejan siempre en hora LOCAL. La versión anterior usaba
// toISOString() (UTC): en Venezuela (UTC-4) pasadas las 8 pm el "hoy" saltaba
// al día siguiente y los movimientos de la noche caían en el día equivocado.
// ---------------------------------------------------------------

const CLAVE_OCULTAR = 'ec_ocultar_saldos'
const MASCARA = '••••••'

function aISOLocal(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 'YYYY-MM-DD' -> Date en hora local (new Date('YYYY-MM-DD') sería UTC)
function desdeISOLocal(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function construirPresets() {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  return [
    { key: '30d', label: '30 días', desde: aISOLocal(new Date(y, m, hoy.getDate() - 30)), hasta: aISOLocal(hoy) },
    { key: 'mes', label: 'Este mes', desde: aISOLocal(new Date(y, m, 1)), hasta: aISOLocal(hoy) },
    { key: 'mes-pasado', label: 'Mes pasado', desde: aISOLocal(new Date(y, m - 1, 1)), hasta: aISOLocal(new Date(y, m, 0)) },
    { key: 'trimestre', label: '3 meses', desde: aISOLocal(new Date(y, m - 2, 1)), hasta: aISOLocal(hoy) },
    { key: 'anio', label: 'Este año', desde: aISOLocal(new Date(y, 0, 1)), hasta: aISOLocal(hoy) },
  ]
}

function etiquetaRango(desde, hasta) {
  if (!desde || !hasta) return 'Elige las fechas'
  const d = desdeISOLocal(desde)
  const h = desdeISOLocal(hasta)
  const mismoAnio = d.getFullYear() === h.getFullYear()
  const corta = (f, conAnio) =>
    f.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', ...(conAnio ? { year: 'numeric' } : {}) }).replace('.', '')
  return `${corta(d, !mismoAnio)} – ${corta(h, true)}`
}

function diasEnRango(desde, hasta) {
  if (!desde || !hasta) return 0
  return Math.round((desdeISOLocal(hasta) - desdeISOLocal(desde)) / 86400000) + 1
}

function Estadistica({ label, valor, detalle }) {
  return (
    <div className="ecr-stat">
      <span className="ecr-stat__label">{label}</span>
      <strong className="ecr-stat__valor">{valor}</strong>
      <span className="ecr-stat__detalle">{detalle}</span>
    </div>
  )
}

export default function ReportesEstadoCuenta() {
  const { user } = useAuth()
  const presets = construirPresets()
  const hoyISO = aISOLocal(new Date())

  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [intento, setIntento] = useState(0)
  const [desde, setDesde] = useState(() => construirPresets()[0].desde)
  const [hasta, setHasta] = useState(() => construirPresets()[0].hasta)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const timerExito = useRef(null)
  const [ocultar, setOcultar] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_OCULTAR) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      try {
        const { data } = await api.get(`/clientes/${user.id}/estado-cuenta`)
        if (!cancelado) setDatos(data)
      } catch (err) {
        console.error(err)
        if (!cancelado) setErrorCarga(true)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [user.id, intento])

  useEffect(() => () => clearTimeout(timerExito.current), [])

  function reintentar() {
    setErrorCarga(false)
    setCargando(true)
    setIntento((n) => n + 1)
  }

  function alternarOcultar() {
    const nuevo = !ocultar
    setOcultar(nuevo)
    try {
      localStorage.setItem(CLAVE_OCULTAR, nuevo ? '1' : '0')
    } catch {
      /* sin storage: la preferencia vive solo en esta sesión */
    }
  }

  function aplicarPreset(p) {
    setDesde(p.desde)
    setHasta(p.hasta)
    setError('')
  }

  // Preset activo = el que coincide exactamente con las fechas actuales
  const presetActivo = presets.find((p) => p.desde === desde && p.hasta === hasta)?.key || 'personalizado'

  let errorRango = ''
  if (!desde || !hasta) errorRango = 'Completa las dos fechas para continuar.'
  else if (desde > hasta) errorRango = 'La fecha "Desde" no puede ser posterior a "Hasta".'
  else if (hasta > hoyISO) errorRango = 'La fecha "Hasta" no puede ser futura.'
  const rangoValido = !errorRango

  const preview = useMemo(() => {
    if (!datos || !rangoValido) return { ordenes: [], facturas: [], pagos: [] }
    const enRango = (iso) => {
      if (!iso) return false
      const f = aISOLocal(new Date(iso))
      return f >= desde && f <= hasta
    }
    return {
      ordenes: (datos.ordenes_pendientes || []).filter((o) => enRango(o.created_at)),
      facturas: (datos.facturas || []).filter((f) => enRango(f.created_at)),
      pagos: (datos.pagos || []).filter((p) => enRango(p.created_at)),
    }
  }, [datos, desde, hasta, rangoValido])

  const totalFacturado = preview.facturas.reduce((s, f) => s + Number(f.monto_facturado || 0), 0)
  const totalPagado = preview.pagos.reduce((s, p) => s + Number(p.monto || 0), 0)
  const movimientos = preview.facturas.length + preview.pagos.length
  const dias = diasEnRango(desde, hasta)
  const monto = (v) => (ocultar ? `USD ${MASCARA}` : formatearUSD(v))

  async function generarReporte() {
    if (!datos || !rangoValido) return
    setGenerando(true)
    setError('')
    setExito(false)
    try {
      const { default: generarReporteEstadoCuentaPDF } = await import('../utils/generarReporteEstadoCuentaPDF')
      await generarReporteEstadoCuentaPDF({
        cliente: datos.cliente,
        resumen: datos.resumen,
        facturas: preview.facturas,
        pagos: preview.pagos,
        ordenes: preview.ordenes,
        vencimientos: datos.ordenes_pendientes || [],
        desde,
        hasta,
      })
      setExito(true)
      clearTimeout(timerExito.current)
      timerExito.current = setTimeout(() => setExito(false), 5000)
    } catch (err) {
      setError('No se pudo generar el reporte. Inténtalo de nuevo.')
      console.error(err)
    } finally {
      setGenerando(false)
    }
  }

  const incluye = [
    { titulo: 'Resumen de tu línea de crédito', detalle: 'Línea, deuda actual, deuda vencida y disponible' },
    { titulo: 'Gráfico mensual', detalle: 'Facturado vs pagado mes a mes' },
    { titulo: 'Vencimientos', detalle: 'Estado de tus órdenes por pagar' },
    {
      titulo: 'Movimientos del período',
      detalle: `${preview.facturas.length} ${preview.facturas.length === 1 ? 'factura' : 'facturas'} · ${preview.pagos.length} ${preview.pagos.length === 1 ? 'pago' : 'pagos'}`,
    },
    ...(preview.ordenes.length > 0
      ? [{ titulo: 'Órdenes pendientes', detalle: `${preview.ordenes.length} ${preview.ordenes.length === 1 ? 'orden' : 'órdenes'} del período` }]
      : []),
  ]

  return (
    <LayoutPaginaPrincipal
      activo="reportes"
      titulo="Reportes"
      subtitulo="Genera un PDF de tu estado de cuenta por período"
      nav={NAV_UNIFICADO}
    >
      {cargando ? (
        <div className="ecb-root" aria-busy="true" aria-live="polite">
          <div className="ecb-skel ecr-skel-hero" />
          <div className="ecb-skel ecb-skel--extracto" />
        </div>
      ) : errorCarga || !datos ? (
        <div className="ecb-root">
          <div className="ecb-error">
            <span className="ecb-error__icono"><AlertCircle size={28} /></span>
            <h2>No pudimos cargar tu información</h2>
            <p>Revisa tu conexión e inténtalo de nuevo.</p>
            <button type="button" className="ecb-btn" onClick={reintentar}>
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        </div>
      ) : (
        <div className="ecb-root">
          {/* Tarjeta: período elegido + lo que caerá dentro */}
          <section className="ecb-tarjeta ecr-hero" aria-label="Período del extracto">
            <div className="ecb-tarjeta__brillo" aria-hidden="true" />

            <header className="ecb-tarjeta__cab">
              <div className="ecb-tarjeta__marca">
                <span className="ecb-tarjeta__logo"><FileText size={16} /></span>
                <span>Extracto de cuenta</span>
              </div>
              <button
                type="button"
                className="ecb-ojo"
                onClick={alternarOcultar}
                aria-pressed={ocultar}
                aria-label={ocultar ? 'Mostrar montos' : 'Ocultar montos'}
              >
                {ocultar ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </header>

            <div className="ecb-tarjeta__saldo">
              <span className="ecb-tarjeta__etiqueta">Período seleccionado</span>
              <span className="ecr-rango">{etiquetaRango(rangoValido ? desde : '', rangoValido ? hasta : '')}</span>
              {rangoValido && (
                <span className="ecr-dias">{dias} {dias === 1 ? 'día' : 'días'}</span>
              )}
            </div>

            <div className="ecr-stats">
              <Estadistica
                label="Facturado"
                valor={monto(totalFacturado)}
                detalle={`${preview.facturas.length} ${preview.facturas.length === 1 ? 'factura' : 'facturas'}`}
              />
              <Estadistica
                label="Pagado"
                valor={monto(totalPagado)}
                detalle={`${preview.pagos.length} ${preview.pagos.length === 1 ? 'pago' : 'pagos'}`}
              />
              <Estadistica
                label="Movimientos"
                valor={String(movimientos)}
                detalle="en el período"
              />
            </div>
          </section>

          <div className="ecr-grid">
            {/* Selector de período */}
            <section className="ecr-card" aria-label="Elegir período">
              <h2 className="ecr-card__titulo">
                <CalendarRange size={18} /> Período
              </h2>

              <div className="ecb-filtros ecr-presets" role="tablist" aria-label="Períodos rápidos">
                {presets.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    role="tab"
                    aria-selected={presetActivo === p.key}
                    className={`ecb-filtro ${presetActivo === p.key ? 'ecb-filtro--activo' : ''}`}
                    onClick={() => aplicarPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
                <span
                  role="tab"
                  aria-selected={presetActivo === 'personalizado'}
                  className={`ecb-filtro ecr-personalizado ${presetActivo === 'personalizado' ? 'ecb-filtro--activo' : ''}`}
                >
                  Personalizado
                </span>
              </div>

              <div className="ecr-fechas">
                <label className="ecr-campo">
                  <span>Desde</span>
                  <input
                    type="date"
                    value={desde}
                    max={hasta && hasta < hoyISO ? hasta : hoyISO}
                    onChange={(e) => { setDesde(e.target.value); setError('') }}
                  />
                </label>
                <label className="ecr-campo">
                  <span>Hasta</span>
                  <input
                    type="date"
                    value={hasta}
                    min={desde || undefined}
                    max={hoyISO}
                    onChange={(e) => { setHasta(e.target.value); setError('') }}
                  />
                </label>
              </div>

              {errorRango && (
                <p className="ecr-invalido" role="alert">
                  <AlertCircle size={15} /> {errorRango}
                </p>
              )}
            </section>

            {/* Qué incluye + generar */}
            <section className="ecr-card" aria-label="Contenido del extracto">
              <h2 className="ecr-card__titulo">
                <FileDown size={18} /> Tu extracto incluirá
              </h2>

              <ul className="ecr-incluye">
                {incluye.map((it) => (
                  <li key={it.titulo}>
                    <CheckCircle2 size={18} />
                    <span>
                      <strong>{it.titulo}</strong>
                      <small>{it.detalle}</small>
                    </span>
                  </li>
                ))}
              </ul>

              {rangoValido && movimientos === 0 && (
                <p className="ecr-nota">
                  <Info size={16} />
                  <span>No hay facturas ni pagos en este período. El PDF incluirá solo el resumen de tu cuenta.</span>
                </p>
              )}

              {error && (
                <div className="ecb-alerta ecb-alerta--critico" role="alert">
                  <AlertCircle size={18} />
                  <div className="ecb-alerta__texto"><p>{error}</p></div>
                </div>
              )}

              {exito && (
                <div className="ecb-alerta ecr-alerta--ok" role="status">
                  <CheckCircle2 size={18} />
                  <div className="ecb-alerta__texto"><p>Tu extracto se descargó correctamente.</p></div>
                </div>
              )}

              <button
                type="button"
                className="ecr-generar"
                onClick={generarReporte}
                disabled={generando || !rangoValido}
              >
                {generando ? <Loader2 size={18} className="ecb-giro" /> : <FileDown size={18} />}
                {generando ? 'Generando PDF…' : 'Generar PDF'}
              </button>
            </section>
          </div>
        </div>
      )}
    </LayoutPaginaPrincipal>
  )
}
