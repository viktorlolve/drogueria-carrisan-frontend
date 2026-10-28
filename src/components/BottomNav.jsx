import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import './BottomNav.css'

// Íconos simples en SVG inline — evita depender de una librería de íconos
// y permite controlar el color activo vía CSS (currentColor)
const ICONOS = {
  inicio: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  // Corazón — el MISMO trazo que usa el Navbar para "Mis Items / Favoritos",
  // así el dock y el navbar cuentan la misma historia visual.
  items: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  // Bolsa de compra — representa "Mis Órdenes" (el paquete ya comprado),
  // sin confundirse con el ícono de caja del despacho ni con el carrito.
  pedidos: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  cuenta: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  // ícono del FAB central — grilla, representa "todo el menú"
  menu: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  campana: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 4 1.4 5.6 2 6.5H4c.6-.9 2-2.5 2-6.5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  ),
}

// Items normales (izquierda y derecha del FAB central)
const ITEMS_IZQUIERDA = [
  { to: '/', label: 'Inicio', icono: 'inicio', end: true },
  { to: '/mis-items', label: 'Mis Items', icono: 'items' },
]

const ITEMS_DERECHA = [
  { to: '/orders', label: 'Mis Órdenes', icono: 'pedidos' },
  { to: '/cuenta', label: 'Cuenta', icono: 'cuenta' },
]

function BottomNavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `bottom-nav__item ${isActive ? 'bottom-nav__item--activo' : ''}`
      }
    >
      <span className="bottom-nav__icon-wrap">
        <span className="bottom-nav__icon-pill" aria-hidden="true" />
        {ICONOS[item.icono]}
      </span>
      <span className="bottom-nav__label">{item.label}</span>
    </NavLink>
  )
}

// Campanita flotante — vive fuera del grid del dock (2 + FAB + 2 se
// mantiene siempre parejo). Solo se hace visible cuando hay pendientes;
// se anima con transform/opacity para poder animar también su salida.
function BottomNavCampanaFlotante({ noLeidas }) {
  const hayPendientes = noLeidas > 0

  return (
    <NavLink
      to="/notificaciones"
      className={({ isActive }) =>
        `bottom-nav__campana ${hayPendientes ? 'bottom-nav__campana--visible' : ''} ${
          isActive ? 'bottom-nav__campana--activa' : ''
        }`
      }
      aria-hidden={!hayPendientes}
      tabIndex={hayPendientes ? 0 : -1}
      aria-label="Notificaciones pendientes"
    >
      {hayPendientes && <span className="bottom-nav__campana-ping" aria-hidden="true" />}
      {ICONOS.campana}
      {hayPendientes && (
        <span className="bottom-nav__campana-badge">{noLeidas > 9 ? '9+' : noLeidas}</span>
      )}
    </NavLink>
  )
}

function BottomNav() {
  const { user } = useAuth()
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0)

  useEffect(() => {
    if (!user) return

    let cancelado = false

    function cargarConteo() {
      api
        .get('/notifications/unread-count')
        .then(({ data }) => {
          if (!cancelado) setNotificacionesNoLeidas(data.count || 0)
        })
        .catch((err) => console.error('Error al contar notificaciones:', err))
    }

    cargarConteo()
    // Poll ligero: así el efecto de la campana reacciona mientras el
    // usuario navega, sin necesitar sockets para algo tan puntual.
    const intervalo = setInterval(cargarConteo, 45000)

    return () => {
      cancelado = true
      clearInterval(intervalo)
    }
  }, [user])

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {ITEMS_IZQUIERDA.map((item) => (
        <BottomNavItem key={item.to} item={item} />
      ))}

      {/* Botón central "Menú" — FAB elevado, lleva a la página de navegación completa */}
      <NavLink
        to="/menu"
        className={({ isActive }) =>
          `bottom-nav__fab-wrapper ${isActive ? 'bottom-nav__fab-wrapper--activo' : ''}`
        }
      >
        <span className="bottom-nav__fab">
          {ICONOS.menu}
        </span>
        <span className="bottom-nav__fab-label">Menú</span>
      </NavLink>

      {ITEMS_DERECHA.map((item) => (
        <BottomNavItem key={item.to} item={item} />
      ))}

      {/* Campanita flotante — no ocupa espacio en el grid, así el dock
          se mantiene 2 + FAB + 2 siempre */}
      <BottomNavCampanaFlotante noLeidas={user ? notificacionesNoLeidas : 0} />
    </nav>
  )
}

export default BottomNav