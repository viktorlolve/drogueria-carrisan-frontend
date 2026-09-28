// Verifica los invariantes de la PWA unica sobre dist/.
// Uso (desde drogueria-carrisan-frontend/):  node scripts/verificar-pwa.mjs
// Requiere un build previo:  npx vite build --mode development
// Exit 0 = todo OK, exit 1 = hay al menos un invariante roto.
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(raiz, 'dist')
const fallos = []

function check(nombre, ok, detalle = '') {
  if (ok) {
    console.log(`  OK    ${nombre}`)
  } else {
    console.log(`  FALLA ${nombre}${detalle ? ` — ${detalle}` : ''}`)
    fallos.push(nombre)
  }
}

if (!existsSync(dist)) {
  console.error('No existe dist/. Ejecuta primero: npx vite build --mode development')
  process.exit(1)
}

console.log('\n== Invariantes PWA unica ==\n')

// 1. No debe existir la segunda shell HTML ni sus recursos.
check('no existe dist/staff.html', !existsSync(join(dist, 'staff.html')))
check('no existe dist/manifest-staff.json', !existsSync(join(dist, 'manifest-staff.json')))
check(
  'no existen iconos staff en dist/',
  !existsSync(join(dist, 'staff-icon-192x192.png')) &&
    !existsSync(join(dist, 'staff-icon-512x512.png')) &&
    !existsSync(join(dist, 'staff-apple-touch-icon.png'))
)

// 2. index.html: exactamente UN manifest, apuntando al del cliente.
const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8')
const manifests = indexHtml.match(/<link[^>]*rel="manifest"[^>]*>/g) ?? []
check('index.html tiene exactamente 1 link[rel=manifest]', manifests.length === 1, `encontrados: ${manifests.length}`)
check(
  'el unico manifest es /manifest.webmanifest',
  manifests.length === 1 && manifests[0].includes('/manifest.webmanifest'),
  manifests[0] ?? '(ninguno)'
)

// 3. El manifiesto del cliente conserva su icono (instalable) y su start_url.
const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'))
check('manifest tiene start_url "/"', manifest.start_url === '/', String(manifest.start_url))
check('manifest tiene scope "/"', manifest.scope === '/', String(manifest.scope))
check('manifest tiene 3 iconos', Array.isArray(manifest.icons) && manifest.icons.length === 3, String(manifest.icons?.length))
check(
  'manifest NO referencia iconos staff',
  !(manifest.icons ?? []).some((i) => i.src.includes('staff')),
  JSON.stringify(manifest.icons ?? [])
)

// 4. Un solo service worker, scope raiz.
check('existe dist/sw.js', existsSync(join(dist, 'sw.js')))
check('NO existe dist/sw-staff.js', !existsSync(join(dist, 'sw-staff.js')))

// 5. El rewrite de Vercel que servia staff.html debe estar fuera.
const vercel = JSON.parse(readFileSync(join(raiz, 'vercel.json'), 'utf8'))
const rewrites = vercel.rewrites ?? []
check(
  'vercel.json no rewritea /staff hacia staff.html',
  !rewrites.some((r) => String(r.destination).includes('staff.html')),
  JSON.stringify(rewrites)
)

console.log('')
if (fallos.length > 0) {
  console.error(`FALLARON ${fallos.length} invariante(s):`)
  for (const f of fallos) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('Todos los invariantes OK.\n')
