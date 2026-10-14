// src/config/logos.js
//
// Fuente única de los logos de la empresa. Viven en Supabase Storage
// (bucket público `crsnimages`, carpeta `logodrogueria/`), así que se sirven
// desde el CDN y no desde el bundle. Si el dueño sube una versión nueva,
// se cambia la URL aquí y todos los puntos de la app la heredan.
//
// Qué va en cada fondo:
//   - Fondo CLARO  → MINI_LOGO_COLOR (versión color, cuadrada, con fondo blanco)
//   - Fondo OSCURO → LOGO_BLANCO (versión blanca horizontal, sin fondo)
//   - Imagen para compartir (pill blanca) → LOGO_COLOR_HORIZONTAL

const BASE = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/logodrogueria'

// Horizontal en color, sin fondo (transparente, ~2.8:1)
export const LOGO_COLOR_HORIZONTAL = `${BASE}/logo%20color%20horizontal%20sin%20fondo.png`

// Horizontal en blanco, sin fondo (transparente, ~2.8:1) — para fondos oscuros
export const LOGO_BLANCO = `${BASE}/logo%20blanco%20sin%20fondo.png`

// Mini logo en color sobre fondo blanco (cuadrado, mismo dibujo que el PNG local)
export const MINI_LOGO_COLOR = `${BASE}/mini%20logo%20color%20base%20fondo%20blanco.png`

// Mini logo blanco sobre fondo de color — usado como badge en el Landing
export const MINI_LOGO_TEAL = `${BASE}/mini%20logo%20blanco%20fondo%20teal.png`
export const MINI_LOGO_AZUL = `${BASE}/mini%20logo%20blanco%20fondo%20azul.png`
