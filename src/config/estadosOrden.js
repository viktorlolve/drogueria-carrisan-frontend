// src/config/estadosOrden.js
//
// FUENTE UNICA DE VERDAD para estados de órdenes: labels, colores,
// descripciones y timeline.
//
// REGLA ARQUITECTONICA (ver AGENTS.md raíz, seccion "Arquitectura de ordenes"):
//   ORDER STATUS ≠ PAYMENT STATUS ≠ FULFILLMENT METHOD
//
// Este modulo solo describe ORDER STATUS (ordenes.estado). El pago vive en
// `estado_pago` (esperando/reportado/verificado/rechazado/_null_) y el método
// de entrega en `tipo_envio` (retiro/delivery/envio_nacional). NUNCA mezclar
// las tres dimensiones en un solo enum.
//
// Los valores internos (las claves del objeto) son los que se persisten en DB
// y se usan en el backend. Los textos visibles están separados por receptor:
//   - cliente: lenguaje natural para el usuario final
//   - staff:   lenguaje operativo interno
//   - admin:   tecnico/informativo
//
// PROHIBIDO: duplicar ESTADOS_CONFIG/ESTADOS_ORDEN/ETAPAS en un componente.
// Si una pantalla necesita labels/colores de estados, importar de aquí.

export const FULFILLMENT_METHODS = {
  retiro: {
    id: 'retiro',
    label: 'Retiro en Depósito',
    descripcion: 'El cliente pasa a recoger el pedido cuando esté listo',
  },
  delivery: {
    id: 'delivery',
    label: 'Delivery en Moto',
    descripcion: 'Entrega en la dirección del cliente dentro de la ciudad',
  },
  envio_nacional: {
    id: 'envio_nacional',
    label: 'Envío Nacional',
    descripcion: 'Envío por agencia, se paga al recibir en destino',
  },
}

// ---------------------------------------------------------------
// Estados del ciclo de vida de la ORDEN (order.status).
// `esTerminal`, `aplicaA` y `legacy` son metadata para validaciones
// y para saber qué estados usan qué fulfillment.
// ---------------------------------------------------------------
export const ESTADOS_ORDEN = {
  pedido_creado: {
    id: 'pedido_creado',
    label: 'Pedido Creado',
    labels: {
      cliente: 'Pedido Recibido',
      staff: 'Por revisar',
      admin: 'pedido_creado',
    },
    descripcion: 'Recibimos tu orden y está pendiente de revisión y confirmación.',
    color: '#f59e0b',
    bg: '#fef3c7',
    esTerminal: false,
    aplicaA: ['retiro', 'delivery', 'envio_nacional'],
  },

  // LEGACY — NO usar para órdenes nuevas.
  // Solo existió como sustituto de estado de pago (contado esperando pagar).
  // La situación se representa con estado_pago + permanencia en `preparando`.
  procesando: {
    id: 'procesando',
    label: 'Procesando',
    labels: {
      cliente: 'Procesando',
      staff: 'Procesando',
      admin: 'procesando',
    },
    descripcion: 'LEGACY: era la ventana de pago de contado. Reemplazado por estado_pago.',
    color: '#3b82f6',
    bg: '#dbeafe',
    esTerminal: false,
    legacy: true,
    aplicaA: ['retiro', 'delivery', 'envio_nacional'],
  },

  preparando: {
    id: 'preparando',
    label: 'Preparando',
    labels: {
      cliente: 'Preparando Pedido',
      staff: 'En preparación',
      admin: 'preparando',
    },
    descripcion: 'La orden fue confirmada y nuestro equipo está preparando sus productos para su despacho.',
    color: '#8b5cf6',
    bg: '#ede9fe',
    esTerminal: false,
    aplicaA: ['retiro', 'delivery', 'envio_nacional'],
  },

  enviado: {
    id: 'enviado',
    label: 'Enviado',
    labels: {
      clientePorFulfillment: {
        delivery: 'En camino',
        envio_nacional: 'Enviado por Agencia',
        retiro: null, // nunca aplica a retiro
      },
      cliente: 'En camino',
      staff: 'Por despachar',
      admin: 'enviado',
    },
    descripcion: 'El pedido fue despachado y se encuentra en camino a su destino.',
    color: '#06b6d4',
    bg: '#cffafe',
    esTerminal: false,
    aplicaA: ['delivery', 'envio_nacional'],
  },

  entregado: {
    id: 'entregado',
    label: 'Entregado',
    labels: {
      clientePorFulfillment: {
        delivery: 'Entregado',
        envio_nacional: 'Entregado a la agencia',
        retiro: null,
      },
      cliente: 'Entregado',
      staff: 'Entregado',
      admin: 'entregado',
    },
    descripcion: 'La orden fue entregada en el destino del cliente.',
    color: '#10b981',
    bg: '#d1fae5',
    esTerminal: true,
    aplicaA: ['delivery', 'envio_nacional'],
  },

  listo_para_retiro: {
    id: 'listo_para_retiro',
    label: 'Listo para Retiro',
    labels: {
      cliente: 'Listo para Retirar',
      staff: 'Listo para retiro',
      admin: 'listo_para_retiro',
    },
    descripcion: 'La orden está lista en el mostrador para que el cliente la retire.',
    color: '#0891b2',
    bg: '#cffafe',
    esTerminal: false,
    aplicaA: ['retiro'],
  },

  retirado: {
    id: 'retirado',
    label: 'Retirado',
    labels: {
      cliente: 'Retirado',
      staff: 'Retirado',
      admin: 'retirado',
    },
    descripcion: 'El cliente recogió la orden en el depósito.',
    color: '#10b981',
    bg: '#d1fae5',
    esTerminal: true,
    aplicaA: ['retiro'],
  },

  cancelado: {
    id: 'cancelado',
    label: 'Cancelado',
    labels: {
      cliente: 'Cancelado',
      staff: 'Cancelado',
      admin: 'cancelado',
    },
    descripcion: 'La orden fue cancelada y no continuará con el proceso de preparación o entrega.',
    color: '#ef4444',
    bg: '#fee2e2',
    esTerminal: true,
    aplicaA: ['retiro', 'delivery', 'envio_nacional'],
  },
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

// Timeline de estados para el cliente, según fulfillment method.
// `order.status` se separa y el pago sale del timeline logístico (se muestra
// como alerta/condición, nunca como etapa).
//
// Ejemplo retiro:
//   pedido_creado → preparando → listo_para_retiro → retirado
//
// Ejemplo delivery:
//   pedido_creado → preparando → enviado → entregado
export function getEtapas(fulfillmentMethod = 'retiro') {
  const flujo =
    fulfillmentMethod === 'retiro'
      ? ['pedido_creado', 'preparando', 'listo_para_retiro', 'retirado']
      : ['pedido_creado', 'preparando', 'enviado', 'entregado']

  return flujo.map((id) => {
    const est = ESTADOS_ORDEN[id]
    return {
      id,
      label: getLabelEstado(id, { fulfillmentMethod, rol: 'cliente' }),
      desc: est.descripcion,
    }
  })
}

// Label de un estado según el receptor y el fulfillment method.
export function getLabelEstado(estadoId, ctx = {}) {
  const est = ESTADOS_ORDEN[estadoId]
  if (!est) return estadoId

  const rol = ctx.rol || 'cliente'
  const fulfillmentMethod = ctx.fulfillmentMethod || null

  if (rol === 'cliente' && fulfillmentMethod && est.labels.clientePorFulfillment) {
    const porMetodo = est.labels.clientePorFulfillment[fulfillmentMethod]
    if (porMetodo) return porMetodo
  }

  if (est.labels[rol]) return est.labels[rol]

  // Fallback al label por defecto
  return est.label
}

// Config de color/badge para un estado.
export function getEstadoConfig(estadoId) {
  return ESTADOS_ORDEN[estadoId] || null
}

// Estados terminales (no pueden avanzar ni cancelarse).
export function getEstadosTerminales() {
  return Object.values(ESTADOS_ORDEN)
    .filter((e) => e.esTerminal)
    .map((e) => e.id)
}

// Estados que aplican a un fulfillment method dado.
export function getEstadosParaFulfillment(fulfillmentMethod) {
  return Object.values(ESTADOS_ORDEN)
    .filter((e) => !e.legacy && e.aplicaA.includes(fulfillmentMethod))
    .map((e) => e.id)
}

// Visual completo de un estado para el CLIENTE, listo para pintar: label,
// color y fondo. Compone los helpers de arriba y normaliza los estados
// heredados, para que quien la use no tenga que acordarse de ese paso.
// Los pares (color/bg) son de estadosOrden.js: quien la consume los inyecta
// por CSS var (ej. --estado-color) y nunca escribe el hex por su cuenta.
export function getEstadoVisual(estadoId, ctx = {}) {
  const normalizado = normalizarEstado(estadoId)
  const cfg = getEstadoConfig(normalizado)
  return {
    label: getLabelEstado(normalizado, { rol: 'cliente', ...ctx }),
    color: cfg?.color || '#6b6b7a',
    bg: cfg?.bg || '#f1f1ea',
  }
}

// Normaliza estados heredados (de antes del pipeline actual) al set nuevo,
// para que órdenes viejas sigan mostrando algo coherente. 'procesando'
// fue la ventana de pago de contado y hoy se representa con
// estado_pago + permanencia en 'preparando'.
const LEGACY_ESTADOS = {
  pendiente: 'pedido_creado',
  confirmado: 'preparando',
  en_preparacion: 'preparando',
  finalizado: 'entregado',
  procesando: 'preparando',
  cancelada: 'cancelado',
}

export function normalizarEstado(estado) {
  return LEGACY_ESTADOS[estado] || estado
}

// ---------------------------------------------------------------
// Importante para migración:
// `procesando` queda marcado como legacy para trazabilidad. Cuando se elimine
// del pipeline, los consumidores deben dejar de usarlo y la condición de pago
// pasa a leerse desde `estado_pago` (ver regla en AGENTS.md).
// ---------------------------------------------------------------