// src/utils/generarGuiaDespachoPDF.js
//
// Guía de despacho: el papel que lleva el motorizado / la agencia. NO es un
// comprobante de pago ni un resumen del pedido: solo lleva DATOS DEL ENVÍO
// (destinatario, destino, número de orden y modalidad). Los productos, los
// montos y el estado del pedido viven en el formato de Orden.
//
// Formato MEDIA HOJA (A5, 148 × 210 mm), mismo molde que el comprobante de
// pago: banda teal arriba, tarjetas con filas medidas y pie corto. Sin QR
// porque las órdenes todavía no tienen código de verificación en el backend.
//
// Presupuesto vertical (A5 = 210 mm, Y_LIMITE = 184):
// header 28 → 45.5 · destinatario ~34 → ~80 · destino ~29 → ~115 ·
// recibí conforme 40 → ~160 · pie 195. Todo en UNA página.
//
// Uso:  await generarGuiaDespachoPDF(orden)

import {
  C,
  PAG,
  Y_LIMITE,
  datosEmpresa,
  nuevoDoc,
  dibujarPie,
  dibujarTarjetaCampos,
  dibujarPildora,
  conOpacidad,
  fechaLarga,
} from './pdf/pdfBase'

// A5 (media hoja) con márgenes parejos: 148 - 12 · 2 = 124 mm útiles.
const PAGINA_GUIA = { ancho: 148, alto: 210, margen: 12 }

const MODALIDAD = {
  delivery: 'DELIVERY',
  envio_nacional: 'ENVÍO NACIONAL',
  retiro: 'RETIRO',
}

/* Recorta a UNA línea: en 124 mm de ancho un dato largo descoloca la banda. */
function unaLinea(doc, texto, ancho) {
  const lineas = doc.splitTextToSize(String(texto ?? ''), ancho)
  if (lineas.length <= 1) return lineas[0] || ''
  return `${lineas[0].replace(/[\s,;:·-]+$/, '')}…`
}

/* Solo datos del envío: a dónde va el paquete, no qué lleva dentro. */
function destinoDe(orden, e) {
  const d = orden.direcciones_envio

  if (orden.tipo_envio === 'envio_nacional') {
    // La agencia real viene por `agencia_envio_id` (migración 029); `agencia_envio`
    // es el texto libre legacy de las órdenes viejas.
    return {
      etiqueta: 'Agencia de envío',
      valor: orden.agencias_envio?.nombre || orden.agencia_envio || 'Sin agencia asignada',
      detalle: [d?.ciudad, d?.estado].filter(Boolean).join(', '),
    }
  }

  if (orden.tipo_envio === 'retiro') {
    return {
      etiqueta: 'Punto de retiro',
      valor: e.direccion || 'Mostrador de la droguería',
      detalle: null,
    }
  }

  return {
    etiqueta: 'Dirección de entrega',
    valor: d?.direccion || 'Sin dirección registrada',
    detalle: [d?.ciudad, d?.estado].filter(Boolean).join(', '),
  }
}

/* Tarjeta de destino: se dibuja a mano porque la dirección es multilínea y en
   124 mm de ancho `dibujarTarjetaDatos` (filas fijas) se saldría de la caja. */
function dibujarDestino(doc, y, destino) {
  const pad = 6
  const ancho = PAG.contenido - pad * 2
  const altoTitulo = 7.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  const lineasValor = doc.splitTextToSize(String(destino.valor ?? '—'), ancho)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const lineasDetalle = destino.detalle
    ? doc.splitTextToSize(String(destino.detalle), ancho)
    : []

  // 15.5 = título + etiqueta + primera línea del valor.
  const alto =
    15.5 +
    (lineasValor.length - 1) * 4.8 +
    (lineasDetalle.length ? 4.2 + (lineasDetalle.length - 1) * 3.9 : 0) +
    4.5

  doc.setFillColor(...C.gris)
  doc.setDrawColor(...C.borde)
  doc.setLineWidth(0.2)
  doc.roundedRect(PAG.margen, y, PAG.contenido, alto, 3, 3, 'FD')

  const x = PAG.margen + pad

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.teal)
  doc.text('DESTINO', x, y + 5.5, { charSpace: 0.8 })

  doc.setFontSize(6.5)
  doc.setTextColor(...C.muted)
  doc.text(String(destino.etiqueta).toUpperCase(), x, y + altoTitulo + 3, { charSpace: 0.4 })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...C.indigo)
  doc.text(lineasValor, x, y + altoTitulo + 8)

  if (lineasDetalle.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.muted)
    doc.text(lineasDetalle, x, y + altoTitulo + 8 + lineasValor.length * 4.8 + 1.6)
  }

  return y + alto + 5.5
}

/* Bloque de firma: dos filas (nombre/cédula y firma/fecha) sobre la tarjeta. */
function dibujarRecibiConforme(doc, y) {
  const alto = 40
  const pad = 6

  // Un solo bloque, así que si no cabe se empuja a la página siguiente en vez
  // de partir la tarjeta por la mitad.
  if (y + alto > Y_LIMITE) {
    doc.addPage()
    y = PAG.margen + 6
  }

  doc.setFillColor(...C.gris)
  doc.setDrawColor(...C.borde)
  doc.setLineWidth(0.2)
  doc.roundedRect(PAG.margen, y, PAG.contenido, alto, 3, 3, 'FD')

  const x = PAG.margen + pad
  const ancho = PAG.contenido - pad * 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.teal)
  doc.text('RECIBÍ CONFORME', x, y + 5.5, { charSpace: 0.8 })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...C.muted)
  doc.text('Verifique el estado del paquete antes de firmar.', x, y + 10)

  const anchoIzq = 62
  const xDer = x + anchoIzq + 10
  const anchoDer = x + ancho - xDer

  const fila = (yy, etiquetaIzq, etiquetaDer) => {
    doc.setDrawColor(...C.borde)
    doc.setLineWidth(0.3)
    doc.line(x, yy, x + anchoIzq, yy)
    doc.line(xDer, yy, xDer + anchoDer, yy)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...C.muted)
    doc.text(etiquetaIzq, x, yy + 3.6)
    doc.text(etiquetaDer, xDer, yy + 3.6)
  }

  fila(y + 20.5, 'Nombre y apellido', 'Cédula de identidad')
  fila(y + 31.5, 'Firma del receptor', 'Fecha y hora')

  return y + alto + 5.5
}

export default async function generarGuiaDespachoPDF(orden) {
  const doc = await nuevoDoc({ pagina: PAGINA_GUIA })
  const e = datosEmpresa()

  let y = PAG.margen

  // ---------------------------------------------------------------------------
  // Encabezado: banda teal con la ORDEN como identidad + modalidad del envío
  // ---------------------------------------------------------------------------
  const altoHeader = 28
  doc.setFillColor(...C.teal)
  doc.roundedRect(PAG.margen, y, PAG.contenido, altoHeader, 4, 4, 'F')
  conOpacidad(doc, 0.12, () => {
    doc.setFillColor(...C.blanco)
    doc.circle(PAG.margen + PAG.contenido - 2, y - 2, 22, 'F')
  })

  const xIzq = PAG.margen + 7
  const anchoIzq = PAG.contenido - 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.blanco)
  doc.text('GUÍA DE DESPACHO', xIzq, y + 7, { charSpace: 1.2 })

  doc.setFontSize(17)
  doc.text(`ORDEN N.º ${orden.id}`, xIzq, y + 16.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(220, 245, 242)
  const lineaEmpresa = [e.rif && `RIF ${e.rif}`, e.telefono, e.email].filter(Boolean).join('  ·  ')
  if (lineaEmpresa) doc.text(unaLinea(doc, lineaEmpresa, anchoIzq), xIzq, y + 21.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...C.blanco)
  doc.text(fechaLarga(orden.created_at), xIzq, y + 26)

  const modalidad =
    MODALIDAD[orden.tipo_envio] || String(orden.tipo_envio || 'SIN MODALIDAD').toUpperCase()
  dibujarPildora(doc, PAG.margen + PAG.contenido - 7, y + 7, modalidad, {
    fondo: C.blanco,
    color: C.teal,
    align: 'right',
  })

  y += altoHeader + 5.5

  // ---------------------------------------------------------------------------
  // Destinatario
  // ---------------------------------------------------------------------------
  y = dibujarTarjetaCampos(doc, y, {
    titulo: 'Destinatario',
    campos: [
      {
        label: 'Cliente',
        valor: orden.users?.nombre || 'Cliente',
        destacado: true,
        completo: true,
      },
      {
        // Teléfono y correo en una sola fila a todo el ancho: en dos columnas de
        // 56 mm un correo corporativo se parte a mitad de palabra.
        label: 'Teléfono / correo',
        valor:
          [orden.users?.telefono, orden.users?.email].filter(Boolean).join('   ·   ') || '—',
        completo: true,
      },
    ],
  })

  // ---------------------------------------------------------------------------
  // Destino
  // ---------------------------------------------------------------------------
  y = dibujarDestino(doc, y, destinoDe(orden, e))

  // ---------------------------------------------------------------------------
  // Firma de quien recibe
  // ---------------------------------------------------------------------------
  dibujarRecibiConforme(doc, y)

  dibujarPie(doc, 'Guía de despacho. No es un comprobante de pago ni una factura.')
  doc.save(`guia-orden-${orden.id}.pdf`)
}
