// Tests de las funciones puras del nav (sin DOM, sin React).
// Correr: node --test scripts/navUnificadoHelpers.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizarNav,
  todosLosItems,
  grupoDeItem,
  gruposAbiertosIniciales,
} from '../src/components/paginas-principales/navUnificadoHelpers.js'

const MODELO = {
  grupos: [
    { id: 'actividad', titulo: 'Mi actividad', items: [{ id: 'grocery', to: '/orders' }] },
    {
      id: 'solicitudes',
      titulo: 'Solicitudes',
      items: [{ id: 'cotizaciones', to: '/mis-solicitudes/cotizaciones' }],
    },
  ],
  pie: { id: 'ayuda', titulo: 'Ayuda', items: [{ id: 'faq', to: '/ayuda' }] },
}

test('normalizarNav convierte el array legacy en { grupos, pie }', () => {
  const r = normalizarNav([{ id: 'x', texto: 'X', items: [{ id: 'a', to: '/a' }] }])
  assert.equal(r.grupos.length, 1)
  assert.equal(r.grupos[0].titulo, 'X')
  assert.equal(r.pie, null)
})

test('normalizarNav es idempotente sobre el modelo ya normalizado', () => {
  assert.deepEqual(normalizarNav(MODELO), MODELO)
})

test('normalizarNav tolera null/undefined', () => {
  assert.deepEqual(normalizarNav(undefined), { grupos: [], pie: null })
})

test('todosLosItems incluye el pie y cada item trae grupoId', () => {
  const items = todosLosItems(MODELO)
  assert.deepEqual(items.map((i) => i.id), ['grocery', 'cotizaciones', 'faq'])
  assert.equal(items[0].grupoId, 'actividad')
  assert.equal(items[2].grupoId, 'ayuda')
})

test('grupoDeItem encuentra el grupo del item activo', () => {
  assert.equal(grupoDeItem(MODELO, 'cotizaciones'), 'solicitudes')
  assert.equal(grupoDeItem(MODELO, 'faq'), 'ayuda')
  assert.equal(grupoDeItem(MODELO, 'no-existe'), null)
})

test('gruposAbiertosIniciales abre solo el grupo del activo', () => {
  assert.deepEqual([...gruposAbiertosIniciales(MODELO, 'cotizaciones')], ['solicitudes'])
  assert.deepEqual([...gruposAbiertosIniciales(MODELO, undefined)], [])
})