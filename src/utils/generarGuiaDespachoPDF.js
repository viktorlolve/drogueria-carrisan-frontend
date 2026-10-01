// src/utils/generarGuiaDespachoPDF.js
//
// Guía de despacho: el papel que lleva el motorizado. No es un comprobante
// (eso es la factura) sino la lista física de lo que va en el pedido, con
// destino, modalidad y espacio para la firma de quien recibe.
//
// Uso:  await generarGuiaDespachoPDF(orden)
// Sustituye a la versión inline que vivía en utils/exportUtils.js
// (exportarGuiaDespacho), que quedó como re-export compatible.

import {
  C, PAG, usd, fechaLarga, Y_LIMITE,
  nuevoDoc, dibujarMembrete, dibujarPie, dibujarTarjetaDatos,
  dibujarSeccion, dibujarTabla, dibujarTotal,
} from './pdf/pdfBase'
import { getLabelEstado } from '../config/estadosOrden'

const MODALIDAD = {
  delivery: 'Delivery (moto)',
  envio_nacional: 'Envío nacional (agencia)',
  retiro: 'Retiro en tienda',
}

function destinoDe(orden) {
  if (orden.tipo_envio === 'envio_nacional') {
    // La agencia real viene por `agencia_envio_id` (migración 029), que el módulo
    // de Logística escribe; `agencia_envio` es el texto libre legacy. Se lee el
    // nombre de la tabla y se cae al legacy para las órdenes viejas.
    const nombre = orden.agencias_envio?.nombre || orden.agencia_envio
    return { etiqueta: 'Agencia de envío', valor: nombre || 'Sin agencia asignada' }
  }
  const d = orden.direcciones_envio
  return {
    etiqueta: 'Dirección de entrega',
    valor: d ? [d.direccion, d.ciudad, d.estado].filter(Boolean).join(', ') : '—',
  }
}

export default async function generarGuiaDespachoPDF(orden) {
  const doc = await nuevoDoc()

  let y = dibujarMembrete(doc, {
    etiqueta: 'Guía de despacho',
    numero: `Orden N.º ${orden.id}`,
    sub: fechaLarga(orden.created_at),
  })

  // Las líneas anuladas por el almacén no van en el papel: el motorizado no
  // debe cargar producto que la plataforma ya dio de baja.
  const items = (orden.ordenes_items || []).filter((i) => !i.anulado)
  const anuladas = (orden.ordenes_items || []).length - items.length

  y = dibujarTarjetaDatos(doc, y, 'Destinatario', [
    { label: 'Cliente', valor: orden.users?.nombre || 'Cliente', destacado: true },
    { label: 'Teléfono', valor: orden.users?.telefono || '—' },
    { label: 'Forma de pago', valor: orden.forma_pago === 'credito' ? 'Crédito' : 'Contado' },
  ])

  y = dibujarTarjetaDatos(
    doc, y, 'Entrega',
    [
      { label: 'Modalidad', valor: MODALIDAD[orden.tipo_envio] || orden.tipo_envio || '—' },
      {
        label: 'Estado del pedido',
        valor: getLabelEstado(orden.estado, { rol: 'staff', fulfillmentMethod: orden.tipo_envio }),
      },
    ],
    { columnas: 2 }
  )

  // El destino va a una columna completa: una dirección larga en 3 columnas se
  // sale de la tarjeta (el alto de la caja es fijo).
  const destino = destinoDe(orden)
  y = dibujarTarjetaDatos(
    doc, y, null,
    [{ label: destino.etiqueta, valor: destino.valor, destacado: true }],
    { columnas: 1 }
  )

  y = dibujarSeccion(doc, y, 'Productos a despachar')
  y = dibujarTabla(
    doc, y,
    [
      { label: 'Cant.', ancho: 14, align: 'center', bold: true },
      { label: 'Producto', ancho: 108 },
      { label: 'P. unitario', ancho: 28, align: 'right' },
      { label: 'Subtotal', ancho: 28, align: 'right' },
    ],
    items.map((i) => {
      const precio = Number(i.precio_unitario || 0)
      const cantidad = Number(i.cantidad || 0)
      return [
        String(cantidad),
        i.productos?.nombre_comercial || `Producto #${i.producto_id}`,
        usd(precio),
        usd(precio * cantidad),
      ]
    }),
    { vacio: 'Esta orden no tiene líneas de producto registradas.' }
  )

  if (anuladas > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text(
      `Nota: ${anuladas} línea(s) fueron anuladas por el almacén y no se despachan.`,
      PAG.margen, y
    )
    y += 6
  }

  const sumaItems = items.reduce((s, i) => s + Number(i.precio_unitario || 0) * Number(i.cantidad || 0), 0)
  const total = Number(orden.total_usd || 0)
  // Si el total de la orden no calza con sus líneas (descuento, ajuste manual),
  // se imprimen ambos para que el motorizado no firme sobre una cifra que no ve.
  if (items.length > 0 && Math.abs(sumaItems - total) > 0.01) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text('Suma de productos', PAG.margen + PAG.contenido - 38, y, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.texto)
    doc.text(usd(sumaItems), PAG.margen + PAG.contenido, y, { align: 'right' })
    y += 7
  }
  y = dibujarTotal(doc, y, 'Total de la orden', usd(total))

  // ---- Firma de quien recibe ----
  if (y + 26 > Y_LIMITE) { doc.addPage(); y = 20 }
  doc.setDrawColor(...C.borde)
  doc.setLineWidth(0.3)
  doc.line(PAG.margen, y + 13, PAG.margen + 82, y + 13)
  doc.line(PAG.margen + 100, y + 13, PAG.margen + 166, y + 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.muted)
  doc.text('Recibí conforme (firma)', PAG.margen, y + 17)
  doc.text('Fecha', PAG.margen + 100, y + 17)

  dibujarPie(doc, 'Guía de despacho. No es un comprobante de pago.')
  doc.save(`guia-orden-${orden.id}.pdf`)
}