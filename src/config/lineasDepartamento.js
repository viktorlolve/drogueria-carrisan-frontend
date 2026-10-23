// Identidad de cada línea (departamento) de la tienda.
// LineaDepartamento.jsx es el motor único; todo lo que cambia entre
// Farmacia y Hospitalaria (textos, imagen del hero, bloques de confianza y
// bento de enlaces cruzados) vive acá. Para ajustar copy o imágenes no hace
// falta tocar el componente.
//
// `apiLinea` es el slug que entiende el backend en GET /products?linea=
// (productos.controller.js lo traduce a 'Linea Farmacia' / 'Linea Hospitalaria').
//
// Íconos: se referencian por nombre (string) y LineaDepartamento.jsx los
// resuelve contra su propio mapa. Si agregas uno nuevo, súmalo allá también.

const BASE_IMG = 'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages'

// Bloques del bento: se reutilizan entre líneas (cada línea omite el que apunta a sí misma).
const BLOQUE_VADEMECUM = {
  id: 'vademecum',
  imagen: `${BASE_IMG}/vervademecum.png`,
  alt: 'Vademécum clínico',
  titulo: 'Vademécum clínico al alcance',
  textoCta: 'Buscar molécula',
  estiloCta: 'enlace',
  link: '/vademecum',
}

const BLOQUE_REGISTRO = {
  id: 'registro',
  imagen: `${BASE_IMG}/ampolla.jpg`,
  alt: 'Registro sanitario',
  titulo: 'Cada producto con registro sanitario verificado',
  textoCta: 'Ver registro',
  estiloCta: 'enlace',
  link: '/registro-inhrr',
}

const BLOQUE_PRESUPUESTO = {
  id: 'presupuesto',
  imagen: `${BASE_IMG}/verpresupuesto.png`,
  alt: 'Presupuestos',
  titulo: 'Presupuestos sin llamadas ni esperas',
  textoCta: 'Generar presupuesto',
  link: '/presupuesto',
}

export const LINEAS_DEPARTAMENTO = {
  farmacia: {
    slug: 'farmacia',
    ruta: '/farmacia',
    apiLinea: 'farmacia',
    titulo: 'Línea Farmacia',
    tituloCorto: 'Farmacia',
    icono: 'Pill',
    eyebrow: 'Departamento · Consumo masivo',
    // Segundo elemento del array = parte resaltada con el color de acento.
    titular: ['Todo lo esencial para tu farmacia,', 'en un solo pedido.'],
    bajada:
      'Medicamentos de consumo masivo y cuidado personal con precio siempre visible, disponibilidad al día y despacho programado.',
    imagen: `${BASE_IMG}/medicamentos.png`,
    ctaSecundario: { texto: 'Pedir presupuesto', to: '/presupuesto' },
    confianza: [
      {
        icono: 'ShieldCheck',
        titulo: 'Registro sanitario',
        texto: 'Consulta el registro de cada producto en el INHRR.',
        to: '/registro-inhrr',
      },
      {
        icono: 'BookOpen',
        titulo: 'Vademécum clínico',
        texto: 'Indicaciones y posología por molécula.',
        to: '/vademecum',
      },
      {
        icono: 'Truck',
        titulo: 'Despacho programado',
        texto: null, // se calcula en vivo con horarioDespacho
        dinamico: 'despacho',
      },
      {
        icono: 'ReceiptText',
        titulo: 'Crédito y factura fiscal',
        texto: 'Compra a crédito según tu cuenta y recibe factura fiscal.',
      },
    ],
    bento: [
      {
        id: 'hospitalaria',
        imagen: `${BASE_IMG}/quirofano.png`,
        alt: 'Línea hospitalaria',
        titulo: 'Equipa tu clínica o centro de salud',
        subtitulo: 'Insumos quirúrgicos y línea hospitalaria',
        textoCta: 'Ver línea hospitalaria',
        link: '/hospitalaria',
      },
      BLOQUE_VADEMECUM,
      BLOQUE_REGISTRO,
      BLOQUE_PRESUPUESTO,
    ],
    seccionFormas: {
      titulo: 'Explora por presentación',
      subtitulo: 'Filtra la línea según cómo se administra el producto.',
    },
  },

  hospitalaria: {
    slug: 'hospitalaria',
    ruta: '/hospitalaria',
    apiLinea: 'hospitalaria',
    titulo: 'Línea Hospitalaria',
    tituloCorto: 'Hospitalaria',
    icono: 'Hospital',
    eyebrow: 'Departamento · Uso clínico y hospitalario',
    titular: ['Insumos y medicamentos para tu clínica,', 'con respaldo sanitario.'],
    bajada:
      'Cobertura clínica y hospitalaria con información del registro sanitario, el laboratorio y la molécula en nuestro vademécum, más asesoría para encontrar equivalencias.',
    imagen: `${BASE_IMG}/quirofano.png`,
    ctaSecundario: { texto: 'Pedir presupuesto', to: '/presupuesto' },
    confianza: [
      {
        icono: 'ShieldCheck',
        titulo: 'Registro sanitario y laboratorio',
        texto: 'Cada insumo con su registro en el INHRR y su laboratorio.',
        to: '/registro-inhrr',
      },
      {
        icono: 'BookOpen',
        titulo: 'Información de la molécula',
        texto: 'Consulta la ficha clínica en nuestro vademécum.',
        to: '/vademecum',
      },
      {
        icono: 'Truck',
        titulo: 'Despacho programado',
        texto: null,
        dinamico: 'despacho',
      },
      {
        icono: 'MessageCircle',
        titulo: 'Asesoría especializada',
        texto: 'Te ayudamos a identificar equivalencias y sustitutos según disponibilidad.',
        to: 'whatsapp',
      },
    ],
    bento: [
      {
        id: 'farmacia',
        imagen: `${BASE_IMG}/medicamentos.png`,
        alt: 'Línea farmacia',
        titulo: 'Tu línea de farmacia completa, en un solo lugar',
        subtitulo: 'Todo el catálogo de consumo masivo',
        textoCta: 'Ver línea farmacia',
        link: '/farmacia',
      },
      BLOQUE_VADEMECUM,
      BLOQUE_REGISTRO,
      BLOQUE_PRESUPUESTO,
    ],
    seccionFormas: {
      titulo: 'Explora por presentación',
      subtitulo: 'Del inyectable a la solución: filtra la línea por forma farmacéutica.',
    },
  },
}

export default LINEAS_DEPARTAMENTO