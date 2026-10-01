// ---------------------------------------------------------------
// Deep-links del centro de notificaciones del STAFF.
//
// Espejo frontend de `URL_DESTINO_POR_TIPO` en
// `drogueria-carrisan-backend/src/services/notificacionesStaff.service.js`:
// el backend usa el mismo mapa para el `data.url` del push y el
// frontend para navegar al hacer clic en la notificación.
//
// Duplicado a propósito: el frontend no importa código del backend.
// Si cambia un destino, hay que cambiarlo en los dos lados
// (los tests del backend son el contrato del mapa del servidor).
//
// Logística son 6 colas (`MODULOS.logistica` en NavStaff.js), NO un
// `/staff/pedidos` único: cada hito cae en la cola donde está el botón
// de la acción. Un destino inexistente = 404 en blanco al tocar la
// notificación (o al abrir el push).
// ---------------------------------------------------------------

export const RUTA_BANDEJA_STAFF = '/staff/notificaciones'

const DESTINO_POR_TIPO = {
  // Pipeline de almacén (Logística)
  orden_creada: '/staff/pedidos/nuevas',
  orden: '/staff/pedidos/nuevas',
  orden_confirmada: '/staff/pedidos/preparar',
  orden_aprobada: '/staff/pedidos/preparar',
  orden_actualizada: '/staff/pedidos/preparar',
  estado_cambiado: '/staff/pedidos/preparar',
  paquete_verificado: '/staff/pedidos/preparar',
  orden_lista_retiro: '/staff/pedidos/retiros',
  orden_incidencia: '/staff/pedidos/incidencias',
  orden_cancelada: '/staff/pedidos/completadas',

  // Despacho
  orden_enviada: '/staff/envios',
  orden_entregada: '/staff/envios',
  reintento_envio: '/staff/envios',

  // Finanzas / pagos / crédito / facturas
  pago_reportado: '/staff/credito',
  pago_rechazado: '/staff/credito',
  pago_registrado: '/staff/cuentas-por-cobrar',
  pago_recibido: '/staff/cuentas-por-cobrar',
  pago_verificado: '/staff/ventas',
  factura_emitida: '/staff/ventas',
  orden_por_vencer: '/staff/credito',
  orden_vencida: '/staff/credito',
  recordatorio_cobro: '/staff/credito',
  credito_bloqueado: '/staff/credito',
  credito_desbloqueado: '/staff/credito',

  // Comercial / solicitudes / documentos / chat / catálogo
  requerimiento_nuevo: '/staff/solicitudes',
  requerimiento_respondido: '/staff/solicitudes',
  cotizacion_nueva: '/staff/solicitudes',
  cotizacion_respondida: '/staff/solicitudes',
  cotizacion_rechazada: '/staff/solicitudes',
  documento_nuevo: '/staff/clientes',
  documento_listo: '/staff/clientes',
  documento_aprobado: '/staff/clientes',
  documento_rechazado: '/staff/clientes',
  chat_mensaje: '/staff/chat',
  producto_con_precio: '/staff/precios',
  producto_disponible: '/staff/precios',
  promocion_enviada: '/staff/promociones',
  oferta: '/staff/promociones',
  cupon_generado: '/staff/cupones',
}

/** Ruta del módulo al que lleva la notificación; la bandeja si no hay una. */
export function urlDestinoStaff(tipo) {
  return DESTINO_POR_TIPO[tipo] || RUTA_BANDEJA_STAFF
}