// src/utils/generarPresupuestoPDF.js
//
// Presupuesto del cliente (`/presupuesto`). A diferencia de la factura, los
// ítems sin precio no se cobran: van en una tabla aparte y quedan fuera del
// total, igual que en pantalla.
//
// Uso:  await generarPresupuestoPDF({ detalle })
//
// Sin QR: los presupuestos no son verificables (el allowlist del backend es
// factura|pago) y un QR que apunta a un 404 sería peor que ninguno.

import {
  C, PAG, usd, fechaCorta, fechaLarga,
  nuevoDoc, dibujarMembrete, dibujarPie, dibujarSeccion, dibujarTarjetaDatos,
  dibujarPildora, dibujarTabla, dibujarTotal, dibujarDatosPago,
} from './pdf/pdfBase'

function leerItem(i) {
  const cantidad = Number(i.cantidad || 0)
  const precio = Number(i.precio_unitario || 0)
  return {
    nombre: i.nombre_comercial || `Producto #${i.producto_id}`,
    cantidad,
    precio,
    subtotal: Number(i.subtotal || 0) || precio * cantidad,
  }
}

export default async function generarPresupuestoPDF({ detalle }) {
  const doc = await nuevoDoc()

  let y = dibujarMembrete(doc, {
    etiqueta: 'Presupuesto',
    numero: `N.º ${detalle.numero}`,
    sub: `Emitido el ${fechaLarga(detalle.fecha_creacion)}`,
  })

  const vencido = new Date(detalle.fecha_expiracion).getTime() < Date.now()

  y = dibujarTarjetaDatos(doc, y, 'Vigencia', [
    { label: 'Emitido', valor: fechaCorta(detalle.fecha_creacion) },
    { label: 'Válido hasta', valor: fechaCorta(detalle.fecha_expiracion), destacado: true },
    { label: 'Líneas del presupuesto', valor: `${detalle.items?.length || 0} producto(s)` },
  ])
  dibujarPildora(doc, PAG.ancho - PAG.margen, y - 3, vencido ? 'VENCIDO' : 'VIGENTE', {
    fondo: vencido ? C.rojoClaro : C.verdeClaro,
    color: vencido ? C.rojo : C.verde,
    align: 'right',
  })

  const items = detalle.items || []
  const disponibles = items.filter((i) => i.disponible).map(leerItem)
  const noDisponibles = items.filter((i) => !i.disponible).map(leerItem)

  y = dibujarSeccion(doc, y, 'Productos disponibles')
  y = dibujarTabla(
    doc, y,
    [
      { label: 'Producto', ancho: 96 },
      { label: 'Cant.', ancho: 16, align: 'center' },
      { label: 'P. unitario', ancho: 30, align: 'right' },
      { label: 'Subtotal', ancho: 32, align: 'right', bold: true },
    ],
    disponibles.map((it) => [it.nombre, String(it.cantidad), usd(it.precio), usd(it.subtotal)]),
    { vacio: 'Ningún producto de este presupuesto está disponible por ahora.' }
  )

  if (noDisponibles.length > 0) {
    y = dibujarSeccion(doc, y, 'Sin precio disponible (no se incluyen en el total)')
    y = dibujarTabla(
      doc, y,
      [
        { label: 'Producto', ancho: 120 },
        { label: 'Cant.', ancho: 16, align: 'center' },
        { label: 'Precio', ancho: 38, align: 'right', color: C.muted },
      ],
      noDisponibles.map((it) => [it.nombre, String(it.cantidad), 'Por definir']),
      { fuente: 8 }
    )
  }

  const total = disponibles.reduce((s, it) => s + it.subtotal, 0)
  y = dibujarTotal(doc, y, 'Total del presupuesto', usd(total))

  dibujarDatosPago(doc, y)

  dibujarPie(
    doc,
    'Presupuesto sin valor fiscal: no es una factura. Los precios pueden variar hasta la emisión de la factura.'
  )
  doc.save(`presupuesto-${detalle.numero}.pdf`)
}