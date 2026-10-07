import { useState, useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  StickyNote,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import SelectorHorarioSemanal from '../components/registro/SelectorHorarioSemanal'
import { resumirHorario } from '../utils/horario'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import './Direcciones.css'

const CIUDADES_DELIVERY = ['Valencia', 'Naguanagua', 'San Diego', 'Guacara', 'Los Guayos']
const ESTADO_DELIVERY = 'Carabobo'
const AGENCIAS_ENVIO = ['MRW', 'Domesa', 'Tealca', 'Zoom', 'Servientrega', 'Otro']
const SUGERENCIAS_NOMBRE = ['Farmacia', 'Consultorio', 'Oficina', 'Depósito', 'Casa']

// Mismo valor 'envio_nacional' que usa el resto de la plataforma para
// tipo_envio en órdenes (MisOrdenes, OrdenDetalleModal) — así el tab,
// el fetch y el guardado quedan consistentes entre sí y con el resto del código.
const TIPOS = [
  {
    id: 'delivery',
    label: 'Delivery',
    Icono: Bike,
    descripcion: 'Entregas dentro de Valencia y alrededores',
    vacio: 'delivery',
  },
  {
    id: 'envio_nacional',
    label: 'Envío nacional',
    Icono: Package,
    descripcion: 'Envíos al resto del país por agencia',
    vacio: 'envío nacional',
  },
]

const FORM_VACIO = {
  nombre: '',
  direccion: '',
  ciudad: '',
  estado: ESTADO_DELIVERY,
  telefono_contacto: '',
  referencia: '',
  agencia_preferida: '',
}

function urlMapa(dir) {
  const consulta = [dir.direccion, dir.ciudad, dir.estado, 'Venezuela'].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`
}

// ---------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------
function TarjetaSkeleton() {
  return (
    <div className="dir-card dir-card--skeleton" aria-hidden="true">
      <div className="dir-skel dir-skel--icono" />
      <div className="dir-skel-col">
        <div className="dir-skel dir-skel--sm" />
        <div className="dir-skel dir-skel--lg" />
        <div className="dir-skel dir-skel--md" />
      </div>
    </div>
  )
}

function Toast({ mensaje, onCerrar }) {
  if (!mensaje) return null
  const esError = mensaje.tipo === 'error'
  return createPortal(
    <div className="dir-portal">
      <div
        className={`dir-toast dir-toast--${mensaje.tipo}`}
        role={esError ? 'alert' : 'status'}
      >
        {esError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
        <span>{mensaje.texto}</span>
        <button type="button" className="dir-toast__cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  )
}

// Bloquea el scroll del fondo y cierra con Escape mientras un modal está abierto
function useModal(onEscape) {
  const escapeRef = useRef(onEscape)
  useEffect(() => {
    escapeRef.current = onEscape
  })

  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) {
      if (e.key === 'Escape') escapeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previo
      document.removeEventListener('keydown', onKey)
    }
  }, [])
}

function GrupoChips({ opciones, valor, onChange, etiqueta, permitirQuitar = false }) {
  return (
    <div className="dir-chips" role="radiogroup" aria-label={etiqueta}>
      {opciones.map((op) => {
        const activo = valor === op
        return (
          <button
            key={op}
            type="button"
            role="radio"
            aria-checked={activo}
            className={`dir-chip ${activo ? 'dir-chip--activo' : ''}`}
            onClick={() => onChange(permitirQuitar && activo ? '' : op)}
          >
            {op}
          </button>
        )
      })}
    </div>
  )
}

function FormularioDireccion({ tipo, inicial, editando, guardando, onCancelar, onGuardar }) {
  const esDelivery = tipo === 'delivery'
  const uid = useId()
  const [datos, setDatos] = useState(inicial)
  const [errores, setErrores] = useState({})
  const primerCampo = useRef(null)

  const sucio = JSON.stringify(datos) !== JSON.stringify(inicial)

  useModal(onCancelar)
  useEffect(() => {
    primerCampo.current?.focus()
  }, [])

  function cambiar(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }))
  }

  function enviar(e) {
    e.preventDefault()
    const nuevos = {}
    if (!datos.nombre.trim()) nuevos.nombre = 'Ponle un nombre para reconocerla'
    if (!datos.direccion.trim()) nuevos.direccion = 'Escribe la dirección'
    if (esDelivery && !datos.ciudad) nuevos.ciudad = 'Selecciona una ciudad'
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return
    onGuardar(datos)
  }

  return createPortal(
    <div className="dir-portal">
      <div
        className="dir-overlay"
        onClick={() => { if (!sucio) onCancelar() }}
      >
        <form
          className="dir-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${uid}-titulo`}
          onClick={(e) => e.stopPropagation()}
          onSubmit={enviar}
          noValidate
        >
          <div className="dir-modal__header">
            <div>
              <h2 id={`${uid}-titulo`} className="dir-modal__titulo">
                {editando ? 'Editar dirección' : 'Nueva dirección'}
              </h2>
              <p className="dir-modal__sub">
                {esDelivery ? 'Delivery en Valencia y alrededores' : 'Envío nacional por agencia'}
              </p>
            </div>
            <button type="button" className="dir-modal__cerrar" onClick={onCancelar} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          <div className="dir-modal__cuerpo">
            <div className="dir-campo">
              <label htmlFor={`${uid}-nombre`}>Nombre *</label>
              <input
                id={`${uid}-nombre`}
                ref={primerCampo}
                type="text"
                value={datos.nombre}
                onChange={(e) => cambiar('nombre', e.target.value)}
                placeholder="Ej: Farmacia Centro, Consultorio"
                aria-invalid={!!errores.nombre}
                className={errores.nombre ? 'dir-input--error' : ''}
              />
              {errores.nombre && <span className="dir-campo__error">{errores.nombre}</span>}
              {!editando && (
                <div className="dir-sugerencias" aria-label="Sugerencias de nombre">
                  {SUGERENCIAS_NOMBRE.map((s) => (
                    <button key={s} type="button" className="dir-sugerencia" onClick={() => cambiar('nombre', s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="dir-campo">
              <label htmlFor={`${uid}-direccion`}>Dirección *</label>
              <textarea
                id={`${uid}-direccion`}
                value={datos.direccion}
                onChange={(e) => cambiar('direccion', e.target.value)}
                placeholder="Calle, número, urbanización, edificio…"
                rows="2"
                aria-invalid={!!errores.direccion}
                className={errores.direccion ? 'dir-input--error' : ''}
              />
              {errores.direccion && <span className="dir-campo__error">{errores.direccion}</span>}
            </div>

            {esDelivery ? (
              <div className="dir-campo">
                <span className="dir-campo__label" id={`${uid}-ciudad`}>Ciudad *</span>
                <GrupoChips
                  opciones={CIUDADES_DELIVERY}
                  valor={datos.ciudad}
                  onChange={(v) => cambiar('ciudad', v)}
                  etiqueta="Ciudad"
                />
                {errores.ciudad && <span className="dir-campo__error">{errores.ciudad}</span>}
                <span className="dir-campo__ayuda">Estado: {ESTADO_DELIVERY}</span>
              </div>
            ) : (
              <div className="dir-campo__fila">
                <div className="dir-campo">
                  <label htmlFor={`${uid}-ciudad`}>Ciudad</label>
                  <input
                    id={`${uid}-ciudad`}
                    type="text"
                    value={datos.ciudad}
                    onChange={(e) => cambiar('ciudad', e.target.value)}
                    placeholder="Ciudad"
                  />
                </div>
                <div className="dir-campo">
                  <label htmlFor={`${uid}-estado`}>Estado</label>
                  <input
                    id={`${uid}-estado`}
                    type="text"
                    value={datos.estado}
                    onChange={(e) => cambiar('estado', e.target.value)}
                    placeholder="Estado"
                  />
                </div>
              </div>
            )}

            <div className="dir-campo">
              <label htmlFor={`${uid}-tel`}>Teléfono de contacto</label>
              <input
                id={`${uid}-tel`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={datos.telefono_contacto}
                onChange={(e) => cambiar('telefono_contacto', e.target.value)}
                placeholder="0414-1234567"
              />
              <span className="dir-campo__ayuda">Quien recibe el pedido o coordina la entrega</span>
            </div>

            <div className="dir-campo">
              <label htmlFor={`${uid}-ref`}>Punto de referencia</label>
              <input
                id={`${uid}-ref`}
                type="text"
                value={datos.referencia}
                onChange={(e) => cambiar('referencia', e.target.value)}
                placeholder="Frente a la plaza, portón negro, piso 2…"
              />
            </div>

            {!esDelivery && (
              <div className="dir-campo">
                <span className="dir-campo__label">Agencia de envío preferida</span>
                <GrupoChips
                  opciones={AGENCIAS_ENVIO}
                  valor={datos.agencia_preferida}
                  onChange={(v) => cambiar('agencia_preferida', v)}
                  etiqueta="Agencia de envío preferida"
                  permitirQuitar
                />
              </div>
            )}
          </div>

          <div className="dir-modal__pie">
            <button type="button" className="dir-btn dir-btn--secundario" onClick={onCancelar} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" className="dir-btn dir-btn--primario" disabled={guardando}>
              {guardando ? (
                <><span className="dir-spinner" aria-hidden="true" /> Guardando…</>
              ) : editando ? 'Actualizar' : 'Guardar dirección'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function ConfirmarEliminar({ direccion, eliminando, onCancelar, onConfirmar }) {
  const uid = useId()
  useModal(onCancelar)

  return createPortal(
    <div className="dir-portal">
      <div className="dir-overlay dir-overlay--centrado" onClick={onCancelar}>
        <div
          className="dir-confirmar"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`${uid}-t`}
          aria-describedby={`${uid}-d`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="dir-confirmar__icono"><Trash2 size={24} /></div>
          <h2 id={`${uid}-t`} className="dir-confirmar__titulo">¿Eliminar esta dirección?</h2>
          <p id={`${uid}-d`} className="dir-confirmar__texto">
            Se eliminará <strong>{direccion.nombre}</strong> de tus direcciones guardadas. Esta acción no se puede deshacer.
          </p>
          <div className="dir-confirmar__acciones">
            <button type="button" className="dir-btn dir-btn--secundario" onClick={onCancelar} disabled={eliminando}>
              Cancelar
            </button>
            <button type="button" className="dir-btn dir-btn--peligro" onClick={onConfirmar} disabled={eliminando}>
              {eliminando ? (
                <><span className="dir-spinner" aria-hidden="true" /> Eliminando…</>
              ) : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function TarjetaDireccion({ dir, Icono, onEditar, onEliminar }) {
  return (
    <article className="dir-card">
      <span className="dir-card__icono"><Icono size={20} /></span>

      <div className="dir-card__cuerpo">
        <div className="dir-card__cab">
          <h3 className="dir-card__nombre">{dir.nombre}</h3>
          {dir.ciudad && (
            <span className="dir-card__ciudad">
              <MapPin size={12} /> {dir.ciudad}{dir.estado ? `, ${dir.estado}` : ''}
            </span>
          )}
        </div>

        <p className="dir-card__direccion">{dir.direccion}</p>

        {(dir.telefono_contacto || dir.agencia_preferida) && (
          <ul className="dir-card__datos">
            {dir.telefono_contacto && (
              <li><Phone size={14} /> {dir.telefono_contacto}</li>
            )}
            {dir.agencia_preferida && (
              <li><Truck size={14} /> {dir.agencia_preferida}</li>
            )}
          </ul>
        )}

        {dir.referencia && (
          <p className="dir-card__referencia">
            <StickyNote size={14} /> <span>{dir.referencia}</span>
          </p>
        )}

        <div className="dir-card__pie">
          <a className="dir-link" href={urlMapa(dir)} target="_blank" rel="noopener noreferrer">
            Ver en el mapa <ExternalLink size={13} />
          </a>
          <div className="dir-card__acciones">
            <button type="button" className="dir-accion" onClick={() => onEditar(dir)} aria-label={`Editar ${dir.nombre}`}>
              <Pencil size={15} /> <span>Editar</span>
            </button>
            <button type="button" className="dir-accion dir-accion--peligro" onClick={() => onEliminar(dir)} aria-label={`Eliminar ${dir.nombre}`}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------
// Página
// ---------------------------------------------------------------
function Direcciones() {
  const { user } = useAuth()
  const esInstitucional = user?.tipo_usuario === 'institucional'

  const [direccionesDelivery, setDireccionesDelivery] = useState([])
  const [direccionesNacional, setDireccionesNacional] = useState([])
  const [tabActiva, setTabActiva] = useState('delivery')
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [intento, setIntento] = useState(0)

  // Formulario / eliminación
  const [formulario, setFormulario] = useState(null) // { editandoId, inicial }
  const [guardando, setGuardando] = useState(false)
  const [porEliminar, setPorEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const [mensaje, setMensaje] = useState(null) // { tipo: 'exito' | 'error', texto }
  const timerMensaje = useRef(null)

  // Horario de recepción (solo clientes institucionales)
  const [horario, setHorario] = useState(null)
  const [perfilCargado, setPerfilCargado] = useState(false)
  const [horarioGuardando, setHorarioGuardando] = useState(false)

  function mostrarMensaje(tipo, texto) {
    clearTimeout(timerMensaje.current)
    setMensaje({ tipo, texto })
    timerMensaje.current = setTimeout(() => setMensaje(null), tipo === 'exito' ? 3000 : 5000)
  }

  useEffect(() => () => clearTimeout(timerMensaje.current), [])

  // Carga inicial (y reintentos) de las dos listas
  useEffect(() => {
    let cancelado = false

    async function cargar() {
      try {
        const [delivery, nacional] = await Promise.all([
          api.get('/direcciones?tipo=delivery'),
          api.get('/direcciones?tipo=envio_nacional'),
        ])
        if (cancelado) return
        setDireccionesDelivery(delivery.data)
        setDireccionesNacional(nacional.data)
      } catch (err) {
        console.error('Error cargando direcciones:', err)
        if (!cancelado) setErrorCarga(true)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [intento])

  // Perfil (horario de recepción)
  useEffect(() => {
    if (!esInstitucional) return
    let cancelado = false

    async function cargarPerfil() {
      try {
        const { data } = await api.get('/perfil')
        if (!cancelado) setHorario(data?.horario_recepcion || null)
      } catch (err) {
        console.error('Error cargando perfil:', err)
        if (!cancelado) mostrarMensaje('error', 'No se pudo cargar tu horario de recepción')
      } finally {
        if (!cancelado) setPerfilCargado(true)
      }
    }

    cargarPerfil()
    return () => { cancelado = true }
  }, [esInstitucional])

  function reintentar() {
    setErrorCarga(false)
    setCargando(true)
    setIntento((n) => n + 1)
  }

  async function recargarDirecciones(tipo) {
    try {
      const { data } = await api.get(`/direcciones?tipo=${tipo}`)
      if (tipo === 'delivery') setDireccionesDelivery(data)
      else setDireccionesNacional(data)
    } catch (err) {
      console.error('Error cargando direcciones:', err)
    }
  }

  async function guardarHorario() {
    if (!esInstitucional || !horario) return
    setHorarioGuardando(true)
    try {
      await api.patch('/perfil/horario', { horario_recepcion: horario })
      mostrarMensaje('exito', 'Horario de recepción guardado')
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al guardar el horario')
      console.error(err)
    } finally {
      setHorarioGuardando(false)
    }
  }

  const direccionesActuales = tabActiva === 'delivery' ? direccionesDelivery : direccionesNacional
  const tipoActivo = TIPOS.find((t) => t.id === tabActiva)
  const esTabDirecciones = tabActiva !== 'horario'

  function handleAgregar() {
    setFormulario({
      editandoId: null,
      inicial: { ...FORM_VACIO, estado: tabActiva === 'delivery' ? ESTADO_DELIVERY : '' },
    })
  }

  function handleEditar(direccion) {
    setFormulario({
      editandoId: direccion.id,
      inicial: {
        nombre: direccion.nombre || '',
        direccion: direccion.direccion || '',
        ciudad: direccion.ciudad || '',
        // Delivery siempre es Carabobo; en envío nacional se respeta lo guardado
        estado: direccion.estado || (tabActiva === 'delivery' ? ESTADO_DELIVERY : ''),
        telefono_contacto: direccion.telefono_contacto || '',
        referencia: direccion.referencia || '',
        agencia_preferida: direccion.agencia_preferida || '',
      },
    })
  }

  async function handleGuardar(formData) {
    setGuardando(true)
    try {
      const datos = {
        ...formData,
        tipo_direccion: tabActiva,
        estado: tabActiva === 'delivery' ? ESTADO_DELIVERY : formData.estado,
      }

      // OJO: el componente original que enviaste siempre hacía POST, incluso
      // editando — así que "editar" en realidad creaba una dirección duplicada
      // en vez de actualizar. Acá sí distingue crear vs actualizar; confirma
      // que tu backend tenga PUT /direcciones/:id (mismo patrón que el DELETE).
      if (formulario.editandoId) {
        await api.put(`/direcciones/${formulario.editandoId}`, datos)
      } else {
        await api.post('/direcciones', datos)
      }

      setFormulario(null)
      mostrarMensaje('exito', formulario.editandoId ? 'Dirección actualizada' : 'Dirección guardada exitosamente')
      await recargarDirecciones(tabActiva)
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.error || 'Error al guardar la dirección')
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  async function handleConfirmarEliminar() {
    if (!porEliminar) return
    setEliminando(true)
    try {
      await api.delete(`/direcciones/${porEliminar.id}`)
      setPorEliminar(null)
      mostrarMensaje('exito', 'Dirección eliminada')
      await recargarDirecciones(tabActiva)
    } catch (err) {
      mostrarMensaje('error', 'Error al eliminar la dirección')
      console.error(err)
    } finally {
      setEliminando(false)
    }
  }

  function handleChangeTab(tab) {
    setTabActiva(tab)
    setFormulario(null)
  }

  const botonAgregar =
    esTabDirecciones && !cargando && !errorCarga ? (
      <button type="button" className="dir-btn dir-btn--primario" onClick={handleAgregar}>
        <Plus size={16} /> Agregar dirección
      </button>
    ) : null

  return (
    <LayoutPaginaPrincipal
      activo="direcciones"
      titulo="Mis Direcciones"
      subtitulo="Gestiona tus direcciones de entrega para delivery y envío nacional"
      acciones={botonAgregar}
      nav={NAV_UNIFICADO}
    >
      <div className="dir-root">
        {/* Tabs */}
        <div className="dir-tabs" role="tablist" aria-label="Tipo de dirección">
          {TIPOS.map(({ id, label, Icono }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tabActiva === id}
              className={`dir-tab ${tabActiva === id ? 'dir-tab--activo' : ''}`}
              onClick={() => handleChangeTab(id)}
            >
              <Icono size={16} />
              <span>{label}</span>
              <span className="dir-tab__count">
                {id === 'delivery' ? direccionesDelivery.length : direccionesNacional.length}
              </span>
            </button>
          ))}
          {esInstitucional && (
            <button
              type="button"
              role="tab"
              aria-selected={tabActiva === 'horario'}
              className={`dir-tab ${tabActiva === 'horario' ? 'dir-tab--activo' : ''}`}
              onClick={() => handleChangeTab('horario')}
            >
              <Clock size={16} />
              <span>Horario de recepción</span>
            </button>
          )}
        </div>

        {/* Contexto del tab */}
        {tabActiva === 'horario' ? (
          <p className="dir-descripcion">
            Los días y horas en que tu sede recibe los pedidos. El equipo de despacho lo consulta antes de salir a entregar.
          </p>
        ) : (
          <div className="dir-contexto">
            <p className="dir-descripcion">{tipoActivo?.descripcion}</p>
            {tabActiva === 'delivery' && (
              <div className="dir-cobertura">
                <span className="dir-cobertura__label">Cobertura</span>
                {CIUDADES_DELIVERY.map((c) => (
                  <span key={c} className="dir-cobertura__chip">{c}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contenido */}
        {tabActiva === 'horario' ? (
          <section className="dir-horario">
            {!perfilCargado ? (
              <div className="dir-skel dir-skel--horario" aria-busy="true" />
            ) : (
              <>
                {resumirHorario(horario).length > 0 && (
                  <div className="dir-horario__actual">
                    <strong>Horario actual</strong>
                    <div className="dir-horario__lineas">
                      {resumirHorario(horario).map((linea) => (
                        <span key={linea}>{linea}</span>
                      ))}
                    </div>
                  </div>
                )}

                <SelectorHorarioSemanal
                  key={perfilCargado ? 'cargado' : 'vacio'}
                  value={horario}
                  onChange={setHorario}
                />

                <button
                  type="button"
                  className="dir-btn dir-btn--primario dir-horario__guardar"
                  onClick={guardarHorario}
                  disabled={horarioGuardando}
                >
                  {horarioGuardando ? (
                    <><span className="dir-spinner" aria-hidden="true" /> Guardando…</>
                  ) : 'Guardar horario'}
                </button>
              </>
            )}
          </section>
        ) : cargando ? (
          <div className="dir-lista" aria-busy="true">
            <TarjetaSkeleton />
            <TarjetaSkeleton />
          </div>
        ) : errorCarga ? (
          <div className="dir-estado">
            <span className="dir-estado__icono dir-estado__icono--error"><AlertCircle size={28} /></span>
            <h2>No pudimos cargar tus direcciones</h2>
            <p>Revisa tu conexión e inténtalo de nuevo.</p>
            <button type="button" className="dir-btn dir-btn--primario" onClick={reintentar}>
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        ) : direccionesActuales.length === 0 ? (
          <div className="dir-estado">
            <span className="dir-estado__icono"><MapPin size={28} /></span>
            <h2>Aún no tienes direcciones de {tipoActivo?.vacio}</h2>
            <p>Guarda una para elegirla en un toque al hacer tus pedidos.</p>
            <button type="button" className="dir-btn dir-btn--primario" onClick={handleAgregar}>
              <Plus size={16} /> Agregar dirección
            </button>
          </div>
        ) : (
          <div className="dir-lista">
            {direccionesActuales.map((dir) => (
              <TarjetaDireccion
                key={dir.id}
                dir={dir}
                Icono={tipoActivo.Icono}
                onEditar={handleEditar}
                onEliminar={setPorEliminar}
              />
            ))}
            <button type="button" className="dir-agregar" onClick={handleAgregar}>
              <span className="dir-agregar__icono"><Plus size={20} /></span>
              <span>Agregar otra dirección</span>
            </button>
          </div>
        )}
      </div>

      {formulario && (
        <FormularioDireccion
          tipo={tabActiva}
          inicial={formulario.inicial}
          editando={!!formulario.editandoId}
          guardando={guardando}
          onCancelar={() => { if (!guardando) setFormulario(null) }}
          onGuardar={handleGuardar}
        />
      )}

      {porEliminar && (
        <ConfirmarEliminar
          direccion={porEliminar}
          eliminando={eliminando}
          onCancelar={() => { if (!eliminando) setPorEliminar(null) }}
          onConfirmar={handleConfirmarEliminar}
        />
      )}

      <Toast mensaje={mensaje} onCerrar={() => setMensaje(null)} />
    </LayoutPaginaPrincipal>
  )
}

export default Direcciones
