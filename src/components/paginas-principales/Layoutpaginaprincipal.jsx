import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X, ChevronRight, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavBadges } from '../../context/NavBadgesContext'
import { NAV_UNIFICADO } from './NavUnificado'
import { normalizarNav, grupoDeItem, gruposAbiertosIniciales } from './navUnificadoHelpers'
import InstalarAppBtn from '../InstalarAppBtn'
import './Layoutpaginaprincipal.css'

// ---------------------------------------------------------------
// <LayoutPaginaPrincipal activo="ordenes" titulo="Mis Órdenes">
//   {contenido de la página}
// </LayoutPaginaPrincipal>
//
// Este es el layout base de "Páginas Principales": en desktop/tablet
// (≥1024px) muestra una columna izquierda flotante y sticky con la
// navegación (igual patrón que el resumen sticky de Carrito.jsx, pero
// a la izquierda). En móvil (<1024px) esa columna se convierte en un
// drawer que se abre con un botón de menú y "arrastra" el contenido
// de la página (y el navbar) hacia la derecha con una transición
// corta (efecto push, no overlay).
//
// El menú (prop "nav") es intercambiable: por defecto es
// NAV_UNIFICADO, y cualquier página puede pasarle otro con la misma
// forma { grupos, pie } para mostrar links distintos, por ejemplo:
//
//   <LayoutPaginaPrincipal activo="grocery" titulo="Grocery" nav={NAV_DEPARTAMENTOS}>
//
// Esto es para cuando armemos las páginas departamentales/catálogo:
// van a necesitar links a categorías relacionadas (lo que el cliente
// está explorando para comprar), no los links de cuenta de Mis
// Órdenes/Pagos. Mismo componente, mismo drawer, mismo push del
// navbar — solo cambia qué grupos renderiza.
//
// Cada grupo se despliega como ACORDEÓN dentro del mismo panel (sin
// pantalla secundaria ni botón de volver) y arranca abierto solo si
// contiene el item activo. Los badges salen de `NavBadgesContext`
// (GET /nav/badges) para los items que declaran `contador`.
//
// Nota de arquitectura: este componente usa elementos planos (div/nav/
// button) en vez de <Box>/<Flex> de Chakra a propósito. Chakra inyecta
// su propio CSS en runtime (vía Emotion) DESPUÉS de nuestros estilos
// estáticos, y con especificidad empatada gana el que se inserta al
// final — rompiendo nuestros media queries de display/flex-wrap
// responsivos. Mismo criterio que MenuDrawer.jsx y EstadoCuenta.jsx.
// ---------------------------------------------------------------
// Un solo link de nav, reusado en el grupo principal y en el pie. El
// badge (número sin leer) se pinta a la derecha cuando el item
// declara `contador` y el contexto trae un valor mayor a 0.
function ItemNav({ item, activo, badge, variante, onNavigate }) {
  const esActivo = item.id === activo
  const Icono = item.icono
  const esSublink = variante === 'sublink'
  const clase = esSublink ? 'ppal-nav__sublink' : 'ppal-nav__link'
  const claseActivo = esSublink ? 'ppal-nav__sublink--activo' : 'ppal-nav__link--activo'

  return (
    <NavLink
      to={item.to}
      className={`${clase} ${esActivo ? claseActivo : ''}`}
      onClick={onNavigate}
    >
      {Icono && !esSublink && <Icono size={18} strokeWidth={esActivo ? 2.4 : 2} />}
      <span>{item.texto}</span>
      {badge > 0 && (
        <span className="ppal-nav__badge" aria-label={`${badge} sin resolver`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {esActivo && <ChevronRight size={16} className="ppal-nav__chevron" />}
    </NavLink>
  )
}

function ContenidoNav({ nav, activo, titulo, esAdmin, onNavigate }) {
  const { conteos } = useNavBadges()
  const modelo = normalizarNav(nav)

  const [gruposAbiertos, setGruposAbiertos] = useState(() => gruposAbiertosIniciales(modelo, activo))

  // Si la ruta cambia con el layout ya montado, se abre el grupo del
  // item nuevo. Es el patrón "ajustar estado durante el render" del
  // AGENTS: un setState síncrono dentro de un useEffect dispara la
  // regla react-hooks/set-state-in-effect.
  const [activoAnterior, setActivoAnterior] = useState(activo)
  if (activo !== activoAnterior) {
    setActivoAnterior(activo)
    const grupo = grupoDeItem(modelo, activo)
    if (grupo) setGruposAbiertos((prev) => (prev.has(grupo) ? prev : new Set(prev).add(grupo)))
  }

  function toggleGrupo(id) {
    setGruposAbiertos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderGrupo(grupo, esPie = false) {
    const items = grupo.items.filter((item) => !esAdmin || !item.soloCliente)
    if (items.length === 0) return null

    const abierto = gruposAbiertos.has(grupo.id)
    const grupoActivo = items.some((item) => item.id === activo)

    return (
      <div
        key={grupo.id}
        className={`ppal-nav__grupo ${esPie ? 'ppal-nav__grupo--pie' : ''}`}
      >
        <button
          type="button"
          className={`ppal-nav__grupo-head ${abierto ? 'ppal-nav__grupo-head--abierto' : ''} ${grupoActivo ? 'ppal-nav__grupo-head--activo' : ''}`}
          onClick={() => toggleGrupo(grupo.id)}
          aria-expanded={abierto}
        >
          <span className="ppal-nav__grupo-titulo">{grupo.titulo}</span>
          <ChevronRight size={16} className="ppal-nav__grupo-chevron" />
        </button>

        {abierto && (
          <div className="ppal-nav__grupo-items">
            {items.map((item) => (
              <ItemNav
                key={item.id}
                item={item}
                activo={activo}
                badge={item.contador ? conteos?.[item.contador] || 0 : 0}
                variante={esPie ? undefined : 'sublink'}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <nav className="ppal-nav" aria-label="Navegación">
      {titulo && (
        <div className="ppal-nav__breadcrumb">
          <Link to="/" onClick={onNavigate}>Inicio</Link>
          <span className="ppal-nav__breadcrumb-sep">/</span>
          <span className="ppal-nav__breadcrumb-actual">{titulo}</span>
        </div>
      )}

      {modelo.grupos.map((grupo) => renderGrupo(grupo))}
      {modelo.pie && renderGrupo(modelo.pie, true)}
    </nav>
  )
}

function LayoutPaginaPrincipal({ activo, titulo, subtitulo, acciones, nav = NAV_UNIFICADO, children }) {
  const { user, logout } = useAuth()
  const [drawerAbierto, setDrawerAbierto] = useState(false)
  // Se incrementa cada vez que el drawer se cierra, para forzar que
  // ContenidoNav se remonte y vuelva a su estado inicial (el grupo del
  // item activo), en vez de quedarse "pegado" en otro accordion
  const [drawerResetKey, setDrawerResetKey] = useState(0)

  const cerrarDrawer = () => {
    setDrawerAbierto(false)
    setDrawerResetKey((k) => k + 1)
  }

  // Bloquea el scroll del fondo, permite cerrar con Escape, y marca el
  // <body> para que el Navbar global (fuera de este componente, ver
  // App.jsx) también se corra junto con la página — mismo patrón que
  // MenuDrawer.jsx, solo que acá además empujamos el navbar.
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') cerrarDrawer()
    }
    if (drawerAbierto) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      document.body.classList.add('ppal-drawer-open')
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      document.body.classList.remove('ppal-drawer-open')
    }
  }, [drawerAbierto])

  const iniciales = (user?.nombre || user?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="ppal-root">
      {/* Panel del drawer (solo se ve en móvil, ver CSS) */}
      <aside className={`ppal-drawer-panel ${drawerAbierto ? 'ppal-drawer-panel--abierto' : ''}`}>
        <div className="ppal-drawer-panel__header">
          <div className="ppal-drawer-panel__quien">
            <span className="ppal-drawer-panel__avatar">{iniciales}</span>
            <div className="ppal-drawer-panel__textos">
              <p className="ppal-drawer-panel__nombre">{user?.nombre || 'Mi cuenta'}</p>
              <p className="ppal-drawer-panel__email">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            className="ppal-drawer-panel__cerrar"
            onClick={cerrarDrawer}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <div className="ppal-drawer-panel__scroll">
          <ContenidoNav key={drawerResetKey} nav={nav} activo={activo} titulo={titulo} esAdmin={user?.es_admin} onNavigate={cerrarDrawer} />
        </div>

        {!user?.es_admin && (
          <>
            <InstalarAppBtn />
            <button type="button" className="ppal-drawer-panel__logout" onClick={logout}>
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </>
        )}
      </aside>

      {/* Todo lo demás (topbar móvil + layout de 2 columnas) se "empuja"
          hacia la derecha cuando el drawer está abierto */}
      <div className={`ppal-shift ${drawerAbierto ? 'ppal-shift--empujado' : ''}`}>
        {drawerAbierto && (
          <div className="ppal-shift__catcher" onClick={cerrarDrawer} aria-hidden="true" />
        )}

        {/* Barra superior — solo visible en móvil/tablet */}
        <header className="ppal-topbar">
          <button
            type="button"
            className="ppal-topbar__menu-btn"
            onClick={() => setDrawerAbierto(true)}
            aria-label="Abrir menú de cuenta"
          >
            <Menu size={22} />
          </button>
          <p className="ppal-topbar__titulo">{titulo}</p>
        </header>

        <div className="ppal-container">
          <div className="ppal-body">
            {/* Columna izquierda — solo visible en desktop/tablet */}
            <aside className="ppal-sidebar">
              <div className="ppal-sidebar__sticky">
                <div className="ppal-sidebar__header">
                  <div className="ppal-sidebar__avatar">{iniciales}</div>
                  <div className="ppal-sidebar__header-texto">
                    <p className="ppal-sidebar__nombre">{user?.nombre || 'Mi cuenta'}</p>
                    <p className="ppal-sidebar__email">{user?.email}</p>
                  </div>
                </div>
                <ContenidoNav nav={nav} activo={activo} titulo={titulo} esAdmin={user?.es_admin} />
                {!user?.es_admin && <InstalarAppBtn />}
              </div>
            </aside>

            {/* Columna derecha — contenido de la página */}
            <main className="ppal-main">
              <div className="ppal-main__header">
                <div>
                  <h1 className="ppal-main__titulo">{titulo}</h1>
                  {subtitulo && <p className="ppal-main__subtitulo">{subtitulo}</p>}
                </div>
                {acciones && <div className="ppal-main__acciones">{acciones}</div>}
              </div>

              {children}
            </main>
          </div>
        </div>

      </div>
    </div>
  )
}

export default LayoutPaginaPrincipal