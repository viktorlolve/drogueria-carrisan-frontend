// ---------------------------------------------------------------
// Funciones PURAS del nav de paginas principales. Sin React, sin
// imports: asi se testean con `node --test` (scripts/
// navUnificadoHelpers.test.mjs) sin montar nada.
//
// `normalizarNav` tolera el array legacy ({ id, texto, items }) para
// que una navegacion vieja no rompa el layout: el layout SIEMPRE
// recibe la forma { grupos, pie }.
// ---------------------------------------------------------------

export function normalizarNav(nav) {
  if (!nav) return { grupos: [], pie: null }
  if (Array.isArray(nav)) {
    return {
      grupos: nav.map((g) => ({
        id: g.id,
        titulo: g.titulo || g.texto,
        items: g.items || [],
      })),
      pie: null,
    }
  }
  return { grupos: nav.grupos || [], pie: nav.pie || null }
}

// Todos los items con el id del grupo al que pertenecen (el pie cuenta
// como grupo: asi el layout abre Ayuda igual que cualquier otro).
export function todosLosItems(modelo) {
  const deGrupos = (modelo.grupos || []).flatMap((g) =>
    (g.items || []).map((item) => ({ ...item, grupoId: g.id }))
  )
  if (!modelo.pie) return deGrupos
  return [
    ...deGrupos,
    ...(modelo.pie.items || []).map((item) => ({ ...item, grupoId: modelo.pie.id })),
  ]
}

// Que grupo hay que abrir para que el item activo quede a la vista.
export function grupoDeItem(modelo, activo) {
  if (!activo) return null
  const item = todosLosItems(modelo).find((i) => i.id === activo)
  return item ? item.grupoId : null
}

// Arranca abierto solo el grupo del item activo: al entrar por deep link
// (/chat, /estado-de-cuenta/facturas) el usuario ya ve donde esta.
export function gruposAbiertosIniciales(modelo, activo) {
  const grupo = grupoDeItem(modelo, activo)
  return grupo ? new Set([grupo]) : new Set()
}