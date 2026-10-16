// scripts/verificar-nav-admin.mjs
// Guard: cada `to` de NAV_ADMIN debe tener su <Route path> en Admin.jsx.
// Motivo: scripts/verificar-nav.mjs cubre SOLO NavUnificado.js + App.jsx; NO lee
// NavAdmin.js ni las rutas anidadas de Admin.jsx, y Admin.jsx no tiene catch-all
// <Route path="*">. Un `to` mal escrito en NAV_ADMIN volvería a renderizar
// página en blanco sin error en consola (el mismo tipo de bug silencioso).
//
// Corre con: node scripts/verificar-nav-admin.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const nav = readFileSync(resolve(__dirname, '../src/components/paginas-principales/NavAdmin.js'), 'utf8')
const admin = readFileSync(resolve(__dirname, '../src/pages/Admin.jsx'), 'utf8')

// `to: '/admin'` (dashboard) y `to: '/admin/xxx'`.
const tos = [...nav.matchAll(/to:\s*'(\/admin[^']*)'/g)].map((m) => m[1])

// Rutas declaradas en el <Routes> anidado de Admin.jsx (paths relativos).
const rutas = new Set(
  [...admin.matchAll(/<Route\s+[^>]*?path="([^"]*)"/g)].map((m) => m[1].replace(/^\/+/, '').split('/')[0]),
)
// El dashboard se resuelve con la ruta `index`, que no lleva `path`.
const tieneIndex = /<Route\s+[^>]*?\bindex\b/.test(admin)
const tieneCatchAll = rutas.has('*')

const faltantes = tos.filter((to) => {
  const seg = to.replace(/^\/admin\/?/, '').split('/')[0]
  if (tieneCatchAll) return false
  if (seg === '') return !tieneIndex && !rutas.has('')
  return !rutas.has(seg)
})

if (faltantes.length === 0) {
  console.log(`OK — ${tos.length} items de NavAdmin resuelven a rutas de Admin.jsx`)
  process.exit(0)
}
console.error('FALTAN rutas para:', faltantes)
process.exit(1)
