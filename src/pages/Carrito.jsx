import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
import { useEnvio } from '../context/EnvioContext'
import { useAuth } from '../context/AuthContext'
import HomeCarrusel from '../components/HomeCarrusel'
import ConfirmarPedidoModal from '../components/ConfirmarPedidoModal'
import InfoDespacho from '../components/InfoDespacho'
import FilasConfianza from '../components/FilasConfianza'
import './Carrito.css'

function formatUSD(valor) {
  return valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatVES(valor) {
  return valor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function CartLine({ item, tasaVes, onUpdateCantidad, onRemove }) {
  const { producto, cantidad } = item
  const subtotalUsd = producto.precio_usd * cantidad

  return (
    <div className="cart-line">
      <div className="cart-line__media">
        {producto.foto_url || producto.imagen ? (
          <img src={producto.foto_url || producto.imagen} alt={producto.nombre_comercial} />
        ) : (
          <div className="cart-line__media-placeholder">Sin imagen</div>
        )}
      </div>

      <div className="cart-line__body">
        <p className="cart-line__vendedor">Vendido por <strong>Droguería Carrisan</strong></p>
        <h3 className="cart-line__nombre">{producto.nombre_comercial}</h3>
        {producto.laboratorio && (
          <p className="cart-line__meta">{producto.laboratorio}</p>
        )}
        <div className="cart-line__precio-row">
          <span className="cart-line__precio-usd">${formatUSD(producto.precio_usd)}</span>
          {tasaVes && (
            <span className="cart-line__precio-ves">Bs. {formatVES(producto.precio_usd * tasaVes)}</span>
          )}
        </div>
        <div className="cart-line__actions">
          <button type="button" className="cart-line__link cart-line__link--danger" onClick={() => onRemove(producto.id)}>
            Eliminar
          </button>
          <div className="cart-line__stepper">
            <button type="button" className="cart-line__stepper-btn" onClick={() => onUpdateCantidad(producto.id, cantidad - 1)} aria-label="Disminuir cantidad">−</button>
            <span className="cart-line__stepper-value">{cantidad}</span>
            <button type="button" className="cart-line__stepper-btn" onClick={() => onUpdateCantidad(producto.id, cantidad + 1)} aria-label="Aumentar cantidad">+</button>
          </div>
        </div>
        <p className="cart-line__subtotal">Subtotal: <strong>${formatUSD(subtotalUsd)}</strong></p>
      </div>
    </div>
  )
}

// Componente DireccionSelector (se mantiene igual)
function DireccionSelector({ 
  direcciones, 
  direccionSeleccionada, 
  onSeleccionar, 
  onAgregar,
  loading,
  tipo 
}) {
  const [mostrarPanel, setMostrarPanel] = useState(false)
  const [paso, setPaso] = useState(1)
  const [nuevaDireccion, setNuevaDireccion] = useState({
    nombre: '',
    direccion: '',
    ciudad: '',
    estado: tipo === 'delivery' ? 'Carabobo' : '',
    telefono_contacto: '',
    referencia: '',
    agencia_preferida: ''
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const CIUDADES_DELIVERY = ['Valencia', 'Naguanagua', 'San Diego', 'Guacara', 'Los Guayos']

  const handleAgregar = async (e) => {
    e.preventDefault()
    
    if (!nuevaDireccion.nombre || !nuevaDireccion.direccion) {
      setError('Nombre y dirección son requeridos')
      return
    }

    if (tipo === 'delivery' && !nuevaDireccion.ciudad) {
      setError('Selecciona una ciudad')
      return
    }

    setGuardando(true)
    setError('')

    try {
      await onAgregar({
        ...nuevaDireccion,
        estado: tipo === 'delivery' ? 'Carabobo' : nuevaDireccion.estado,
        tipo_direccion: tipo
      })
      setPaso(2)
      setTimeout(() => {
        setMostrarPanel(false)
        setPaso(1)
        setNuevaDireccion({
          nombre: '',
          direccion: '',
          ciudad: '',
          estado: tipo === 'delivery' ? 'Carabobo' : '',
          telefono_contacto: '',
          referencia: '',
          agencia_preferida: ''
        })
      }, 1500)
    } catch {
      setError('Error al guardar la dirección')
    } finally {
      setGuardando(false)
    }
  }

  // 🆕 Cuando se selecciona una dirección, notificar al padre
  const handleSeleccionarDireccion = (dir) => {
    onSeleccionar(dir)
    // El padre (Carrito) se encargará de cerrar el panel
  }

  if (loading) {
    return (
      <div className="direccion-loading">
        <div className="direccion-loading__spinner"></div>
        <span>Cargando direcciones...</span>
      </div>
    )
  }

  return (
    <div className="direccion-selector">
      {direcciones.length > 0 && (
        <div className="direccion-lista">
          <p className="direccion-lista__titulo">Selecciona una dirección</p>
          {direcciones.map((dir) => (
            <label 
              key={dir.id} 
              className={`direccion-radio ${direccionSeleccionada?.id === dir.id ? 'direccion-radio--selected' : ''}`}
            >
              <input
                type="radio"
                name="direccion"
                checked={direccionSeleccionada?.id === dir.id}
                onChange={() => handleSeleccionarDireccion(dir)}
              />
              <div className="direccion-radio__content">
                <div className="direccion-radio__header">
                  <span className="direccion-radio__nombre">{dir.nombre}</span>
                  {dir.telefono_contacto && (
                    <span className="direccion-radio__telefono">{dir.telefono_contacto}</span>
                  )}
                </div>
                <p className="direccion-radio__direccion">{dir.direccion}</p>
                <div className="direccion-radio__meta">
                  {dir.ciudad && <span>📍 {dir.ciudad}{dir.estado ? `, ${dir.estado}` : ''}</span>}
                  {dir.agencia_preferida && <span>🚚 {dir.agencia_preferida}</span>}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      <button 
        type="button" 
        className="direccion-add-btn"
        onClick={() => setMostrarPanel(true)}
      >
        <span className="direccion-add-btn__icon">+</span>
        {direcciones.length === 0 ? 'Agregar dirección de entrega' : 'Agregar otra dirección'}
      </button>

      {mostrarPanel && (
        <>
          <div className="direccion-overlay" onClick={() => setMostrarPanel(false)} />
          <div className="direccion-panel">
            <div className="direccion-panel__handle" />
            
            {paso === 1 ? (
              <>
                <div className="direccion-panel__header">
                  <h3>Nueva dirección {tipo === 'envio_nacional' ? 'nacional' : 'de delivery'}</h3>
                  <button className="direccion-panel__close" onClick={() => setMostrarPanel(false)}>✕</button>
                </div>

                <form onSubmit={handleAgregar} className="direccion-panel__form">
                  {error && <div className="direccion-error">{error}</div>}

                  <div className="direccion-input-group">
                    <label>Nombre de la dirección *</label>
                    <input type="text" value={nuevaDireccion.nombre} onChange={(e) => setNuevaDireccion({...nuevaDireccion, nombre: e.target.value})} placeholder="Ej: Casa, Oficina, Consultorio" required />
                  </div>

                  <div className="direccion-input-group">
                    <label>Dirección completa *</label>
                    <textarea value={nuevaDireccion.direccion} onChange={(e) => setNuevaDireccion({...nuevaDireccion, direccion: e.target.value})} placeholder="Calle, número, urbanización, punto de referencia" required rows="2" />
                  </div>

                  {tipo === 'delivery' ? (
                    <div className="direccion-input-row">
                      <div className="direccion-input-group">
                        <label>Ciudad *</label>
                        <select value={nuevaDireccion.ciudad} onChange={(e) => setNuevaDireccion({...nuevaDireccion, ciudad: e.target.value})} required>
                          <option value="">Seleccionar</option>
                          {CIUDADES_DELIVERY.map(ciudad => (
                            <option key={ciudad} value={ciudad}>{ciudad}</option>
                          ))}
                        </select>
                      </div>
                      <div className="direccion-input-group">
                        <label>Estado</label>
                        <input type="text" value="Carabobo" disabled className="direccion-input-disabled" />
                      </div>
                    </div>
                  ) : (
                    <div className="direccion-input-row">
                      <div className="direccion-input-group">
                        <label>Ciudad</label>
                        <input type="text" value={nuevaDireccion.ciudad} onChange={(e) => setNuevaDireccion({...nuevaDireccion, ciudad: e.target.value})} placeholder="Ciudad" />
                      </div>
                      <div className="direccion-input-group">
                        <label>Estado</label>
                        <input type="text" value={nuevaDireccion.estado} onChange={(e) => setNuevaDireccion({...nuevaDireccion, estado: e.target.value})} placeholder="Estado" />
                      </div>
                    </div>
                  )}

                  <div className="direccion-input-group">
                    <label>Teléfono de contacto</label>
                    <input type="text" value={nuevaDireccion.telefono_contacto} onChange={(e) => setNuevaDireccion({...nuevaDireccion, telefono_contacto: e.target.value})} placeholder="Ej: +58 414-1234567" />
                  </div>

                  <div className="direccion-input-group">
                    <label>Referencia (opcional)</label>
                    <input type="text" value={nuevaDireccion.referencia} onChange={(e) => setNuevaDireccion({...nuevaDireccion, referencia: e.target.value})} placeholder="Color de casa, punto de referencia, etc." />
                  </div>

                  {tipo === 'envio_nacional' && (
                    <div className="direccion-input-group">
                      <label>Agencia de envío preferida</label>
                      <select value={nuevaDireccion.agencia_preferida} onChange={(e) => setNuevaDireccion({...nuevaDireccion, agencia_preferida: e.target.value})} className="direccion-select-agencia">
                        <option value="">Seleccionar agencia</option>
                        <option value="MRW">MRW</option>
                        <option value="Domesa">Domesa</option>
                        <option value="Tealca">Tealca</option>
                        <option value="Zoom">Zoom</option>
                        <option value="Servientrega">Servientrega</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  )}

                  <button type="submit" className="direccion-submit-btn" disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar dirección'}
                  </button>
                </form>
              </>
            ) : (
              <div className="direccion-success">
                <div className="direccion-success__icon">✅</div>
                <h3>¡Dirección guardada!</h3>
                <p>Tu dirección ha sido agregada correctamente</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}


// Resumen del pedido (columna derecha del carrito, sidebar)
function ResumenPedido({
  cantidadArticulos,
  total,
  opcionActual,
  esDelivery,
  costoEnvio,
  textoCostoEnvio,
  totalConEnvio,
  totalVes,
  superaLineaCredito,
  excedente,
  creditoBloqueado,
  ordenesVencidas,
  creditoHabilitado,
  saldoDisponible,
  cuponAplicado,
  descuentoCupon,
  codigoCuponInput,
  setCodigoCuponInput,
  verificandoCupon,
  errorCupon,
  aplicarCupon,
  quitarCupon,
  error,
  handleConfirmar,
  tipoEnvio
}) {
  return (
    <div className="cart-resumen-sidebar">
      <div className="cart-resumen-sticky">
        {/* El CTA va primero: es lo único accionable del resumen y así queda
            siempre visible aunque la tarjeta scrollee por dentro. */}
        <button
          type="button"
          className="carrito-bottombar__cta carrito-bottombar__cta--sidebar"
          onClick={handleConfirmar}
          disabled={superaLineaCredito}
        >
          Confirmar pedido
        </button>

        {error && <p className="carrito-error carrito-error--sidebar">{error}</p>}

        <div className="cart-resumen-divider-top" />

        <h2 className="cart-summary__title">Resumen del pedido</h2>

        <div className="cart-summary__row">
          <span>Subtotal ({cantidadArticulos} {cantidadArticulos === 1 ? 'artículo' : 'artículos'})</span>
          <span>${formatUSD(total)}</span>
        </div>

        <div className="cart-summary__row">
          <span>{opcionActual?.label || 'Envío'}</span>
          <span className={esDelivery && costoEnvio === 0 ? 'cart-summary__gratis' : ''}>
            {textoCostoEnvio}
          </span>
        </div>

        {opcionActual?.id === 'envio_nacional' && (
          <div className="cart-summary__row cart-summary__row--muted">
            <span>Envío nacional</span>
            <span>Pago en destino</span>
          </div>
        )}

        {cuponAplicado && (
          <div className="cart-summary__row cart-summary__row--cupon">
            <span>Cupón {cuponAplicado.codigo}</span>
            <span>-${formatUSD(descuentoCupon)}</span>
          </div>
        )}

        <div className="cart-summary__divider" />

        <div className="cart-summary__row cart-summary__row--total">
          <span>Total estimado</span>
          <div className="cart-summary__total-values">
            <span className="cart-summary__total-usd">${formatUSD(totalConEnvio)}</span>
            {totalVes && <span className="cart-summary__total-ves">Bs. {formatVES(totalVes)}</span>}
          </div>
        </div>

        {superaLineaCredito && (
          <div className="cart-condicion-bloqueada">
            <span className="cart-condicion-bloqueada__icono">⛔</span>
            <div>
              <strong>Superó su línea de crédito</strong>
              <p>
                Este pedido excede tu saldo disponible en <strong>${formatUSD(excedente)}</strong>. Ajusta el carrito o
                comunícate con la empresa para ampliar tu línea.
              </p>
            </div>
          </div>
        )}

        {creditoBloqueado && (
          <div className="cart-alerta-vencidas">
            <span className="cart-alerta-vencidas__icono">⚠️</span>
            <div>
              <strong>Tu línea de crédito está suspendida</strong>
              <p>No puedes pagar a crédito hasta que la empresa regularice tu cuenta. Podés seguir comprando de contado.</p>
              <Link to="/ayuda" className="cart-alerta-vencidas__link">Contactar a la empresa →</Link>
            </div>
          </div>
        )}

        {ordenesVencidas > 0 && (
          <div className="cart-alerta-vencidas">
            <span className="cart-alerta-vencidas__icono">⚠️</span>
            <div>
              <strong>Tenés {ordenesVencidas} {ordenesVencidas === 1 ? 'orden vencida' : 'órdenes vencidas'}</strong>
              <p>Tu línea de crédito está pausada hasta que regularices tu cuenta. Podés seguir comprando de contado.</p>
              <Link to="/estado-cuenta" className="cart-alerta-vencidas__link">Ir a reportar pago →</Link>
            </div>
          </div>
        )}

        <div className="cart-forma-pago">
          <p className="cart-forma-pago__titulo">Condición Comercial</p>
          <div className="cart-forma-pago__opciones">
            {creditoHabilitado ? (
              <div className="cart-forma-pago__opcion cart-forma-pago__opcion--activa cart-forma-pago__opcion--fija">
                <span className="cart-forma-pago__opcion-titulo">Mi Línea de Crédito</span>
                <span className="cart-forma-pago__opcion-desc">Saldo disponible: ${formatUSD(saldoDisponible)}</span>
              </div>
            ) : (
              <div className="cart-forma-pago__opcion cart-forma-pago__opcion--activa cart-forma-pago__opcion--fija">
                <span className="cart-forma-pago__opcion-titulo">Contado</span>
                <span className="cart-forma-pago__opcion-desc">Debes cancelar el pedido cuando esté confirmado para su entrega</span>
              </div>
            )}
          </div>
        </div>

        {/* Cupón de descuento */}
        <div className="cart-cupon">
          {cuponAplicado ? (
            <div className="cart-cupon__aplicado">
              <div className="cart-cupon__aplicado-info">
                <span className="cart-cupon__aplicado-nombre">Cupón {cuponAplicado.codigo}</span>
                <span className="cart-cupon__aplicado-descuento">-${formatUSD(descuentoCupon)}</span>
              </div>
              <button type="button" className="cart-cupon__quitar" onClick={quitarCupon}>Quitar</button>
            </div>
          ) : (
            <>
              <p className="cart-cupon__titulo">¿Tenés un cupón de descuento?</p>
              <div className="cart-cupon__row">
                <input
                  type="text"
                  className="cart-cupon__input"
                  placeholder="Ingresa tu código"
                  value={codigoCuponInput}
                  onChange={(e) => setCodigoCuponInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && aplicarCupon()}
                  disabled={verificandoCupon}
                />
                <button
                  type="button"
                  className="cart-cupon__btn"
                  onClick={aplicarCupon}
                  disabled={verificandoCupon}
                >
                  {verificandoCupon ? 'Verificando…' : 'Aplicar'}
                </button>
              </div>
              {errorCupon && <p className="cart-cupon__error">{errorCupon}</p>}
            </>
          )}
        </div>

        {/* Beneficios + horario estimado de despacho/retiro */}
        <div className="cart-benefits">
          <InfoDespacho tipoEnvio={tipoEnvio} />

          <div className="cart-benefits__item">
            <span className="cart-benefits__icon">🛡️</span>
            <div className="cart-benefits__text">
              <strong>Calidad certificada</strong>
              Todos los productos cuentan con registro sanitario vigente.
            </div>
          </div>
        </div>

        {/* Garantías + política de devoluciones */}
        <FilasConfianza />
      </div>
    </div>
  )
}

function Carrito() {
  const { items, updateCantidad, removeItem, clearCart, total } = useCart()
  const { user } = useAuth()
  const {
    tipoEnvio,
    cambiarTipoEnvio,
    opcionesEnvio,
    opcionActual,
    direcciones,
    direccionSeleccionada,
    setDireccionSeleccionada,
    agenciaSeleccionada,
    guardarDireccion,
    costoEnvio
  } = useEnvio()

  const [tasaVes, setTasaVes] = useState(null)
  const [saldoDisponible, setSaldoDisponible] = useState(null)
  const [lineaCredito, setLineaCredito] = useState(0)
  const [ordenesVencidas, setOrdenesVencidas] = useState(0)
  const [creditoBloqueado, setCreditoBloqueado] = useState(false)
  const [error, setError] = useState('')
  const [envioExpandido, setEnvioExpandido] = useState(false)
  const [ofertas, setOfertas] = useState([])
  const [productosRecientes, setProductosRecientes] = useState([])
  const [cargandoCarruseles, setCargandoCarruseles] = useState(true)
  const [tieneSubUsuarios, setTieneSubUsuarios] = useState(false)
  const [modalConfirmarAbierto, setModalConfirmarAbierto] = useState(false)
  const [codigoCuponInput, setCodigoCuponInput] = useState('')
  const [cuponAplicado, setCuponAplicado] = useState(null)
  const [verificandoCupon, setVerificandoCupon] = useState(false)
  const [errorCupon, setErrorCupon] = useState('')
  
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get('/prices')
      .then((res) => setTasaVes(res.data.usd_a_ves))
      .catch(() => setTasaVes(null))
  }, [])

  // Traemos el saldo de crédito disponible del cliente (linea_credito - deuda)
  // y si tiene órdenes vencidas — con vencidas, la línea de crédito se
  // bloquea para compras nuevas hasta que regularice (contado no se ve
  // afectado). Si el usuario no tiene línea de crédito asignada (0 o
  // null), simplemente nunca alcanzará el total y la opción no se ofrece.
  useEffect(() => {
    if (!user?.id) return
    api
      .get(`/clientes/${user.id}/estado-cuenta`)
      .then((res) => {
        setSaldoDisponible(res.data.resumen.saldo)
        setLineaCredito(res.data.resumen.linea_credito || 0)
        setOrdenesVencidas(res.data.resumen.cantidad_ordenes_vencidas || 0)
        setCreditoBloqueado(res.data.resumen.credito_bloqueado || false)
      })
      .catch(() => setSaldoDisponible(null))
  }, [user?.id])

  // Condición comercial auto-decidida: si el cliente tiene línea de crédito
  // y el saldo cubre el pedido, la compra va a crédito; si lo sobrepasa,
  // la compra queda bloqueada (solo quitando productos o contactando a la
  // empresa). Sin línea (o con crédito suspendido), se paga de contado.
  const descuentoCupon = cuponAplicado
    ? Math.min(
        cuponAplicado.tipo === 'porcentaje'
          ? (total * Number(cuponAplicado.valor)) / 100
          : Number(cuponAplicado.valor),
        total
      )
    : 0
  const totalConDescuento = Math.round((total - descuentoCupon) * 100) / 100
  const totalConEnvio = totalConDescuento + costoEnvio
  // El envío solo muestra monto en delivery (tiene tarifas). En retiro y envío
  // nacional el campo de costo se deja en blanco (no se cobra, aunque el total
  // lógicamente lo sume como 0).
  const esDelivery = tipoEnvio === 'delivery'
  const textoCostoEnvio = esDelivery
    ? (costoEnvio === 0 ? 'Gratis' : `$${formatUSD(costoEnvio)}`)
    : ''
  const tieneLineaCredito = lineaCredito > 0
  const creditoHabilitado = tieneLineaCredito && saldoDisponible !== null && ordenesVencidas === 0 && !creditoBloqueado
  const creditoApto = creditoHabilitado && saldoDisponible >= totalConEnvio
  const superaLineaCredito = creditoHabilitado && saldoDisponible < totalConEnvio
  const excedente = superaLineaCredito && saldoDisponible !== null ? totalConEnvio - saldoDisponible : 0
  const formaPago = creditoApto ? 'credito' : 'contado'

  // El panel de envío se mantiene abierto mientras el tipo seleccionado exija
  // una dirección y aún no se haya elegido (derivado, evita setState-en-effect).
  const envioAbierto = envioExpandido || (opcionActual?.requiereDireccion && !direccionSeleccionada)

  // Cargar productos para los carruseles
  useEffect(() => {
    api
      .get('/products')
      .then((res) => {
        const activos = res.data.filter((p) => p.activo)
        setOfertas(activos.filter((p) => p.descuento_activo).slice(0, 12))
        setProductosRecientes(activos.slice(0, 12))
      })
      .catch(() => {})
      .finally(() => setCargandoCarruseles(false))
  }, [])

  // Detecta si la cuenta tiene sub-usuarios activos configurados, para
  // saber si ConfirmarPedidoModal debe abrir pidiendo el PIN primero.
  useEffect(() => {
    api
      .get('/subusuarios')
      .then(({ data }) => setTieneSubUsuarios(data.some((s) => s.activo)))
      .catch(() => setTieneSubUsuarios(false))
  }, [])

  // 🆕 Cerrar panel SOLO cuando se selecciona una dirección (no al cambiar tipo de envío)
    const handleCambiarTipoEnvio = (tipo) => {
    cambiarTipoEnvio(tipo) // Esto actualiza el contexto global
    setEnvioExpandido(true) // Expandir para configurar
  }

  const handleSeleccionarDireccion = (dir) => {
    setDireccionSeleccionada(dir)
    setEnvioExpandido(false) // Colapsar después de seleccionar
  }

  function handleConfirmar() {
    setError('')

    if (superaLineaCredito) {
      setError('Superó su línea de crédito. Ajusta el monto de tu pedido o contacta a la empresa.')
      return
    }

    if (opcionActual?.requiereDireccion && !direccionSeleccionada) {
      setError('Debes seleccionar una dirección de entrega')
      setEnvioExpandido(true)
      return
    }

    if (opcionActual?.requiereAgencia && !agenciaSeleccionada) {
      setError('Debes seleccionar una agencia de envío')
      setEnvioExpandido(true)
      return
    }

    setModalConfirmarAbierto(true)
  }

  async function aplicarCupon() {
    const codigo = codigoCuponInput.trim().toUpperCase()
    if (!codigo) return
    setVerificandoCupon(true)
    setErrorCupon('')
    try {
      const { data } = await api.post('/cupones/verificar', { codigo })
      if (data.valido) {
        setCuponAplicado(data.cupon)
        setCodigoCuponInput('')
      } else {
        setErrorCupon(data.error || 'Cupón no válido')
      }
    } catch (err) {
      setErrorCupon(err.response?.data?.error || 'No pudimos verificar el cupón')
    } finally {
      setVerificandoCupon(false)
    }
  }

  function quitarCupon() {
    setCuponAplicado(null)
    setErrorCupon('')
  }

  // Invocado por ConfirmarPedidoModal: si la cuenta tiene sub-usuarios
  // activos, solo se llama después de verificar el PIN — nunca antes.
  async function crearOrden(subUsuarioIdResuelto) {
    const payload = {
      items: items.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
      })),
      tipo_envio: tipoEnvio,
      direccion_envio_id: direccionSeleccionada?.id || null,
      agencia_envio: agenciaSeleccionada || null,
      forma_pago: formaPago,
      sub_usuario_id: subUsuarioIdResuelto,
      codigo_cupon: cuponAplicado?.codigo || null,
    }
    await api.post('/orders', payload)
  }

  function cerrarModalConExito() {
    setModalConfirmarAbierto(false)
    clearCart()
    navigate('/')
  }

  const cantidadArticulos = items.reduce((acc, item) => acc + item.cantidad, 0)
  const totalVes = tasaVes ? totalConEnvio * tasaVes : null


  if (items.length === 0) {
    return (
      <div className="carrito-page carrito-page--vacio">
        <div className="carrito-vacio">
          <div className="carrito-vacio__icon">🛒</div>
          <h1>Tu carrito está vacío</h1>
          <p>Agrega productos del catálogo para verlos aquí.</p>
          <Link to="/catalogo" className="carrito-vacio__cta">Ir al catálogo</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="carrito-page">
      <div className="carrito-container">
        <h1 className="carrito-title">Carrito ({cantidadArticulos} {cantidadArticulos === 1 ? 'artículo' : 'artículos'})</h1>

        {/* 🆕 Layout de 2 columnas */}
        <div className="carrito-layout">
          {/* Columna izquierda: Envío + Productos */}
          <div className="carrito-main">
            {/* Sección de envío colapsable */}
                        <section className="delivery-card">
              <button 
                className="delivery-card__header"
                onClick={() => setEnvioExpandido(!envioExpandido)}
              >
                <span className="delivery-card__header-icon">📦</span>
                <div className="delivery-card__header-text">
                  <h2>Método de envío</h2>
                  {!envioAbierto && opcionActual && (
                    <p className="delivery-card__resumen">
                      <span className="delivery-card__badge delivery-card__badge--tipo">
                        {opcionActual.icono} {opcionActual.label}
                      </span>
                      {direccionSeleccionada && (
                        <span className="delivery-card__badge delivery-card__badge--direccion">
                          📍 {direccionSeleccionada.nombre}
                        </span>
                      )}
                      {esDelivery && (
                        <span className={`delivery-card__badge delivery-card__badge--costo ${
                          costoEnvio === 0 ? 'delivery-card__badge--gratis' : ''
                        }`}>
                          {costoEnvio === 0 ? '✓ Gratis' : `$${costoEnvio.toFixed(2)}`}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <svg 
                  className={`delivery-card__chevron ${envioAbierto ? 'rotated' : ''}`}
                  width="20" height="20" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {envioAbierto && (
                <div className="delivery-card__body">
                  <div className="delivery-tabs">
                    {opcionesEnvio?.map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        className={`delivery-tab ${tipoEnvio === opcion.id ? 'delivery-tab--active' : ''}`}
                        onClick={() => handleCambiarTipoEnvio(opcion.id)}
                      >
                        <span className="delivery-tab__icon">{opcion.icono}</span>
                        <span className="delivery-tab__label">{opcion.label}</span>
                        <span className="delivery-tab__costo">{opcion.textoCosto}</span>
                      </button>
                    ))}
                  </div>

                  {opcionActual?.requiereDireccion && (
                    <DireccionSelector
                      direcciones={direcciones}
                      direccionSeleccionada={direccionSeleccionada}
                      onSeleccionar={handleSeleccionarDireccion}
                      onAgregar={guardarDireccion}
                      tipo={opcionActual.tipoDireccion}
                    />
                  )}
                </div>
              )}
            </section>

            {/* Líneas de producto */}
            <section className="cart-lines">
              <p className="cart-lines__count">
                Vendido y enviado por <strong>Droguería Carrisan</strong>
              </p>
              {items.map((item) => (
                <CartLine
                  key={item.producto.id}
                  item={item}
                  tasaVes={tasaVes}
                  onUpdateCantidad={updateCantidad}
                  onRemove={removeItem}
                />
              ))}
            </section>

            {/* Carruseles de productos */}
            <HomeCarrusel
              titulo="Ofertas del día"
              subtitulo="Descuentos especiales por tiempo limitado"
              productos={ofertas}
              tasaVes={tasaVes}
              cargando={cargandoCarruseles}
              verTodoTo="/catalogo"
            />
            <HomeCarrusel
              titulo="Los más recientes"
              subtitulo="Conocé los últimos productos del catálogo"
              productos={productosRecientes}
              tasaVes={tasaVes}
              cargando={cargandoCarruseles}
              verTodoTo="/catalogo"
            />
          </div>

          {/* Columna derecha: Resumen sticky */}
          <ResumenPedido
            cantidadArticulos={cantidadArticulos}
            total={total}
            opcionActual={opcionActual}
            esDelivery={esDelivery}
            costoEnvio={costoEnvio}
            textoCostoEnvio={textoCostoEnvio}
            totalConEnvio={totalConEnvio}
            totalVes={totalVes}
            superaLineaCredito={superaLineaCredito}
            excedente={excedente}
            creditoBloqueado={creditoBloqueado}
            ordenesVencidas={ordenesVencidas}
            creditoHabilitado={creditoHabilitado}
            saldoDisponible={saldoDisponible}
            cuponAplicado={cuponAplicado}
            descuentoCupon={descuentoCupon}
            codigoCuponInput={codigoCuponInput}
            setCodigoCuponInput={setCodigoCuponInput}
            verificandoCupon={verificandoCupon}
            errorCupon={errorCupon}
            aplicarCupon={aplicarCupon}
            quitarCupon={quitarCupon}
            error={error}
            handleConfirmar={handleConfirmar}
            tipoEnvio={tipoEnvio}
          />
        </div>
      </div>

      {/* 🆕 Barra inferior SOLO para móvil */}
      <div className="carrito-bottombar carrito-bottombar--mobile">
        {superaLineaCredito && (
          <span className="carrito-bottombar__bloqueo">Superó su línea de crédito</span>
        )}
        <div className="carrito-bottombar__fila">
          <span className="carrito-bottombar__label">Subtotal ({cantidadArticulos} {cantidadArticulos === 1 ? 'artículo' : 'artículos'})</span>
          <span className="carrito-bottombar__value">${formatUSD(total)}</span>
        </div>
        <div className="carrito-bottombar__fila">
          <span className="carrito-bottombar__label">Envío</span>
          <span className="carrito-bottombar__envio">
            {opcionActual?.icono && <span>{opcionActual.icono}</span>}
            <span>{opcionActual?.label || 'Por seleccionar'}</span>
            {esDelivery && (
              <span className="carrito-bottombar__envio-costo">
                {costoEnvio === 0 ? 'Gratis' : `$${formatUSD(costoEnvio)}`}
              </span>
            )}
          </span>
        </div>
        {cuponAplicado && (
          <div className="carrito-bottombar__fila">
            <span className="carrito-bottombar__label">Cupón {cuponAplicado.codigo}</span>
            <span className="carrito-bottombar__value carrito-bottombar__value--cupon">-${formatUSD(descuentoCupon)}</span>
          </div>
        )}
        <div className="carrito-bottombar__fila carrito-bottombar__fila--total">
          <span className="carrito-bottombar__label">Total estimado</span>
          <span className="carrito-bottombar__value">${formatUSD(totalConEnvio)}</span>
        </div>
        <button
          type="button"
          className="carrito-bottombar__cta"
          onClick={handleConfirmar}
          disabled={superaLineaCredito}
        >
          Confirmar pedido
        </button>
        <span className="carrito-bottombar__seguridad">🔒 Compra segura · Tus datos están protegidos</span>
      </div>

      {modalConfirmarAbierto && (
        <ConfirmarPedidoModal
          requierePin={tieneSubUsuarios}
          crearOrden={crearOrden}
          onCerrar={() => setModalConfirmarAbierto(false)}
          onCerrarExito={cerrarModalConExito}
        />
      )}
    </div>
  )
}

export default Carrito
