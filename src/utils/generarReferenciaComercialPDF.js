// src/utils/generarReferenciaComercialPDF.js
//
// Carta de referencia comercial que el cliente se descarga para respaldar su
// solicitud de crédito ante un banco. NO lleva QR de verificación: lo que se
// verifica en la plataforma son facturas y pagos, y esta carta es un texto
// firmado por la empresa, no un registro de la base de datos.
//
// Uso:  await generarReferenciaComercialPDF({ nombre, identificacion })

import {
  C, PAG, fechaLarga, Y_LIMITE, datosEmpresa,
  nuevoDoc, dibujarMembrete, dibujarPie,
} from './pdf/pdfBase'

const FIRMANTE = { nombre: 'Víctor H. Carrillo S.', cargo: 'Director General' }

// Párrafo que salta de página si no cabe entero y devuelve la Y final.
function parrafo(doc, y, texto, { size = 10.5, interlineado = 5.2 } = {}) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(size)
  doc.setTextColor(...C.texto)
  const lineas = doc.splitTextToSize(texto, PAG.contenido)
  if (y + lineas.length * interlineado > Y_LIMITE) {
    doc.addPage()
    y = 20
  }
  doc.text(lineas, PAG.margen, y)
  return y + lineas.length * interlineado + 4
}

export default async function generarReferenciaComercialPDF({ nombre, identificacion }) {
  const doc = await nuevoDoc()
  const empresa = datosEmpresa()

  let y = dibujarMembrete(doc, {
    etiqueta: 'Referencia comercial',
    sub: `Emitida el ${fechaLarga(new Date())}`,
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(...C.muted)
  doc.text('Caracas, ' + fechaLarga(new Date()), PAG.margen, y)
  y += 16

  y = parrafo(doc, y, 'A quien pudiera interesar:', { size: 11 })

  y = parrafo(
    doc, y,
    `Por medio de la presente, ${empresa.nombre} hace constar que ${nombre}, titular de la ` +
    `Cédula/RIF N.° ${identificacion}, es cliente comercial de nuestra empresa, con quien ` +
    'mantenemos relaciones comerciales activas.'
  )

  y = parrafo(
    doc, y,
    'Durante este tiempo, el cliente ha manejado montos de siete (7) cifras o más de forma ' +
    'trimestral, cumpliendo satisfactoriamente con sus compromisos comerciales.'
  )

  y = parrafo(
    doc, y,
    'La presente referencia se emite a solicitud del interesado, para los fines que estime conveniente.'
  )

  y = parrafo(doc, y, 'Sin otro particular,')
  y = parrafo(doc, y, 'Atentamente,')

  // ---- Firma ----
  if (y + 34 > Y_LIMITE) { doc.addPage(); y = 20 }
  doc.setDrawColor(...C.texto)
  doc.setLineWidth(0.3)
  doc.line(PAG.margen, y + 14, PAG.margen + 84, y + 14)
  y += 18
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...C.indigo)
  doc.text(FIRMANTE.nombre, PAG.margen, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...C.muted)
  doc.text(FIRMANTE.cargo, PAG.margen, y)
  y += 5
  doc.text(`${empresa.nombre}${empresa.rif ? `, RIF ${empresa.rif}` : ''}`, PAG.margen, y)

  dibujarPie(doc, 'Documento generado automáticamente por la plataforma.')

  const slug = String(nombre).trim().toLowerCase().replace(/\s+/g, '-')
  doc.save(`referencia-comercial-${slug}.pdf`)
}