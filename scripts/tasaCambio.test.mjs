// Tests de la lógica pura de la tarjeta de tasa BCV del panel interno.
// Correr: node --test scripts/tasaCambio.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CLAVE_TASA_LOCAL,
  variacionTasa,
  esTasaVieja,
  leerUltimaTasaLocal,
  guardarUltimaTasaLocal,
} from '../src/utils/tasaCambio.js'

// --- variacionTasa -------------------------------------------------------

test('variacionTasa: sube la tasa → diferencia y porcentaje positivos', () => {
  const v = variacionTasa(40, 36)
  assert.equal(v.abs, 4)
  assert.equal(v.pct, 11.11)
})

test('variacionTasa: baja la tasa → diferencia y porcentaje negativos', () => {
  const v = variacionTasa(36, 40)
  assert.equal(v.abs, -4)
  assert.equal(v.pct, -10)
})

test('variacionTasa: tasa igual → sin variación', () => {
  const v = variacionTasa(36.5, 36.5)
  assert.equal(v.abs, 0)
  assert.equal(v.pct, 0)
})

test('variacionTasa: sin tasa anterior → null (no inventar variación)', () => {
  assert.equal(variacionTasa(40, null), null)
  assert.equal(variacionTasa(40, undefined), null)
})

test('variacionTasa: tasa anterior 0 o inválida → null (no dividir por cero)', () => {
  assert.equal(variacionTasa(40, 0), null)
  assert.equal(variacionTasa(40, 'no-es-numero'), null)
})

test('variacionTasa: tasa actual inválida → null', () => {
  assert.equal(variacionTasa(null, 36), null)
  assert.equal(variacionTasa(NaN, 36), null)
})

test('variacionTasa: acepta números en texto (vienen de la API como string)', () => {
  const v = variacionTasa('40', '36')
  assert.equal(v.abs, 4)
  assert.equal(v.pct, 11.11)
})

// --- esTasaVieja ---------------------------------------------------------

const AHORA = new Date('2026-10-28T12:00:00.000Z').getTime()

test('esTasaVieja: tasa de hace 1 hora → fresca', () => {
  const haceUnaHora = new Date(AHORA - 60 * 60 * 1000).toISOString()
  assert.equal(esTasaVieja(haceUnaHora, AHORA), false)
})

test('esTasaVieja: tasa de hace 25 horas → vieja (el cron corre a las 21:00)', () => {
  const hace25h = new Date(AHORA - 25 * 60 * 60 * 1000).toISOString()
  assert.equal(esTasaVieja(hace25h, AHORA), true)
})

test('esTasaVieja: respeta un umbral propio', () => {
  const hace2h = new Date(AHORA - 2 * 60 * 60 * 1000).toISOString()
  assert.equal(esTasaVieja(hace2h, AHORA, 1), true)
  assert.equal(esTasaVieja(hace2h, AHORA, 3), false)
})

test('esTasaVieja: sin fecha válida → se avisa (no se puede confirmar frescura)', () => {
  assert.equal(esTasaVieja(null, AHORA), true)
  assert.equal(esTasaVieja('fecha-basura', AHORA), true)
})

test('esTasaVieja: fecha futura (reloj desfasado) → fresca', () => {
  const enElFuturo = new Date(AHORA + 60 * 60 * 1000).toISOString()
  assert.equal(esTasaVieja(enElFuturo, AHORA), false)
})

// --- última tasa vista en este dispositivo ------------------------------

function instalarLocalStorage() {
  const datos = new Map()
  globalThis.localStorage = {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => { datos.set(k, String(v)) },
    removeItem: (k) => { datos.delete(k) },
  }
  return datos
}

test('la última tasa se guarda y se lee del dispositivo', () => {
  instalarLocalStorage()
  guardarUltimaTasaLocal({ usd_a_ves: 36.5, updated_at: '2026-10-27T21:00:00.000Z' })

  const leida = leerUltimaTasaLocal()
  assert.equal(leida.usd_a_ves, 36.5)
  assert.equal(leida.updated_at, '2026-10-27T21:00:00.000Z')
})

test('sin nada guardado → null', () => {
  instalarLocalStorage()
  assert.equal(leerUltimaTasaLocal(), null)
})

test('valor guardado corrupto → null (no romper el panel)', () => {
  const datos = instalarLocalStorage()
  datos.set(CLAVE_TASA_LOCAL, '{no es json')
  assert.equal(leerUltimaTasaLocal(), null)
})

test('guardado sin tasa numérica → null (fila inservible)', () => {
  instalarLocalStorage()
  guardarUltimaTasaLocal({ updated_at: '2026-10-27T21:00:00.000Z' })
  assert.equal(leerUltimaTasaLocal(), null)
})

test('guardarUltimaTasaLocal con datos inválidos no escribe nada', () => {
  instalarLocalStorage()
  assert.equal(guardarUltimaTasaLocal(null), false)
  assert.equal(leerUltimaTasaLocal(), null)
})
