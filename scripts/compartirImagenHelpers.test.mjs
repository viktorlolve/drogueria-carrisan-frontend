// Tests de la lógica pura de la imagen "Compartir como imagen" (sin DOM, sin canvas).
// Correr: node --test scripts/compartirImagenHelpers.test.mjs
//
// La lógica de dibujo (ctx.fillText, gradientes...) NO se testea acá: su fuente de
// verdad es el canvas renderizado (ver §7 del diseño). Acá se fija lo que el diseño
// decide en texto: qué se puede generar, qué checks/filas van, cómo se formatea el
// descuento y cómo se calcula el autofit y el centrado de la tira de contacto.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  precioNumerico,
  tieneDescuento,
  puedeGenerarImagen,
  mensajeNoGenerable,
  armarChecks,
  armarFilas,
  formatearDescuento,
  tamanoTextoDescuento,
  altoFila,
  altoUltimaFila,
  altoBloqueFilas,
  escalaAutofit,
  escalaFilaPrecio,
  armarTiraContacto,
  medirTiraContacto,
  CONTENIDO_ALTO,
  ALTO_CHECKS,
  ALTO_SEPARADOR,
} from '../src/components/compartirImagenHelpers.js'

const PRODUCTO = {
  id: 42,
  disponible: true,
  precio_usd: 12.5,
  precio_original_usd: 15,
  descuento_activo: { tipo: 'porcentaje', valor: 16 },
  nombre_comercial: 'ARUDIL 15 MG X 10 TABLETAS RECUBIERTAS',
  linea: 'Línea Farmacia',
  forma: 'TABLETAS RECUBIERTAS',
  molecula: 'Metformina',
  presentacion: 'X 10 TABLETAS RECUBIERTAS',
  laboratorio: 'LABORATORIOS GENFAR',
  sku: 'ME41487/2',
}

/* ---------------- gating ---------------- */

test('puedeGenerarImagen: disponible y con precio > 0', () => {
  assert.equal(puedeGenerarImagen(PRODUCTO), true)
})

test('puedeGenerarImagen: falsa si no está disponible', () => {
  assert.equal(puedeGenerarImagen({ ...PRODUCTO, disponible: false }), false)
})

test('puedeGenerarImagen: falsa si el precio es null, 0 o vacío', () => {
  assert.equal(puedeGenerarImagen({ ...PRODUCTO, precio_usd: null }), false)
  assert.equal(puedeGenerarImagen({ ...PRODUCTO, precio_usd: 0 }), false)
  assert.equal(puedeGenerarImagen({ ...PRODUCTO, precio_usd: '' }), false)
})

test('puedeGenerarImagen: falsa sin producto', () => {
  assert.equal(puedeGenerarImagen(null), false)
  assert.equal(puedeGenerarImagen(undefined), false)
})

test('precioNumerico: normaliza a número o null', () => {
  assert.equal(precioNumerico({ precio_usd: '12.50' }), 12.5)
  assert.equal(precioNumerico({ precio_usd: -3 }), null)
  assert.equal(precioNumerico({}), null)
})

test('mensajeNoGenerable: distingue no disponible de sin precio', () => {
  assert.match(mensajeNoGenerable({ ...PRODUCTO, disponible: false }), /no está disponible para despacho/)
  assert.match(mensajeNoGenerable({ ...PRODUCTO, precio_usd: null }), /todavía no tiene precio publicado/)
})

test('mensajeNoGenerable: null cuando sí se puede generar', () => {
  assert.equal(mensajeNoGenerable(PRODUCTO), null)
})

/* ---------------- descuento ---------------- */

test('tieneDescuento: exige precio, precio original y descuento_activo', () => {
  assert.equal(tieneDescuento(PRODUCTO), true)
  assert.equal(tieneDescuento({ ...PRODUCTO, descuento_activo: null }), false)
  assert.equal(tieneDescuento({ ...PRODUCTO, precio_original_usd: null }), false)
  assert.equal(tieneDescuento({ ...PRODUCTO, precio_usd: null }), false)
})

test('formatearDescuento: porcentaje y monto fijo (no miente el símbolo)', () => {
  assert.equal(formatearDescuento({ tipo: 'porcentaje', valor: 25 }), '-25%')
  assert.equal(formatearDescuento({ tipo: 'monto', valor: 5 }), '-$5.00')
  assert.equal(formatearDescuento(null), '')
})

test('tamanoTextoDescuento: 54 px hasta 5 caracteres, 38 px si es más largo', () => {
  assert.equal(tamanoTextoDescuento('-25%'), 54)      // 4 caracteres
  assert.equal(tamanoTextoDescuento('-100%'), 54)     // 5 -> borde
  assert.equal(tamanoTextoDescuento('-$9.00'), 38)    // 6 -> no entra
  assert.equal(tamanoTextoDescuento('-$12.50'), 38)   // 7
})

/* ---------------- checks y filas del panel ---------------- */

test('armarChecks: sin descuento son 2 (disponible + comercializado)', () => {
  assert.deepEqual(armarChecks({ disponible: true, tieneDescuento: false }), [
    'Disponible para despacho',
    'Comercializado por Drogueria Carrisan',
  ])
})

test('armarChecks: con descuento agrega el tercero al final', () => {
  assert.deepEqual(armarChecks({ disponible: true, tieneDescuento: true }), [
    'Disponible para despacho',
    'Comercializado por Drogueria Carrisan',
    'Descuento B2B aplicado',
  ])
})

test('armarFilas: las 7 filas en orden', () => {
  const filas = armarFilas(PRODUCTO, { registro_sanitario: 'E.F.G.44.357' })
  assert.deepEqual(filas.map((f) => f.label), [
    'Línea', 'Forma', 'Molécula', 'Presentación', 'Laboratorio', 'SKU', 'Registro sanitario',
  ])
  assert.equal(filas[0].valor, 'Línea Farmacia')
  assert.equal(filas[6].valor, 'E.F.G.44.357')
})

test('armarFilas: omite las vacías y sin detalles quedan 6', () => {
  const sinDetalles = armarFilas(PRODUCTO, null)
  assert.equal(sinDetalles.length, 6)
  assert.ok(!sinDetalles.some((f) => f.label === 'Registro sanitario'))

  const conHuecos = armarFilas({ ...PRODUCTO, presentacion: null, molecula: '  ' }, null)
  assert.deepEqual(conHuecos.map((f) => f.label), ['Línea', 'Forma', 'Laboratorio', 'SKU'])
})

test('armarFilas: no inventa país de origen', () => {
  const filas = armarFilas({ ...PRODUCTO, pais_origen: 'Venezuela' }, null)
  assert.ok(!filas.some((f) => /origen/i.test(f.label)))
})

/* ---------------- autofit ---------------- */

test('altoFila: 42 px con 1 línea y 67 px con 2 (incluye borde inferior)', () => {
  assert.equal(altoFila(1), 42)
  assert.equal(altoFila(2), 67)
})

test('altoUltimaFila: sin borde ni padding inferior', () => {
  assert.equal(altoUltimaFila(1), 33)
  assert.equal(altoUltimaFila(2), 58)
})

test('altoBloqueFilas: suma la última sin borde', () => {
  assert.equal(altoBloqueFilas([]), 0)
  assert.equal(altoBloqueFilas([1]), 33)
  assert.equal(altoBloqueFilas([1, 1]), 42 + 33)
  assert.equal(altoBloqueFilas([1, 2]), 42 + 58)
  assert.equal(altoBloqueFilas([1, 1, 1]), 42 + 42 + 33)
})

test('escalaAutofit: 1 si entra, proporcional si no, nunca por debajo de 0.85', () => {
  assert.equal(escalaAutofit(200, 360), 1)
  assert.equal(escalaAutofit(400, 360), 0.9)
  assert.equal(escalaAutofit(1000, 360), 0.85)
  assert.equal(escalaAutofit(0, 360), 1)
})

test('el disponible para filas es el alto del panel menos checks y separador', () => {
  const disponible = CONTENIDO_ALTO - ALTO_CHECKS * 3 - ALTO_SEPARADOR
  assert.equal(disponible, 496 - 108 - 28)
})

/* ---------------- autofit de la fila de precio ---------------- */

test('escalaFilaPrecio: 1 cuando el precio + original entran antes de la pill', () => {
  // pill centrada: left = (1080 - 220) / 2 = 430; disponible = 430 - 72 - 26 - 6 = 326
  assert.equal(escalaFilaPrecio(150, 90, 220), 1)
})

test('escalaFilaPrecio: proporcional cuando el original se montaría sobre la pill', () => {
  // left = (1080 - 276) / 2 = 402; disponible = 402 - 72 - 26 - 6 = 298; suma = 377
  const k = escalaFilaPrecio(272, 105, 276)
  assert.ok(Math.abs(k - 298 / 377) < 1e-9)
  assert.ok(k < 1 && k > 0.75)
})

test('escalaFilaPrecio: nunca por debajo de 0.7 (cubre el catálogo real)', () => {
  assert.equal(escalaFilaPrecio(3000, 1500, 300), 0.7)
})

test('escalaFilaPrecio: 1 sin anchos (producto sin descuento/pill)', () => {
  assert.equal(escalaFilaPrecio(0, 0, 0), 1)
})

test('escalaFilaPrecio: respeta x, gap y margen personalizados', () => {
  // left = (1000 - 200) / 2 = 400; disponible = 400 - 50 - 10 - 6 = 334; suma = 400
  const k = escalaFilaPrecio(300, 100, 200, { ancho: 1000, x: 50, gap: 10 })
  assert.ok(Math.abs(k - 334 / 400) < 1e-9)
})

/* ---------------- tira de contacto ---------------- */

test('armarTiraContacto: WhatsApp, Instagram y Facebook en orden', () => {
  const tira = armarTiraContacto()
  assert.deepEqual(tira.map((t) => t.icono), ['whatsapp', 'instagram', 'facebook'])
  assert.equal(tira[0].texto, '+58 414 5949532')
  assert.equal(tira[1].texto, '@dcarrisan')
  assert.equal(tira[2].texto, 'Drogueria Carrisan')
})

test('medirTiraContacto: centra y separa con gap 44', () => {
  const anchos = [100, 80, 120]
  const { total, inicio, items } = medirTiraContacto(anchos, { ancho: 1080 })
  // total = Σ(30 + 12 + anchoTexto) + 2·44
  assert.equal(total, 3 * 30 + 3 * 12 + 300 + 2 * 44)
  assert.equal(inicio, (1080 - total) / 2)
  assert.equal(items.length, 3)
  // cada ítem: ícono 30 + 12 de separación + texto
  assert.equal(items[1].xTexto, items[0].xTexto + anchos[0] + 30 + 12 + 44)
})
