// ---------------------------------------------------------------
// Helpers de presentación compartidos por los centros de
// notificaciones (cliente y staff): formato de fecha relativa y
// agrupado por día.
//
// Viven aquí para que la página staff y la campana staff no
// reimplementen los helpers inline que ya tenía `pages/Notificaciones.jsx`
// (la página cliente conserva su copia local: no se toca para no
// cambiar su comportamiento).
// ---------------------------------------------------------------

/** "Ahora" / "Hace 5 min" / "Hace 2 horas" / hora corta (es-VE). */
export function formatFecha(fechaISO) {
  if (!fechaISO) return ''
  const fecha = new Date(fechaISO)
  if (Number.isNaN(fecha.getTime())) return ''
  const diffMs = Date.now() - fecha.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHoras = Math.floor(diffMin / 60)

  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `Hace ${diffMin} min`
  if (diffHoras < 24) return `Hace ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`
  return fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Agrupa una lista YA ordenada (desc) en baldes de fecha relativa.
 * Devuelve `[['Hoy', [...]], ['Ayer', [...]], ...]`, omitiendo los
 * baldes vacíos.
 */
export function agruparPorFecha(lista) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  const haceUnaSemana = new Date(hoy)
  haceUnaSemana.setDate(hoy.getDate() - 7)

  const baldes = { Hoy: [], Ayer: [], 'Esta semana': [], 'Más antiguas': [] }

  for (const n of lista) {
    const fecha = new Date(n.created_at)
    if (fecha >= hoy) baldes.Hoy.push(n)
    else if (fecha >= ayer) baldes.Ayer.push(n)
    else if (fecha >= haceUnaSemana) baldes['Esta semana'].push(n)
    else baldes['Más antiguas'].push(n)
  }

  return Object.entries(baldes).filter(([, items]) => items.length > 0)
}