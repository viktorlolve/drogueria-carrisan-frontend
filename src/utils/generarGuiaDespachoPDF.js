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
// FORMATO: la página del PDF es una HOJA A4 APAISADA (297 × 210 mm) y la guía
// —un bloque de A5 apaisado (210 × 148 mm, media hoja)— va centrada dentro.
// Motivo: un PDF no puede "pedir" orientación al imprimir; solo declara el
// tamaño de su página. Generando una página A5 suelta, el visor/la impresora
// la mete en una hoja vertical (A4/Letter) y la rota 90°, así que la guía sale
// vertical y diminuta. Con la página igual al papel real (A4 apaisado) el
// diálogo de impresión abre en horizontal, sale 1:1 y la guía ocupa la mitad
// del pliego con márgenes parejos.
//
// Presupuesto vertical de la guía (alto 148 mm, coordenadas de diseño; luego
// se desplazan con `Y()` al centro de la hoja):
//   cabecera 12 → 23 · orden + destinatario 29 → ~59 · destino ~64 → ~90 ·
//   recibí conforme ~94 → ~132 · pie 135.5 → 144.
//
// Este formato dibuja todo por su cuenta y NO modifica pdfBase.js: ese módulo
// lo comparten la factura, el comprobante, etc. Solo se reutilizan de pdfBase
// las utilidades neutras (documento, datos de empresa, fecha, texto espaciado).
//
// Sin QR porque las órdenes todavía no tienen código de verificación en el
// backend.
//
// Uso:  await generarGuiaDespachoPDF(orden)

import { datosEmpresa, nuevoDoc, textoEsp, fechaLarga } from './pdf/pdfBase'

/* Bloque de diseño: media hoja A4 (A5 apaisado). Todo el dibujo se hace con
   estas coordenadas y al final se traslada al centro de la hoja. */
const GUIA = { ancho: 210, alto: 148, margen: 12 }

/* Hoja en la que se imprime: A4 apaisada. Es la que viaja en el PDF, para que
   el papel por defecto sea horizontal. */
const HOJA = { ancho: 297, alto: 210 }

/* Traslación al centro de la hoja: 43,5 mm a cada lado y 31 mm arriba/abajo.
   210 × 148 = 31.080 mm² sobre los 62.370 mm² de la A4 apaisada → la guía
   ocupa justo la mitad del área. */
const OX = (HOJA.ancho - GUIA.ancho) / 2
const OY = (HOJA.alto - GUIA.alto) / 2

/* Marco útil de la guía, ya en coordenadas de la hoja: 210 - 12 · 2 = 186 mm. */
const XI = OX + GUIA.margen
const XD = OX + GUIA.ancho - GUIA.margen
const ANCHO_UTIL = GUIA.ancho - GUIA.margen * 2

/* Coordenadas de diseño (origen en la esquina del bloque) → hoja. */
const X = (v) => OX + v
const Y = (v) => OY + v

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

function linea(doc, y, { grosor = 0.2, color = T.linea, x1 = XI, x2 = XD } = {}) {
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
  // La hoja es A4 apaisada: `orientation: 'landscape'` es obligatorio porque
  // jsPDF normaliza a vertical (intercambia ancho y alto) cualquier formato
  // apaisado que se le pase como array.
  const doc = await nuevoDoc({
    pagina: { ancho: HOJA.ancho, alto: HOJA.alto, margen: GUIA.margen },
    orientation: 'landscape',
  })
  const e = datosEmpresa()

  const xi = XI
  const xd = XD
  const ordenTxt = String(orden.id ?? '')

  /* ===== Cabecera: empresa a la izquierda, tipo de documento y fecha a la derecha ===== */
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  tinta(doc, T.tinta)
  doc.text(String(e.nombre).toUpperCase(), xi, Y(14), { charSpace: 0.4 })

  const contacto = [e.rif && `RIF ${e.rif}`, e.telefono, e.email].filter(Boolean).join('   ·   ')
  if (contacto) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, contacto, 120, 1), xi, Y(18.5))
  }

  etiqueta(doc, 'Guía de despacho', xd, Y(13), { align: 'right', color: T.tinta, size: 7.5 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  tinta(doc, T.tinta)
  doc.text(fechaLarga(orden.created_at), xd, Y(18.5), { align: 'right' })

  linea(doc, Y(23), { grosor: 1.1, color: T.tinta })

  /* ===== Fila 1 · izquierda: número de orden gigante + modalidad ===== */
  etiqueta(doc, 'Orden N.º', xi, Y(31), { color: T.tinta, size: 7 })

  doc.setFont('helvetica', 'bold')
  let tam = 56
  doc.setFontSize(tam)
  while (doc.getTextWidth(ordenTxt) > 90 && tam > 24) {
    tam -= 3
    doc.setFontSize(tam)
  }
  // Altura de los dígitos ≈ 0.72 del cuerpo (1 pt = 0.3528 mm)
  const yBase = Y(34 + tam * 0.3528 * 0.72)
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
  const xr = X(114)
  const wr = xd - xr
  etiqueta(doc, 'Destinatario', xr, Y(31), { color: T.gris })

  let yr = Y(39)
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
  doc.line(xr - 6, Y(28), xr - 6, finFila1)

  /* ===== Fila 2: destino, a todo el ancho y en grande ===== */
  const yS = finFila1 + 5
  linea(doc, yS, { grosor: 0.45, color: T.tinta })

  const destino = destinoDe(orden, e)
  etiqueta(doc, 'Destino', xi, yS + 6, { color: T.tinta, size: 7 })
  etiqueta(doc, destino.etiqueta, xd, yS + 6, { align: 'right', color: T.gris })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  tinta(doc, T.tinta)
  const valor = lineasMax(doc, destino.valor ?? '—', ANCHO_UTIL, 2)
  doc.text(valor, xi, yS + 13.5)
  let yD = yS + 13.5 + (valor.length - 1) * 6

  if (destino.detalle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, destino.detalle, ANCHO_UTIL, 1), xi, yD + 5.5)
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
  if (yl + 22 < Y(GUIA.alto) - 17) linea(doc, yl + 22, { grosor: 0.3, color: T.tinta })

  /* ===== Pie ===== */
  linea(doc, Y(GUIA.alto - 12.5), { grosor: 0.4, color: T.tinta })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  tinta(doc, T.tinta)
  doc.text(String(e.nombre), xi, Y(GUIA.alto - 8))
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  tinta(doc, T.gris)
  doc.text('Guía de despacho. No es un comprobante de pago ni una factura.', xi, Y(GUIA.alto - 4.4))
  doc.setFont('courier', 'normal')
  doc.setFontSize(8)
  tinta(doc, T.tinta)
  doc.text(`ORDEN ${ordenTxt}`, xd, Y(GUIA.alto - 8), { align: 'right' })

  doc.save(`guia-orden-${orden.id}.pdf`)
}
