// ---------------------------------------------------------------
// Menú de navegación para el módulo staff (/staff/*).
//
// Reorganizado en 3 departamentos con metadata propia (color,
// icono, descripción). El dashboard usa DEPARTAMENTOS para
// renderizar tarjetas; las páginas usan MODULOS[] para el sidebar.
//
// Cada item declara a qué roles es visible (campo "roles").
// Rol 'director' tiene acceso a TODOS los módulos staff.
// ---------------------------------------------------------------
import {
  LayoutDashboard, PackageCheck, ClipboardList, ShoppingCart,
  Landmark, TrendingUp, Truck, Receipt, Banknote, CalendarX2,
  Inbox, FileText, Megaphone, MapPin, BadgeDollarSign, Users,
  Shield, BarChart3, MessageSquare, Gift,
} from 'lucide-react'

const ROLES_TODOS = ['vendedor', 'despachador', 'almacenista', 'contabilidad', 'administrador', 'director', 'admin']

// -----------------------------------------------------------------
// Departamentos — definición visual para el dashboard
// -----------------------------------------------------------------
export const DEPARTAMENTOS = [
  {
    id: 'finanzas',
    nombre: 'Finanzas',
    descripcion: 'Contabilidad, crédito, cobranza y estados financieros',
    color: '#0D9373',
    colorStrong: '#0B7A5F',
    colorLight: '#E8F5F1',
    icono: Landmark,
  },
  {
    id: 'comercial',
    nombre: 'Comercial',
    descripcion: 'Ventas, pedidos, marketing y relación con clientes',
    color: '#2563EB',
    colorStrong: '#1D4ED8',
    colorLight: '#EFF6FF',
    icono: TrendingUp,
  },
  {
    id: 'logistica',
    nombre: 'Logística',
    descripcion: 'Almacén, preparación, despacho y operaciones',
    color: '#D97706',
    colorStrong: '#B45309',
    colorLight: '#FFFBEB',
    icono: Truck,
  },
]

// -----------------------------------------------------------------
// Módulos — items de navegación agrupados por departamento
// (usados por el sidebar del LayoutDepartamento)
// -----------------------------------------------------------------
export const MODULOS = {
  finanzas: [
    {
      titulo: 'Finanzas',
      items: [
        {
          id: 'ventas',
          to: '/staff/ventas',
          icono: Receipt,
          texto: 'Facturación',
          desc: 'Emite facturas, recibos, notas de crédito y débito',
          roles: ['contabilidad', 'administrador', 'director', 'admin'],
        },
        {
          id: 'cuentas-por-cobrar',
          to: '/staff/cuentas-por-cobrar',
          icono: Banknote,
          texto: 'Cuentas por cobrar',
          desc: 'Clientes con línea de crédito y su estado de cuenta',
          roles: ['contabilidad', 'administrador', 'director', 'admin'],
        },
        {
          id: 'ordenes-por-cancelar',
          to: '/staff/ordenes-por-cancelar',
          icono: CalendarX2,
          texto: 'En espera de pago',
          desc: 'Órdenes de contado sin pago confirmado — cancelar y liberar stock',
          roles: ['contabilidad', 'administrador', 'director', 'admin'],
        },
        {
          id: 'credito',
          to: '/staff/credito',
          icono: Shield,
          texto: 'Crédito y cobranza',
          desc: 'Línea de crédito de todos los clientes: cobros, reportes por verificar, aging y cobranza',
          roles: ['contabilidad', 'administrador', 'director', 'admin'],
        },
        {
          id: 'tesoreria',
          to: '/staff/tesoreria',
          icono: Banknote,
          texto: 'Tesorería',
          desc: 'Reportes de ingresos y egresos manuales del período',
          roles: ['contabilidad', 'administrador', 'director', 'admin'],
        },
        {
          id: 'reportes-financieros',
          to: '/staff/reportes-financieros',
          icono: BarChart3,
          texto: 'Reportes financieros',
          desc: 'Informe mensual consolidado: ventas, crédito, cobros, facturación y egresos',
          roles: ['contabilidad', 'administrador', 'director', 'admin'],
        },
      ],
    },
  ],
  comercial: [
    {
      titulo: 'Comercial',
      items: [
        {
          id: 'clientes',
          to: '/staff/clientes',
          icono: Users,
          texto: 'Clientes',
          desc: 'Consulta y gestión de clientes',
          roles: ['vendedor', 'administrador', 'director', 'admin'],
        },
        {
          id: 'chat',
          to: '/staff/chat',
          icono: MessageSquare,
          texto: 'Comunicaciones',
          desc: 'Mensajes con clientes: conversaciones y respuestas',
          roles: ['vendedor', 'administrador', 'director', 'admin'],
        },
        {
          id: 'ordenes',
          to: '/staff/ordenes',
          icono: ShoppingCart,
          texto: 'Crear orden a cliente',
          desc: 'Arma pedidos a nombre de un cliente y confirma el envío',
          roles: ['vendedor', 'administrador', 'director', 'admin'],
        },
        {
          id: 'solicitudes',
          to: '/staff/solicitudes',
          icono: Inbox,
          texto: 'Solicitudes',
          desc: 'Responde cotizaciones y requerimientos de precio de los clientes',
          roles: ['vendedor', 'administrador', 'director', 'admin'],
        },
        {
          id: 'presupuestos',
          to: '/staff/presupuestos',
          icono: FileText,
          texto: 'Presupuestos',
          desc: 'Crea, recotiza y convierte presupuestos en pedidos',
          roles: ['vendedor', 'administrador', 'director', 'admin'],
        },
        {
          id: 'promociones',
          to: '/staff/promociones',
          icono: Megaphone,
          texto: 'Promociones',
          desc: 'Crea y edita plantillas de promociones (sin envío masivo)',
          roles: ['administrador', 'director', 'admin'],
        },
        {
          id: 'precios',
          to: '/staff/precios',
          icono: BadgeDollarSign,
          texto: 'Precios',
          desc: 'Fija precios del catálogo con filtros (línea, forma, laboratorio, ATC)',
          roles: ['administrador', 'director', 'admin'],
        },
        {
          id: 'cupones',
          to: '/staff/cupones',
          icono: Gift,
          texto: 'Cupones',
          desc: 'Genera códigos giftcard de descuento por % o monto',
          roles: ['administrador', 'director', 'admin'],
        },
        {
          id: 'vitrina',
          to: '/staff/vitrina',
          icono: LayoutDashboard,
          texto: 'Vitrina',
          desc: 'Administra el contenido de la página de inicio (hero, cargas, promos, bento, carruseles)',
          roles: ['administrador', 'director', 'admin'],
        },
      ],
    },
  ],
  logistica: [
    {
      titulo: 'Logística',
      items: [
        {
          id: 'pedidos',
          to: '/staff/pedidos',
          icono: PackageCheck,
          texto: 'Pedidos',
          desc: 'Pipeline completo: revisa, aprueba, prepara, retiros, incidencias y completadas',
          roles: ['almacenista', 'administrador', 'director', 'admin'],
        },
        {
          id: 'envios',
          to: '/staff/envios',
          icono: ClipboardList,
          texto: 'Envíos',
          desc: 'Cola de pedidos en ruta para el motorizado: dirección, contacto y entrega',
          roles: ['despachador', 'administrador', 'director', 'admin'],
        },
        {
          id: 'direcciones',
          to: '/staff/direcciones',
          icono: MapPin,
          texto: 'Direcciones de clientes',
          desc: 'Direcciones de envío con teléfono, preferida y nota de entrega',
          roles: ['almacenista', 'administrador', 'director', 'admin'],
        },
      ],
    },
  ],
}

// -----------------------------------------------------------------
// NAV_STAFF legacy — se mantiene para compatibilidad con
// LayoutStaff (sidebar genérico que aún podría usarse)
// -----------------------------------------------------------------
export const NAV_STAFF = [
  {
    titulo: 'General',
    items: [
      { id: 'dashboard', to: '/staff/dashboard', icono: LayoutDashboard, texto: 'Dashboard', roles: ROLES_TODOS },
    ],
  },
  ...MODULOS.logistica,
  ...MODULOS.comercial,
  ...MODULOS.finanzas,
]

// Roles que pueden usar el bridge al panel administrativo del dueño.
// Solo el rol 'admin' (el dueño) tiene acceso.
export const ROLES_BRIDGE_ADMIN = ['admin']
