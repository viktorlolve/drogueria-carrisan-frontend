import { Link, Navigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useStaffAuth } from '../../context/StaffAuthContext'
import { useStaffBadges } from '../../context/StaffBadgesContext'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import { DEPARTAMENTOS, MODULOS } from '../../components/staff/NavStaff'
import './StaffDepartamento.css'

// ---------------------------------------------------------------
// <StaffDepartamento departamento="logistica" />
//
// Hub / landing de un departamento. Reutiliza LayoutDepartamento
// (sidebar del depto, colores propios vía --ldep-color) y muestra
// en el contenido los módulos del depto visibles para el rol.
// ---------------------------------------------------------------
function StaffDepartamento({ departamento }) {
  const { staff } = useStaffAuth()
  const rol = staff?.rol

  const depto = DEPARTAMENTOS.find((d) => d.id === departamento)
  const modulos = (MODULOS[departamento] || [])
    .flatMap((grupo) => grupo.items)
    .filter((item) => item.roles.includes(rol))

  const { conteos } = useStaffBadges()

  // Sin módulos visibles → no tiene acceso a este departamento.
  if (!depto || modulos.length === 0) {
    return <Navigate to="/staff/dashboard" replace />
  }

  const Icono = depto.icono

  return (
    <LayoutDepartamento departamento={departamento} activo="" titulo={depto.nombre}>
      <section className="sdpto-hero">
        <span className="sdpto-hero__icono">{Icono && <Icono size={34} />}</span>
        <div className="sdpto-hero__texto">
          <h2 className="sdpto-hero__nombre">{depto.nombre}</h2>
          <p className="sdpto-hero__desc">{depto.descripcion}</p>
        </div>
      </section>

      <div className="sdpto-grid">
        {modulos.map((m) => {
          const IconoModulo = m.icono
          return (
            <Link key={m.id} to={m.to} className="sdpto-card">
              <div className="sdpto-card__top">
                <span className="sdpto-card__icono">{IconoModulo && <IconoModulo size={22} />}</span>
                <ArrowRight size={18} className="sdpto-card__flecha" />
              </div>
              <p className="sdpto-card__titulo">{m.texto}</p>
              {m.desc && <p className="sdpto-card__desc">{m.desc}</p>}
              {m.contador && conteos[m.contador] > 0 && (
                <p className="sdpto-card__conteo">{conteos[m.contador]}</p>
              )}
            </Link>
          )
        })}
      </div>
    </LayoutDepartamento>
  )
}

export default StaffDepartamento