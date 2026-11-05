import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileText,
  Gift,
  Megaphone,
  Minus,
  ShoppingCart,
} from 'lucide-react'
import { useStaffAuth } from '../../context/StaffAuthContext'
import { useStaffBadges } from '../../context/StaffBadgesContext'
import { DEPARTAMENTOS, MODULOS } from '../../components/staff/NavStaff'
import StaffNavbar from '../../components/staff/StaffNavbar'
import staffApi from '../../api/staffAxios'
import { formatearFechaCorta, formatearTasa } from '../../utils/formato'
import {
  esTasaVieja,
  guardarUltimaTasaLocal,
  leerUltimaTasaLocal,
  variacionTasa,
} from '../../utils/tasaCambio'
import './StaffDashboard.css'

// ---------------------------------------------------------------
// Dashboard de staff (/staff/dashboard). Rediseño (2026-11-04) con el MISMO
// patrón visual del menú móvil del cliente (src/pages/Menu.jsx): hero +
// bento de accesos destacados + acordeón de navegación, en vez de las dos
// variantes previas (jornada enfocada vs panorámica) con JSX separado.
//
// Un departamento sin módulos visibles para el rol simplemente no se
// renderiza (igual que GrupoNav en Menu.jsx) — así un vendedor (1 solo
// departamento) y un director (3) comparten el mismo layout sin ramas.
//
// Piezas:
//  - Hero Índigo con saludo + Tasa BCV (se conserva tal cual)
//  - Atajos: uno por departamento visible (solo si hay 2+), con el total
//    de pendientes de TODOS sus módulos (no solo los del acordeón)
//  - Bento "Acciones rápidas": crear algo de una vez (ver ACCIONES_RAPIDAS)
//  - Acordeón "Tu espacio": un grupo por departamento, teñido con su color
//    de marca real (NavStaff.js), con los módulos que NO son acción rápida
// ---------------------------------------------------------------

// Accesos directos del bento: crean algo de una vez, sin pasar por la lista
// del módulo. Se sacan del acordeón de su departamento (ACCIONES_RAPIDAS_IDS)
// para no duplicar el enlace. `?nuevo=1` abre el modal de creación de una vez
// en Presupuestos y Promociones (ver StaffPresupuestos.jsx / StaffPromociones.jsx).
const ACCIONES_RAPIDAS = [
  {
    id: 'ordenes',
    to: '/staff/ordenes',
    titulo: 'Crear orden a cliente',
    texto: 'Arma un pedido a nombre de un cliente ya registrado',
    icono: ShoppingCart,
    variante: 'azul',
    ancho: true,
    roles: ['vendedor', 'administrador', 'director', 'admin'],
  },
  {
    id: 'presupuestos',
    to: '/staff/presupuestos?nuevo=1',
    titulo: 'Crear presupuesto',
    texto: 'Cotización rápida con precios congelados 24 h',
    icono: FileText,
    variante: 'teal',
    roles: ['vendedor', 'administrador', 'director', 'admin'],
  },
  {
    id: 'cupones',
    to: '/staff/cupones',
    titulo: 'Nuevo cupón',
    texto: 'Código de descuento por porcentaje o monto fijo',
    icono: Gift,
    variante: 'indigo',
    roles: ['administrador', 'director', 'admin'],
  },
  {
    id: 'promociones',
    to: '/staff/promociones?nuevo=1',
    titulo: 'Nueva promoción',
    texto: 'Plantilla de mensaje para enviar a clientes',
    icono: Megaphone,
    variante: 'claro',
    roles: ['administrador', 'director', 'admin'],
  },
]

const ACCIONES_RAPIDAS_IDS = new Set(ACCIONES_RAPIDAS.map((a) => a.id))

const formatearConteo = (n) => (n >= 100 ? '99+' : String(n))

// Hora de la última actualización (24 h) para acompañar la fecha corta.
// No usa toLocaleString completo porque ahí el navegador decide el formato.
function horaCorta(iso) {
  if (!iso) return null
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return null
  return fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Lectura de la tasa oficial USD→Bs (la actualiza SOLO el dueño desde /admin).
// Es informativa: el staff no la edita ni la confirma desde acá.
function TasaBcv() {
  const [tasa, setTasa] = useState(null)
  const [variacion, setVariacion] = useState(null)
  const [estado, setEstado] = useState('cargando') // cargando | lista | error

  useEffect(() => {
    let activo = true
    staffApi
      .get('/prices')
      .then(({ data }) => {
        if (!activo) return
        // La fila anterior del backend puede no existir (primer día con el
        // endpoint nuevo): en ese caso se compara contra la última tasa vista
        // en este dispositivo. Se lee ANTES de guardar la actual.
        const anterior = data?.anterior_usd_a_ves ?? leerUltimaTasaLocal()?.usd_a_ves ?? null
        setTasa(data)
        setVariacion(variacionTasa(data?.usd_a_ves, anterior))
        setEstado('lista')
        guardarUltimaTasaLocal(data)
      })
      .catch(() => { if (activo) setEstado('error') })
    return () => { activo = false }
  }, [])

  const vieja = estado === 'lista' && esTasaVieja(tasa?.updated_at)
  const fecha = estado === 'lista' ? formatearFechaCorta(tasa?.updated_at) : null
  const hora = estado === 'lista' ? horaCorta(tasa?.updated_at) : null
  const actualizado = fecha ? (hora ? `${fecha} · ${hora}` : fecha) : null

  const sube = variacion?.abs > 0
  const claseVar = sube
    ? 'sd-tasa__var--sube'
    : variacion?.abs < 0
      ? 'sd-tasa__var--baja'
      : 'sd-tasa__var--igual'
  const IconoVar = sube ? ArrowUpRight : variacion?.abs < 0 ? ArrowDownRight : Minus

  return (
    <div className={`sd-tasa${vieja ? ' sd-tasa--vieja' : ''}`}>
      <div className="sd-tasa__cab">
        <span className="sd-tasa__label"><DollarSign size={12} /> Tasa BCV</span>
        {variacion && (
          <span className={`sd-tasa__var ${claseVar}`}>
            <IconoVar size={12} />
            {formatearTasa(variacion.pct)}%
          </span>
        )}
      </div>

      <p className="sd-tasa__valor">
        {estado === 'lista' ? formatearTasa(tasa?.usd_a_ves) : '—'}
        <span className="sd-tasa__unidad"> Bs/USD</span>
      </p>

      <p className="sd-tasa__meta">
        {estado === 'lista' && (
          <>
            {variacion && (
              <>
                {sube ? '+' : ''}{formatearTasa(variacion.abs)} Bs ·{' '}
              </>
            )}
            {actualizado ? `Actualizada ${actualizado}` : 'Sin fecha de actualización'}
          </>
        )}
        {estado === 'cargando' && 'Cargando…'}
        {estado === 'error' && 'No disponible ahora'}
      </p>

      {vieja && (
        <p className="sd-tasa__aviso">
          <AlertTriangle size={12} />
          Sin actualizar hace más de 24 h
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------
// Atajo por departamento (cabecera): icono + total de pendientes + nombre
// ---------------------------------------------------------------
function AtajoDepto({ depto, pendientes }) {
  const Icono = depto.icono
  return (
    <Link to={`/staff/${depto.id}`} className="sd-atajo">
      <span className="sd-atajo__icono">
        <Icono size={20} aria-hidden="true" />
        {pendientes > 0 && (
          <span className="sd-atajo__conteo" aria-label={`${pendientes} pendientes`}>
            {formatearConteo(pendientes)}
          </span>
        )}
      </span>
      <span className="sd-atajo__texto">{depto.nombre}</span>
    </Link>
  )
}

// ---------------------------------------------------------------
// Bento de acciones rápidas
// ---------------------------------------------------------------
function TileBento({ accion, indice }) {
  const Icono = accion.icono
  return (
    <Link
      to={accion.to}
      className={`sd-tile sd-tile--${accion.variante}${accion.ancho ? ' sd-tile--ancho' : ''}`}
      style={{ '--i': indice }}
    >
      <span className="sd-tile__icono">
        <Icono size={accion.ancho ? 26 : 22} aria-hidden="true" />
      </span>
      <ArrowUpRight className="sd-tile__flecha" size={18} aria-hidden="true" />
      <span className="sd-tile__texto">
        <strong className="sd-tile__titulo">{accion.titulo}</strong>
        <span className="sd-tile__desc">{accion.texto}</span>
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------
// Acordeón por departamento (NavStaff.MODULOS), teñido con su color real
// ---------------------------------------------------------------
function GrupoDepto({ depto, indice, abierto, onAlternar, conteos }) {
  if (depto.modulos.length === 0) return null

  const Icono = depto.icono
  const pendientes = depto.modulos.reduce((s, m) => s + (m.contador ? conteos[m.contador] || 0 : 0), 0)
  const idCuerpo = `sd-grupo-${depto.id}`

  return (
    <div
      className={`sd-grupo${abierto ? ' sd-grupo--abierto' : ''}`}
      style={{ '--sd-tinte': depto.color, '--sd-tinte-fondo': depto.colorLight, '--i': indice }}
    >
      <button
        type="button"
        className="sd-grupo__cabecera"
        onClick={() => onAlternar(depto.id)}
        aria-expanded={abierto}
        aria-controls={idCuerpo}
      >
        <span className="sd-grupo__icono">
          <Icono size={20} aria-hidden="true" />
        </span>
        <span className="sd-grupo__titulo">{depto.nombre}</span>
        {pendientes > 0 && !abierto && (
          <span className="sd-conteo" aria-label={`${pendientes} pendientes`}>
            {formatearConteo(pendientes)}
          </span>
        )}
        <ChevronDown className="sd-grupo__chevron" size={18} aria-hidden="true" />
      </button>

      <div id={idCuerpo} className="sd-grupo__cuerpo" inert={!abierto}>
        <div className="sd-grupo__interior">
          {depto.modulos.map((m) => {
            const IconoModulo = m.icono
            const n = m.contador ? conteos[m.contador] || 0 : 0
            return (
              <Link key={m.id} to={m.to} className="sd-item">
                <span className="sd-item__icono">
                  <IconoModulo size={18} aria-hidden="true" />
                </span>
                <span className="sd-item__texto">
                  <strong className="sd-item__titulo">{m.texto}</strong>
                  {m.desc && <span className="sd-item__desc">{m.desc}</span>}
                </span>
                {n > 0 && (
                  <span className="sd-conteo" aria-label={`${n} pendientes`}>
                    {formatearConteo(n)}
                  </span>
                )}
                <ChevronRight className="sd-item__flecha" size={16} aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Página
// ---------------------------------------------------------------
function StaffDashboard() {
  const { staff } = useStaffAuth()
  const rol = staff?.rol
  const { conteos } = useStaffBadges()

  // Departamentos con sus módulos visibles para el rol, SIN los que ya viven
  // como botón directo en "Acciones rápidas" (no se duplica el enlace).
  const departamentos = DEPARTAMENTOS
    .map((depto) => {
      const modulos = (MODULOS[depto.id] || [])
        .flatMap((grupo) => grupo.items)
        .filter((item) => item.roles.includes(rol) && !ACCIONES_RAPIDAS_IDS.has(item.id))
      return { ...depto, modulos }
    })
    .filter((depto) => depto.modulos.length > 0)

  // Pendientes por departamento para el atajo de la cabecera: cuenta TODOS los
  // módulos con contador que el rol ve, estén en el acordeón o en el bento.
  function pendientesDepto(depto) {
    const todos = (MODULOS[depto.id] || []).flatMap((g) => g.items).filter((it) => it.roles.includes(rol))
    return todos.reduce((s, it) => s + (it.contador ? conteos[it.contador] || 0 : 0), 0)
  }

  const accionesRapidas = ACCIONES_RAPIDAS.filter((a) => a.roles.includes(rol))

  const [abiertos, setAbiertos] = useState(
    () => new Set(departamentos.length === 1 ? [departamentos[0].id] : [])
  )

  function alternarGrupo(id) {
    setAbiertos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  return (
    <div className="sd-wrap">
      <StaffNavbar />

      <div className="sd-hero">
        <span className="sd-hero__fondo" aria-hidden="true" />
        <div className="sd-hero__content">
          <p className="sd-hero__eyebrow">Panel interno</p>
          <h1 className="sd-hero__titulo">
            Hola, <span>{staff?.nombre?.split(' ')[0] || 'Staff'}</span>
          </h1>
          <p className="sd-hero__sub">Tu jornada de hoy está lista. ¿Por dónde empezamos?</p>
        </div>
        <TasaBcv />
      </div>

      {departamentos.length > 1 && (
        <nav className="sd-atajos" aria-label="Departamentos">
          {departamentos.map((depto) => (
            <AtajoDepto key={depto.id} depto={depto} pendientes={pendientesDepto(depto)} />
          ))}
        </nav>
      )}

      <main className="sd-main">
        {accionesRapidas.length > 0 && (
          <section className="sd-seccion" aria-labelledby="sd-t-acciones">
            <h2 id="sd-t-acciones" className="sd-seccion__titulo">Acciones rápidas</h2>
            <div className="sd-bento">
              {accionesRapidas.map((accion, i) => (
                <TileBento key={accion.id} accion={accion} indice={i} />
              ))}
            </div>
          </section>
        )}

        <section className="sd-seccion" aria-labelledby="sd-t-espacio">
          <h2 id="sd-t-espacio" className="sd-seccion__titulo">Tu espacio</h2>
          {departamentos.map((depto, i) => (
            <GrupoDepto
              key={depto.id}
              depto={depto}
              indice={i}
              abierto={abiertos.has(depto.id)}
              onAlternar={alternarGrupo}
              conteos={conteos}
            />
          ))}
        </section>
      </main>
    </div>
  )
}

export default StaffDashboard