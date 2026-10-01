import {
  Package,
  CheckCircle,
  DollarSign,
  CreditCard,
  Ban,
  FileCheck,
  FileX,
  MessageCircle,
  AlertTriangle,
  Bell,
  Clock,
  FileText,
  ClipboardList,
  ShoppingBag,
  Info,
  Megaphone,
  Lock,
  LockOpen,
  Tag,
  BadgeDollarSign,
} from 'lucide-react'

export const CATEGORIAS = {
  ordenes: {
    id: 'ordenes',
    nombre: 'Órdenes',
    color: 'blue',
    icono: Package,
    tipos: [
      'orden_creada',
      'orden_confirmada',
      'orden_aprobada',
      'orden_enviada',
      'orden_entregada',
      'orden_lista_retiro',
      'orden_cancelada',
      'estado_cambiado',
      'orden_actualizada',
      'orden_incidencia',
      'paquete_verificado',
      'reintento_envio',
    ],
  },

  pagos: {
    id: 'pagos',
    nombre: 'Pagos',
    color: 'green',
    icono: DollarSign,
    tipos: [
      'pago_registrado',
      'pago_recibido',
      'pago_rechazado',
      'pago_reportado',
      'pago_verificado',
    ],
  },

  chat: {
    id: 'chat',
    nombre: 'Chat',
    color: 'purple',
    icono: MessageCircle,
    tipos: ['chat_mensaje'],
  },

  credito: {
    id: 'credito',
    nombre: 'Crédito',
    color: 'orange',
    icono: AlertTriangle,
    tipos: [
      'orden_por_vencer',
      'orden_vencida',
      'recordatorio_cobro',
      'credito_bloqueado',
      'credito_desbloqueado',
    ],
  },

  documentos: {
    id: 'documentos',
    nombre: 'Documentos',
    color: 'teal',
    icono: FileText,
    tipos: [
      'documento_listo',
      'documento_aprobado',
      'documento_rechazado',
      'documento_nuevo',
    ],
  },

  solicitudes: {
    id: 'solicitudes',
    nombre: 'Solicitudes',
    color: 'cyan',
    icono: ClipboardList,
    tipos: [
      'cotizacion_respondida',
      'cotizacion_rechazada',
      'requerimiento_respondido',
      'requerimiento_nuevo',
      'cotizacion_nueva',
    ],
  },

  sistema: {
    id: 'sistema',
    nombre: 'Sistema',
    color: 'gray',
    icono: Info,
    tipos: [
      'producto_disponible',
      'factura_emitida',
      'sistema',
      'producto_con_precio',
    ],
  },

  ofertas: {
    id: 'ofertas',
    nombre: 'Ofertas',
    color: 'red',
    icono: Megaphone,
    tipos: ['oferta', 'promocion_enviada', 'cupon_generado'],
  },
}

export const ORDEN_CATEGORIAS = Object.keys(CATEGORIAS)

/**
 * Descripción general que se muestra dentro del acordeón
 * "¿Qué significa cada notificación?"
 *
 * Las descripciones están agrupadas por categoría para evitar
 * repetir una explicación por cada tipo de notificación.
 */
export const DESCRIPCION_CATEGORIA = {
  ordenes:
    'Actualizaciones sobre tus órdenes, desde que se crean hasta que se entregan, cancelan o cambian de estado.',

  pagos:
    'Información sobre tus pagos: cuando reportas uno, cuando lo verificamos y si lo rechazamos.',

  chat:
    'Avisos cuando recibes nuevos mensajes o respuestas en el Centro de Comunicaciones.',

  credito:
    'Avisos de tus órdenes a crédito: próximos a vencer, ya vencidos, recordatorios de pago y cuándo se bloquea o desbloquea tu crédito.',

  documentos:
    'Actualizaciones sobre tus documentos, incluyendo cuando están disponibles, aprobados o rechazados.',

  solicitudes:
    'Novedades sobre tus cotizaciones y solicitudes de requerimientos, incluyendo sus respuestas.',

  sistema:
    'Avisos generales de la plataforma, como nuevos productos disponibles, facturas emitidas y otros comunicados.',

  ofertas:
    'Información sobre ofertas, promociones y oportunidades especiales disponibles para ti.',
}

/**
 * Ícono por tipo de notificación. Si un tipo no aparece aquí, se usa
 * el ícono de su categoría.
 *
 * Regla del dueño: todo lo que habla del pedido (creada, aprobada,
 * cambio de estado) usa la CAJA azul; el ícono de pago queda solo para
 * `pago_reportado` y `pago_verificado` lleva tilde verde.
 */
const ICONOS_POR_TIPO = {
  // Órdenes — caja azul para todo lo del pedido
  orden_creada: ShoppingBag,
  orden_confirmada: Package,
  orden_aprobada: Package,
  orden_enviada: Package,
  orden_entregada: Package,
  orden_cancelada: Package,
  estado_cambiado: Package,
  orden_actualizada: Package,
  orden_incidencia: AlertTriangle,

  // Logística (staff) — la caja azul sigue siendo "la orden"; los dos
  // hitos operativos que sí son señal de problema/avance llevan su ícono.
  orden_lista_retiro: Package,
  paquete_verificado: CheckCircle,
  reintento_envio: AlertTriangle,

  // Pagos — el de pago solo para lo reportado, la tilde verde para verificado
  pago_reportado: DollarSign,
  pago_verificado: CheckCircle,
  pago_registrado: CreditCard,
  pago_recibido: DollarSign,
  pago_rechazado: Ban,

  chat_mensaje: MessageCircle,

  // Crédito
  orden_por_vencer: Clock,
  orden_vencida: AlertTriangle,
  recordatorio_cobro: Bell,
  credito_bloqueado: Lock,
  credito_desbloqueado: LockOpen,

  // Documentos
  documento_listo: FileCheck,
  documento_aprobado: CheckCircle,
  documento_rechazado: FileX,
  documento_nuevo: FileText,

  // Solicitudes
  cotizacion_respondida: CheckCircle,
  cotizacion_rechazada: Ban,
  requerimiento_respondido: CheckCircle,
  requerimiento_nuevo: ClipboardList,
  cotizacion_nueva: ClipboardList,

  // Sistema
  producto_disponible: Bell,
  factura_emitida: FileText,
  producto_con_precio: BadgeDollarSign,

  // Ofertas (staff)
  oferta: Megaphone,
  promocion_enviada: Megaphone,
  cupon_generado: Tag,
}

/**
 * Color por tipo de notificación. Si un tipo no aparece aquí, se usa
 * el color de su categoría. Los colores válidos son las clases
 * `.notif-icon--*` de `pages/Notificaciones.css`.
 */
const COLOR_POR_TIPO = {
  // Órdenes: azul, salvo la incidencia (es un problema → ámbar)
  orden_creada: 'blue',
  orden_confirmada: 'blue',
  orden_aprobada: 'blue',
  orden_enviada: 'blue',
  orden_entregada: 'blue',
  orden_cancelada: 'blue',
  estado_cambiado: 'blue',
  orden_actualizada: 'blue',
  orden_incidencia: 'amber',

  // Logística (staff)
  orden_lista_retiro: 'blue',
  paquete_verificado: 'green',
  reintento_envio: 'amber',

  // Pagos: lo reportado espera (ámbar), lo verificado está listo (verde)
  pago_reportado: 'amber',
  pago_verificado: 'green',
  pago_registrado: 'blue',
  pago_recibido: 'green',
  pago_rechazado: 'red',

  chat_mensaje: 'purple',

  // Crédito
  orden_por_vencer: 'amber',
  orden_vencida: 'red',
  recordatorio_cobro: 'amber',
  credito_bloqueado: 'red',
  credito_desbloqueado: 'green',

  // Documentos
  documento_listo: 'teal',
  documento_aprobado: 'teal',
  documento_rechazado: 'red',
  documento_nuevo: 'teal',

  // Solicitudes
  cotizacion_respondida: 'cyan',
  cotizacion_rechazada: 'red',
  requerimiento_respondido: 'cyan',
  requerimiento_nuevo: 'cyan',
  cotizacion_nueva: 'cyan',

  // Sistema
  producto_disponible: 'gray',
  factura_emitida: 'gray',
  producto_con_precio: 'green',

  // Ofertas (staff)
  promocion_enviada: 'red',
  cupon_generado: 'red',
}

export function getCategoriaDeTipo(tipo) {
  for (const cat of Object.values(CATEGORIAS)) {
    if (cat.tipos.includes(tipo)) {
      return cat.id
    }
  }

  return 'sistema'
}

/**
 * Config visual de un tipo de notificación: la de su categoría con el
 * ícono y el color del tipo por encima (si el tipo los define).
 * Devuelve siempre `{ ...categoria, icono, color }`.
 */
export function getConfigTipo(tipo) {
  const categoria = CATEGORIAS[getCategoriaDeTipo(tipo)]

  return {
    ...categoria,
    icono: ICONOS_POR_TIPO[tipo] || categoria.icono,
    color: COLOR_POR_TIPO[tipo] || categoria.color,
  }
}

export function getIconoTipo(tipo) {
  return getConfigTipo(tipo).icono
}
