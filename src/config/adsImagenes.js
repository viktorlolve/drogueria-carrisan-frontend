// Anuncios (ads) del Home — imágenes centralizadas en un solo sitio,
// igual que `laboratoriosLogos.js` y `categoriasImagenes.js`.
//
// Diferencia clave: los ads SON TEMPORALES (tienen duración). Cuando una
// campaña termina, solo actualizás el `imagen` de su objeto (o borrás el
// objeto entero) en este archivo — sin tocar Home.jsx.
//
// `etiqueta` — mismo sistema de badge que las ads de /noticias:
//   'Promocionado' → producto/sección propia de Droguería Carrisán
//   'Patrocinado'  → contenido pagado por un tercero (laboratorio, etc.)
// Se elige con un simple cambio de texto acá, sin tocar el componente.
//
// Imágenes: bucket `crsnimages` de Supabase Storage, carpeta /ads/.
// Nombre de archivo = el que uses al subir (ej. ads/nuevos.png).
// El URL sale solo del BASE_IMG + la ruta que coloques en `imagen`.
//
// Cada objeto del array se pasa como props a <AdCard {...ad} />.

const BASE_IMG = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'

export const ADS = [
  {
    id: 'nuevos',
    imagen: `${BASE_IMG}/ads/nuevos.png`,
    overlay: true,
    alt: 'Nuevos productos',
    titulo: 'Nuevos productos',
    subtitulo: 'Descubrí lo último que llegó',
    variante: 'nuevo',
    etiqueta: 'Promocionado',
    link: '/catalogo',
  },
  {
    id: 'ofertas',
    imagen: `${BASE_IMG}/ads/ofertas.png`,
    overlay: true,
    alt: 'Ofertas relámpago',
    titulo: 'Ofertas relámpago',
    subtitulo: 'No te quedes con el tuyo',
    variante: 'oferta',
    etiqueta: 'Promocionado',
    link: '/catalogo',
  },
]