// Agrupa productos activos por molécula o laboratorio y arma columnas
// aleatorias del carrusel "Rollbacks y más". Mezcla grupos de ambos tipos.
// verTodoTo apunta al catálogo con el filtro correspondiente (?molecula / ?laboratorio).

function shuffle(lista) {
  const arr = [...lista]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// minimoProductos es el mínimo que una columna debe tener para mostrarse (2x2 = 4).
export function agruparEspecifico(productos, maxSecciones = 10, minimoProductos = 4) {
  const porMol = {}
  const porLab = {}

  for (const p of productos) {
    if (!p.activo) continue
    if (p.molecula) {
      if (!porMol[p.molecula]) porMol[p.molecula] = []
      porMol[p.molecula].push(p)
    }
    if (p.laboratorio) {
      if (!porLab[p.laboratorio]) porLab[p.laboratorio] = []
      porLab[p.laboratorio].push(p)
    }
  }

  const armarSeccion = (clave, items, parametro) => ({
    id: `${parametro}-${clave}`,
    titulo: clave,
    verTodoTo: `/catalogo?${parametro}=${encodeURIComponent(clave)}`,
    // No solo el orden de las secciones: también los 4 productos de cada una
    // se eligen al azar para que la columna no muestre siempre los mismos.
    productos: shuffle(items).slice(0, 4),
  })

  const seccionesMol = shuffle(
    Object.entries(porMol)
      .filter(([, items]) => items.length >= minimoProductos)
      .map(([clave, items]) => armarSeccion(clave, items, 'molecula'))
  )
  const seccionesLab = shuffle(
    Object.entries(porLab)
      .filter(([, items]) => items.length >= minimoProductos)
      .map(([clave, items]) => armarSeccion(clave, items, 'laboratorio'))
  )

  const resultado = []
  let i = 0
  let j = 0
  let tocaMol = Math.random() < 0.5
  while (resultado.length < maxSecciones && (i < seccionesMol.length || j < seccionesLab.length)) {
    if (tocaMol && i < seccionesMol.length) {
      resultado.push(seccionesMol[i++])
    } else if (!tocaMol && j < seccionesLab.length) {
      resultado.push(seccionesLab[j++])
    } else if (i < seccionesMol.length) {
      resultado.push(seccionesMol[i++])
    } else if (j < seccionesLab.length) {
      resultado.push(seccionesLab[j++])
    }
    tocaMol = Math.random() < 0.5
  }

  return resultado
}