// Campañas de temporada del AdRotativo (banner full-width, después de
// Laboratorios). SÍ rota solo cada pocos segundos en orden aleatorio.
//
// DIRECCIÓN DE ARTE (2026-10-23) — cada dispositivo tiene SU caja y SU arte:
//   desktop → caja 4:1    (arte ideal 2048×512)
//   móvil   → caja 16:9   (arte ideal 1280×720)
// La caja la fija el CSS (`AdRotativo.css`), no el archivo: el banner no
// cambia de alto al rotar. El arte entra con `object-fit: cover` centrado,
// así que si su proporción no es exactamente la de la caja se recorta por
// los lados y NUNCA se deforma.
//
// REGLA: una ad solo aparece en el dispositivo donde tiene arte.
//   `imagenDesktop` + `imagenMovil` → sale en los dos
//   solo `imagenDesktop`            → no sale en móvil (una 4:1 ahí es ilegible)
//   solo `imagenMovil`              → no sale en desktop
//   ninguna de las dos              → maqueta: placeholder en ambos
// Para excluir un arte dejá su URL vacía (`''`).
//
// Las fotos viven en el bucket `crsnimages`, carpeta `ads/`. Sustituí las
// URLs acá cuando cambie una campaña — no hace falta tocar el componente.
//
// Medidas reales de lo cargado hoy (2026-10-23):
//   quetiapina   2040×512  3.98:1  → 4:1 clavado
//   losartan     6667×1676 3.98:1  → 4:1 clavado
//   frondos      6667×1676 3.98:1  → 4:1 clavado
//   lampral      6667×1676 3.98:1  → 4:1 clavado
//   genesa       2040×512  3.98:1  → 4:1 clavado
//   riniflu      1792×592  3.03:1  → se recorta ~12% por lado (arte a rehacer)
//   caloxpromo2  1392×768  1.81:1  → 16:9, recorte mínimo
//   letipromo    1392×768  1.81:1  → 16:9, recorte mínimo
//   dol           800×500  1.60:1  → 16:9, recorta ~5% por lado
//
// (cofastane, festalcalox y letisanpromo son WebP animados y van en otras
// secciones de la Home, no en este rotativo.)

const BASE_IMG = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'

export const ADS_ROTATIVO_TEMPORADA = [
  // ── Desktop 4:1 ──
  {
    id: 'temporada-quetiapina',
    imagenDesktop: `${BASE_IMG}/ads/quetiapina.jpg`,
    imagenMovil: '',
    alt: 'Quetiapina',
    link: '/catalogo',
  },
  {
    id: 'temporada-losartan',
    imagenDesktop: `${BASE_IMG}/ads/losartan.jpg`,
    imagenMovil: '',
    alt: 'Losartán',
    link: '/catalogo',
  },
  {
    id: 'temporada-frondos',
    imagenDesktop: `${BASE_IMG}/ads/frondos.jpg`,
    imagenMovil: '',
    alt: 'Frondos',
    link: '/catalogo',
  },
  {
    id: 'temporada-lampral',
    imagenDesktop: `${BASE_IMG}/ads/lampral.jpg`,
    imagenMovil: '',
    alt: 'Lampral',
    link: '/catalogo',
  },
  {
    id: 'temporada-femenino',
    imagenDesktop: `${BASE_IMG}/ads/genesa.jpg`,
    imagenMovil: '',
    alt: 'Línea femenino',
    link: '/catalogo',
  },
  {
    // Arte actual 3.03:1 → en la caja 4:1 se recorta ~12% por lado.
    // Pendiente de rehacer en 4:1; se deja para revisarlo en vivo.
    id: 'temporada-riniflu',
    imagenDesktop: `${BASE_IMG}/ads/riniflu.jpg`,
    imagenMovil: '',
    alt: 'Riniflu',
    link: '/catalogo',
  },

  // ── Móvil 16:9 ──
  {
    id: 'temporada-calox-promo',
    imagenDesktop: '',
    imagenMovil: `${BASE_IMG}/ads/caloxpromo2.jpg`,
    alt: 'Promoción Calox',
    link: '/catalogo',
  },
  {
    id: 'temporada-dol',
    imagenDesktop: '',
    imagenMovil: `${BASE_IMG}/ads/dol.jpg`,
    alt: 'Dol',
    link: '/catalogo',
  },
  {
    id: 'temporada-leti-promo',
    imagenDesktop: '',
    imagenMovil: `${BASE_IMG}/ads/letipromo.jpg`,
    alt: 'Promoción Leti',
    link: '/catalogo',
  },
]
