import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BadgePercent,
  Bell,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  Hospital,
  LayoutGrid,
  LogOut,
  Pill,
  ShieldCheck,
  ShoppingCart,
  X,
} from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useFavoritos } from '../context/FavoritosContext'
import { useNavBadges } from '../context/NavBadgesContext'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import HojaInferior from '../components/HojaInferior'
import { formatearUSD } from '../utils/formato'
import { safeGetItem, safeSetItem } from '../utils/safeStorage'
import './Menu.css'

// ---------------------------------------------------------------
// Menú móvil (FAB central del BottomNav → /menu). Prefijo de clases
// `mnu-` (el CSS es global).
//
// Fuente de los items:
//  - Los grupos de cuenta, solicitudes y ayuda salen de NAV_UNIFICADO
//    (la misma fuente que el sidebar de las páginas principales).
//  - ACCESOS (catálogo, ofertas, líneas) no existen en NAV_UNIFICADO
//    porque no son navegación de cuenta: viven acá como bento.
//
// Datos en vivo: badges (NavBadgesContext), crédito disponible
// (GET /clientes/:id/estado-cuenta → resumen) y contadores de
// carrito y favoritos (contextos ya montados en App.jsx).
// ---------------------------------------------------------------

const CLAVE_OCULTAR = 'ec_ocultar_saldos' // compartida con Estado de cuenta
const MASCARA = '••••••'

const ACCESOS = [
  { id: 'catalogo', to: '/catalogo', titulo: 'Catálogo', texto: 'Explora todos los productos', icono: LayoutGrid, variante: 'azul', ancho: true },
  { id: 'ofertas', to: '/ofertas', titulo: 'Ofertas', texto: 'Descuentos y promociones', icono: BadgePercent, variante: 'indigo' },
  { id: 'inhrr', to: '/registro-inhrr', titulo: 'Vademécum INHRR', texto: 'Registro sanitario oficial', icono: ShieldCheck, variante: 'teal', etiqueta: 'NUEVO' },
  { id: 'farmacia', to: '/farmacia', titulo: 'Línea Farmacia', texto: 'Medicamentos y cuidado personal', icono: Pill, variante: 'claro' },
  { id: 'hospitalaria', to: '/hospitalaria', titulo: 'Línea Hospitalaria', texto: 'Insumos para clínicas y centros quirurgicos', icono: Hospital, variante: 'claro' },
]

const TINTES = ['azul', 'teal', 'indigo']

const LINKS_PIE = [
  { to: '/quienes-somos', texto: 'Quiénes somos' },
  { to: '/terminos', texto: 'Términos' },
  { to: '/privacidad', texto: 'Privacidad' },
]

const formatearConteo = (n) => (n >= 100 ? '99+' : String(n))

function saludoSegunHora() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

// ---------------------------------------------------------------
// Crédito disponible (misma cifra que "Disponible para comprar" de Mi Cuenta)
// ---------------------------------------------------------------
function useResumenCredito(userId) {
  const [estado, setEstado] = useState({ cargando: true, resumen: null })

  useEffect(() => {
    if (!userId) return undefined
    let cancelado = false

    api
      .get(`/clientes/${userId}/estado-cuenta`)
      .then(({ data }) => {
        if (!cancelado) setEstado({ cargando: false, resumen: data?.resumen || null })
      })
      .catch(() => {
        // Sin dato no hay cifra: la tarjeta cae a un acceso simple.
        if (!cancelado) setEstado({ cargando: false, resumen: null })
      })

    return () => {
      cancelado = true
    }
  }, [userId])

  return estado
}

function TarjetaCredito({ estado, oculto, onAlternar }) {
  const { cargando, resumen } = estado

  if (cargando) {
    return (
      <div className="mnu-credito mnu-credito--cargando" aria-busy="true" aria-label="Cargando crédito">
        <span className="mnu-sk mnu-sk--corto" />
        <span className="mnu-sk mnu-sk--monto" />
        <span className="mnu-sk mnu-sk--barra" />
      </div>
    )
  }

  const tieneCredito = !!resumen && Number(resumen.linea_credito) > 0

  if (!tieneCredito) {
    return (
      <Link to="/estado-de-cuenta" className="mnu-credito mnu-credito--simple">
        <span className="mnu-credito__etiqueta">Estado de cuenta</span>
        <span className="mnu-credito__simple-texto">
          Facturas, pagos y reportes
          <ChevronRight size={18} aria-hidden="true" />
        </span>
      </Link>
    )
  }

  const porcentaje = Math.min((resumen.deuda_actual / resumen.linea_credito) * 100, 100) || 0
  const nivel = porcentaje >= 90 ? 'critico' : porcentaje >= 80 ? 'alto' : 'ok'
  const vencidas = Number(resumen.cantidad_ordenes_vencidas) || 0
  const monto = (v) => (oculto ? `USD ${MASCARA}` : formatearUSD(v))

  return (
    <div className="mnu-credito">
      <div className="mnu-credito__top">
        <span className="mnu-credito__etiqueta">Disponible para comprar</span>
        <button
          type="button"
          className="mnu-credito__ojo"
          onClick={onAlternar}
          aria-pressed={oculto}
          aria-label={oculto ? 'Mostrar montos' : 'Ocultar montos'}
        >
          {oculto ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>

      <Link to="/estado-de-cuenta" className="mnu-credito__cuerpo">
        <span className={`mnu-credito__monto${resumen.saldo <= 0 ? ' mnu-credito__monto--cero' : ''}`}>
          {monto(resumen.saldo)}
        </span>
        <span className="mnu-credito__barra" role="presentation">
          <span
            className={`mnu-credito__relleno mnu-credito__relleno--${nivel}`}
            style={{ width: `${porcentaje}%` }}
          />
        </span>
        <span className="mnu-credito__pie">
          <span>Línea {monto(resumen.linea_credito)}</span>
          <span>{Math.round(porcentaje)}% usado</span>
        </span>
      </Link>

      {(resumen.credito_bloqueado || vencidas > 0) && (
        <div className="mnu-credito__alertas">
          {resumen.credito_bloqueado && (
            <span className="mnu-alerta">Crédito bloqueado</span>
          )}
          {vencidas > 0 && (
            <span className="mnu-alerta">
              {vencidas} {vencidas === 1 ? 'orden vencida' : 'órdenes vencidas'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------
// Atajos con contador (carrito · favoritos · notificaciones)
// ---------------------------------------------------------------
function Atajo({ to, icono: Icono, texto, cantidad, alerta = false }) {
  return (
    <Link to={to} className="mnu-atajo">
      <span className="mnu-atajo__icono">
        <Icono size={20} aria-hidden="true" />
        {cantidad > 0 && (
          <span
            className={`mnu-atajo__conteo${alerta ? ' mnu-atajo__conteo--alerta' : ''}`}
            aria-label={`${cantidad} pendientes`}
          >
            {formatearConteo(cantidad)}
          </span>
        )}
      </span>
      <span className="mnu-atajo__texto">{texto}</span>
    </Link>
  )
}

// ---------------------------------------------------------------
// Bento
// ---------------------------------------------------------------
function TileBento({ acceso, indice }) {
  const Icono = acceso.icono
  return (
    <Link
      to={acceso.to}
      className={`mnu-tile mnu-tile--${acceso.variante}${acceso.ancho ? ' mnu-tile--ancho' : ''}`}
      style={{ '--i': indice }}
    >
      <span className="mnu-tile__icono">
        <Icono size={acceso.ancho ? 26 : 22} aria-hidden="true" />
      </span>
      {acceso.etiqueta && <span className="mnu-tile__etiqueta">{acceso.etiqueta}</span>}
      <ArrowUpRight className="mnu-tile__flecha" size={18} aria-hidden="true" />
      <span className="mnu-tile__texto">
        <strong className="mnu-tile__titulo">{acceso.titulo}</strong>
        <span className="mnu-tile__desc">{acceso.texto}</span>
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------
// Grupos de NAV_UNIFICADO (acordeón)
// ---------------------------------------------------------------
function GrupoNav({ grupo, indice, abierto, onAlternar, conteos, esAdmin }) {
  const items = grupo.items.filter((it) => !(it.soloCliente && esAdmin))
  if (items.length === 0) return null

  const IconoGrupo = grupo.icono
  const pendientes = items.reduce((suma, it) => suma + (it.contador ? conteos[it.contador] || 0 : 0), 0)
  const idCuerpo = `mnu-grupo-${grupo.id}`

  return (
    <div
      className={`mnu-grupo mnu-grupo--${TINTES[indice % TINTES.length]}${abierto ? ' mnu-grupo--abierto' : ''}`}
      style={{ '--i': indice }}
    >
      <button
        type="button"
        className="mnu-grupo__cabecera"
        onClick={() => onAlternar(grupo.id)}
        aria-expanded={abierto}
        aria-controls={idCuerpo}
      >
        <span className="mnu-grupo__icono">
          <IconoGrupo size={20} aria-hidden="true" />
        </span>
        <span className="mnu-grupo__titulo">{grupo.titulo}</span>
        {pendientes > 0 && !abierto && (
          <span className="mnu-conteo" aria-label={`${pendientes} pendientes`}>
            {formatearConteo(pendientes)}
          </span>
        )}
        <ChevronDown className="mnu-grupo__chevron" size={18} aria-hidden="true" />
      </button>

      <div id={idCuerpo} className="mnu-grupo__cuerpo" inert={!abierto}>
        <div className="mnu-grupo__interior">
          {items.map((item) => {
            const Icono = item.icono
            const n = item.contador ? conteos[item.contador] || 0 : 0
            return (
              <Link key={item.id} to={item.to} className="mnu-item">
                <span className="mnu-item__icono">
                  <Icono size={18} aria-hidden="true" />
                </span>
                <span className="mnu-item__texto">{item.texto}</span>
                {n > 0 && (
                  <span className="mnu-conteo" aria-label={`${n} pendientes`}>
                    {formatearConteo(n)}
                  </span>
                )}
                <ChevronRight className="mnu-item__flecha" size={16} aria-hidden="true" />
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
function Menu() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { items: itemsCarrito } = useCart()
  const { favoritos } = useFavoritos()
  const { conteos } = useNavBadges()

  const [momento] = useState(saludoSegunHora)
  const [abiertos, setAbiertos] = useState(() => new Set(['actividad']))
  const [oculto, setOculto] = useState(() => safeGetItem(CLAVE_OCULTAR) === '1')
  const [confirmarSalir, setConfirmarSalir] = useState(false)

  const estadoCredito = useResumenCredito(user?.id)

  const nombre = user?.nombre?.trim() || ''
  const primerNombre = nombre ? nombre.split(' ')[0] : ''
  const inicial = (nombre || user?.email || '?').charAt(0).toUpperCase()
  const esAdmin = Boolean(user?.es_admin)

  function irAtras() {
    // Si llegamos desde el BottomNav hay historial que retroceder;
    // si entraron por URL directa, mejor aterrizar en el Home.
    if (window.history.length > 1) navigate(-1)
    else navigate('/home')
  }

  function alternarGrupo(id) {
    setAbiertos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  function alternarOcultar() {
    const nuevo = !oculto
    setOculto(nuevo)
    safeSetItem(CLAVE_OCULTAR, nuevo ? '1' : '0')
  }

  // Igual que Mi Cuenta: a "/" (Landing pública) y no a "/home", que está
  // detrás de PrivateRoute y rebotaría al login sin dejar ver el toast.
  function cerrarSesion() {
    setConfirmarSalir(false)
    logout()
    navigate('/', { state: { toast: 'Cerraste sesión correctamente' } })
  }

  const grupos = NAV_UNIFICADO.grupos
  const pie = NAV_UNIFICADO.pie

  return (
    <div className="mnu-page">
      <header className="mnu-hero">
        <span className="mnu-hero__fondo" aria-hidden="true" />

        <div className="mnu-hero__fila">
          <span className="mnu-avatar" aria-hidden="true">{inicial}</span>
          <div className="mnu-hero__saludo">
            <p className="mnu-hero__kicker">{momento}</p>
            <h1 className="mnu-hero__titulo">{primerNombre ? `Hola, ${primerNombre}` : '¿Qué necesitas hoy?'}</h1>
          </div>
          <button type="button" className="mnu-hero__cerrar" onClick={irAtras} aria-label="Cerrar menú">
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <TarjetaCredito estado={estadoCredito} oculto={oculto} onAlternar={alternarOcultar} />

        <nav className="mnu-atajos" aria-label="Atajos">
          <Atajo to="/carrito" icono={ShoppingCart} texto="Carrito" cantidad={itemsCarrito?.length || 0} />
          <Atajo to="/mis-items" icono={Heart} texto="Favoritos" cantidad={favoritos?.length || 0} />
          <Atajo to="/notificaciones" icono={Bell} texto="Alertas" cantidad={conteos.notificaciones || 0} alerta />
        </nav>
      </header>

      <section className="mnu-seccion" aria-labelledby="mnu-t-explorar">
        <h2 id="mnu-t-explorar" className="mnu-seccion__titulo">Explorar</h2>
        <div className="mnu-bento">
          {ACCESOS.map((acceso, i) => (
            <TileBento key={acceso.id} acceso={acceso} indice={i} />
          ))}
        </div>
      </section>

      <section className="mnu-seccion" aria-labelledby="mnu-t-espacio">
        <h2 id="mnu-t-espacio" className="mnu-seccion__titulo">Tu espacio</h2>
        {grupos.map((grupo, i) => (
          <GrupoNav
            key={grupo.id}
            grupo={grupo}
            indice={i}
            abierto={abiertos.has(grupo.id)}
            onAlternar={alternarGrupo}
            conteos={conteos}
            esAdmin={esAdmin}
          />
        ))}
      </section>

      {pie && (
        <section className="mnu-seccion" aria-labelledby="mnu-t-ayuda">
          <h2 id="mnu-t-ayuda" className="mnu-seccion__titulo">Ayuda</h2>
          <GrupoNav
            grupo={pie}
            indice={grupos.length}
            abierto={abiertos.has(pie.id)}
            onAlternar={alternarGrupo}
            conteos={conteos}
            esAdmin={esAdmin}
          />
        </section>
      )}

      <footer className="mnu-pie">
        <nav className="mnu-pie__links" aria-label="Información legal">
          {LINKS_PIE.map((l) => (
            <Link key={l.to} to={l.to}>{l.texto}</Link>
          ))}
        </nav>
        <button type="button" className="mnu-salir" onClick={() => setConfirmarSalir(true)}>
          <LogOut size={18} aria-hidden="true" />
          Cerrar sesión
        </button>
        <p className="mnu-pie__marca">Respaldando al médico venezolano</p>
      </footer>

      {confirmarSalir && (
        <HojaInferior titulo="Cerrar sesión" onCerrar={() => setConfirmarSalir(false)}>
          <div className="mnu-sheet">
            <p className="mnu-sheet__texto">
              Tendrás que iniciar sesión de nuevo para acceder a tu cuenta.
            </p>
            <div className="mnu-sheet__acciones">
              <button type="button" className="mnu-btn" onClick={() => setConfirmarSalir(false)}>
                Cancelar
              </button>
              <button type="button" className="mnu-btn mnu-btn--peligro" onClick={cerrarSesion}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </HojaInferior>
      )}
    </div>
  )
}

export default Menu