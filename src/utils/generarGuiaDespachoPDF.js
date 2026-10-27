// src/utils/generarGuiaDespachoPDF.js
//
// Guía de despacho: el papel que lleva el motorizado / la agencia. NO es un
// comprobante de pago ni un resumen del pedido: solo lleva DATOS DEL ENVÍO
// (destinatario, destino, número de orden y modalidad). Los productos, los
// montos y el estado del pedido viven en el formato de Orden.
//
// DISEÑO "BAJO CONSUMO DE TINTA" (editorial tipográfico), el mismo lenguaje
// del presupuesto:
//   · Blanco, negro y gris. Sin rellenos, sin degradados y sin color de acento.
//   · El número de orden va gigante: se identifica el paquete de un vistazo.
//   · El destino va grande y a todo el ancho: es lo que lee quien despacha.
//   · Al pie, campos en blanco para llenar a mano (nombre, firma, fecha y
//     observaciones).
//
// Formato MEDIA HOJA HORIZONTAL (A5, 210 × 148 mm), en UNA sola página.
//
// Presupuesto vertical (alto 148 mm):
//   cabecera 12 → 23 · orden + destinatario 29 → ~59 · destino ~64 → ~90 ·
//   recibí conforme ~94 → ~132 · pie 135.5 → 144.
//
// Este formato dibuja todo por su cuenta y NO modifica pdfBase.js: ese módulo
// lo comparten la factura, el comprobante, etc. Solo se reutilizan de pdfBase
// las utilidades neutras (página, datos de empresa, fecha, texto espaciado).
//
// Sin QR porque las órdenes todavía no tienen código de verificación en el
// backend.
//
// Uso:  await generarGuiaDespachoPDF(orden)

import {
  PAG,
  datosEmpresa,
  nuevoDoc,
  textoEsp,
  fechaLarga,
} from './pdf/pdfBase'

// A5 apaisado con márgenes parejos: 210 - 12 · 2 = 186 mm útiles.
const PAGINA_GUIA = { ancho: 210, alto: 148, margen: 12 }

/* Paleta de impresión: solo tinta y grises. */
const T = {
  tinta: [17, 17, 17],
  gris: [100, 100, 100],
  suave: [150, 150, 150],
  linea: [200, 200, 200],
}

const MODALIDAD = {
  delivery: 'DELIVERY',
  envio_nacional: 'ENVÍO NACIONAL',
  retiro: 'RETIRO',
}

const tinta = (doc, c) => doc.setTextColor(...c)

function linea(doc, y, { grosor = 0.2, color = T.linea, x1 = PAG.margen, x2 = PAG.ancho - PAG.margen } = {}) {
  doc.setDrawColor(...color)
  doc.setLineWidth(grosor)
  doc.line(x1, y, x2, y)
}

/* Etiqueta pequeña en mayúsculas con espaciado */
function etiqueta(doc, txt, x, y, { align = 'left', color = T.gris, size = 6.5 } = {}) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size)
  tinta(doc, color)
  textoEsp(doc, String(txt).toUpperCase(), x, y, { align, cs: 0.7 })
}

/* Parte el texto al ancho dado y lo recorta a `max` líneas con "…": un dato
   largo nunca debe empujar el "Recibí conforme" fuera de la hoja. */
function lineasMax(doc, texto, ancho, max) {
  const ls = doc.splitTextToSize(String(texto ?? ''), ancho)
  if (ls.length <= max) return ls
  const corte = ls.slice(0, max)
  corte[max - 1] = `${corte[max - 1].replace(/[\s,;:·-]+$/, '')}…`
  return corte
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

export default async function generarGuiaDespachoPDF(orden) {
  const doc = await nuevoDoc({ pagina: PAGINA_GUIA, orientation: 'landscape' })
  const e = datosEmpresa()

  const xi = PAG.margen
  const xd = PAG.ancho - PAG.margen
  const ordenTxt = String(orden.id ?? '')

  /* ===== Cabecera: empresa a la izquierda, tipo de documento y fecha a la derecha ===== */
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  tinta(doc, T.tinta)
  doc.text(String(e.nombre).toUpperCase(), xi, 14, { charSpace: 0.4 })

  const contacto = [e.rif && `RIF ${e.rif}`, e.telefono, e.email].filter(Boolean).join('   ·   ')
  if (contacto) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, contacto, 120, 1), xi, 18.5)
  }

  etiqueta(doc, 'Guía de despacho', xd, 13, { align: 'right', color: T.tinta, size: 7.5 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  tinta(doc, T.tinta)
  doc.text(fechaLarga(orden.created_at), xd, 18.5, { align: 'right' })

  linea(doc, 23, { grosor: 1.1, color: T.tinta })

  /* ===== Fila 1 · izquierda: número de orden gigante + modalidad ===== */
  etiqueta(doc, 'Orden N.º', xi, 31, { color: T.tinta, size: 7 })

  doc.setFont('helvetica', 'bold')
  let tam = 56
  doc.setFontSize(tam)
  while (doc.getTextWidth(ordenTxt) > 90 && tam > 24) {
    tam -= 3
    doc.setFontSize(tam)
  }
  // Altura de los dígitos ≈ 0.72 del cuerpo (1 pt = 0.3528 mm)
  const yBase = 34 + tam * 0.3528 * 0.72
  tinta(doc, T.tinta)
  doc.text(ordenTxt, xi - 0.5, yBase)

  // Sello de modalidad: solo contorno, en negro
  const modalidad =
    MODALIDAD[orden.tipo_envio] || String(orden.tipo_envio || 'SIN MODALIDAD').toUpperCase()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  const wPil = doc.getTextWidth(modalidad) + 0.8 * (modalidad.length - 1) + 10
  const yPil = yBase + 4
  doc.setDrawColor(...T.tinta)
  doc.setLineWidth(0.5)
  doc.roundedRect(xi, yPil, wPil, 7, 3.5, 3.5, 'S')
  tinta(doc, T.tinta)
  textoEsp(doc, modalidad, xi + wPil / 2, yPil + 4.8, { align: 'center', cs: 0.8 })
  const finIzq = yPil + 7

  /* ===== Fila 1 · derecha: destinatario ===== */
  const xr = 114
  const wr = xd - xr
  etiqueta(doc, 'Destinatario', xr, 31, { color: T.gris })

  let yr = 39
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  tinta(doc, T.tinta)
  const nombre = lineasMax(doc, orden.users?.nombre || 'Cliente', wr, 2)
  doc.text(nombre, xr, yr)
  yr += nombre.length * 5.4

  if (orden.users?.telefono) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    tinta(doc, T.tinta)
    doc.text(lineasMax(doc, orden.users.telefono, wr, 1), xr, yr + 0.5)
    yr += 5
  }
  if (orden.users?.email) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, orden.users.email, wr, 1), xr, yr + 0.5)
    yr += 5
  }

  // Divisor vertical fino entre orden y destinatario
  const finFila1 = Math.max(finIzq, yr)
  doc.setDrawColor(...T.linea)
  doc.setLineWidth(0.3)
  doc.line(xr - 6, 28, xr - 6, finFila1)

  /* ===== Fila 2: destino, a todo el ancho y en grande ===== */
  const yS = finFila1 + 5
  linea(doc, yS, { grosor: 0.45, color: T.tinta })

  const destino = destinoDe(orden, e)
  etiqueta(doc, 'Destino', xi, yS + 6, { color: T.tinta, size: 7 })
  etiqueta(doc, destino.etiqueta, xd, yS + 6, { align: 'right', color: T.gris })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  tinta(doc, T.tinta)
  const valor = lineasMax(doc, destino.valor ?? '—', PAG.contenido, 2)
  doc.text(valor, xi, yS + 13.5)
  let yD = yS + 13.5 + (valor.length - 1) * 6

  if (destino.detalle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, destino.detalle, PAG.contenido, 1), xi, yD + 5.5)
    yD += 5.5
  }

  /* ===== Fila 3: recibí conforme (campos en blanco para llenar a mano) ===== */
  const y3 = yD + 6
  linea(doc, y3, { grosor: 0.45, color: T.tinta })

  etiqueta(doc, 'Recibí conforme', xi, y3 + 5.5, { color: T.tinta, size: 7 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  tinta(doc, T.gris)
  doc.text('Verifique el estado del paquete antes de firmar.', xd, y3 + 5.5, { align: 'right' })

  const yl = y3 + 5.5 + 11
  const campos = [
    { label: 'Nombre y apellido', w: 78 },
    { label: 'Firma del receptor', w: 62 },
    { label: 'Fecha y hora', w: 36 },
  ]
  let xc = xi
  campos.forEach((c) => {
    doc.setDrawColor(...T.tinta)
    doc.setLineWidth(0.3)
    doc.line(xc, yl, xc + c.w, yl)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    tinta(doc, T.gris)
    doc.text(c.label, xc, yl + 3.6)
    xc += c.w + 5
  })

  // Observaciones: etiqueta y hasta dos renglones para escribir. El segundo
  // solo se dibuja si no invade el pie (destinos muy largos ocupan más alto).
  etiqueta(doc, 'Observaciones', xi, yl + 9.5, { color: T.gris, size: 6.5 })
  linea(doc, yl + 15.5, { grosor: 0.3, color: T.tinta })
  if (yl + 22 < PAG.alto - 17) linea(doc, yl + 22, { grosor: 0.3, color: T.tinta })

  /* ===== Pie ===== */
  linea(doc, PAG.alto - 12.5, { grosor: 0.4, color: T.tinta })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  tinta(doc, T.tinta)
  doc.text(String(e.nombre), xi, PAG.alto - 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  tinta(doc, T.gris)
  doc.text('Guía de despacho. No es un comprobante de pago ni una factura.', xi, PAG.alto - 4.4)
  doc.setFont('courier', 'normal')
  doc.setFontSize(8)
  tinta(doc, T.tinta)
  doc.text(`ORDEN ${ordenTxt}`, xd, PAG.alto - 8, { align: 'right' })

  doc.save(`guia-orden-${orden.id}.pdf`)
}