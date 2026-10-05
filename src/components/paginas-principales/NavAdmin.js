// ---------------------------------------------------------------
// Menú de "Páginas Principales" para el módulo Admin.
//
// Cada item navega a una sub-ruta real bajo /admin/* (React Router),
// igual patrón que NavEstadoCuenta.js / NavItems.js. Antes esto usaba
// "accion" + un switch con estado local en Admin.jsx — se cambió a
// rutas reales para que cada sección sea un link real: se puede
// compartir, sobrevive un refresh, y el botón "atrás" del navegador
// funciona como se espera. Ver Admin.jsx para el <Routes> anidado.
// ---------------------------------------------------------------
import {
  LayoutDashboard, Package, ShoppingCart, Users, Wallet, CreditCard,
  Tag, FileText, Inbox, MessagesSquare, DollarSign, Files, ReceiptText, Megaphone, Truck, FlaskConical, KeyRound, Activity,
  Settings, ClipboardList,
} from 'lucide-react'

export const NAV_ADMIN = [
  {
    id: 'general',
    titulo: 'General',
    icono: Settings,
    items: [
      { id: 'dashboard', to: '/admin', icono: LayoutDashboard, texto: 'Dashboard' },
      { id: 'tasa', to: '/admin/tasa', icono: DollarSign, texto: 'Tasa de cambio' },
      { id: 'monitoreo', to: '/admin/monitoreo', icono: Activity, texto: 'Monitoreo' },
    ],
  },
  {
    id: 'ventas',
    titulo: 'Ventas',
    icono: ShoppingCart,
    items: [
      { id: 'ordenes', to: '/admin/ordenes', icono: ShoppingCart, texto: 'Órdenes' },
      { id: 'nuevaOrden', to: '/admin/nueva-orden', icono: ReceiptText, texto: 'Nueva orden rápida' },
      { id: 'delivery', to: '/admin/delivery', icono: Truck, texto: 'Delivery' },
      { id: 'productos', to: '/admin/productos', icono: Package, texto: 'Productos' },
      { id: 'moleculas', to: '/admin/moleculas', icono: FlaskConical, texto: 'Moléculas' },
      { id: 'descuentos', to: '/admin/descuentos', icono: Tag, texto: 'Descuentos' },
      { id: 'promociones', to: '/admin/promociones', icono: Megaphone, texto: 'Promociones' },
    ],
  },
  {
    id: 'cobranza',
    titulo: 'Cobranza',
    icono: Wallet,
    items: [
      { id: 'estadoCuenta', to: '/admin/estado-cuenta', icono: Wallet, texto: 'Estado de cuenta' },
      { id: 'pagos', to: '/admin/pagos', icono: CreditCard, texto: 'Pagos' },
    ],
  },
  {
    id: 'solicitudes',
    titulo: 'Solicitudes',
    icono: ClipboardList,
    items: [
      { id: 'cotizaciones', to: '/admin/cotizaciones', icono: FileText, texto: 'Cotizaciones' },
      { id: 'requerimientos', to: '/admin/requerimientos', icono: Inbox, texto: 'Requerimientos' },
      { id: 'documentos', to: '/admin/documentos', icono: Files, texto: 'Documentos' },
    ],
  },
  {
    id: 'cuenta',
    titulo: 'Cuenta',
    icono: Users,
    pie: true,
    items: [
      { id: 'usuarios', to: '/admin/usuarios', icono: Users, texto: 'Usuarios' },
      { id: 'gestionCodigos', to: '/admin/gestion-codigos', icono: KeyRound, texto: 'Gestionar códigos' },
      { id: 'chat', to: '/admin/chat', icono: MessagesSquare, texto: 'Chat' },
    ],
  },
]