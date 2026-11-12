// src/utils/generarPresupuestoPDF.js
//
// Presupuesto del cliente (`/presupuesto`). A diferencia de la factura, los
// ítems sin precio no se cobran: van en una tabla aparte y quedan fuera del
// total, igual que en pantalla.
//
// DISEÑO "BAJO CONSUMO DE TINTA" (editorial tipográfico), el mismo lenguaje
// de la Orden:
//   · Fondo 100 % blanco: cero rellenos, cero degradados, cero zebra.
//   · Tinta casi negra; el único color es el azul de marca #0052DC, y solo en
//     el sello de vigencia, "Válido hasta" y el total.
//   · Logo rasterizado en negro (monocromo).
//   · Bloque de título unificado: etiqueta + sello de vigencia en la misma
//     fila, y debajo dos columnas separadas por una regla vertical fina —
//     número de presupuesto a la izquierda, panel Emitido/Válido hasta a la
//     derecha. Mismo lenguaje que el bloque de título de la Orden.
//   · Totales en una caja angosta que arranca justo debajo de la columna
//     "P. unitario", no a todo el ancho.
//
// NOTA DE DISEÑO (v2): ya no incluye la sección "Datos para realizar tu
// pago" (un presupuesto no se cobra, no tiene sentido pedir que lo paguen) ni
// la nota "Suma de X líneas con precio...": en su lugar, junto a la caja de
// totales va un disclaimer de vigencia (24 h desde la creación + invitación a
// recotizar en la plataforma).
//
// Este formato dibuja todo por su cuenta y NO modifica pdfBase.js: ese módulo
// lo comparten la factura, el comprobante, la guía, etc., que conservan su
// propio membrete. Solo se reutilizan de pdfBase las utilidades neutras
// (página, formateadores, datos de empresa, texto con espaciado).
//
// Uso:  await generarPresupuestoPDF({ detalle, cliente })
//
// `cliente` (opcional, { nombre, rif_cedula }) es el dueño del presupuesto —
// `detalle` no trae datos de usuario (el backend solo lo valida por
// usuario_id). Pásale el usuario logueado desde el componente que llama a
// esta función; si no llega, ese espacio simplemente no se dibuja.
//
// Sin QR: los presupuestos no son verificables (el allowlist del backend es
// factura|pago) y un QR que apunta a un 404 sería peor que ninguno.

import { LOGO_BLANCO } from '../config/logos'
import {
  PAG, usd, usdCode, fechaCorta, fechaLarga, nuevoDoc, datosEmpresa, textoEsp,
} from './pdf/pdfBase'

/* ---------- Paleta de impresión: negro, grises y UN acento ---------- */
const T = {
  tinta: [17, 17, 17],
  gris: [100, 100, 100],
  suave: [150, 150, 150],
  linea: [200, 200, 200],
  azul: [0, 82, 220],
}

const Y_MAX = 297 - 24 // bajo este punto se salta de página (A4)
const Y_TOTALES = 278 // los totales pueden llegar más abajo: el pie empieza en 281

/* ---------- Logo en negro ----------
   `LOGO_BLANCO` es el wordmark blanco con fondo transparente. Con
   `source-in` todos sus píxeles opacos pasan a negro y luego se compone sobre
   blanco (JPEG). Si algo falla (CORS, red, entorno sin canvas) devuelve null
   y el membrete usa el nombre de la empresa en texto: nunca rompe el PDF. */
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
  textoEsp(doc, String(txt).toUpperCase(), x, y, { align, cs: 0.7 })
}

/* Parte al ancho dado y recorta a `max` líneas con "…" */
function lineasMax(doc, texto, ancho, max) {
  const ls = doc.splitTextToSize(String(texto ?? ''), ancho)
  if (ls.length <= max) return ls
  const corte = ls.slice(0, max)
  corte[max - 1] = `${corte[max - 1].replace(/[\s,;:·-]+$/, '')}…`
  return corte
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

/* ---------- Tabla editorial: solo líneas finas ----------
   Devuelve { y, cols } — `cols` trae la x/ancho ya escalados de cada columna,
   para poder alinear la caja de totales bajo "P. unitario". */
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
    return { y: y + 12, cols }
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
  return { y: yy + 8, cols }
}

/* ---------- Principal ---------- */
export default async function generarPresupuestoPDF({ detalle, cliente = null }) {
  const doc = await nuevoDoc()
  const logo = await cargarLogoNegro()
  const e = datosEmpresa()
  const numero = String(detalle.numero ?? '')
  const vencido = new Date(detalle.fecha_expiracion).getTime() < Date.now()

  /* ===== Membrete: logo a la izquierda, datos de empresa a la derecha ===== */
  const nombreEnTexto = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    tinta(doc, T.tinta)
    doc.text(String(e.nombre).toUpperCase(), PAG.margen, 20, { charSpace: 0.4 })
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

  const xr = PAG.ancho - PAG.margen
  let yEmpresa = 14
  if (e.direccion) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    tinta(doc, T.gris)
    const lsDir = lineasMax(doc, e.direccion, 95, 2)
    doc.text(lsDir, xr, yEmpresa, { align: 'right' })
    yEmpresa += lsDir.length * 3.4 + 1.6
  }
  const rifTel = [e.rif && `RIF ${e.rif}`, e.telefono].filter(Boolean).join('   ·   ')
  if (rifTel) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    tinta(doc, T.gris)
    doc.text(rifTel, xr, yEmpresa, { align: 'right' })
  }

  /* ===== Bloque de título: fila de cabecera (tipo de doc. + sello de
     vigencia) y debajo dos columnas separadas por una regla vertical fina —
     número de presupuesto a la izquierda, comprador (nombre y RIF) arriba a
     la derecha y "Válido hasta" centrado en el espacio libre que queda
     debajo, antes de la regla gruesa. Mismo lenguaje que el bloque de
     título de la Orden. ===== */
  etiqueta(doc, 'Presupuesto  ·  Documento no fiscal', PAG.margen, 40, { color: T.tinta, size: 7.5 })

  const estadoTxt = vencido ? 'VENCIDO' : 'VIGENTE'
  const colEstado = vencido ? T.tinta : T.azul
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  const wEstado = Math.min(doc.getTextWidth(estadoTxt) + 0.8 * (estadoTxt.length - 1) + 8, 72)
  doc.setDrawColor(...colEstado)
  doc.setLineWidth(0.45)
  doc.roundedRect(xr - wEstado, 35.4, wEstado, 6.4, 3.2, 3.2, 'S')
  tinta(doc, colEstado)
  textoEsp(doc, estadoTxt, xr - wEstado / 2, 39.8, { align: 'center', cs: 0.7 })
  linea(doc, 44, { grosor: 0.3, color: T.linea })

  const xDivisoria = PAG.margen + 74
  const yContenido = 51

  // Número de presupuesto (columna izquierda)
  doc.setFont('helvetica', 'bold')
  let tam = 38
  doc.setFontSize(tam)
  const anchoNumero = xDivisoria - PAG.margen - 6
  while (doc.getTextWidth(numero) > anchoNumero && tam > 20) {
    tam -= 2
    doc.setFontSize(tam)
  }
  // Altura de los dígitos ≈ 0.72 del cuerpo (1 pt = 0.3528 mm)
  const yBase = yContenido + tam * 0.3528 * 0.72
  tinta(doc, T.tinta)
  doc.text(numero, PAG.margen - 1, yBase)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  tinta(doc, T.gris)
  doc.text('N.º de presupuesto', PAG.margen, yBase + 6)
  const yNumeroFin = yBase + 8

  // Panel de comprador (columna derecha, arriba): nombre y RIF del dueño
  // del presupuesto. Si no llega `cliente`, ese espacio queda vacío (no se
  // inventa un nombre), y "Válido hasta" simplemente se centra más arriba.
  const wInfo = xr - (xDivisoria + 8)
  let yCompradorFin = yContenido
  if (cliente?.nombre) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    tinta(doc, T.tinta)
    const lsNombre = lineasMax(doc, cliente.nombre, wInfo, 2)
    doc.text(lsNombre, xr, yContenido, { align: 'right' })
    yCompradorFin = yContenido + (lsNombre.length - 1) * 4.6
    if (cliente.rif_cedula) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.3)
      tinta(doc, T.gris)
      doc.text(`RIF/C.I. ${cliente.rif_cedula}`, xr, yCompradorFin + 4.4, { align: 'right' })
      yCompradorFin += 4.4
    }
  }

  // "Válido hasta" se baja al centro del espacio libre que queda entre el
  // comprador y el número de presupuesto (que es, casi siempre, lo que
  // termina marcando dónde va la regla gruesa), en vez de ir pegado justo
  // debajo del comprador.
  const yValido = yCompradorFin + (yNumeroFin - yCompradorFin) / 2
  etiqueta(doc, 'Válido hasta', xr - wInfo, yValido, { color: T.suave, size: 6.3 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  tinta(doc, vencido ? T.tinta : T.azul)
  doc.text(lineasMax(doc, fechaLarga(detalle.fecha_expiracion), wInfo * 0.62, 1), xr, yValido + 0.4, { align: 'right' })
  const yInfoFin = yValido + 4

  const yRegla = Math.max(yNumeroFin, yInfoFin) + 3
  doc.setDrawColor(...T.linea)
  doc.setLineWidth(0.3)
  doc.line(xDivisoria, 44.6, xDivisoria, yRegla - 3)
  linea(doc, yRegla, { grosor: 1.1, color: T.tinta })

  /* ===== Resumen ===== */
  const items = detalle.items || []
  const disponibles = items.filter((i) => i.disponible).map(leerItem)
  const noDisponibles = items.filter((i) => !i.disponible).map(leerItem)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  tinta(doc, T.gris)
  const resumen = `${disponibles.length} producto${disponibles.length === 1 ? '' : 's'} con precio` +
    (noDisponibles.length ? `   ·   ${noDisponibles.length} sin precio por ahora` : '') +
    `   ·   Emitido el ${fechaCorta(detalle.fecha_creacion)}`
  doc.text(lineasMax(doc, resumen, PAG.contenido, 1), PAG.margen, yRegla + 6)

  /* ===== 01 · Productos disponibles ===== */
  let y = yRegla + 14
  y = seccion(doc, y, '01', 'Productos disponibles')
  const rDisp = tabla(doc, y + 3, {
    numero,
    fuente: 8.3,
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
  y = rDisp.y
  const xTotales = rDisp.cols[3].x // borde izquierdo de "P. unitario"

  /* ===== 02 · Sin precio ===== */
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
    }).y
  }

  /* ===== Total: caja angosta que arranca bajo "P. unitario" ===== */
  const total = disponibles.reduce((s, it) => s + it.subtotal, 0)
  const xCaja = xTotales
  const wCaja = PAG.ancho - PAG.margen - xCaja
  const hCaja = 16
  if (y + hCaja + 6 > Y_TOTALES) { doc.addPage(); y = cabeceraContinuacion(doc, numero) }

  // Contorno fino desplazado (efecto de sombra sin relleno) y caja principal
  doc.setDrawColor(...T.suave)
  doc.setLineWidth(0.2)
  doc.rect(xCaja + 1.5, y + 1.5, wCaja, hCaja, 'S')
  doc.setDrawColor(...T.tinta)
  doc.setLineWidth(0.9)
  doc.rect(xCaja, y, wCaja, hCaja, 'S')

  etiqueta(doc, 'Total del presupuesto', xCaja + 5, y + 5.6, { color: T.tinta, size: 6.2 })
  const textoTotal = usdCode(total)
  doc.setFont('helvetica', 'bold')
  let tt = 15
  doc.setFontSize(tt)
  while (doc.getTextWidth(textoTotal) > wCaja - 10 && tt > 9) {
    tt -= 0.5
    doc.setFontSize(tt)
  }
  tinta(doc, T.azul)
  doc.text(textoTotal, xCaja + wCaja - 5, y + 12.5, { align: 'right' })

  /* ===== Disclaimer de vigencia, a la izquierda de la caja =====
     Reemplaza la vieja nota "Suma de X líneas con precio...". */
  const anchoNota = xCaja - PAG.margen - 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.2)
  tinta(doc, T.tinta)
  textoEsp(doc, 'VIGENCIA DEL PRESUPUESTO', PAG.margen, y + 4, { cs: 0.6 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.3)
  tinta(doc, T.gris)
  const disclaimer = doc.splitTextToSize(
    'Este presupuesto tiene una vigencia de 24 horas a partir de su creación. Pasado ese tiempo, puedes solicitar una recotización desde la plataforma web.',
    Math.max(anchoNota, 50)
  )
  doc.text(disclaimer, PAG.margen, y + 8.4)
  y += hCaja + 10

  /* ===== Pie en todas las páginas ===== */
  const paginas = doc.internal.getNumberOfPages()
  const legenda = 'Presupuesto sin valor fiscal: no es una factura. Los precios pueden variar hasta la emisión de la factura.'
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    linea(doc, PAG.alto - 16, { grosor: 0.4, color: T.tinta })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    tinta(doc, T.tinta)
    doc.text(String(e.nombre), PAG.margen, PAG.alto - 11)
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
