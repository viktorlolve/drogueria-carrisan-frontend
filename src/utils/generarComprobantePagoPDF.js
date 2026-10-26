// src/utils/generarComprobantePagoPDF.js
//
// Comprobante (recibo) de un pago registrado.
//
// Formato MEDIA HOJA (A5, 148 × 210 mm): entra dos veces en una hoja carta, se
// imprime rápido y se lee de un vistazo. El QR de verificación vive DENTRO de
// la banda del encabezado (18 mm, caja blanca) para no gastar alto en la típica
// tarjeta al pie, y el FOLIO lo acompaña como identidad del documento.
//
// Este archivo es el MOLDE de los documentos que se vayan rediseñando: mismo
// encabezado con QR, mismas tarjetas, mismo pie. Para otro tamaño basta pasar
// `pagina` a `nuevoDoc` (que vuelve a A4 solo en cada llamada).
//
// Presupuesto vertical (A5 = 210 mm, Y_LIMITE = 184): header 28 + cliente 21.5
// + monto 22 + detalle ~37 + gaps de 5.5 + sección 6 + tabla (10 + 8/fila)
// ⇒ ~178 mm con 2 facturas, todo en UNA página. Si se agregan bloques hay que
// recortar en otro sitio o aceptar la paginación (la tabla salta sola).
//
// Uso:  await generarComprobantePagoPDF({ pago, cliente, facturas? })
// `facturas` (opcional) = lista de facturas del cliente; sirve para mostrar el
// N.º de factura en vez del id interno en "Aplicado a".

import {
  PAG,
  Y_LIMITE,
  C,
  datosEmpresa,
  nuevoDoc,
  dibujarPie,
  dibujarSeccion,
  dibujarTarjetaCampos,
  dibujarPildora,
  dibujarTabla,
  conOpacidad,
  usdCode,
  bs,
  fechaLarga,
  fechaCorta,
  fechaHora,
  urlVerificacion,
  qrDataUrl,
} from './pdf/pdfBase'

const METODOS = {
  transferencia: 'Transferencia bancaria',
  pago_movil: 'Pago móvil',
  zelle: 'Zelle',
  efectivo: 'Efectivo',
  abono: 'Abono',
  otro: 'Otro',
}

// A5 (media hoja) con márgenes parejos: 148 - 12 · 2 = 124 mm útiles.
const PAGINA_COMPROBANTE = { ancho: 148, alto: 210, margen: 12 }

/* Recorta a UNA línea. En 124 mm de ancho un nombre institucional largo no
   cabe, y dejar que envuelva descoloca toda la tarjeta. */
function unaLinea(doc, texto, ancho) {
  const lineas = doc.splitTextToSize(String(texto ?? ''), ancho)
  if (lineas.length <= 1) return lineas[0] || ''
  return `${lineas[0].replace(/[\s,;:·-]+$/, '')}…`
}

export default async function generarComprobantePagoPDF({ pago, cliente, facturas = [] }) {
  const doc = await nuevoDoc({ pagina: PAGINA_COMPROBANTE })
  const e = datosEmpresa()

  let y = PAG.margen

  // ---------------------------------------------------------------------------
  // Encabezado: banda teal con título, empresa, folio y QR de verificación
  // ---------------------------------------------------------------------------
  const altoHeader = 28
  doc.setFillColor(...C.teal)
  doc.roundedRect(PAG.margen, y, PAG.contenido, altoHeader, 4, 4, 'F')
  conOpacidad(doc, 0.12, () => {
    doc.setFillColor(...C.blanco)
    doc.circle(PAG.margen + PAG.contenido - 2, y - 2, 22, 'F')
  })

  // QR sobre caja blanca, alineado a la derecha de la banda
  const codigo = pago.codigo_verificacion
  const cajaQr = 21
  const xCajaQr = PAG.margen + PAG.contenido - 4 - cajaQr
  if (codigo) {
    try {
      const qr = await qrDataUrl(urlVerificacion('pago', pago.id, codigo), { width: 300 })
      doc.setFillColor(...C.blanco)
      doc.roundedRect(xCajaQr, y + 3.5, cajaQr, cajaQr, 2, 2, 'F')
      doc.addImage(qr, 'PNG', xCajaQr + 1.5, y + 5, cajaQr - 3, cajaQr - 3)
    } catch {
      /* Sin QR el documento sigue identificado por su folio. */
    }
  }

  // Columna izquierda: título, empresa, contacto y folio/fecha
  const xIzq = PAG.margen + 7
  const anchoIzq = (codigo ? xCajaQr : PAG.margen + PAG.contenido - 4) - xIzq - 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.blanco)
  doc.text('COMPROBANTE DE PAGO', xIzq, y + 7.5, { charSpace: 1.2 })

  doc.setFontSize(11.5)
  doc.text(unaLinea(doc, String(e.nombre || '').toUpperCase(), anchoIzq), xIzq, y + 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(220, 245, 242)
  const lineaEmpresa = [e.rif && `RIF ${e.rif}`, e.telefono, e.email].filter(Boolean).join('  ·  ')
  if (lineaEmpresa) doc.text(unaLinea(doc, lineaEmpresa, anchoIzq), xIzq, y + 20)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...C.blanco)
  doc.text(
    unaLinea(doc, `FOLIO N.º ${pago.id}   ·   ${fechaLarga(pago.created_at)}`, anchoIzq),
    xIzq,
    y + 25,
  )

  y += altoHeader + 5.5

  // ---------------------------------------------------------------------------
  // Recibido de
  // ---------------------------------------------------------------------------
  const lineaContacto = [
    cliente?.rif_cedula && `RIF / C.I. ${cliente.rif_cedula}`,
    cliente?.telefono,
    cliente?.email,
  ]
    .filter(Boolean)
    .join('   ·   ')
  const tieneDireccion = Boolean(cliente?.direccion_fiscal)
  const altoCliente = tieneDireccion ? 21.5 : 17.5

  doc.setFillColor(...C.gris)
  doc.setDrawColor(...C.borde)
  doc.setLineWidth(0.2)
  doc.roundedRect(PAG.margen, y, PAG.contenido, altoCliente, 3, 3, 'FD')

  const xCliente = PAG.margen + 6
  const anchoCliente = PAG.contenido - 12

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.teal)
  doc.text('RECIBIDO DE', xCliente, y + 5, { charSpace: 0.8 })

  doc.setFontSize(10.5)
  doc.setTextColor(...C.indigo)
  doc.text(unaLinea(doc, cliente?.nombre || 'Cliente', anchoCliente), xCliente, y + 10.6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  doc.text(unaLinea(doc, lineaContacto || '—', anchoCliente), xCliente, y + 15.2)

  if (tieneDireccion) {
    doc.setFontSize(7)
    doc.text(unaLinea(doc, cliente.direccion_fiscal, anchoCliente), xCliente, y + 18.9)
  }

  y += altoCliente + 5.5

  // ---------------------------------------------------------------------------
  // Monto protagonista
  // ---------------------------------------------------------------------------
  const altoMonto = 22
  doc.setFillColor(...C.verde)
  doc.roundedRect(PAG.margen, y, PAG.contenido, altoMonto, 4, 4, 'F')
  conOpacidad(doc, 0.12, () => {
    doc.setFillColor(...C.blanco)
    doc.circle(PAG.margen + PAG.contenido - 6, y + 4, 18, 'F')
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(214, 240, 222)
  doc.text('MONTO RECIBIDO', PAG.margen + 8, y + 6.5, { charSpace: 1 })

  doc.setFontSize(21)
  doc.setTextColor(...C.blanco)
  doc.text(usdCode(pago.monto), PAG.margen + 8, y + 17.5)

  // Píldora de estado a la derecha
  dibujarPildora(doc, PAG.margen + PAG.contenido - 8, y + 6.5, 'PAGO REGISTRADO', {
    fondo: C.blanco,
    color: C.verde,
    align: 'right',
  })

  if (pago.monto_bs != null && pago.tasa_usada != null) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(214, 240, 222)
    doc.text(
      `${bs(pago.monto_bs)}  ·  tasa ${Number(pago.tasa_usada).toFixed(2)}`,
      PAG.margen + PAG.contenido - 8,
      y + 17.5,
      { align: 'right' },
    )
  }

  y += altoMonto + 5.5

  // ---------------------------------------------------------------------------
  // Detalle del pago
  // ---------------------------------------------------------------------------
  y = dibujarTarjetaCampos(doc, y, {
    titulo: 'Detalle del pago',
    columnas: 2,
    campos: [
      {
        label: 'Método de pago',
        valor: METODOS[pago.tipo] || pago.tipo || 'No especificado',
        destacado: true,
      },
      { label: 'Fecha y hora', valor: fechaHora(pago.created_at) },
      { label: 'Referencia / detalle', valor: pago.detalle || '—', completo: true },
    ],
  })

  // ---------------------------------------------------------------------------
  // Facturas aplicadas
  // ---------------------------------------------------------------------------
  if (pago.pago_facturas?.length > 0) {
    // Evita la sección huérfana: si el título entrara pero la tabla no, la
    // tabla arrancaría en la página 2 dejando el título solo en la 1.
    if (y + 30 > Y_LIMITE) {
      doc.addPage()
      y = PAG.margen + 6
    }
    y = dibujarSeccion(doc, y, 'Aplicado a las siguientes facturas')
    const porId = new Map(facturas.map((f) => [f.id, f]))
    y = dibujarTabla(
      doc,
      y,
      [
        { label: 'Factura', ancho: 52, bold: true },
        { label: 'Emitida', ancho: 38 },
        { label: 'Monto factura', ancho: 34, align: 'right' },
      ],
      pago.pago_facturas.map((pf) => {
        const f = porId.get(pf.factura_id)
        return [
          f ? `N.º ${f.numero_factura}` : `Factura #${pf.factura_id}`,
          f ? fechaCorta(f.created_at) : '—',
          f ? usdCode(f.monto_facturado) : '—',
        ]
      }),
    )
  }

  // ---------------------------------------------------------------------------
  // Pie
  // ---------------------------------------------------------------------------
  dibujarPie(doc, 'Comprobante de abono. Documento generado automáticamente.')

  doc.save(`comprobante-pago-${pago.id}.pdf`)
}
