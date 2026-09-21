import { useState, useEffect } from 'react'
import api from '../api/axios'
import { ProductoImagen } from './icons/ProductoImagen'

function AgregarAItemsModal({ producto, onClose }) {
  const [listas, setListas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [agregando, setAgregando] = useState(null) // id de lista que se está procesando
  const [mostrarCrear, setMostrarCrear] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [creando, setCreando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    cargarListas()
  }, [])

  async function cargarListas() {
    try {
      const { data } = await api.get('/lists')
      setListas(data)
    } catch {
      setError('No se pudieron cargar tus listas')
    } finally {
      setCargando(false)
    }
  }

  async function handleAgregar(listaId) {
    setAgregando(listaId)
    setError('')
    try {
      await api.post(`/lists/${listaId}/items`, { producto_id: producto.id })
      setMensaje(`Agregado a la lista`)
      setTimeout(() => {
        setMensaje('')
        onClose()
      }, 1000)
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Este producto ya está en esa lista')
      } else {
        setError('Error al agregar el producto')
      }
    } finally {
      setAgregando(null)
    }
  }

  async function handleCrearLista() {
    if (!nuevoNombre.trim()) return
    setCreando(true)
    setError('')
    try {
      const { data } = await api.post('/lists', { nombre: nuevoNombre.trim() })
      // Agregar el producto a la nueva lista automáticamente
      await api.post(`/lists/${data.id}/items`, { producto_id: producto.id })
      setNuevoNombre('')
      setMostrarCrear(false)
      setMensaje(`Lista creada y producto agregado`)
      cargarListas()
      setTimeout(() => {
        setMensaje('')
        onClose()
      }, 1200)
    } catch {
      setError('Error al crear la lista')
    } finally {
      setCreando(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '420px',
        maxHeight: '80vh',
        overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Agregar a Mis Items</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>
            ✕
          </button>
        </div>

        {/* Producto */}
        <div style={{ display: 'flex', gap: '12px', padding: '12px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '20px' }}>
          <ProductoImagen
            src={producto.foto_url}
            alt={producto.nombre_comercial}
            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }}
          />
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{producto.nombre_comercial}</p>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>
              ${Number(producto.precio_usd).toFixed(2)} USD
            </p>
          </div>
        </div>

        {/* Mensajes */}
        {mensaje && (
          <div style={{ padding: '10px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '6px', marginBottom: '15px', fontSize: '14px' }}>
            {mensaje}
          </div>
        )}
        {error && (
          <div style={{ padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '6px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Lista de listas */}
        {cargando ? (
          <p style={{ color: '#666', fontSize: '14px' }}>Cargando tus listas...</p>
        ) : listas.length === 0 ? (
          <p style={{ color: '#666', fontSize: '14px' }}>No tienes listas creadas</p>
        ) : (
          <div style={{ marginBottom: '15px' }}>
            {listas.map(lista => (
              <button
                key={lista.id}
                onClick={() => handleAgregar(lista.id)}
                disabled={agregando === lista.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  padding: '12px',
                  marginBottom: '6px',
                  background: agregando === lista.id ? '#e3f2fd' : '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: agregando === lista.id ? 'wait' : 'pointer',
                  fontSize: '14px',
                  textAlign: 'left'
                }}
              >
                <span>{lista.es_predeterminada ? '📌' : '📋'} {lista.nombre}</span>
                <span style={{ color: '#1976d2', fontSize: '13px' }}>
                  {agregando === lista.id ? '...' : 'Agregar'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Crear nueva lista */}
        {mostrarCrear ? (
          <div style={{ padding: '12px', background: '#fafafa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <input
              type="text"
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              placeholder="Nombre de la lista"
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                marginBottom: '10px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCrearLista}
                disabled={creando || !nuevoNombre.trim()}
                style={{
                  padding: '8px 16px',
                  background: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {creando ? 'Creando...' : 'Crear y agregar'}
              </button>
              <button
                onClick={() => { setMostrarCrear(false); setNuevoNombre('') }}
                style={{
                  padding: '8px 16px',
                  background: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setMostrarCrear(true)}
            style={{
              width: '100%',
              padding: '10px',
              background: 'white',
              border: '2px dashed #ccc',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666'
            }}
          >
            + Crear nueva lista
          </button>
        )}
      </div>
    </div>
  )
}

export default AgregarAItemsModal