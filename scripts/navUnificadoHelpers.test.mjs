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

// ---------------------------------------------------------------
// Regresión del bug real (2026-10-05): NAV_ADMIN es un array cuyos
// grupos NO tenían `id`. Todos quedaban con id undefined, el Set de
// grupos abiertos tenía una sola clave y por eso TODOS los grupos se
// veían abiertos y un click los cerraba todos.
// ---------------------------------------------------------------

const ADMIN_SIN_ID = [
  { titulo: 'General', items: [{ id: 'dashboard', to: '/admin' }] },
  { titulo: 'Ventas', items: [{ id: 'ordenes', to: '/admin/ordenes' }] },
  { titulo: 'Cobranza', items: [{ id: 'pagos', to: '/admin/pagos' }] },
  { titulo: 'Cuenta', pie: true, items: [{ id: 'usuarios', to: '/admin/usuarios' }] },
]

test('normalizarNav deriva un id por grupo cuando el grupo no trae id', () => {
  const r = normalizarNav(ADMIN_SIN_ID)
  const ids = r.grupos.map((g) => g.id)
  assert.equal(ids.length, 3)
  assert.ok(ids.every(Boolean), 'ningun grupo puede quedar sin id')
  assert.equal(new Set(ids).size, ids.length, 'los ids tienen que ser distintos entre grupos')
})

test('el grupo con pie:true del array se mueve a pie', () => {
  const r = normalizarNav(ADMIN_SIN_ID)
  assert.equal(r.pie.titulo, 'Cuenta')
  assert.equal(r.pie.items[0].id, 'usuarios')
  assert.ok(!r.grupos.some((g) => g.titulo === 'Cuenta'))
})

test('normalizarNav conserva el icono del grupo y de los items', () => {
  const r = normalizarNav([
    { titulo: 'Ventas', icono: 'ShoppingCart', items: [{ id: 'ordenes', icono: 'Tag' }] },
  ])
  assert.equal(r.grupos[0].icono, 'ShoppingCart')
  assert.equal(r.grupos[0].items[0].icono, 'Tag')
})

test('grupoDeItem y gruposAbiertosIniciales funcionan con grupos sin id', () => {
  const modelo = normalizarNav(ADMIN_SIN_ID)
  assert.equal(grupoDeItem(modelo, 'pagos'), modelo.grupos[2].id)
  // El bug: antes el item activo daba grupoId undefined y ningun grupo
  // abria, y al primer click se abrian todos (misma clave undefined).
  const abiertos = gruposAbiertosIniciales(modelo, 'pagos')
  assert.equal(abiertos.size, 1)
  assert.equal([...abiertos][0], modelo.grupos[2].id)
})

test('el id derivado es estable entre llamadas', () => {
  const a = normalizarNav(ADMIN_SIN_ID).grupos.map((g) => g.id)
  const b = normalizarNav(ADMIN_SIN_ID).grupos.map((g) => g.id)
  assert.deepEqual(a, b)
})