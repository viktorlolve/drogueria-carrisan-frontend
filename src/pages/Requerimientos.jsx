import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import { Plus, Trash2 } from 'lucide-react'
import './Requerimientos.css'

// Un requerimiento respondido con precio queda vigente 48 horas (mismo plazo
// que devuelve el backend en `fecha_expiracion`). Pasado ese plazo el cliente
// ya no puede agregarlo al carrito: debe volver a solicitarlo.
const HORAS_VIGENCIA = 48

function filaVacia(nombre = '', cantidad = 1) {
  return { nombre_solicitado: nombre, cantidad, nota_usuario: '' }
}

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// El backend ya manda `fecha_expiracion`; si por lo que sea no llega, se deriva
// localmente desde `fecha_respuesta` (las dos fuentes son el mismo cálculo).
function fechaExpiracion(requerimiento) {
  if (requerimiento.fecha_expiracion !== undefined) return requerimiento.fecha_expiracion
  if (requerimiento.estado !== 'respondido' || !requerimiento.fecha_respuesta) return null
  const conPrecio = (requerimiento.requerimiento_items || []).some(
    (item) => item.estado_item === 'listo' && item.productos && item.productos.precio_usd != null
  )
  if (!conPrecio) return null
  const base = new Date(requerimiento.fecha_respuesta).getTime()
  return new Date(base + HORAS_VIGENCIA * 60 * 60 * 1000).toISOString()
}

function estaVencido(requerimiento) {
  if (typeof requerimiento.expirado === 'boolean') return requerimiento.expirado
  const iso = fechaExpiracion(requerimiento)
  if (!iso) return false
  return new Date(iso).getTime() <= Date.now()
}

function formatFechaHora(iso) {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  return fecha.toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function FormularioRequerimiento({ onEnviado, productoInicial, productosIniciales }) {
  const [filas, setFilas] = useState(() => {
    if (productosIniciales && productosIniciales.length > 0) {
      return productosIniciales.map((p) => filaVacia(p.nombre_solicitado, p.cantidad || 1))
    }
    return [filaVacia(productoInicial || '')]
  })
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

function RequerimientoCard({ requerimiento, onAgregar, onRepetir, yaEnCarrito }) {
  const vencido = estaVencido(requerimiento)
  const expiracion = fechaExpiracion(requerimiento)

  let etiquetaEstado = 'Respondida'
  let claseEstado = requerimiento.estado
  if (requerimiento.estado === 'pendiente') {
    etiquetaEstado = 'En revisión'
  } else if (vencido) {
    etiquetaEstado = 'Vencida'
    claseEstado = 'vencida'
  }

  return (
    <div className="req-card">
      <div className="req-card__header">
        <span className="req-card__id">Solicitud #{requerimiento.id}</span>
        <span className={`req-card__estado req-card__estado--${claseEstado}`}>{etiquetaEstado}</span>
      </div>

      {expiracion && (
        <p className={`req-card__nota${vencido ? ' req-card__nota--vencida' : ''}`}>
          {vencido
            ? `El precio venció el ${formatFechaHora(expiracion)}. Vuelve a solicitarlo para recibir uno nuevo.`
            : `Precio válido hasta el ${formatFechaHora(expiracion)}.`}
        </p>
      )}

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
                {vencido ? (
                  <span className="req-item__badge req-item__badge--vencido">Precio vencido</span>
                ) : (
                  <button
                    className="req-item__btn"
                    onClick={() => onAgregar(item.productos, item.cantidad)}
                    disabled={yaEnCarrito(item.productos.id) || item.productos.disponible === false}
                  >
                    {item.productos.disponible === false
                      ? 'No disponible'
                      : (yaEnCarrito(item.productos.id) ? '✓ En el carrito' : 'Agregar al carrito')}
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {vencido && (
        <div className="req-card__footer">
          <button type="button" className="req-card__repetir" onClick={() => onRepetir(requerimiento)}>
            Volver a solicitar
          </button>
        </div>
      )}
    </div>
  )
}

function Requerimientos() {
  const [requerimientos, setRequerimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [searchParams] = useSearchParams()
  const productoInicial = searchParams.get('producto') || null
  const [mostrarForm, setMostrarForm] = useState(Boolean(productoInicial))
  const [prefill, setPrefill] = useState(null)
  const [formKey, setFormKey] = useState(0)
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

  function abrirForm(productosParaRepetir = null) {
    setPrefill(productosParaRepetir)
    setFormKey((k) => k + 1)
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setPrefill(null)
  }

  function handleEnviado() {
    setMostrarForm(false)
    setPrefill(null)
    cargar()
  }

  function repetirRequerimiento(requerimiento) {
    const productosParaRepetir = (requerimiento.requerimiento_items || []).map((item) => ({
      nombre_solicitado: item.productos?.nombre_comercial || item.nombre_solicitado,
      cantidad: item.cantidad || 1,
    }))
    abrirForm(productosParaRepetir.length > 0 ? productosParaRepetir : null)
  }

  function yaEnCarrito(productoId) {
    return items.some((item) => item.producto.id === productoId)
  }

  const botonNueva = (
    <button type="button" className="req-nueva-btn" onClick={() => abrirForm()}>
      <Plus size={16} /> Nueva solicitud
    </button>
  )

  return (
    <LayoutPaginaPrincipal
      activo="requerimientos"
      titulo="Requerimientos"
      nav={NAV_UNIFICADO}
      acciones={!mostrarForm && botonNueva}
    >
      <div className="req-page">
        {/* El header del layout se oculta en <1024px, así que el botón se repite
            dentro de la página para que se pueda crear una solicitud en móvil. */}
        {!mostrarForm && !cargando && requerimientos.length > 0 && (
          <div className="req-mobile-acciones">{botonNueva}</div>
        )}

        {mostrarForm && (
          <div className="req-nueva">
            {/* Placeholder para una segunda forma de solicitar, pendiente de definir */}
            <div className="req-nueva__tabs">
              <button type="button" className="req-nueva__tab req-nueva__tab--activo">Lista manual</button>
              <button type="button" className="req-nueva__cancelar" onClick={cerrarForm}>
                Cancelar
              </button>
            </div>
            <FormularioRequerimiento
              key={formKey}
              onEnviado={handleEnviado}
              productoInicial={productoInicial}
              productosIniciales={prefill}
            />
          </div>
        )}

        {cargando ? (
          <div className="req-loading">Cargando tus solicitudes...</div>
        ) : requerimientos.length === 0 && !mostrarForm ? (
          <div className="req-vacio">
            <p>Todavía no has hecho ninguna solicitud de requerimiento.</p>
            {botonNueva}
          </div>
        ) : (
          <div className="req-lista">
            {requerimientos.map((r) => (
              <RequerimientoCard
                key={r.id}
                requerimiento={r}
                onAgregar={addItem}
                onRepetir={repetirRequerimiento}
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
