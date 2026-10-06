// ---------------------------------------------------------------
// ÚNICA navegación del cliente (páginas principales). El layout
// `LayoutPaginaPrincipal` la pinta como ACORDEÓN de grupos: cada
// header despliega sus items en el MIS panel, sin pantalla
// secundaria ni botón de "volver". `NavAdmin` y el nav de staff son
// otros archivos, no se tocan acá.
//
// `contador: '<clave>'` en un item hace que el layout pida el número a
// `NavBadgesContext` (GET /nav/badges) y lo pinte como badge. La
// clave debe existir en el endpoint: notificaciones, chat,
// cotizaciones, requerimientos, documentos.
//
// `soloCliente: true` oculta el item al admin (que usa este mismo
// layout desde el bridge).
//
// El `id` de cada item debe coincidir con la prop `activo` que pasa
// la página que lo renderiza, si no el link no se resalta.
// ---------------------------------------------------------------
import {
  Package, ClipboardList, MessageCircle, ListChecks,
  Star, MapPin, User, Bell, Users,
  Wallet, DollarSign, FileText, FileBarChart, TrendingUp,
  PackagePlus, FileCheck,
  HelpCircle, FileQuestion, LifeBuoy, RotateCcw,
} from 'lucide-react'

export const NAV_UNIFICADO = {
  grupos: [
    {
      id: 'actividad',
      titulo: 'Mi actividad',
      icono: ListChecks,
      items: [
        { id: 'ordenes', to: '/orders', icono: Package, texto: 'Mis órdenes' },
        {
          id: 'notificaciones',
          to: '/notificaciones',
          icono: Bell,
          texto: 'Notificaciones',
          contador: 'notificaciones',
        },
        { id: 'chat', to: '/chat', icono: MessageCircle, texto: 'Chats', contador: 'chat' },
        { id: 'presupuesto', to: '/presupuesto', icono: ClipboardList, texto: 'Presupuesto' },
      ],
    },
    {
      id: 'cuenta',
      titulo: 'Mi cuenta',
      icono: User,
      items: [
        { id: 'cuenta', to: '/cuenta', icono: User, texto: 'Mi Cuenta' },
        { id: 'direcciones', to: '/direcciones', icono: MapPin, texto: 'Direcciones', soloCliente: true },
        { id: 'sub-usuarios', to: '/subusuarios', icono: Users, texto: 'Sub-usuarios' },
      ],
    },
    {
      id: 'favoritos',
      titulo: 'Favoritos',
      icono: Star,
      items: [
        { id: 'mis-items', to: '/mis-items', icono: Star, texto: 'Mis items', soloCliente: true },
        {
          id: 'comprar-nuevo',
          to: '/mis-items?tab=recomprar',
          icono: RotateCcw,
          texto: 'Comprar de nuevo',
          soloCliente: true,
        },
      ],
    },
    {
      id: 'estado-cuenta',
      titulo: 'Estado de cuenta',
      icono: Wallet,
      items: [
        { id: 'estado-cuenta', to: '/estado-de-cuenta', icono: Wallet, texto: 'Resumen' },
        { id: 'pagos-ec', to: '/estado-de-cuenta/pagos', icono: DollarSign, texto: 'Historial de pagos' },
        { id: 'facturas', to: '/estado-de-cuenta/facturas', icono: FileText, texto: 'Historial de facturas' },
        { id: 'reportes', to: '/estado-de-cuenta/reportes', icono: FileBarChart, texto: 'Reportes' },
        { id: 'ampliacion', to: '/estado-de-cuenta/ampliacion', icono: TrendingUp, texto: 'Solicitar ampliación' },
      ],
    },
    {
      id: 'solicitudes',
      titulo: 'Solicitudes',
      icono: ClipboardList,
      items: [
        { id: 'cotizaciones', to: '/mis-solicitudes/cotizaciones', icono: FileText, texto: 'Cotizaciones', contador: 'cotizaciones' },
        { id: 'requerimientos', to: '/mis-solicitudes/requerimientos', icono: PackagePlus, texto: 'Requerimientos', contador: 'requerimientos' },
        { id: 'documentos', to: '/mis-solicitudes/documentos', icono: FileCheck, texto: 'Documentos', contador: 'documentos' },
      ],
    },
  ],
  pie: {
    id: 'ayuda',
    titulo: 'Ayuda',
    icono: LifeBuoy,
    items: [
      { id: 'faq', to: '/ayuda', icono: FileQuestion, texto: 'Preguntas frecuentes' },
      { id: 'como-usar', to: '/ayuda/como-usar', icono: HelpCircle, texto: 'Cómo usar la plataforma' },
      { id: 'contacto', to: '/contacto', icono: MessageCircle, texto: 'Contacto' },
    ],
  },
}