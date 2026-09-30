// Historial local de moléculas consultadas en /vademecum.
//
// Es SOLO localStorage a propósito: no requiere sesión ni backend, así que
// funciona también para visitas anónimas (la página es pública). La alternativa
// —"populares de los últimos 7 días"— necesitaría una tabla de búsquedas, un
// endpoint y un log por consulta; queda fuera hasta que haya tráfico real.
//
// Cada entrada es { id, nombre, atc } con `id` de `moleculas_referencias`.
// Todas las funciones devuelven un array vacío/falso en vez de lanzar: si el
// localStorage está bloqueado (modo privado), lleno o corrupto, la página sigue
// funcionando y solo pierde el historial.

const CLAVE = 'vademecum_recientes'
const MAXIMO = 6

const esMoleculaValida = (m) =>
  !!m && typeof m === 'object' && m.id != null && typeof m.nombre === 'string' && m.nombre.length > 0

const normalizar = (m) => ({
  id: m.id,
  nombre: m.nombre,
  atc: typeof m.atc === 'string' ? m.atc : null,
})

/** Devuelve hasta MAXIMO moléculas, deduplicadas por id y en orden de uso. */
export function leerRecientes() {
  try {
    const crudo = window.localStorage.getItem(CLAVE)
    if (!crudo) return []
    const datos = JSON.parse(crudo)
    if (!Array.isArray(datos)) return []
    const vistos = new Set()
    const salida = []
    for (const m of datos) {
      if (!esMoleculaValida(m)) continue
      const id = String(m.id)
      if (vistos.has(id)) continue
      vistos.add(id)
      salida.push(normalizar(m))
      if (salida.length >= MAXIMO) break
    }
    return salida
  } catch {
    return []
  }
}

/** Guarda la molécula al frente del historial (deduplicada por id). */
export function guardarReciente(molecula) {
  if (!esMoleculaValida(molecula)) return leerRecientes()
  try {
    const resto = leerRecientes().filter((m) => String(m.id) !== String(molecula.id))
    const salida = [normalizar(molecula), ...resto].slice(0, MAXIMO)
    window.localStorage.setItem(CLAVE, JSON.stringify(salida))
    return salida
  } catch {
    return leerRecientes()
  }
}

/** Vacía el historial. Devuelve true si se pudo borrar. */
export function borrarRecientes() {
  try {
    window.localStorage.removeItem(CLAVE)
    return true
  } catch {
    return false
  }
}
