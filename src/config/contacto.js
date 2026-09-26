// src/config/contacto.js
//
// Fuente única de verdad de los datos de contacto de Droguería Carrisán.
// La consumen `pages/Contacto.jsx`, `components/Footer.jsx` y `pages/Ayuda.jsx`
// para que cambiar un dato (por ejemplo el enlace de WhatsApp) se haga en UN
// solo lugar y no en tres archivos distintos.

export const CONTACTO = {
  whatsapp: {
    texto: '+58 414 5949532',
    numero: '584145949532',
    // Reemplaza esta URL por la que generes en wa.link / link.whatsapp.com.
    url: 'https://wa.link/imsb5w',
  },

  email: {
    texto: 'dcarrisan@gmail.com',
    // Asunto y saludo prellenados del mailto: (se codifican con encodeURIComponent).
    asunto: 'Consulta desde el sitio web — Droguería Carrisán',
    cuerpo: 'Hola,\n\nEscribo desde el sitio web de Droguería Carrisán.\n\n',
  },

  telefono: {
    texto: '+58 414 5949532',
    // Linking para tel: (solo el + y dígitos).
    tel: '+584145949532',
  },

  horario: [
    { dias: 'Lunes a viernes', rango: '8:00 AM – 5:00 PM' },
    { dias: 'Sábado', rango: '8:00 AM – 12:00 PM' },
    { dias: 'Domingo y feriados', rango: 'Cerrado' },
  ],

  direccion: {
    linea1: 'Av. Urdaneta (99), Qta Mirabal, Local 04C',
    linea2: 'Valencia 2001, Carabobo, Venezuela',
    mapa: 'https://maps.app.goo.gl/pm3MwK1r9JX5R4s9A',
  },

  tiempoRespuesta:
    'Respondemos los mensajes de WhatsApp en horario laboral, normalmente en menos de 30 minutos.',

  // Texto de la tarjeta de WhatsApp.
  whatsappDesc:
    'Atención directa con el equipo comercial. Ideal para consultar precios, verificar la disponibilidad de un producto o conocer el estado de tu pedido.',

  // Texto de la tarjeta de correo.
  emailDesc:
    'Ideal para cotizaciones, cuentas y cualquier consulta que requiera adjuntar documentos o dejar un detalle por escrito.',
}

export default CONTACTO
