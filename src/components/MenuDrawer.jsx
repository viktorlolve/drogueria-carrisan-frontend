import { useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import './MenuDrawer.css'

function MenuDrawer({ isOpen, onClose, user, onLogout }) {
  // Cerrar con Escape + bloquear scroll del fondo mientras el drawer está abierto
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  function linkClase({ isActive }) {
    return `menu-drawer__link ${isActive ? 'menu-drawer__link--activo' : ''}`
  }

  return (
    <>
      {isOpen && (
        <div className="menu-drawer__overlay" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        className={`menu-drawer ${isOpen ? 'menu-drawer--abierto' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="menu-drawer__header">
          <span className="menu-drawer__marca">
            <span className="menu-drawer__marca-dot menu-drawer__marca-dot--teal" />
            <span className="menu-drawer__marca-dot menu-drawer__marca-dot--indigo" />
            Droguería Carrisan
          </span>
          <button
            type="button"
            className="menu-drawer__cerrar"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {user && (
          <div className="menu-drawer__usuario">
            <span className="menu-drawer__avatar" aria-hidden="true">
              {user.email?.[0]?.toUpperCase() || '?'}
            </span>
            <span className="menu-drawer__email">{user.email}</span>
          </div>
        )}

        {/* Sección: Principal */}
        <nav className="menu-drawer__links">
          <NavLink to="/" end className={linkClase} onClick={onClose}>
            🏠 Inicio
          </NavLink>
          <NavLink to="/catalogo" className={linkClase} onClick={onClose}>
            📦 Catálogo
          </NavLink>

          {user && (
            <>
              <NavLink to="/carrito" className={linkClase} onClick={onClose}>
                🛒 Carrito
              </NavLink>
              <NavLink to="/orders" className={linkClase} onClick={onClose}>
                📋 Mis pedidos
              </NavLink>
              <NavLink to="/mis-items" className={linkClase} onClick={onClose}>
                📦 Mis Items
              </NavLink>
              <NavLink to="/notificaciones" className={linkClase} onClick={onClose}>
                🔔 Notificaciones
              </NavLink>
              <NavLink to="/cuenta" className={linkClase} onClick={onClose}>
                👤 Mi cuenta
              </NavLink>
              {user.es_admin && (
                <NavLink to="/admin" className={linkClase} onClick={onClose}>
                  ⚙️ Panel admin
                </NavLink>
              )}
            </>
          )}
        </nav>

        {/* Separador */}
        <hr className="menu-drawer__divider" />

        {/* Sección: Información */}
        <nav className="menu-drawer__links">
          <span className="menu-drawer__section-title">Información</span>
          <NavLink to="/quienes-somos" className={linkClase} onClick={onClose}>
            Quiénes Somos
          </NavLink>
          <NavLink to="/registro-inhrr" className={linkClase} onClick={onClose}>
            Registro sanitario (INHRR)
          </NavLink>
          <NavLink to="/vademecum" className={linkClase} onClick={onClose}>
            Vademécum clínico
          </NavLink>
          <NavLink to="/ayuda" className={linkClase} onClick={onClose}>
            Preguntas Frecuentes
          </NavLink>
          <NavLink to="/ayuda" className={linkClase} onClick={onClose}>
            Cómo usar la plataforma
          </NavLink>
          <NavLink to="/contacto" className={linkClase} onClick={onClose}>
            Contacto
          </NavLink>
        </nav>

        {/* Separador */}
        <hr className="menu-drawer__divider" />

        {/* Sección: Legal */}
        <nav className="menu-drawer__links">
          <span className="menu-drawer__section-title">Legal</span>
          <NavLink to="/terminos" className={linkClase} onClick={onClose}>
            Términos y Condiciones
          </NavLink>
          <NavLink to="/privacidad" className={linkClase} onClick={onClose}>
            Política de Privacidad
          </NavLink>
        </nav>

        <div className="menu-drawer__footer">
          {user ? (
            <button type="button" className="menu-drawer__logout" onClick={onLogout}>
              Cerrar sesión
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="menu-drawer__btn menu-drawer__btn--outline"
                onClick={onClose}
              >
                Iniciar sesión
              </Link>
              <Link
                to="/registro"
                className="menu-drawer__btn menu-drawer__btn--fill"
                onClick={onClose}
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

export default MenuDrawer