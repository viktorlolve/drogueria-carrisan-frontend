import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Plus, Minus, X } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffOrdenes.css'

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TIPOS_ENVIO = [
  { id: 'retiro', label: 'Retiro en tienda' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'envio_nacional', label: 'Envío nacional' },
]

function StaffOrdenes() {
  const [cliente, setCliente] = useState(null)
  const [queryCliente, setQueryCliente] = useState('')
  const [resultadosClientes, setResultadosClientes] = useState([])
  const [buscandoClientes, setBuscandoClientes] = useState(false)

  const [tipoEnvio, setTipoEnvio] = useState('retiro')
  const [direcciones, setDirecciones] = useState([])
  const [direccionId, setDireccionId] = useState('')
  const [agenciaEnvio, setAgenciaEnvio] = useState('')

  const [queryProducto, setQueryProducto] = useState('')
  const [resultadosProductos, setResultadosProductos] = useState([])
  const [buscandoProductos, setBuscandoProductos] = useState(false)
  const [filas, setFilas] = useState([])

  const [formaPago, setFormaPago] = useState('contado')
  const [creando, setCreando] = useState(false)
  const [mensaje, setMensaje] = useState(null) // { tipo: 'exito'|'error', texto }
  const [ordenCreada, setOrdenCreada] = useState(null)

  const debounceCliente = useRef(null)
  const debounceProducto = useRef(null)

  const [searchParams] = useSearchParams()

  // Pre-seleccionar cliente si viene de la ficha (?cliente=ID)
  useEffect(() => {
    const clienteId = searchParams.get('cliente')
    if (!clienteId) return
    staffApi.get(`/staff/clientes/${clienteId}/detalle`)
      .then(({ data }) => {
        if (data?.cliente) {
          setCliente(data.cliente)
        }
      })
      .catch(() => {})
  }, [searchParams])

  // Búsqueda de clientes (backend: GET /staff/clientes?buscar=)
  useEffect(() => {
    if (debounceCliente.current) clearTimeout(debounceCliente.current)

    if (queryCliente.trim().length < 2) return

    debounceCliente.current = setTimeout(async () => {
      setBuscandoClientes(true)
      try {
        const { data } = await staffApi.get('/staff/clientes', {
          params: { buscar: queryCliente.trim() },
        })
        setResultadosClientes(data?.clientes || data || [])
      } catch (err) {
        console.error('Error buscando clientes', err)
        setResultadosClientes([])
      } finally {
        setBuscandoClientes(false)
      }
    }, 300)

    return () => clearTimeout(debounceCliente.current)
  }, [queryCliente])

  // Direcciones del cliente elegido (solo si es delivery)
  useEffect(() => {
    if (!cliente || tipoEnvio !== 'delivery') return
    let activo = true
    staffApi
      .get(`/staff/clientes/${cliente.id}/direcciones`)
      .then(({ data }) => {
        if (!activo) return
        setDirecciones(data)
        setDireccionId(data[0]?.id ? String(data[0].id) : '')
      })
      .catch(() => {
        if (!activo) return
        setDirecciones([])
        setDireccionId('')
      })
    return () => {
      activo = false
    }
  }, [cliente, tipoEnvio])

  // Búsqueda de productos
  useEffect(() => {
    if (debounceProducto.current) clearTimeout(debounceProducto.current)

    if (queryProducto.trim().length < 1) return

    debounceProducto.current = setTimeout(async () => {
      setBuscandoProductos(true)
      try {
        const { data } = await staffApi.get('/staff/productos', {
          params: { buscar: queryProducto.trim() },
        })
        setResultadosProductos(data.slice(0, 8))
      } catch (err) {
        console.error('Error buscando productos', err)
        setResultadosProductos([])
      } finally {
        setBuscandoProductos(false)
      }
    }, 250)

    return () => clearTimeout(debounceProducto.current)
  }, [queryProducto])

  const clientesVisibles = queryCliente.trim().length < 2 ? [] : resultadosClientes
  const productosVisibles = queryProducto.trim().length < 1 ? [] : resultadosProductos

  function seleccionarCliente(c) {
    setCliente(c)
    setQueryCliente('')
    setResultadosClientes([])
    setDirecciones([])
    setDireccionId('')
  }

  function cambiarTipoEnvio(id) {
    setTipoEnvio(id)
    if (id !== 'delivery') {
      setDirecciones([])
      setDireccionId('')
    }
  }

  function agregarProducto(producto) {
    setFilas((prev) => {
      const existente = prev.find((f) => f.producto_id === producto.id)
      if (existente) {
        return prev.map((f) => (f.producto_id === producto.id ? { ...f, cantidad: f.cantidad + 1 } : f))
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre_comercial,
        precio_usd: producto.precio_usd,
        cantidad: 1,
      }]
    })
    setQueryProducto('')
    setResultadosProductos([])
  }

  function cambiarCantidad(productoId, delta) {
    setFilas((prev) =>
      prev
        .map((f) => (f.producto_id === productoId ? { ...f, cantidad: f.cantidad + delta } : f))
        .filter((f) => f.cantidad > 0)
    )
  }

  function quitarFila(productoId) {
    setFilas((prev) => prev.filter((f) => f.producto_id !== productoId))
  }

  const total = filas.reduce((acc, f) => acc + Number(f.precio_usd) * f.cantidad, 0)

  async function crearOrden() {
    setMensaje(null)
    setOrdenCreada(null)

    if (!cliente) return
    if (filas.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Agrega al menos un producto' })
      return
    }
    if (tipoEnvio === 'delivery' && !direccionId) {
      setMensaje({ tipo: 'error', texto: 'Selecciona una dirección de envío para el delivery' })
      return
    }

    setCreando(true)
    try {
      const payload = {
        usuario_id: cliente.id,
        items: filas.map((f) => ({ producto_id: f.producto_id, cantidad: f.cantidad })),
        forma_pago: formaPago,
        tipo_envio: tipoEnvio,
      }
      if (tipoEnvio === 'delivery' && direccionId) payload.direccion_envio_id = Number(direccionId)
      if (tipoEnvio === 'envio_nacional' && agenciaEnvio) payload.agencia_envio = agenciaEnvio

      const { data } = await staffApi.post('/staff/ordenes', payload)
      setOrdenCreada(data)
      setFilas([])
      setMensaje({ tipo: 'exito', texto: `Orden #${data.id} creada por $${formatUSD(data.total_usd || total)}` })
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo crear la orden' })
    } finally {
      setCreando(false)
    }
  }

  function nuevaOrden() {
    setOrdenCreada(null)
    setMensaje(null)
    setFilas([])
    setCliente(null)
    setTipoEnvio('retiro')
    setDirecciones([])
    setDireccionId('')
    setAgenciaEnvio('')
  }

  return (
    <LayoutDepartamento departamento="comercial" activo="ordenes" titulo="Crear orden a cliente">
    <div className="so-page">
      {mensaje && (
        <div className={`so-mensaje so-mensaje--${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      {!cliente ? (
        <div className="so-step">
          <p className="so-step-label">1 · Cliente</p>
          <div className="so-buscador">
            <Search size={17} />
            <input
              type="text"
              placeholder="Buscar cliente por nombre, correo o RIF..."
              value={queryCliente}
              onChange={(e) => setQueryCliente(e.target.value)}
              autoFocus
            />
          </div>

          {buscandoClientes && <p className="so-aviso">Buscando...</p>}
          {!buscandoClientes && queryCliente.trim().length >= 2 && clientesVisibles.length === 0 && (
            <p className="so-aviso">Sin clientes que coincidan</p>
          )}

          <div className="so-lista">
            {clientesVisibles.map((c) => (
              <button key={c.id} type="button" className="so-item" onClick={() => seleccionarCliente(c)}>
                <span className="so-avatar">{(c.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
                <span className="so-item-info">
                  <span className="so-item-nombre">{c.nombre || 'Sin nombre'}</span>
                  <span className="so-item-sub">{c.email}{c.rif_cedula ? ` · ${c.rif_cedula}` : ''}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="so-cliente-activo">
            <span>Cliente: <strong>{cliente.nombre || cliente.email}</strong></span>
            <button type="button" onClick={() => { setCliente(null); setFilas([]); setDirecciones([]); setDireccionId('') }}>Cambiar</button>
          </div>

          <div className="so-step">
            <p className="so-step-label">2 · Tipo de envío</p>
            <div className="so-tipos">
              {TIPOS_ENVIO.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`so-tipo so-tipo--${tipoEnvio === t.id ? 'activo' : ''}`}
                  onClick={() => cambiarTipoEnvio(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tipoEnvio === 'delivery' && (
              <div className="so-subcampo">
                <label>Dirección de entrega</label>
                {direcciones.length === 0 ? (
                  <p className="so-aviso">Este cliente no tiene direcciones de delivery registradas.</p>
                ) : (
                  <select value={direccionId} onChange={(e) => setDireccionId(e.target.value)}>
                    <option value="">Selecciona una dirección...</option>
                    {direcciones.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.direccion}, {d.ciudad}{d.referencia ? ` — ${d.referencia}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {tipoEnvio === 'envio_nacional' && (
              <div className="so-subcampo">
                <label>Agencia de envío</label>
                <select value={agenciaEnvio} onChange={(e) => setAgenciaEnvio(e.target.value)}>
                  <option value="">Sin agencia</option>
                  {['MRW', 'Domesa', 'Tealca', 'Zoom', 'Servientrega', 'Otro'].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="so-step">
            <p className="so-step-label">3 · Productos</p>
            <div className="so-buscador">
              <Search size={17} />
              <input
                type="text"
                placeholder="Buscar producto para agregar..."
                value={queryProducto}
                onChange={(e) => setQueryProducto(e.target.value)}
              />
            </div>

            {buscandoProductos && <p className="so-aviso">Buscando...</p>}
            {!buscandoProductos && queryProducto.trim() && productosVisibles.length === 0 && (
              <p className="so-aviso">Sin resultados para "{queryProducto}"</p>
            )}

            <div className="so-lista">
              {productosVisibles.map((p) => (
                <button key={p.id} type="button" className="so-item" onClick={() => agregarProducto(p)}>
                  <span className="so-item-info">
                    <span className="so-item-nombre">{p.nombre_comercial}</span>
                    <span className="so-item-sub">{p.laboratorio || p.marcas?.nombre || ''}</span>
                  </span>
                  <span className="so-item-precio">${formatUSD(p.precio_usd)}</span>
                  <Plus size={16} />
                </button>
              ))}
            </div>

            {filas.length === 0 ? (
              <p className="so-aviso so-aviso--grande">Busca un producto para empezar a facturar</p>
            ) : (
              <div className="so-filas">
                {filas.map((f) => (
                  <div key={f.producto_id} className="so-fila">
                    <div className="so-fila-info">
                      <p className="so-fila-nombre">{f.nombre}</p>
                      <p className="so-fila-precio">${formatUSD(f.precio_usd)} c/u</p>
                    </div>
                    <div className="so-stepper">
                      <button type="button" onClick={() => cambiarCantidad(f.producto_id, -1)}><Minus size={14} /></button>
                      <span>{f.cantidad}</span>
                      <button type="button" onClick={() => cambiarCantidad(f.producto_id, 1)}><Plus size={14} /></button>
                    </div>
                    <span className="so-fila-subtotal">${formatUSD(f.precio_usd * f.cantidad)}</span>
                    <button type="button" className="so-fila-quitar" onClick={() => quitarFila(f.producto_id)}><X size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="so-footer">
            <div className="so-footer-pago">
              <span>Forma de pago</span>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </select>
            </div>

            <div className="so-footer-total">
              <span>Total</span>
              <span>${formatUSD(total)}</span>
            </div>

            <button
              type="button"
              className="so-crear-btn"
              onClick={crearOrden}
              disabled={filas.length === 0 || creando}
            >
              {creando ? 'Creando orden...' : `Crear orden · $${formatUSD(total)}`}
            </button>
          </div>
        </>
      )}

      {ordenCreada && (
        <div className="so-exito">
          <p>Orden <strong>#{ordenCreada.id}</strong> creada para {cliente?.nombre}.</p>
          <button type="button" onClick={nuevaOrden}>Crear otra orden</button>
        </div>
      )}
    </div>
    </LayoutDepartamento>
  )
}

export default StaffOrdenes
