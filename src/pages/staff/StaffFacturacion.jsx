import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffEstado from '../../components/staff/StaffEstado'
import { useStaffUI } from '../../hooks/useStaffUI'
import { formatearUSD, formatearVES } from '../../utils/formato'
import { tipoDocumento } from './staffFacturacionConfig'
import PanelEmitir from './StaffFacturacionEmitir'
import './StaffOrdenes.css'
import './StaffFinanzas.css'

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function inicial(nombre) {
  return (nombre?.trim()?.[0] || 'C').toUpperCase()
}

// ------------------------------------------------------------------
// Filtros de documentos (chips)
// ------------------------------------------------------------------
const DOC_CHIPS = [
  { id: 'todos', texto: 'Todos' },
  { id: 'facturas', texto: 'Facturas' },
  { id: 'recibos', texto: 'Recibos' },
  { id: 'notas-credito', texto: 'Notas de crédito' },
  { id: 'notas-debito', texto: 'Notas de débito' },
  { id: 'anulados', texto: 'Anulados' },
]

function filtrarDocumentos(lista, chipId) {
  const items = lista || []
  switch (chipId) {
    case 'facturas':
      return items.filter((d) => !d.anulada && d.tipo === 'factura')
    case 'recibos':
      return items.filter((d) => !d.anulada && d.tipo === 'recibo_cobro')
    case 'notas-credito':
      return items.filter((d) => !d.anulada && d.tipo === 'nota_credito')
    case 'notas-debito':
      return items.filter((d) => !d.anulada && d.tipo === 'nota_debito')
    case 'anulados':
      return items.filter((d) => d.anulada)
    default:
      return items.filter((d) => !d.anulada)
  }
}

// ------------------------------------------------------------------
// Tabla de documentos (compartida por la ficha del cliente y la vista global)
// ------------------------------------------------------------------
function TablaDocumentos({ docs, mostrarCliente, onAnular }) {
  const [anulando, setAnulando] = useState(null)

  async function manejarAnular(doc) {
    if (!onAnular) return
    setAnulando(doc.id)
    await onAnular(doc)
    setAnulando(null)
  }

  if (!docs || docs.length === 0) {
    return <p className="so-aviso">Sin documentos</p>
  }

  return (
    <div className="stf-tabla-wrap">
      <table className="stf-tabla">
        <thead>
          <tr>
            {mostrarCliente && <th>Cliente</th>}
            <th>N°</th>
            <th>Tipo</th>
            <th>Monto</th>
            <th>Monto Bs</th>
            <th>Referencia</th>
            <th>Motivo</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              {mostrarCliente && <td>{d.users?.nombre || `#${d.usuario_id}`}</td>}
              <td>{d.numero_factura}</td>
              <td>{tipoDocumento(d.tipo)}</td>
              <td>{formatearUSD(d.monto_facturado)}</td>
              <td>{d.monto_bs ? formatearVES(d.monto_bs) : '—'}</td>
              <td>{d.factura_referencia_id ? `#${d.factura_referencia_id}` : '—'}</td>
              <td>{d.motivo || d.anulada_motivo || '—'}</td>
              <td>{formatFecha(d.created_at)}</td>
              <td className={d.anulada ? 'stf-estado-doc stf-estado-doc--anulada' : 'stf-estado-doc'}>
                {d.anulada ? 'Anulada' : 'Vigente'}
              </td>
              <td>
                {!d.anulada && onAnular && (
                  <button
                    className="stf-btn stf-btn--small stf-btn--danger"
                    onClick={() => manejarAnular(d)}
                    disabled={anulando === d.id}
                  >
                    {anulando === d.id ? 'Anulando...' : 'Anular'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ------------------------------------------------------------------
// Buscador de cliente (mismo patrón que StaffOrdenes)
// ------------------------------------------------------------------
function BuscadorCliente({ onElegir, autoFocus }) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const debounce = useRef(null)

  // OJO (rol): `/staff/clientes` es el endpoint de Comercial
  // (ROLES_VENTAS = vendedor/administrador/director/admin). Una cuenta de
  // `contabilidad` pura recibe 403 aquí. Fue el comportamiento pre-existente
  // (la búsqueda vivía dentro del tab Emitir) y se conserva a propósito: la
  // fase de diseño NO toca la lógica. Para el ajuste de lógica: exponer un
  // buscador de clientes bajo /staff/contabilidad (hoy `GET /clientes` de
  // contabilidad solo devuelve clientes con crédito y no soporta `buscar`).
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (query.trim().length < 2) return
    debounce.current = setTimeout(() => {
      setBuscando(true)
      staffApi
        .get('/staff/clientes', { params: { buscar: query.trim() } })
        .then(({ data }) => setResultados(data?.clientes || data || []))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false))
    }, 300)
    return () => clearTimeout(debounce.current)
  }, [query])

  const visibles = query.trim().length < 2 ? [] : resultados

  return (
    <>
      <div className="stf-buscador-grande">
        <Search className="stf-buscador-grande__icon" size={18} />
        <input
          className="stf-buscador-grande__input"
          type="text"
          placeholder="Buscar cliente por nombre, correo o RIF…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={autoFocus}
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="so-lista" style={{ maxWidth: 720 }}>
          {buscando && <p className="so-aviso">Buscando...</p>}
          {!buscando && visibles.length === 0 && <p className="so-aviso">Sin clientes que coincidan</p>}
          {visibles.map((c) => (
            <button
              key={c.id}
              type="button"
              className="so-item"
              onClick={() => {
                setQuery('')
                setResultados([])
                onElegir(c)
              }}
            >
              <span className="so-avatar">{inicial(c.nombre)}</span>
              <span className="so-item-info">
                <span className="so-item-nombre">{c.nombre || 'Sin nombre'}</span>
                <span className="so-item-sub">
                  {c.email}
                  {c.rif_cedula ? ` · ${c.rif_cedula}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// ------------------------------------------------------------------
// Página principal: Facturación (diseño "Cliente primero")
// ------------------------------------------------------------------
function StaffFacturacion() {
  const { pedirTexto } = useStaffUI()

  const [docs, setDocs] = useState([])
  const [cargandoDocs, setCargandoDocs] = useState(true)
  const [errorDocs, setErrorDocs] = useState('')
  const [version, setVersion] = useState(0)

  const [tasa, setTasa] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [modoGlobal, setModoGlobal] = useState(false)
  const [chip, setChip] = useState('todos')

  // Documentos (una sola carga para ficha y vista global)
  useEffect(() => {
    let activo = true
    staffApi
      .get('/staff/contabilidad/facturas')
      .then(({ data }) => { if (activo) { setDocs(data || []); setErrorDocs('') } })
      .catch((err) => { if (activo) setErrorDocs(err.response?.data?.error || 'No se pudieron cargar los documentos') })
      .finally(() => { if (activo) setCargandoDocs(false) })
    return () => { activo = false }
  }, [version])

  // Tasa de cambio (una sola vez; la usa el recuadro de emitir)
  useEffect(() => {
    let activo = true
    staffApi
      .get('/prices')
      .then(({ data }) => { if (activo) setTasa(data) })
      .catch(() => { if (activo) setTasa(null) })
    return () => { activo = false }
  }, [])

  const refrescar = () => setVersion((v) => v + 1)

  // Clientes recientes: derivados de los documentos ya cargados (el más
  // reciente por cliente, top 5). No hay endpoint de "pendientes por cliente".
  const recientes = useMemo(() => {
    const porCliente = new Map()
    for (const d of docs || []) {
      if (d.usuario_id == null) continue
      const prev = porCliente.get(d.usuario_id)
      if (!prev || new Date(d.created_at) > new Date(prev.created_at)) porCliente.set(d.usuario_id, d)
    }
    return Array.from(porCliente.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
  }, [docs])

  async function anular(doc) {
    const motivo = await pedirTexto({
      titulo: `Anular ${tipoDocumento(doc.tipo)} #${doc.numero_factura}`,
      etiqueta: 'Motivo de la anulación',
      textoConfirmar: 'Anular',
      peligro: true,
      obligatorio: true,
    })
    if (!motivo) return
    try {
      await staffApi.patch(`/staff/contabilidad/facturas/${doc.id}/anular`, { motivo })
      refrescar()
    } catch (err) {
      setErrorDocs(err.response?.data?.error || 'No se pudo anular el documento')
    }
  }

  function elegirCliente(c) {
    setCliente(c)
    setModoGlobal(false)
    setChip('todos')
  }

  function volverABuscar() {
    setCliente(null)
    setChip('todos')
  }

  const docsCliente = cliente ? (docs || []).filter((d) => d.usuario_id === cliente.id) : []

  return (
    <LayoutDepartamento departamento="finanzas" activo="ventas" titulo="Facturación">
      {errorDocs && <p className="stf-error" role="alert">{errorDocs}</p>}

      {/* ---------- Entrada: sin cliente ---------- */}
      {!cliente && !modoGlobal && (
        <>
          <BuscadorCliente onElegir={elegirCliente} autoFocus />

          {recientes.length > 0 && (
            <div className="stf-recentes">
              <p className="stf-recentes__titulo">Clientes recientes</p>
              {recientes.map((d) => (
                <button
                  key={d.usuario_id}
                  type="button"
                  className="stf-recentes__fila"
                  onClick={() =>
                    elegirCliente({
                      id: d.usuario_id,
                      nombre: d.users?.nombre || `#${d.usuario_id}`,
                      email: d.users?.email || '',
                    })
                  }
                >
                  <span className="stf-recentes__avatar">{inicial(d.users?.nombre)}</span>
                  <span className="stf-recentes__info">
                    <span className="stf-recentes__nombre">{d.users?.nombre || `#${d.usuario_id}`}</span>
                    <span className="stf-recentes__sub">
                      Último: {tipoDocumento(d.tipo)} #{d.numero_factura}
                    </span>
                  </span>
                  <span className="stf-recentes__fecha">{formatFecha(d.created_at)}</span>
                </button>
              ))}
            </div>
          )}

          <button type="button" className="stf-global-link" onClick={() => setModoGlobal(true)}>
            Ver todos los documentos de todos los clientes →
          </button>
        </>
      )}

      {/* ---------- Vista global: documentos de todos ---------- */}
      {!cliente && modoGlobal && (
        <>
          <BuscadorCliente onElegir={elegirCliente} autoFocus />

          <div className="stf-doc-chips" style={{ marginTop: 16 }}>
            {DOC_CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`stf-chip ${chip === c.id ? 'stf-chip--active' : ''}`}
                onClick={() => setChip(c.id)}
              >
                {c.texto}
              </button>
            ))}
          </div>

          {cargandoDocs ? (
            <StaffEstado tipo="cargando" />
          ) : (
            <TablaDocumentos
              docs={filtrarDocumentos(docs, chip)}
              mostrarCliente
              onAnular={chip === 'anulados' ? null : anular}
            />
          )}

          <button type="button" className="stf-global-link" onClick={() => setModoGlobal(false)}>
            ← Volver al buscador
          </button>
        </>
      )}

      {/* ---------- Ficha de trabajo del cliente ---------- */}
      {cliente && (
        <>
          <div className="stf-cliente-header">
            <div className="stf-cliente-header__info">
              <div className="stf-cliente-header__nombre">{cliente.nombre || 'Sin nombre'}</div>
              <div className="stf-cliente-header__meta">
                {[cliente.rif_cedula, cliente.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
              </div>
              {(Number(cliente.linea_credito) > 0 || cliente.credito_bloqueado) && (
                <div className="stf-cliente-header__chips">
                  {Number(cliente.linea_credito) > 0 && (
                    <span className="stf-pill">
                      Crédito: {formatearUSD(cliente.linea_credito)}
                      {cliente.deuda_actual != null ? ` · deuda ${formatearUSD(cliente.deuda_actual)}` : ''}
                    </span>
                  )}
                  {cliente.credito_bloqueado && (
                    <span className="stf-pill stf-pill--alerta">Crédito bloqueado</span>
                  )}
                </div>
              )}
            </div>
            <button type="button" className="stf-btn stf-btn--small" onClick={volverABuscar}>
              Cambiar cliente
            </button>
          </div>

          <PanelEmitir key={cliente.id} cliente={cliente} tasa={tasa} onEmitido={refrescar} />

          <h3 className="stf-subtitulo">Documentos de este cliente</h3>
          <div className="stf-doc-chips">
            {DOC_CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`stf-chip ${chip === c.id ? 'stf-chip--active' : ''}`}
                onClick={() => setChip(c.id)}
              >
                {c.texto}
              </button>
            ))}
          </div>

          {cargandoDocs ? (
            <StaffEstado tipo="cargando" />
          ) : (
            <TablaDocumentos
              docs={filtrarDocumentos(docsCliente, chip)}
              onAnular={chip === 'anulados' ? null : anular}
            />
          )}

          <button type="button" className="stf-global-link" onClick={() => { setCliente(null); setModoGlobal(true); setChip('todos') }}>
            Ver todos los documentos de todos los clientes →
          </button>
        </>
      )}
    </LayoutDepartamento>
  )
}

export default StaffFacturacion
