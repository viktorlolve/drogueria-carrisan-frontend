// src/utils/generarComprobantePagoPDF.js
//
// Comprobante (recibo) de un pago registrado. Monto protagonista, detalle del
// método, facturas a las que se aplicó y QR de verificación.
//
// Uso:  await generarComprobantePagoPDF({ pago, cliente, facturas? })
// `facturas` (opcional) = lista de facturas del cliente; sirve para mostrar el
// N.º de factura en vez del id interno en "Aplicado a".

import {
  C, PAG, usdCode, bs, fechaLarga, fechaHora, conOpacidad,
  nuevoDoc, dibujarMembrete, dibujarPie, dibujarSeccion, dibujarTarjetaCliente,
  dibujarTarjetaDatos, dibujarPildora, dibujarTabla, dibujarVerificacion,
} from './pdf/pdfBase'

const METODOS = {
  transferencia: 'Transferencia bancaria',
  pago_movil: 'Pago móvil',
  zelle: 'Zelle',
  efectivo: 'Efectivo',
  abono: 'Abono',
  otro: 'Otro',
}

export default async function generarComprobantePagoPDF({ pago, cliente, facturas = [] }) {
  const doc = await nuevoDoc()

  let y = dibujarMembrete(doc, {
    etiqueta: 'Comprobante de pago',
    numero: `Recibo N.º ${pago.id}`,
    sub: fechaLarga(pago.created_at),
  })

  y = dibujarTarjetaCliente(doc, y, cliente, 'Recibido de')

  // ---- Monto protagonista ----
  const alto = 34
  doc.setFillColor(...C.verde)
  doc.roundedRect(PAG.margen, y, PAG.contenido, alto, 4, 4, 'F')
  conOpacidad(doc, 0.1, () => {
    doc.setFillColor(255, 255, 255)
    doc.circle(PAG.margen + PAG.contenido - 8, y + 2, 22, 'F')
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(214, 240, 222)
  doc.text('MONTO RECIBIDO', PAG.margen + 10, y + 11, { charSpace: 1 })
  doc.setFontSize(26)
  doc.setTextColor(...C.blanco)
  doc.text(usdCode(pago.monto), PAG.margen + 10, y + 25)
  dibujarPildora(doc, PAG.margen + PAG.contenido - 10, y + 12, 'PAGO REGISTRADO', {
    fondo: C.blanco, color: C.verde, align: 'right',
  })
  if (pago.monto_bs != null && pago.tasa_usada != null) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(214, 240, 222)
    doc.text(`${bs(pago.monto_bs)}  ·  tasa ${Number(pago.tasa_usada).toFixed(2)}`, PAG.margen + PAG.contenido - 10, y + 26, { align: 'right' })
  }
  y += alto + 8

  // ---- Detalle ----
  const campos = [
    { label: 'Método de pago', valor: METODOS[pago.tipo] || pago.tipo || 'No especificado', destacado: true },
    { label: 'Fecha y hora', valor: fechaHora(pago.created_at) },
    { label: 'Referencia / detalle', valor: pago.detalle || '—' },
  ]
  y = dibujarTarjetaDatos(doc, y, 'Detalle del pago', campos)

  // ---- Facturas aplicadas ----
  if (pago.pago_facturas?.length > 0) {
    y = dibujarSeccion(doc, y, 'Aplicado a las siguientes facturas')
    const porId = new Map(facturas.map((f) => [f.id, f]))
    y = dibujarTabla(
      doc, y,
      [
        { label: 'Factura', ancho: 60, bold: true },
        { label: 'Emitida', ancho: 50 },
        { label: 'Monto factura', ancho: 50, align: 'right' },
      ],
      pago.pago_facturas.map((pf) => {
        const f = porId.get(pf.factura_id)
        return [
          f ? `N.º ${f.numero_factura}` : `Factura #${pf.factura_id}`,
          f ? fechaLarga(f.created_at) : '—',
          f ? usdCode(f.monto_facturado) : '—',
        ]
      })
    )
  }

  await dibujarVerificacion(doc, y, {
    tipo: 'pago', id: pago.id, codigo: pago.codigo_verificacion, folio: pago.id,
  })

  dibujarPie(doc, 'Este comprobante es constancia de abono. Documento generado automáticamente.')
  doc.save(`comprobante-pago-${pago.id}.pdf`)
}
