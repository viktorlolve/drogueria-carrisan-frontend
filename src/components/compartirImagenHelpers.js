// src/components/compartirImagenHelpers.js
// Lógica PURA de la imagen "Compartir como imagen" (sin DOM ni canvas).
// Separada del componente para poder testearla (scripts/compartirImagenHelpers.test.mjs)
// y para que la geometría decidida en el diseño viva en UN solo lugar.
//
// Diseño: analisis/design-compartir-imagen-2026-10-15.md
// La parte de dibujo sigue en CompartirProductoImagen.jsx; su fuente de verdad es el
// canvas renderizado, no un test unitario.
// Extensión explícita: este helper lo carga `node --test` (ESM estricto) además de Vite.
import { CONTACTO } from '../config/contacto.js'

/* ---------------- geometría del lienzo ---------------- */

export const W = 1080
export const H = 1350
export const PAD = 72

// Zona media (producto + panel). Su ALTO es fijo; su Y la decide centrarZonaMedia():
// el bloque se centraba en 470 fijo y el dueño lo vio "muy abajo" (aire de 82 arriba,
// 10 abajo con encabezado de 1 línea). MEDIA_Y queda como referencia del cálculo manual.
export const MEDIA_Y = 470
export const MEDIA_H = 540 // alto fijo del bloque

// Centra la zona media entre el borde inferior del encabezado (bandaH) y la franja de
// precio (PIE_Y), dejando el MISMO aire arriba y abajo — el "mismo padding o espacio que
// arriba" que pidió el dueño. Encabezado 1 línea (388) → y=434 (46/46); 2 líneas (458)
// → y=469 (11/11). El `Math.max(0, …)` es red de seguridad: si un título llegara a 3
// líneas la zona no pisaría el encabezado (pegada, pero sin solaparse).
export function centrarZonaMedia(bandaH) {
  return bandaH + Math.max(0, (PIE_Y - bandaH - MEDIA_H) / 2)
}

// B1. Producto (izquierda)
export const PRODUCTO_X = 72
export const PRODUCTO_W = 436
export const PRODUCTO_CX = PRODUCTO_X + PRODUCTO_W / 2 // 290
export const PRODUCTO_DY = MEDIA_H / 2 // centro vertical respecto al tope de la zona

// B2. Panel de información (derecha)
export const PANEL_X = 548
export const PANEL_W = 460
export const PANEL_PAD = 22
export const CONTENIDO_ANCHO = PANEL_W - PANEL_PAD * 2 // 416
export const CONTENIDO_ALTO = MEDIA_H - PANEL_PAD * 2 // 496

// B2.1 Checks
export const ALTO_CHECKS = 36 // 25 de texto + 11 de margen
export const CHECK_R = 12.5
export const CHECK_TEXTO_LH = 25

// B2.2 Separador
export const ALTO_SEPARADOR = 28 // 12 arriba + 2 de línea + 14 abajo

// B2.3 Filas
export const FILA_LH = 25
export const FILA_PAD = 8

// B3. Badge de descuento
export const BADGE_CX = 428
export const BADGE_DY = 127 // altura del badge respecto al tope de la zona media (597-470)
export const BADGE_R = 92
export const BADGE_ANILLO_R = 80

// C. Franja de precio
export const PIE_Y = 1020
export const PIE_H = 250

// C.1 Fila de precio (dentro de la franja)
export const PIE_PRECIO_FUENTE = 64 // precio de venta
export const PIE_ORIG_FUENTE = 30 // precio original tachado
export const PIE_PILL_FUENTE = 25 // pill "Ahorras" (NO se encoge)
export const PIE_PRECIO_GAP = 26 // separación precio -> original
export const PIE_PRECIO_MARGEN = 6 // aire entre la fila y la pill (absorbe el redondeo de la fuente)
export const PIE_PRECIO_KP_MIN = 0.7 // piso del autofit de la fila

// D. Tira de contacto
export const TIRA_Y = 1270
export const TIRA_H = 80
export const TIRA_ICONO = 30
export const TIRA_SEP = 12
export const TIRA_GAP = 44

// C.2 QR al producto (derecha de la franja de precio).
// El dueño pidió agrandarlo: la tarjeta pasa de 112 a 144 (el código de 96 a 128) y la
// leyenda "Escanea para ver el producto" se va de abajo a la IZQUIERDA en 3 líneas.
// La tarjeta mantiene su borde derecho alineado al PAD (1008) y su centro vertical en
// 1140 (el mismo que tenía el QR de 112) → 1068..1212, entre la franja (1020) y el
// pie de la franja (texto con baseline 1258, tinta desde ~1244).
export const QR_TAM = 144
export const QR_PAD = 8 // aire blanco entre el borde de la tarjeta y el código
export const QR_X = W - PAD - QR_TAM // 864 → 864..1008
export const QR_Y = 1068
export const QR_LEYENDA = ['Escanea', 'para ver el', 'producto'] // verbatim del dueño
export const QR_LEYENDA_FUENTE = 17
export const QR_LEYENDA_LH = 22
export const QR_LEYENDA_GAP = 18 // aire entre la leyenda y la tarjeta del QR

/* ---------------- precios y gating ---------------- */

export const fmtUsd = (n) => `$${Number(n).toFixed(2)}`

// Precio usable: número finito y > 0; cualquier otra cosa => null
export function precioNumerico(producto) {
  const p = producto?.precio_usd
  if (p == null || p === '') return null
  const n = Number(p)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function tieneDescuento(producto) {
  return (
    precioNumerico(producto) != null &&
    producto?.precio_original_usd != null &&
    !!producto?.descuento_activo
  )
}

// El PNG solo se genera para productos disponibles y con precio publicado.
export function puedeGenerarImagen(producto) {
  return !!producto?.disponible && precioNumerico(producto) != null
}

// Copy del aviso cuando NO se puede generar (null si sí se puede).
export function mensajeNoGenerable(producto) {
  if (puedeGenerarImagen(producto)) return null
  if (!producto?.disponible) {
    return 'Este producto no está disponible para despacho, así que no se puede generar la imagen.'
  }
  return 'Este producto todavía no tiene precio publicado, así que no se puede generar la imagen.'
}

/* ---------------- descuento ---------------- */

// `descuento_activo.tipo` es 'porcentaje' o 'monto' (ver calcularDescuentoUSD en
// descuentos.controller.js): imprimir "%" para un monto fijo mentiría.
export function formatearDescuento(descuento) {
  if (!descuento) return ''
  return descuento.tipo === 'porcentaje' ? `-${descuento.valor}%` : `-${fmtUsd(descuento.valor)}`
}

// 54 px para textos cortos (-25%), 38 px para los largos (-$12.50)
export function tamanoTextoDescuento(texto) {
  return String(texto || '').length > 5 ? 38 : 54
}

/* ---------------- checks y filas ---------------- */

// "Comercializado por Drogueria Carrisan" va SIN acento (verbatim del dueño).
export function armarChecks({ disponible, tieneDescuento: conDescuento } = {}) {
  const checks = []
  if (disponible) checks.push('Disponible para despacho')
  checks.push('Comercializado por Drogueria Carrisan')
  if (conDescuento) checks.push('Descuento B2B aplicado')
  return checks
}

const DEFS_FILAS = [
  ['Línea', (p) => p?.linea],
  ['Forma', (p) => p?.forma],
  ['Molécula', (p) => p?.molecula],
  ['Presentación', (p) => p?.presentacion],
  ['Laboratorio', (p) => p?.laboratorio],
  ['SKU', (p) => p?.sku],
  ['Registro sanitario', (_p, d) => d?.registro_sanitario],
]

// Filas del panel, en orden, omitiendo las vacías.
// "Registro sanitario" sale de `detalles`; el país de origen NO se incluye a propósito.
export function armarFilas(producto, detalles) {
  return DEFS_FILAS.map(([label, obtener]) => ({
    label,
    valor: String(obtener(producto, detalles) ?? '').trim(),
  })).filter((f) => f.valor)
}

/* ---------------- autofit del bloque de filas ---------------- */

// Alto de una fila con 1..2 líneas: padding + line-height + padding + borde inferior.
export function altoFila(lineas = 1, k = 1) {
  return (FILA_PAD + FILA_LH * lineas + FILA_PAD) * k + 1
}

// La última fila va sin borde ni padding inferior.
export function altoUltimaFila(lineas = 1, k = 1) {
  return (FILA_PAD + FILA_LH * lineas) * k
}

export function altoBloqueFilas(lineasPorFila = [], k = 1) {
  const ultimo = lineasPorFila.length - 1
  return lineasPorFila.reduce(
    (acc, lineas, i) => acc + (i === ultimo ? altoUltimaFila(lineas, k) : altoFila(lineas, k)),
    0
  )
}

// Cuánto hay que encoger las filas para que entren. Nunca por debajo de `min`
// (el `ctx.clip()` del panel es la red de seguridad final).
export function escalaAutofit(altoNatural, altoDisponible, min = 0.85) {
  if (!(altoNatural > 0)) return 1
  return Math.min(1, Math.max(min, altoDisponible / altoNatural))
}

// Alto real disponible para las filas (el resto del panel va a checks + separador).
export function altoFilasDisponible(cantidadChecks) {
  return CONTENIDO_ALTO - ALTO_CHECKS * cantidadChecks - ALTO_SEPARADOR
}

/* ---------------- autofit de la fila de precio ---------------- */

// La pill "Ahorras" va CENTRADA en la franja y NO se encoge; el precio original tachado
// se dibuja a la derecha del precio de venta. En precios altos el tachado se montaba
// sobre la pill (medido con las fuentes reales: choca desde ~$60 al 15% y ~$40 al 20%).
// Devuelve el factor k con el que se escalan la fuente del precio Y del original para
// que la fila termine antes del borde izquierdo de la pill (con `margen` de aire, que
// absorbe el redondeo a px entero de las fuentes). Nunca por debajo de `min` (0.7 cubre
// el catálogo real: precio máximo activo ~$206).
export function escalaFilaPrecio(
  anchoPrecio,
  anchoOriginal,
  anchoPill,
  { x = PAD, gap = PIE_PRECIO_GAP, margen = PIE_PRECIO_MARGEN, ancho = W, min = PIE_PRECIO_KP_MIN } = {}
) {
  const suma = anchoPrecio + anchoOriginal
  if (!(suma > 0)) return 1
  const disponible = (ancho - anchoPill) / 2 - x - gap - margen
  return Math.min(1, Math.max(min, disponible / suma))
}

/* ---------------- leyenda del QR ---------------- */

// Leyenda del QR: 3 líneas a la IZQUIERDA del código, con el bloque (de tinta capital,
// igual criterio que el resto del lienzo: baseline a 0.78 del renglón) centrado contra la
// tarjeta. `xFin` es el borde derecho donde alinear el texto; `baselines` el Y de cada línea.
export function posicionLeyendaQR({
  x = QR_X,
  y = QR_Y,
  tam = QR_TAM,
  lineas = QR_LEYENDA,
  lh = QR_LEYENDA_LH,
  gap = QR_LEYENDA_GAP,
} = {}) {
  const alto = lineas.length * lh
  const top = y + (tam - alto) / 2
  return {
    xFin: x - gap,
    baselines: lineas.map((_, i) => top + lh * (i + 0.78)),
  }
}

/* ---------------- tira de contacto ---------------- */

// Tercero sin enlaces: el dueño no dio URLs de Instagram/Facebook, así que la tira
// solo muestra el texto (la plataforma las enlazará cuando `url` se complete).
// Los datos salen de la fuente única de contacto; el correo NO va en la imagen.
export function armarTiraContacto(contacto = CONTACTO) {
  return [
    { icono: 'whatsapp', texto: contacto.whatsapp?.texto },
    { icono: 'instagram', texto: contacto.instagram?.texto },
    { icono: 'facebook', texto: contacto.facebook?.texto },
  ].filter((t) => t.texto)
}

// Centra los ítems y devuelve la posición de cada ícono y de su texto.
export function medirTiraContacto(
  anchos = [],
  { ancho = W, icono = TIRA_ICONO, sep = TIRA_SEP, gap = TIRA_GAP } = {}
) {
  const total =
    anchos.reduce((acc, a) => acc + icono + sep + a, 0) + Math.max(0, anchos.length - 1) * gap
  let x = (ancho - total) / 2
  const items = anchos.map((a) => {
    const item = { x, xTexto: x + icono + sep, anchoTexto: a }
    x += icono + sep + a + gap
    return item
  })
  return { total, inicio: (ancho - total) / 2, items }
}
