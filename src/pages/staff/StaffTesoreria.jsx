// StaffTesoreria.jsx
import { useState, useEffect, useCallback } from 'react'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffTabs from '../../components/staff/StaffTabs'
import staffApi from '../../api/staffAxios'
import { exportToPdf } from '../../utils/exportUtils'
import './StaffFinanzas.css'
import './StaffTesoreria.css'

const CATEGORIAS_EGRESO = ['Proveedores', 'Nómina', 'Servicios', 'Mantenimiento', 'Impuestos', 'Otro']
const CATEGORIAS_SALIDA_INTERNA = ['Transferencia a banco', 'Préstamo a personal', 'Retiro del dueño', 'Otro interno']

const TABS = [
  { id: 'resumen', texto: 'Resumen' },
  { id: 'egresos', texto: 'Egresos y salidas' },
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

export default function StaffTesoreria() {
  const [tab, setTab] = useState('resumen')
  const [desde, setDesde] = useState(primerDiaDelMes)
  const [hasta, setHasta] = useState(hoy)
  const [resumen, setResumen] = useState(null)
  const [movimientos, setMovimientos] = useState(null)
  const [form, setForm] = useState({
    tipo: 'egreso',
    categoria: 'Proveedores',
    concepto: '',
    monto: '',
    fecha: hoy(),
    tercero: '',
  })
  const [cargando, setCargando] = useState(true)

  const cargarResumen = useCallback(async () => {
    try {
      const [resumenRes, movRes] = await Promise.all([
        staffApi.get('/staff/tesoreria/resumen', { params: { desde, hasta } }),
        staffApi.get('/staff/tesoreria/movimientos', { params: { desde, hasta } }),
      ])
      setResumen(resumenRes.data)
      setMovimientos(movRes.data)
    } catch (e) {
      console.error('Error cargando tesorería:', e)
    } finally {
      setCargando(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    let activo = true
    Promise.all([
      staffApi.get('/staff/tesoreria/resumen', { params: { desde, hasta } }),
      staffApi.get('/staff/tesoreria/movimientos', { params: { desde, hasta } }),
    ])
      .then(([resumenRes, movRes]) => {
        if (!activo) return
        setResumen(resumenRes.data)
        setMovimientos(movRes.data)
      })
      .catch((e) => {
        if (activo) console.error('Error cargando tesorería:', e)
      })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [desde, hasta])

  const categoriasForm = form.tipo === 'salida_interna' ? CATEGORIAS_SALIDA_INTERNA : CATEGORIAS_EGRESO

  const crearEgreso = async (e) => {
    e.preventDefault()
    if (!form.concepto.trim() || !form.monto || Number(form.monto) <= 0) return
    try {
      await staffApi.post('/staff/tesoreria/egresos', {
        tipo: form.tipo,
        categoria: form.categoria,
        concepto: form.concepto.trim(),
        monto: Number(form.monto),
        fecha: form.fecha,
        tercero: form.tercero.trim() || undefined,
      })
      setForm({ tipo: 'egreso', categoria: 'Proveedores', concepto: '', monto: '', fecha: hoy(), tercero: '' })
      await cargarResumen()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear el movimiento')
    }
  }

  const eliminarEgreso = async (id) => {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    try {
      await staffApi.delete(`/staff/tesoreria/egresos/${id}`)
      await cargarResumen()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar')
    }
  }

  const exportarPDF = async () => {
    if (!resumen || !movimientos) return
    const filas = (movimientos || []).map((m) => ({
      fecha: m.fecha,
      tipo: m.tipo === 'ingreso' ? 'Ingreso' : m.tipo === 'salida_interna' ? 'Salida interna' : 'Egreso',
      categoria: m.categoria,
      concepto: m.concepto,
      tercero: m.tercero || m.cliente || '—',
      monto: m.tipo === 'ingreso' ? m.monto : -m.monto,
    }))
    await exportToPdf(
      filas,
      [
        { header: 'Fecha', key: 'fecha' },
        { header: 'Tipo', key: 'tipo' },
        { header: 'Categoría', key: 'categoria' },
        { header: 'Concepto', key: 'concepto' },
        { header: 'Tercero', key: 'tercero' },
        { header: 'Monto USD', key: 'monto' },
      ],
      `tesoreria_${desde}_${hasta}`,
      `Tesorería — ${desde} a ${hasta}`
    )
  }

  const exportarCSV = () => {
    if (!movimientos) return
    descargarCSV(
      (movimientos || []).map((m) => ({
        fecha: m.fecha,
        tipo: m.tipo === 'ingreso' ? 'Ingreso' : m.tipo === 'salida_interna' ? 'Salida interna' : 'Egreso',
        categoria: m.categoria,
        concepto: m.concepto,
        tercero: m.tercero || m.cliente || '',
        monto: m.tipo === 'ingreso' ? m.monto : -m.monto,
      })),
      ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Tercero', 'Monto USD'],
      ['fecha', 'tipo', 'categoria', 'concepto', 'tercero', 'monto'],
      `tesoreria_${desde}_${hasta}`
    )
  }

  return (
    <LayoutDepartamento departamento="finanzas" activo="tesoreria" titulo="Tesorería">
      <h3 className="stf-subtitulo">Flujo de caja del período</h3>

      <StaffTabs tabs={TABS} activo={tab} onChange={setTab} />

      {tab === 'resumen' && (
        <div style={{ marginTop: 16 }}>
          <div className="st-filtros-fecha">
            <label>
              Desde
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </label>
          </div>

          {cargando ? (
            <p style={{ color: '#6b7280' }}>Cargando...</p>
          ) : (
            resumen && (
              <>
                <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
                  <button className="stf-btn stf-btn--primary" onClick={exportarPDF}>Exportar PDF</button>
                  <button className="stf-btn" onClick={exportarCSV}>Exportar CSV</button>
                </div>

                <div className="st-resumen-cards">
                  <div className="st-resumen-card">
                    <div className="st-resumen-card__label">Ingresos (pagos)</div>
                    <div className="st-resumen-card__valor">{formatUSD(resumen.ingresos)}</div>
                  </div>
                  <div className="st-resumen-card">
                    <div className="st-resumen-card__label">Egresos operativos</div>
                    <div className="st-resumen-card__valor" style={{ color: '#dc2626' }}>{formatUSD(resumen.egresos)}</div>
                  </div>
                  <div className="st-resumen-card">
                    <div className="st-resumen-card__label">Salidas internas</div>
                    <div className="st-resumen-card__valor" style={{ color: '#ea580c' }}>{formatUSD(resumen.salidas_internas)}</div>
                  </div>
                  <div className="st-resumen-card">
                    <div className="st-resumen-card__label">Saldo del período</div>
                    <div className={`st-resumen-card__valor ${resumen.saldo < 0 ? 'st-resumen-card__valor--negativo' : ''}`}>
                      {formatUSD(resumen.saldo)}
                    </div>
                  </div>
                </div>

                {resumen.por_tercero.length > 0 && (
                  <>
                    <h4 className="stf-subtitulo">Por tercero</h4>
                    <div className="stf-tabla-wrap">
                      <table className="stf-tabla">
                        <thead>
                          <tr>
                            <th>Tercero</th>
                            <th>Tipo</th>
                            <th style={{ textAlign: 'right' }}>Total USD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumen.por_tercero.map((t) => (
                            <tr key={t.tercero}>
                              <td>{t.tercero}</td>
                              <td>{t.tipo}</td>
                              <td style={{ textAlign: 'right' }} className={t.total >= 0 ? 'st-saldo-positivo' : 'st-saldo-negativo'}>
                                {t.total >= 0 ? formatUSD(t.total) : `−${formatUSD(Math.abs(t.total))}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {resumen.movimientos_por_dia.length > 0 && (
                  <>
                    <h4 className="stf-subtitulo">Movimientos por día</h4>
                    <table className="st-tabla-dia">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th style={{ textAlign: 'right' }}>Ingresos</th>
                          <th style={{ textAlign: 'right' }}>Egresos</th>
                          <th style={{ textAlign: 'right' }}>Saldo del día</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.movimientos_por_dia.map((d) => (
                          <tr key={d.fecha}>
                            <td>{new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-VE')}</td>
                            <td style={{ textAlign: 'right' }} className="st-saldo-positivo">{formatUSD(d.ingresos)}</td>
                            <td style={{ textAlign: 'right' }} className="st-saldo-negativo">{formatUSD(d.egresos)}</td>
                            <td style={{ textAlign: 'right' }} className={d.saldo >= 0 ? 'st-saldo-positivo' : 'st-saldo-negativo'}>
                              {formatUSD(d.saldo)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {resumen.movimientos_por_dia.length === 0 && !cargando && (
                  <p style={{ color: '#6b7280', marginTop: 16 }}>No hay movimientos en este período.</p>
                )}
              </>
            )
          )}
        </div>
      )}

      {tab === 'egresos' && (
        <div style={{ marginTop: 16 }}>
          <form className="st-form-egreso" onSubmit={crearEgreso}>
            <label>
              Tipo
              <select
                value={form.tipo}
                onChange={(e) => {
                  const tipo = e.target.value
                  setForm({ ...form, tipo, categoria: tipo === 'salida_interna' ? CATEGORIAS_SALIDA_INTERNA[0] : CATEGORIAS_EGRESO[0] })
                }}
              >
                <option value="egreso">Egreso operativo</option>
                <option value="salida_interna">Salida interna</option>
              </select>
            </label>
            <label>
              Categoría
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {categoriasForm.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              Concepto
              <input
                type="text"
                placeholder="Descripción del gasto..."
                value={form.concepto}
                onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                required
              />
            </label>
            <label>
              Monto ($)
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                required
              />
            </label>
            <label>
              Tercero (proveedor/cliente, opcional)
              <input
                type="text"
                placeholder="Nombre del tercero..."
                value={form.tercero}
                onChange={(e) => setForm({ ...form, tercero: e.target.value })}
              />
            </label>
            <label>
              Fecha
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              />
            </label>
            <button type="submit" className="stf-btn stf-btn--primary">
              {form.tipo === 'salida_interna' ? 'Registrar salida interna' : 'Registrar egreso'}
            </button>
          </form>

          <h4 className="stf-subtitulo" style={{ fontSize: 14 }}>Movimientos del período</h4>

          {!movimientos || movimientos.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No hay movimientos registrados en este período.</p>
          ) : (
            movimientos
              .filter((m) => m.tipo !== 'ingreso')
              .map((e) => (
                <div key={e.id} className="st-egreso-item">
                  <div className="st-egreso-item__datos">
                    <div className="st-egreso-item__categoria">{e.tipo === 'salida_interna' ? `Salida interna · ${e.categoria}` : e.categoria}</div>
                    <div className="st-egreso-item__concepto">{e.concepto} {e.tercero ? `· ${e.tercero}` : ''}</div>
                    <div className="st-egreso-item__fecha">
                      {new Date(e.fecha + 'T12:00:00').toLocaleDateString('es-VE')}
                    </div>
                  </div>
                  <div className="st-egreso-item__monto">−{formatUSD(e.monto)}</div>
                  <button className="st-egreso-item__borrar" onClick={() => eliminarEgreso(e.id)} title="Eliminar">
                    ×
                  </button>
                </div>
              ))
          )}
        </div>
      )}
    </LayoutDepartamento>
  )
}