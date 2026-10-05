// Regresion del nav de paginas principales: TODA ruta en NAV_UNIFICADO
// debe existir como <Route path> en App.jsx. Sin esto, un typo en un `to:`
// manda al cliente a un 404 silencioso (React Router no tiene catch-all
// visible). Comprobado 2026-10-02: 6 enlaces a `/estado-cuenta` que no
// existe — la ruta real es `/estado-de-cuenta` (App.jsx:209,217-220).
//
// Uso: node scripts/verificar-nav.mjs   (exit 1 si hay rutas rotas)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const leer = (rel) => readFileSync(join(raiz, rel), 'utf8')

// 1) Rutas declaradas en el nav.
const nav = leer('src/components/paginas-principales/NavUnificado.js')
const rutasNav = [...nav.matchAll(/\bto:\s*'([^']+)'/g)].map((m) => m[1])

// 2) Rutas registradas en App.jsx (con o sin slash inicial).
const app = leer('src/App.jsx')
const rutasApp = [...app.matchAll(/\bpath="([^"]+)"/g)].map((m) => m[1])
const normalizadas = new Set(rutasApp.map((p) => (p.startsWith('/') ? p : `/${p}`)))

// 3) `/producto/12` lo sirve la ruta `/producto/:id`: el nav debe apuntar
//    al prefijo, nunca a una URL concreta con id.
const ok = []
const rotas = []
for (const to of rutasNav) {
  const coincide = [...normalizadas].some(
    (ruta) => ruta === to || (ruta.endsWith('*') && to.startsWith(ruta.slice(0, -1)))
  )
  ;(coincide ? ok : rotas).push(to)
}

if (rutasNav.length === 0) {
  console.error('verificar-nav: no se encontro ningun `to:` en NavUnificado.js')
  process.exit(1)
}

if (rotas.length > 0) {
  console.error(`verificar-nav: ${rotas.length} ruta(s) del nav sin Route en App.jsx:`)
  for (const to of rotas) console.error(`  - ${to}`)
  process.exit(1)
}

console.log(`verificar-nav: OK — ${ok.length}/${rutasNav.length} rutas del nav existen en App.jsx`)