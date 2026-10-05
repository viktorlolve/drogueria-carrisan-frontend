// Tests de `getCopyEtiqueta` (función pura, sin DOM ni React).
// Correr: node --test scripts/copyEtiqueta.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getCopyEtiqueta } from '../src/config/copyEtiqueta.js'

test('usa el copy exacto de la etiqueta de precio del cliente', () => {
  assert.equal(getCopyEtiqueta({ etiqueta: 'contado' }).titulo, 'Precio contado')
  assert.equal(getCopyEtiqueta({ etiqueta: 'honorifico' }).titulo, 'Precio comunidad')
  assert.equal(getCopyEtiqueta({ etiqueta: 'medico' }).titulo, 'Precio profesional')
})

test('la etiqueta manda sobre el tipo de usuario', () => {
  const r = getCopyEtiqueta({ etiqueta: 'credito', tipo_usuario: 'profesional' })
  assert.equal(r.titulo, 'Precio crédito')
})

test('cae al tipo de usuario si la etiqueta no está en el mapa', () => {
  const r = getCopyEtiqueta({ etiqueta: 'etiqueta_inventada', tipo_usuario: 'institucional' })
  assert.equal(r.titulo, 'Precio institucional')
})

test('ignora mayúsculas y espacios en la etiqueta', () => {
  const r = getCopyEtiqueta({ etiqueta: '  Profesional  ' })
  assert.equal(r.titulo, 'Precio profesional')
})

test('con sesión pero sin etiqueta ni tipo cae en el copy genérico', () => {
  const r = getCopyEtiqueta({ nombre: 'Dueño', es_admin: true })
  assert.equal(r.titulo, 'Precio de tu cuenta')
})

test('sin sesión usa el copy de visitante', () => {
  assert.equal(getCopyEtiqueta(null).titulo, 'Precio de droguería')
  assert.equal(getCopyEtiqueta(undefined).titulo, 'Precio de droguería')
})

test('siempre devuelve titulo y detalle (nunca undefined)', () => {
  for (const cliente of [null, {}, { etiqueta: '' }, { etiqueta: null, tipo_usuario: null }]) {
    const r = getCopyEtiqueta(cliente)
    assert.equal(typeof r.titulo, 'string')
    assert.ok(r.titulo.length > 0)
    assert.equal(typeof r.detalle, 'string')
    assert.ok(r.detalle.length > 0)
  }
})