import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, ChevronDown, LogOut, ShieldCheck, LayoutGrid } from 'lucide-react'
import { useStaffAuth } from '../../context/StaffAuthContext'
import { DEPARTAMENTOS, MODULOS, ROLES_BRIDGE_ADMIN } from './NavStaff'
import staffApi from '../../api/staffAxios'
import { safeSetItem } from '../../utils/safeStorage'
import StaffCampanaNotificaciones from './StaffCampanaNotificaciones'
import BotonInstalarStaff from './BotonInstalarStaff'
import './StaffNavbar.css'

// ---------------------------------------------------------------
// Navbar superior del área staff — barra compacta, sticky y clara.
//
// SIN logo ni título de página (decisión del dueño 2026-11-07): el
// título de la página vive UNA sola vez, en el header del contenido
// (LayoutDepartamento). Antes se repetía aquí y, en móvil, el nombre
// de la empresa + el título obligaban a una barra de 3 filas.
//
// Se monta en LayoutDepartamento (todas las páginas de trabajo) y en
// StaffDashboard (standalone). La campana de notificaciones se monta
// UNA sola vez aquí.
//
// Piezas:
//   - Botón menú (solo si hay drawer: LayoutDepartamento, <1024px)
//   - Contexto: departamento activo (selector si el rol ve 2+ deptos)
//   - Campana (StaffCampanaNotificaciones)
//   - Menú de usuario: nombre/rol + bridge (solo roles bridge) +
//     instalar app + cerrar sesión
//
// Props:
//   - departamento: id del depto activo (marca el selector)
//   - onAbrirMenu: abre el drawer del layout (LayoutDepartamento)
// ---------------------------------------------------------------
function StaffNavbar({ departamento = '', onAbrirMenu = null }) {
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
  // muestra el selector; con 0 o 1 no aporta (se entra al hub desde el
  // dashboard o desde este mismo módulo/sidebar).
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

  const IconoDeptoActivo = deptoActual?.icono || LayoutGrid

  return (
    <header className="snb">
      <div className="snb-izq">
        {onAbrirMenu && (
          <button type="button" className="snb-menu-btn" onClick={onAbrirMenu} aria-label="Abrir menú de departamento">
            <Menu size={20} />
          </button>
        )}

        {conSelectorDepto ? (
          <div className="snb-depto" ref={deptoRef}>
            <button
              type="button"
              className="snb-depto__btn"
              onClick={alternarDepto}
              aria-expanded={deptoAbierto}
              aria-label="Cambiar de departamento"
            >
              <IconoDeptoActivo size={15} />
              <span className="snb-depto__texto">{deptoActual?.nombre || 'Departamentos'}</span>
              <ChevronDown size={14} className={deptoAbierto ? 'snb-depto__chevron--abajo' : ''} />
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
        ) : (
          deptoActual && (
            <span className="snb-depto__fijo">
              <IconoDeptoActivo size={15} />
              <span className="snb-depto__texto">{deptoActual.nombre}</span>
            </span>
          )
        )}
      </div>

      <div className="snb-derecha">
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

              <BotonInstalarStaff className="snb-instalar-btn" texto="Instalar app" />

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
