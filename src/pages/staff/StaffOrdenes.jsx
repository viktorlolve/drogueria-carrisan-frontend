import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, Plus, Minus, X, Printer, Download, RotateCcw,
  Store, Truck, Send, Package, CheckCircle2, ChevronRight,
} from 'lucide-react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import './StaffOrdenes.css'
import { useStaffUI } from '../../hooks/useStaffUI'
import { formatearUSD } from '../../utils/formato'
import { costoEnvioParaCiudad } from '../../utils/costoEnvio'

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TIPOS_ENVIO = [
  { id: 'retiro', label: 'Retiro en tienda', detalle: 'El cliente pasa a buscarlo', icono: Store },
  { id: 'delivery', label: 'Delivery', detalle: 'Entrega en una dirección', icono: Truck },
  { id: 'envio_nacional', label: 'Envío nacional', detalle: 'Por agencia de encomiendas', icono: Send },
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
  const [tarifasDelivery, setTarifasDelivery] = useState([])

  const [queryProducto, setQueryProducto] = useState('')
  const [resultadosProductos, setResultadosProductos] = useState([])
  const [buscandoProductos, setBuscandoProductos] = useState(false)
  const [filas, setFilas] = useState([])

  const [formaPago, setFormaPago] = useState('contado')
  const [creando, setCreando] = useState(false)
  const [mensaje, setMensaje] = useState(null) // { tipo: 'exito'|'error', texto }
  const [ordenCreada, setOrdenCreada] = useState(null)
  const [generandoGuia, setGenerandoGuia] = useState(false)
  const [descargandoOrden, setDescargandoOrden] = useState(false)

  const debounceCliente = useRef(null)
  const seqCliente = useRef(0)
  const seqProducto = useRef(0)
  const { avisar } = useStaffUI()
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
      const id = ++seqCliente.current
      setBuscandoClientes(true)
      try {
        const { data } = await staffApi.get('/staff/clientes', {
          params: { buscar: queryCliente.trim() },
        })
        if (id === seqCliente.current) setResultadosClientes(data?.clientes || data || [])
      } catch (err) {
        console.error('Error buscando clientes', err)
        if (id !== seqCliente.current) return
        setResultadosClientes([])
        avisar(err.response?.data?.error || 'No se pudo buscar clientes. Intenta de nuevo.', 'error')
      } finally {
        if (id === seqCliente.current) setBuscandoClientes(false)
      }
    }, 300)

    return () => clearTimeout(debounceCliente.current)
  }, [queryCliente, avisar])

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
      .catch((err) => {
        if (!activo) return
        setDirecciones([])
        setDireccionId('')
        avisar(err.response?.data?.error || 'No se pudieron cargar las direcciones del cliente', 'error')
      })
    return () => {
      activo = false
    }
  }, [cliente, tipoEnvio, avisar])

  // Tarifas de delivery. El envío lo cobra el BACKEND al crear la orden; esto
  // es solo para que el total que ve el vendedor sea el mismo que queda en la
  // orden (misma regla: utils/costoEnvio.js).
  useEffect(() => {
    staffApi.get('/delivery-tarifas/activas')
      .then(({ data }) => setTarifasDelivery(Array.isArray(data) ? data : []))
      .catch(() => setTarifasDelivery([]))
  }, [])

  // Búsqueda de productos
  useEffect(() => {
    if (debounceProducto.current) clearTimeout(debounceProducto.current)

    if (queryProducto.trim().length < 1) return

    debounceProducto.current = setTimeout(async () => {
      const id = ++seqProducto.current
      setBuscandoProductos(true)
      try {
        const { data } = await staffApi.get('/staff/productos', {
          params: { buscar: queryProducto.trim() },
        })
        if (id === seqProducto.current) setResultadosProductos(data.slice(0, 8))
      } catch (err) {
        console.error('Error buscando productos', err)
        if (id !== seqProducto.current) return
        setResultadosProductos([])
        avisar(err.response?.data?.error || 'No se pudo buscar productos. Intenta de nuevo.', 'error')
      } finally {
        if (id === seqProducto.current) setBuscandoProductos(false)
      }
    }, 250)

    return () => clearTimeout(debounceProducto.current)
  }, [queryProducto, avisar])

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
  const totalItems = filas.reduce((acc, f) => acc + f.cantidad, 0)

  const direccionSeleccionada = direcciones.find((d) => String(d.id) === String(direccionId)) || null
  const costoEnvio = tipoEnvio === 'delivery'
    ? costoEnvioParaCiudad(tarifasDelivery, direccionSeleccionada?.ciudad)
    : 0
  const totalConEnvio = Math.round((total + costoEnvio) * 100) / 100

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
      // `direcciones_envio.id` es UUID: NO convertirlo a Number (Number(uuid)
      // da NaN → JSON null → la orden quedaba sin dirección de entrega).
      if (tipoEnvio === 'delivery' && direccionId) payload.direccion_envio_id = direccionId
      if (tipoEnvio === 'envio_nacional' && agenciaEnvio) payload.agencia_envio = agenciaEnvio

      const { data } = await staffApi.post('/staff/ordenes', payload)
      setOrdenCreada(data)
      setFilas([])
      setMensaje({ tipo: 'exito', texto: `Orden #${data.id} creada por ${formatearUSD(data.total_usd || total)}` })
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo crear la orden' })
    } finally {
      setCreando(false)
    }
  }

  // Guía de despacho: la usa el motorizado / la agencia. Se genera con los
  // datos del envío que trae la orden recién creada (el endpoint la devuelve
  // con cliente, dirección y agencia ya embebidos).
  async function imprimirGuiaDespacho() {
    if (!ordenCreada) return
    setGenerandoGuia(true)
    try {
      const { exportarGuiaDespacho } = await import('../../utils/exportUtils')
      await exportarGuiaDespacho(ordenCreada)
    } catch (err) {
      console.error('Error al generar la guía de despacho', err)
      avisar('No se pudo generar la guía de despacho', 'error')
    } finally {
      setGenerandoGuia(false)
    }
  }

  // PDF de la orden (el mismo generador que el cliente ve en /orders/:id y el
  // staff en la cola de pedidos), cargado bajo demanda.
  async function descargarOrdenPDF() {
    if (!ordenCreada) return
    setDescargandoOrden(true)
    try {
      const { default: generarOrdenPDF } = await import('../../utils/generarOrdenPDF')
      await generarOrdenPDF({ orden: ordenCreada, cliente: null })
    } catch (err) {
      console.error('Error al generar el PDF de la orden', err)
      avisar('No se pudo generar el PDF de la orden', 'error')
    } finally {
      setDescargandoOrden(false)
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

  // Barra fija inferior (solo móvil/tablet angosto): atajo para confirmar sin
  // tener que bajar hasta el resumen cuando ya hay cliente y productos.
  const mostrarBarraMovil = !ordenCreada && cliente && filas.length > 0

  return (
    <LayoutDepartamento departamento="comercial" activo="ordenes" titulo="Crear orden a cliente">
      <div className={`so-page ${mostrarBarraMovil ? 'so-page--con-barra' : ''}`}>
        {mensaje?.tipo === 'error' && (
          <div className="so-mensaje so-mensaje--error">{mensaje.texto}</div>
        )}

        {ordenCreada ? (
          <div className="so-exito">
            <span className="so-exito-icono"><CheckCircle2 size={30} /></span>
            <p className="so-exito-titulo">Orden #{ordenCreada.id} creada</p>
            <p className="so-exito-sub">
              Para <strong>{ordenCreada.usuario?.nombre || 'el cliente'}</strong> · {formatearUSD(ordenCreada.total_usd || total)}
            </p>

            <div className="so-exito-acciones">
              <button
                type="button"
                className="so-exito-btn so-exito-btn--primario"
                onClick={imprimirGuiaDespacho}
                disabled={generandoGuia}
              >
                <Printer size={16} aria-hidden="true" />
                {generandoGuia ? 'Generando guía...' : 'Imprimir guía de despacho'}
              </button>
              <button
                type="button"
                className="so-exito-btn"
                onClick={descargarOrdenPDF}
                disabled={descargandoOrden}
              >
                <Download size={16} aria-hidden="true" />
                {descargandoOrden ? 'Generando PDF...' : 'Descargar orden (PDF)'}
              </button>
              <button type="button" className="so-exito-btn so-exito-btn--fantasma" onClick={nuevaOrden}>
                <RotateCcw size={16} aria-hidden="true" />
                Crear otra orden
              </button>
            </div>
          </div>
        ) : (
          <div className="so-grid">
            <div className="so-main">
              {/* Paso 1 · Cliente */}
              <section className={`so-card ${cliente ? 'so-card--resuelta' : ''}`}>
                <div className="so-card-cabecera">
                  <span className={`so-paso-num ${cliente ? 'so-paso-num--ok' : ''}`}>
                    {cliente ? <CheckCircle2 size={16} /> : 1}
                  </span>
                  <h2 className="so-card-titulo">Cliente</h2>
                </div>

                {cliente ? (
                  <div className="so-cliente-elegido">
                    <span className="so-avatar">{(cliente.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
                    <span className="so-cliente-elegido-info">
                      <strong>{cliente.nombre || 'Sin nombre'}</strong>
                      <span>{cliente.email}{cliente.rif_cedula ? ` · ${cliente.rif_cedula}` : ''}</span>
                    </span>
                    <button
                      type="button"
                      className="so-link-btn"
                      onClick={() => { setCliente(null); setFilas([]); setDirecciones([]); setDireccionId('') }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <>
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

                    {clientesVisibles.length > 0 && (
                      <div className="so-lista">
                        {clientesVisibles.map((c) => (
                          <button key={c.id} type="button" className="so-item" onClick={() => seleccionarCliente(c)}>
                            <span className="so-avatar">{(c.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
                            <span className="so-item-info">
                              <span className="so-item-nombre">{c.nombre || 'Sin nombre'}</span>
                              <span className="so-item-sub">{c.email}{c.rif_cedula ? ` · ${c.rif_cedula}` : ''}</span>
                            </span>
                            <ChevronRight size={16} className="so-item-flecha" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>

              {cliente && (
                <>
                  {/* Paso 2 · Envío */}
                  <section className="so-card">
                    <div className="so-card-cabecera">
                      <span className="so-paso-num">2</span>
                      <h2 className="so-card-titulo">Tipo de envío</h2>
                    </div>

                    <div className="so-tipos">
                      {TIPOS_ENVIO.map((t) => {
                        const Icono = t.icono
                        const activo = tipoEnvio === t.id
                        return (
                          <button
                            key={t.id}
                            type="button"
                            className={`so-tipo ${activo ? 'so-tipo--activo' : ''}`}
                            onClick={() => cambiarTipoEnvio(t.id)}
                          >
                            {activo && <CheckCircle2 size={15} className="so-tipo-check" />}
                            <span className="so-tipo-icono"><Icono size={18} /></span>
                            <span className="so-tipo-label">{t.label}</span>
                            <span className="so-tipo-detalle">{t.detalle}</span>
                          </button>
                        )
                      })}
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
                  </section>

                  {/* Paso 3 · Productos */}
                  <section className="so-card">
                    <div className="so-card-cabecera">
                      <span className="so-paso-num">3</span>
                      <h2 className="so-card-titulo">Productos</h2>
                    </div>

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

                    {productosVisibles.length > 0 && (
                      <div className="so-lista">
                        {productosVisibles.map((p) => (
                          <button key={p.id} type="button" className="so-item" onClick={() => agregarProducto(p)}>
                            <span className="so-item-info">
                              <span className="so-item-nombre">{p.nombre_comercial}</span>
                              <span className="so-item-sub">{p.laboratorio || p.marcas?.nombre || ''}</span>
                            </span>
                            <span className="so-item-precio">${formatUSD(p.precio_usd)}</span>
                            <span className="so-item-agregar"><Plus size={16} /></span>
                          </button>
                        ))}
                      </div>
                    )}

                    {filas.length === 0 ? (
                      <div className="so-vacio">
                        <Package size={26} />
                        <p>Busca un producto para empezar a facturar</p>
                      </div>
                    ) : (
                      <div className="so-filas">
                        {filas.map((f) => (
                          <div key={f.producto_id} className="so-fila">
                            <div className="so-fila-info">
                              <p className="so-fila-nombre">{f.nombre}</p>
                              <p className="so-fila-precio">${formatUSD(f.precio_usd)} c/u</p>
                            </div>
                            <div className="so-stepper">
                              <button type="button" onClick={() => cambiarCantidad(f.producto_id, -1)} aria-label="Quitar uno">
                                <Minus size={14} />
                              </button>
                              <span>{f.cantidad}</span>
                              <button type="button" onClick={() => cambiarCantidad(f.producto_id, 1)} aria-label="Agregar uno">
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="so-fila-subtotal">${formatUSD(f.precio_usd * f.cantidad)}</span>
                            <button
                              type="button"
                              className="so-fila-quitar"
                              onClick={() => quitarFila(f.producto_id)}
                              aria-label="Quitar producto"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            {/* Resumen — sticky en desktop/tablet, al final del flujo en móvil */}
            <aside className="so-aside">
              <div className="so-resumen">
                <h2 className="so-resumen-titulo">Resumen de la orden</h2>

                {!cliente ? (
                  <p className="so-resumen-vacio">Selecciona un cliente para empezar.</p>
                ) : (
                  <>
                    <div className="so-resumen-cliente">
                      <span className="so-avatar so-avatar--sm">{(cliente.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
                      <span className="so-resumen-cliente-nombre">{cliente.nombre || cliente.email}</span>
                    </div>

                    {filas.length === 0 ? (
                      <p className="so-resumen-vacio">Todavía no agregas productos.</p>
                    ) : (
                      <div className="so-resumen-lineas">
                        {filas.map((f) => (
                          <div key={f.producto_id} className="so-resumen-linea">
                            <span className="so-resumen-linea-nombre">{f.cantidad}× {f.nombre}</span>
                            <span className="so-resumen-linea-monto">${formatUSD(f.precio_usd * f.cantidad)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="so-resumen-totales">
                      <div className="so-resumen-fila">
                        <span>Subtotal ({totalItems} {totalItems === 1 ? 'unidad' : 'unidades'})</span>
                        <span>{formatearUSD(total)}</span>
                      </div>
                      {costoEnvio > 0 && (
                        <div className="so-resumen-fila">
                          <span>Envío (delivery)</span>
                          <span>{formatearUSD(costoEnvio)}</span>
                        </div>
                      )}
                      <div className="so-resumen-fila so-resumen-fila--total">
                        <span>Total</span>
                        <span>{formatearUSD(totalConEnvio)}</span>
                      </div>
                    </div>

                    <div className="so-resumen-pago">
                      <span>Forma de pago</span>
                      <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                        <option value="contado">Contado</option>
                        <option value="credito">Crédito</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="so-crear-btn"
                      onClick={crearOrden}
                      disabled={filas.length === 0 || creando}
                    >
                      {creando ? 'Creando orden...' : `Crear orden · ${formatearUSD(totalConEnvio)}`}
                    </button>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      {mostrarBarraMovil && (
        <div className="so-barra-movil">
          <span className="so-barra-movil-info">
            <strong>{formatearUSD(totalConEnvio)}</strong>
            <span>{totalItems} {totalItems === 1 ? 'unidad' : 'unidades'}</span>
          </span>
          <button type="button" onClick={crearOrden} disabled={creando}>
            {creando ? 'Creando...' : 'Crear orden'}
          </button>
        </div>
      )}
    </LayoutDepartamento>
  )
}

export default StaffOrdenes