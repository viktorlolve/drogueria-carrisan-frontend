import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, MapPin, Phone } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffEstado from '../../components/staff/StaffEstado'
import StaffModal from '../../components/staff/StaffModal'
import './StaffDirecciones.css'
import { useStaffUI } from '../../hooks/useStaffUI'

const TIPOS = [
  { id: 'todas', label: 'Todas' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'envio_nacional', label: 'Envío nacional' },
]

function formatFecha(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

async function obtenerDirecciones(tipo, query) {
  const params = {}
  if (tipo !== 'todas') params.tipo = tipo
  if (query && query.trim().length >= 2) params.buscar = query.trim()
  const { data } = await staffApi.get('/staff/direcciones', { params })
  return Array.isArray(data) ? data : []
}

function StaffDirecciones({ departamento = 'logistica', activo = 'direcciones', titulo = 'Direcciones de clientes' }) {
  const { avisar } = useStaffUI()
  const [direcciones, setDirecciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [tipo, setTipo] = useState('todas')
  const [buscar, setBuscar] = useState('')
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ telefono_contacto: '', nota_entrega: '' })
  const timer = useRef(null)
  const ultima = useRef(0)
  const buscarRef = useRef('')

  // Solo se aplica la respuesta de la ÚLTIMA petición: sin esto, una búsqueda
  // lenta podía pisar a otra más reciente y la lista no coincidía con lo escrito.
  const pedir = useCallback((t, q) => {
    const id = ++ultima.current
    return obtenerDirecciones(t, q)
      .then(
        (data) => { if (id === ultima.current) { setDirecciones(data); setError('') } },
        (err) => {
          if (id !== ultima.current) return
          setDirecciones([])
          setError(err.response?.data?.error || 'No se pudieron cargar las direcciones')
        },
      )
      .finally(() => { if (id === ultima.current) setCargando(false) })
  }, [])

  // Al cambiar de pestaña se conserva el texto del buscador.
  useEffect(() => {
    pedir(tipo, buscarRef.current)
    return () => { ultima.current += 1 }
  }, [tipo, pedir])

  useEffect(() => () => clearTimeout(timer.current), [])

  function handleBuscar(value) {
    setBuscar(value)
    buscarRef.current = value
    setCargando(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { pedir(tipo, value) }, 120)
  }

  function reintentar() {
    setCargando(true)
    pedir(tipo, buscarRef.current)
  }

  async function togglePreferida(d) {
    try {
      await staffApi.patch(`/staff/direcciones/${d.id}`, { es_preferida: !d.es_preferida })
      setDirecciones((prev) => prev.map((x) => x.id === d.id ? { ...x, es_preferida: !d.es_preferida } : x))
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo actualizar la preferida', 'error')
    }
  }

  function abrirEdicion(d) {
    setEditando(d)
    setForm({ telefono_contacto: d.telefono_contacto || '', nota_entrega: d.nota_entrega || '' })
  }

  async function guardarEdicion() {
    if (!editando) return
    setGuardando(true)
    try {
      await staffApi.patch(`/staff/direcciones/${editando.id}`, {
        telefono_contacto: form.telefono_contacto,
        nota_entrega: form.nota_entrega,
      })
      setDirecciones((prev) => prev.map((x) => x.id === editando.id
        ? { ...x, telefono_contacto: form.telefono_contacto, nota_entrega: form.nota_entrega }
        : x))
      setEditando(null)
    } catch (err) {
      avisar(err.response?.data?.error || 'No se pudo guardar la dirección', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <LayoutDepartamento departamento={departamento} activo={activo} titulo={titulo}>
      <div className="sdir-page">
        <div className="sdir-toolbar">
          <div className="sdir-buscador">
            <Search size={17} />
            <input
              type="text"
              placeholder="Buscar por cliente, email, dirección o ciudad..."
              value={buscar}
              onChange={(e) => handleBuscar(e.target.value)}
            />
          </div>
          <div className="sdir-tabs">
            {TIPOS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`sdir-tab ${tipo === t.id ? 'sdir-tab--activo' : ''}`}
                onClick={() => { setTipo(t.id); setCargando(true) }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <StaffEstado tipo="cargando" filas={4} />
        ) : error ? (
          <StaffEstado tipo="error" mensaje={error} onReintentar={reintentar} />
        ) : direcciones.length === 0 ? (
          <StaffEstado
            tipo="vacio"
            titulo="No hay direcciones para mostrar."
            mensaje={buscar.trim().length >= 2 ? 'Prueba con otro nombre, email o ciudad.' : undefined}
          />
        ) : (
          <div className="sdir-grid">
            {direcciones.map((d) => (
              <div className="sdir-card" key={d.id}>
                <div className="sdir-card__head">
                  <div className="sdir-card__avatar">{(d.users?.nombre || d.users?.email || '?').trim().charAt(0).toUpperCase()}</div>
                  <div className="sdir-card__cliente">
                    <strong>{d.users?.nombre || 'Sin nombre'}{d.es_preferida && <span className="sdir-badge-pref"> Preferida</span>}</strong>
                    <span>{d.users?.email}{d.users?.rif_cedula ? ` · ${d.users.rif_cedula}` : ''}</span>
                  </div>
                </div>

                <span className={`sdir-card__badge sdir-card__badge--${d.tipo_direccion || 'delivery'}`}>
                  {d.tipo_direccion === 'envio_nacional' ? 'Envío nacional' : 'Delivery'}
                </span>

                <div className="sdir-card__direccion">
                  <MapPin size={15} />
                  <div>
                    <p className="sdir-card__nombre">{d.nombre || 'Dirección'}</p>
                    <p>{d.direccion}</p>
                    {(d.ciudad || d.estado) && <p className="sdir-card__ciudad">{[d.ciudad, d.estado].filter(Boolean).join(', ')}</p>}
                    {d.referencia && <p className="sdir-card__ref">{d.referencia}</p>}
                    {d.nota_entrega && <p className="sdir-card__nota">Nota: {d.nota_entrega}</p>}
                  </div>
                </div>

                <div className="sdir-card__meta">
                  {d.telefono_contacto && <span className="sdir-card__meta-item"><Phone size={12} /> {d.telefono_contacto}</span>}
                  {d.agencia_preferida && <span className="sdir-card__meta-agencia">Agencia: {d.agencia_preferida}</span>}
                  <span className="sdir-card__fecha">Registrada {formatFecha(d.created_at)}</span>
                </div>

                <div className="sdir-card__acciones">
                  <button type="button" className="sdir-card__btn" onClick={() => togglePreferida(d)}>
                    {d.es_preferida ? 'Quitar preferida' : 'Marcar preferida'}
                  </button>
                  <button type="button" className="sdir-card__btn" onClick={() => abrirEdicion(d)}>Editar contacto/nota</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editando && (
          <StaffModal titulo={`Dirección de ${editando.users?.nombre || 'cliente'}`} ancho="sm" onCerrar={() => setEditando(null)} bloqueado={guardando}>
            <div className="sdir-modal-content">
              <label>
                Teléfono de contacto
                <input value={form.telefono_contacto} onChange={(e) => setForm({ ...form, telefono_contacto: e.target.value })} />
              </label>
              <label>
                Nota de entrega
                <input value={form.nota_entrega} onChange={(e) => setForm({ ...form, nota_entrega: e.target.value })} placeholder="Ej. preguntar por María, edificio verde" />
              </label>
              <div className="sdir-modal__acciones">
                <button type="button" className="sdir-card__btn" onClick={() => setEditando(null)} disabled={guardando}>Cancelar</button>
                <button type="button" className="sdir-card__btn sdir-card__btn--primario" onClick={guardarEdicion} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </StaffModal>
        )}
      </div>
    </LayoutDepartamento>
  )
}

export default StaffDirecciones
