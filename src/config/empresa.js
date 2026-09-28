
// src/config/empresa.js
//
// Datos fijos de la empresa que aparecen en el membrete del reporte de
// estado de cuenta (y se pueden reutilizar en facturas u otros PDFs).
// Completa los placeholders marcados con TODO.

const empresaInfo = {
  nombre: 'Droguería Carrisan',
  tagline: 'Distribución farmacéutica y hospitalaria',
  rif: 'J-00000000-0', // TODO: coloca el RIF real de la empresa
  telefono: '+58 000-0000000', // TODO: teléfono de contacto
  email: 'dcarrisan@gmail.com',
  direccion: 'Dirección fiscal de la empresa, Ciudad, Venezuela', // TODO

  // Opcional: logo en base64 (data URL o solo el base64) para que el
  // reporte lo muestre en el membrete en lugar del nombre en texto.
  // Déjalo en null mientras no lo tengas.
  // Ejemplo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
  logoBase64: null,
}

export default empresaInfo
