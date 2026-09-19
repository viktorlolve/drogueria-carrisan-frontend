import fs from 'node:fs'

const base = 'C:\\Users\\Usuario\\Desktop\\Proyecto\\Drogueria Carrisan\\drogueria-carrisan-frontend\\src\\pages\\staff'
const jsx = fs.readFileSync(base + '\\StaffDashboard.jsx', 'utf8')
const css = fs.readFileSync(base + '\\StaffDashboard.css', 'utf8')

function extraerClases(jsx) {
  const set = new Set()
  const re = /className\s*=\s*["'`]([^"'`]+)["'`]/g
  let m
  while ((m = re.exec(jsx))) {
    for (const c of m[1].split(/\s+/)) {
      if (c && !c.startsWith('{')) set.add(c)
    }
  }
  return [...set].sort()
}

const clases = extraerClases(jsx)
const faltan = clases.filter((c) => {
  const re = new RegExp('\\\\.' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b')
  return !re.test(css)
})

console.log('byteLength jsx:', Buffer.byteLength(jsx))
console.log('byteLength css:', Buffer.byteLength(css))
console.log('clases jsx:', clases.length)
console.log('faltan en css LISTA (' + faltan.length + '):')
faltan.forEach((c) => console.log('  ' + c))
if (faltan.length === 0) console.log('TODAS PRESENTES')
