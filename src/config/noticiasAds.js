// Ads que se insertan dentro del feed de /noticias, con el MISMO formato
// visual de una card de noticia (imagen + fecha + título + resumen), pero
// con un badge ámbar que dice "Promocionado" o "Patrocinado" en vez del
// badge de fuente. Se insertan cada 6 noticias reales, elegidos al azar.
//
// `tipo` acepta solo dos valores — así se elige la etiqueta con un simple
// cambio de texto en la data, sin tocar componentes:
//   'promocionado' → producto/sección propia de Droguería Carrisan
//   'patrocinado'  → contenido pagado por un tercero (laboratorio, etc.)
//
// `link` interno (empieza con "/") navega dentro de la app; un link externo
// (empieza con "http") abre en pestaña nueva — igual que las noticias reales.
//
// Imágenes: mismo bucket que adsImagenes.js, carpeta /ads/noticias/.

const BASE_IMG = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'

export const NOTICIAS_ADS = [
  {
    id: 'promo-catalogo-noticias',
    tipo: 'promocionado',
    imagen: `${BASE_IMG}/ads/noticias/catalogo.png`,
    titulo: 'Todo tu catálogo farmacéutico en un solo lugar',
    resumen: 'Compará precios, revisá existencias y pedí en minutos desde Droguería Carrisan.',
    link: '/catalogo',
  },
  {
    id: 'patrocinado-ejemplo',
    tipo: 'patrocinado',
    imagen: `${BASE_IMG}/ads/noticias/laboratorio-ejemplo.png`,
    titulo: 'Título del contenido patrocinado por el laboratorio',
    resumen: 'Reemplaza este texto y la imagen cuando tengas el primer patrocinio confirmado.',
    link: 'https://ejemplo.com',
  },
]