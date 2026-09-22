// Campañas de temporada del AdRotativo (banner full-width, después de
// Laboratorios). SÍ rota solo cada pocos segundos en orden aleatorio.
// Cada ad tiene DOS formatos: uno para desktop (imagenDesktop) y otro para
// móvil (imagenMovil). No hay cuadro ni recorte — la imagen carga sola con su
// tamaño natural (ocio: ancho completo, alto libre). Editá las URLs directo
// en este archivo cuando cambie una campaña — no hace falta tocar el
// componente.
//
// Formato por ad:
//   imagenDesktop — arte del banner para desktop
//   imagenMovil   — arte del banner para móvil
//   link          — destino del click
//   alt           — texto alternativo
//
// Tip: para que el banner no "salte" de alto al rotar, subí todas las ads de
// un mismo formato con la MISMA proporción (ej. todas las de desktop 1200×300)
// aunque el contenido cambie.
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