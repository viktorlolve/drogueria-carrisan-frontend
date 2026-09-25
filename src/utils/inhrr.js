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