import { useEffect, useState } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffCupones.css'
import { useStaffUI } from '../../hooks/useStaffUI'
import { Check } from 'lucide-react'
import StaffEstado from '../../components/staff/StaffEstado'
import { formatearUSD } from '../../utils/formato'

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function estadoCupon(cupon) {
  if (cupon.usado) return { label: 'Usado', cls: 'cup-badge--usado' }
  if (cupon.expira_en && new Date(cupon.expira_en) < new Date()) return { label: 'Vencido', cls: 'cup-badge--vencido' }
  if (!cupon.activo) return { label: 'Desactivado', cls: 'cup-badge--inactivo' }
  return { label: 'Vigente', cls: 'cup-badge--vigente' }
}

export default function StaffCupones() {
  const { confirmar } = useStaffUI()
  const [cupones, setCupones] = useState([])
  const [estadisticas, setEstadisticas] = useState({ total: 0, usados: 0, disponibles: 0 })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [generando, setGenerando] = useState(false)
  const [copiado, setCopiado] = useState(null)

  const [tipo, setTipo] = useState('porcentaje')
  const [valor, setValor] = useState('')
  const [expiraEn, setExpiraEn] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [codigosManuales, setCodigosManuales] = useState('')

  useEffect(() => {
    Promise.all([
      staffApi.get('/staff/cupones?por_pagina=50'),
      staffApi.get('/staff/cupones/estadisticas'),
    ])
      .then(([listaRes, statsRes]) => {
        setCupones(listaRes.data.cupones || [])
        setEstadisticas(statsRes.data)
      })
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar los cupones'))
      .finally(() => setCargando(false))
  }, [])

  async function handleGenerar(e) {
    e.preventDefault()
    setError('')
    const valorNum = Number(valor)
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      setError('Indicá un valor mayor a 0')
      return
    }
    if (tipo === 'porcentaje' && valorNum > 100) {
      setError('El porcentaje no puede superar 100')
      return
    }

    setGenerando(true)
    try {
      const codigosManualesArr = codigosManuales
        .split(/[\s,;]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean)
      const { data } = await staffApi.post('/staff/cupones', {
        cantidad,
        tipo,
        valor: valorNum,
        expira_en: expiraEn || null,
        descripcion: descripcion || null,
        codigos: codigosManualesArr,
      })
      const recienGenerados = data.cupones || []
      const { data: stats } = await staffApi.get('/staff/cupones/estadisticas')
      setEstadisticas(stats)
      setCupones((prev) => [...recienGenerados.map((c) => ({ ...c, users: null })), ...prev])
      setValor('')
      setExpiraEn('')
      setDescripcion('')
      setCodigosManuales('')
      setTipo('porcentaje')
      setCantidad(1)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron generar los cupones')
    } finally {
      setGenerando(false)
    }
  }

  async function handleEliminar(cupon) {
    if (!(await confirmar({ titulo: `¿Eliminar el cupón ${cupon.codigo}?`, texto: 'Esta acción no se puede deshacer.', textoConfirmar: 'Eliminar', peligro: true }))) return
    try {
      await staffApi.delete(`/staff/cupones/${cupon.id}`)
      setCupones((prev) => prev.filter((c) => c.id !== cupon.id))
      const { data: stats } = await staffApi.get('/staff/cupones/estadisticas')
      setEstadisticas(stats)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar el cupón')
    }
  }

  function handleCopiar(cupon) {
    navigator.clipboard?.writeText(cupon.codigo)
    setCopiado(cupon.id)
    setTimeout(() => setCopiado(null), 1500)
  }

  const textoValor = (cupon) => (
    cupon.tipo === 'porcentaje' ? `${Number(cupon.valor)}%` : formatearUSD(cupon.valor)
  )

  return (
    <LayoutDepartamento departamento="comercial" activo="cupones" titulo="Cupones de descuento">
      <div className="cup-page">
        {error && <div className="cup-error">{error}</div>}

        <div className="cup-kpis">
          <div className="cup-kpi cup-kpi--total">
            <span className="cup-kpi__valor">{estadisticas.total}</span>
            <span className="cup-kpi__label">Generados</span>
          </div>
          <div className="cup-kpi cup-kpi--disp">
            <span className="cup-kpi__valor">{estadisticas.disponibles}</span>
            <span className="cup-kpi__label">Disponibles</span>
          </div>
          <div className="cup-kpi cup-kpi--usados">
            <span className="cup-kpi__valor">{estadisticas.usados}</span>
            <span className="cup-kpi__label">Usados</span>
          </div>
        </div>

        <div className="cup-layout">
          <div className="cup-panel">
            <h3 className="cup-panel__titulo">Generar cupón</h3>
            <form className="cup-form" onSubmit={handleGenerar}>
              <div className="cup-form__row">
                <label className="cup-form__label" htmlFor="cup-tipo">Tipo de descuento</label>
                <div className="cup-tipo">
                  <button
                    type="button"
                    className={`cup-seg ${tipo === 'porcentaje' ? 'cup-seg--activo' : ''}`}
                    onClick={() => setTipo('porcentaje')}
                  >
                    Porcentaje
                  </button>
                  <button
                    type="button"
                    className={`cup-seg ${tipo === 'monto' ? 'cup-seg--activo' : ''}`}
                    onClick={() => setTipo('monto')}
                  >
                    Monto ($)
                  </button>
                </div>
              </div>

              <div className="cup-form__campo">
                <label className="cup-form__label" htmlFor="cup-valor">
                  {tipo === 'porcentaje' ? 'Porcentaje de descuento' : 'Monto en dólares'}
                </label>
                <input
                  id="cup-valor"
                  type="number"
                  step={tipo === 'porcentaje' ? '1' : '0.01'}
                  min="0"
                  max={tipo === 'porcentaje' ? 100 : undefined}
                  className="cup-input"
                  placeholder={tipo === 'porcentaje' ? 'Ej: 10' : 'Ej: 5.00'}
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>

              <div className="cup-form__campo">
                <label className="cup-form__label" htmlFor="cup-expira">Vence el (opcional)</label>
                <input
                  id="cup-expira"
                  type="date"
                  className="cup-input"
                  value={expiraEn}
                  onChange={(e) => setExpiraEn(e.target.value)}
                />
              </div>

              <div className="cup-form__campo">
                <label className="cup-form__label" htmlFor="cup-cant">Cantidad</label>
                <input
                  id="cup-cant"
                  type="number"
                  min="1"
                  max="20"
                  className="cup-input"
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                />
              </div>

              <div className="cup-form__campo">
                <label className="cup-form__label" htmlFor="cup-codigos">
                  Códigos personalizados (opcional, uno por línea o separados por coma)
                </label>
                <textarea
                  id="cup-codigos"
                  className="cup-textarea"
                  rows={3}
                  placeholder="BIENVENIDA5, GRACIAS2026"
                  value={codigosManuales}
                  onChange={(e) => setCodigosManuales(e.target.value)}
                />
                {codigosManuales.trim() && cantidad !== codigosManuales.split(/[\s,;]+/).filter(Boolean).length && (
                  <p className="cup-form__ayuda">
                    Debe haber {cantidad} código(s) exactamente (o dejar vacío para autogenerar).
                  </p>
                )}
              </div>

              <div className="cup-form__campo">
                <label className="cup-form__label" htmlFor="cup-desc">Descripción / campaña (opcional)</label>
                <input
                  id="cup-desc"
                  type="text"
                  className="cup-input"
                  placeholder="Ej: Campaña lanzamiento"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              <button type="submit" className="cup-btn" disabled={generando}>
                {generando ? 'Generando…' : 'Generar cupón(es)'}
              </button>
            </form>
          </div>

          <div className="cup-panel">
            <h3 className="cup-panel__titulo">Cupones generados</h3>
            {cargando ? (
              <StaffEstado tipo="cargando" filas={3} />
            ) : cupones.length === 0 ? (
              <p className="cup-vacio">Todavía no hay cupones generados.</p>
            ) : (
              <div className="cup-tabla-wrap">
                <table className="cup-tabla">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descuento</th>
                      <th>Estado</th>
                      <th>Vence</th>
                      <th>Usado por</th>
                      <th className="cup-tabla__acciones">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cupones.map((cupon) => {
                      const estado = estadoCupon(cupon)
                      return (
                        <tr key={cupon.id}>
                          <td className="cup-tabla__codigo">
                            <span className="cup-codigo">{cupon.codigo}</span>
                            <button
                              type="button"
                              className="cup-copiar"
                              onClick={() => handleCopiar(cupon)}
                            >
                              {copiado === cupon.id ? <><Check size={13} /> Copiado</> : 'Copiar'}
                            </button>
                          </td>
                          <td>{textoValor(cupon)}</td>
                          <td><span className={`cup-badge ${estado.cls}`}>{estado.label}</span></td>
                          <td>{formatFecha(cupon.expira_en)}</td>
                          <td>{cupon.users?.nombre || cupon.users?.email || '—'}</td>
                          <td className="cup-tabla__acciones">
                            <button
                              type="button"
                              className="cup-tabla__delete"
                              onClick={() => handleEliminar(cupon)}
                              title="Eliminar cupón"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <p className="cup-nota">Nota: los cupones se consumen en el primer uso del cliente y no pueden reutilizarse.</p>
      </div>
    </LayoutDepartamento>
  )
}