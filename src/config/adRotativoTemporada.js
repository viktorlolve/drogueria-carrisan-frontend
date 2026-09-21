// Campañas de temporada del AdRotativo (banner full-width, después de
// Laboratorios). A diferencia de `adsImagenes.js` (2 ads fijas del bloque
// antes de los shorts), esto SÍ rota solo cada pocos segundos — pensado
// para ofertas puntuales, nuevos ingresos o fechas especiales que cambian
// seguido. Actualizá este archivo cuando una campaña termine o empiece
// una nueva; no hace falta tocar Home.jsx.
//
// Sin `imagen` todavía → cada slide cae en modo placeholder (con
// titulo/subtitulo/variante) hasta que subas el arte o GIF final.
// Cuando lo tengas, agregá `imagen` (y opcionalmente `alt`) al objeto —
// título/subtítulo dejan de mostrarse automáticamente.

const BASE_IMG = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'

export const ADS_ROTATIVO_TEMPORADA = [
  {
    id: 'temporada-quetiapina',
    imagen: `${BASE_IMG}/ads/quetiapina.jpg`,
    alt: 'Quetiapina',
    link: '/catalogo',
  },
  {
    id: 'temporada-riniflu',
    imagen: `${BASE_IMG}/ads/riniflu.jpg`,
    alt: 'Riniflu',
    link: '/catalogo',
  },
  {
    id: 'temporada-femenino',
    imagen: `${BASE_IMG}/ads/genesa.jpg`,
    alt: 'Línea femenino',
    link: '/catalogo',
  },
]