// src/utils/generarReporteEstadoCuentaPDF.js
//
// Estado de cuenta por período, con formato de extracto bancario. Pensado para
// verse igual de bien en pantalla (PDF digital) que impreso en A4.
//
// Estructura:
//   Página 1 · banda Índigo con titular y período + 4 tarjetas blancas de
//              crédito (línea, deuda actual, deuda vencida, disponible) +
//              barra de uso de la línea con semáforo.
//   Gráfico  · barras facturado vs. pagado por mes (si hay 2+ meses).
//   Resumen  · total de cargos, total de abonos y neto del período.
//   Vencimientos de crédito con semáforo.
//   Movimientos · extracto con columnas Cargos / Abonos / Acumulado.
//   Órdenes pendientes de facturación del período.
//   Páginas 2+ · cabecera corrida con titular y período; pie "Página X de Y".
//
// Decisiones de impresión:
//   · La banda de portada NO sangra al borde de la hoja: va inset (12 mm) con
//     esquinas redondeadas, porque la mayoría de impresoras no llegan al borde
//     y una banda a sangre quedaría con un filo blanco irregular.
//   · Todo el color son rellenos planos (sin degradados) y las tablas no usan
//     zebra: el consumo de tinta es moderado aunque haya color.
//
// "Acumulado" es la suma de abonos menos cargos DESDE EL INICIO DEL PERÍODO.
// No es el saldo total de la cuenta (el backend no entrega el saldo inicial) y
// el PDF lo aclara al pie de la tabla.
//
// Este formato dibuja todo por su cuenta y NO modifica pdfBase.js: ese módulo
// lo comparten la factura, el comprobante, etc. Solo se reutilizan de pdfBase
// la paleta, los formateadores y las utilidades neutras.
//
// Uso (misma firma que antes):
//   await generarReporteEstadoCuentaPDF({
//     cliente, resumen, facturas, pagos, ordenes, desde, hasta,
//     vencimientos?   // (opcional) ordenes_pendientes completas, sin filtrar por período
//   })

import { LOGO_BLANCO } from '../config/logos'
import {
  C, PAG, usdCode, fechaCorta, fechaLarga, fechaHora,
  nuevoDoc, datosEmpresa, textoEsp,
} from './pdf/pdfBase'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const SOMBRA = [233, 236, 244]
const Y_MAX = 297 - 24 // bajo este punto se salta de página (A4)

const compacto = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`)
const conSigno = (v) => `${v < 0 ? '- ' : v > 0 ? '+ ' : ''}${usdCode(Math.abs(v))}`

/* ---------- Logo blanco compuesto sobre el Índigo sólido de la banda ----------
   El logo blanco es transparente; se pinta sobre un lienzo Índigo y se exporta
   como JPEG (jsPDF lo copia tal cual). Si algo falla devuelve null y la banda
   muestra el nombre de la empresa en texto: nunca rompe el PDF. */
let logoIndigo
async function cargarLogoIndigo() {
  if (logoIndigo !== undefined) return logoIndigo
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
    const W = 600
    const H = Math.max(1, Math.round(W / ratio))
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d no disponible')
    ctx.fillStyle = `rgb(${C.indigo.join(',')})`
    ctx.fillRect(0, 0, W, H)
    ctx.drawImage(img, 0, 0, W, H)
    logoIndigo = { data: canvas.toDataURL('image/jpeg', 0.95), ratio }
  } catch {
    logoIndigo = null
  }
  return logoIndigo
}

/* ---------- Utilidades de dibujo ---------- */
const relleno = (doc, c) => doc.setFillColor(...c)
const tinta = (doc, c) => doc.setTextColor(...c)
const trazo = (doc, c, w = 0.2) => { doc.setDrawColor(...c); doc.setLineWidth(w) }

function etiqueta(doc, txt, x, y, { align = 'left', color = C.muted, size = 6.5, cs = 0.6 } = {}) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size)
  tinta(doc, color)
  textoEsp(doc, String(txt).toUpperCase(), x, y, { align, cs })
}

/* Parte al ancho dado y recorta a `max` líneas con "…" */
function lineasMax(doc, texto, ancho, max) {
  const ls = doc.splitTextToSize(String(texto ?? ''), ancho)
  if (ls.length <= max) return ls
  const corte = ls.slice(0, max)
  corte[max - 1] = `${corte[max - 1].replace(/[\s,;:·-]+$/, '')}…`
  return corte
}

function pildora(doc, x, yc, txt, { fondo, color }) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  const w = doc.getTextWidth(txt) + 7
  relleno(doc, fondo)
  doc.roundedRect(x, yc - 3.1, w, 6.2, 3.1, 3.1, 'F')
  tinta(doc, color)
  doc.text(txt, x + 3.5, yc + 0.95)
  return w
}

/* Título de sección: texto Índigo, filete fino y un acento Azul corto */
function seccion(doc, y, titulo, nota) {
  const M = PAG.margen
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  tinta(doc, C.indigo)
  doc.text(titulo, M, y)
  if (nota) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    tinta(doc, C.muted)
    doc.text(nota, M + PAG.contenido, y, { align: 'right' })
  }
  trazo(doc, C.borde, 0.25)
  doc.line(M, y + 2.8, M + PAG.contenido, y + 2.8)
  trazo(doc, C.azul, 0.9)
  doc.line(M, y + 2.8, M + 14, y + 2.8)
  return y + 9
}

/* Cabecera corrida de las páginas 2+ */
function nuevaPagina(doc, ctx) {
  doc.addPage()
  relleno(doc, C.indigo)
  doc.roundedRect(12, 10, 186, 11, 2.5, 2.5, 'F')
  etiqueta(doc, 'Estado de cuenta', 18, 16.8, { color: C.blanco, size: 7, cs: 0.9 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  tinta(doc, C.luz)
  doc.text(lineasMax(doc, `${ctx.titular}   ·   ${ctx.periodo}`, 120, 1), 192, 16.8, { align: 'right' })
  return 30
}

function asegurar(doc, y, alto, ctx) {
  return y + alto > Y_MAX ? nuevaPagina(doc, ctx) : y
}

/* ---------- Tabla de extracto: cabecera tintada, sin zebra, filetes finos ---------- */
function tabla(doc, y, ctx, { cols, filas, celda, vacio = 'Sin registros.', fuente = 8.5, altoMin = 8.5, maxLineas = 2 }) {
  const M = PAG.margen
  const total = cols.reduce((s, c) => s + c.ancho, 0)
  const k = PAG.contenido / total
  let x = M
  const cs = cols.map((c) => { const o = { ...c, w: c.ancho * k, x }; x += o.w; return o })
  const tx = (c) => (c.align === 'right' ? c.x + c.w - 2.5 : c.align === 'center' ? c.x + c.w / 2 : c.x + 2.5)

  const cabecera = (yy) => {
    relleno(doc, C.gris)
    doc.rect(M, yy, PAG.contenido, 7, 'F')
    cs.forEach((c) => etiqueta(doc, c.label, tx(c), yy + 4.6, { align: c.align || 'left', size: 6.3 }))
    trazo(doc, C.indigo, 0.5)
    doc.line(M, yy + 7, M + PAG.contenido, yy + 7)
    return yy + 7
  }

  if (!filas.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    tinta(doc, C.muted)
    doc.text(vacio, M, y + 4)
    return y + 12
  }

  let yy = cabecera(y)
  filas.forEach((fila, idx) => {
    doc.setFontSize(fuente)
    // Las columnas `nowrap` (importes) nunca se parten: si no caben, bajan el cuerpo
    const tam = []
    const celdas = fila.map((v, i) => {
      doc.setFont('helvetica', cs[i].bold ? 'bold' : 'normal')
      tam[i] = fuente
      if (cs[i].nowrap) {
        const t = String(v ?? '')
        doc.setFontSize(fuente)
        while (doc.getTextWidth(t) > cs[i].w - 5 && tam[i] > 6) {
          tam[i] -= 0.25
          doc.setFontSize(tam[i])
        }
        return t ? [t] : []
      }
      return lineasMax(doc, v ?? '', cs[i].w - 5, maxLineas)
    })
    const n = Math.max(1, ...celdas.map((l) => l.length))
    const h = Math.max(altoMin, n * 3.9 + 4.6)

    if (yy + h > Y_MAX) {
      yy = cabecera(nuevaPagina(doc, ctx))
    }

    celdas.forEach((ls, i) => {
      const c = cs[i]
      if (celda && celda(doc, { x: c.x, y: yy, w: c.w, h, col: i, idx, fila })) return
      doc.setFont('helvetica', c.bold ? 'bold' : 'normal')
      doc.setFontSize(tam[i])
      const col = typeof c.color === 'function' ? c.color(fila[i], fila) : c.color || C.texto
      tinta(doc, col)
      const y0 = yy + (h - ls.length * 3.9) / 2 + 2.9
      doc.text(ls, tx(c), y0, { align: c.align || 'left', lineHeightFactor: 1.15 })
    })
    yy += h
    trazo(doc, C.borde, 0.15)
    doc.line(M, yy, M + PAG.contenido, yy)
  })
  return yy + 7
}

/* ---------- Portada: banda Índigo + tarjetas blancas ---------- */
function dibujarPortada(doc, { cliente, resumen, desde, hasta, logo, e }) {
  const xi = 20
  const xd = 190

  // Banda: inset y con esquinas redondeadas (segura para impresión)
  relleno(doc, C.indigo)
  doc.roundedRect(12, 10, 186, 60, 3.5, 3.5, 'F')

  // Marca
  if (logo) {
    const h = 10
    const w = Math.min(logo.ratio * h, 50)
    try {
      doc.addImage(logo.data, 'JPEG', xi, 16, w, w / logo.ratio)
    } catch {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); tinta(doc, C.blanco)
      doc.text(String(e.nombre).toUpperCase(), xi, 23, { charSpace: 0.4 })
    }
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); tinta(doc, C.blanco)
    doc.text(String(e.nombre).toUpperCase(), xi, 23, { charSpace: 0.4 })
  }

  // Documento + período
  etiqueta(doc, 'Estado de cuenta', xd, 18, { align: 'right', color: C.luz, size: 7, cs: 1 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  tinta(doc, C.blanco)
  doc.text(`${fechaCorta(desde)}  –  ${fechaCorta(hasta)}`, xd, 24.8, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  tinta(doc, C.luz)
  doc.text(`Generado el ${fechaHora(new Date())}`, xd, 29.6, { align: 'right' })

  // Acento Azul + divisor fino
  trazo(doc, C.azul, 1.2)
  doc.line(xi, 34, xi + 16, 34)
  trazo(doc, [58, 58, 104], 0.3)
  doc.line(xi + 16, 34, xd, 34)

  // Titular
  etiqueta(doc, 'Titular', xi, 40.5, { color: C.luz, size: 6.3, cs: 1 })
  doc.setFont('helvetica', 'bold')
  let tam = 17
  doc.setFontSize(tam)
  const nombre = String(cliente?.nombre || 'Cliente')
  while (doc.getTextWidth(nombre) > xd - xi && tam > 11) { tam -= 1; doc.setFontSize(tam) }
  tinta(doc, C.blanco)
  doc.text(nombre, xi, 48)

  const linea1 = [cliente?.rif_cedula && `RIF / C.I. ${cliente.rif_cedula}`, cliente?.telefono, cliente?.email]
    .filter(Boolean).join('   ·   ')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.2)
  tinta(doc, C.luz)
  if (linea1) doc.text(lineasMax(doc, linea1, xd - xi, 1), xi, 54)
  if (cliente?.direccion_fiscal) {
    doc.setFontSize(7.5)
    doc.text(lineasMax(doc, cliente.direccion_fiscal, xd - xi, 1), xi, 58.6)
  }

  // Tarjetas blancas: montan sobre el borde inferior de la banda
  const linea = Number(resumen?.linea_credito || 0)
  const deuda = Number(resumen?.deuda_actual || 0)
  const vencida = Number(resumen?.deuda_vencida || 0)
  const saldo = Number(resumen?.saldo ?? linea - deuda)
  const tarjetas = [
    { label: 'Línea de crédito', valor: linea, color: C.indigo },
    { label: 'Deuda actual', valor: deuda, color: deuda > 0 ? C.rojo : C.indigo },
    { label: 'Deuda vencida', valor: vencida, color: vencida > 0 ? C.rojo : C.muted },
    { label: 'Disponible', valor: saldo, color: saldo >= 0 ? C.verde : C.rojo },
  ]
  const M = PAG.margen
  const gap = 4
  const w = (PAG.contenido - gap * 3) / 4
  const yc = 62
  const hc = 26
  tarjetas.forEach((t, i) => {
    const x = M + i * (w + gap)
    relleno(doc, SOMBRA)
    doc.roundedRect(x + 0.5, yc + 0.9, w, hc, 3, 3, 'F')
    relleno(doc, C.blanco)
    trazo(doc, C.borde, 0.25)
    doc.roundedRect(x, yc, w, hc, 3, 3, 'FD')
    relleno(doc, t.color)
    doc.roundedRect(x + 5, yc + 5.2, 7, 1, 0.5, 0.5, 'F')
    etiqueta(doc, t.label, x + 5, yc + 11.2, { size: 6.4, cs: 0.5 })
    const txt = usdCode(t.valor)
    doc.setFont('helvetica', 'bold')
    let ts = 12.5
    doc.setFontSize(ts)
    while (doc.getTextWidth(txt) > w - 9 && ts > 8) { ts -= 0.5; doc.setFontSize(ts) }
    tinta(doc, t.color)
    doc.text(txt, x + 5, yc + 20)
  })

  // Uso de la línea de crédito: barra con marcas de semáforo (70 % y 90 %)
  let y = yc + hc + 11
  if (linea > 0) {
    const uso = Math.min(Math.max(deuda / linea, 0), 1)
    const color = uso >= 0.9 ? C.rojo : uso >= 0.7 ? C.ambar : C.teal
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    tinta(doc, C.indigo)
    doc.text('Uso de la línea de crédito', M, y)
    doc.setFontSize(11)
    tinta(doc, color)
    doc.text(`${(uso * 100).toFixed(0)} %`, M + PAG.contenido, y, { align: 'right' })

    const yb = y + 3.6
    relleno(doc, C.gris)
    doc.roundedRect(M, yb, PAG.contenido, 4.2, 2.1, 2.1, 'F')
    if (uso > 0) {
      relleno(doc, color)
      doc.roundedRect(M, yb, Math.max(PAG.contenido * uso, 4.2), 4.2, 2.1, 2.1, 'F')
    }
    ;[0.7, 0.9].forEach((m) => {
      const xm = M + PAG.contenido * m
      trazo(doc, C.muted, 0.25)
      doc.line(xm, yb + 4.2, xm, yb + 6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      tinta(doc, C.muted)
      doc.text(`${m * 100} %`, xm, yb + 8.6, { align: 'center' })
    })
    doc.setFontSize(7.5)
    tinta(doc, C.muted)
    doc.text(`Deuda actual ${usdCode(deuda)} de ${usdCode(linea)}`, M, yb + 8.6)
    y = yb + 8.6 + 9
  } else {
    y += 2
  }
  return y
}

/* ---------- Gráfico de barras: facturado vs pagado por mes ---------- */
function dibujarGrafico(doc, y, ctx, facturas, pagos) {
  const mapa = new Map()
  const clave = (f) => { const d = new Date(f); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
  facturas.forEach((f) => { const k = clave(f.created_at); const m = mapa.get(k) || { f: 0, p: 0 }; m.f += Number(f.monto_facturado || 0); mapa.set(k, m) })
  pagos.forEach((p) => { const k = clave(p.created_at); const m = mapa.get(k) || { f: 0, p: 0 }; m.p += Number(p.monto || 0); mapa.set(k, m) })
  const meses = [...mapa.keys()].sort().slice(-8)
  if (meses.length < 2) return y // con un solo mes el gráfico no aporta

  const M = PAG.margen
  const alto = 9 + 64
  y = asegurar(doc, y, alto, ctx)
  y = seccion(doc, y, 'Facturado vs. pagado por mes', `Últimos ${meses.length} meses con actividad`)

  // Tarjeta contenedora
  const hCard = 62
  relleno(doc, C.blanco)
  trazo(doc, C.borde, 0.25)
  doc.roundedRect(M, y, PAG.contenido, hCard, 3, 3, 'FD')

  // Leyenda arriba a la derecha
  const ly = y + 7
  relleno(doc, C.azul); doc.roundedRect(M + PAG.contenido - 50, ly - 2.7, 3.4, 3.4, 0.8, 0.8, 'F')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); tinta(doc, C.texto)
  doc.text('Facturado', M + PAG.contenido - 45.6, ly)
  relleno(doc, C.teal); doc.roundedRect(M + PAG.contenido - 24, ly - 2.7, 3.4, 3.4, 0.8, 0.8, 'F')
  doc.text('Pagado', M + PAG.contenido - 19.6, ly)

  const max = Math.max(...meses.flatMap((k) => [mapa.get(k).f, mapa.get(k).p]), 1)
  const areaX = M + 17
  const areaW = PAG.contenido - 17 - 6
  const areaH = 33
  const top = y + 15

  // Líneas guía con valores del eje
  for (let i = 0; i <= 3; i++) {
    const yy = top + areaH - (areaH * i) / 3
    trazo(doc, C.borde, i === 0 ? 0.35 : 0.15)
    doc.line(areaX, yy, areaX + areaW, yy)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); tinta(doc, C.muted)
    doc.text(i === 0 ? '$0' : compacto((max * i) / 3), areaX - 2, yy + 0.9, { align: 'right' })
  }

  const grupoW = areaW / meses.length
  const barW = Math.min(9, grupoW * 0.3)
  const fuenteVal = meses.length > 6 ? 5.6 : 6.4
  meses.forEach((k, i) => {
    const { f, p } = mapa.get(k)
    const cx = areaX + grupoW * i + grupoW / 2
    const hf = (f / max) * areaH
    const hp = (p / max) * areaH
    if (hf > 0) { relleno(doc, C.azul); doc.roundedRect(cx - barW - 0.6, top + areaH - hf, barW, hf, 0.9, 0.9, 'F') }
    if (hp > 0) { relleno(doc, C.teal); doc.roundedRect(cx + 0.6, top + areaH - hp, barW, hp, 0.9, 0.9, 'F') }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(fuenteVal)
    if (hf > 0) { tinta(doc, C.azul); doc.text(compacto(f), cx - barW / 2 - 0.6, top + areaH - hf - 1.3, { align: 'center' }) }
    if (hp > 0) { tinta(doc, C.teal); doc.text(compacto(p), cx + barW / 2 + 0.6, top + areaH - hp - 1.3, { align: 'center' }) }

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); tinta(doc, C.muted)
    const [anio, mes] = k.split('-')
    doc.text(`${MESES[Number(mes) - 1]} ${anio.slice(2)}`, cx, top + areaH + 5.6, { align: 'center' })
  })

  return y + hCard + 9
}

/* ---------- Resumen del período: cargos, abonos y neto ---------- */
function dibujarResumenPeriodo(doc, y, ctx, { totalCargos, totalAbonos, neto, nFact, nPag }) {
  const M = PAG.margen
  y = asegurar(doc, y, 9 + 22, ctx)
  y = seccion(doc, y, 'Resumen del período', `${nFact} factura${nFact === 1 ? '' : 's'}  ·  ${nPag} pago${nPag === 1 ? '' : 's'}`)

  const h = 20
  const w = PAG.contenido / 3
  relleno(doc, C.blanco)
  trazo(doc, C.borde, 0.25)
  doc.roundedRect(M, y, PAG.contenido, h, 3, 3, 'FD')
  // Tercera celda (neto) en Índigo: esquinas redondeadas a la derecha
  relleno(doc, C.indigo)
  doc.roundedRect(M + w * 2, y, w, h, 3, 3, 'F')
  doc.rect(M + w * 2, y, 6, h, 'F')

  trazo(doc, C.borde, 0.25)
  doc.line(M + w, y + 4, M + w, y + h - 4)

  const celdas = [
    { label: 'Total cargos (facturado)', valor: usdCode(totalCargos), color: C.texto, lab: C.muted },
    { label: 'Total abonos (pagado)', valor: usdCode(totalAbonos), color: C.verde, lab: C.muted },
    { label: 'Neto del período', valor: conSigno(neto), color: C.blanco, lab: C.luz },
  ]
  celdas.forEach((c, i) => {
    const x = M + w * i + 7
    etiqueta(doc, c.label, x, y + 7.4, { color: c.lab, size: 6.2, cs: 0.5 })
    doc.setFont('helvetica', 'bold')
    let ts = 13
    doc.setFontSize(ts)
    while (doc.getTextWidth(c.valor) > w - 11 && ts > 8) { ts -= 0.5; doc.setFontSize(ts) }
    tinta(doc, c.color)
    doc.text(c.valor, x, y + 15.2)
  })
  return y + h + 9
}

/* ---------- Vencimientos con semáforo ---------- */
function dibujarVencimientos(doc, y, ctx, ordenes) {
  const lista = ordenes
    .filter((o) => o.fecha_vencimiento)
    .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))
    .slice(0, 12)
  if (!lista.length) return y

  y = asegurar(doc, y, 9 + 7 + 9 * 2, ctx)
  y = seccion(doc, y, 'Vencimientos de crédito', lista.length === 12 ? 'Próximos 12' : null)

  const hoy = new Date()
  const dias = (f) => Math.ceil((new Date(f) - hoy) / 86400000)
  const estado = (o) => {
    const d = dias(o.fecha_vencimiento)
    if (o.vencida || d < 0) return { txt: `VENCIDA · ${Math.abs(d)} d`, fondo: C.rojoClaro, color: C.rojo }
    if (d <= 5) return { txt: `POR VENCER · ${d} d`, fondo: C.ambarClaro, color: C.ambar }
    return { txt: `VIGENTE · ${d} d`, fondo: C.verdeClaro, color: C.verde }
  }

  return tabla(doc, y, ctx, {
    cols: [
      { label: 'Orden', ancho: 26, bold: true },
      { label: 'Fecha de vencimiento', ancho: 56 },
      { label: 'Estado', ancho: 56 },
      { label: 'Monto', ancho: 40, align: 'right', bold: true, nowrap: true },
    ],
    filas: lista.map((o) => [`#${o.id}`, fechaLarga(o.fecha_vencimiento), '', usdCode(o.total_usd)]),
    celda: (d, { x, y: yy, h, col, idx }) => {
      if (col !== 2) return false
      const e = estado(lista[idx])
      pildora(d, x + 2.5, yy + h / 2, e.txt, e)
      return true
    },
  })
}

/* ---------- Movimientos: extracto con Cargos / Abonos / Acumulado ---------- */
function dibujarMovimientos(doc, y, ctx, movs) {
  y = asegurar(doc, y, 9 + 7 + 9 * 2, ctx)
  y = seccion(doc, y, 'Movimientos del período', 'Ordenados por fecha')

  let acum = 0
  const filas = movs.map((m) => {
    acum += m.signo > 0 ? m.monto : -m.monto
    return [
      fechaCorta(m.fecha),
      m.desc,
      m.ref,
      m.signo < 0 ? usdCode(m.monto) : '',
      m.signo > 0 ? usdCode(m.monto) : '',
      conSigno(acum),
    ]
  })

  y = tabla(doc, y, ctx, {
    vacio: 'No hay movimientos registrados en este período.',
    cols: [
      { label: 'Fecha', ancho: 22, nowrap: true },
      { label: 'Descripción', ancho: 48 },
      { label: 'Referencia', ancho: 22, color: C.muted, nowrap: true },
      { label: 'Cargos', ancho: 28, align: 'right', bold: true, nowrap: true },
      { label: 'Abonos', ancho: 28, align: 'right', bold: true, color: C.verde, nowrap: true },
      { label: 'Acumulado', ancho: 30, align: 'right', bold: true, nowrap: true, color: (v) => (String(v).startsWith('-') ? C.rojo : String(v).startsWith('+') ? C.verde : C.muted) },
    ],
    filas,
  })

  if (movs.length) {
    y = asegurar(doc, y - 3, 8, ctx)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    tinta(doc, C.muted)
    doc.text(
      'Cargos: facturas emitidas. Abonos: pagos registrados. Acumulado: abonos menos cargos desde el inicio del período; no es el saldo total de la cuenta.',
      PAG.margen, y + 2, { maxWidth: PAG.contenido }
    )
    y += 11
  }
  return y
}

/* ---------- Órdenes pendientes de facturación ---------- */
function dibujarOrdenesPendientes(doc, y, ctx, ordenes) {
  y = asegurar(doc, y, 9 + 7 + 9 * 2, ctx)
  y = seccion(doc, y, 'Órdenes pendientes de facturación', 'En el período')
  return tabla(doc, y, ctx, {
    cols: [
      { label: 'Orden', ancho: 30, bold: true },
      { label: 'Forma de pago', ancho: 50 },
      { label: 'Fecha', ancho: 50 },
      { label: 'Total', ancho: 48, align: 'right', bold: true, nowrap: true },
    ],
    filas: ordenes.map((o) => [`#${o.id}`, o.forma_pago === 'credito' ? 'Crédito' : 'Contado', fechaCorta(o.created_at), usdCode(o.total_usd)]),
  })
}

/* ---------- Pie de todas las páginas ---------- */
function dibujarPies(doc, e) {
  const M = PAG.margen
  const n = doc.internal.getNumberOfPages()
  for (let p = 1; p <= n; p++) {
    doc.setPage(p)
    trazo(doc, C.borde, 0.25)
    doc.line(M, 281, M + PAG.contenido, 281)
    trazo(doc, C.azul, 0.9)
    doc.line(M, 281, M + 14, 281)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    tinta(doc, C.indigo)
    doc.text(String(e.nombre), M, 286)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    tinta(doc, C.muted)
    doc.text('Documento generado automáticamente, no requiere firma.', M, 290)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    tinta(doc, C.indigo)
    doc.text(`Página ${p} de ${n}`, M + PAG.contenido, 286, { align: 'right' })
  }
}

/* ---------- Principal ---------- */
export default async function generarReporteEstadoCuentaPDF({
  cliente, resumen, facturas = [], pagos = [], ordenes = [], vencimientos = [], desde, hasta,
}) {
  const doc = await nuevoDoc()
  const logo = await cargarLogoIndigo()
  const e = datosEmpresa()
  const ctx = {
    titular: String(cliente?.nombre || 'Cliente'),
    periodo: `${fechaCorta(desde)} – ${fechaCorta(hasta)}`,
  }

  // Movimientos (cargos = facturas, abonos = pagos), ordenados por fecha
  const movs = [
    ...facturas.map((f) => ({
      fecha: f.created_at,
      desc: f.nota ? `Factura N.º ${f.numero_factura} — ${f.nota}` : `Factura N.º ${f.numero_factura}`,
      ref: `N.º ${f.numero_factura}`,
      monto: Number(f.monto_facturado || 0),
      signo: -1,
    })),
    ...pagos.map((p) => ({
      fecha: p.created_at,
      desc: p.detalle ? `Abono registrado — ${p.detalle}` : 'Abono registrado',
      ref: `Recibo ${p.id}`,
      monto: Number(p.monto || 0),
      signo: 1,
    })),
  ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

  const totalCargos = movs.filter((m) => m.signo < 0).reduce((s, m) => s + m.monto, 0)
  const totalAbonos = movs.filter((m) => m.signo > 0).reduce((s, m) => s + m.monto, 0)

  let y = dibujarPortada(doc, { cliente, resumen, desde, hasta, logo, e })
  y = dibujarGrafico(doc, y, ctx, facturas, pagos)
  if (movs.length) {
    y = dibujarResumenPeriodo(doc, y, ctx, {
      totalCargos, totalAbonos, neto: totalAbonos - totalCargos, nFact: facturas.length, nPag: pagos.length,
    })
  }
  y = dibujarVencimientos(doc, y, ctx, vencimientos)
  y = dibujarMovimientos(doc, y, ctx, movs)
  if (ordenes.length > 0) dibujarOrdenesPendientes(doc, y, ctx, ordenes)

  dibujarPies(doc, e)
  doc.save(`estado-de-cuenta-${desde}-a-${hasta}.pdf`)
}