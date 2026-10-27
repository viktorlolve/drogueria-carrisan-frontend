// Utilidades de tiempo para ofertas con fecha de cierre.
// Fuente de datos: producto.descuento_activo.fecha_fin (ISO, la devuelve el
// backend en /products). Todo es puro y recibe `ahora` para poder probarse.

const MS_MINUTO = 60_000
const MS_HORA = 3_600_000
const MS_DIA = 86_400_000

// Timestamp (ms) de cierre de la oferta de un producto, o null si no tiene fecha.
export function finDe(producto) {
  const f = producto?.descuento_activo?.fecha_fin
  if (!f) return null
  const t = new Date(f).getTime()
  return Number.isNaN(t) ? null : t
}

// Desglosa milisegundos en días / horas / minutos / segundos (nunca negativos).
export function partesRestantes(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    dias: Math.floor(total / 86400),
    horas: Math.floor((total % 86400) / 3600),
    minutos: Math.floor((total % 3600) / 60),
    segundos: total % 60,
  }
}

function inicioDelDia(t) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Días de calendario entre ahora y el cierre (0 = hoy, 1 = mañana...).
export function diasCalendario(finMs, ahoraMs) {
  return Math.round((inicioDelDia(finMs) - inicioDelDia(ahoraMs)) / MS_DIA)
}

// Etiqueta corta para las tarjetas. Devuelve null si no hay fecha o ya venció.
// nivel: 'critica' (hoy) | 'alta' (≤3 días) | 'media' (≤7 días) | 'normal'
export function etiquetaUrgencia(finMs, ahoraMs = Date.now()) {
  if (finMs == null) return null
  const ms = finMs - ahoraMs
  if (ms <= 0) return null

  const dias = diasCalendario(finMs, ahoraMs)
  if (dias <= 0) {
    if (ms < MS_HORA) return { texto: `Termina en ${Math.max(1, Math.ceil(ms / MS_MINUTO))} min`, nivel: 'critica' }
    return { texto: 'Termina hoy', nivel: 'critica' }
  }
  if (dias === 1) return { texto: 'Termina mañana', nivel: 'alta' }
  if (dias <= 7) return { texto: `Quedan ${dias} días`, nivel: dias <= 3 ? 'alta' : 'media' }

  const fecha = new Date(finMs).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
  return { texto: `Hasta el ${fecha}`, nivel: 'normal' }
}
