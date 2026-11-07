// Tests de la regla de costo de envío (función pura, sin DOM).
// Correr: node --test scripts/costoEnvio.test.mjs
//
// Esta regla es la MISMA que aplica el backend al crear la orden
// (`costoEnvioParaCiudad` en src/controllers/ordenes.controller.js): si estos
// tests cambian, revisar también allá, o el total del carrito y el de la orden
// van a diferir.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  COSTO_ENVIO_POR_DEFECTO,
  costoEnvioParaCiudad,
} from '../src/utils/costoEnvio.js'

// Lo que devuelve GET /delivery-tarifas/activas (ciudad asc).
const TARIFAS = [
  { ciudad: 'Guacara', costo: 8 },
  { ciudad: 'Naguanagua', costo: 5 },
  { ciudad: 'Valencia', costo: 3 },
]

test('usa la tarifa exacta de la ciudad', () => {
  assert.equal(costoEnvioParaCiudad(TARIFAS, 'Valencia'), 3)
  assert.equal(costoEnvioParaCiudad(TARIFAS, 'Naguanagua'), 5)
})

test('ciudad sin tarifa cae en la primera (mismo comportamiento que el carrito)', () => {
  assert.equal(costoEnvioParaCiudad(TARIFAS, 'Cojedes'), 8)
  assert.equal(costoEnvioParaCiudad(TARIFAS, 'valencia'), 8, 'la comparación es exacta (case-sensitive)')
})

test('sin ciudad usa la primera tarifa', () => {
  assert.equal(costoEnvioParaCiudad(TARIFAS, undefined), 8)
  assert.equal(costoEnvioParaCiudad(TARIFAS, null), 8)
})

test('sin tarifas configuradas usa el costo por defecto', () => {
  assert.equal(costoEnvioParaCiudad([], 'Valencia'), COSTO_ENVIO_POR_DEFECTO)
  assert.equal(costoEnvioParaCiudad(null, 'Valencia'), COSTO_ENVIO_POR_DEFECTO)
})

test('una tarifa en 0 es gratis (no cae al por defecto)', () => {
  assert.equal(costoEnvioParaCiudad([{ ciudad: 'Gratis', costo: 0 }], 'Gratis'), 0)
})

test('normaliza a 2 decimales y nunca devuelve NaN', () => {
  assert.equal(costoEnvioParaCiudad([{ ciudad: 'X', costo: '3.456' }], 'X'), 3.46)
  assert.equal(costoEnvioParaCiudad([{ ciudad: 'X', costo: null }], 'X'), COSTO_ENVIO_POR_DEFECTO)
  assert.equal(costoEnvioParaCiudad([{ ciudad: 'X', costo: -5 }], 'X'), 0)
})

test('no rompe con tarifas malformadas', () => {
  assert.equal(costoEnvioParaCiudad([null, undefined], 'Valencia'), COSTO_ENVIO_POR_DEFECTO)
})
