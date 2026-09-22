import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import { Plus, Trash2 } from 'lucide-react'
import './Requerimientos.css'

function filaVacia(nombre = '') {
  return { nombre_solicitado: nombre, cantidad: 1, nota_usuario: '' }
}

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function FormularioRequerimiento({ onEnviado, productoInicial }) {
  const [filas, setFilas] = useState(() => (productoInicial ? [filaVacia(productoInicial)] : [filaVacia()]))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  function actualizarFila(i, campo, valor) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)))
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()])
  }

  function quitarFila(i) {
    setFilas((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleEnviar() {
    const filasValidas = filas.filter((f) => f.nombre_solicitado.trim())
    if (filasValidas.length === 0) {
      setError('Agrega al menos un producto con nombre')
      return
    }
    setEnviando(true)
    setError('')
    try {
      await api.post('/requerimientos', { items: filasValidas })
      setFilas([filaVacia()])
      onEnviado()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar la solicitud')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="req-form">
      <div className="req-form__filas">
        {filas.map((fila, i) => (
          <div className="req-form__fila" key={i}>
            <input
              type="text"
              placeholder="Nombre del producto"
              value={fila.nombre_solicitado}
              onChange={(e) => actualizarFila(i, 'nombre_solicitado', e.target.value)}
              className="req-form__input req-form__input--nombre"
            />
            <input
              type="number"
              min="1"
              value={fila.cantidad}
              onChange={(e) => actualizarFila(i, 'cantidad', Number(e.target.value))}
              className="req-form__input req-form__input--cantidad"
            />
            <input
              type="text"
              placeholder="Nota (opcional)"
              value={fila.nota_usuario}
              onChange={(e) => actualizarFila(i, 'nota_usuario', e.target.value)}
              className="req-form__input req-form__input--nota"
            />
            <button
              type="button"
              className="req-form__quitar"
              onClick={() => quitarFila(i)}
              disabled={filas.length === 1}
              aria-label="Quitar fila"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="req-form__agregar-fila" onClick={agregarFila}>
        <Plus size={16} /> Agregar otro producto
      </button>

      {error && <p className="req-error">{error}</p>}

      <button type="button" className="req-form__enviar" onClick={handleEnviar} disabled={enviando}>
        {enviando ? 'Enviando...' : 'Enviar solicitud'}
      </button>
    </div>
  )
}

function RequerimientoCard({ requerimiento, onAgregar, yaEnCarrito }) {
  return (
    <div className="req-card">
      <div className="req-card__header">
        <span className="req-card__id">Solicitud #{requerimiento.id}</span>
        <span className={`req-card__estado req-card__estado--${requerimiento.estado}`}>
          {requerimiento.estado === 'pendiente' ? 'En revisión' : 'Respondida'}
        </span>
      </div>
      <div className="req-card__items">
        {requerimiento.requerimiento_items.map((item) => (
          <div className="req-item" key={item.id}>
            {item.estado_item === 'pendiente' && (
              <>
                <span className="req-item__nombre">{item.nombre_solicitado}</span>
                <span className="req-item__badge req-item__badge--pendiente">Esperando precio</span>
              </>
            )}
            {item.estado_item === 'rechazado' && (
              <>
                <span className="req-item__nombre">{item.nombre_solicitado}</span>
                <span className="req-item__badge req-item__badge--rechazado">
                  No disponible{item.nota_admin ? ` — ${item.nota_admin}` : ''}
                </span>
              </>
            )}
            {item.estado_item === 'listo' && item.productos && (
              <>
                <div className="req-item__info">
                  <span className="req-item__nombre">{item.productos.nombre_comercial}</span>
                  <span className="req-item__precio">${formatUSD(item.productos.precio_usd)}</span>
                </div>
                <button
                  className="req-item__btn"
                  onClick={() => onAgregar(item.productos, item.cantidad)}
                  disabled={yaEnCarrito(item.productos.id) || item.productos.disponible === false}
                >
                  {item.productos.disponible === false
                    ? 'No disponible'
                    : (yaEnCarrito(item.productos.id) ? '✓ En el carrito' : 'Agregar al carrito')}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Requerimientos() {
  const [requerimientos, setRequerimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [searchParams] = useSearchParams()
  const productoInicial = searchParams.get('producto') || null
  const [mostrarForm, setMostrarForm] = useState(Boolean(productoInicial))
  const { items, addItem } = useCart()

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/requerimientos/mios')
      setRequerimientos(data)
    } catch (err) {
      console.error('Error al cargar requerimientos', err)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    async function iniciar() {
      await cargar()
    }
    iniciar()
  }, [cargar])

  function handleEnviado() {
    setMostrarForm(false)
    cargar()
  }

  function yaEnCarrito(productoId) {
    return items.some((item) => item.producto.id === productoId)
  }

  return (
    <LayoutPaginaPrincipal
      activo="requerimientos"
      titulo="Requerimientos"
      nav={NAV_UNIFICADO}
      acciones={
        !mostrarForm && (
          <button className="req-nueva-btn" onClick={() => setMostrarForm(true)}>
            <Plus size={16} /> Nueva solicitud
          </button>
        )
      }
    >
      <div className="req-page">
        {mostrarForm && (
          <div className="req-nueva">
            {/* Placeholder para una segunda forma de solicitar, pendiente de definir */}
            <div className="req-nueva__tabs">
              <button className="req-nueva__tab req-nueva__tab--activo">Lista manual</button>
            </div>
            <FormularioRequerimiento onEnviado={handleEnviado} productoInicial={productoInicial} />
          </div>
        )}

        {cargando ? (
          <div className="req-loading">Cargando tus solicitudes...</div>
        ) : requerimientos.length === 0 && !mostrarForm ? (
          <div className="req-vacio">
            <p>Todavía no has hecho ninguna solicitud de requerimiento.</p>
            <button className="req-nueva-btn" onClick={() => setMostrarForm(true)}>
              <Plus size={16} /> Nueva solicitud
            </button>
          </div>
        ) : (
          <div className="req-lista">
            {requerimientos.map((r) => (
              <RequerimientoCard
                key={r.id}
                requerimiento={r}
                onAgregar={addItem}
                yaEnCarrito={yaEnCarrito}
              />
            ))}
          </div>
        )}
      </div>
    </LayoutPaginaPrincipal>
  )
}

export default Requerimientos