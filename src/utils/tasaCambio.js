// Lógica pura de la tarjeta de tasa BCV del panel interno del staff.
// Vive acá (y no dentro de StaffDashboard) para poder testearla sin React:
// los cálculos de variación y el fallback local no necesitan el DOM.
// La tasa oficial la cambia SOLO el dueño desde /admin (TasaCambio.jsx); el
// staff únicamente la lee.

// Extensión explícita: este módulo se testea con `node --test`, que (a
// diferencia de Vite) no resuelve imports sin extensión.
import { safeGetItem, safeSetItem } from './safeStorage.js'

export const CLAVE_TASA_LOCAL = 'carrisan_ultima_tasa_bcv'

// Convierte a número válido o null. Number('') da 0 y Number(null) da 0, así
// que descartamos los vacíos ANTES de convertir: una fila sin tasa no es "0".
function aNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

// Variación absoluta (Bs) y porcentual de la tasa actual contra la anterior.
// Devuelve null cuando no se puede comparar: sin tasa anterior, anterior 0
// (división por cero) o algún lado inservible. Mejor no mostrar variación que
// inventarla.
export function variacionTasa(actual, anterior) {
  const valorActual = aNumero(actual)
  const valorAnterior = aNumero(anterior)
  if (valorActual === null || valorAnterior === null || valorAnterior === 0) return null

  const abs = valorActual - valorAnterior
  return {
    abs: Number(abs.toFixed(4)),
    pct: Number(((abs / valorAnterior) * 100).toFixed(2)),
  }
}

// El cron de la tasa corre a las 21:00 hora Venezuela. Si la última
// actualización tiene más de un día, lo más probable es que una corrida haya
// fallado: conviene avisar en vez de mostrar la tasa como si fuera de hoy.
// Sin fecha válida se avisa (no se puede confirmar frescura); una fecha futura
// (reloj del equipo desfasado) no se considera vieja.
export function esTasaVieja(actualizadoEn, ahora = Date.now(), horas = 24) {
  if (!actualizadoEn) return true
  const fecha = new Date(actualizadoEn).getTime()
  if (!Number.isFinite(fecha)) return true
  const transcurrido = ahora - fecha
  if (transcurrido < 0) return false
  return transcurrido > horas * 60 * 60 * 1000
}

// Última tasa vista EN ESTE dispositivo. Es el fallback cuando el backend no
// tiene una fila anterior con la que comparar (p. ej. primer día de uso) o
// cuando la petición falla.
export function leerUltimaTasaLocal() {
  const crudo = safeGetItem(CLAVE_TASA_LOCAL)
  if (!crudo) return null
  try {
    const datos = JSON.parse(crudo)
    const tasa = aNumero(datos?.usd_a_ves)
    if (tasa === null) return null
    return {
      usd_a_ves: tasa,
      updated_at: datos?.updated_at || null,
    }
  } catch {
    // JSON corrupto (escritura a medias, versión vieja del formato): no romper
    // el panel por un dato de conveniencia.
    return null
  }
}

// Guarda la tasa para el próximo arranque. Devuelve false si no escribió nada
// (datos inválidos o storage bloqueado en Safari privado).
export function guardarUltimaTasaLocal(tasa) {
  const valor = aNumero(tasa?.usd_a_ves)
  if (valor === null) return false
  return safeSetItem(
    CLAVE_TASA_LOCAL,
    JSON.stringify({ usd_a_ves: valor, updated_at: tasa?.updated_at || null }),
  )
}
