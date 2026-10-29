// Publicidad y contenido patrocinado de /noticias. Todo se maneja desde acá,
// sin tocar componentes. Hay tres espacios:
//
//   NOTICIAS_BANNER   → banner horizontal bajo la portada (ancho completo)
//   NOTICIAS_LATERAL  → rectángulo fijo en la columna derecha (solo desktop)
//   NOTICIAS_ADS      → tarjetas dentro del feed, con el MISMO formato visual de
//                       una noticia, cada 6 noticias reales
//
// Campos (todos los espacios usan la misma forma):
//   id            string único
//   tipo          'promocionado' → producto/sección propia de Droguería Carrisan
//                 'patrocinado'  → contenido pagado por un tercero
//   patrocinador  nombre de la marca (se muestra en la etiqueta "Patrocinado por…")
//   titulo        titular
//   texto         bajada / resumen
//   cta           texto del botón (banner y lateral)
//   link          interno ("/catalogo") navega dentro de la app; externo ("https://…")
//                 abre en pestaña nueva con rel="sponsored"
//   imagen        (opcional) URL. En banner y lateral, si existe, se muestra SOLO la
//                 imagen como creativo (arte completo); si no, se dibuja el creativo
//                 con colores de marca usando titulo/texto/cta.
//   imagenMovil   (opcional, solo banner) arte alternativo para pantallas < 640px
//   tema          (opcional, creativo sin imagen) 'azul' | 'indigo' | 'teal'
//   activo        (opcional) false lo apaga sin borrarlo
//
// Medidas sugeridas del arte: banner 970×250 (móvil 640×360) · lateral 300×250 ·
// tarjeta del feed 1200×750. Con varios items activos en un mismo espacio, se
// rota uno por visita.
//
// Imágenes: mismo bucket que adsImagenes.js, carpeta /ads/noticias/.

const BASE_IMG = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'

export const NOTICIAS_BANNER = [
  {
    id: 'banner-catalogo',
    tipo: 'promocionado',
    tema: 'azul',
    titulo: 'Todo tu catálogo farmacéutico en un solo lugar',
    texto: 'Compara precios, revisa existencias y pide en minutos.',
    cta: 'Ver catálogo',
    link: '/catalogo',
  },
]

export const NOTICIAS_LATERAL = [
  {
    id: 'lateral-inhrr',
    tipo: 'promocionado',
    tema: 'teal',
    titulo: 'Vademécum INHRR',
    texto: 'Consulta el registro sanitario de los productos.',
    cta: 'Consultar',
    link: '/registro-inhrr',
  },
]

export const NOTICIAS_ADS = [
  {
    id: 'promo-catalogo-noticias',
    tipo: 'promocionado',
    imagen: `${BASE_IMG}/ads/noticias/catalogo.png`,
    titulo: 'Todo tu catálogo farmacéutico en un solo lugar',
    texto: 'Compará precios, revisá existencias y pedí en minutos desde Droguería Carrisan.',
    link: '/catalogo',
  },
  {
    // Placeholder: se apagó (activo: false) para que no salga en producción.
    // Cuando tengas el primer patrocinio confirmado, reemplaza los datos y
    // quita la línea `activo`.
    id: 'patrocinado-ejemplo',
    tipo: 'patrocinado',
    activo: false,
    patrocinador: 'Nombre del laboratorio',
    imagen: `${BASE_IMG}/ads/noticias/laboratorio-ejemplo.png`,
    titulo: 'Título del contenido patrocinado por el laboratorio',
    texto: 'Reemplaza este texto y la imagen cuando tengas el primer patrocinio confirmado.',
    link: 'https://ejemplo.com',
  },
]
