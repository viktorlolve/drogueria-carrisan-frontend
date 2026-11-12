import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import { ModalCrearPresupuesto } from '../../components/staff/StaffComercialModals'
import generarPresupuestoPDF from '../../utils/generarPresupuestoPDF'
import './StaffComercial.css'
import './StaffClientes.css'
import './StaffPresupuestos.css'
import { useStaffUI } from '../../hooks/useStaffUI'
import StaffModal from '../../components/staff/StaffModal'
import StaffEstado from '../../components/staff/StaffEstado'
import { formatearUSD } from '../../utils/formato'

function formatUSD(v) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ESTADOS_PRESUPUESTO = [
  { id: '', titulo: 'Todos' },
  { id: 'vigente', titulo: 'Vigentes' },
  { id: 'convertido', titulo: 'Convertidos' },
  { id: 'vencido', titulo: 'Vencidos' },
]

/* ---------- Modal de detalle del presupuesto (rediseñado) ---------- */
function ModalPresupuestoDetalle({ presupuesto, onClose, onRecotizar, onGenerarPedido, avisar }) {
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [pdfCargando, setPdfCargando] = useState(false)

  const [prevPresupuestoId, setPrevPresupuestoId] = useState(presupuesto?.id)
  if (presupuesto?.id !== prevPresupuestoId) {
    setPrevPresupuestoId(presupuesto?.id)
    setDetalle(null)
    setCargando(true)
    setError('')
  }

  useEffect(() => {
    if (!presupuesto) return
    let vivo = true
    staffApi.get(`/staff/presupuestos/${presupuesto.id}`)
      .then(({ data }) => { if (vivo) setDetalle(data) })
      .catch((err) => { if (vivo) setError(err.response?.data?.error || 'Error al cargar detalle') })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [presupuesto])

  if (!presupuesto) return null

  const items = (detalle && detalle.items) || []
  const disponibles = items.filter((i) => i.disponible)
  const sinPrecio = items.filter((i) => !i.disponible)
  const total = disponibles.reduce((s, it) => s + Number(it.subtotal || 0), 0)

  async function handleGenerarPdf() {
    if (!detalle) return
    setPdfCargando(true)
    try {
      await generarPresupuestoPDF({ detalle })
      avisar('PDF del presupuesto generado correctamente.')
    } catch (err) {
      avisar(err?.response?.data?.error || 'No se pudo generar el PDF', 'error')
    } finally {
      setPdfCargando(false)
    }
  }

  const estiloCabecera = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 16, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e5e7eb',
  }
  const estiloNumero = {
    display: 'flex', flexDirection: 'column', gap: 4,
  }
  const estiloMeta = { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6 }
  const estiloCliente = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
    background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 16,
  }
  const estiloAvatar = {
    width: 36, height: 36, borderRadius: '50%', background: '#e2e8f0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 18, color: '#475569', flexShrink: 0,
  }
  const estiloDivider = { border: 0, borderTop: '1px solid #e5e7eb', margin: '16px 0' }
  const estiloTabla = { border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }
  const estiloFilaCabecera = {
    display: 'grid', gridTemplateColumns: '1fr 60px 110px 110px',
    padding: '8px 12px', background: '#f1f5f9', fontSize: '0.8rem', fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
  }
  const estiloFila = {
    display: 'grid', gridTemplateColumns: '1fr 60px 110px 110px',
    padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '0.95rem',
    alignItems: 'center',
  }
  const estiloFilaSinPrecio = { color: '#94a3b8', fontStyle: 'italic' }
  const estiloVacio = { padding: '20px 12px', textAlign: 'center', color: '#94a3b8' }
  const estiloTotal = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', background: '#f8fafc', border: '1px solid #e5e7eb',
    borderRadius: 8, marginTop: 8,
  }
  const estiloAcciones = {
    display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20,
    paddingTop: 16, borderTop: '1px solid #e5e7eb',
  }
  const estiloBtnBase = {
    padding: '8px 16px', borderRadius: 6, fontSize: '0.9rem', fontWeight: 600,
    cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s',
  }
  const estiloBtnOutline = { ...estiloBtnBase, background: '#fff', color: '#475569', borderColor: '#cbd5e1' }
  const estiloBtnPrimary = { ...estiloBtnBase, background: '#0052DC', color: '#fff' }
  const estiloBtnPdf = { ...estiloBtnPrimary, background: '#0052DC' }
  const estiloBtnDeshabilitado = { ...estiloBtnPdf, opacity: 0.55, cursor: 'not-allowed' }

  return (
    <StaffModal
      titulo={`Presupuesto #${presupuesto.numero || presupuesto.id}`}
      ancho="lg"
      onCerrar={onClose}
    >
      <div style={{ padding: 0 }}>
        {error && (
          <p style={{ color: '#dc2626', margin: '0 0 12px 0', fontSize: '0.9rem' }}>{error}</p>
        )}
        {cargando ? (
          <StaffEstado tipo="cargando" filas={3} />
        ) : (
          <>
            <div style={estiloCabecera}>
              <div style={estiloNumero}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Presupuesto N.º
                </span>
                <span style={{ fontSize: 1.75rem, fontWeight: 800, color: '#0f172a' }}>
                  {presupuesto.numero || presupuesto.id}
                </span>
              </div>
              <div style={estiloMeta}>
                <span
                  style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: '0.8rem',
                    fontWeight: 700,
                    background: presupuesto.estado === 'vigente' ? '#dcfce7' : '#f1f5f9',
                    color: presupuesto.estado === 'vigente' ? '#15803d' : '#64748b',
                  }}
                >
                  {presupuesto.estado}
                </span>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                  <strong>Emitido:</strong> {formatFecha(presupuesto.fecha_creacion)}
                </p>
                {presupuesto.fecha_expiracion && (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                    <strong>Válido hasta:</strong> {formatFecha(presupuesto.fecha_expiracion)}
                  </p>
                )}
              </div>
            </div>

            {presupuesto.usuario && (
              <div style={estiloCliente}>
                <div style={estiloAvatar}>
                  {(presupuesto.usuario.nombre || '?').trim().charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{presupuesto.usuario.nombre}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{presupuesto.usuario.email}</span>
                </div>
              </div>
            )}

            <hr style={estiloDivider} />

            <div style={estiloTabla}>
              <div style={estiloFilaCabecera}>
                <span>Producto</span>
                <span style={{ textAlign: 'center' }}>Cant.</span>
                <span style={{ textAlign: 'right' }}>P. unitario</span>
                <span style={{ textAlign: 'right' }}>Subtotal</span>
              </div>
              {disponibles.map((item, i) => (
                <div key={i} style={estiloFila}>
                  <span
                    style={{ color: '#0f172a', fontWeight: 500 }}
                    title={item.nombre_comercial}
                  >
                    {item.nombre_comercial} × {item.cantidad}
                  </span>
                  <span style={{ textAlign: 'center', color: '#475569' }}>{item.cantidad}</span>
                  <span style={{ textAlign: 'right', color: '#475569' }}$${formatUSD(item.precio_unitario)}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}$${formatUSD(item.subtotal)}</span>
                </div>
              ))}
              {sinPrecio.map((item, i) => (
                <div key={`sin-${i}`} style={{ ...estiloFila, ...estiloFilaSinPrecio }}>
                  <span>{item.nombre_comercial} × {item.cantidad}</span>
                  <span style={{ textAlign: 'center' }}>—</span>
                  <span style={{ textAlign: 'right' }}>Sin precio</span>
                  <span style={{ textAlign: 'right' }}>Fuera del total</span>
                </div>
              ))}
              {items.length === 0 && <div style={estiloVacio}>Sin productos.</div>}
            </div>

            {sinPrecio.length > 0 && (
              <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                Los productos sin precio no se incluyen en el total.
              </p>
            )}

            <div style={estiloTotal}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                Total del presupuesto
              </span>
              <span style={{ fontSize: 1.5rem, fontWeight: 800, color: '#0052DC' }}>
                {formatearUSD(total)}
              </span>
            </div>

            <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Suma de {disponibles.length} línea{disponibles.length === 1 ? '' : 's'} con precio.
            </p>
          </>
        )}
      </div>

      <div style={estiloAcciones}>
        <button
          className="spd-btn spd-btn--outline"
          style={estiloBtnOutline}
          onClick={() => { onClose(); onRecotizar(presupuesto.id) }}
        >
          Recotizar
        </button>
        <button
          className="spd-btn spd-btn--primary"
          style={estiloBtnPrimary}
          onClick={() => { onClose(); onGenerarPedido(presupuesto.id) }}
        >
          Generar pedido
        </button>
        <button
          className={`spd-btn spd-btn--pdf ${!detalle || pdfCargando ? 'spd-btn--deshabilitado' : ''}`}
          style={detalle && !pdfCargando ? estiloBtnPdf : estiloBtnDeshabilitado}
          onClick={handleGenerarPdf}
          disabled={!detalle || pdfCargando}
        >
          {pdfCargando ? 'Generando PDF…' : 'Generar PDF'}
        </button>
      </div>
    </StaffModal>
  )
}

/* ---------- Página de listado ---------- */
function StaffPresupuestos({ departamento = 'comercial', activo = 'presupuestos', titulo = 'Presupuestos' }) {
  const { confirmar, avisar } = useStaffUI()
  const [estado, setEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  // Resultado de la última consulta, etiquetado con el filtro y la página que pidió:
  // nunca se muestra una lista de otro filtro ni una lista vieja tras un error.
  const [resultado, setResultado] = useState(null) // { clave, presupuestos, totalPaginas } | { clave, error }
  const [intento, setIntento] = useState(0)
  const [modal, setModal] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  // Acceso directo desde el dashboard (tile "Crear presupuesto a cliente",
  // /staff/presupuestos?nuevo=1): arranca con el modal ya abierto, sin pasar
  // por la lista. Estado inicial perezoso (no un efecto) para no disparar un
  // setState extra al montar.
  const [crearModal, setCrearModal] = useState(() => searchParams.get('nuevo') === '1')

  // Limpia el query param una vez leído, para no reabrir el modal en un refresh.
  useEffect(() => {
    if (searchParams.get('nuevo') === '1') {
      setSearchParams((prev) => {
        const siguiente = new URLSearchParams(prev)
        siguiente.delete('nuevo')
        return siguiente
      }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const claveActual = `${estado}|${pagina}`

  useEffect(() => {
    let vivo = true
    const clave = `${estado}|${pagina}`
    staffApi.get('/staff/presupuestos', { params: { estado: estado || undefined, pagina } })
      .then(({ data }) => {
        if (vivo) setResultado({ clave, presupuestos: data?.presupuestos || [], totalPaginas: data?.total_paginas || 1 })
      })
      .catch((err) => {
        if (!vivo) return
        console.error('Error al listar presupuestos', err)
        setResultado({ clave, error: err.response?.data?.error || 'No se pudieron cargar los presupuestos' })
      })
    return () => { vivo = false }
  }, [estado, pagina, intento])

  const vigente = resultado && resultado.clave === claveActual ? resultado : null
  const presupuestos = vigente?.presupuestos || []
  const totalPaginas = vigente?.totalPaginas || 1
  const error = vigente?.error || ''
  const cargando = !vigente

  // Vuelve a pedir la lista sin ocultarla (tras recotizar / generar pedido).
  function recargar() {
    setIntento((n) => n + 1)
  }

  function reintentar() {
    setResultado(null)
    setIntento((n) => n + 1)
  }

  async function recotizar(id) {
    try {
      await staffApi.post(`/staff/presupuestos/${id}/recotizar`)
      recargar()
    } catch (err) {
      avisar(err.response?.data?.error || 'Error al recotizar', 'error')
    }
  }

  async function generarPedido(id) {
    if (!(await confirmar({ titulo: '¿Generar pedido desde este presupuesto?', textoConfirmar: 'Generar pedido' }))) return
    try {
      await staffApi.post(`/staff/presupuestos/${id}/generar-pedido`)
      avisar(`Pedido generado desde el presupuesto #${id}.`)
      recargar()
    } catch (err) {
      avisar(err.response?.data?.error || 'Error al generar pedido', 'error')
    }
  }

  return (
    <LayoutDepartamento departamento={departamento} activo={activo} titulo={titulo}>
      <div className="spu-toolbar">
        <select className="sp-input" value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1) }}>
          {ESTADOS_PRESUPUESTO.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
        </select>
        <button className="sc-btn sc-btn--primary" onClick={() => setCrearModal(true)}>Nuevo presupuesto</button>
      </div>

      <div className="sc-lista-solicitudes" style={{ marginTop: 12 }}>
        {cargando ? (
          <StaffEstado tipo="cargando" filas={4} />
        ) : error ? (
          <StaffEstado tipo="error" mensaje={error} onReintentar={reintentar} />
        ) : presupuestos.length === 0 ? (
          <StaffEstado tipo="vacio" titulo="Sin presupuestos." />
        ) : (
          presupuestos.map((p) => (
            <div key={p.id} className="sc-solicitud-card" onClick={() => setModal(p)}>
              <div className="sc-solicitud-info">
                <span className="sc-solicitud-id">#{p.numero || p.id}</span>
                <span className="sc-solicitud-meta" style={{ marginLeft: 8 }}>
                  {p.usuario?.nombre || `Cliente #${p.usuario_id}`} · {formatFecha(p.fecha_creacion)} · {formatearUSD(p.total_usd)}
                </span>
              </div>
              <span className={`sc-badge ${p.estado === 'vigente' ? 'sc-badge--activo' : 'sc-badge--tipo'}`}>{p.estado}</span>
            </div>
          ))
        )}
      </div>

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <button className="sc-btn sc-btn--outline" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
          <span style={{ fontSize: '0.85rem' }}>Pág {pagina} de {totalPaginas}</span>
          <button className="sc-btn sc-btn--outline" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
        </div>
      )}

      <ModalPresupuestoDetalle
        presupuesto={modal}
        onClose={() => setModal(null)}
        onRecotizar={recotizar}
        onGenerarPedido={generarPedido}
        avisar={avisar}
      />
      {crearModal && (
        <ModalCrearPresupuesto
          onClose={() => setCrearModal(false)}
          onCreado={() => {
            recargar()
            setCrearModal(false)
          }}
        />
      )}
    </LayoutDepartamento>
  )
}

export default StaffPresupuestos
