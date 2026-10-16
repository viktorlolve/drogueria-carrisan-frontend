import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, Percent, Tag, Clock } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffComercial.css'
import { useStaffUI } from '../../hooks/useStaffUI'
import StaffModal from '../../components/staff/StaffModal'
import StaffEstado from '../../components/staff/StaffEstado'

const PLANTILLAS_PRECARGADAS = [
  { titulo: '¡20% en toda la farmacia!', mensaje: 'Aprovechá un 20% de descuento en todos los productos de línea farmacéutica. Solo por tiempo limitado.', descuento_pct: 20 },
  { titulo: 'Envío gratis en tu próximo pedido', mensaje: 'Hoy no pagás envío. Combiná lo que necesités y recibilo en tu puerta sin costo.', descuento_pct: null },
  { titulo: '3x2 en productos seleccionados', mensaje: 'Comprá 2 y llevá 3 en productos seleccionados del catálogo. ¡No te lo pierdas!', descuento_pct: null, codigo_cupon: '3X2' },
  { titulo: 'Descuento exclusivo para clientes de crédito', mensaje: 'Si tienes línea de crédito activa, disfruta un 15% extra en tu próxima compra.', descuento_pct: 15 },
  { titulo: 'Semana de la salud — hasta 30% OFF', mensaje: 'Semana especial con descuentos de hasta 30% en medicamentos y suplementos.', descuento_pct: 30 },
  { titulo: 'Nuevo producto disponible', mensaje: 'Llegó un producto nuevo al catálogo. ¡Sé de los primeros en pedirlo!', descuento_pct: null },
]

function StaffPromociones({ departamento = 'comercial', activo = 'promociones', titulo = 'Promociones' }) {
  const { confirmar, avisar } = useStaffUI()
  const [plantillas, setPlantillas] = useState([])
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalCrear, setModalCrear] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [tab, setTab] = useState('plantillas')

  const [form, setForm] = useState({ titulo: '', mensaje: '', descuento_pct: '', codigo_cupon: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    try {
      // El historial es secundario: si falla, la página sigue con las plantillas.
      const [plantillasRes, historialRes] = await Promise.all([
        staffApi.get('/staff/promociones/templates'),
        staffApi.get('/staff/promociones/history').catch(() => ({ data: [] })),
      ])
      setPlantillas(plantillasRes.data)
      setHistorial(historialRes.data)
      setError('')
    } catch (err) {
      console.error('Error al cargar promociones', err)
      setError(err.response?.data?.error || 'No se pudieron cargar las promociones')
    } finally {
      setCargando(false)
    }
  }

  function abrirCrear() {
    setForm({ titulo: '', mensaje: '', descuento_pct: '', codigo_cupon: '' })
    setEditando(null)
    setModalCrear(true)
  }

  function abrirEditar(p) {
    setForm({
      titulo: p.titulo,
      mensaje: p.mensaje,
      descuento_pct: p.descuento_pct || '',
      codigo_cupon: p.codigo_cupon || '',
    })
    setEditando(p.id)
    setModalCrear(true)
  }

  async function guardarPlantilla() {
    if (!form.titulo || !form.mensaje) return
    const payload = {
      titulo: form.titulo,
      mensaje: form.mensaje,
      descuento_pct: form.descuento_pct ? Number(form.descuento_pct) : null,
      codigo_cupon: form.codigo_cupon || null,
    }
    setGuardando(true)
    try {
      if (editando) {
        await staffApi.put(`/staff/promociones/templates/${editando}`, payload)
      } else {
        await staffApi.post('/staff/promociones/templates', payload)
      }
      setModalCrear(false)
      cargarDatos()
    } catch (err) {
      console.error(err)
      avisar(err.response?.data?.error || 'No se pudo guardar la plantilla', 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarPlantilla(id) {
    if (!(await confirmar({ titulo: '¿Eliminar esta plantilla?', textoConfirmar: 'Eliminar', peligro: true }))) return
    try {
      await staffApi.delete(`/staff/promociones/templates/${id}`)
      cargarDatos()
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo eliminar la plantilla', 'error')
    }
  }

  function cargarPlantillaPrecargada(p) {
    setForm({ titulo: p.titulo, mensaje: p.mensaje, descuento_pct: p.descuento_pct || '', codigo_cupon: p.codigo_cupon || '' })
    setEditando(null)
    setModalCrear(true)
  }

  if (cargando) {
    return (
      <LayoutDepartamento departamento={departamento} activo={activo} titulo={titulo}>
        <StaffEstado tipo="cargando" filas={3} />
      </LayoutDepartamento>
    )
  }

  if (error) {
    return (
      <LayoutDepartamento departamento={departamento} activo={activo} titulo={titulo}>
        <StaffEstado tipo="error" mensaje={error} onReintentar={cargarDatos} />
      </LayoutDepartamento>
    )
  }

  return (
    <LayoutDepartamento departamento={departamento} activo={activo} titulo={titulo}>
      <div className="promo-admin">
        <div className="promo-admin__header">
          <div className="promo-admin__tabs">
            <button className={`promo-admin__tab ${tab === 'plantillas' ? 'promo-admin__tab--activo' : ''}`} onClick={() => setTab('plantillas')}>Plantillas</button>
            <button className={`promo-admin__tab ${tab === 'precargadas' ? 'promo-admin__tab--activo' : ''}`} onClick={() => setTab('precargadas')}>Precargadas</button>
            <button className={`promo-admin__tab ${tab === 'historial' ? 'promo-admin__tab--activo' : ''}`} onClick={() => setTab('historial')}>Historial</button>
          </div>
          <div className="promo-admin__acciones">
            <button className="promo-admin__btn promo-admin__btn--nueva" onClick={abrirCrear}>
              <Plus size={15} /> Nueva plantilla
            </button>
          </div>
        </div>

        {tab === 'plantillas' && (
          <div className="promo-admin__grid">
            {plantillas.length === 0 && (
              <p className="promo-admin__vacio">No hay plantillas creadas. Crea una o usa las precargadas.</p>
            )}
            {plantillas.map(p => (
              <div className={`promo-admin__card ${!p.activa ? 'promo-admin__card--inactiva' : ''}`} key={p.id}>
                <div className="promo-admin__card-header">
                  {p.descuento_pct && (
                    <span className="promo-admin__badge-descuento"><Percent size={12} /> {p.descuento_pct}%</span>
                  )}
                  {p.codigo_cupon && (
                    <span className="promo-admin__badge-cupon"><Tag size={12} /> {p.codigo_cupon}</span>
                  )}
                </div>
                <h4 className="promo-admin__card-titulo">{p.titulo}</h4>
                <p className="promo-admin__card-mensaje">{p.mensaje}</p>
                <div className="promo-admin__card-footer">
                  <button className="promo-admin__card-btn promo-admin__card-btn--editar" onClick={() => abrirEditar(p)}>
                    <Edit3 size={14} /> Editar
                  </button>
                  <button className="promo-admin__card-btn promo-admin__card-btn--eliminar" onClick={() => eliminarPlantilla(p.id)}>
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'precargadas' && (
          <div className="promo-admin__grid">
            {PLANTILLAS_PRECARGADAS.map((p, i) => (
              <div className="promo-admin__card promo-admin__card--precargada" key={i}>
                <div className="promo-admin__card-header">
                  {p.descuento_pct && (
                    <span className="promo-admin__badge-descuento"><Percent size={12} /> {p.descuento_pct}%</span>
                  )}
                  {p.codigo_cupon && (
                    <span className="promo-admin__badge-cupon"><Tag size={12} /> {p.codigo_cupon}</span>
                  )}
                </div>
                <h4 className="promo-admin__card-titulo">{p.titulo}</h4>
                <p className="promo-admin__card-mensaje">{p.mensaje}</p>
                <div className="promo-admin__card-footer">
                  <button className="promo-admin__card-btn promo-admin__card-btn--usar" onClick={() => cargarPlantillaPrecargada(p)}>
                    <Plus size={14} /> Usar como plantilla
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'historial' && (
          <div className="promo-admin__historial">
            {historial.length === 0 && <p className="promo-admin__vacio">No hay envíos registrados.</p>}
            {historial.map(h => (
              <div className="promo-admin__historial-item" key={h.id}>
                <div className="promo-admin__historial-icono">
                  <Clock size={16} />
                </div>
                <div className="promo-admin__historial-info">
                  <span className="promo-admin__historial-titulo">{h.titulo}</span>
                  <span className="promo-admin__historial-fecha">
                    <Clock size={12} /> {new Date(h.created_at).toLocaleString('es-VE')}
                  </span>
                </div>
                <div className="promo-admin__historial-stats">
                  <span>{h.enviadas} enviadas</span>
                  {h.fallos > 0 && <span className="promo-admin__historial-fallos">{h.fallos} fallos</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {modalCrear && (
          <StaffModal titulo={editando ? 'Editar plantilla' : 'Nueva plantilla'} ancho="sm" onCerrar={() => setModalCrear(false)} bloqueado={guardando}>
              <div className="promo-admin__modal-body">
                <label>
                  <span>Título</span>
                  <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: ¡20% en farmacia!" />
                </label>
                <label>
                  <span>Mensaje</span>
                  <textarea rows={3} value={form.mensaje} onChange={e => setForm({ ...form, mensaje: e.target.value })} placeholder="Descripción de la promoción…" />
                </label>
                <div className="promo-admin__modal-row">
                  <label>
                    <span>Descuento %</span>
                    <input type="number" min={0} max={100} value={form.descuento_pct} onChange={e => setForm({ ...form, descuento_pct: e.target.value })} placeholder="Opcional" />
                  </label>
                  <label>
                    <span>Código cupón</span>
                    <input type="text" value={form.codigo_cupon} onChange={e => setForm({ ...form, codigo_cupon: e.target.value })} placeholder="Opcional" />
                  </label>
                </div>
              </div>
              <div className="promo-admin__modal-footer">
                <button className="promo-admin__btn promo-admin__btn--cancelar" onClick={() => setModalCrear(false)}>Cancelar</button>
                <button
                  className="promo-admin__btn promo-admin__btn--enviar"
                  disabled={!form.titulo || !form.mensaje || guardando}
                  onClick={guardarPlantilla}
                >
                  {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear plantilla'}
                </button>
              </div>
          </StaffModal>
        )}
      </div>
    </LayoutDepartamento>
  )
}

export default StaffPromociones