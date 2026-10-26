// src/utils/generarComprobantePagoPDF.js
//
// Comprobante (recibo) de un pago registrado. Monto protagonista, detalle del
// método, facturas a las que se aplicó. Formato A4 con diseno compacto,
// sin QR, sin membrete degradado, diseño moderno y limpio.
//
// Uso:  await generarComprobantePagoPDF({ pago, cliente, facturas? })
// `facturas` (opcional) = lista de facturas del cliente; sirve para mostrar el
// N.º de factura en vez del id interno en "Aplicado a".
//
// NOTA: El QR de verificación se eliminó porque las suscripciones push no
// llegan a la mayoría de usuarios (ver AGENTS.md "VAPID: la clave llega al
// frontend por DOS caminos distintos"). La verificación se hace por número
// de folio en la UI, no mediante código QR en el PDF.
//
// Se usa el formato A4 del módulo base (margenes de 16 mm, contenido 178 mm)
// pero todo el contenido está apilado y compactado para sentir el documento
// más liviano que el anterior (que tenía membrete degradado, logo y QR).
//
// importar: nuevoDoc, dibujarTarjetaCliente, dibujarTarjetaDatos,
//   dibujarSeccion, dibujarPildora, dibujarTabla

import { PAG, usdCode, bs, fechaLarga, fechaHora, conOpacidad } from './pdf/pdfBase'

const METODOS = {
  transferencia: 'Transferencia bancaria',
  pago_movil: 'Pago móvil',
  zelle: 'Zelle',
  efectivo: 'Efectivo',
  abono: 'Abono',
  otro: 'Otro',
}

/** Fila inicial Y después del header (el header ocupa 12 mm altos) */
const Y_HEADER_FIN = 12

export default async function generarComprobantePagoPDF({ pago, cliente, facturas = [] }) {
  const doc = await nuevoDoc()

  let y = Y_HEADER_FIN

  // ---------- Header minimalista: solo título en cinta teal ----------
  doc.setFillColor(...C.teal)
  doc.roundedRect(PAG.margen, y, PAG.contenido, 8, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.blanco)
  doc.text('COMPROBANTE DE PAGO', PAG.margen, y + 5, { align: 'center' })

  y = Y_HEADER_FIN + 12

  // ---------- Tarjeta cliente ----------
  y = dibujarTarjetaCliente(doc, y, cliente, 'Recibido de')

  // --- Bloque MONTO PROTAGONISTA (tarjeta verde grande) ---
  const altoMonto = 30
  doc.setFillColor(...C.verde)
  doc.roundedRect(PAG.margen, y, PAG.contenido, altoMonto, 5, 5, 'F')
  conOpacidad(doc, 0.1, () => {
    doc.setFillColor(255, 255, 255)
    doc.circle(PAG.margen + PAG.contenido - 8, y + 3, 22, 'F')
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(214, 240, 222)
  doc.text('MONTO RECIBIDO', PAG.margen + 8, y + 9, { charSpace: 0.5 })
  doc.setFontSize(24)
  doc.setTextColor(...C.blanco)
  doc.text(usdCode(pago.monto), PAG.margen + 8, y + 23)
  // Píldora PAGO REGISTRADO a la derecha
  dibujarPildora(doc, PAG.margen + PAG.contenido - 10, y + 8, 'PAGO REGISTRADO', {
    fondo: C.blanco, color: C.verde, align: 'right',
  })

  if (pago.monto_bs != null && pago.tasa_usada != null) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(214, 240, 222)
    doc.text(`${bs(pago.monto_bs)}  ·  tasa ${Number(pago.tasa_usada).toFixed(2)}`, PAG.margen + PAG.contenido - 10, y + 24, { align: 'right' })
  }
  y += altoMonto + 10

  // --- Detalle del pago (3 columnas) ---
  const campos = [
    { label: 'Método de pago', valor: METODOS[pago.tipo] || pago.tipo || 'No especificado', destacado: true },
    { label: 'Fecha y hora', valor: fechaHora(pago.created_at) },
    { label: 'Referencia / detalle', valor: pago.detalle || '—' },
  ]
  y = dibujarTarjetaDatos(doc, y, 'Detalle del pago', campos, { columnas: 3 })

  // --- Facturas aplicadas (tabla compacta) ---
  if (pago.pago_facturas?.length > 0) {
    y = dibujarSeccion(doc, y, 'Aplicado a las siguientes facturas')
    const porId = new Map(facturas.map((f) => [f.id, f]))
    y = dibujarTabla(
      doc, y,
      [
        { label: 'Factura', ancho: 50, bold: true },
        { label: 'Emitida', ancho: 45 },
        { label: 'Monto factura', ancho: 45, align: 'right' },
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

  // --- Pie (sin QR) ---
  // El QR se quitó por completo. La verificación del documento se hace
  // por número de folio en la interfaz de usuario.
  dibujarPie(doc, 'Este comprobante es constancia de abono. Documento generado automáticamente.')

  doc.save(`comprobante-pago-${pago.id}.pdf`)
}