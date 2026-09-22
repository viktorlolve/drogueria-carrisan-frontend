// Logos de laboratorios para el carrusel "Explorá por laboratorio" (Home).
//
// LISTA REAL generada desde la BD (productos activos, 2026-09-18): top 20
// laboratorios con más productos de la tienda (2 tandas de 10). Si la lista
// del txt de prompt (data/prompts_banners_gpt.txt) cambia, esta debe cambiar igual.
//
// La BD guarda `productos.laboratorio` con el nombre completo y su variante legal
// (ej. "MEGALABS S.A.", "LABORATORIOS LETI S.A.V."). Cada clave de este mapa es
// un TOKEN que se busca DENTRO del nombre normalizado del laboratorio para decidir
// qué logo mostrar y qué etiqueta corta usar. Si un laboratorio no coincide con
// ninguna clave, la tarjeta cae en el ícono de fallback (FlaskConical).
//
// Imágenes: bucket `crsnimages` de Supabase Storage, carpeta /logos/.
// Nombre de archivo = la clave del mapa + .png (ej. megalabs.png, leti.png).
// El nombre de archivo DEBE coincidir con la clave (el usuario solo coloca el
// nombre adecuado al subir cada logo).

const BASE_IMG = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'

export const LOGOS_LABORATORIOS = {
  // ── Tanda 1 (top 10) ────────────────────────────────────────────────
  // token:            registro BD que coincide         archivo logo     etiqueta
  megalabs:         { logo: `${BASE_IMG}/logos/megalabs.png`,         nombre: 'MEGALABS' },
  leti:             { logo: `${BASE_IMG}/logos/leti.png`,             nombre: 'LETI' },
  calox:            { logo: `${BASE_IMG}/logos/calox.png`,            nombre: 'CALOX' },
  siegfried:        { logo: `${BASE_IMG}/logos/siegfried.png`,        nombre: 'SIEGFRIED' },
  valmor:           { logo: `${BASE_IMG}/logos/valmorca.jpg`,           nombre: 'VALMOR' },
  biotech:          { logo: `${BASE_IMG}/logos/biotech.png`,          nombre: 'BIOTECH' },
  oftalmi:          { logo: `${BASE_IMG}/logos/oftalmi.jpg`,          nombre: 'L.O. OFTALMI' },
  spefar:           { logo: `${BASE_IMG}/logos/spefar.png`,           nombre: 'SPEFAR' },
  'farma s.a.':     { logo: `${BASE_IMG}/logos/farma.png`,            nombre: 'FARMA' },
  vargas:           { logo: `${BASE_IMG}/logos/vargas.png`,           nombre: 'VARGAS' },
  // ── Tanda 2 (puestos 11-20) ─────────────────────────────────────────
  sante:            { logo: `${BASE_IMG}/logos/la%20sante.jpg`,          nombre: 'LA SANTE' },
  kimiceg:          { logo: `${BASE_IMG}/logos/kimiceg.jpg`,          nombre: 'KIMICEG' },
  cofasa:           { logo: `${BASE_IMG}/logos/cofasa.jpg`,           nombre: 'COFASA' },
  elmor:            { logo: `${BASE_IMG}/logos/elmor.jpg`,            nombre: 'ELMOR' },
  dollder:          { logo: `${BASE_IMG}/logos/dollder.jpg`,          nombre: 'DOLLDER' },
  plusandex:        { logo: `${BASE_IMG}/logos/plusandex.png`,        nombre: 'PLUSANDEX' },
  behrens:          { logo: `${BASE_IMG}/logos/behrens.webp`,         nombre: 'BEHRENS' },
  ronava:           { logo: `${BASE_IMG}/logos/ronava.jpg`,             nombre: 'RONAVA' },
  gema:             { logo: `${BASE_IMG}/logos/gema.png`,             nombre: 'GEMA LABS' },
  intercaps:        { logo: `${BASE_IMG}/logos/intercaps.png`,        nombre: 'INTERCAPS' },
}

// Normaliza un nombre para la búsqueda de tokens (minúsculas + sin acentos).
// Se conserva la puntuación del registro BD para que tokens tipo "farma s.a."
// solo matcheen a LABORATORIOS FARMA (no a "SM PHARMA, C.A." ni "GLOBAL FARMA, S.A.").
export function normalizarLab(nombre) {
  return (nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Devuelve { logo, nombre } si el laboratorio coincide con alguna clave,
// o null si no tiene logo (se usa el fallback en la tarjeta).
export function logoParaLaboratorio(laboratorio) {
  const norm = normalizarLab(laboratorio)
  const clave = Object.keys(LOGOS_LABORATORIOS).find((k) => norm.includes(k))
  return clave ? LOGOS_LABORATORIOS[clave] : null
}

// Nombre corto para mostrar bajo la tarjeta del carrusel.
// Nunca toca la BD: es SOLO presentación. Si hay logo usa su etiqueta;
// si no, limpia el registro BD para display ("LABORATORIOS LETI S.A.V." →
// "LETI", "LABORATORIO LA SANTE C.A." → "LA SANTE").
export function nombreVisible(laboratorio) {
  const match = logoParaLaboratorio(laboratorio)
  if (match) return match.nombre
  const limpio = String(laboratorio || '')
    .replace(/^lab(?:\.|oratorio|oratorios)\s+/i, '')
    .replace(/\s*,?\s*(?:C\.A\.|S\.A\.|S\.A\.V\.|S\.A\.I\.C\.|S\.A\.C\.I\.|L\.T\.D\.|Ltd\.?|LLC|Suc\.?)\s*$/i, '')
    .trim()
  return limpio || String(laboratorio || '')
}