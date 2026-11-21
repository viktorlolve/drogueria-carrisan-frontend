// StaffReportesFinancieros.jsx
import { useState, useEffect, useMemo } from 'react'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffTabs from '../../components/staff/StaffTabs'
import staffApi from '../../api/staffAxios'
import { exportToPdf } from '../../utils/exportUtils'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import './StaffFinanzas.css'
import './StaffTesoreria.css'
import './StaffReportesFinancieros.css'
import { formatearUSD } from '../../utils/formato'
import StaffEstado from '../../components/staff/StaffEstado'

const TABS = [
  { id: 'panel', texto: 'Panel' },
  { id: 'ventas', texto: 'Ventas' },
  { id: 'credito', texto: 'Crédito' },
  { id: 'cobros', texto: 'Cobros' },
  { id: 'egresos', texto: 'Egresos' },
]

// Mismos colores que los tokens --stf-azul / --stf-finanzas / --stf-aviso /
// --stf-error (src/styles/staff-tokens.css). Recharts aplica fill/stroke
// como atributos SVG, no como CSS, así que var(--token) no se resolvería
// ahí — se deja el valor literal, igual al token, en vez de los hex sueltos
// (#2563EB, #0D9373, #D97706, #dc2626, #ea580c, #16a34a) que traía antes.
const COLOR_AZUL = '#0052DC'
const COLOR_FINANZAS = '#0E8577'
const COLOR_AVISO = '#B45309'
const COLOR_ERROR = '#B3261E'

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function primerDiaDelMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function anioMesDefault() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function diasEnMes(anioMes) {
  const [y, m] = anioMes.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function descargarCSV(filas, cabeceras, keys, nombre) {
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lineas = [cabeceras.join(';')].concat(
    filas.map((f) => keys.map((k) => esc(f[k])).join(';'))
  )
  const blob = new Blob(['\uFEFF' + lineas.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${nombre}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// Número con 2 decimales para las exportaciones (la cabecera de columna ya dice USD).
function numero(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function StaffReportesFinancieros() {
  const [tab, setTab] = useState('panel')
  const [modoPeriodo, setModoPeriodo] = useState('mes') // 'mes' | 'rango'
  const [anioMes, setAnioMes] = useState(anioMesDefault)
  const [desde, setDesde] = useState(primerDiaDelMes)
  const [hasta, setHasta] = useState(hoy)
  // Resultado de la última consulta, etiquetado con el período que pidió. Si el
  // período cambia (o falla la consulta nueva) no se muestran datos de otro período.
  const [resultado, setResultado] = useState(null) // { clave, datos } | { clave, error }
  const [intento, setIntento] = useState(0)

  // Calcular fechas reales desde anioMes
  const fechasDesdeMes = useMemo(() => {
    const [y, m] = anioMes.split('-').map(Number)
    const d = new Date(y, m - 1, 1)
    return d.toISOString().slice(0, 10)
  }, [anioMes])
  const fechasHastaMes = useMemo(() => `${anioMes}-${diasEnMes(anioMes)}`, [anioMes])

  const paramsActuales = modoPeriodo === 'mes'
    ? { desde: fechasDesdeMes, hasta: fechasHastaMes }
    : { desde, hasta }
  const claveActual = `${paramsActuales.desde}|${paramsActuales.hasta}`

  useEffect(() => {
    let activo = true
    const params = modoPeriodo === 'mes'
      ? { desde: fechasDesdeMes, hasta: fechasHastaMes }
      : { desde, hasta }
    const clave = `${params.desde}|${params.hasta}`
    staffApi.get('/staff/reportes/resumen', { params })
      .then((res) => { if (activo) setResultado({ clave, datos: res.data }) })
      .catch((e) => {
        if (!activo) return
        console.error('Error cargando reportes financieros:', e)
        setResultado({ clave, error: e.response?.data?.error || 'No se pudieron cargar los datos del reporte' })
      })
    return () => { activo = false }
  }, [modoPeriodo, desde, hasta, fechasDesdeMes, fechasHastaMes, intento])

  const vigente = resultado && resultado.clave === claveActual ? resultado : null
  const datos = vigente?.datos ?? null
  const error = vigente?.error || ''
  const cargando = !vigente

  function reintentar() {
    setResultado(null)
    setIntento((n) => n + 1)
  }

  const exportarPDF = async () => {
    if (!datos) return
    const filas = datos.ventas.serie_por_dia.map(d => ({
      fecha: d.fecha,
      total: numero(d.total),
      contado: numero(d.contado),
      credito: numero(d.credito),
      ordenes: d.ordenes,
    }))
    await exportToPdf(
      filas,
      [
        { header: 'Fecha', key: 'fecha' },
        { header: 'Total USD', key: 'total' },
        { header: 'Contado', key: 'contado' },
        { header: 'Crédito', key: 'credito' },
        { header: 'Órdenes', key: 'ordenes' },
      ],
      `reportes_financieros_${paramsActuales.desde}_${paramsActuales.hasta}`,
      `Reportes Financieros — ${paramsActuales.desde} a ${paramsActuales.hasta}`
    )
  }

  const exportarCSV = () => {
    if (!datos) return
    descargarCSV(
      datos.ventas.serie_por_dia.map(d => ({
        fecha: d.fecha,
        total: Number(d.total).toFixed(2),
        contado: Number(d.contado).toFixed(2),
        credito: Number(d.credito).toFixed(2),
        ordenes: d.ordenes,
      })),
      ['Fecha', 'Total USD', 'Contado', 'Crédito', 'Órdenes'],
      ['fecha', 'total', 'contado', 'credito', 'ordenes'],
      `reportes_financieros_${paramsActuales.desde}_${paramsActuales.hasta}`
    )
  }

  return (
    <LayoutDepartamento departamento="finanzas" activo="reportes-financieros" titulo="Reportes financieros">
      <div className="srf-header">
        <h3 className="stf-subtitulo">Informe consolidado del período</h3>

        <div className="srf-periodo-toggle">
          <button
            type="button"
            className={`srf-toggle-btn ${modoPeriodo === 'mes' ? 'srf-toggle-btn--activo' : ''}`}
            onClick={() => setModoPeriodo('mes')}
          >
            Por mes
          </button>
          <button
            type="button"
            className={`srf-toggle-btn ${modoPeriodo === 'rango' ? 'srf-toggle-btn--activo' : ''}`}
            onClick={() => setModoPeriodo('rango')}
          >
            Rango personalizado
          </button>
        </div>

        {modoPeriodo === 'mes' ? (
          <div className="srf-filtros">
            <label>
              Período
              <input type="month" value={anioMes} onChange={e => setAnioMes(e.target.value)} />
            </label>
          </div>
        ) : (
          <div className="srf-filtros">
            <label>
              Desde
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
            </label>
          </div>
        )}

        {datos && (
          <div className="srf-acciones">
            <button type="button" className="stf-btn stf-btn--primary" onClick={exportarPDF}>Informe PDF</button>
            <button type="button" className="stf-btn" onClick={exportarCSV}>Exportar CSV</button>
          </div>
        )}
      </div>

      <StaffTabs tabs={TABS} activo={tab} onChange={setTab} />

      {cargando ? (
        <div className="srf-seccion"><StaffEstado tipo="cargando" filas={3} /></div>
      ) : error ? (
        <div className="srf-seccion"><StaffEstado tipo="error" mensaje={error} onReintentar={reintentar} /></div>
      ) : (
        <>
          {/* ═══ PANEL (vista general) ═══ */}
          {tab === 'panel' && (
            <div className="srf-panel">
              <div className="st-resumen-cards">
                <KPI label="Ventas totales" value={formatearUSD(datos.ventas.total_usd)} />
                <KPI label="Ticket promedio" value={formatearUSD(datos.ventas.ticket_promedio)} />
                <KPI label="Crédito aprobado" value={formatearUSD(datos.credito_aprobado.total_usd)} />
                <KPI label="Crédito vencido" value={formatearUSD(datos.credito_vencido.total_usd)} tono={datos.credito_vencido.total_usd > 0 ? 'negativo' : undefined} />
                <KPI label="Cobros" value={formatearUSD(datos.cobros.total_usd)} />
                <KPI label="Facturado" value={formatearUSD(datos.facturado_vs_cobrado.facturado_usd)} />
                <KPI label="Egresos totales" value={formatearUSD(datos.egresos.total_usd)} tono="negativo" />
                <KPI
                  label="Resultado de caja (cobros − egresos)"
                  value={formatearUSD(datos.cobros.total_usd - datos.egresos.total_usd)}
                  tono={(datos.cobros.total_usd - datos.egresos.total_usd) >= 0 ? 'positivo' : 'negativo'}
                />
              </div>

              {datos.ventas.serie_por_dia.length > 0 && (
                <>
                  <h4 className="stf-subtitulo">Ventas por día</h4>
                  <div className="srf-chart-container">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={datos.ventas.serie_por_dia}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="fecha" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <Tooltip formatter={v => formatearUSD(v)} />
                        <Legend />
                        <Bar dataKey="contado" name="Contado" fill={COLOR_AZUL} stackId="a" />
                        <Bar dataKey="credito" name="Crédito" fill={COLOR_FINANZAS} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {datos.credito_vencido.total_usd > 0 && (
                <>
                  <h4 className="stf-subtitulo">Crédito vencido — Aging al cierre</h4>
                  <div className="srf-chart-container">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={Object.entries(datos.credito_vencido.buckets).map(([bucket, total]) => ({ bucket, total }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="bucket" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <Tooltip formatter={v => formatearUSD(v)} />
                        <Bar dataKey="total" name="Monto vencido" fill={COLOR_ERROR} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ VENTAS DETALLADO ═══ */}
          {tab === 'ventas' && (
            <div className="srf-seccion">
              <div className="st-resumen-cards">
                <KPI label="Total vendido" value={formatearUSD(datos.ventas.total_usd)} />
                <KPI label="Órdenes" value={datos.ventas.cantidad_ordenes} />
                <KPI label="Ticket promedio" value={formatearUSD(datos.ventas.ticket_promedio)} />
                <KPI label="Contado" value={formatearUSD(datos.ventas.contado_usd)} />
                <KPI label="Crédito" value={formatearUSD(datos.ventas.credito_usd)} />
              </div>

              {datos.ventas.serie_por_dia.length > 0 && (
                <>
                  <h4 className="stf-subtitulo">Serie de ventas por día</h4>
                  <div className="srf-chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={datos.ventas.serie_por_dia}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="fecha" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <Tooltip formatter={v => formatearUSD(v)} />
                        <Legend />
                        <Bar dataKey="contado" name="Contado" fill={COLOR_AZUL} stackId="a" />
                        <Bar dataKey="credito" name="Crédito" fill={COLOR_FINANZAS} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {datos.ventas.serie_por_dia.length > 0 && (
                <>
                  <h4 className="stf-subtitulo">Órdenes por día</h4>
                  <div className="srf-chart-container">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={datos.ventas.serie_por_dia}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="fecha" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Line type="monotone" dataKey="ordenes" name="Órdenes" stroke={COLOR_AVISO} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ CRÉDITO ═══ */}
          {tab === 'credito' && (
            <div className="srf-seccion">
              <div className="st-resumen-cards">
                <KPI label="Crédito aprobado (período)" value={formatearUSD(datos.credito_aprobado.total_usd)} />
                <KPI label="Órdenes aprobadas" value={datos.credito_aprobado.cantidad_ordenes} />
                <KPI label="Crédito vencido (al cierre)" value={formatearUSD(datos.credito_vencido.total_usd)} tono={datos.credito_vencido.total_usd > 0 ? 'negativo' : undefined} />
                <KPI label="Órdenes vencidas" value={datos.credito_vencido.cantidad_ordenes} />
              </div>

              {datos.credito_aprobado.serie_por_dia.length > 0 && (
                <>
                  <h4 className="stf-subtitulo">Crédito aprobado por día</h4>
                  <div className="srf-chart-container">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={datos.credito_aprobado.serie_por_dia}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="fecha" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <Tooltip formatter={v => formatearUSD(v)} />
                        <Bar dataKey="total" name="Crédito aprobado" fill={COLOR_FINANZAS} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {datos.credito_vencido.total_usd > 0 && (
                <>
                  <h4 className="stf-subtitulo">Aging de deuda vencida al cierre del período</h4>
                  <div className="srf-aging-grid">
                    <div className="srf-aging-card">
                      <span className="srf-aging-label">0–30 días</span>
                      <span className="srf-aging-valor">{formatearUSD(datos.credito_vencido.buckets['0-30'])}</span>
                    </div>
                    <div className="srf-aging-card">
                      <span className="srf-aging-label">31–60 días</span>
                      <span className="srf-aging-valor">{formatearUSD(datos.credito_vencido.buckets['31-60'])}</span>
                    </div>
                    <div className="srf-aging-card">
                      <span className="srf-aging-label">61–90 días</span>
                      <span className="srf-aging-valor">{formatearUSD(datos.credito_vencido.buckets['61-90'])}</span>
                    </div>
                    <div className="srf-aging-card srf-aging-card--critico">
                      <span className="srf-aging-label">90+ días</span>
                      <span className="srf-aging-valor">{formatearUSD(datos.credito_vencido.buckets['90+'])}</span>
                    </div>
                    <div className="srf-aging-card srf-aging-card--total">
                      <span className="srf-aging-label">Total vencido</span>
                      <span className="srf-aging-valor">{formatearUSD(datos.credito_vencido.total_usd)}</span>
                    </div>
                  </div>

                  <div className="srf-chart-container">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={Object.entries(datos.credito_vencido.buckets).map(([bucket, total]) => ({ bucket, total }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="bucket" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <Tooltip formatter={v => formatearUSD(v)} />
                        <Bar dataKey="total" name="Monto vencido" fill={COLOR_ERROR} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ COBROS ═══ */}
          {tab === 'cobros' && (
            <div className="srf-seccion">
              <div className="st-resumen-cards">
                <KPI label="Cobros totales" value={formatearUSD(datos.cobros.total_usd)} />
                <KPI label="Cantidad de pagos" value={datos.cobros.cantidad_pagos} />
                <KPI label="Facturado en el período" value={formatearUSD(datos.facturado_vs_cobrado.facturado_usd)} />
                <KPI
                  label="Diferencia (facturado − cobrado)"
                  value={formatearUSD(datos.facturado_vs_cobrado.diferencia)}
                  tono={datos.facturado_vs_cobrado.diferencia >= 0 ? 'positivo' : 'negativo'}
                />
              </div>

              <div className="srf-chart-container">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[
                      { concepto: 'Facturado', valor: datos.facturado_vs_cobrado.facturado_usd },
                      { concepto: 'Cobrado', valor: datos.facturado_vs_cobrado.cobrado_usd },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="concepto" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip formatter={v => formatearUSD(v)} />
                    <Bar dataKey="valor" name="USD" fill={COLOR_AZUL} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ═══ EGRESOS ═══ */}
          {tab === 'egresos' && (
            <div className="srf-seccion">
              <div className="st-resumen-cards">
                <KPI label="Egresos operativos" value={formatearUSD(datos.egresos.operativos_usd)} />
                <KPI label="Salidas internas" value={formatearUSD(datos.egresos.salidas_internas_usd)} />
                <KPI label="Egresos totales" value={formatearUSD(datos.egresos.total_usd)} tono="negativo" />
              </div>

              <div className="srf-chart-container">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[
                      { tipo: 'Operativos', total: datos.egresos.operativos_usd },
                      { tipo: 'Salidas internas', total: datos.egresos.salidas_internas_usd },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="tipo" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip formatter={v => formatearUSD(v)} />
                    <Bar dataKey="total" name="USD" fill={COLOR_AVISO} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </LayoutDepartamento>
  )
}

function KPI({ label, value, tono }) {
  return (
    <div className={`st-resumen-card ${tono ? `st-resumen-card--${tono}` : ''}`}>
      <div className="st-resumen-card__label">{label}</div>
      <div className={`st-resumen-card__valor ${tono === 'negativo' ? 'st-resumen-card__valor--negativo' : tono === 'positivo' ? 'st-resumen-card__valor--positivo' : ''}`}>
        {value}
      </div>
    </div>
  )
}