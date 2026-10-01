// src/utils/generarFacturaPDF.js
//
// PDF de una factura individual. Diseño "banca moderna": membrete con degradado
// Índigo→Azul, tarjeta del cliente, tabla de productos, total destacado y un
// bloque de verificación con QR (código HMAC que emite el backend).
//
// Uso (sin cambios):  await generarFacturaPDF({ factura, cliente })
// `factura` = registro de GET /clientes/:id/estado-cuenta (incluye codigo_verificacion).

import {
  C, PAG, usd, fechaLarga, fechaCorta,
  nuevoDoc, dibujarMembrete, dibujarPie, dibujarSeccion, dibujarTarjetaCliente,
  dibujarTarjetaDatos, dibujarTabla, dibujarTotal, dibujarVerificacion, dibujarDatosPago,
} from './pdf/pdfBase'

// Normaliza una línea de ordenes_items probando nombres de columna comunes.
function leerItem(item) {
  const nombre = item.productos?.nombre_comercial || item.nombre || item.descripcion || 'Producto'
  const cantidad = Number(item.cantidad ?? item.qty ?? 1)
  const subtotal = Number(item.subtotal ?? item.total ?? item.monto ?? 0)
  const precioUnit = Number(item.precio_unitario_usd ?? item.precio_unitario ?? (cantidad ? subtotal / cantidad : 0))
  return { nombre, cantidad, precioUnit, subtotal: subtotal || precioUnit * cantidad }
}

function extraerItems(factura) {
  const items = []
  ;(factura.factura_ordenes || []).forEach((fo) => {
    ;(fo.ordenes?.ordenes_items || []).forEach((item) => items.push(leerItem(item)))
  })
  return items
}

export default async function generarFacturaPDF({ factura, cliente }) {
  const doc = await nuevoDoc()

  let y = dibujarMembrete(doc, {
    etiqueta: 'Factura',
    numero: `N.º ${factura.numero_factura}`,
    sub: `Emitida el ${fechaLarga(factura.created_at)}`,
  })

  y = dibujarTarjetaCliente(doc, y, cliente, 'Facturado a')

  const ordenes = (factura.factura_ordenes || []).map((fo) => `#${fo.orden_id}`).filter(Boolean)
  y = dibujarTarjetaDatos(doc, y, 'Detalle del documento', [
    { label: 'Fecha de emisión', valor: fechaCorta(factura.created_at) },
    { label: 'Órdenes asociadas', valor: ordenes.length ? ordenes.join(', ') : '—' },
    { label: 'Moneda', valor: 'USD (dólares)' },
  ])

  const items = extraerItems(factura)
  y = dibujarSeccion(doc, y, 'Productos facturados')
  y = dibujarTabla(
    doc, y,
    [
      { label: 'Producto', ancho: 98 },
      { label: 'Cant.', ancho: 16, align: 'center' },
      { label: 'Precio unit.', ancho: 30, align: 'right' },
      { label: 'Subtotal', ancho: 32, align: 'right', bold: true },
    ],
    items.map((it) => [it.nombre, String(it.cantidad), usd(it.precioUnit), usd(it.subtotal)]),
    { vacio: 'Esta factura no tiene el detalle de productos disponible (orden telefónica o sin líneas registradas).' }
  )

  // El total real es siempre monto_facturado (fuente de verdad).
  const total = Number(factura.monto_facturado)
  const sumaItems = items.reduce((s, it) => s + it.subtotal, 0)
  if (items.length > 0 && Math.abs(sumaItems - total) > 0.01) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text('Subtotal de productos', PAG.margen + PAG.contenido - 38, y, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.texto)
    doc.text(usd(sumaItems), PAG.margen + PAG.contenido, y, { align: 'right' })
    y += 7
  }
  y = dibujarTotal(doc, y, 'Total facturado', usd(total))

  if (factura.nota) {
    y = dibujarSeccion(doc, y, 'Nota')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...C.texto)
    const lineas = doc.splitTextToSize(String(factura.nota), PAG.contenido)
    doc.text(lineas, PAG.margen, y)
    y += lineas.length * 4.6 + 6
  }

  y = dibujarDatosPago(doc, y)
  await dibujarVerificacion(doc, y, {
    tipo: 'factura',
    id: factura.id,
    codigo: factura.codigo_verificacion,
    folio: factura.numero_factura,
  })

  dibujarPie(doc, 'Documento generado automáticamente, no requiere firma.')
  doc.save(`factura-${factura.numero_factura}.pdf`)
}
