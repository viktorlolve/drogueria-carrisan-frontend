// src/config/copyEtiqueta.js
//
// Copy del primer cuadro informativo de `components/FilasConfianza.jsx`, según
// la ETIQUETA DE PRECIO del cliente (`users.etiqueta`, tabla `etiquetas_precio`,
// migración 037 del backend).
//
// OJO — el texto no promete porcentajes: el backend aplica el descuento de la
// etiqueta en silencio sobre el precio (`precio_etiqueta = precio_usd *
// (1 - porcentaje/100)`, en `controllers/descuentos.controller.js`) pero NO manda
// el porcentaje al cliente. Si algún día se quiere mostrarlo ("-8% en tu
// precio"), hay que exponerlo primero desde el backend.
//
// La etiqueta es fija por cliente y la asigna el staff en Comercial → Clientes
// (`PATCH /staff/clientes/:id/etiqueta`), así que puede ser cualquier texto que
// el dueño cree en `etiquetas_precio`. Por eso `getCopyEtiqueta` degrada en
// cascada: etiqueta exacta → tipo de usuario → copy genérico con sesión → copy
// genérico sin sesión. Nunca devuelve undefined.

export const COPY_ETIQUETA = {
  // --- Etiquetas de precio ---
  institucional: {
    titulo: 'Precio institucional',
    detalle: 'Precios de distribución para clínicas, consultorios y centros de salud',
  },
  distribuidor: {
    titulo: 'Precio institucional',
    detalle: 'Precios de distribución para clínicas, consultorios y centros de salud',
  },
  profesional: {
    titulo: 'Precio profesional',
    detalle: 'Precios mayoristas para médicos, enfermeros y profesionales de la salud',
  },
  medico: {
    titulo: 'Precio profesional',
    detalle: 'Precios mayoristas para médicos, enfermeros y profesionales de la salud',
  },
  honorifico: {
    titulo: 'Precio comunidad',
    detalle: 'Precio especial para miembros de la comunidad Carrisan',
  },
  contado: {
    titulo: 'Precio contado',
    detalle: 'El descuento por pagar al contado ya está aplicado',
  },
  credito: {
    titulo: 'Precio crédito',
    detalle: 'El descuento de tu línea de crédito ya está aplicado',
  },
}

// Respaldo para cualquier etiqueta que el dueño cree y todavía no esté en el mapa.
const COPY_ETIQUETA_CON_SESION = {
  titulo: 'Precio de tu cuenta',
  detalle: 'El precio que ves ya incluye el descuento de tu perfil de cliente',
}

// Respaldo para el visitante sin sesión (el cuadro se sigue pintando).
const COPY_SIN_SESION = {
  titulo: 'Precio de droguería',
  detalle: 'Precios mayoristas para profesionales e instituciones',
}

const norm = (valor) => String(valor || '').trim().toLowerCase()

/**
 * Devuelve `{ titulo, detalle }` para el cuadro informativo.
 * @param {{ etiqueta?: string, tipo_usuario?: string }} cliente
 */
export function getCopyEtiqueta(cliente) {
  const etiqueta = norm(cliente?.etiqueta)
  if (etiqueta && COPY_ETIQUETA[etiqueta]) return COPY_ETIQUETA[etiqueta]

  const tipo = norm(cliente?.tipo_usuario)
  if (tipo && COPY_ETIQUETA[tipo]) return COPY_ETIQUETA[tipo]

  return cliente ? COPY_ETIQUETA_CON_SESION : COPY_SIN_SESION
}

export default COPY_ETIQUETA