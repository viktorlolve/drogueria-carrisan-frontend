import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, ChevronDown, LogOut, ShieldCheck } from 'lucide-react'
import { useStaffAuth } from '../../context/StaffAuthContext'
import { DEPARTAMENTOS, MODULOS, ROLES_BRIDGE_ADMIN } from './NavStaff'
import empresaInfo from '../../config/empresa'
import staffApi from '../../api/staffAxios'
import { safeSetItem } from '../../utils/safeStorage'
import StaffCampanaNotificaciones from './StaffCampanaNotificaciones'
import BotonInstalarStaff from './BotonInstalarStaff'
import './StaffNavbar.css'

// ---------------------------------------------------------------
// Navbar superior del área staff — full-width, sticky, azul de marca
// (mismo lenguaje visual que el Navbar de la tienda, pero SIN buscador
// ni carrito: esa sesión es la del cliente, no la del personal).
//
// Se monta en LayoutDepartamento (todas las páginas de trabajo) y en
// StaffDashboard (standalone). La campana de notificaciones se monta
// UNA sola vez aquí: antes vivía en el topbar móvil y en el header de
// cada página (dos polls del mismo contador).
//
// Piezas:
//   - Botón menú (solo si hay drawer: LayoutDepartamento, <1024px)
//   - Logo → /staff/dashboard. `empresaInfo.logoStaffUrl` vacío =
//     placeholder con el nombre de la empresa en texto (pendiente del
//     dueño de pegar la URL).
//   - Selector de departamento (≥1024px, solo si el rol ve 2+ deptos)
//   - Campana (StaffCampanaNotificaciones)
//   - Menú de usuario: nombre/rol + bridge (solo roles bridge) +
//     instalar app + cerrar sesión
//
// Props:
//   - departamento: id del depto activo (marca el selector)
//   - titulo: título de la página (visible en móvil)
//   - onAbrirMenu: abre el drawer del layout (LayoutDepartamento)
// ---------------------------------------------------------------
function StaffNavbar({ departamento = '', titulo = '', onAbrirMenu = null }) {
  const { staff, logoutStaff } = useStaffAuth()
  const navigate = useNavigate()

  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false)
  const [deptoAbierto, setDeptoAbierto] = useState(false)
  const [entrandoAAdmin, setEntrandoAAdmin] = useState(false)
  const [errorBridge, setErrorBridge] = useState('')

  const menuRef = useRef(null)
  const deptoRef = useRef(null)

  const rol = staff?.rol
  const puedeBridge = ROLES_BRIDGE_ADMIN.includes(rol)
  const iniciales = (staff?.nombre || staff?.email || '?').trim().charAt(0).toUpperCase()

  // Departamentos con al menos un módulo visible para el rol. Con 2+ se
  // muestra el selector; con 0 o 1 no aporta (el logo ya lleva al
  // dashboard y desde ahí se entra al hub).
  const deptosVisibles = DEPARTAMENTOS.filter((d) =>
    (MODULOS[d.id] || []).some((grupo) => grupo.items.some((item) => item.roles.includes(rol)))
  )
  const conSelectorDepto = deptosVisibles.length > 1
  const deptoActual = DEPARTAMENTOS.find((d) => d.id === departamento)

  useEffect(() => {
    if (!menuUsuarioAbierto && !deptoAbierto) return undefined

    function alClickFuera(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuUsuarioAbierto(false)
      if (deptoRef.current && !deptoRef.current.contains(e.target)) setDeptoAbierto(false)
    }
    function alEsc(e) {
      if (e.key === 'Escape') {
        setMenuUsuarioAbierto(false)
        setDeptoAbierto(false)
      }
    }

    document.addEventListener('mousedown', alClickFuera)
    document.addEventListener('keydown', alEsc)
    return () => {
      document.removeEventListener('mousedown', alClickFuera)
      document.removeEventListener('keydown', alEsc)
    }
  }, [menuUsuarioAbierto, deptoAbierto])

  function alternarMenu() {
    const siguiente = !menuUsuarioAbierto
    setMenuUsuarioAbierto(siguiente)
    if (siguiente) setDeptoAbierto(false)
  }

  function alternarDepto() {
    const siguiente = !deptoAbierto
    setDeptoAbierto(siguiente)
    if (siguiente) setMenuUsuarioAbierto(false)
  }

  function irADepartamento(id) {
    setDeptoAbierto(false)
    navigate(`/staff/${id}`)
  }

  // Mismo bridge que en LayoutDepartamento / StaffDashboard: la sesión
  // staff pide un JWT de cliente con es_admin y se recarga a /admin.
  async function entrarAAdmin() {
    setErrorBridge('')
    setEntrandoAAdmin(true)
    try {
      const { data } = await staffApi.post('/staff/admin-bridge')
      safeSetItem('token', data.token)
      safeSetItem('user', JSON.stringify(data.user))
      window.location.href = '/admin'
    } catch (err) {
      setErrorBridge(err.response?.data?.error || 'No se pudo entrar al panel administrativo')
      setEntrandoAAdmin(false)
    }
  }

  function cerrarSesion() {
    setMenuUsuarioAbierto(false)
    logoutStaff()
  }

  return (
    <header className="snb">
      {onAbrirMenu && (
        <button type="button" className="snb-menu-btn" onClick={onAbrirMenu} aria-label="Abrir menú de departamento">
          <Menu size={22} />
        </button>
      )}

      <Link to="/staff/dashboard" className="snb-logo" aria-label="Ir al panel de staff">
        {empresaInfo.logoStaffUrl ? (
          <img src={empresaInfo.logoStaffUrl} alt="Droguería Carrisan" className="snb-logo__img" />
        ) : (
          <>
            <span className="snb-logo__ph" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <span className="snb-logo__texto">Droguería Carrisan</span>
          </>
        )}
      </Link>

      {titulo && <p className="snb-titulo">{titulo}</p>}

      <div className="snb-derecha">
        {conSelectorDepto && (
          <div className="snb-depto" ref={deptoRef}>
            <button
              type="button"
              className="snb-depto__btn"
              onClick={alternarDepto}
              aria-expanded={deptoAbierto}
              aria-label="Cambiar de departamento"
            >
              {deptoActual?.icono && <deptoActual.icono size={16} />}
              <span>{deptoActual?.nombre || 'Departamentos'}</span>
              <ChevronDown size={15} className={deptoAbierto ? 'snb-depto__chevron--abajo' : ''} />
            </button>
            {deptoAbierto && (
              <div className="snb-depto__panel">
                {deptosVisibles.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`snb-depto__link ${d.id === departamento ? 'snb-depto__link--activo' : ''}`}
                    onClick={() => irADepartamento(d.id)}
                  >
                    <d.icono size={16} />
                    {d.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <StaffCampanaNotificaciones />

        <div className="snb-usuario" ref={menuRef}>
          <button
            type="button"
            className="snb-usuario__btn"
            onClick={alternarMenu}
            aria-expanded={menuUsuarioAbierto}
            aria-label="Menú de usuario"
          >
            <span className="snb-usuario__avatar">{iniciales}</span>
            <span className="snb-usuario__textos">
              <span className="snb-usuario__nombre">{staff?.nombre || 'Staff'}</span>
              <span className="snb-usuario__rol">{rol}</span>
            </span>
            <ChevronDown size={15} className={menuUsuarioAbierto ? 'snb-usuario__chevron--abajo' : ''} />
          </button>

          {menuUsuarioAbierto && (
            <div className="snb-menu">
              <div className="snb-menu__header">
                <span className="snb-menu__nombre">{staff?.nombre || 'Staff'}</span>
                <span className="snb-menu__rol">{rol}</span>
              </div>

              {puedeBridge && (
                <button
                  type="button"
                  className="snb-menu__item"
                  onClick={entrarAAdmin}
                  disabled={entrandoAAdmin}
                >
                  <ShieldCheck size={16} />
                  {entrandoAAdmin ? 'Entrando...' : 'Panel administrativo'}
                </button>
              )}

              <BotonInstalarStaff className="snb-instalar-btn" />

              {errorBridge && <p className="snb-menu__error">{errorBridge}</p>}

              <button type="button" className="snb-menu__item snb-menu__item--peligro" onClick={cerrarSesion}>
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default StaffNavbar
