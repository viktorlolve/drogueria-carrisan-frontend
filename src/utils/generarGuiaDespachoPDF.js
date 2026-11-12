// src/utils/generarGuiaDespachoPDF.js
//
// Guía de despacho: el papel que lleva el motorizado / la agencia. NO es un
// comprobante de pago ni un resumen del pedido: solo lleva DATOS DEL ENVÍO
// (comprador, destino, número de orden y modalidad). Los productos, los
// montos y el estado del pedido viven en el formato de Orden.
//
// DISEÑO "BAJO CONSUMO DE TINTA" (editorial tipográfico), el mismo lenguaje
// del presupuesto y de la Orden:
//   · Blanco, negro y gris. Sin rellenos, sin degradados y sin color de acento.
//   · Banner unificado arriba: número de orden + modalidad a la izquierda,
//     comprador (nombre, RIF, teléfono — sin correo) a la derecha, separados
//     por una regla vertical fina. El mismo lenguaje que el bloque de título
//     de la Orden, condensado a lo esencial para un papel de despacho.
//   · El destino va a todo el ancho, en grande: es lo que lee quien despacha.
//   · "Recibe conforme" se reduce a una etiqueta y una sola línea de firma.
//
// FORMATO (v2): hoja A4 VERTICAL completa (210 × 297 mm), pero el diseño
// ocupa solo la mitad superior (~145 mm de los 297): la mitad inferior queda
// en blanco A PROPÓSITO, para imprimir la guía en papel A4 normal ocupando
// solo media hoja (no se dibuja ninguna marca de corte: se deja en blanco
// tal cual). La versión anterior usaba una hoja A5 aparte; esta la reemplaza.
//
// Presupuesto vertical (alto 297 mm, el contenido real no pasa de ~140 mm):
//   cabecera 12 → 23 · banner (orden+modalidad | comprador) 29 → ~61 ·
//   destino ~67 → ~92 · recibe conforme ~97 → ~118 · pie ~124 → ~136.
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

/* Página A4 vertical completa; el diseño solo ocupa la mitad superior. */
const GUIA = { ancho: 210, alto: 297, margen: 16 }

/* Marco útil: 210 - 16 · 2 = 178 mm de ancho. */
const XI = GUIA.margen
const XD = GUIA.ancho - GUIA.margen
const ANCHO_UTIL = GUIA.ancho - GUIA.margen * 2

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
   largo nunca debe romper el presupuesto de media página. */
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

/* Panel del comprador (columna derecha del banner): solo nombre, RIF y
   teléfono — sin correo. Mismo lenguaje visual que el panel de la Orden,
   reducido a lo esencial para un papel de despacho. */
function bloqueComprador(doc, xr, y, w, { nombre, rif, telefono }) {
  let yy = y
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  tinta(doc, T.tinta)
  const ls = lineasMax(doc, nombre || 'Cliente', w, 2)
  doc.text(ls, xr, yy + 4.2, { align: 'right' })
  yy += 4.2 + (ls.length - 1) * 4.6

  const contacto = [rif && `RIF/C.I. ${rif}`, telefono].filter(Boolean).join('   ·   ')
  if (contacto) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.4)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, contacto, w, 1), xr, yy + 4.4, { align: 'right' })
    yy += 4.4
  }
  return yy
}

export default async function generarGuiaDespachoPDF(orden) {
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
  doc.text(String(e.nombre).toUpperCase(), xi, 14, { charSpace: 0.4 })

  const contactoEmpresa = [e.rif && `RIF ${e.rif}`, e.telefono].filter(Boolean).join('   ·   ')
  if (contactoEmpresa) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, contactoEmpresa, 100, 1), xi, 18.5)
  }

  etiqueta(doc, 'Guía de despacho', xd, 13, { align: 'right', color: T.tinta, size: 7.5 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  tinta(doc, T.tinta)
  doc.text(fechaLarga(orden.created_at), xd, 18.5, { align: 'right' })

  linea(doc, 23, { grosor: 1.1, color: T.tinta })

  /* ===== Banner unificado: N.º de orden + modalidad (izquierda) y
     comprador (derecha), separados por una regla vertical fina — mismo
     lenguaje que el bloque de título de la Orden, en un solo bloque. ===== */
  const xDivisoria = xi + 76
  const yContenido = 29

  // Columna izquierda: número de orden + sello de modalidad
  etiqueta(doc, 'Orden N.º', xi, yContenido - 2, { color: T.tinta, size: 7 })
  doc.setFont('helvetica', 'bold')
  let tam = 34
  doc.setFontSize(tam)
  const anchoNumero = xDivisoria - xi - 6
  while (doc.getTextWidth(ordenTxt) > anchoNumero && tam > 18) {
    tam -= 2
    doc.setFontSize(tam)
  }
  // Altura de los dígitos ≈ 0.72 del cuerpo (1 pt = 0.3528 mm)
  const yBase = yContenido + tam * 0.3528 * 0.72
  tinta(doc, T.tinta)
  doc.text(ordenTxt, xi - 0.5, yBase)

  const modalidad =
    MODALIDAD[orden.tipo_envio] || String(orden.tipo_envio || 'SIN MODALIDAD').toUpperCase()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.2)
  const wPil = Math.min(doc.getTextWidth(modalidad) + 0.8 * (modalidad.length - 1) + 9, anchoNumero)
  const yPil = yBase + 4
  doc.setDrawColor(...T.tinta)
  doc.setLineWidth(0.45)
  doc.roundedRect(xi, yPil, wPil, 6.4, 3.2, 3.2, 'S')
  tinta(doc, T.tinta)
  textoEsp(doc, modalidad, xi + wPil / 2, yPil + 4.4, { align: 'center', cs: 0.7 })
  const yIzqFin = yPil + 6.4

  // Columna derecha: comprador (nombre, RIF, teléfono — sin correo)
  const wComprador = xd - (xDivisoria + 8)
  const yDerFin = bloqueComprador(doc, xd, yContenido, wComprador, {
    nombre: orden.users?.nombre,
    rif: orden.users?.rif_cedula,
    telefono: orden.users?.telefono,
  })

  const yRegla = Math.max(yIzqFin, yDerFin) + 4
  doc.setDrawColor(...T.linea)
  doc.setLineWidth(0.3)
  doc.line(xDivisoria, 23.6, xDivisoria, yRegla - 4)
  linea(doc, yRegla, { grosor: 1.1, color: T.tinta })

  /* ===== Destino: a todo el ancho y en grande ===== */
  const yS = yRegla + 6
  const destino = destinoDe(orden, e)
  etiqueta(doc, 'Destino', xi, yS, { color: T.tinta, size: 7 })
  etiqueta(doc, destino.etiqueta, xd, yS, { align: 'right', color: T.gris })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  tinta(doc, T.tinta)
  const valor = lineasMax(doc, destino.valor ?? '—', ANCHO_UTIL, 2)
  doc.text(valor, xi, yS + 7.5)
  let yD = yS + 7.5 + (valor.length - 1) * 5.6

  if (destino.detalle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, destino.detalle, ANCHO_UTIL, 1), xi, yD + 5.2)
    yD += 5.2
  }

  /* ===== Recibe conforme: una etiqueta y una sola línea de firma ===== */
  const y3 = yD + 6
  linea(doc, y3, { grosor: 0.45, color: T.tinta })

  etiqueta(doc, 'Recibe conforme', xi, y3 + 5.5, { color: T.tinta, size: 7 })

  const yFirma = y3 + 15
  doc.setDrawColor(...T.tinta)
  doc.setLineWidth(0.3)
  doc.line(xi, yFirma, xd, yFirma)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  tinta(doc, T.gris)
  doc.text('Firma, nombre y fecha de quien recibe', xi, yFirma + 3.6)

  /* ===== Pie (cierra el bloque de media página; debajo todo queda en blanco) ===== */
  const yPie = yFirma + 11
  linea(doc, yPie, { grosor: 0.4, color: T.tinta })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  tinta(doc, T.tinta)
  doc.text(String(e.nombre), xi, yPie + 4.6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  tinta(doc, T.gris)
  doc.text('Guía de despacho. No es un comprobante de pago ni una factura.', xi, yPie + 8.2)
  doc.setFont('courier', 'normal')
  doc.setFontSize(8)
  tinta(doc, T.tinta)
  doc.text(`ORDEN ${ordenTxt}`, xd, yPie + 4.6, { align: 'right' })

  doc.save(`guia-orden-${orden.id}.pdf`)
}