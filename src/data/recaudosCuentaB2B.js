// src/data/recaudosCuentaB2B.js
const recaudosB2BInfo = {
  etiqueta: 'Cuenta B2B',
  etiquetaIcono: 'FileText',
  titulo: 'Recaudos para abrir una cuenta B2B',
  subtitulo: 'Antes de activar tu línea de crédito, necesitamos estos datos básicos de tu negocio.',
  tipo: 'checklist',
  contenido: [
    'RIF de la institucion',
    'Dirección fiscal',
    'Dirección de entrega',
    'Datos de contacto (teléfono y correo)',
    // TODO: confirmar si se requiere algo más — registro mercantil, referencias
    // comerciales, permiso sanitario, etc.
  ],
}

export default recaudosB2BInfo
