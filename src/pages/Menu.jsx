import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Menu.css'

// ---------------------------------------------------------------
// Iconos SVG inline — stroke = currentColor (heredan el tinte del
// contenedor). Todos comparten viewBox 24 y linecap/join redondeados.
// ---------------------------------------------------------------
function Icono({ size = 22, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

const ICONOS = {
  // Catálogo y productos
  catalogo: (s) => (
    <Icono size={s}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </Icono>
  ),
  inhrr: (s) => (
    <Icono size={s}>
      <path d="M12 3 5 5.5v5.2c0 4.4 2.9 7.8 7 9.3 4.1-1.5 7-4.9 7-9.3V5.5L12 3Z" />
      <path d="M12 8.5v5" />
      <path d="M9.5 11h5" />
    </Icono>
  ),
  ofertas: (s) => (
    <Icono size={s}>
      <path d="M13 3h8v8L9 23l-8-8L13 3Z" />
      <circle cx="16.5" cy="6.5" r="1.5" />
    </Icono>
  ),
  farmacia: (s) => (
    <Icono size={s}>
      <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" />
    </Icono>
  ),
  hospitalaria: (s) => (
    <Icono size={s}>
      <path d="M4 21V8l8-5 8 5v13" />
      <path d="M4 21h16" />
      <path d="M12 9v6" />
      <path d="M9 12h6" />
    </Icono>
  ),

  // Mi cuenta
  items: (s) => (
    <Icono size={s}>
      <path d="M7 3h10v18l-5-3.5L7 21V3Z" />
    </Icono>
  ),
  pedidos: (s) => (
    <Icono size={s}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </Icono>
  ),
  estadoCuenta: (s) => (
    <Icono size={s}>
      <path d="M6 2h9l5 5v15H6V2Z" />
      <path d="M15 2v5h5" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </Icono>
  ),
  cuenta: (s) => (
    <Icono size={s}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </Icono>
  ),
  notificaciones: (s) => (
    <Icono size={s}>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8Z" />
      <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
    </Icono>
  ),

  // Solicitudes
  cotizaciones: (s) => (
    <Icono size={s}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2H9V4Z" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </Icono>
  ),
  requerimientos: (s) => (
    <Icono size={s}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2H9V4Z" />
      <path d="m9 13 2 2 4-4" />
    </Icono>
  ),
  documentos: (s) => (
    <Icono size={s}>
      <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />
    </Icono>
  ),
  presupuesto: (s) => (
    <Icono size={s}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
      <path d="M8 16h.01" />
      <path d="M12 16h.01" />
      <path d="M16 16h.01" />
    </Icono>
  ),

  // Soporte
  ayuda: (s) => (
    <Icono size={s}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.3 1-1.3 1.9" />
      <path d="M12 17h.01" />
    </Icono>
  ),
  contacto: (s) => (
    <Icono size={s}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.1-5.1a8.4 8.4 0 1 1 16.9-3.4Z" />
    </Icono>
  ),
  quienesSomos: (s) => (
    <Icono size={s}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12v4" />
      <path d="M12 8h.01" />
    </Icono>
  ),

  // Legal
  terminos: (s) => (
    <Icono size={s}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-6-4Z" />
      <path d="M14 2v4h6" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </Icono>
  ),
  privacidad: (s) => (
    <Icono size={s}>
      <path d="M12 3 5 5.5v5.2c0 4.4 2.9 7.8 7 9.3 4.1-1.5 7-4.9 7-9.3V5.5L12 3Z" />
      <rect x="9" y="10" width="6" height="4" rx="1" />
      <path d="M10.5 10V9a1.5 1.5 0 0 1 3 0v1" />
    </Icono>
  ),

  // CTA registro
  registro: (s) => (
    <Icono size={s}>
      <circle cx="10" cy="8" r="4" />
      <path d="M3.5 20c0-3.4 2.9-5.5 6.5-5.5s6.5 2.1 6.5 5.5" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </Icono>
  ),
}

// ---------------------------------------------------------------
// Datos del menú — cada entrada mapea 1:1 con una ruta de App.jsx
// ---------------------------------------------------------------
const TILES_CATALOGO = [
  { to: '/catalogo', label: 'Catálogo', descripcion: 'Explora todos los productos', icono: 'catalogo', tinte: 'azul' },
  { to: '/registro-inhrr', label: 'Vademécum INHRR', descripcion: 'Registro sanitario oficial', icono: 'inhrr', tinte: 'teal', badge: 'NUEVO' },
  { to: '/ofertas', label: 'Ofertas', descripcion: 'Descuentos y promociones', icono: 'ofertas', tinte: 'indigo' },
]

const LISTA_CATALOGO = [
  { to: '/farmacia', titulo: 'Línea Farmacia', descripcion: 'Medicamentos, cuidado personal y productos de farmacia.', icono: 'farmacia' },
  { to: '/hospitalaria', titulo: 'Línea Hospitalaria', descripcion: 'Insumos y equipos para clínicas e instituciones.', icono: 'hospitalaria' },
]

const LISTA_CUENTA = [
  { to: '/mis-items', titulo: 'Mis Items', descripcion: 'Tus listas personalizadas de productos.', icono: 'items' },
  { to: '/orders', titulo: 'Mis Órdenes', descripcion: 'Historial y seguimiento de tus pedidos.', icono: 'pedidos' },
  { to: '/estado-cuenta', titulo: 'Mi Estado de Cuenta', descripcion: 'Saldo, facturas, reportes y más.', icono: 'estadoCuenta' },
  { to: '/cuenta', titulo: 'Mi Perfil', descripcion: 'Datos personales y configuración de tu cuenta.', icono: 'cuenta' },
  { to: '/notificaciones', titulo: 'Notificaciones', descripcion: 'Alertas de tus pedidos y tu cuenta.', icono: 'notificaciones' },
]

const LISTA_SOLICITUDES = [
  { to: '/mis-solicitudes/cotizaciones', titulo: 'Cotizaciones', descripcion: 'Solicita y consulta tus cotizaciones.', icono: 'cotizaciones' },
  { to: '/mis-solicitudes/requerimientos', titulo: 'Requerimientos', descripcion: 'Pide productos que no están en el catálogo.', icono: 'requerimientos' },
  { to: '/mis-solicitudes/documentos', titulo: 'Documentos', descripcion: 'Envía los documentos de tu empresa (RIF, referencias).', icono: 'documentos' },
  { to: '/presupuesto', titulo: 'Presupuesto Rápido', descripcion: 'Arma un presupuesto o requerimiento en minutos.', icono: 'presupuesto' },
]

const LISTA_SOPORTE = [
  { to: '/ayuda', titulo: 'Preguntas Frecuentes', descripcion: 'Resuelve dudas sobre pedidos, pagos y entregas.', icono: 'ayuda' },
  { to: '/contacto', titulo: 'Contáctanos', descripcion: 'Habla directo con nuestro equipo comercial.', icono: 'contacto' },
  { to: '/quienes-somos', titulo: 'Quiénes Somos', descripcion: 'Conoce la trayectoria de Droguería Carrisan.', icono: 'quienesSomos' },
]

const LISTA_LEGAL = [
  { to: '/terminos', titulo: 'Términos y Condiciones', descripcion: 'Condiciones de uso de la plataforma.', icono: 'terminos' },
  { to: '/privacidad', titulo: 'Política de Privacidad', descripcion: 'Cómo protegemos y usamos tus datos.', icono: 'privacidad' },
]

// ---------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------
function MenuTile({ item }) {
  return (
    <Link to={item.to} className="menu-tile">
      <span className={`menu-tile__icono menu-tile__icono--${item.tinte}`}>
        {ICONOS[item.icono](24)}
      </span>
      <span className="menu-tile__texto">
        <span className="menu-tile__label">{item.label}</span>
        {item.descripcion && (
          <span className="menu-tile__descripcion">{item.descripcion}</span>
        )}
      </span>
      {item.badge && <span className="menu-tile__badge">{item.badge}</span>}
    </Link>
  )
}

function MenuListaItem({ item }) {
  return (
    <Link to={item.to} className="menu-lista__item">
      <span className="menu-lista__icono">
        {ICONOS[item.icono](22)}
      </span>
      <span className="menu-lista__texto">
        <span className="menu-lista__titulo">{item.titulo}</span>
        <span className="menu-lista__descripcion">{item.descripcion}</span>
      </span>
      <svg
        className="menu-lista__flecha"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  )
}

function MenuSeccion({ titulo, tinte = 'teal', children }) {
  return (
    <section className={`menu-seccion menu-seccion--${tinte}`}>
      <h2 className="menu-seccion__titulo">{titulo}</h2>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------
// Página
// ---------------------------------------------------------------
function Menu() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const logueado = Boolean(user)

  function irAtras() {
    // Si llegamos desde el BottomNav hay historial que retroceder;
    // si entraron por URL directa, mejor aterrizar en el Home.
    if (window.history.length > 1) navigate(-1)
    else navigate('/home')
  }

  const saludo = logueado && user?.nombre
    ? `Hola, ${user.nombre.split(' ')[0]} — ¿qué necesitas hoy?`
    : '¿Qué necesitas hoy?'

  return (
    <div className="menu-page">
      <header className="menu-page__header">
        <div>
          <h1 className="menu-page__titulo">Menú</h1>
          <p className="menu-page__subtitulo">{saludo}</p>
        </div>
        <button
          type="button"
          className="menu-page__close"
          onClick={irAtras}
          aria-label="Volver"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </header>

      {!logueado && (
        <section className="menu-seccion" aria-label="Crear cuenta">
          <div className="menu-cta">
            <div className="menu-cta__glow" aria-hidden="true" />
            <div className="menu-cta__icono">{ICONOS.registro(26)}</div>
            <div className="menu-cta__texto">
              <h2 className="menu-cta__titulo">¿Aún no tienes cuenta?</h2>
              <p className="menu-cta__descripcion">
                Regístrate gratis y compra con precios mayoristas.
              </p>
            </div>
            <Link to="/registro" className="menu-cta__boton">
              Crear cuenta
            </Link>
          </div>
        </section>
      )}

      <MenuSeccion titulo="Catálogo y Productos" tinte="azul">
        <div className="menu-grid">
          {TILES_CATALOGO.map((item) => (
            <MenuTile key={item.to} item={item} />
          ))}
        </div>
        <div className="menu-lista">
          {LISTA_CATALOGO.map((item) => (
            <MenuListaItem key={item.to} item={item} />
          ))}
        </div>
      </MenuSeccion>

      {logueado && (
        <>
          <MenuSeccion titulo="Mi Cuenta" tinte="azul">
            <div className="menu-lista">
              {LISTA_CUENTA.map((item) => (
                <MenuListaItem key={item.to} item={item} />
              ))}
            </div>
          </MenuSeccion>

          <MenuSeccion titulo="Solicitudes" tinte="teal">
            <div className="menu-lista">
              {LISTA_SOLICITUDES.map((item) => (
                <MenuListaItem key={item.to} item={item} />
              ))}
            </div>
          </MenuSeccion>
        </>
      )}

      <MenuSeccion titulo="Soporte" tinte="indigo">
        <div className="menu-lista">
          {LISTA_SOPORTE.map((item) => (
            <MenuListaItem key={item.to} item={item} />
          ))}
        </div>
      </MenuSeccion>

      <MenuSeccion titulo="Legal" tinte="principal">
        <div className="menu-lista">
          {LISTA_LEGAL.map((item) => (
            <MenuListaItem key={item.to} item={item} />
          ))}
        </div>
      </MenuSeccion>
    </div>
  )
}

export default Menu