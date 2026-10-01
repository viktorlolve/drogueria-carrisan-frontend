// src/config/empresa.js
//
// Datos fijos de la empresa que aparecen en el membrete de los PDFs
// (facturas, comprobantes, guías, referencias, presupuestos, reportes de
// estado de cuenta) y en la página pública de verificación.
//
// pdfBase.js filtra los placeholders automáticamente (datosEmpresa()), pero
// conviene no dejar ninguno: si el valor es un placeholder, el PDF lo omite.

const empresaInfo = {
  nombre: 'Droguería Carrisan',

  // Frase corta: se dibuja en el membrete junto al logo y no puede medir más
  // de ~45 caracteres o se cruza con el bloque derecho (tipo de documento).
  tagline: 'Abastecimiento farmacéutico y hospitalario',

  // Descripción larga: para la web y la página de verificación (no va al PDF).
  descripcion:
    'Plataforma digital de abastecimiento farmacéutico y hospitalario para clínicas, farmacias y centros quirúrgicos.',

  rif: 'J-40068410-2',
  telefono: '+58 414 5949532',
  email: 'dcarrisan@gmail.com',
  direccion: 'Av. Urdaneta (99), Qta Mirabal, Local 04C, Valencia 2001, Carabobo, Venezuela',

  // Opcional: logo en base64 (data URL o solo el base64) para que el
  // reporte lo muestre en el membrete en lugar del nombre en texto.
  // Déjalo en null mientras no lo tengas.
  // Ejemplo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
  logoBase64: null,

  // Datos para que el cliente pague. Solo se imprimen si están completos.
  // Mientras no se confirmen más cuentas, deja solo lo verificado arriba:
  // NUNCA se inventan datos bancarios (si no hay lista, el bloque no se dibuja).
  // OJO: pdfBase.dibujarDatosPago() exige las claves `metodo` y `detalle`.
  datosPago: [
    { metodo: 'Zelle', detalle: '+58 414 5949532' },
    { metodo: 'Correo', detalle: 'dcarrisan@gmail.com' },
  ],
}

export default empresaInfo