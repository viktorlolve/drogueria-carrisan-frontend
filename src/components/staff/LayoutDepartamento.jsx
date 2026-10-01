import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X, ChevronRight, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { useStaffAuth } from '../../context/StaffAuthContext'
import { useStaffBadges } from '../../context/StaffBadgesContext'
import staffApi from '../../api/staffAxios'
import { DEPARTAMENTOS, MODULOS, ROLES_BRIDGE_ADMIN } from './NavStaff'
import { safeSetItem } from '../../utils/safeStorage'
import StaffCampanaNotificaciones from './StaffCampanaNotificaciones'
import './LayoutDepartamento.css'

// ---------------------------------------------------------------
// <LayoutDepartamento departamento="logistica" activo="almacen" titulo="...">
//   {contenido del módulo}
// </LayoutDepartamento>
//
// Layout base para las páginas de trabajo dentro de un departamento.
// A diferencia de LayoutStaff, el sidebar muestra SOLO los módulos
// del departamento actual, con los colores propios de ese depto
// (variables CSS --ldep-*). Incluye:
//   - Header del departamento (icono + nombre + color)
//   - Link "Volver al dashboard"
//   - Enlace al panel administrativo (solo roles bridge)
//   - Módulos del depto filtrados por staff.rol
// ---------------------------------------------------------------
function ItemNav({ item, activo, onNavigate }) {
  const esActivo = item.id === activo
  const Icono = item.icono
  // Contador de trabajo accionable (GET /staff/badges). Solo lo pintan los
  // items que declaran `contador` en MODULOS (hoy, las colas de Logística), así
  // que Finanzas y Comercial renderizan exactamente igual que antes.
  const { conteos } = useStaffBadges()
  const conteo = item.contador ? conteos[item.contador] || 0 : 0

  return (
    <NavLink to={item.to} onClick={onNavigate} className={`ldep-nav__link ${esActivo ? 'ldep-nav__link--activo' : ''}`}>
      {Icono && <Icono size={18} strokeWidth={esActivo ? 2.4 : 2} />}
      <span>{item.texto}</span>
      {conteo > 0 && (
        <span className={`ldep-nav__badge ${item.contador === 'incidencias' ? 'ldep-nav__badge--alerta' : ''}`}>
          {conteo}
        </span>
      )}
      {esActivo && <ChevronRight size={16} className="ldep-nav__chevron" />}
    </NavLink>
  )
}

function LayoutDepartamento({ departamento, activo, titulo, children }) {
  const { staff, logoutStaff } = useStaffAuth()
  const [drawerAbierto, setDrawerAbierto] = useState(false)
  const [entrandoAAdmin, setEntrandoAAdmin] = useState(false)
  const rol = staff?.rol

  const depto = DEPARTAMENTOS.find((d) => d.id === departamento)
  const grupos = (MODULOS[departamento] || []).map((grupo) => ({
    ...grupo,
    items: grupo.items.filter((item) => item.roles.includes(rol)),
  }))
  const puedeBridge = ROLES_BRIDGE_ADMIN.includes(rol)
  const IconoDepto = depto?.icono

  const cerrarDrawer = () => setDrawerAbierto(false)

  async function entrarAAdmin() {
    setEntrandoAAdmin(true)
    try {
      const { data } = await staffApi.post('/staff/admin-bridge')
      safeSetItem('token', data.token)
      safeSetItem('user', JSON.stringify(data.user))
      window.location.href = '/admin'
    } catch {
      setEntrandoAAdmin(false)
    }
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') cerrarDrawer()
    }
    if (drawerAbierto) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [drawerAbierto])

  const iniciales = (staff?.nombre || staff?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div
      className="ldep-root"
      style={{
        '--ldep-color': depto?.color || '#2563EB',
        '--ldep-color-strong': depto?.colorStrong || '#1d4ed8',
        '--ldep-color-soft': depto?.colorLight || '#eef4fd',
      }}
    >
      <aside className={`ldep-drawer-panel ${drawerAbierto ? 'ldep-drawer-panel--abierto' : ''}`}>
        <div className="ldep-drawer-panel__header">
          <div className="ldep-drawer-panel__quien">
            <span className="ldep-drawer-panel__avatar">{iniciales}</span>
            <div className="ldep-drawer-panel__textos">
              <p className="ldep-drawer-panel__nombre">{staff?.nombre || 'Staff'}</p>
              <p className="ldep-drawer-panel__rol">{rol}</p>
            </div>
          </div>
          <button type="button" className="ldep-drawer-panel__cerrar" onClick={cerrarDrawer} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>
        <div className="ldep-drawer-panel__scroll">
          <Link to="/staff/dashboard" className="ldep-drawer-panel__dashboard" onClick={cerrarDrawer}>
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <ContenidoNav grupos={grupos} activo={activo} onNavigate={cerrarDrawer} departamento={departamento} puedeBridge={puedeBridge} entrandoAAdmin={entrandoAAdmin} onBridge={entrarAAdmin} />
        </div>
        <div className="ldep-drawer-panel__pie">
          <button type="button" className="ldep-drawer-panel__logout" onClick={logoutStaff}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className={`ldep-shift ${drawerAbierto ? 'ldep-shift--empujado' : ''}`}>
        {drawerAbierto && <div className="ldep-shift__catcher" onClick={cerrarDrawer} aria-hidden="true" />}

        <header className="ldep-topbar">
          <Link to="/staff/dashboard" className="ldep-topbar__dashboard-btn" aria-label="Ir al dashboard">
            <LayoutDashboard size={20} />
          </Link>
          <button type="button" className="ldep-topbar__menu-btn" onClick={() => setDrawerAbierto(true)} aria-label="Abrir menú de departamento">
            <Menu size={22} />
          </button>
          {IconoDepto && <IconoDepto size={18} className="ldep-topbar__depto-icono" />}
          <p className="ldep-topbar__titulo">{titulo}</p>
          {/* La campana va en el topbar móvil y en el header de la
              página (que se ve en escritorio): con los dos puntos de
              montaje se ve una sola vez en cualquier viewport. */}
          <div className="ldep-topbar__campana">
            <StaffCampanaNotificaciones />
          </div>
        </header>

        <div className="ldep-container">
          <div className="ldep-body">
            <aside className="ldep-sidebar">
              <div className="ldep-sidebar__sticky">
                <div className="ldep-sidebar__brand">
                  {IconoDepto && <span className="ldep-sidebar__brand-icono"><IconoDepto size={20} /></span>}
                  <div>
                    <p className="ldep-sidebar__brand-nombre">{depto?.nombre}</p>
                    <p className="ldep-sidebar__brand-sub">{staff?.nombre || 'Staff'} · {rol}</p>
                  </div>
                </div>

                <Link to="/staff/dashboard" className="ldep-sidebar__volver">
                  <LayoutDashboard size={16} />
                  Volver al dashboard
                </Link>

                <ContenidoNav grupos={grupos} activo={activo} onNavigate={cerrarDrawer} departamento={departamento} puedeBridge={puedeBridge} entrandoAAdmin={entrandoAAdmin} onBridge={entrarAAdmin} />
              </div>
            </aside>

            <main className="ldep-main">
              <div className="ldep-main__header">
                <h1 className="ldep-main__titulo">{titulo}</h1>
                <div className="ldep-main__campana">
                  <StaffCampanaNotificaciones />
                </div>
              </div>
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}

function ContenidoNav({ grupos, activo, onNavigate, departamento, puedeBridge, entrandoAAdmin, onBridge }) {
  const gruposVisibles = grupos.filter((grupo) => grupo.items.length > 0)
  if (gruposVisibles.length === 0 && !puedeBridge) {
    return <p className="ldep-nav__vacio">No tienes módulos en este departamento.</p>
  }
  return (
    <nav className="ldep-nav" aria-label={`Navegación de ${departamento}`}>
      {gruposVisibles.map((grupo) => (
        <div className="ldep-nav__grupo" key={grupo.titulo}>
          <span className="ldep-nav__grupo-titulo">{grupo.titulo}</span>
          {grupo.items.map((item) => (
            <ItemNav key={item.id} item={item} activo={activo} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
      {puedeBridge && (
        <div className="ldep-nav__grupo">
          <span className="ldep-nav__grupo-titulo">Administración</span>
          <button type="button" className="ldep-nav__bridge" onClick={onBridge} disabled={entrandoAAdmin}>
            <ShieldCheck size={17} />
            {entrandoAAdmin ? 'Entrando...' : 'Panel administrativo'}
          </button>
        </div>
      )}
    </nav>
  )
}

export default LayoutDepartamento