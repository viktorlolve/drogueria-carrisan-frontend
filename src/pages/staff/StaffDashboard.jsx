import { Link } from 'react-router-dom'
import { useState } from 'react'
import { LogOut, ShieldCheck, ArrowRight, Landmark } from 'lucide-react'
import { useStaffAuth } from '../../context/StaffAuthContext'
import staffApi from '../../api/staffAxios'
import { DEPARTAMENTOS, MODULOS, ROLES_BRIDGE_ADMIN } from '../../components/staff/NavStaff'
import { safeSetItem } from '../../utils/safeStorage'
import './StaffDashboard.css'

const ICONOS_MAPA = {}
for (const depto of DEPARTAMENTOS) {
  for (const grupo of MODULOS[depto.id] || []) {
    for (const item of grupo.items) {
      ICONOS_MAPA[item.id] = item.icono
    }
  }
}

function StaffDashboard() {
  const { staff, logoutStaff } = useStaffAuth()
  const [entrandoAAdmin, setEntrandoAAdmin] = useState(false)
  const [errorBridge, setErrorBridge] = useState('')
  const rol = staff?.rol

  const puedeBridge = ROLES_BRIDGE_ADMIN.includes(rol)

  // Departamentos con módulos visibles para el rol (para filtrar tarjetas).
  const departamentos = DEPARTAMENTOS
    .map((depto) => {
      const modulos = (MODULOS[depto.id] || [])
        .flatMap((grupo) => grupo.items)
        .filter((item) => item.roles.includes(rol))
      return { ...depto, modulos }
    })
    .filter((depto) => depto.modulos.length > 0)

  // Composición del dashboard según el acceso del rol:
  //  - 1 departamento accesible  -> jornada enfocada (botones grandes del depto).
  //  - más de 1                  -> panorámica (tarjetas de departamento, como hoy).
  const esJornadaEnfocada = departamentos.length === 1
  const deptoFoco = departamentos[0] || null

  const iniciales = (staff?.nombre || staff?.email || '?').trim().charAt(0).toUpperCase()

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

  const campana = (
    <button
      type="button"
      className="sd-campana"
      aria-label="Notificaciones"
      title="Notificaciones"
    >
      <svg className="icono sd-campana__icono" aria-hidden="true" viewBox="0 0 24 24" width="19" height="19">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  )

  if (esJornadaEnfocada) {
    return (
      <div className="sd-wrap">
        <header className="sd-topbar">
          <div className="sd-brand">
            <span className="sd-brand__logo"><Landmark size={20} /></span>
            <span className="sd-brand__nombre">Drogueria Carrisan</span>
          </div>
          <div className="sd-usuario">
            <span className="sd-usuario__avatar">{iniciales}</span>
            <div className="sd-usuario__texto">
              <p className="sd-usuario__nombre">{staff?.nombre || 'Staff'}</p>
              <p className="sd-usuario__rol">{rol}</p>
            </div>
            {campana}
            {puedeBridge && (
              <button
                type="button"
                className="sd-bridge"
                onClick={entrarAAdmin}
                disabled={entrandoAAdmin}
                aria-label="Panel administrativo"
                title="Panel administrativo"
              >
                <ShieldCheck size={17} />
                <span>{entrandoAAdmin ? 'Entrando...' : 'Admin'}</span>
              </button>
            )}
            <button className="sd-logout" onClick={logoutStaff} aria-label="Cerrar sesión">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <div className="sd-hero sd-hero--foco">
          <div className="sd-hero__glow" aria-hidden="true" />
          <div className="sd-hero__content">
            <p className="sd-hero__eyebrow">Panel interno · {deptoFoco.nombre}</p>
            <h1 className="sd-hero__titulo">
              Hola, <span>{staff?.nombre?.split(' ')[0] || 'Staff'}</span>
            </h1>
            <p className="sd-hero__sub">Tu jornada de hoy está lista. ¿Por dónde empezamos?</p>
          </div>
        </div>

        {errorBridge && <p className="sd-error">{errorBridge}</p>}

        <main className="sd-main">
          <div className="sd-foco">
            <div className="sd-foco__cab">
              <p className="sd-eyebrow">¿Qué haces hoy?</p>
              <h2 className="sd-foco__titulo">Acciones de {deptoFoco.nombre}</h2>
              <p className="sd-foco__desc">Selecciona una tarea para trabajar en {deptoFoco.nombre.toLowerCase()}.</p>
            </div>

            <div className="sd-foco__grid">
              {deptoFoco.modulos.map((modulo) => {
                const Icono = ICONOS_MAPA[modulo.id]
                return (
                  <Link
                    key={modulo.id}
                    to={`/staff/${deptoFoco.id}/${modulo.id}`}
                    className="sd-foco__btn"
                    style={{
                      '--sd-card-color': deptoFoco.color,
                      '--sd-card-color-soft': deptoFoco.colorLight,
                    }}
                  >
                    <span className="sd-foco__btn-ico">
                      {Icono && <Icono size={22} />}
                    </span>
                    <div className="sd-foco__btn-tx">
                      <strong className="sd-foco__btn-tit">{modulo.texto}</strong>
                      {modulo.desc && <span className="sd-foco__btn-desc">{modulo.desc}</span>}
                    </div>
                    <ArrowRight size={17} className="sd-foco__btn-arr" />
                  </Link>
                )
              })}
            </div>

            <p className="sd-foco__nota">
              ¿Necesitas otro módulo? Consulta tu rol o pide acceso a tu supervisor.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="sd-wrap">
      <header className="sd-topbar">
        <div className="sd-brand">
          <span className="sd-brand__logo"><Landmark size={20} /></span>
          <span className="sd-brand__nombre">Drogueria Carrisan</span>
        </div>
        <div className="sd-usuario">
          <span className="sd-usuario__avatar">{iniciales}</span>
          <div className="sd-usuario__texto">
            <p className="sd-usuario__nombre">{staff?.nombre || 'Staff'}</p>
            <p className="sd-usuario__rol">{rol}</p>
          </div>
          {campana}
          {puedeBridge && (
            <button
              type="button"
              className="sd-bridge"
              onClick={entrarAAdmin}
              disabled={entrandoAAdmin}
              aria-label="Panel administrativo"
              title="Panel administrativo"
            >
              <ShieldCheck size={17} />
              <span>{entrandoAAdmin ? 'Entrando...' : 'Admin'}</span>
            </button>
          )}
          <button className="sd-logout" onClick={logoutStaff} aria-label="Cerrar sesión">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <div className="sd-hero">
        <div className="sd-hero__glow" aria-hidden="true" />
        <div className="sd-hero__content">
          <p className="sd-hero__eyebrow">Panel interno</p>
          <h1 className="sd-hero__titulo">
            Hola, <span>{staff?.nombre?.split(' ')[0] || 'Staff'}</span>
          </h1>
          <p className="sd-hero__sub">Elige un departamento para comenzar tu jornada.</p>
        </div>
      </div>

      {errorBridge && <p className="sd-error">{errorBridge}</p>}

      <main className="sd-main">
        <div className="sd-grid">
          {departamentos.map((depto) => {
            const Icono = depto.icono
            return (
              <Link
                key={depto.id}
                to={`/staff/${depto.id}`}
                className="sd-card"
                style={{
                  '--sd-card-color': depto.color,
                  '--sd-card-color-soft': depto.colorLight,
                }}
              >
                <div className="sd-card__fondo" aria-hidden="true" />
                <div className="sd-card__cab">
                  <span className="sd-card__icono"><Icono size={26} /></span>
                  <ArrowRight size={18} className="sd-card__flecha" />
                </div>
                <h2 className="sd-card__nombre">{depto.nombre}</h2>
                <p className="sd-card__desc">{depto.descripcion}</p>
                <div className="sd-card__menu">
                  {depto.modulos.map((m) => {
                    const IconoModulo = ICONOS_MAPA[m.id]
                    return (
                      <span key={m.id} className="sd-card__chip">
                        {IconoModulo && <IconoModulo size={13} />}
                        {m.texto}
                      </span>
                    )
                  })}
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default StaffDashboard
