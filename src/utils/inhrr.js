export const CATEGORIAS = [
  { id: 'ME', nombre: 'Medicamentos', icono: '💊' },
  { id: 'HO', nombre: 'Hospitalarios', icono: '🏥' },
  { id: 'MM', nombre: 'Material médico', icono: '🩺' },
  { id: 'MI', nombre: 'Misceláneos', icono: '🧩' },
]

export const COLOR_CATEGORIA = {
  ME: '#0052DC',
  HO: '#0D9373',
  MM: '#D97706',
  MI: '#6B7280',
}

export function nombreCategoria(id) {
  return CATEGORIAS.find((c) => c.id === id)?.nombre || id || '—'
}

export function formatFecha(f) {
  if (!f) return '—'
  const iso = String(f).slice(0, 10)
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Estado de vigencia de un registro sanitario a partir de sus fechas.
// Devuelve { clave, etiqueta } — clave: vigente | por_vencer | vencido | cancelado | sin_dato
export function estadoRegistro(reg) {
  if (reg?.fecha_cancelado) return { clave: 'cancelado', etiqueta: 'Cancelado' }
  if (!reg?.fecha_vigencia) return { clave: 'sin_dato', etiqueta: 'Vigencia no informada' }
  const iso = String(reg.fecha_vigencia).slice(0, 10)
  const fin = new Date(`${iso}T23:59:59`)
  if (Number.isNaN(fin.getTime())) return { clave: 'sin_dato', etiqueta: 'Vigencia no informada' }
  const dias = Math.ceil((fin.getTime() - Date.now()) / 86400000)
  if (dias < 0) return { clave: 'vencido', etiqueta: 'Vencido' }
  if (dias <= 90) return { clave: 'por_vencer', etiqueta: 'Vence pronto' }
  return { clave: 'vigente', etiqueta: 'Vigente' }
}