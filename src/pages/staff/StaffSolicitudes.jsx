import { useState, useEffect, useMemo } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffTabs from '../../components/staff/StaffTabs'
import { ModalCotizacion, ModalRequerimientoDetalle } from '../../components/staff/StaffComercialModals'
import './StaffComercial.css'
import './StaffClientes.css'
import StaffEstado from '../../components/staff/StaffEstado'

const COLUMNAS_COTIZACION = [
  { estado: 'pendiente', titulo: 'Pendientes', color: '#f59e0b', bg: '#fef3c7' },
  { estado: 'cotizada', titulo: 'Cotizadas', color: '#3b82f6', bg: '#dbeafe' },
  { estado: 'rechazada', titulo: 'Rechazadas', color: '#ef4444', bg: '#fee2e2' },
]
const COLUMNAS_REQUERIMIENTO = [
  { estado: 'pendiente', titulo: 'Pendientes', color: '#f59e0b', bg: '#fef3c7' },
  { estado: 'respondido', titulo: 'Respondidos', color: '#10b981', bg: '#d1fae5' },
]

function formatUSDSolicitud(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function esVencida(cotizacion) {
  return cotizacion.estado === 'cotizada' &&
    cotizacion.fecha_expiracion &&
    new Date(cotizacion.fecha_expiracion) < new Date()
}

function CotizacionCardKanban({ cotizacion, onClick }) {
  const vencida = esVencida(cotizacion)
  return (
    <button type="button" className="kb-card" onClick={onClick}>
      <div className="kb-card__top">
        <span className="kb-card__id">#{cotizacion.id}</span>
        {vencida && <span className="kb-card__vencida">Vencida</span>}
      </div>
      <p className="kb-card__producto">{cotizacion.productos?.nombre_comercial || 'Producto'}</p>
      <div className="kb-card__cliente">
        <span>{cotizacion.users?.nombre || 'Cliente'}</span>
        <span className="kb-card__cliente-email">{cotizacion.users?.email}</span>
      </div>
      {cotizacion.estado === 'cotizada' && !vencida && (
        <p className="kb-card__precio">${formatUSDSolicitud(cotizacion.precio_unitario)}</p>
      )}
      <p className="kb-card__fecha">
        {new Date(cotizacion.fecha_solicitud).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
      </p>
    </button>
  )
}

function RequerimientoCardKanban({ requerimiento, onClick }) {
  const pendientes = requerimiento.requerimiento_items.filter((i) => i.estado_item === 'pendiente').length
  return (
    <button type="button" className="kb-card" onClick={onClick}>
      <div className="kb-card__top">
        <span className="kb-card__id">#{requerimiento.id}</span>
        <span className="kb-card__vencida">{requerimiento.requerimiento_items.length} items</span>
      </div>
      <div className="kb-card__cliente">
        <span>{requerimiento.users?.nombre || 'Cliente'}</span>
        <span className="kb-card__cliente-email">{requerimiento.users?.email}</span>
      </div>
      {pendientes > 0 && requerimiento.estado === 'pendiente' && (
        <p className="kb-card__precio" style={{ color: '#f59e0b' }}>{pendientes} sin precio</p>
      )}
      <p className="kb-card__fecha">
        {new Date(requerimiento.fecha_solicitud).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
      </p>
    </button>
  )
}

function TabCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const [seleccionada, setSeleccionada] = useState(null)

  useEffect(() => {
    let vivo = true
    staffApi.get('/staff/cotizaciones')
      .then(({ data }) => {
        if (!vivo) return
        setCotizaciones(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((err) => {
        console.error('Error al cargar cotizaciones', err)
        if (vivo) setError(err.response?.data?.error || 'No se pudieron cargar las cotizaciones')
      })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [intento])

  function reintentar() {
    setCargando(true)
    setIntento((n) => n + 1)
  }

  async function handleResponder(id, payload) {
    const { data } = await staffApi.patch(`/staff/cotizaciones/${id}/responder`, payload)
    setCotizaciones((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
  }

  async function handleRechazar(id, payload) {
    const { data } = await staffApi.patch(`/staff/cotizaciones/${id}/rechazar`, payload)
    setCotizaciones((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
  }

  const columnas = useMemo(() => {
    return COLUMNAS_COTIZACION.map((col) => ({
      ...col,
      items: cotizaciones.filter((c) => c.estado === col.estado),
    }))
  }, [cotizaciones])

  if (cargando) return <StaffEstado tipo="cargando" filas={3} />
  if (error) return <StaffEstado tipo="error" mensaje={error} onReintentar={reintentar} />

  return (
    <div className="kb-board-wrap">
      <div className="kb-board">
        {columnas.map((col) => (
          <div key={col.estado} className="kb-columna">
            <div className="kb-columna__header">
              <span className="kb-columna__titulo">{col.titulo}</span>
              <span className="kb-columna__count" style={{ background: col.bg, color: col.color }}>
                {col.items.length}
              </span>
            </div>
            <div className="kb-columna__cards">
              {col.items.length === 0 ? (
                <p className="kb-columna__vacio">Sin solicitudes</p>
              ) : (
                col.items.map((c) => (
                  <CotizacionCardKanban key={c.id} cotizacion={c} onClick={() => setSeleccionada(c)} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      <ModalCotizacion
        cotizacion={seleccionada}
        onClose={() => setSeleccionada(null)}
        onResponder={handleResponder}
        onRechazar={handleRechazar}
      />
    </div>
  )
}

function TabRequerimientos() {
  const [requerimientos, setRequerimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const [seleccionado, setSeleccionado] = useState(null)

  useEffect(() => {
    let vivo = true
    staffApi.get('/staff/requerimientos')
      .then(({ data }) => {
        if (!vivo) return
        setRequerimientos(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((err) => {
        console.error('Error al cargar requerimientos', err)
        if (vivo) setError(err.response?.data?.error || 'No se pudieron cargar los requerimientos')
      })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [intento])

  function reintentar() {
    setCargando(true)
    setIntento((n) => n + 1)
  }

  async function handleResponder(id, payload) {
    const { data } = await staffApi.patch(`/staff/requerimientos/${id}/responder`, payload)
    setRequerimientos((prev) => prev.map((r) => (r.id === id ? data : r)))
  }

  const columnas = useMemo(() => {
    return COLUMNAS_REQUERIMIENTO.map((col) => ({
      ...col,
      items: requerimientos.filter((r) => r.estado === col.estado),
    }))
  }, [requerimientos])

  if (cargando) return <StaffEstado tipo="cargando" filas={3} />
  if (error) return <StaffEstado tipo="error" mensaje={error} onReintentar={reintentar} />

  return (
    <div className="kb-board-wrap">
      <div className="kb-board" style={{ gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))' }}>
        {columnas.map((col) => (
          <div key={col.estado} className="kb-columna">
            <div className="kb-columna__header">
              <span className="kb-columna__titulo">{col.titulo}</span>
              <span className="kb-columna__count" style={{ background: col.bg, color: col.color }}>
                {col.items.length}
              </span>
            </div>
            <div className="kb-columna__cards">
              {col.items.length === 0 ? (
                <p className="kb-columna__vacio">Sin solicitudes</p>
              ) : (
                col.items.map((r) => (
                  <RequerimientoCardKanban key={r.id} requerimiento={r} onClick={() => setSeleccionado(r)} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      <ModalRequerimientoDetalle
        key={seleccionado?.id ?? 'cerrado'}
        requerimiento={seleccionado}
        onClose={() => setSeleccionado(null)}
        onResponder={handleResponder}
      />
    </div>
  )
}

function StaffSolicitudes({ departamento = 'comercial', activo = 'solicitudes', titulo = 'Solicitudes' }) {
  const [tab, setTab] = useState('cotizaciones')
  const tabs = [
    { id: 'cotizaciones', texto: 'Cotizaciones' },
    { id: 'requerimientos', texto: 'Requerimientos' },
  ]
  return (
    <LayoutDepartamento departamento={departamento} activo={activo} titulo={titulo}>
      <StaffTabs tabs={tabs} activo={tab} onChange={setTab} />
      <div style={{ paddingTop: 16 }}>
        {tab === 'cotizaciones' ? <TabCotizaciones /> : <TabRequerimientos />}
      </div>
    </LayoutDepartamento>
  )
}

export default StaffSolicitudes
