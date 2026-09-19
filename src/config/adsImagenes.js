// Anuncios (ads) del Home — imágenes centralizadas en un solo sitio,
// igual que `laboratoriosLogos.js` y `categoriasImagenes.js`.
//
// Diferencia clave: los ads SON TEMPORALES (tienen duración). Cuando una
// campaña termina, solo actualizás el `imagen` de su objeto (o borrás el
// objeto entero) en este archivo — sin tocar Home.jsx.
//
// Modo actual: tarjeta de imagen PURO (sin overlay). El arte ya trae el
// texto/botón horneado en la imagen (GIF o estático), así que no se pasa
// `overlay` ni `titulo`/`subtitulo` — `AdCard` renderiza solo la imagen.
//
// Imágenes: bucket `crsnimages` de Supabase Storage, carpeta /ads/.
// Nombre de archivo = el que uses al subir (ej. ads/atamel.gif).
// El URL sale solo del BASE_IMG + la ruta que coloques en `imagen`.
//
// Cada objeto del array se pasa como props a <AdCard {...ad} />.

const BASE_IMG = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'

export const ADS = [
  {
    id: 'atamel',
    imagen: `${BASE_IMG}/ads/atamel.gif`,
    alt: 'Atamel',
    link: '/catalogo',
  },
  {
    id: 'festalcalox',
    imagen: `${BASE_IMG}/ads/festalcalox.gif`,
    alt: 'Festal y Calox',
    link: '/catalogo',
  },
]