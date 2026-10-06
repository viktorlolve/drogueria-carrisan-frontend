import { useState, useEffect } from 'react'
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

// Mismo valor 'envio_nacional' que usa el resto de la plataforma para
// tipo_envio en órdenes (MisOrdenes, OrdenDetalleModal) — así el tab,
// el fetch y el guardado quedan consistentes entre sí y con el resto del código.
const TIPOS = [
  { id: 'delivery', label: 'Delivery', icono: '🛵', descripcion: 'Entregas dentro de Valencia y alrededores' },
  { id: 'envio_nacional', label: 'Envío nacional', icono: '📦', descripcion: 'Envíos al resto del país por agencia' },
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

function IconoEditar() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M11.3 2.3a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4L5.4 13H2.7a.5.5 0 0 1-.5-.5v-2.7l9.1-9.1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

function IconoEliminar() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M12.5 4.5 12 13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L3.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconoCerrar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function DireccionCardSkeleton() {
  return (
    <div className="direccion-card direccion-card--skeleton">
      <div className="skel-line skel-line--sm" />
      <div className="skel-line skel-line--md" />
      <div className="skel-line skel-line--sm" />
    </div>
  )
}

function Direcciones() {
  const { user } = useAuth()
  const esInstitucional = user?.tipo_usuario === 'institucional'
  const [direccionesDelivery, setDireccionesDelivery] = useState([])
  const [direccionesNacional, setDireccionesNacional] = useState([])
  const [tabActiva, setTabActiva] = useState('delivery')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [formData, setFormData] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null) // { tipo: 'exito' | 'error', texto }
  const [cargando, setCargando] = useState(true)

  // Horario de recepción (solo clientes institucionales)
  const [horario, setHorario] = useState(null)
  const [perfilCargado, setPerfilCargado] = useState(false)
  const [horarioGuardando, setHorarioGuardando] = useState(false)
  const [horarioMensaje, setHorarioMensaje] = useState(null)

  useEffect(() => {
    cargarTodas()
    if (esInstitucional) cargarPerfil()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarPerfil() {
    try {
      const { data } = await api.get('/perfil')
      setHorario(data?.horario_recepcion || null)
    } catch (err) {
      console.error('Error cargando perfil:', err)
      setHorarioMensaje({ tipo: 'error', texto: 'No se pudo cargar tu horario de recepción' })
    } finally {
      setPerfilCargado(true)
    }
  }

  async function guardarHorario() {
    if (!esInstitucional || !horario) return
    setHorarioGuardando(true)
    setHorarioMensaje(null)
    try {
      await api.patch('/perfil/horario', { horario_recepcion: horario })
      setHorarioMensaje({ tipo: 'exito', texto: 'Horario de recepción guardado' })
      setTimeout(() => setHorarioMensaje(null), 3000)
    } catch (err) {
      setHorarioMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al guardar el horario' })
      console.error(err)
    } finally {
      setHorarioGuardando(false)
    }
  }

  async function cargarTodas() {
    setCargando(true)
    await Promise.all([cargarDirecciones('delivery'), cargarDirecciones('envio_nacional')])
    setCargando(false)
  }

  async function cargarDirecciones(tipo) {
    try {
      const { data } = await api.get(`/direcciones?tipo=${tipo}`)
      if (tipo === 'delivery') setDireccionesDelivery(data)
      else setDireccionesNacional(data)
    } catch (err) {
      console.error('Error cargando direcciones:', err)
    }
  }

  const direccionesActuales = tabActiva === 'delivery' ? direccionesDelivery : direccionesNacional
  const tipoActivo = TIPOS.find((t) => t.id === tabActiva)

  function handleAgregar() {
    setEditandoId(null)
    setFormData({
      ...FORM_VACIO,
      estado: tabActiva === 'delivery' ? ESTADO_DELIVERY : '',
    })
    setMostrarForm(true)
  }

  function handleEditar(direccion) {
    setEditandoId(direccion.id)
    setFormData({
      nombre: direccion.nombre || '',
      direccion: direccion.direccion || '',
      ciudad: direccion.ciudad || '',
      estado: direccion.estado || ESTADO_DELIVERY,
      telefono_contacto: direccion.telefono_contacto || '',
      referencia: direccion.referencia || '',
      agencia_preferida: direccion.agencia_preferida || '',
    })
    setMostrarForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.nombre || !formData.direccion) {
      setMensaje({ tipo: 'error', texto: 'Nombre y dirección son requeridos' })
      return
    }
    if (tabActiva === 'delivery' && !formData.ciudad) {
      setMensaje({ tipo: 'error', texto: 'Debes seleccionar una ciudad' })
      return
    }

    setGuardando(true)
    setMensaje(null)

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
      if (editandoId) {
        await api.put(`/direcciones/${editandoId}`, datos)
      } else {
        await api.post('/direcciones', datos)
      }

      setMostrarForm(false)
      setMensaje({ tipo: 'exito', texto: 'Dirección guardada exitosamente' })
      await cargarDirecciones(tabActiva)
      setTimeout(() => setMensaje(null), 3000)
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar la dirección' })
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Estás seguro de eliminar esta dirección?')) return
    try {
      await api.delete(`/direcciones/${id}`)
      setMensaje({ tipo: 'exito', texto: 'Dirección eliminada' })
      await cargarDirecciones(tabActiva)
      setTimeout(() => setMensaje(null), 3000)
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar la dirección' })
      console.error(err)
    }
  }

  function handleChangeTab(tab) {
    setTabActiva(tab)
    setMostrarForm(false)
    setEditandoId(null)
  }

  return (
    <LayoutPaginaPrincipal
      activo="direcciones"
      titulo="Mis Direcciones"
      subtitulo="Gestiona tus direcciones de entrega para delivery y envío nacional"
      nav={NAV_UNIFICADO}
    >
      <div className="direcciones-contenido">
        {mensaje && (
            <div className={`direccion-mensaje direccion-mensaje--${mensaje.tipo}`}>
              {mensaje.texto}
            </div>
          )}

          <div className="direcciones-tabs">
            {TIPOS.map((tipo) => (
              <button
                key={tipo.id}
                type="button"
                className={`direccion-tab ${tabActiva === tipo.id ? 'direccion-tab--activo' : ''}`}
                onClick={() => handleChangeTab(tipo.id)}
              >
                <span>{tipo.icono}</span> {tipo.label}
                <span className="direccion-tab__count">
                  {tipo.id === 'delivery' ? direccionesDelivery.length : direccionesNacional.length}
                </span>
              </button>
            ))}
            {esInstitucional && (
              <button
                type="button"
                className={`direccion-tab ${tabActiva === 'horario' ? 'direccion-tab--activo' : ''}`}
                onClick={() => handleChangeTab('horario')}
              >
                <span>🕐</span> Horario de recepción
              </button>
            )}
          </div>

          {tabActiva === 'horario' ? (
            <p className="direcciones-descripcion">
              Los días y horas en que tu sede recibe los pedidos. El equipo de despacho lo consulta antes de salir a entregar.
            </p>
          ) : (
            <p className="direcciones-descripcion">{tipoActivo?.descripcion}</p>
          )}

          {tabActiva === 'horario' ? (
            <div className="direcciones-horario">
              {!perfilCargado ? (
                <div className="direcciones-vacio">
                  <p>Cargando tu horario…</p>
                </div>
              ) : (
                <>
                  {horarioMensaje && (
                    <div className={`direccion-mensaje direccion-mensaje--${horarioMensaje.tipo}`}>
                      {horarioMensaje.texto}
                    </div>
                  )}

                  {resumirHorario(horario).length > 0 && (
                    <div className="direcciones-horario__preview">
                      <strong>Horario actual</strong>
                      {resumirHorario(horario).map((linea) => (
                        <span key={linea}>{linea}</span>
                      ))}
                    </div>
                  )}

                  <SelectorHorarioSemanal
                    key={perfilCargado ? 'cargado' : 'vacio'}
                    value={horario}
                    onChange={setHorario}
                  />

                  <button
                    type="button"
                    className="btn btn--primario direcciones-horario__guardar"
                    onClick={guardarHorario}
                    disabled={horarioGuardando}
                  >
                    {horarioGuardando ? 'Guardando…' : 'Guardar horario'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="direcciones-lista">
                {cargando ? (
                  Array.from({ length: 2 }).map((_, i) => <DireccionCardSkeleton key={i} />)
                ) : direccionesActuales.length === 0 ? (
                  <div className="direcciones-vacio">
                    <span className="direcciones-vacio__icon">📍</span>
                    <p>No tienes direcciones de {tabActiva === 'delivery' ? 'delivery' : 'envío nacional'} guardadas</p>
                  </div>
                ) : (
                  direccionesActuales.map((dir) => (
                    <div key={dir.id} className="direccion-card">
                      <div className="direccion-card__info">
                        <h3 className="direccion-card__nombre">{dir.nombre}</h3>
                        <p className="direccion-card__direccion">{dir.direccion}</p>
                        <div className="direccion-card__meta">
                          {dir.ciudad && <span>📍 {dir.ciudad}, {dir.estado}</span>}
                          {dir.telefono_contacto && <span>📞 {dir.telefono_contacto}</span>}
                          {dir.agencia_preferida && <span>🚚 {dir.agencia_preferida}</span>}
                        </div>
                        {dir.referencia && <p className="direccion-card__referencia">📝 {dir.referencia}</p>}
                      </div>
                      <div className="direccion-card__acciones">
                        <button onClick={() => handleEditar(dir)} className="direccion-card__accion" aria-label="Editar dirección">
                          <IconoEditar />
                        </button>
                        <button onClick={() => handleEliminar(dir.id)} className="direccion-card__accion direccion-card__accion--eliminar" aria-label="Eliminar dirección">
                          <IconoEliminar />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {!mostrarForm && !cargando && (
                <button onClick={handleAgregar} className="direcciones-agregar-btn">
                  + Agregar dirección de {tabActiva === 'delivery' ? 'delivery' : 'envío nacional'}
                </button>
              )}
            </>
          )}
        </div>

      {mostrarForm && (
        <div className="direccion-overlay" onClick={() => setMostrarForm(false)}>
          <form className="direccion-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <div className="direccion-modal__header">
              <h3>{editandoId ? 'Editar' : 'Nueva'} dirección</h3>
              <button type="button" onClick={() => setMostrarForm(false)} className="direccion-modal__close">
                <IconoCerrar />
              </button>
            </div>

            <div className="direccion-modal__cuerpo">
              <div className="direccion-campo">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Casa, Oficina, Consultorio"
                  required
                />
              </div>

              <div className="direccion-campo">
                <label>Dirección *</label>
                <textarea
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Calle, número, urbanización, etc."
                  required
                  rows="2"
                />
              </div>

              <div className="direccion-campo__fila">
                <div className="direccion-campo">
                  <label>Ciudad {tabActiva === 'delivery' && '*'}</label>
                  {tabActiva === 'delivery' ? (
                    <select
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      required
                    >
                      <option value="" disabled>Selecciona una ciudad</option>
                      {CIUDADES_DELIVERY.map((ciudad) => (
                        <option key={ciudad} value={ciudad}>{ciudad}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      placeholder="Ciudad"
                    />
                  )}
                </div>

                <div className="direccion-campo">
                  <label>Estado</label>
                  {tabActiva === 'delivery' ? (
                    <input type="text" value={ESTADO_DELIVERY} disabled className="direccion-campo--disabled" />
                  ) : (
                    <input
                      type="text"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      placeholder="Estado"
                    />
                  )}
                </div>
              </div>

              <div className="direccion-campo">
                <label>Teléfono de contacto</label>
                <input
                  type="text"
                  value={formData.telefono_contacto}
                  onChange={(e) => setFormData({ ...formData, telefono_contacto: e.target.value })}
                  placeholder="+58 212-555-1234"
                />
              </div>

              <div className="direccion-campo">
                <label>Referencia</label>
                <input
                  type="text"
                  value={formData.referencia}
                  onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                  placeholder="Punto de referencia, color de casa, etc."
                />
              </div>

              {tabActiva === 'envio_nacional' && (
                <div className="direccion-campo">
                  <label>Agencia de envío preferida</label>
                  <select
                    value={formData.agencia_preferida}
                    onChange={(e) => setFormData({ ...formData, agencia_preferida: e.target.value })}
                  >
                    <option value="">Seleccionar agencia</option>
                    {AGENCIAS_ENVIO.map((agencia) => (
                      <option key={agencia} value={agencia}>{agencia}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="direccion-modal__pie">
              <button type="button" onClick={() => setMostrarForm(false)} className="btn btn--secundario">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="btn btn--primario">
                {guardando ? 'Guardando…' : editandoId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </LayoutPaginaPrincipal>
  )
}

export default Direcciones
