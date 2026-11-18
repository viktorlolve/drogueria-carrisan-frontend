import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, RotateCcw } from 'lucide-react'
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

  return (
    <StaffModal
      titulo={`Presupuesto #${presupuesto.numero || presupuesto.id}`}
      ancho="lg"
      onCerrar={onClose}
    >
      {error && <p className="spd-error">{error}</p>}

      {cargando ? (
        <StaffEstado tipo="cargando" filas={3} />
      ) : (
        <>
          <div className="spd-cabecera">
            <div className="spd-numero">
              <span className="spd-numero-label">Presupuesto N.º</span>
              <span className="spd-numero-valor">{presupuesto.numero || presupuesto.id}</span>
            </div>
            <div className="spd-meta">
              <span className={`spd-badge ${presupuesto.estado === 'vigente' ? 'spd-badge--vigente' : ''}`}>
                {presupuesto.estado}
              </span>
              <p><strong>Emitido:</strong> {formatFecha(presupuesto.fecha_creacion)}</p>
              {presupuesto.fecha_expiracion && (
                <p><strong>Válido hasta:</strong> {formatFecha(presupuesto.fecha_expiracion)}</p>
              )}
            </div>
          </div>

          {presupuesto.usuario && (
            <div className="spd-cliente">
              <span className="spd-cliente-avatar">
                {(presupuesto.usuario.nombre || '?').trim().charAt(0).toUpperCase()}
              </span>
              <span className="spd-cliente-info">
                <strong>{presupuesto.usuario.nombre}</strong>
                <span>{presupuesto.usuario.email}</span>
              </span>
            </div>
          )}

          <hr className="spd-divisor" />

          <div className="spd-tabla">
            <div className="spd-fila spd-fila--cabecera">
              <span>Producto</span>
              <span className="spd-col-cant">Cant.</span>
              <span className="spd-col-precio">P. unitario</span>
              <span className="spd-col-subtotal">Subtotal</span>
            </div>
            {disponibles.map((item, i) => (
              <div key={i} className="spd-fila">
                <span className="spd-fila-nombre" title={item.nombre_comercial}>
                  {item.nombre_comercial}
                  <span className="spd-fila-nombre-cant">× {item.cantidad}</span>
                </span>
                <span className="spd-col-cant spd-fila-dato">{item.cantidad}</span>
                <span className="spd-col-precio spd-fila-dato">${formatUSD(item.precio_unitario)}</span>
                <span className="spd-col-subtotal spd-fila-subtotal">${formatUSD(item.subtotal)}</span>
              </div>
            ))}
            {sinPrecio.map((item, i) => (
              <div key={`sin-${i}`} className="spd-fila spd-fila--sinprecio">
                <span className="spd-fila-nombre">
                  {item.nombre_comercial}
                  <span className="spd-fila-nombre-cant">× {item.cantidad}</span>
                </span>
                <span className="spd-col-cant spd-fila-dato">—</span>
                <span className="spd-col-precio spd-fila-dato">Sin precio</span>
                <span className="spd-col-subtotal spd-fila-dato">Fuera del total</span>
              </div>
            ))}
            {items.length === 0 && <div className="spd-vacio">Sin productos.</div>}
          </div>

          {sinPrecio.length > 0 && (
            <p className="spd-nota">Los productos sin precio no se incluyen en el total.</p>
          )}

          <div className="spd-total">
            <span>Total del presupuesto</span>
            <span>{formatearUSD(total)}</span>
          </div>

          <p className="spd-nota">
            Suma de {disponibles.length} línea{disponibles.length === 1 ? '' : 's'} con precio.
          </p>
        </>
      )}

      <div className="spd-acciones">
        <button
          type="button"
          className="spd-btn spd-btn--outline"
          onClick={() => { onClose(); onRecotizar(presupuesto.id) }}
        >
          <RotateCcw size={15} />
          Recotizar
        </button>
        <button
          type="button"
          className="spd-btn spd-btn--primary"
          onClick={() => { onClose(); onGenerarPedido(presupuesto.id) }}
        >
          Generar pedido
        </button>
        <button
          type="button"
          className="spd-btn spd-btn--pdf"
          onClick={handleGenerarPdf}
          disabled={!detalle || pdfCargando}
        >
          <Download size={15} />
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