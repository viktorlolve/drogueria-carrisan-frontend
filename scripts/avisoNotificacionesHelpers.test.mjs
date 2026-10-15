// Tests de la lógica pura del aviso de notificaciones (sin DOM, sin React).
// Correr: node --test scripts/avisoNotificacionesHelpers.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CLAVE_AVISO,
  VALOR_NO_MOSTRAR,
  esDecisionNoMostrar,
  debeMostrarAviso,
} from '../src/components/avisoNotificacionesHelpers.js'

// Caso base: navegador que soporta push, sin suscripción, permiso sin decidir,
// y el usuario todavía no tocó "Ahora no" en este dispositivo.
const BASE = { soportado: true, suscrito: false, permiso: 'default', dijoAhoraNo: false }

test('muestra el aviso cuando el navegador soporta push y no está activado', () => {
  assert.equal(debeMostrarAviso(BASE), true)
})

test('NO muestra el aviso si el navegador no soporta push', () => {
  assert.equal(debeMostrarAviso({ ...BASE, soportado: false }), false)
})

test('NO muestra el aviso si ya está activado', () => {
  assert.equal(debeMostrarAviso({ ...BASE, suscrito: true }), false)
})

test('NO muestra el aviso mientras la detección sigue en curso', () => {
  assert.equal(debeMostrarAviso({ ...BASE, suscrito: null }), false)
  assert.equal(debeMostrarAviso({ ...BASE, permiso: null }), false)
})

test('NO muestra el aviso si el permiso está bloqueado por el navegador', () => {
  assert.equal(debeMostrarAviso({ ...BASE, permiso: 'denied' }), false)
})

test('NO muestra el aviso si el usuario ya eligió "Ahora no" en este dispositivo', () => {
  assert.equal(debeMostrarAviso({ ...BASE, dijoAhoraNo: true }), false)
})

test('SÍ muestra el aviso si el permiso ya fue concedido pero falta la suscripción', () => {
  // El navegador ya lo permite: activar() solo rehace la suscripción, sin prompt.
  assert.equal(debeMostrarAviso({ ...BASE, permiso: 'granted' }), true)
})

test('esDecisionNoMostrar reconoce el valor guardado y tolera basura/ausencia', () => {
  assert.equal(esDecisionNoMostrar(VALOR_NO_MOSTRAR), true)
  assert.equal(esDecisionNoMostrar(null), false)
  assert.equal(esDecisionNoMostrar(undefined), false)
  assert.equal(esDecisionNoMostrar(''), false)
  assert.equal(esDecisionNoMostrar('cualquier-cosa'), false)
})

// El nombre de la clave es un contrato real: si cambia, los usuarios que ya
// eligieron "Ahora no" verían el aviso otra vez.
test('la clave de almacenamiento es la acordada', () => {
  assert.equal(CLAVE_AVISO, 'carrisan_aviso_notificaciones')
  assert.equal(VALOR_NO_MOSTRAR, 'no_mostrar')
})
