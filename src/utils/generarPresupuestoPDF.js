// src/utils/generarPresupuestoPDF.js
//
// Presupuesto del cliente (`/presupuesto`). A diferencia de la factura, los
// ítems sin precio no se cobran: van en una tabla aparte y quedan fuera del
// total, igual que en pantalla.
//
// DISEÑO "BAJO CONSUMO DE TINTA" (editorial tipográfico)
//   · Fondo 100 % blanco: cero rellenos, cero degradados, cero zebra.
//   · El impacto sale de la tipografía (número gigante) y de líneas finas.
//   · Tinta casi negra; el único color es el azul de marca #0052DC, y solo en
//     la vigencia y el total.
//   · Logo rasterizado en negro (monocromo).
//
// Este formato dibuja todo por su cuenta y NO modifica pdfBase.js: ese módulo
// lo comparten la factura, el comprobante, la guía, etc., que conservan su
// membrete de color. Solo se reutilizan de pdfBase las utilidades neutras
// (página, formateadores, datos de empresa, texto con espaciado).
//
// Uso:  await generarPresupuestoPDF({ detalle })
//
// Sin QR: los presupuestos no son verificables (el allowlist del backend es
// factura|pago) y un QR que apunta a un 404 sería peor que ninguno.

import empresaInfo from '../config/empresa'
import { LOGO_BLANCO } from '../config/logos'
import {
  PAG, usd, fechaCorta, fechaLarga, nuevoDoc, datosEmpresa, textoEsp,
} from './pdf/pdfBase'

/* ---------- Paleta de impresión: negro, grises y UN acento ---------- */
const T = {
  tinta: [17, 17, 17],
  gris: [100, 100, 100],
  suave: [150, 150, 150],
  linea: [200, 200, 200],
  aro: [222, 222, 222],
  azul: [0, 82, 220],
}

const Y_MAX = 297 - 24 // bajo este punto se salta de página (A4)

/* ---------- Logo en negro ----------
   `LOGO_BLANCO` es el wordmark blanco con fondo transparente. Con
   `source-in` todos sus píxeles opacos pasan a negro y luego se compone sobre
   blanco (JPEG: jsPDF lo copia tal cual, el PNG lo embebería como RGBA crudo).
   Si algo falla (CORS, red, entorno sin canvas) devuelve null y el membrete
   usa el nombre de la empresa en texto: nunca rompe el PDF. */
let logoNegro
async function cargarLogoNegro() {
  if (logoNegro !== undefined) return logoNegro
  try {
    const res = await fetch(LOGO_BLANCO, { mode: 'cors', signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`logo ${res.status}`)
    const blob = await res.blob()
    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result)
      fr.onerror = reject
      fr.readAsDataURL(blob)
    })
    const img = new Image()
    img.src = dataUrl
    await img.decode()

    const ratio = img.naturalWidth / img.naturalHeight
    const W = 520
    const H = Math.max(1, Math.round(W / ratio))

    const mono = document.createElement('canvas')
    mono.width = W
    mono.height = H
    const mctx = mono.getContext('2d')
    if (!mctx) throw new Error('canvas 2d no disponible')
    mctx.drawImage(img, 0, 0, W, H)
    mctx.globalCompositeOperation = 'source-in'
    mctx.fillStyle = '#111111'
    mctx.fillRect(0, 0, W, H)

    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    const octx = out.getContext('2d')
    octx.fillStyle = '#FFFFFF'
    octx.fillRect(0, 0, W, H)
    octx.drawImage(mono, 0, 0)

    logoNegro = { data: out.toDataURL('image/jpeg', 0.92), ratio }
  } catch {
    logoNegro = null
  }
  return logoNegro
}

/* ---------- Utilidades de dibujo ---------- */
const tinta = (doc, c) => doc.setTextColor(...c)

function linea(doc, y, { grosor = 0.2, color = T.linea, x1 = PAG.margen, x2 = PAG.ancho - PAG.margen } = {}) {
  doc.setDrawColor(...color)
  doc.setLineWidth(grosor)
  doc.line(x1, y, x2, y)
}

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

/* Etiqueta pequeña en mayúsculas con espaciado */
function etiqueta(doc, txt, x, y, { align = 'left', color = T.gris, size = 6.5 } = {}) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size)
  tinta(doc, color)
  textoEsp(doc, txt.toUpperCase(), x, y, { align, cs: 0.7 })
}

/* Título de sección editorial: "01  PRODUCTOS DISPONIBLES" */
function seccion(doc, y, num, texto) {
  doc.setFont('courier', 'bold')
  doc.setFontSize(8.5)
  tinta(doc, T.tinta)
  doc.text(num, PAG.margen, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  textoEsp(doc, texto.toUpperCase(), PAG.margen + 9, y, { cs: 0.9 })
  return y + 5
}

/* Cabecera pequeña de las páginas 2+ */
function cabeceraContinuacion(doc, numero) {
  etiqueta(doc, `Presupuesto  N.º ${numero}`, PAG.margen, 12, { color: T.tinta, size: 7 })
  etiqueta(doc, 'continuación', PAG.ancho - PAG.margen, 12, { align: 'right', color: T.suave })
  linea(doc, 15.5, { grosor: 0.4, color: T.tinta })
  return 25
}

/* ---------- Tabla editorial: solo líneas finas ---------- */
function tabla(doc, y, { columnas, filas, fuente = 9, apagada = false, numero, vacio }) {
  const total = columnas.reduce((s, c) => s + c.ancho, 0)
  const escala = PAG.contenido / total
  const cols = columnas.map((c) => ({ ...c, w: c.ancho * escala }))
  let x = PAG.margen
  cols.forEach((c) => { c.x = x; x += c.w })

  // Posición X del texto según la alineación de la columna
  const tx = (c) =>
    c.align === 'right' ? c.x + c.w - 1 : c.align === 'center' ? c.x + c.w / 2 : c.x

  const cabecera = (yy) => {
    cols.forEach((c) => etiqueta(doc, c.label, tx(c), yy, { align: c.align || 'left', color: T.gris, size: 6.3 }))
    linea(doc, yy + 2.6, { grosor: 0.45, color: T.tinta })
    return yy + 2.6
  }

  if (!filas.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    tinta(doc, T.gris)
    doc.text(vacio || 'Sin registros.', PAG.margen, y + 4, { maxWidth: PAG.contenido })
    return y + 12
  }

  let yy = cabecera(y)
  filas.forEach((fila) => {
    doc.setFontSize(fuente)
    const lineasPorCelda = fila.map((v, i) => {
      doc.setFont('helvetica', cols[i].bold ? 'bold' : 'normal')
      return doc.splitTextToSize(String(v ?? ''), cols[i].w - 4)
    })
    const nLineas = Math.max(...lineasPorCelda.map((l) => l.length))
    const alto = Math.max(8.5, nLineas * 4 + 4.5)

    if (yy + alto > Y_MAX) {
      doc.addPage()
      yy = cabecera(cabeceraContinuacion(doc, numero))
    }

    lineasPorCelda.forEach((ls, i) => {
      const c = cols[i]
      if (c.mono) {
        doc.setFont('courier', 'normal')
        doc.setFontSize(fuente - 0.5)
      } else {
        doc.setFont('helvetica', c.bold ? 'bold' : 'normal')
        doc.setFontSize(fuente)
      }
      tinta(doc, c.mono || apagada ? T.gris : T.tinta)
      doc.text(ls, tx(c), yy + 6, { align: c.align || 'left' })
    })
    yy += alto
    linea(doc, yy, { grosor: 0.15, color: T.linea })
  })
  return yy + 8
}

/* ---------- Principal ---------- */
export default async function generarPresupuestoPDF({ detalle }) {
  const doc = await nuevoDoc()
  const logo = await cargarLogoNegro()
  const e = datosEmpresa()
  const numero = String(detalle.numero ?? '')

  /* ===== Portada: aros decorativos (solo contorno, trazos finos) ===== */
  doc.setDrawColor(...T.aro)
  doc.setLineWidth(0.25)
  ;[18, 30, 42].forEach((r) => doc.circle(PAG.ancho, 0, r, 'S'))
  // cruz de contorno (guiño a la marca), sin relleno
  doc.setDrawColor(...T.linea)
  doc.setLineWidth(0.3)
  const cx = PAG.ancho - 24
  const cy = 24
  doc.line(cx - 3.5, cy, cx + 3.5, cy)
  doc.line(cx, cy - 3.5, cx, cy + 3.5)

  /* ===== Marca ===== */
  const nombreEnTexto = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    tinta(doc, T.tinta)
    doc.text(e.nombre.toUpperCase(), PAG.margen, 20, { charSpace: 0.4 })
  }
  if (logo) {
    const h = 11
    const w = Math.min(logo.ratio * h, 56)
    try {
      doc.addImage(logo.data, 'JPEG', PAG.margen, 12, w, w / logo.ratio)
    } catch {
      nombreEnTexto()
    }
  } else {
    nombreEnTexto()
  }
  const contacto = [e.rif && `RIF ${e.rif}`, e.telefono, e.email].filter(Boolean).join('   ·   ')
  if (contacto) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    tinta(doc, T.gris)
    doc.text(contacto, PAG.margen, 30)
  }

  /* ===== Título editorial: etiqueta + número gigante ===== */
  etiqueta(doc, 'Presupuesto  ·  Documento no fiscal', PAG.margen, 46, { color: T.tinta, size: 7.5 })

  doc.setFont('helvetica', 'bold')
  let tam = 84
  doc.setFontSize(tam)
  while (doc.getTextWidth(numero) > 108 && tam > 28) {
    tam -= 3
    doc.setFontSize(tam)
  }
  // Altura de las mayúsculas/dígitos ≈ 0.72 del cuerpo (1 pt = 0.3528 mm)
  const yBase = 52 + tam * 0.3528 * 0.72
  tinta(doc, T.tinta)
  doc.text(numero, PAG.margen - 1, yBase)

  // "N.º" pequeño bajo el número
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  tinta(doc, T.gris)
  doc.text('N.º de presupuesto', PAG.margen, yBase + 7)

  /* ===== Bloque de fechas (derecha) ===== */
  const vencido = new Date(detalle.fecha_expiracion).getTime() < Date.now()
  const xr = PAG.ancho - PAG.margen

  etiqueta(doc, 'Emitido', xr, 54, { align: 'right', color: T.suave })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  tinta(doc, T.tinta)
  doc.text(fechaLarga(detalle.fecha_creacion), xr, 60, { align: 'right' })

  etiqueta(doc, 'Válido hasta', xr, 70, { align: 'right', color: T.suave })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  tinta(doc, vencido ? T.tinta : T.azul)
  doc.text(fechaLarga(detalle.fecha_expiracion), xr, 77, { align: 'right' })

  // Sello de vigencia: solo contorno
  const estado = vencido ? 'VENCIDO' : 'VIGENTE'
  const colEstado = vencido ? T.tinta : T.azul
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  const wEstado = doc.getTextWidth(estado) + 0.8 * (estado.length - 1) + 9
  doc.setDrawColor(...colEstado)
  doc.setLineWidth(0.5)
  doc.roundedRect(xr - wEstado, 82, wEstado, 7, 3.5, 3.5, 'S')
  tinta(doc, colEstado)
  textoEsp(doc, estado, xr - wEstado / 2, 86.8, { align: 'center', cs: 0.8 })

  /* ===== Regla gruesa + resumen ===== */
  const yRegla = Math.max(yBase + 12, 92)
  linea(doc, yRegla, { grosor: 1.1, color: T.tinta })

  const items = detalle.items || []
  const disponibles = items.filter((i) => i.disponible).map(leerItem)
  const noDisponibles = items.filter((i) => !i.disponible).map(leerItem)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  tinta(doc, T.gris)
  const resumen = `${disponibles.length} producto${disponibles.length === 1 ? '' : 's'} con precio` +
    (noDisponibles.length ? `   ·   ${noDisponibles.length} sin precio por ahora` : '') +
    `   ·   Emitido el ${fechaCorta(detalle.fecha_creacion)}`
  doc.text(resumen, PAG.margen, yRegla + 6)

  /* ===== 01 · Productos disponibles ===== */
  let y = yRegla + 16
  y = seccion(doc, y, '01', 'Productos disponibles')
  y = tabla(doc, y + 3, {
    numero,
    vacio: 'Ningún producto de este presupuesto está disponible por ahora.',
    columnas: [
      { label: 'N.º', ancho: 10, mono: true },
      { label: 'Producto', ancho: 86, bold: true },
      { label: 'Cant.', ancho: 18, align: 'center' },
      { label: 'P. unitario', ancho: 30, align: 'right' },
      { label: 'Subtotal', ancho: 34, align: 'right', bold: true },
    ],
    filas: disponibles.map((it, i) => [
      String(i + 1).padStart(2, '0'), it.nombre, String(it.cantidad), usd(it.precio), usd(it.subtotal),
    ]),
  })

  /* ===== 02 · Sin precio ===== */
  let n = 2
  if (noDisponibles.length > 0) {
    if (y + 30 > Y_MAX) { doc.addPage(); y = cabeceraContinuacion(doc, numero) }
    y = seccion(doc, y, '02', 'Sin precio disponible · fuera del total')
    y = tabla(doc, y + 3, {
      numero,
      fuente: 8.5,
      apagada: true,
      columnas: [
        { label: 'N.º', ancho: 10, mono: true },
        { label: 'Producto', ancho: 110 },
        { label: 'Cant.', ancho: 18, align: 'center' },
        { label: 'Precio', ancho: 40, align: 'right' },
      ],
      filas: noDisponibles.map((it, i) => [
        String(i + 1).padStart(2, '0'), it.nombre, String(it.cantidad), 'Por definir',
      ]),
    })
    n = 3
  }

  /* ===== Total: caja de borde grueso, número azul ===== */
  const total = disponibles.reduce((s, it) => s + it.subtotal, 0)
  const wCaja = 98
  const hCaja = 27
  if (y + hCaja + 6 > Y_MAX) { doc.addPage(); y = cabeceraContinuacion(doc, numero) }
  const xCaja = PAG.ancho - PAG.margen - wCaja - 2

  // Contorno fino desplazado (efecto de sombra sin relleno) y caja principal
  doc.setDrawColor(...T.suave)
  doc.setLineWidth(0.25)
  doc.rect(xCaja + 2, y + 2, wCaja, hCaja, 'S')
  doc.setDrawColor(...T.tinta)
  doc.setLineWidth(1)
  doc.rect(xCaja, y, wCaja, hCaja, 'S')

  etiqueta(doc, 'Total del presupuesto', xCaja + 6, y + 8, { color: T.tinta, size: 6.8 })
  const textoTotal = usd(total)
  doc.setFont('helvetica', 'bold')
  let tt = 25
  doc.setFontSize(tt)
  while (doc.getTextWidth(textoTotal) > wCaja - 12 && tt > 12) {
    tt -= 1
    doc.setFontSize(tt)
  }
  tinta(doc, T.azul)
  doc.text(textoTotal, xCaja + wCaja - 6, y + 21, { align: 'right' })

  // Nota a la izquierda de la caja
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  tinta(doc, T.gris)
  const nota = doc.splitTextToSize(
    `Suma de ${disponibles.length} línea${disponibles.length === 1 ? '' : 's'} con precio. Los productos sin precio no se incluyen.`,
    xCaja - PAG.margen - 8
  )
  doc.text(nota, PAG.margen, y + 8)
  y += hCaja + 10

  /* ===== Datos para pagar (solo los configurados; nunca se inventan) ===== */
  const lista = Array.isArray(empresaInfo.datosPago)
    ? empresaInfo.datosPago.filter((d) => d?.metodo && d?.detalle).slice(0, 6)
    : []
  if (lista.length) {
    const filas = Math.ceil(lista.length / 2)
    if (y + 7 + filas * 10 > Y_MAX + 5) { doc.addPage(); y = cabeceraContinuacion(doc, numero) }
    y = seccion(doc, y, String(n).padStart(2, '0'), 'Datos para realizar tu pago')
    linea(doc, y + 1, { grosor: 0.45, color: T.tinta })
    y += 2
    const colW = PAG.contenido / 2
    lista.forEach((d, i) => {
      const fila = Math.floor(i / 2)
      const x = PAG.margen + (i % 2) * colW
      const yy = y + fila * 10
      etiqueta(doc, d.metodo, x, yy + 4.6, { color: T.suave, size: 6.3 })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      tinta(doc, T.tinta)
      doc.text(String(d.detalle), x, yy + 9, { maxWidth: colW - 6 })
    })
    for (let f = 1; f <= filas; f++) linea(doc, y + f * 10 + 1.5, { grosor: 0.15 })
  }

  /* ===== Pie en todas las páginas ===== */
  const paginas = doc.internal.getNumberOfPages()
  const legenda = 'Presupuesto sin valor fiscal: no es una factura. Los precios pueden variar hasta la emisión de la factura.'
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    linea(doc, PAG.alto - 16, { grosor: 0.4, color: T.tinta })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    tinta(doc, T.tinta)
    doc.text(e.nombre, PAG.margen, PAG.alto - 11)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    tinta(doc, T.gris)
    const ls = doc.splitTextToSize(legenda, PAG.contenido - 28)
    doc.text(ls.length > 1 ? `${ls[0].replace(/[\s,;:·-]+$/, '')}…` : ls[0], PAG.margen, PAG.alto - 7)
    doc.setFont('courier', 'normal')
    doc.setFontSize(8)
    tinta(doc, T.tinta)
    doc.text(`${String(p).padStart(2, '0')} / ${String(paginas).padStart(2, '0')}`, PAG.ancho - PAG.margen, PAG.alto - 11, { align: 'right' })
  }

  doc.save(`presupuesto-${detalle.numero}.pdf`)
}