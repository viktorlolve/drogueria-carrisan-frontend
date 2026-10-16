// Regresión de los enlaces del panel staff.
//
// Bug (2026-10-16): los usuarios con UN solo departamento (rol restringido:
// vendedor, contabilidad, almacenista, despachador) caen en la rama
// "jornada enfocada" de StaffDashboard, que construía la URL a mano:
//     to={`/staff/${deptoFoco.id}/${modulo.id}`}   →  /staff/comercial/clientes
// Esa ruta NO existe (la real es item.to → /staff/clientes) y App.jsx no tiene
// <Route path="*">, así que React Router renderiza null: PÁGINA EN BLANCO sin
// ningún error en consola. Los roles con 2+ departamentos (panorámica) usan
// m.to y por eso al dueño nunca le pasó.
//
// Este guard exige que todo enlace interno del staff apunte a una ruta real.
// Uso: node --test scripts/verificar-links-staff.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { DEPARTAMENTOS, MODULOS } from '../src/components/staff/NavStaff.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const leer = (rel) => readFileSync(join(raiz, rel), 'utf8')

// Rutas sintéticas de 2 segmentos interpolados: ninguna ruta staff se genera
// como /staff/<depto>/<modulo> (los módulos viven en item.to). El hub
// /staff/${depto.id} (1 segmento interpolado) SÍ es válido.
const RUTA_SINTETICA = /`\/staff\/\$\{[^}]+\}\/\$\{[^}]+\}`/

test('StaffDashboard no construye rutas sintéticas /staff/<depto>/<modulo>', () => {
  const src = leer('src/pages/staff/StaffDashboard.jsx')
  assert.ok(
    !RUTA_SINTETICA.test(src),
    'StaffDashboard.jsx arma una URL /staff/${depto}/${id}: esa ruta no existe y ' +
      'React Router (sin catch-all) deja la pantalla en blanco. Usa el `to` real ' +
      'del módulo (modulo.to / m.to).'
  )
  // El enlace de los módulos tiene que salir de la fuente única MODULOS.
  assert.match(src, /to=\{(m|modulo)\.to\}/, 'falta el enlace de módulos basado en m.to / modulo.to')
})

test('App.jsx sigue generando las rutas staff desde MODULOS (path={item.to})', () => {
  const app = leer('src/App.jsx')
  // Si las rutas dejan de generarse desde item.to, cualquier `to` del nav deja
  // de tener Route y React Router (sin catch-all) pinta una pantalla en blanco.
  assert.match(app, /path=\{item\.to\}/, 'App.jsx ya no genera las rutas staff desde item.to')
  // Rutas staff declaradas a mano: tienen que existir como path literal.
  const literales = new Set(
    [...app.matchAll(/\bpath="([^"]+)"/g)].map((m) => (m[1].startsWith('/') ? m[1] : `/${m[1]}`))
  )
  for (const p of [
    '/staff/login',
    '/staff/registro',
    '/staff/dashboard',
    '/staff/notificaciones',
    '/staff/clientes/:id',
  ]) {
    assert.ok(literales.has(p), `falta la ruta literal ${p}`)
  }
  // Hubs de departamento (los genera RutasStaff con `path={\`/staff/${depto.id}\`}`).
  assert.match(app, /path=\{`\/staff\/\$\{depto\.id\}`\}/, 'falta la generación de los hubs')
  for (const d of DEPARTAMENTOS) {
    assert.ok(MODULOS[d.id]?.flatMap((g) => g.items).length > 0, `el depto ${d.id} no tiene módulos`)
  }
})
