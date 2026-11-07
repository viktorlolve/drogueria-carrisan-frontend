import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffEstado from '../../components/staff/StaffEstado'
import StaffModal from '../../components/staff/StaffModal'
import { useStaffUI } from '../../hooks/useStaffUI'
import { formatearUSD } from '../../utils/formato'
import './StaffDescuentos.css'

// ---------------------------------------------------------------
// Descuentos (Comercial) — CRUD de descuentos de campaña.
//
// Un descuento aplica a UN alcance (producto, marca, laboratorio, molécula,
// línea o forma), con un valor en % o monto fijo y una ventana de fechas.
// El backend los aplica solo: catálogo/ficha (productos.controller.js) y
// checkout (construirOrden). Si varios aplican a la vez, gana el de mayor
// ahorro en USD.
//
// Se reutilizan los handlers de /admin/descuentos vía /staff/descuentos
// (sesión staff, nunca el `api` de clientes).
//
// OJO: el formulario del admin manda `descripcion`, pero el controller NO la
// persiste (la tabla no la usa), así que acá no se pide.
// ---------------------------------------------------------------

const ALCANCES = [
  { valor: 'producto', label: 'Producto', icono: '📦' },
  { valor: 'marca', label: 'Marca', icono: '🏷️' },
  { valor: 'laboratorio', label: 'Laboratorio', icono: '🧪' },
  { valor: 'molecula', label: 'Molécula', icono: '⚗️' },
  { valor: 'linea', label: 'Línea', icono: '📊' },
  { valor: 'forma', label: 'Forma', icono: '💊' },
]

const CAMPOS_TEXTO = ['laboratorio', 'molecula', 'linea', 'forma']

const ESTADO_CONFIG = {
  vigente: { texto: 'Vigente', clase: 'vigente' },
  programado: { texto: 'Programado', clase: 'programado' },
  expirado: { texto: 'Expirado', clase: 'expirado' },
  inactivo: { texto: 'Inactivo', clase: 'inactivo' },
}

function toDatetimeLocal(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// Suma días a la fecha de inicio conservando la hora local (se usa setDate,
// no milisegundos, para que un cambio de horario de verano no mueva la hora).
function sumarDias(fechaLocal, dias) {
  const base = fechaLocal ? new Date(fechaLocal) : new Date()
  if (Number.isNaN(base.getTime())) return ''
  base.setDate(base.getDate() + dias)
  return toDatetimeLocal(base)
}

function formatearFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function etiquetaAlcance(d) {
  if (d.alcance === 'producto') return d.productos?.nombre_comercial || `Producto #${d.producto_id}`
  if (d.alcance === 'marca') return d.marcas?.nombre || `Marca #${d.marca_id}`
  return d.alcance_valor || '—'
}

function etiquetaValor(d) {
  return d.tipo === 'porcentaje' ? `${Number(d.valor)}%` : formatearUSD(d.valor)
}

// ---------------------------------------------------------------
// Formulario (crear / editar) dentro de StaffModal
// ---------------------------------------------------------------
const FORM_VACIO = {
  alcance: 'producto',
  productoId: null,
  productoLabel: '',
  marcaId: '',
  marcaLabel: '',
  alcanceValor: '',
  tipo: 'porcentaje',
  valor: '',
  activo: true,
}

function FormDescuento({ descuento, opciones, onGuardado, onCerrar }) {
  const esEdicion = Boolean(descuento)
  const [form, setForm] = useState(() => {
    if (!descuento) return { ...FORM_VACIO }
    return {
      alcance: descuento.alcance,
      productoId: descuento.producto_id || null,
      productoLabel: descuento.productos?.nombre_comercial || '',
      marcaId: descuento.marca_id ? String(descuento.marca_id) : '',
      marcaLabel: descuento.marcas?.nombre || '',
      alcanceValor: descuento.alcance_valor || '',
      tipo: descuento.tipo,
      valor: String(descuento.valor ?? ''),
      activo: descuento.activo ?? true,
    }
  })
  const [fechaInicio, setFechaInicio] = useState(toDatetimeLocal(descuento?.fecha_inicio) || toDatetimeLocal(new Date()))
  const [fechaFin, setFechaFin] = useState(toDatetimeLocal(descuento?.fecha_fin))
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [resultadosProducto, setResultadosProducto] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Búsqueda de producto server-side (staff), con debounce. El endpoint
  // devuelve 12 resultados y ya viene con descuentos aplicados: acá solo se
  // usa para elegir el producto, no se muestra el precio.
  useEffect(() => {
    const texto = busquedaProducto.trim()
    if (texto.length < 2) return
    let activo = true
    const timer = setTimeout(() => {
      staffApi
        .get('/staff/productos', { params: { buscar: texto } })
        .then(({ data }) => { if (activo) setResultadosProducto(data || []) })
        .catch(() => { if (activo) setResultadosProducto([]) })
    }, 300)
    return () => { activo = false; clearTimeout(timer) }
  }, [busquedaProducto])

  function cambiarAlcance(valor) {
    setForm({ ...FORM_VACIO, tipo: form.tipo, valor: form.valor, activo: form.activo, alcance: valor })
    setBusquedaProducto('')
    setResultadosProducto([])
    setError('')
  }

  function seleccionarProducto(p) {
    setForm({ ...form, productoId: p.id, productoLabel: p.nombre_comercial })
    setBusquedaProducto('')
    setResultadosProducto([])
  }

  function validar() {
    if (form.alcance === 'producto' && !form.productoId) return 'Seleccioná un producto'
    if (form.alcance === 'marca' && !form.marcaId) return 'Seleccioná una marca'
    if (CAMPOS_TEXTO.includes(form.alcance) && !form.alcanceValor.trim()) {
      return `Seleccioná o escribí ${ALCANCES.find((a) => a.valor === form.alcance)?.label.toLowerCase()}`
    }
    const valor = Number(form.valor)
    if (!Number.isFinite(valor) || valor <= 0) return 'Ingresá un valor mayor a 0'
    if (form.tipo === 'porcentaje' && valor > 100) return 'Un porcentaje no puede superar 100'
    if (!fechaInicio) return 'La fecha de inicio es obligatoria'
    if (fechaFin && new Date(fechaFin) <= new Date(fechaInicio)) {
      return 'La fecha de fin debe ser posterior a la de inicio'
    }
    return ''
  }

  async function guardar(e) {
    e.preventDefault()
    const problema = validar()
    if (problema) return setError(problema)

    setGuardando(true)
    setError('')
    const payload = {
      alcance: form.alcance,
      producto_id: form.alcance === 'producto' ? form.productoId : null,
      marca_id: form.alcance === 'marca' ? Number(form.marcaId) : null,
      alcance_valor: CAMPOS_TEXTO.includes(form.alcance) ? form.alcanceValor.trim() : null,
      tipo: form.tipo,
      valor: Number(form.valor),
      fecha_inicio: new Date(fechaInicio).toISOString(),
      fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
      activo: form.activo,
    }

    try {
      if (esEdicion) await staffApi.put(`/staff/descuentos/${descuento.id}`, payload)
      else await staffApi.post('/staff/descuentos', payload)
      onGuardado()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el descuento')
    } finally {
      setGuardando(false)
    }
  }

  const alcanceActual = ALCANCES.find((a) => a.valor === form.alcance)
  const listaTexto = {
    laboratorio: opciones.laboratorios,
    molecula: opciones.moleculas,
    linea: opciones.lineas,
    forma: opciones.formas,
  }[form.alcance] || []
  const idLista = `sdesc-opciones-${form.alcance}`
  const marcaSeleccionada = form.marcaId
    ? opciones.marcas.find((m) => String(m.id) === String(form.marcaId))
    : null

  return (
    <StaffModal
      titulo={esEdicion ? 'Editar descuento' : 'Nuevo descuento'}
      onCerrar={onCerrar}
      bloqueado={guardando}
    >
      <form className="sdesc-form" onSubmit={guardar}>
        {error && <div className="sdesc-form__error">{error}</div>}

        <div className="sdesc-form__campo">
          <label htmlFor="sdesc-alcance">¿A qué aplica?</label>
          <select
            id="sdesc-alcance"
            value={form.alcance}
            onChange={(e) => cambiarAlcance(e.target.value)}
            disabled={esEdicion}
          >
            {ALCANCES.map((a) => (
              <option key={a.valor} value={a.valor}>{a.icono} {a.label}</option>
            ))}
          </select>
          {esEdicion && <small className="sdesc-form__ayuda">El alcance no se puede cambiar al editar.</small>}
        </div>

        {form.alcance === 'producto' && (
          <div className="sdesc-form__campo">
            <label htmlFor="sdesc-producto">Producto *</label>
            {form.productoId ? (
              <div className="sdesc-form__elegido">
                <span>{form.productoLabel}</span>
                <button
                  type="button"
                  className="sdesc-btn sdesc-btn--ghost"
                  onClick={() => setForm({ ...form, productoId: null, productoLabel: '' })}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  id="sdesc-producto"
                  type="text"
                  autoComplete="off"
                  placeholder="Escribí al menos 2 letras…"
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                />
                {resultadosProducto.length > 0 && (
                  <ul className="sdesc-form__resultados">
                    {resultadosProducto.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => seleccionarProducto(p)}>
                          <strong>{p.nombre_comercial}</strong>
                          <small>{p.laboratorio || 'Sin laboratorio'}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {form.alcance === 'marca' && (
          <div className="sdesc-form__campo">
            <label htmlFor="sdesc-marca">Marca *</label>
            <select
              id="sdesc-marca"
              value={form.marcaId}
              onChange={(e) => {
                const m = opciones.marcas.find((x) => String(x.id) === e.target.value)
                setForm({ ...form, marcaId: e.target.value, marcaLabel: m?.nombre || '' })
              }}
            >
              <option value="">— Elegí una marca —</option>
              {opciones.marcas.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
            {marcaSeleccionada && <small className="sdesc-form__ayuda">Aplica a todos los productos de {marcaSeleccionada.nombre}.</small>}
          </div>
        )}

        {CAMPOS_TEXTO.includes(form.alcance) && (
          <div className="sdesc-form__campo">
            <label htmlFor="sdesc-valor-texto">{alcanceActual?.label} *</label>
            <input
              id="sdesc-valor-texto"
              type="text"
              autoComplete="off"
              list={idLista}
              placeholder={`Elegí o escribí el ${alcanceActual?.label.toLowerCase()}…`}
              value={form.alcanceValor}
              onChange={(e) => setForm({ ...form, alcanceValor: e.target.value })}
            />
            <datalist id={idLista}>
              {listaTexto.map((v) => <option key={v} value={v} />)}
            </datalist>
            <small className="sdesc-form__ayuda">
              Se compara por texto exacto con el campo del producto (podés escribir uno nuevo).
            </small>
          </div>
        )}

        <div className="sdesc-form__fila">
          <div className="sdesc-form__campo">
            <label htmlFor="sdesc-tipo">Tipo *</label>
            <select
              id="sdesc-tipo"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto">Monto fijo ($)</option>
            </select>
          </div>
          <div className="sdesc-form__campo">
            <label htmlFor="sdesc-valor">Valor *</label>
            <div className="sdesc-form__input-prefijo">
              <span>{form.tipo === 'porcentaje' ? '%' : '$'}</span>
              <input
                id="sdesc-valor"
                type="number"
                min="0"
                step="0.01"
                max={form.tipo === 'porcentaje' ? 100 : undefined}
                placeholder={form.tipo === 'porcentaje' ? '15' : '5.00'}
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="sdesc-form__fila">
          <div className="sdesc-form__campo">
            <label htmlFor="sdesc-inicio">Inicio *</label>
            <input
              id="sdesc-inicio"
              type="datetime-local"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="sdesc-form__campo">
            <label htmlFor="sdesc-fin">Fin (opcional)</label>
            <input
              id="sdesc-fin"
              type="datetime-local"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
            <div className="sdesc-form__rapidos">
              {[30, 60].map((dias) => (
                <button
                  key={dias}
                  type="button"
                  className="sdesc-btn sdesc-btn--chip"
                  onClick={() => setFechaFin(sumarDias(fechaInicio, dias))}
                >
                  +{dias} días
                </button>
              ))}
              {fechaFin && (
                <button
                  type="button"
                  className="sdesc-btn sdesc-btn--chip sdesc-btn--ghost"
                  onClick={() => setFechaFin('')}
                >
                  Quitar fin
                </button>
              )}
            </div>
            <small className="sdesc-form__ayuda">Los atajos se calculan desde la fecha de inicio.</small>
          </div>
        </div>

        <label className="sdesc-form__check">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => setForm({ ...form, activo: e.target.checked })}
          />
          <span>
            <strong>Descuento activo</strong>
            <small>Los inactivos no se aplican en el catálogo.</small>
          </span>
        </label>

        <div className="sdesc-form__acciones">
          <button type="button" className="sdesc-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="sdesc-btn sdesc-btn--principal" disabled={guardando}>
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear descuento'}
          </button>
        </div>
      </form>
    </StaffModal>
  )
}

// ---------------------------------------------------------------
// Página
// ---------------------------------------------------------------
function StaffDescuentos() {
  const { avisar, confirmar } = useStaffUI()
  const [searchParams] = useSearchParams()
  const [descuentos, setDescuentos] = useState([])
  const [opciones, setOpciones] = useState({ marcas: [], laboratorios: [], formas: [], lineas: [], moleculas: [] })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroAlcance, setFiltroAlcance] = useState('todos')
  const [formAbierto, setFormAbierto] = useState(() => searchParams.get('nuevo') === '1')
  const [editando, setEditando] = useState(null)

  function cargar() {
    setCargando(true)
    setError('')
    staffApi
      .get('/staff/descuentos')
      .then(({ data }) => setDescuentos(data || []))
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar los descuentos'))
      .finally(() => setCargando(false))
  }

  // Carga inicial. Va con `.then()` directo (no llama a `cargar()`, que hace
  // setState sincrónico y dispara react-hooks/set-state-in-effect).
  useEffect(() => {
    staffApi
      .get('/staff/descuentos')
      .then(({ data }) => setDescuentos(data || []))
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar los descuentos'))
      .finally(() => setCargando(false))
    staffApi
      .get('/staff/descuentos/opciones')
      .then(({ data }) => setOpciones({
        marcas: data.marcas || [],
        laboratorios: data.laboratorios || [],
        formas: data.formas || [],
        lineas: data.lineas || [],
        moleculas: data.moleculas || [],
      }))
      .catch(() => {})
  }, [])

  const estadisticas = useMemo(() => ({
    total: descuentos.length,
    vigentes: descuentos.filter((d) => d.estado === 'vigente').length,
    programados: descuentos.filter((d) => d.estado === 'programado').length,
    expirados: descuentos.filter((d) => d.estado === 'expirado').length,
  }), [descuentos])

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return descuentos.filter((d) => {
      if (filtroEstado !== 'todos' && d.estado !== filtroEstado) return false
      if (filtroAlcance !== 'todos' && d.alcance !== filtroAlcance) return false
      if (!texto) return true
      return etiquetaAlcance(d).toLowerCase().includes(texto)
    })
  }, [descuentos, filtroEstado, filtroAlcance, busqueda])

  async function eliminar(d) {
    const ok = await confirmar({
      titulo: `¿Eliminar el descuento de ${etiquetaAlcance(d)}?`,
      texto: 'Deja de aplicarse en el catálogo de inmediato. No se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    })
    if (!ok) return
    try {
      await staffApi.delete(`/staff/descuentos/${d.id}`)
      avisar('Descuento eliminado')
      cargar()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo eliminar el descuento', 'error')
    }
  }

  function abrirNuevo() {
    setEditando(null)
    setFormAbierto(true)
  }

  function abrirEdicion(d) {
    setEditando(d)
    setFormAbierto(true)
  }

  function cerrarForm() {
    setFormAbierto(false)
    setEditando(null)
  }

  function alGuardar() {
    avisar(editando ? 'Descuento actualizado' : 'Descuento creado')
    cerrarForm()
    cargar()
  }

  return (
    <LayoutDepartamento departamento="comercial" activo="descuentos" titulo="Descuentos">
      <div className="sdesc-page">
        <div className="sdesc-encabezado">
          <p className="sdesc-intro">
            Descuentos de campaña que se aplican solos en el catálogo y en el checkout.
            Si varios coinciden en un producto, gana el de mayor ahorro.
          </p>
          <button type="button" className="sdesc-btn sdesc-btn--principal" onClick={abrirNuevo}>
            <Plus size={16} /> Nuevo descuento
          </button>
        </div>

        <div className="sdesc-kpis">
          <div className="sdesc-kpi">
            <span className="sdesc-kpi__valor">{estadisticas.total}</span>
            <span className="sdesc-kpi__label">Total</span>
          </div>
          <div className="sdesc-kpi sdesc-kpi--vigente">
            <span className="sdesc-kpi__valor">{estadisticas.vigentes}</span>
            <span className="sdesc-kpi__label">Vigentes</span>
          </div>
          <div className="sdesc-kpi sdesc-kpi--programado">
            <span className="sdesc-kpi__valor">{estadisticas.programados}</span>
            <span className="sdesc-kpi__label">Programados</span>
          </div>
          <div className="sdesc-kpi sdesc-kpi--expirado">
            <span className="sdesc-kpi__valor">{estadisticas.expirados}</span>
            <span className="sdesc-kpi__label">Expirados</span>
          </div>
        </div>

        <div className="sdesc-filtros">
          <input
            type="search"
            placeholder="Buscar por producto, marca, laboratorio…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADO_CONFIG).map(([valor, cfg]) => (
              <option key={valor} value={valor}>{cfg.texto}</option>
            ))}
          </select>
          <select value={filtroAlcance} onChange={(e) => setFiltroAlcance(e.target.value)}>
            <option value="todos">Todos los alcances</option>
            {ALCANCES.map((a) => (
              <option key={a.valor} value={a.valor}>{a.label}</option>
            ))}
          </select>
        </div>

        {cargando && <StaffEstado tipo="cargando" filas={3} />}
        {!cargando && error && <StaffEstado tipo="error" mensaje={error} onReintentar={cargar} />}
        {!cargando && !error && filtrados.length === 0 && (
          <StaffEstado
            tipo="vacio"
            titulo={descuentos.length === 0 ? 'Todavía no hay descuentos' : 'Ningún descuento coincide'}
            mensaje={descuentos.length === 0
              ? 'Creá el primero para que se aplique en el catálogo.'
              : 'Probá con otro filtro o búsqueda.'}
          />
        )}

        {!cargando && !error && filtrados.length > 0 && (
          <div className="sdesc-grid">
            {filtrados.map((d) => {
              const estado = ESTADO_CONFIG[d.estado] || ESTADO_CONFIG.inactivo
              const alcance = ALCANCES.find((a) => a.valor === d.alcance)
              return (
                <article key={d.id} className={`sdesc-card sdesc-card--${estado.clase}`}>
                  <header className="sdesc-card__cab">
                    <span className={`sdesc-chip sdesc-chip--${estado.clase}`}>{estado.texto}</span>
                    <span className="sdesc-card__alcance">{alcance?.icono} {alcance?.label || d.alcance}</span>
                  </header>

                  <p className="sdesc-card__aplica">{etiquetaAlcance(d)}</p>
                  <p className="sdesc-card__valor">
                    {etiquetaValor(d)} <span>de descuento</span>
                  </p>
                  <p className="sdesc-card__fechas">
                    {formatearFecha(d.fecha_inicio)} → {d.fecha_fin ? formatearFecha(d.fecha_fin) : 'sin fin'}
                  </p>

                  <footer className="sdesc-card__acciones">
                    <button type="button" className="sdesc-btn" onClick={() => abrirEdicion(d)}>
                      <Pencil size={14} /> Editar
                    </button>
                    <button type="button" className="sdesc-btn sdesc-btn--danger" onClick={() => eliminar(d)}>
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </footer>
                </article>
              )
            })}
          </div>
        )}

        {!cargando && !error && descuentos.length > 0 && (
          <p className="sdesc-pie">
            <Tag size={13} /> Mostrando {filtrados.length} de {descuentos.length} descuentos.
          </p>
        )}
      </div>

      {formAbierto && (
        <FormDescuento
          descuento={editando}
          opciones={opciones}
          onGuardado={alGuardar}
          onCerrar={cerrarForm}
        />
      )}
    </LayoutDepartamento>
  )
}

export default StaffDescuentos
