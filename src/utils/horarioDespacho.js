// Horario de despacho / retiro según el día y la hora actuales en Venezuela.
// Funciones puras (reciben la fecha por parámetro) para poder probarlas fácil.
//
// Reglas de despacho (lunes a viernes):
//   12:00 a.m. – 6:00 a.m.  → hoy 9:00 a.m.
//    6:00 a.m. – 9:00 a.m.  → hoy 10:00 a.m.
//    9:00 a.m. – 12:00 m.   → hoy 2:00 p.m.
//   12:00 m.   – 2:00 p.m.  → hoy 4:00 p.m.
//    2:00 p.m. – 4:00 p.m.  → mañana 9:00 a.m.
//    4:00 p.m. – 12:00 a.m. → mañana 10:00 a.m.
// Sábados y domingos → el próximo lunes 10:00 a.m.
// Si "mañana" cae en sábado (viernes tarde) → también el próximo lunes 10:00 a.m.
//
// Retiro en depósito: antes de las 4:00 p.m. → hoy mismo; después → mañana
// (si mañana no es día hábil → el próximo lunes).

const ZONA = 'America/Caracas'
const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function leerReloj(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(fecha)

  const valor = (tipo) => partes.find((p) => p.type === tipo)?.value
  let hora = Number(valor('hour'))
  if (hora === 24) hora = 0 // algunos motores devuelven 24 a medianoche
  const minuto = Number(valor('minute'))

  return { dia: DIAS[valor('weekday')], hora: hora + minuto / 60 }
}

const esDiaHabil = (dia) => dia >= 1 && dia <= 5

const PROXIMO_LUNES = { cuando: 'lunes', hora: '10:00 a.m.' }

// Se devuelve una copia para que el consumidor nunca pueda mutar la constante.
const proximoLunes = () => ({ ...PROXIMO_LUNES })

export function calcularDespacho(fecha = new Date()) {
  const { dia, hora } = leerReloj(fecha)

  if (!esDiaHabil(dia)) return proximoLunes()

  if (hora < 6) return { cuando: 'hoy', hora: '9:00 a.m.' }
  if (hora < 9) return { cuando: 'hoy', hora: '10:00 a.m.' }
  if (hora < 12) return { cuando: 'hoy', hora: '2:00 p.m.' }
  if (hora < 14) return { cuando: 'hoy', hora: '4:00 p.m.' }

  // Desde las 2:00 p.m. el despacho pasa al siguiente día hábil.
  // Viernes: "mañana" sería sábado → se va al lunes.
  if (dia === 5) return proximoLunes()
  return { cuando: 'manana', hora: hora < 16 ? '9:00 a.m.' : '10:00 a.m.' }
}

export function calcularRetiro(fecha = new Date()) {
  const { dia, hora } = leerReloj(fecha)

  if (!esDiaHabil(dia)) return 'lunes'
  if (hora < 16) return 'hoy'
  return dia === 5 ? 'lunes' : 'manana'
}

// Frase lista para mostrar en pantalla.
export function fraseDespacho({ cuando, hora }) {
  if (cuando === 'hoy') return { prefijo: 'podrá ser despachada', destacado: `hoy a las ${hora}` }
  if (cuando === 'manana') return { prefijo: 'será despachada', destacado: `mañana a las ${hora}` }
  return { prefijo: 'será despachada', destacado: `el próximo lunes a las ${hora}` }
}

export function fraseRetiro(cuando) {
  if (cuando === 'hoy') return 'hoy mismo'
  if (cuando === 'manana') return 'mañana'
  return 'el próximo lunes'
}