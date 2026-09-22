// Campañas de temporada del AdRotativo (banner full-width, después de
// Laboratorios). SÍ rota solo cada pocos segundos en orden aleatorio.
// Cada ad tiene DOS formatos: banner panorámico para desktop (21:9) y una
// versión más cuadrada para móvil (4:3). Editá las URLs directo en este
// archivo cuando cambie una campaña — no hace falta tocar AdRotativo.jsx.
//
// Formato por ad:
//   imagenDesktop — arte panorámico (desktop, 21:9). Ej. 1400×600
//   imagenMovil   — arte cuadrado/apaisado para móvil (4:3). Ej. 900×675
//   link          — destino del click
//   alt           — texto alternativo
//
// Sin `imagenDesktop`/`imagenMovil` → el slide cae en modo placeholder
// (titulo/subtitulo/variante) hasta que subas el arte final.

const BASE_IMG = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'

export const ADS_ROTATIVO_TEMPORADA = [
  {
    id: 'temporada-quetiapina',
    imagenDesktop: `${BASE_IMG}/ads/quetiapina.jpg`,
    imagenMovil: `${BASE_IMG}/ads/quetiapina.jpg`,
    alt: 'Quetiapina',
    link: '/catalogo',
  },
  {
    id: 'temporada-riniflu',
    imagenDesktop: `${BASE_IMG}/ads/riniflu.jpg`,
    imagenMovil: `${BASE_IMG}/ads/riniflu.jpg`,
    alt: 'Riniflu',
    link: '/catalogo',
  },
  {
    id: 'temporada-femenino',
    imagenDesktop: `${BASE_IMG}/ads/genesa.jpg`,
    imagenMovil: `${BASE_IMG}/ads/genesa.jpg`,
    alt: 'Línea femenino',
    link: '/catalogo',
  },
]