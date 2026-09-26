import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Progress, Switch } from '@chakra-ui/react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useFavoritos } from '../context/FavoritosContext'
import { usePush } from '../hooks/usePush'
import { CATEGORIAS } from '../utils/notificacionesCatalogo'
import {
  ChevronRight, ChevronDown, Loader2, AlertCircle, AlertTriangle,
  MessageCircle, ShieldCheck, Wallet, Bell, LogOut, Settings, Lock, Scale, Users,
  CreditCard, FileText, ClipboardList, ListChecks, Heart,
} from 'lucide-react'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import HojaInferior from '../components/HojaInferior'
import BannerOnboarding from '../components/BannerOnboarding'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import { ESTADOS_ORDEN, getEstadoConfig, getLabelEstado, normalizarEstado } from '../config/estadosOrden'
import './MiCuenta.css'

// ---------------------------------------------------------------
// Mi Cuenta — dashboard visual de la cuenta.
//
// Antes esta página era básicamente navegación repetida (accesos
// rápidos + grid "Tu cuenta" + columnas de links) — todo eso ya lo
// resuelve el sidebar/drawer de <LayoutPaginaPrincipal>. Ahora esta
// página se enfoca en lo que el sidebar NO puede mostrar: información
// real de la cuenta en bloques visuales (crédito, pedidos activos,
// gasto mensual, favoritos).
// ---------------------------------------------------------------

function formatearMonto(valor) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(valor || 0)
}

const ETIQUETAS_ENVIO = {
  delivery: 'Delivery',
  envio_nacional: 'Envío nacional',
  retiro: 'Retiro en tienda',
}

// Visual de un estado: label para el cliente, color/bg y reseña — leídos de la
// fuente única src/config/estadosOrden.js (estados legacy normalizados al set actual).
function getEstadoOrden(estado) {
  const normalizado = normalizarEstado(estado)
  const cfg = getEstadoConfig(normalizado)
  return {
    label: getLabelEstado(normalizado, { rol: 'cliente' }),
    color: cfg?.color || '#6b6b7a',
    bg: cfg?.bg || '#f1f1ea',
    resena: cfg?.descripcion || '',
  }
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Últimos 6 meses (incluyendo el actual) con el total gastado en cada uno,
// para el gráfico de barras — meses sin compras quedan en $0, no se omiten.
function calcularGastoMensual(ordenes) {
  const hoy = new Date()
  const meses = []
  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    meses.push({ anio: fecha.getFullYear(), mes: fecha.getMonth(), label: MESES_CORTOS[fecha.getMonth()], total: 0 })
  }
  ordenes.forEach((orden) => {
    if (!orden.created_at || orden.estado === 'cancelado') return
    const fecha = new Date(orden.created_at)
    const punto = meses.find((m) => m.anio === fecha.getFullYear() && m.mes === fecha.getMonth())
    if (punto) punto.total += orden.total_usd || 0
  })
  return meses
}

// Distribución por estado de las órdenes que todavía están "en curso"
// (ni entregadas/retiradas ni canceladas) — para la barra apilada de "Pedidos activos".
const ORDEN_ETAPAS = Object.keys(ESTADOS_ORDEN)
  .filter((id) => !ESTADOS_ORDEN[id].legacy && !ESTADOS_ORDEN[id].esTerminal)

const ESTADOS_CERRADOS = new Set(['entregado', 'retirado', 'cancelado'])

function calcularPedidosActivos(ordenes) {
  const activas = ordenes.filter((o) => !ESTADOS_CERRADOS.has(o.estado))
  const conteos = ORDEN_ETAPAS.map((estado) => ({
    estado,
    ...getEstadoOrden(estado),
    cantidad: activas.filter((o) => o.estado === estado).length,
  })).filter((e) => e.cantidad > 0)
  return { total: activas.length, conteos }
}

// ---------------------------------------------------------
// Contenido de "Tu cuenta" — selector estilo Amazon (imagen de
// referencia): usuario + "Ver", Reiniciar Contraseña, y abajo
// Cambiar cuenta / Cerrar sesión.
// ---------------------------------------------------------
function ContenidoModalCuenta({ user, inicial, onCerrar, onCambiarCuenta, onCerrarSesion }) {
  return (
    <>
      <div className="modal-cuenta__usuario">
        <div className="mi-cuenta__avatar mi-cuenta__avatar--sm">{inicial}</div>
        <div className="modal-cuenta__usuario-texto">
          <span className="modal-cuenta__usuario-nombre">{user.nombre || 'Usuario'}</span>
          <span className="modal-cuenta__usuario-rol">Titular de la cuenta</span>
        </div>
        <button type="button" className="modal-cuenta__ver" onClick={onCerrar}>Ver</button>
      </div>

      <div className="modal-cuenta__fila modal-cuenta__fila--proximamente">
        <span>Reiniciar Contraseña</span>
        <span className="etiqueta-proximamente">Próximamente</span>
      </div>

      <Link to="/subusuarios" onClick={onCerrar} className="modal-cuenta__fila modal-cuenta__fila--link">
        <span className="modal-cuenta__fila-icono-texto">
          <Users size={16} />
          Sub-usuarios
        </span>
        <ChevronRight size={16} />
      </Link>

      <div className="modal-cuenta__separador" />

      <p className="modal-cuenta__sesion-como">Sesión iniciada como {user.email}</p>

      <button type="button" className="modal-cuenta__cambiar-btn" onClick={onCambiarCuenta}>
        Cambiar cuenta
      </button>

      <button type="button" className="modal-cuenta__cerrar-sesion" onClick={onCerrarSesion}>
        Cerrar sesión
      </button>
    </>
  )
}

// ---------------------------------------------------------
// Contenido de "Permisos y notificaciones" — toggle principal
// de push + toggles por categoría de notificación.
// ---------------------------------------------------------
function ContenidoModalPermisos() {
  const { soportado, suscrito, permiso, pidiendoPermiso, error, activar, desactivar } = usePush()
  const [prefs, setPrefs] = useState(null)
  const [guardando, setGuardando] = useState('')

  const permisoBloqueado = permiso === 'denied'

  useEffect(() => {
    api.get('/notifications/preferences')
      .then(({ data }) => setPrefs(data))
      .catch(() => setPrefs({
        push_activo: true, push_ordenes: true, push_pagos: true,
        push_chat: true, push_credito: true, push_sistema: true, push_ofertas: true,
      }))
  }, [])

  function handleTogglePush() {
    if (pidiendoPermiso || permisoBloqueado) return
    if (suscrito) {
      desactivar()
    } else {
      activar()
    }
  }

  async function handleToggleCategoria(campo) {
    if (!prefs) return
    const nuevo = !prefs[campo]
    const actualizadas = { ...prefs, [campo]: nuevo }
    setPrefs(actualizadas)
    setGuardando(campo)
    try {
      await api.put('/notifications/preferences', { [campo]: nuevo })
    } catch {
      setPrefs(prev => ({ ...prev, [campo]: !nuevo }))
    } finally {
      setGuardando('')
    }
  }

  return (
    <>
      <div className="modal-permisos__fila">
        <div className="modal-permisos__fila-texto">
          <span className="modal-permisos__fila-titulo">Avisos y notificaciones</span>
          <span className="modal-permisos__fila-descripcion">
            {!soportado
              ? 'Tu navegador no soporta notificaciones push'
              : permisoBloqueado
                ? 'Las notificaciones están bloqueadas en la configuración del navegador'
                : suscrito
                  ? 'Recibís avisos push de tu cuenta'
                  : 'Activá para recibir avisos importantes de tu cuenta'}
          </span>
        </div>
        <Switch.Root
          checked={!!suscrito}
          disabled={!soportado || permisoBloqueado || pidiendoPermiso}
          size="md"
          onCheckedChange={handleTogglePush}
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </div>

      {pidiendoPermiso && (
        <div className="modal-permisos__fila">
          <Loader2 size={15} className="mi-cuenta__spinner" />
          <span className="modal-permisos__fila-descripcion" style={{ marginLeft: 8 }}>
            {suscrito ? 'Desactivando…' : 'Activando notificaciones…'}
          </span>
        </div>
      )}

      {error && (
        <div className="modal-permisos__fila" style={{ color: '#dc2626' }}>
          <AlertCircle size={15} />
          <span className="modal-permisos__fila-descripcion" style={{ marginLeft: 8 }}>{error}</span>
        </div>
      )}

      {suscrito && prefs && (
        <div className="modal-permisos__categorias">
          <span className="modal-permisos__categorias-titulo">¿Qué notificaciones querés recibir?</span>
          {Object.values(CATEGORIAS).map(cat => {
            const campo = `push_${cat.id}`
            const Icono = cat.icono
            return (
              <div className="modal-permisos__fila" key={cat.id}>
                <div
                  className="modal-permisos__fila-icono"
                  style={{
                    background: `var(--color-${cat.color}-light, var(--color-bg))`,
                    color: `var(--color-${cat.color}, var(--color-brand))`,
                  }}
                >
                  <Icono size={17} />
                </div>
                <div className="modal-permisos__fila-texto">
                  <span className="modal-permisos__fila-titulo">{cat.nombre}</span>
                </div>
                <Switch.Root
                  checked={prefs[campo] !== false}
                  disabled={guardando === campo}
                  size="md"
                  onCheckedChange={() => handleToggleCategoria(campo)}
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </div>
            )
          })}
        </div>
      )}

      <div className="modal-permisos__fila">
        <div className="modal-permisos__fila-icono">
          <Lock size={17} />
        </div>
        <div className="modal-permisos__fila-texto">
          <span className="modal-permisos__fila-titulo">Reiniciar contraseña</span>
          <span className="modal-permisos__fila-descripcion">Próximamente</span>
        </div>
      </div>

      <Link to="/terminos" className="modal-permisos__fila modal-permisos__fila--link">
        <div className="modal-permisos__fila-icono">
          <Scale size={17} />
        </div>
        <div className="modal-permisos__fila-texto">
          <span className="modal-permisos__fila-titulo">Información legal</span>
          <span className="modal-permisos__fila-descripcion">Términos, condiciones y privacidad</span>
        </div>
        <ChevronRight size={18} className="modal-permisos__fila-flecha" />
      </Link>
    </>
  )
}

// ---------------------------------------------------------
// MiniOrdenCard — tarjeta compacta del carrusel "Tus pedidos".
//
// Cuatro rangos, un trabajo cada uno:
//   1. identidad → "Orden #123" + fecha de creación (sello dd/mm/yy)
//   2. hechos    → envío · artículos válidos · última actualización
//   3. dinero    → el total, en línea propia (nunca compite con el estado)
//   4. estado    → banda a sangre con el label de estadosOrden.js
//
// El label y los colores del estado SIEMPRE salen de getEstadoOrden()
// (fuente única: src/config/estadosOrden.js). Nada de "pago pendiente":
// es una condición de estado_pago, no un estado logístico.
// ---------------------------------------------------------

// dd/mm/yy → "15/08/26". Formato a mano (no toLocaleDateString) para no
// depender de la versión de ICU del navegador. Devuelve null si no hay
// fecha válida, y el JSX omite el dato en vez de pintar "Invalid Date".
function formatearFechaCorta(iso) {
  if (!iso) return null
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return null
  const dd = String(fecha.getDate()).padStart(2, '0')
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const aa = String(fecha.getFullYear()).slice(-2)
  return `${dd}/${mm}/${aa}`
}

// Última actualización SOLO si cae en otro día calendario que la creación:
// el updated_at se toca al crear la orden, así que el mismo día es ruido.
function fechaActualizacion(orden) {
  const creada = orden.created_at ? new Date(orden.created_at) : null
  const actualizada = orden.updated_at ? new Date(orden.updated_at) : null
  if (!creada || Number.isNaN(creada.getTime())) return null
  if (!actualizada || Number.isNaN(actualizada.getTime())) return null
  const dia = (f) => `${f.getFullYear()}-${f.getMonth() + 1}-${f.getDate()}`
  return dia(actualizada) === dia(creada) ? null : formatearFechaCorta(orden.updated_at)
}

function MiniOrdenCard({ orden }) {
  const estado = getEstadoOrden(orden.estado)

  const fechaCreacion = formatearFechaCorta(orden.created_at)
  const fechaCambio = fechaActualizacion(orden)

  // Los ítems anulados no cuentan para la orden.
  const items = (orden.ordenes_items || []).filter((item) => item.anulado !== true)
  const itemsTexto = items.length === 1 ? '1 artículo' : `${items.length} artículos`

  return (
    <Link to={`/orders/${orden.id}`} className="mini-orden-card">
      {/* 1 · identidad */}
      <div className="mini-orden-card__top">
        <span className="mini-orden-card__titulo">Orden #{orden.id}</span>
        {fechaCreacion && (
          <span className="mini-orden-card__fecha">
            <time dateTime={orden.created_at}>{fechaCreacion}</time>
          </span>
        )}
        <span className="mini-orden-card__ir" aria-hidden="true">
          <ChevronRight size={14} />
        </span>
      </div>

      {/* 2 · hechos */}
      <div className="mini-orden-card__facts">
        <span className="mini-orden-card__envio">
          {ETIQUETAS_ENVIO[orden.tipo_envio] || ETIQUETAS_ENVIO.retiro}
        </span>
        {items.length > 0 && <span>{itemsTexto}</span>}
        {fechaCambio && <span>Cambió {fechaCambio}</span>}
      </div>

      {/* 3 · dinero — línea propia, nunca recortada */}
      <span className="mini-orden-card__monto">{formatearMonto(orden.total_usd)}</span>

      {/* 4 · estado — banda a sangre; los colores entran por --estado-color */}
      <span
        className="mini-orden-card__estado"
        style={{ background: estado.bg, '--estado-color': estado.color }}
      >
        {estado.label}
      </span>
    </Link>
  )
}

// ---------------------------------------------------------
// Bloque de estado de cuenta — "saldo disponible" como cifra
// protagonista (es lo que el cliente quiere saber: cuánto puede
// gastar ya), con la deuda al día y vencida al lado.
//
// Todos los datos vienen en `resumen` del endpoint que la página ya
// llama (GET /clientes/:id/estado-cuenta) — este bloque no agrega
// ni una request. Si el cliente no tiene línea de crédito, cae a la
// variante de contado que lo manda a Pagos.
// ---------------------------------------------------------
function BloqueEstadoCuenta({ resumen }) {
  const tieneCredito = (resumen?.linea_credito || 0) > 0

  if (!tieneCredito) {
    return (
      <div className="bloque-tarjeta bloque-credito bloque-credito--contado">
        <div className="bloque-tarjeta__icono bloque-tarjeta__icono--azul">
          <Wallet size={20} />
        </div>
        <div className="bloque-credito__texto">
          <span className="bloque-tarjeta__titulo">Cliente de contado</span>
          <p className="bloque-tarjeta__descripcion">Reportá tus pagos y revisá tu historial de facturas.</p>
        </div>
        <Link to="/pagos" className="bloque-tarjeta__cta">
          Ir a Pagos <ChevronRight size={15} />
        </Link>
      </div>
    )
  }

  const porcentaje = Math.min((resumen.deuda_actual / resumen.linea_credito) * 100, 100)
  const colorPalette = porcentaje >= 90 ? 'red' : porcentaje >= 60 ? 'orange' : 'blue'
  const hayVencida = (resumen.deuda_vencida || 0) > 0

  return (
    <div className="bloque-tarjeta bloque-credito">
      {resumen.credito_bloqueado && (
        <div className="bloque-credito__bloqueado">
          <AlertTriangle size={15} />
          <span>
            Tu crédito está bloqueado
            {resumen.credito_bloqueado_motivo ? `: ${resumen.credito_bloqueado_motivo}` : '.'}
          </span>
        </div>
      )}

      <Link to="/estado-cuenta" className="bloque-credito__hero">
        <div>
          <span className="bloque-credito__hero-label">Disponible para comprar</span>
          <strong className={`bloque-credito__hero-monto${resumen.saldo <= 0 ? ' bloque-credito__cifra--rojo' : ''}`}>
            {formatearMonto(resumen.saldo)}
          </strong>
        </div>
        <span className="bloque-credito__porcentaje">{Math.round(porcentaje)}% usado</span>
      </Link>

      <Progress.Root value={porcentaje} colorPalette={colorPalette} size="sm" className="bloque-credito__barra">
        <Progress.Track borderRadius="999px">
          <Progress.Range borderRadius="999px" />
        </Progress.Track>
      </Progress.Root>

      <div className="bloque-credito__cifras">
        <div>
          <span className="bloque-credito__cifra-label">Deuda actual</span>
          <strong className={resumen.deuda_actual > 0 ? 'bloque-credito__cifra--rojo' : ''}>
            {formatearMonto(resumen.deuda_actual)}
          </strong>
        </div>
        <div>
          <span className="bloque-credito__cifra-label">Vencida</span>
          <strong className={hayVencida ? 'bloque-credito__cifra--rojo' : ''}>
            {formatearMonto(resumen.deuda_vencida)}
          </strong>
          {hayVencida && resumen.cantidad_ordenes_vencidas > 0 && (
            <span className="bloque-credito__cifra-nota">
              {resumen.cantidad_ordenes_vencidas} {resumen.cantidad_ordenes_vencidas === 1 ? 'orden vencida' : 'órdenes vencidas'}
            </span>
          )}
        </div>
        <div>
          <span className="bloque-credito__cifra-label">Línea total</span>
          <strong>{formatearMonto(resumen.linea_credito)}</strong>
        </div>
      </div>

      {resumen.proxima_orden_vencer?.fecha_vencimiento && (
        <div className="bloque-credito__proximo">
          <span>
            Próximo vencimiento · {formatearFechaCorta(resumen.proxima_orden_vencer.fecha_vencimiento)}
          </span>
          <strong>{formatearMonto(resumen.proxima_orden_vencer.total_usd)}</strong>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------
// Bloque de pedidos activos — barra apilada con la distribución por
// estado de las órdenes en curso.
// ---------------------------------------------------------
function BloquePedidosActivos({ ordenes }) {
  const { total, conteos } = ordenes

  return (
    <Link to="/orders" className="bloque-tarjeta bloque-pedidos-activos">
      <div className="bloque-pedidos-activos__header">
        <span className="bloque-tarjeta__titulo">Pedidos activos</span>
        <span className="bloque-pedidos-activos__total">{total}</span>
      </div>

      {total === 0 ? (
        <p className="bloque-tarjeta__descripcion">No tenés pedidos en curso ahora mismo.</p>
      ) : (
        <>
          <div className="bloque-pedidos-activos__barra">
            {conteos.map((c) => (
              <span
                key={c.estado}
                style={{ width: `${(c.cantidad / total) * 100}%`, background: c.color }}
                title={`${c.label}: ${c.cantidad}`}
              />
            ))}
          </div>
          <div className="bloque-pedidos-activos__leyenda">
            {conteos.map((c) => (
              <span key={c.estado} className="bloque-pedidos-activos__leyenda-item">
                <span className="bloque-pedidos-activos__punto" style={{ background: c.color }} />
                {c.label} · {c.cantidad}
              </span>
            ))}
          </div>
        </>
      )}
    </Link>
  )
}

// ---------------------------------------------------------
// Gráfico de gasto mensual — barras simples de los últimos 6 meses
// ---------------------------------------------------------
function GraficoGastoMensual({ datos }) {
  const max = Math.max(1, ...datos.map((m) => m.total))
  const totalPeriodo = datos.reduce((acc, m) => acc + m.total, 0)

  return (
    <div className="bloque-tarjeta gasto-mensual">
      <div className="gasto-mensual__header">
        <span className="bloque-tarjeta__titulo">Tu gasto en los últimos 6 meses</span>
        <span className="gasto-mensual__total">{formatearMonto(totalPeriodo)}</span>
      </div>

      {totalPeriodo === 0 ? (
        <p className="bloque-tarjeta__descripcion">Todavía no hay compras registradas en este período.</p>
      ) : (
        <div className="gasto-mensual__grafico">
          {datos.map((m) => (
            <div className="gasto-mensual__columna" key={`${m.anio}-${m.mes}`}>
              <div className="gasto-mensual__barra-wrap">
                <div
                  className="gasto-mensual__barra"
                  style={{ height: `${Math.max((m.total / max) * 100, m.total > 0 ? 6 : 0)}%` }}
                  title={formatearMonto(m.total)}
                />
              </div>
              <span className="gasto-mensual__mes">{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------
// Bloque de pendientes — la cola de tareas del cliente. Cada tile
// es un contador con su link; si no hay nada en todo el bloque, la
// tarjeta no se renderiza (ocupar espacio con "0, 0, 0" es ruido).
// ---------------------------------------------------------

// Órdenes de contado que todavía no tienen pago verificado. Sale de los
// pedidos que la página YA tiene en memoria — no cuesta una request.
// El crédito no entra: no requiere reporte de pago.
function calcularPagosPendientes(ordenes) {
  return ordenes.filter(
    (o) =>
      o.forma_pago === 'contado' &&
      !ESTADOS_CERRADOS.has(o.estado) &&
      (o.estado_pago === 'esperando' || o.estado_pago === 'reportado')
  ).length
}

function BloquePendientes({ tiles }) {
  const activos = tiles.filter((t) => t.cantidad > 0)
  if (activos.length === 0) return null

  return (
    <div className="bloque-tarjeta bloque-pendientes">
      <div className="bloque-pendientes__header">
        <span className="bloque-tarjeta__titulo">Pendientes</span>
        <span className="bloque-pendientes__total">
          {activos.reduce((acc, t) => acc + t.cantidad, 0)}
        </span>
      </div>

      <div className="bloque-pendientes__grid">
        {activos.map((t) => {
          const Icono = t.icono
          return (
            <Link key={t.id} to={t.to} className={`bloque-pendientes__tile bloque-pendientes__tile--${t.tone}`}>
              <span className="bloque-pendientes__tile-icono">
                <Icono size={17} />
              </span>
              <span className="bloque-pendientes__tile-cantidad">{t.cantidad}</span>
              <span className="bloque-pendientes__tile-label">{t.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// Mis items — listas guardadas + favoritos, con contadores.
// El grid de fotos se mantiene (el dueño lo pidió): es el vistazo
// rápido a lo que guardó sin abrir la página.
// ---------------------------------------------------------
function BloqueMisItems({ favoritos, listas }) {
  const preview = (favoritos || []).slice(0, 4)
  const totalFavoritos = (favoritos || []).length
  const totalListas = (listas || []).length

  return (
    <Link to="/mis-items" className="bloque-tarjeta bloque-favoritos">
      <div className="bloque-favoritos__header">
        <span className="bloque-tarjeta__titulo">Mis items</span>
        <span className="bloque-pedidos-activos__flecha">
          <ChevronRight size={16} />
        </span>
      </div>

      <div className="bloque-favoritos__contadores">
        <span className="bloque-favoritos__contador">
          <ListChecks size={15} />
          <strong>{totalListas}</strong>
          {totalListas === 1 ? 'lista' : 'listas'}
        </span>
        <span className="bloque-favoritos__contador">
          <Heart size={15} />
          <strong>{totalFavoritos}</strong>
          {totalFavoritos === 1 ? 'favorito' : 'favoritos'}
        </span>
      </div>

      {preview.length === 0 ? (
        <p className="bloque-tarjeta__descripcion">
          Guardá productos que uses seguido y armá listas para encontrarlos rápido.
        </p>
      ) : (
        <div className="bloque-favoritos__grid">
          {preview.map((producto) => (
            <div className="bloque-favoritos__item" key={producto.id}>
              {producto.foto_url ? (
                <img src={producto.foto_url} alt={producto.nombre_comercial} loading="lazy" />
              ) : (
                <div className="bloque-favoritos__item-sin-foto" />
              )}
            </div>
          ))}
        </div>
      )}
    </Link>
  )
}

function MiCuenta() {
  const { user, logout } = useAuth()
  const { favoritos } = useFavoritos()
  const navigate = useNavigate()
  const [estadoCuenta, setEstadoCuenta] = useState(null)
  const [ordenes, setOrdenes] = useState([])
  const [listas, setListas] = useState([])
  const [pendientes, setPendientes] = useState({
    mensajes: 0,
    documentos: 0,
    cotizaciones: 0,
    requerimientos: 0,
    notificaciones: 0,
  })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [mostrarConfirmarLogout, setMostrarConfirmarLogout] = useState(false)
  const [mostrarModalCuenta, setMostrarModalCuenta] = useState(false)
  const [mostrarModalPermisos, setMostrarModalPermisos] = useState(false)

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [{ data: dataCuenta }, { data: dataOrdenes }, { data: dataListas }] = await Promise.all([
          api.get(`/clientes/${user.id}/estado-cuenta`),
          api.get('/orders'),
          api.get('/lists'),
        ])
        setEstadoCuenta(dataCuenta)
        setOrdenes(dataOrdenes || [])
        setListas(dataListas || [])
      } catch (err) {
        setError('No se pudieron cargar los datos de tu cuenta')
        console.error(err)
      } finally {
        setCargando(false)
      }
    }

    // Contadores de "Pendientes" — van aparte y con allSettled para que un
    // endpoint caído no tumbe el bloque entero ni ensucie el error global.
    async function cargarPendientes() {
      const [mensajes, documentos, cotizaciones, requerimientos, notificaciones] = await Promise.allSettled([
        api.get('/chat/no-leidos'),
        api.get('/documentos/mios'),
        api.get('/cotizaciones/mias'),
        api.get('/requerimientos/mias'),
        api.get('/notifications/unread-count'),
      ])

      const valor = (r, select) => (r.status === 'fulfilled' ? select(r.value?.data) : 0)
      const ahora = new Date()

      setPendientes({
        mensajes: valor(mensajes, (d) => d?.no_leidos || 0),
        // Documentos que la empresa pidió y el cliente todavía no subió
        // (los no subidos a tiempo ya no cuentan: la ventana venció).
        documentos: valor(documentos, (d) =>
          (Array.isArray(d) ? d : []).filter(
            (doc) =>
              !doc.url_documento &&
              (!doc.fecha_expiracion || new Date(doc.fecha_expiracion) > ahora)
          ).length
        ),
        // Solicitudes que YA tienen respuesta de la empresa y esperan una
        // acción del cliente (no las que la empresa tiene que cotizar).
        cotizaciones: valor(cotizaciones, (d) =>
          (Array.isArray(d) ? d : []).filter((c) => c.estado === 'cotizada').length
        ),
        requerimientos: valor(requerimientos, (d) =>
          (Array.isArray(d) ? d : []).filter((r) => r.estado === 'respondido').length
        ),
        notificaciones: valor(notificaciones, (d) => d?.count || 0),
      })
    }

    cargarDatos()
    cargarPendientes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resumen = estadoCuenta?.resumen
  const ultimasOrdenes = useMemo(() => ordenes.slice(0, 5), [ordenes])
  const gastoMensual = useMemo(() => calcularGastoMensual(ordenes), [ordenes])
  const pedidosActivos = useMemo(() => calcularPedidosActivos(ordenes), [ordenes])

  const tilesPendientes = useMemo(
    () => [
      {
        id: 'pagos',
        label: 'Pagos por reportar',
        cantidad: calcularPagosPendientes(ordenes),
        to: '/orders',
        icono: CreditCard,
        tone: 'naranja',
      },
      {
        id: 'mensajes',
        label: 'Mensajes sin leer',
        cantidad: pendientes.mensajes,
        to: '/mensajes',
        icono: MessageCircle,
        tone: 'azul',
      },
      {
        id: 'documentos',
        label: 'Documentos por subir',
        cantidad: pendientes.documentos,
        to: '/mis-documentos',
        icono: FileText,
        tone: 'teal',
      },
      {
        id: 'solicitudes',
        label: 'Solicitudes por revisar',
        cantidad: pendientes.cotizaciones + pendientes.requerimientos,
        to: '/mis-solicitudes',
        icono: ClipboardList,
        tone: 'violeta',
      },
      {
        id: 'notificaciones',
        label: 'Notificaciones',
        cantidad: pendientes.notificaciones,
        to: '/notificaciones',
        icono: Bell,
        tone: 'gris',
      },
    ],
    [ordenes, pendientes]
  )

  const inicial = (user.nombre || user.email || '?').charAt(0).toUpperCase()

  // "Cambiar cuenta": cierra sesión para que otra persona inicie con
  // otra cuenta. No hace falta navegar a mano: PrivateRoute redirige
  // solo a /login en cuanto el usuario queda en null.
  function cambiarCuenta() {
    setMostrarModalCuenta(false)
    logout()
  }

  // "Cerrar sesión" (desde el selector de cuenta): a diferencia de
  // "Cambiar cuenta", esta va a Inicio en vez de al login — usamos "/"
  // (Landing pública) y no "/home", que está detrás de PrivateRoute y
  // rebotaría al login apenas cerramos sesión, sin dejar ver el toast.
  // El toast en sí lo dejamos para cuando lo diseñemos: por ahora solo
  // viaja en el state de navegación, listo para que ese componente lo
  // lea cuando exista.
  function cerrarSesionEIrAInicio() {
    setMostrarModalCuenta(false)
    logout()
    navigate('/', { state: { toast: 'Cerraste sesión correctamente' } })
  }

  return (
    <LayoutPaginaPrincipal activo="cuenta" titulo="Mi Cuenta" subtitulo="Un vistazo general a tu cuenta" nav={NAV_UNIFICADO}>
      <div className="mi-cuenta">
        <header className="mi-cuenta__header">
          <div className="mi-cuenta__header-info">
            <div className="mi-cuenta__avatar">{inicial}</div>
            <button type="button" className="mi-cuenta__saludo-btn" onClick={() => setMostrarModalCuenta(true)}>
              <span className="mi-cuenta__header-texto">
                <h1>Hola, {user.nombre || 'Usuario'}</h1>
                <span className="mi-cuenta__email">{user.email}</span>
              </span>
              <ChevronDown size={18} className="mi-cuenta__saludo-flecha" />
            </button>
          </div>

          <div className="mi-cuenta__header-acciones">
            <button
              type="button"
              className="mi-cuenta__icono-btn"
              aria-label="Permisos y notificaciones"
              onClick={() => setMostrarModalPermisos(true)}
            >
              <Settings size={19} />
            </button>
            <Link to="/notificaciones" className="mi-cuenta__icono-btn" aria-label="Notificaciones">
              <Bell size={19} />
            </Link>
            <button
              type="button"
              className="mi-cuenta__icono-btn"
              aria-label="Cerrar sesión"
              onClick={() => setMostrarConfirmarLogout(true)}
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>

        {mostrarModalCuenta && (
          <HojaInferior titulo="Tu cuenta" onCerrar={() => setMostrarModalCuenta(false)}>
            <ContenidoModalCuenta
              user={user}
              inicial={inicial}
              onCerrar={() => setMostrarModalCuenta(false)}
              onCambiarCuenta={cambiarCuenta}
              onCerrarSesion={cerrarSesionEIrAInicio}
            />
          </HojaInferior>
        )}

        {mostrarModalPermisos && (
          <HojaInferior titulo="Permisos y notificaciones" onCerrar={() => setMostrarModalPermisos(false)}>
            <ContenidoModalPermisos />
          </HojaInferior>
        )}

        {mostrarConfirmarLogout && (
          <HojaInferior titulo="Cerrar sesión" onCerrar={() => setMostrarConfirmarLogout(false)}>
            <p className="confirmar-logout__texto">
              Tendrás que iniciar sesión de nuevo para acceder a tu cuenta.
            </p>
            <div className="confirmar-logout__acciones">
              <button
                type="button"
                className="btn btn--secundario"
                onClick={() => setMostrarConfirmarLogout(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--peligro"
                onClick={() => {
                  setMostrarConfirmarLogout(false)
                  logout()
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </HojaInferior>
        )}

        {error && (
          <div className="mi-cuenta__alerta">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <BannerOnboarding />

        {cargando ? (
          <div className="mi-cuenta__cargando">
            <Loader2 className="mi-cuenta__spinner" size={28} />
            <p>Cargando tu cuenta…</p>
          </div>
        ) : (
          <>
            <div className="mi-cuenta__grid-2col">
              <BloqueEstadoCuenta resumen={resumen} />
              <BloquePedidosActivos ordenes={pedidosActivos} />
            </div>

            <BloquePendientes tiles={tilesPendientes} />

            <GraficoGastoMensual datos={gastoMensual} />

            {/* ---------------------------------------------------------------- */}
            {/* Tus pedidos — título + flecha, carrusel de MiniOrdenCard          */}
            {/* ---------------------------------------------------------------- */}
            <section className="seccion-pedidos">
              <div className="seccion-pedidos__header">
                <h2>Tus pedidos</h2>
                <Link to="/orders" className="seccion-pedidos__flecha" aria-label="Ver todos los pedidos">
                  <ChevronRight size={20} />
                </Link>
              </div>

              {ultimasOrdenes.length === 0 ? (
                <div className="bloque-preview__vacio">
                  <p>Parece que no tenés pedidos recientes</p>
                  <Link to="/catalogo" className="btn btn--primario">Ir al catálogo</Link>
                </div>
              ) : (
                <div className="mini-ordenes-carrusel">
                  {ultimasOrdenes.map((orden) => (
                    <MiniOrdenCard key={orden.id} orden={orden} />
                  ))}
                </div>
              )}
            </section>

            <div className="mi-cuenta__grid-2col">
              <BloqueMisItems favoritos={favoritos} listas={listas} />

              <Link to="/contacto" className="bloque-tarjeta soporte-card">
                <div className="bloque-tarjeta__icono bloque-tarjeta__icono--teal">
                  <MessageCircle size={20} />
                </div>
                <div className="bloque-credito__texto">
                  <span className="bloque-tarjeta__titulo">¿Necesitás ayuda?</span>
                  <p className="bloque-tarjeta__descripcion">Escribinos y te respondemos a la brevedad.</p>
                </div>
                <span className="bloque-tarjeta__cta">
                  Contactar <ChevronRight size={15} />
                </span>
              </Link>
            </div>

            <div className="legal-footer">
              <Link to="/terminos">Términos y condiciones</Link>
              <span>·</span>
              <Link to="/privacidad">Aviso de privacidad</Link>
            </div>

            <div className="mi-cuenta__footer">
              <ShieldCheck size={14} />
              <span>Droguería Carrisán · Tu información está protegida</span>
            </div>
          </>
        )}
      </div>
    </LayoutPaginaPrincipal>
  )
}

export default MiCuenta
