// Tests de la lógica pura del AdRotativo (sin DOM, sin React).
// Correr: node --test scripts/adRotativoArtes.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  tieneArte,
  arteDe,
  adsVisibles,
  indiceSeguro,
  debeRotar,
} from '../src/components/adRotativoArtes.js'

const DESKTOP = 'https://x/ads/desktop.jpg'
const MOVIL = 'https://x/ads/movil.jpg'

// Campaña completa: tiene los dos artes.
const COMPLETA = { id: 'completa', imagenDesktop: DESKTOP, imagenMovil: MOVIL }
// Solo arte panorámico (4:1) — no debe aparecer en móvil recortada.
const SOLO_DESKTOP = { id: 'solo-desktop', imagenDesktop: DESKTOP, imagenMovil: '' }
// Solo arte móvil (16:9) — no debe aparecer en desktop.
const SOLO_MOVIL = { id: 'solo-movil', imagenDesktop: '', imagenMovil: MOVIL }
// Maqueta sin arte: el componente muestra el placeholder en ambos.
const PLACEHOLDER = { id: 'maqueta', titulo: 'Próximamente' }

test('tieneArte trata vacío, espacios, null y undefined como "sin arte"', () => {
  assert.equal(tieneArte(DESKTOP), true)
  assert.equal(tieneArte(''), false)
  assert.equal(tieneArte('   '), false)
  assert.equal(tieneArte(null), false)
  assert.equal(tieneArte(undefined), false)
})

test('arteDe devuelve el arte del dispositivo actual', () => {
  assert.equal(arteDe(COMPLETA, false), DESKTOP)
  assert.equal(arteDe(COMPLETA, true), MOVIL)
})

test('arteDe NO cae al arte del otro dispositivo (no recorta una 4:1 en móvil)', () => {
  assert.equal(arteDe(SOLO_DESKTOP, true), null)
  assert.equal(arteDe(SOLO_MOVIL, false), null)
})

test('arteDe devuelve null cuando la ad no tiene ningún arte', () => {
  assert.equal(arteDe(PLACEHOLDER, true), null)
  assert.equal(arteDe(PLACEHOLDER, false), null)
})

test('arteDe tolera ad nula o basura', () => {
  assert.equal(arteDe(null, true), null)
  assert.equal(arteDe(undefined, false), null)
  assert.equal(arteDe({ id: 'x', imagenMovil: '  ' }, true), null)
})

test('arteDe devuelve la URL sin espacios accidentales', () => {
  assert.equal(arteDe({ imagenMovil: '  https://x/ads/m.jpg  ' }, true), 'https://x/ads/m.jpg')
})

test('adsVisibles en móvil: las que tienen arte móvil + las de maqueta', () => {
  const lista = adsVisibles([COMPLETA, SOLO_DESKTOP, SOLO_MOVIL, PLACEHOLDER], true)
  assert.deepEqual(lista.map((a) => a.id), ['completa', 'solo-movil', 'maqueta'])
})

test('adsVisibles en desktop: las que tienen arte desktop + las de maqueta', () => {
  const lista = adsVisibles([COMPLETA, SOLO_DESKTOP, SOLO_MOVIL, PLACEHOLDER], false)
  assert.deepEqual(lista.map((a) => a.id), ['completa', 'solo-desktop', 'maqueta'])
})

test('adsVisibles tolera listas nulas y entradas nulas sin romper', () => {
  assert.deepEqual(adsVisibles(null, true), [])
  assert.deepEqual(adsVisibles(undefined, false), [])
  assert.deepEqual(adsVisibles([null, COMPLETA, undefined], true).map((a) => a.id), ['completa'])
})

test('adsVisibles no muta el array original', () => {
  const original = [COMPLETA, SOLO_DESKTOP]
  adsVisibles(original, true)
  assert.equal(original.length, 2)
})

test('indiceSeguro evita índices fuera de rango al cambiar de dispositivo', () => {
  assert.equal(indiceSeguro(0, 3), 0)
  assert.equal(indiceSeguro(2, 3), 2)
  assert.equal(indiceSeguro(5, 3), 2) // el índice 5 ya no existe con 3 ads
  assert.equal(indiceSeguro(4, 0), 0) // sin ads no hay índice válido
  assert.equal(indiceSeguro(-1, 3), 0)
})

test('debeRotar: solo con 2+ ads, sin pausa y sin reducción de movimiento', () => {
  assert.equal(debeRotar({ cantidad: 3, pausado: false, reducido: false }), true)
  assert.equal(debeRotar({ cantidad: 1, pausado: false, reducido: false }), false)
  assert.equal(debeRotar({ cantidad: 0, pausado: false, reducido: false }), false)
  assert.equal(debeRotar({ cantidad: 3, pausado: true, reducido: false }), false)
  assert.equal(debeRotar({ cantidad: 3, pausado: false, reducido: true }), false)
})
