// Tests de la lógica pura de los logos de laboratorio (sin DOM, sin React).
// Correr: node --test scripts/laboratoriosLogos.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { logoMiniatura, logoParaLaboratorio, nombreVisible } from '../src/config/laboratoriosLogos.js'

const OBJETO = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'
const RENDER = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/render/image/public/crsnimages'

test('logoMiniatura pasa el logo original a la transformación de Supabase', () => {
  assert.equal(
    logoMiniatura(`${OBJETO}/logos/megalabs.png`),
    `${RENDER}/logos/megalabs.png?width=320&quality=80&resize=contain`
  )
})

test('logoMiniatura respeta el ancho pedido y los nombres con %20', () => {
  assert.equal(
    logoMiniatura(`${OBJETO}/logos/la%20sante.jpg`, 200),
    `${RENDER}/logos/la%20sante.jpg?width=200&quality=80&resize=contain`
  )
})

test('logoMiniatura deja intactas las URLs que no son del bucket', () => {
  const externa = 'https://otro-cdn.com/logos/x.png'
  assert.equal(logoMiniatura(externa), externa)
})

test('logoMiniatura tolera null / undefined / vacío', () => {
  assert.equal(logoMiniatura(null), null)
  assert.equal(logoMiniatura(undefined), undefined)
  assert.equal(logoMiniatura(''), '')
})

test('logoParaLaboratorio y nombreVisible siguen funcionando para las tarjetas', () => {
  const match = logoParaLaboratorio('LABORATORIOS LETI S.A.V.')
  assert.ok(match)
  assert.ok(match.logo.startsWith(OBJETO))
  assert.equal(nombreVisible('LABORATORIOS LETI S.A.V.'), 'LETI')
})

test('nombreVisible limpia el nombre cuando el laboratorio no tiene logo', () => {
  assert.equal(nombreVisible('LABORATORIO LA SANTE C.A.'), 'LA SANTE')
})
