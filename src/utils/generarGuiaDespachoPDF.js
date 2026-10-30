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
//   · El destino va a todo el ancho: es lo que lee quien despacha.
//   · Al pie, campos en blanco para llenar a mano (nombre, firma, fecha y
//     observaciones).
//
// FORMATO: la hoja del PDF ES la guía: 148 × 210 mm (A5 VERTICAL), justo la
// mitad de un A4 por área. A diferencia de un formato apaisado —que un
// visor/impresora puede rotar 90° por no coincidir con la orientación vertical
// por defecto del papel—, una página vertical ya coincide con esa orientación,
// así que no hace falta envolverla en una hoja A4 completa ni centrarla: se
// imprime directo, ocupando solo media hoja.
//
// Presupuesto vertical de la guía (alto 210 mm, aprox.):
//   cabecera 12 → 23 · orden + modalidad 29 → ~59 · destinatario ~68 → ~92 ·
//   destino ~97 → ~122 · recibí conforme ~127 → ~185 · pie 197.5 → 206.
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

/* Página = la guía misma: A5 vertical, exactamente media hoja A4 por área
   (210 × 297 mm → 148 × 210 mm). Ya no hay una "hoja mayor" que la contenga:
   al ser vertical, coincide con la orientación por defecto de cualquier
   impresora, así que no hace falta centrarla dentro de nada. */
const GUIA = { ancho: 148, alto: 210, margen: 12 }

/* Marco útil: 148 - 12 · 2 = 124 mm de ancho. */
const XI = GUIA.margen
const XD = GUIA.ancho - GUIA.margen
const ANCHO_UTIL = GUIA.ancho - GUIA.margen * 2

/* Identidad (sin traslación): se deja por si en el futuro hace falta volver
   a envolver la guía en una hoja mayor centrada, como en la versión apaisada. */
const Y = (v) => v

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
  // La página ya tiene el tamaño de la guía: vertical, sin pasar `orientation`
  // (jsPDF asume 'portrait' por defecto).
  const doc = await nuevoDoc({
    pagina: { ancho: GUIA.ancho, alto: GUIA.alto, margen: GUIA.margen },
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
    doc.text(lineasMax(doc, contacto, 80, 1), xi, Y(18.5))
  }

  etiqueta(doc, 'Guía de despacho', xd, Y(13), { align: 'right', color: T.tinta, size: 7.5 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  tinta(doc, T.tinta)
  doc.text(fechaLarga(orden.created_at), xd, Y(18.5), { align: 'right' })

  linea(doc, Y(23), { grosor: 1.1, color: T.tinta })

  /* ===== Orden N.º: gigante, arriba del todo y a todo el ancho ===== */
  etiqueta(doc, 'Orden N.º', xi, Y(31), { color: T.tinta, size: 7 })

  doc.setFont('helvetica', 'bold')
  let tam = 56
  doc.setFontSize(tam)
  while (doc.getTextWidth(ordenTxt) > 104 && tam > 24) {
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

  /* ===== Destinatario: debajo del número de orden, a todo el ancho ===== */
  const yDest = finIzq + 9
  linea(doc, yDest - 5, { grosor: 0.3, color: T.linea })
  etiqueta(doc, 'Destinatario', xi, yDest, { color: T.gris })

  let yr = yDest + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  tinta(doc, T.tinta)
  const nombre = lineasMax(doc, orden.users?.nombre || 'Cliente', ANCHO_UTIL, 2)
  doc.text(nombre, xi, yr)
  yr += nombre.length * 5.4

  if (orden.users?.telefono) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    tinta(doc, T.tinta)
    doc.text(lineasMax(doc, orden.users.telefono, ANCHO_UTIL, 1), xi, yr + 0.5)
    yr += 5
  }
  if (orden.users?.email) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, orden.users.email, ANCHO_UTIL, 1), xi, yr + 0.5)
    yr += 5
  }
  const finDestinatario = yr

  /* ===== Destino: a todo el ancho y en grande ===== */
  const yS = finDestinatario + 5
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

  /* ===== Recibí conforme: campos en blanco para llenar a mano ===== */
  const y3 = yD + 6
  linea(doc, y3, { grosor: 0.45, color: T.tinta })

  etiqueta(doc, 'Recibí conforme', xi, y3 + 5.5, { color: T.tinta, size: 7 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.3)
  tinta(doc, T.gris)
  doc.text(
    lineasMax(doc, 'Verifique el estado del paquete antes de firmar.', ANCHO_UTIL, 1),
    xi,
    y3 + 10.5
  )

  // Fila 1: nombre y apellido, a todo el ancho (antes compartía fila con
  // firma/fecha; en vertical hay ancho de sobra para darle su propia línea).
  let yl = y3 + 18
  doc.setDrawColor(...T.tinta)
  doc.setLineWidth(0.3)
  doc.line(xi, yl, xd, yl)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  tinta(doc, T.gris)
  doc.text('Nombre y apellido', xi, yl + 3.6)

  // Fila 2: firma (62%) + fecha y hora (resto), lado a lado.
  yl += 14
  const wFirma = ANCHO_UTIL * 0.62
  const wFecha = ANCHO_UTIL - wFirma - 6
  doc.setDrawColor(...T.tinta)
  doc.setLineWidth(0.3)
  doc.line(xi, yl, xi + wFirma, yl)
  doc.line(xd - wFecha, yl, xd, yl)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  tinta(doc, T.gris)
  doc.text('Firma del receptor', xi, yl + 3.6)
  doc.text('Fecha y hora', xd - wFecha, yl + 3.6)

  // Observaciones: etiqueta y hasta dos renglones para escribir. El segundo
  // solo se dibuja si no invade el pie (destinos muy largos ocupan más alto).
  etiqueta(doc, 'Observaciones', xi, yl + 12, { color: T.gris, size: 6.5 })
  linea(doc, yl + 18, { grosor: 0.3, color: T.tinta })
  if (yl + 25 < Y(GUIA.alto) - 17) linea(doc, yl + 25, { grosor: 0.3, color: T.tinta })

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