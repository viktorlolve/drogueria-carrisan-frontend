// ---------------------------------------------------------------
// Nav unificado de "Páginas Principales".
//
// Reemplaza Navpaginasprincipales, navCuenta, NavChat, NavEstadoCuenta,
// NavCotizaciones y NavItems en un solo archivo. Todas las páginas del
// cliente (excepto Admin y Notificaciones) usan este nav.
//
// Estructura por categorías:
//   Mi actividad     → links directos
//   Mi cuenta        → links directos
//   Estado de cuenta → submenu expandible
//   Mis solicitudes  → submenu expandible
//   Ayuda            → submenu expandible
//
// Cada página que use <LayoutPaginaPrincipal> comparte este menú y
// solo marca como activo su propio item vía la prop "activo".
// ---------------------------------------------------------------
import {
  Package, ClipboardList, MessageCircle,
  Star, MapPin, User, Bell,
  Wallet, DollarSign, FileText, FileBarChart, TrendingUp,
  PackagePlus, FileCheck,
  HelpCircle, FileQuestion,
} from 'lucide-react'

export const NAV_UNIFICADO = [
  {
    titulo: 'Mi actividad',
    items: [
      { id: 'ordenes', to: '/orders', icono: Package, texto: 'Mis órdenes' },
      { id: 'presupuesto', to: '/presupuesto', icono: ClipboardList, texto: 'Presupuesto' },
      { id: 'chat', to: '/chat', icono: MessageCircle, texto: 'Chats' },
    ],
  },
  {
    titulo: 'Mi cuenta',
    items: [
      { id: 'mis-items', to: '/mis-items', icono: Star, texto: 'Mis items', soloCliente: true },
      { id: 'direcciones', to: '/direcciones', icono: MapPin, texto: 'Direcciones', soloCliente: true },
      { id: 'cuenta', to: '/cuenta', icono: User, texto: 'Mi Cuenta' },
      { id: 'notificaciones', to: '/notificaciones', icono: Bell, texto: 'Notificaciones' },
    ],
  },
  {
    titulo: 'Estado de cuenta',
    tipo: 'submenu',
    verTodoTo: '/estado-cuenta',
    items: [
      { id: 'estado-cuenta', to: '/estado-cuenta', icono: Wallet, texto: 'Resumen' },
      { id: 'pagos-ec', to: '/estado-cuenta/pagos', icono: DollarSign, texto: 'Historial de pagos' },
      { id: 'facturas', to: '/estado-cuenta/facturas', icono: FileText, texto: 'Historial de facturas' },
      { id: 'reportes', to: '/estado-cuenta/reportes', icono: FileBarChart, texto: 'Reportes' },
      { id: 'ampliacion', to: '/estado-cuenta/ampliacion', icono: TrendingUp, texto: 'Solicitar ampliación' },
    ],
  },
  {
    titulo: 'Mis solicitudes',
    tipo: 'submenu',
    verTodoTo: '/mis-solicitudes/cotizaciones',
    items: [
      { id: 'cotizaciones', to: '/mis-solicitudes/cotizaciones', icono: FileText, texto: 'Cotizaciones' },
      { id: 'requerimientos', to: '/mis-solicitudes/requerimientos', icono: PackagePlus, texto: 'Requerimientos' },
      { id: 'documentos', to: '/mis-solicitudes/documentos', icono: FileCheck, texto: 'Documentos' },
    ],
  },
  {
    titulo: 'Ayuda',
    tipo: 'submenu',
    verTodoTo: '/ayuda',
    items: [
      { id: 'faq', to: '/ayuda', icono: FileQuestion, texto: 'Preguntas frecuentes' },
      { id: 'ayuda', to: '/ayuda', icono: HelpCircle, texto: 'Cómo usar la plataforma' },
      { id: 'contacto', to: '/contacto', icono: MessageCircle, texto: 'Contacto' },
    ],
  },
]
