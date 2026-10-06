import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useStaffAuth } from '../../context/StaffAuthContext'
import { DEPARTAMENTOS, MODULOS } from '../../components/staff/NavStaff'
import StaffNavbar from '../../components/staff/StaffNavbar'
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
  const { staff } = useStaffAuth()
  const rol = staff?.rol

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

  if (esJornadaEnfocada) {
    return (
      <div className="sd-wrap">
        <StaffNavbar />

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
      <StaffNavbar />

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
