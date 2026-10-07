import { useState, useEffect } from 'react'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import api from '../api/axios'
import './SubUsuarios.css'

// ---------------------------------------------------------------
// Gestión de sub-usuarios: la cuenta que inicia sesión es siempre
// el superusuario (crea/edita/desactiva). Los sub-usuarios NO
// inician sesión — solo existen para "firmar" pedidos con un PIN
// en el checkout (ver PinCheckout.jsx).
// ---------------------------------------------------------------

function ModalFormulario({ subUsuario, onClose, onGuardado }) {
  const esEdicion = !!subUsuario
  const [nombre, setNombre] = useState(subUsuario?.nombre || '')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    if (!esEdicion) {
      if (!/^\d{4}$/.test(pin)) {
        setError('El PIN debe tener 4 dígitos')
        return
      }
      if (pin !== pinConfirm) {
        setError('Los PIN no coinciden')
        return
      }
    }

    setGuardando(true)
    try {
      if (esEdicion) {
        await api.patch(`/subusuarios/${subUsuario.id}`, { nombre: nombre.trim() })
      } else {
        await api.post('/subusuarios', { nombre: nombre.trim(), pin })
      }
      onGuardado()
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="su-modal-overlay" onClick={onClose}>
      <div className="su-modal" onClick={(e) => e.stopPropagation()}>
        <div className="su-modal__header">
          <h3>{esEdicion ? 'Editar sub-usuario' : 'Nuevo sub-usuario'}</h3>
          <button type="button" className="su-modal__cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="su-modal__form">
          <label className="su-campo">
            <span>Nombre</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Ana Pérez"
              autoFocus
            />
          </label>

          {!esEdicion && (
            <>
              <label className="su-campo">
                <span>PIN (4 dígitos)</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                />
              </label>
              <label className="su-campo">
                <span>Confirmar PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                />
              </label>
            </>
          )}

          {error && <p className="su-error">{error}</p>}

          <button type="submit" className="su-boton su-boton--primario" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function SubUsuarios() {
  const [subUsuarios, setSubUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    try {
      const { data } = await api.get('/subusuarios')
      setSubUsuarios(data)
    } catch (err) {
      console.error('Error al cargar sub-usuarios:', err)
    } finally {
      setCargando(false)
    }
  }

  async function toggleActivo(su) {
    try {
      await api.patch(`/subusuarios/${su.id}`, { activo: !su.activo })
      setSubUsuarios((prev) =>
        prev.map((s) => (s.id === su.id ? { ...s, activo: !s.activo } : s))
      )
    } catch (err) {
      console.error('Error al actualizar:', err)
    }
  }

  async function eliminar(su) {
    if (!window.confirm(`¿Eliminar a ${su.nombre}? Esto no borra sus órdenes pasadas.`)) return
    try {
      await api.delete(`/subusuarios/${su.id}`)
      setSubUsuarios((prev) => prev.filter((s) => s.id !== su.id))
    } catch (err) {
      console.error('Error al eliminar:', err)
    }
  }

  function abrirCrear() {
    setEditando(null)
    setModalAbierto(true)
  }

  function abrirEditar(su) {
    setEditando(su)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setEditando(null)
  }

  function handleGuardado() {
    cerrarModal()
    cargar()
  }

  return (
    <LayoutPaginaPrincipal
      activo="sub-usuarios"
      titulo="Sub-usuarios"
      subtitulo="Identifica quién de tu equipo hace cada pedido"
      acciones={
        <button type="button" className="su-boton su-boton--primario" onClick={abrirCrear}>
          <Plus size={16} style={{ marginRight: 4 }} />
          Nuevo
        </button>
      }
    >
      <div className="su-intro">
        Cada sub-usuario tiene un nombre y un PIN propio. Al confirmar un pedido, quien compra
        ingresa su PIN y su nombre queda registrado en esa orden — puede ver el nombre en todo momento
        desde "Mis órdenes". Si no creás ninguno, el checkout sigue funcionando igual que hoy sin PIN.
      </div>

      {cargando ? (
        <p className="su-cargando">Cargando...</p>
      ) : subUsuarios.length === 0 ? (
        <div className="su-vacio">
          <p>Todavía no tienes sub-usuarios registrados.</p>
          <button type="button" className="su-boton su-boton--primario" onClick={abrirCrear}>
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="su-lista">
          {subUsuarios.map((su) => (
            <div key={su.id} className={`su-item ${!su.activo ? 'su-item--inactivo' : ''}`}>
              <div className="su-item__avatar">{su.nombre.charAt(0).toUpperCase()}</div>
              <div className="su-item__body">
                <p className="su-item__nombre">{su.nombre}</p>
                <p className="su-item__estado">{su.activo ? 'Activo' : 'Desactivado'}</p>
              </div>
              <div className="su-item__acciones">
                <button type="button" onClick={() => abrirEditar(su)} title="Editar nombre">
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="su-toggle"
                  onClick={() => toggleActivo(su)}
                >
                  {su.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button type="button" onClick={() => eliminar(su)} title="Eliminar" className="su-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalFormulario subUsuario={editando} onClose={cerrarModal} onGuardado={handleGuardado} />
      )}
    </LayoutPaginaPrincipal>
  )
}

export default SubUsuarios
