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

const TABS = [
  { id: 'panel', texto: 'Panel' },
  { id: 'ventas', texto: 'Ventas' },
  { id: 'credito', texto: 'Crédito' },
  { id: 'cobros', texto: 'Cobros' },
  { id: 'egresos', texto: 'Egresos' },
]

function formatUSD(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

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

export default function StaffReportesFinancieros() {
  const [tab, setTab] = useState('panel')
  const [modoPeriodo, setModoPeriodo] = useState('mes') // 'mes' | 'rango'
  const [anioMes, setAnioMes] = useState(anioMesDefault)
  const [desde, setDesde] = useState(primerDiaDelMes)
  const [hasta, setHasta] = useState(hoy)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Calcular fechas reales desde anioMes
  const fechasDesdeMes = useMemo(() => {
    const [y, m] = anioMes.split('-').map(Number)
    const d = new Date(y, m - 1, 1)
    return d.toISOString().slice(0, 10)
  }, [anioMes])
  const fechasHastaMes = useMemo(() => `${anioMes}-${diasEnMes(anioMes)}`, [anioMes])

  useEffect(() => {
    let activo = true
    const cargar = async () => {
      const params = modoPeriodo === 'mes'
        ? { desde: fechasDesdeMes, hasta: fechasHastaMes }
        : { desde, hasta }
      try {
        const res = await staffApi.get('/staff/reportes/resumen', { params })
        if (activo) setDatos(res.data)
      } catch (e) {
        if (activo) console.error('Error cargando reportes financieros:', e)
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => { activo = false }
  }, [modoPeriodo, anioMes, desde, hasta, fechasDesdeMes, fechasHastaMes])

  const paramsActuales = modoPeriodo === 'mes'
    ? { desde: fechasDesdeMes, hasta: fechasHastaMes }
    : { desde, hasta }

  const exportarPDF = async () => {
    if (!datos) return
    const filas = datos.ventas.serie_por_dia.map(d => ({
      fecha: d.fecha,
      total: formatUSD(d.total),
      contado: formatUSD(d.contado),
      credito: formatUSD(d.credito),
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
            className={`srf-toggle-btn ${modoPeriodo === 'mes' ? 'srf-toggle-btn--activo' : ''}`}
            onClick={() => setModoPeriodo('mes')}
          >
            Por mes
          </button>
          <button
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
            <button className="stf-btn stf-btn--primary" onClick={exportarPDF}>Informe PDF</button>
            <button className="stf-btn" onClick={exportarCSV}>Exportar CSV</button>
          </div>
        )}
      </div>

      <StaffTabs tabs={TABS} activo={tab} onChange={setTab} />

      {cargando ? (
        <p style={{ color: '#6b7280', marginTop: 16 }}>Cargando reporte...</p>
      ) : !datos ? (
        <p style={{ color: '#6b7280', marginTop: 16 }}>No se pudieron cargar los datos.</p>
      ) : (
        <>
          {/* ═══ PANEL (vista general) ═══ */}
          {tab === 'panel' && (
            <div className="srf-panel">
              <div className="st-resumen-cards">
                <KPI label="Ventas totales" value={formatUSD(datos.ventas.total_usd)} />
                <KPI label="Ticket promedio" value={formatUSD(datos.ventas.ticket_promedio)} />
                <KPI label="Crédito aprobado" value={formatUSD(datos.credito_aprobado.total_usd)} />
                <KPI label="Crédito vencido" value={formatUSD(datos.credito_vencido.total_usd)} color={datos.credito_vencido.total_usd > 0 ? '#dc2626' : undefined} />
                <KPI label="Cobros" value={formatUSD(datos.cobros.total_usd)} />
                <KPI label="Facturado" value={formatUSD(datos.facturado_vs_cobrado.facturado_usd)} />
                <KPI label="Egresos totales" value={formatUSD(datos.egresos.total_usd)} color="#dc2626" />
                <KPI
                  label="Resultado de caja (cobros − egresos)"
                  value={formatUSD(datos.cobros.total_usd - datos.egresos.total_usd)}
                  color={
                    (datos.cobros.total_usd - datos.egresos.total_usd) >= 0 ? '#16a34a' : '#dc2626'
                  }
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
                        <Tooltip formatter={v => formatUSD(v)} />
                        <Legend />
                        <Bar dataKey="contado" name="Contado" fill="#2563EB" stackId="a" />
                        <Bar dataKey="credito" name="Crédito" fill="#0D9373" stackId="a" />
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
                        <Tooltip formatter={v => formatUSD(v)} />
                        <Bar dataKey="total" name="Monto vencido" fill="#dc2626" />
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
                <KPI label="Total vendido" value={formatUSD(datos.ventas.total_usd)} />
                <KPI label="Órdenes" value={datos.ventas.cantidad_ordenes} />
                <KPI label="Ticket promedio" value={formatUSD(datos.ventas.ticket_promedio)} />
                <KPI label="Contado" value={formatUSD(datos.ventas.contado_usd)} />
                <KPI label="Crédito" value={formatUSD(datos.ventas.credito_usd)} />
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
                        <Tooltip formatter={v => formatUSD(v)} />
                        <Legend />
                        <Bar dataKey="contado" name="Contado" fill="#2563EB" stackId="a" />
                        <Bar dataKey="credito" name="Crédito" fill="#0D9373" stackId="a" />
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
                        <Line type="monotone" dataKey="ordenes" name="Órdenes" stroke="#D97706" strokeWidth={2} dot={{ r: 3 }} />
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
                <KPI label="Crédito aprobado (período)" value={formatUSD(datos.credito_aprobado.total_usd)} />
                <KPI label="Órdenes aprobadas" value={datos.credito_aprobado.cantidad_ordenes} />
                <KPI label="Crédito vencido (al cierre)" value={formatUSD(datos.credito_vencido.total_usd)} color={datos.credito_vencido.total_usd > 0 ? '#dc2626' : undefined} />
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
                        <Tooltip formatter={v => formatUSD(v)} />
                        <Bar dataKey="total" name="Crédito aprobado" fill="#0D9373" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {datos.credito_vencido.total_usd > 0 && (
                <>
                  <h4 className="stf-subtitulo">Aging de deuda vencida al cierre del período</h4>
                  <div className="stf-tabla-wrap">
                    <table className="stf-tabla">
                      <thead>
                        <tr>
                          <th>0–30 días</th>
                          <th>31–60 días</th>
                          <th>61–90 días</th>
                          <th>90+ días</th>
                          <th style={{ textAlign: 'right' }}>Total vencido</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{formatUSD(datos.credito_vencido.buckets['0-30'])}</td>
                          <td>{formatUSD(datos.credito_vencido.buckets['31-60'])}</td>
                          <td>{formatUSD(datos.credito_vencido.buckets['61-90'])}</td>
                          <td className="st-saldo-negativo">{formatUSD(datos.credito_vencido.buckets['90+'])}</td>
                          <td style={{ textAlign: 'right' }} className="st-saldo-negativo">{formatUSD(datos.credito_vencido.total_usd)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="srf-chart-container" style={{ marginTop: 16 }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={Object.entries(datos.credito_vencido.buckets).map(([bucket, total]) => ({ bucket, total }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="bucket" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <Tooltip formatter={v => formatUSD(v)} />
                        <Bar dataKey="total" name="Monto vencido" fill="#dc2626" />
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
                <KPI label="Cobros totales" value={formatUSD(datos.cobros.total_usd)} />
                <KPI label="Cantidad de pagos" value={datos.cobros.cantidad_pagos} />
                <KPI label="Facturado en el período" value={formatUSD(datos.facturado_vs_cobrado.facturado_usd)} />
                <KPI
                  label="Diferencia (facturado − cobrado)"
                  value={formatUSD(datos.facturado_vs_cobrado.diferencia)}
                  color={datos.facturado_vs_cobrado.diferencia >= 0 ? '#16a34a' : '#dc2626'}
                />
              </div>

              <div className="srf-chart-container" style={{ marginTop: 16 }}>
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
                    <Tooltip formatter={v => formatUSD(v)} />
                    <Bar dataKey="valor" name="USD" fill="#2563EB" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ═══ EGRESOS ═══ */}
          {tab === 'egresos' && (
            <div className="srf-seccion">
              <div className="st-resumen-cards">
                <KPI label="Egresos operativos" value={formatUSD(datos.egresos.operativos_usd)} />
                <KPI label="Salidas internas" value={formatUSD(datos.egresos.salidas_internas_usd)} />
                <KPI label="Egresos totales" value={formatUSD(datos.egresos.total_usd)} color="#dc2626" />
              </div>

              <div className="srf-chart-container" style={{ marginTop: 16 }}>
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
                    <Tooltip formatter={v => formatUSD(v)} />
                    <Bar dataKey="total" name="USD" fill="#ea580c" />
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

function KPI({ label, value, color }) {
  return (
    <div className="st-resumen-card">
      <div className="st-resumen-card__label">{label}</div>
      <div className="st-resumen-card__valor" style={color ? { color } : undefined}>{value}</div>
    </div>
  )
}