import { useState, useEffect, useRef } from 'react'
import AgregarDireccionModal from './AgregarDireccionModal'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useEnvio } from '../context/EnvioContext'
import logoBlanco from '../assets/minilogo blanco sin fondo.png'
import api from '../api/axios'
import BuscadorMovil from './BuscadorMovil'
import { ProductoImagen } from './icons/ProductoImagen'
import './Navbar.css'

const RUTAS_SIN_NAVBAR = ['/login', '/registro', '/registro/invita', '/recuperar', '/registro/institucional', '/registro/profesional', '/registro/honorifico', '/mantenimiento']

// Rutas donde SÍ debe verse la flecha "atrás" en móvil
const RUTAS_CON_BACK_MOVIL_PREFIXES = [
  '/admin', '/cuenta', '/mis-items', '/orders',
  '/estado-cuenta', '/notificaciones', '/producto', '/carrito',
  '/servicios'
]

const EMOJIS_ENVIO = {
  retiro: '🏪',
  delivery: '🛵',
  envio_nacional: '📦',
  default: '📲'
};

// Datos de departamentos y sus subcategorías.
// Línea Farmacia y Cuidado Personal usan las categorías reales de la tienda
// (filtro `categoria` del catálogo, ver categoriasTienda.js en backend).
// Línea Hospitalaria y Material Médico NO se tocan: el dueño las rehará
// manualmente con categorías propias (uso quirúrgico).
const DEPARTAMENTOS = [
  {
    id: 'hospitalaria',
    nombre: 'Línea Hospitalaria',
    icono: '🏥',
    subcategorias: [
      { nombre: 'Anestesia', ruta: '/catalogo?departamento=hospitalaria&categoria=anestesia' },
      { nombre: 'Antibióticos', ruta: '/catalogo?departamento=hospitalaria&categoria=antibioticos' },
      { nombre: 'Soluciones', ruta: '/catalogo?departamento=hospitalaria&categoria=soluciones' },
      { nombre: 'Hospitalario e insumos', ruta: '/catalogo?categoria=hospitalario' },
    ]
  },
  {
    id: 'farmacia',
    nombre: 'Línea Farmacia',
    icono: '💊',
    subcategorias: [
      { nombre: 'Analgésicos y antiinflamatorios', ruta: '/catalogo?categoria=analgesicos' },
      { nombre: 'Cardiovascular', ruta: '/catalogo?categoria=cardiovascular' },
      { nombre: 'Antidiabéticos', ruta: '/catalogo?categoria=antidiabeticos' },
      { nombre: 'Estómago y digestión', ruta: '/catalogo?categoria=digestivo' },
      { nombre: 'Sistema nervioso', ruta: '/catalogo?categoria=nervioso' },
      { nombre: 'Alergia', ruta: '/catalogo?categoria=alergia' },
      { nombre: 'Respiratorio', ruta: '/catalogo?categoria=respiratorio' },
      { nombre: 'Tos, resfriado y garganta', ruta: '/catalogo?categoria=tos-resfriado' },
      { nombre: 'Ojos y oídos', ruta: '/catalogo?categoria=ojos-oidos' },
      { nombre: 'Antiinfecciosos', ruta: '/catalogo?categoria=antiinfecciosos' },
      { nombre: 'Antiparasitarios', ruta: '/catalogo?categoria=antiparasitarios' },
    ]
  },
  {
    id: 'material-medico',
    nombre: 'Material Médico',
    icono: '🩺',
    subcategorias: [
      { nombre: 'Descartables', ruta: '/catalogo?departamento=material-medico&categoria=descartables' },
      { nombre: 'Adhesivos', ruta: '/catalogo?departamento=material-medico&categoria=adhesivos' },
      { nombre: 'Soluciones', ruta: '/catalogo?departamento=material-medico&categoria=soluciones' },
    ]
  },
  {
    id: 'cuidado-personal',
    nombre: 'Cuidado Personal',
    icono: '🧴',
    subcategorias: [
      { nombre: 'Salud femenina', ruta: '/catalogo?categoria=salud-femenina' },
      { nombre: 'Salud masculina y urológico', ruta: '/catalogo?categoria=salud-masculina' },
      { nombre: 'Cuidado de la piel', ruta: '/catalogo?categoria=piel' },
      { nombre: 'Vitaminas y suplementos', ruta: '/catalogo?categoria=vitaminas' },
    ]
  },
]

// Datos de servicios y sus subcategorías
const SERVICIOS = [
  {
    id: 'consulta-medica',
    nombre: 'Consulta Médica',
    icono: '🩺',
    subcategorias: [
      { nombre: 'Cardiología', ruta: '/servicios/consulta-medica/cardiologia' },
      { nombre: 'Medicina Interna', ruta: '/servicios/consulta-medica/medicina-interna' },
      { nombre: 'Estudios pre-operatorios', ruta: '/servicios/consulta-medica/pre-operatorios' },
    ]
  },
  {
    id: 'laboratorio-clinico',
    nombre: 'Laboratorio Clínico',
    icono: '🔬',
    subcategorias: [
      { nombre: 'Análisis de Sangre', ruta: '/servicios/laboratorio/analisis-sangre' },
      { nombre: 'Análisis de orina y heces', ruta: '/servicios/laboratorio/analisis-orina-heces' },
      { nombre: 'Microbiología y parasitología', ruta: '/servicios/laboratorio/microbiologia' },
    ]
  },
  {
    id: 'detalles-disenos',
    nombre: 'Detalles & Diseños',
    icono: '🎁',
    subcategorias: [
      { nombre: 'Arreglos florales', ruta: '/servicios/detalles/arreglos-florales' },
      { nombre: 'Cestas conmemorativas', ruta: '/servicios/detalles/cestas' },
      { nombre: 'Escultura con Globos', ruta: '/servicios/detalles/globos' },
      { nombre: 'Decoración para eventos', ruta: '/servicios/detalles/decoracion-eventos' },
    ]
  },
]

function Navbar() {
  const { user, logout } = useAuth()
  const { items, total } = useCart()
  const cantidadItems = items?.reduce((acc, item) => acc + item.cantidad, 0) || 0
  const {
    tipoEnvio,
    cambiarTipoEnvio,
    direcciones,
    direccionSeleccionada,
    setDireccionSeleccionada,
    guardarDireccion,
    cargarDirecciones,
  } = useEnvio()

  const navigate = useNavigate()
  const location = useLocation()

  const [showEnvioPanel, setShowEnvioPanel] = useState(false)
  const [showDeptosMenu, setShowDeptosMenu] = useState(false)
  const [deptoActivo, setDeptoActivo] = useState(null)
  const [showServiciosMenu, setShowServiciosMenu] = useState(false)
  const [servicioActivo, setServicioActivo] = useState(null) 
  const serviciosBtnRef = useRef(null)
  const serviciosRef = useRef(null)
  const [showMyItemsMenu, setShowMyItemsMenu] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const myItemsRef = useRef(null)
  const accountRef = useRef(null)
  const [busqueda, setBusqueda] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [buscadorMovilAbierto, setBuscadorMovilAbierto] = useState(false)
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0)

  const searchRef = useRef(null)
  const panelRef = useRef(null)
  const deptosRef = useRef(null)
  const mobilePanelRef = useRef(null)
  const debounceRef = useRef(null)
  const busquedaEnviadaRef = useRef(false)
  const busquedaUrlSyncRef = useRef(false)

  // useEffect para manejar clicks fuera de los paneles
  useEffect(() => {
    function handleClickOutside(event) {
 if (event.target.closest('[data-scope="dialog"]')) return
      const isOutsideDesktop = panelRef.current && !panelRef.current.contains(event.target)
      const isOutsideMobile = mobilePanelRef.current && !mobilePanelRef.current.contains(event.target)
      const isOutsideDeptos = deptosRef.current && !deptosRef.current.contains(event.target)
      const isOutsideServicios = serviciosRef.current && !serviciosRef.current.contains(event.target)
      const isOutsideMyItems = myItemsRef.current && !myItemsRef.current.contains(event.target)
      const isOutsideAccount = accountRef.current && !accountRef.current.contains(event.target)

      // Cierra el panel de envío si el click fue afuera de AMBOS paneles (desktop y móvil)
      if (isOutsideDesktop && isOutsideMobile) {
        setShowEnvioPanel(false)
      }
      
      if (isOutsideDeptos) {
        setShowDeptosMenu(false)
        setDeptoActivo(null)
      }
      
      if (isOutsideServicios) {
        setShowServiciosMenu(false)
        setServicioActivo(null)
      }
      
      if (isOutsideMyItems) {
        setShowMyItemsMenu(false)
      }
      
      if (isOutsideAccount) {
        setShowAccountMenu(false)
      }
      
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setMostrarSugerencias(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // useEffect para buscar sugerencias con debounce
  useEffect(() => {
    if (busqueda.length < 1) return

    // Si el término llegó por sync de URL (navegación al catálogo con ?search=),
    // no disparar el fetch de sugerencias: eso reabriría el dropdown sin que el
    // usuario esté escribiendo. El flag se reactiva con el próximo onChange.
    if (busquedaUrlSyncRef.current) {
      busquedaEnviadaRef.current = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      return
    }

    busquedaEnviadaRef.current = false
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (busquedaEnviadaRef.current) return
      try {
        const { data } = await api.get(`/products?search=${encodeURIComponent(busqueda)}&limit=5`)
        if (busquedaEnviadaRef.current) return
        setSugerencias(data.slice(0, 5))
        setMostrarSugerencias(true)
      } catch (err) {
        console.error('Error buscando sugerencias:', err)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [busqueda])

  // Sincronizar el término de búsqueda con la URL (navegación con ?search=).
  // Los setState se difieren en un microtask para no setear de forma síncrona
  // dentro del effect; el flag evita que el effect de debounce dispare el
  // fetch de sugerencias para un término que no se está tecleando.
  useEffect(() => {
    const terminoUrl = new URLSearchParams(location.search).get('search') || ''
    busquedaUrlSyncRef.current = true
    busquedaEnviadaRef.current = true
    if (debounceRef.current) clearTimeout(debounceRef.current)
    Promise.resolve().then(() => {
      setSugerencias([])
      setMostrarSugerencias(false)
      setBusqueda(terminoUrl)
    })
  }, [location.search])

  // Cargar direcciones guardadas del usuario al montar
  useEffect(() => {
    if (user && tipoEnvio && tipoEnvio !== 'retiro') cargarDirecciones(tipoEnvio)
  }, [user, tipoEnvio, cargarDirecciones])

  // Cargar notificaciones no leídas
  useEffect(() => {
    if (!user) return
    api
      .get('/notifications/unread-count')
      .then(({ data }) => setNotificacionesNoLeidas(data.count || 0))
      .catch((err) => console.error('Error al contar notificaciones:', err))
  }, [user])

  // Helper: mostrar flecha atrás solo en móvil y en ciertas rutas
  const mostrarBackMovil = RUTAS_CON_BACK_MOVIL_PREFIXES.some(p => location.pathname.startsWith(p))

  if (RUTAS_SIN_NAVBAR.includes(location.pathname) || location.pathname.startsWith('/staff')) return null

  function handleBuscar(e) {
    e.preventDefault()
    const termino = busqueda.trim()
    if (termino) {
      // Marcar que ya se envió la búsqueda: aborta el debounce pendiente y
      // descarta cualquier respuesta tardía que pueda reabrir el dropdown.
      busquedaEnviadaRef.current = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      setSugerencias([])
      setMostrarSugerencias(false)
      navigate(`/catalogo?search=${encodeURIComponent(termino)}`)
    }
  }

  function handleSugerenciaClick(producto) {
    busquedaEnviadaRef.current = true
    setMostrarSugerencias(false)
    setBusqueda('')
    navigate(`/producto/${producto.id}`)
  }

  function handleSearchFocus(e) {
    const esMobile = window.matchMedia('(max-width: 768px)').matches
    if (esMobile) {
      e.target.blur()
      setBuscadorMovilAbierto(true)
    } else if (sugerencias.length > 0) {
      setMostrarSugerencias(true)
    }
  }

  // Manejar clic en subcategoría
  function handleSubcategoriaClick(ruta) {
    setShowDeptosMenu(false)
    setDeptoActivo(null)
    navigate(ruta)
  }

  const ciudadEstado = direccionSeleccionada 
    ? `${direccionSeleccionada.ciudad || 'Ciudad'}, ${direccionSeleccionada.estado || 'Estado'}`
    : 'Valencia, Carabobo'

  const emojiActual = EMOJIS_ENVIO[tipoEnvio] || EMOJIS_ENVIO.default;

  return (
    <>
      <header className="navbar-container">
        <div className="navbar__main">
          <Link to="/" className="navbar__logo" aria-label="Ir a inicio">
            <img src={logoBlanco} alt="Droguería Carrisan" className="desktop-only" />
          </Link>

          {/* Botón Pickup/Delivery (ESCRITORIO) */}
          <div className="navbar__desktop-pickup-wrapper desktop-only" ref={panelRef}>
            <button className="navbar__pickup-btn" onClick={() => setShowEnvioPanel(!showEnvioPanel)}>
              <div className="pickup-btn__icon">
                {emojiActual}
              </div>
              <div className="pickup-btn__text">
                <span className="pickup-btn__title">
                  {tipoEnvio === 'retiro' ? 'Retiro en Tienda' : 
                  tipoEnvio === 'delivery' ? 'Delivery' : 
                  tipoEnvio === 'envio_nacional' ? 'Envío Nacional' : '¿Retiro o delivery?'}
                </span>
                <span className="pickup-btn__subtitle">
                  {tipoEnvio === 'retiro' ? 'Sede Valencia' : ciudadEstado}
                </span>
              </div>
              <svg className={`pickup-btn__arrow ${showEnvioPanel ? 'rotated' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {showEnvioPanel && (
              <PanelEnvio
                tipoEnvio={tipoEnvio}
                cambiarTipoEnvio={cambiarTipoEnvio}
                direcciones={direcciones}
                direccionSeleccionada={direccionSeleccionada}
                setDireccionSeleccionada={setDireccionSeleccionada}
                guardarDireccion={guardarDireccion}
                onClose={() => setShowEnvioPanel(false)}
              />
            )}
          </div>

          {/* Flecha atrás + Pin de envío (SOLO MÓVIL) */}
          <div className="navbar__mobile-pickup mobile-only" ref={mobilePanelRef}>
            {mostrarBackMovil && (
              <button className="mobile-back-btn" aria-label="Volver" onClick={() => navigate('/home')}>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
</button>
            )}

            <button
              className="mobile-pin-btn"
              aria-label="Seleccionar envío"
              onClick={() => setShowEnvioPanel(!showEnvioPanel)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </button>

            {showEnvioPanel && (
              <div className="envio-modal-backdrop" onClick={() => setShowEnvioPanel(false)}>
                <div onClick={(e) => e.stopPropagation()}>
                  <PanelEnvio
                    tipoEnvio={tipoEnvio}
                    cambiarTipoEnvio={cambiarTipoEnvio}
                    direcciones={direcciones}
                    direccionSeleccionada={direccionSeleccionada}
                    setDireccionSeleccionada={setDireccionSeleccionada}
                    guardarDireccion={guardarDireccion}
                    onClose={() => setShowEnvioPanel(false)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Buscador Interactivo */}
          <div className="navbar__search-wrapper" ref={searchRef}>
            <form className="navbar__search" onSubmit={handleBuscar}>
              <input
                type="text"
                placeholder="Buscar en Drogueria Carrisan"
                value={busqueda}
                onChange={(e) => {
                  busquedaUrlSyncRef.current = false
                  setBusqueda(e.target.value)
                }}
                onFocus={handleSearchFocus}
              />
              <button type="submit" className="search-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </form>

            {mostrarSugerencias && busqueda.length > 0 && sugerencias.length > 0 && (
              <div className="search-suggestions">
                {sugerencias.map((producto) => (
                  <button
                    key={producto.id}
                    className="suggestion-item"
                    onClick={() => handleSugerenciaClick(producto)}
                  >
                    <ProductoImagen
                      src={producto.foto_url}
                      alt=""
                      className="suggestion-item__img"
                    />
                    <span className="suggestion-item__nombre">{producto.nombre_comercial}</span>
                    <span className="suggestion-price">${Number(producto.precio_usd).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {buscadorMovilAbierto && (
            <BuscadorMovil queryInicial={busqueda} onClose={() => setBuscadorMovilAbierto(false)} />
          )}

          {/* Acciones Derecha (Escritorio) */}
          <div className="navbar__actions desktop-only">
            {/* Mi Botiquín (antes My Items) */}
            <div className="navbar__action-dropdown" ref={myItemsRef}>
              <button 
                className="action-btn"
                onClick={() => {
                  setShowMyItemsMenu(!showMyItemsMenu)
                  setShowAccountMenu(false)
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <div className="action-text">
                  <span>Favoritos</span>
                  <strong>Mis Items</strong>
                </div>
                <svg className={`action-btn__arrow ${showMyItemsMenu ? 'rotated' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {showMyItemsMenu && (
                <div className="action-dropdown-menu">
                  <Link to="/mis-items" className="action-dropdown-item" onClick={() => setShowMyItemsMenu(false)}>
                    <span className="action-dropdown-item__icono">❤️</span>
                    <div>
                      <span className="action-dropdown-item__label">Favoritos</span>
                      <span className="action-dropdown-item__desc">Productos que te gustan</span>
                    </div>
                  </Link>
                  <Link to="/mis-items?tab=favoritos" className="action-dropdown-item" onClick={() => setShowMyItemsMenu(false)}>
                    <span className="action-dropdown-item__icono">📋</span>
                    <div>
                      <span className="action-dropdown-item__label">Mis Listas</span>
                      <span className="action-dropdown-item__desc">Listas de compras</span>
                    </div>
                  </Link>
                  <Link to="/mis-items?tab=recomprar" className="action-dropdown-item" onClick={() => setShowMyItemsMenu(false)}>
                    <span className="action-dropdown-item__icono">🔄</span>
                    <div>
                      <span className="action-dropdown-item__label">Frecuentes</span>
                      <span className="action-dropdown-item__desc">Compras recurrentes</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Cuenta */}
            <div className="navbar__action-dropdown" ref={accountRef}>
              <button 
                className="action-btn"
                onClick={() => {
                  setShowAccountMenu(!showAccountMenu)
                  setShowMyItemsMenu(false)
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  {user && notificacionesNoLeidas > 0 && (
                    <span className="bell-badge">{notificacionesNoLeidas > 9 ? '9+' : notificacionesNoLeidas}</span>
                  )}
                </div>
                <div className="action-text">
                  <span>{user ? 'Sesión Iniciada' : 'Iniciar Sesión'}</span>
                  <strong>{user ? 'Mi Cuenta' : 'Cuenta'}</strong>
                </div>
                <svg className={`action-btn__arrow ${showAccountMenu ? 'rotated' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {showAccountMenu && (
                <div className="action-dropdown-menu">
                  {user ? (
                    <>
                      <Link to="/cuenta" className="action-dropdown-item" onClick={() => setShowAccountMenu(false)}>
                        <span className="action-dropdown-item__icono">👤</span>
                        <div>
                          <span className="action-dropdown-item__label">Mi Cuenta</span>
                          <span className="action-dropdown-item__desc">Información personal</span>
                        </div>
                      </Link>
                      <Link to="/orders" className="action-dropdown-item" onClick={() => setShowAccountMenu(false)}>
                        <span className="action-dropdown-item__icono">📦</span>
                        <div>
                          <span className="action-dropdown-item__label">Mis Órdenes</span>
                          <span className="action-dropdown-item__desc">Historial de pedidos</span>
                        </div>
                      </Link>
                      <Link to="/estado-cuenta" className="action-dropdown-item" onClick={() => setShowAccountMenu(false)}>
                        <span className="action-dropdown-item__icono">💳</span>
                        <div>
                          <span className="action-dropdown-item__label">Estado de Cuenta</span>
                          <span className="action-dropdown-item__desc">Historial de facturación</span>
                        </div>
                      </Link>
                      <Link to="/notificaciones" className="action-dropdown-item" onClick={() => setShowAccountMenu(false)}>
                        <span className="action-dropdown-item__icono">🔔</span>
                        <div>
                          <span className="action-dropdown-item__label">Notificaciones</span>
                          <span className="action-dropdown-item__desc">Alertas y avisos</span>
                        </div>
                      </Link>
                      <Link to="/admin" className="action-dropdown-item" onClick={() => setShowAccountMenu(false)}>
                        <span className="action-dropdown-item__icono">⚙️</span>
                        <div>
                          <span className="action-dropdown-item__label">Administracion</span>
                          <span className="action-dropdown-item__desc">Acceso solo para trabajadores</span>
                        </div>
                      </Link>
                      <div className="action-dropdown-divider"></div>
                      <button className="action-dropdown-item action-dropdown-item--danger" onClick={() => { logout(); setShowAccountMenu(false); }}>
                        <span className="action-dropdown-item__icono">🚪</span>
                        <div>
                          <span className="action-dropdown-item__label">Cerrar Sesión</span>
                        </div>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="action-dropdown-item" onClick={() => setShowAccountMenu(false)}>
                        <span className="action-dropdown-item__icono">🔑</span>
                        <div>
                          <span className="action-dropdown-item__label">Iniciar Sesión</span>
                          <span className="action-dropdown-item__desc">Accede a tu cuenta</span>
                        </div>
                      </Link>
                      <Link to="/registro" className="action-dropdown-item" onClick={() => setShowAccountMenu(false)}>
                        <span className="action-dropdown-item__icono">📝</span>
                        <div>
                          <span className="action-dropdown-item__label">Crear Cuenta</span>
                          <span className="action-dropdown-item__desc">Regístrate gratis</span>
                        </div>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Carrito */}
          <Link to="/carrito" className="navbar__cart">
            <div className="cart-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span className="cart-badge" style={{ 
                top: "-6px", 
                right: "-10px", 
                backgroundColor: "#ffc107", 
                color: "#000", 
                borderRadius: "50%", 
                padding: "0px 5px", 
                fontSize: "0.75rem", 
                fontWeight: "bold" 
              }}>{cantidadItems}</span>
            </div>
            <span className="cart-price" style={{ fontSize: "12px" }}>${total?.toFixed(2) || '0.00'}</span>
          </Link>
        </div>

        {/* Barra Secundaria (Categorías) con menú desplegable */}
        <nav className="navbar__secondary desktop-only">
          <div className="navbar__secondary-inner">
            {/* Botón Departamentos con menú desplegable */}
            <div className="navbar__deptos-wrapper" ref={deptosRef}>
              <button 
                className="pill-btn pill-btn--deptos"
                onClick={() => {
                  setShowDeptosMenu(!showDeptosMenu)
                  setShowServiciosMenu(false)
                  setServicioActivo(null)
                  setDeptoActivo(null)
                }}
              >
                <strong>Departamentos</strong>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Menú desplegable de departamentos */}
              {showDeptosMenu && (
                <div className="deptos-dropdown">
                  <div className="deptos-dropdown__sidebar">
                    <p className="deptos-dropdown__titulo">Todos los departamentos</p>
                    {DEPARTAMENTOS.map((depto) => (
                      <button
                        key={depto.id}
                        className={`deptos-dropdown__depto-btn ${deptoActivo === depto.id ? 'active' : ''}`}
                        onMouseEnter={() => setDeptoActivo(depto.id)}
                        onClick={() => {
                          setDeptoActivo(deptoActivo === depto.id ? null : depto.id)
                        }}
                      >
                        <span className="deptos-dropdown__depto-icono">{depto.icono}</span>
                        <span className="deptos-dropdown__depto-nombre">{depto.nombre}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    ))}
                  </div>

                  {/* Subcategorías del departamento activo */}
                  {deptoActivo && (
                    <div className="deptos-dropdown__subcategorias">
                      <p className="deptos-dropdown__subtitulo">
                        {DEPARTAMENTOS.find(d => d.id === deptoActivo)?.nombre}
                      </p>
                      {DEPARTAMENTOS.find(d => d.id === deptoActivo)?.subcategorias.map((sub) => (
                        <button
                          key={sub.nombre}
                          className="deptos-dropdown__sub-link"
                          onClick={() => handleSubcategoriaClick(sub.ruta)}
                        >
                          <span className="deptos-dropdown__sub-icon">•</span>
                          {sub.nombre}
                        </button>
                      ))}

                      {/* Botón "Ver todo" opcional → catálogo completo.
                          En Línea Hospitalaria apunta a la categoría real `hospitalario`;
                          en Línea Farmacia al filtro `linea=farmacia`. */}
                      <button
                        className="deptos-dropdown__sub-link deptos-dropdown__sub-link--ver-todo"
                        onClick={() => handleSubcategoriaClick(
                          deptoActivo === 'hospitalaria'
                            ? '/catalogo?categoria=hospitalario'
                            : deptoActivo === 'farmacia'
                              ? '/catalogo?linea=farmacia'
                              : '/catalogo'
                        )}
                      >
                        {deptoActivo === 'hospitalaria'
                          ? 'Ver toda la línea hospitalaria'
                          : deptoActivo === 'farmacia'
                            ? 'Ver toda la línea farmacia'
                            : 'Ver todo el catálogo'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botón Servicios con menú desplegable */}
            <div className="navbar__deptos-wrapper" ref={serviciosRef}>
              <button 
                className="pill-btn pill-btn--deptos"
                ref={serviciosBtnRef}
                onClick={() => {
                  setShowServiciosMenu(!showServiciosMenu)
                  setShowDeptosMenu(false)
                  setDeptoActivo(null)
                  setServicioActivo(null)
                }}
              >
                <strong>Servicios</strong>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {showServiciosMenu && (
                <div className="deptos-dropdown">
                  <div className="deptos-dropdown__sidebar">
                    <p className="deptos-dropdown__titulo">Todos los servicios</p>
                    {SERVICIOS.map((servicio) => (
                      <button
                        key={servicio.id}
                        className={`deptos-dropdown__depto-btn ${servicioActivo === servicio.id ? 'active' : ''}`}
                        onMouseEnter={() => setServicioActivo(servicio.id)}
                        onClick={() => {
                          setServicioActivo(servicioActivo === servicio.id ? null : servicio.id)
                        }}
                      >
                        <span className="deptos-dropdown__depto-icono">{servicio.icono}</span>
                        <span className="deptos-dropdown__depto-nombre">{servicio.nombre}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    ))}
                  </div>

                  {servicioActivo && (
                    <div className="deptos-dropdown__subcategorias">
                      <p className="deptos-dropdown__subtitulo">
                        {SERVICIOS.find(s => s.id === servicioActivo)?.nombre}
                      </p>
                      {SERVICIOS.find(s => s.id === servicioActivo)?.subcategorias.map((sub) => (
                        <button
                          key={sub.nombre}
                          className="deptos-dropdown__sub-link"
                          onClick={() => {
                            setShowServiciosMenu(false)
                            setServicioActivo(null)
                            navigate(sub.ruta)
                          }}
                        >
                          <span className="deptos-dropdown__sub-icon">•</span>
                          {sub.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <span className="divider"></span>
            <Link to="/catalogo" className="pill-link">Nuevos Ingresos</Link>
            <Link to="/ofertas" className="pill-link">Ofertas</Link>
            <Link to="/hospitalaria" className="pill-link">Hospitalaria</Link>
            <Link to="/farmacia" className="pill-link">Farmacia</Link>
            <Link to="/catalogo?search=pediatrico" className="pill-link">Para niños</Link>
          </div>
        </nav>
      </header>
    </>
  )
}

// -------------------------------------------------------------
// COMPONENTE PANEL ENVÍO INTEGRADO
// -------------------------------------------------------------
function PanelEnvio({
  tipoEnvio,
  cambiarTipoEnvio,
  onClose,
  direcciones = [],
  direccionSeleccionada,
  setDireccionSeleccionada,
  guardarDireccion,
}) {
  const { user } = useAuth()
  const [modalAbierto, setModalAbierto] = useState(false)

  return (
    <div className="envio-panel-content">
      <div className="envio-panel-header mobile-only">
        <button onClick={onClose} className="close-panel-btn">✕</button>
      </div>

      {/* Selectores Superiores */}
      <div className="envio-types">
        <button
          className={`envio-type-btn ${tipoEnvio === 'retiro' ? 'active' : ''}`}
          onClick={() => cambiarTipoEnvio('retiro')}
        >
          <div className="envio-circle">🏪</div>
          <span className="envio-label">Retiro</span>
          <span className="envio-costo">Gratis</span>
        </button>
        <button
          className={`envio-type-btn ${tipoEnvio === 'delivery' ? 'active' : ''}`}
          onClick={() => cambiarTipoEnvio('delivery')}
        >
          <div className="envio-circle">🛵</div>
          <span className="envio-label">Delivery</span>
          <span className="envio-costo">{user?.delivery_gratis ? 'Gratis' : '$8.00'}</span>
        </button>
        <button
          className={`envio-type-btn ${tipoEnvio === 'envio_nacional' ? 'active' : ''}`}
          onClick={() => cambiarTipoEnvio('envio_nacional')}
        >
          <div className="envio-circle">📦</div>
          <span className="envio-label">Nacional</span>
          <span className="envio-costo">Cobro Destino</span>
        </button>
      </div>

      {/* CONTENIDO DINÁMICO SEGÚN SELECCIÓN */}

      {/* 1. RETIRO EN TIENDA */}
      {tipoEnvio === 'retiro' && (
        <div className="envio-card selected">
          <div className="envio-card-info" style={{ width: '100%', textAlign: 'center', padding: '10px' }}>
            <strong>Nuestra Oficina</strong>
            <p>Av Urdaneta (99) Urb. El Recreo, Qta Mirabal Local 04C</p>
            <small>📍 Valencia, Carabobo</small>
            <button className="btn-guardar" style={{ marginTop: '12px', width: '100%' }} onClick={onClose}>
              Confirmar Retiro
            </button>
          </div>
        </div>
      )}

      {/* 2. DELIVERY EN MOTO y 3. ENVÍO NACIONAL comparten la misma lógica de direcciones */}
      {(tipoEnvio === 'delivery' || tipoEnvio === 'envio_nacional') && (
        <div className="envio-direcciones-lista">
          {direcciones.length > 0 && (
            <div className="envio-direcciones-guardadas">
              {direcciones.map((dir) => (
                <button
                  key={dir.id}
                  type="button"
                  className={`envio-direccion-item ${direccionSeleccionada?.id === dir.id ? 'active' : ''}`}
                  onClick={() => setDireccionSeleccionada(dir)}
                >
                  📍 {dir.direccion}, {dir.ciudad}
                </button>
              ))}
            </div>
          )}

          {direcciones.length === 0 && (
            <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', margin: '8px 0 16px' }}>
              Aún no tienes direcciones guardadas para{' '}
              {tipoEnvio === 'delivery' ? 'delivery' : 'envío nacional'}.
            </p>
          )}

          <button type="button" className="btn-agregar-direccion" onClick={() => setModalAbierto(true)}>
            + Agregar dirección
          </button>

          {direccionSeleccionada && (
            <button className="btn-guardar" style={{ marginTop: '12px' }} onClick={onClose}>
              Confirmar Dirección
            </button>
          )}
        </div>
      )}

      <AgregarDireccionModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        tipo={tipoEnvio}
        guardarDireccion={guardarDireccion}
        onGuardada={(dir) => setDireccionSeleccionada(dir)}
      />
    </div>
  )
}

export default Navbar