// src/utils/generarReporteEstadoCuentaPDF.js
//
// Reporte de estado de cuenta por período. Incluye: resumen de crédito con barra
// de uso, gráfico mensual facturado vs pagado, vencimientos con semáforo,
// movimientos del período con totales y órdenes pendientes.
//
// Uso:
//   await generarReporteEstadoCuentaPDF({
//     cliente, resumen, facturas, pagos, ordenes, desde, hasta,
//     vencimientos?   // (opcional) ordenes_pendientes completas, sin filtrar por período
//   })

import {
  C, PAG, Y_LIMITE, usdCode, fechaCorta, fechaLarga, fechaHora,
  nuevoDoc, dibujarMembrete, dibujarPie, dibujarSeccion, dibujarTarjetaCliente,
  dibujarPildora, dibujarTabla,
} from './pdf/pdfBase'

const compacto = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`)
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export default async function generarReporteEstadoCuentaPDF({
  cliente, resumen, facturas = [], pagos = [], ordenes = [], vencimientos = [], desde, hasta,
}) {
  const doc = await nuevoDoc()

  let y = dibujarMembrete(doc, {
    etiqueta: 'Estado de cuenta',
    numero: `${fechaCorta(desde)} – ${fechaCorta(hasta)}`,
    numeroSize: 15,
    sub: `Generado el ${fechaHora(new Date())}`,
  })

  y = dibujarTarjetaCliente(doc, y, cliente, 'Cliente')
  y = dibujarResumen(doc, y, resumen)
  y = dibujarGraficoMensual(doc, y, facturas, pagos)
  y = dibujarVencimientos(doc, y, vencimientos)
  y = dibujarMovimientos(doc, y, facturas, pagos)
  if (ordenes.length > 0) dibujarOrdenesPendientes(doc, y, ordenes)

  dibujarPie(doc, 'Documento generado automáticamente, no requiere firma.')
  doc.save(`estado-de-cuenta-${desde}-a-${hasta}.pdf`)
}

/* ---------- KPIs + barra de uso de crédito ---------- */
function dibujarResumen(doc, y, r = {}) {
  const linea = Number(r.linea_credito || 0)
  const deuda = Number(r.deuda_actual || 0)
  const vencida = Number(r.deuda_vencida || 0)
  const saldo = Number(r.saldo ?? linea - deuda)

  const tarjetas = [
    { label: 'Línea de crédito', valor: linea, color: C.indigo },
    { label: 'Deuda actual', valor: deuda, color: deuda > 0 ? C.rojo : C.indigo },
    { label: 'Deuda vencida', valor: vencida, color: vencida > 0 ? C.rojo : C.muted },
    { label: 'Disponible', valor: saldo, color: saldo >= 0 ? C.verde : C.rojo },
  ]
  const gap = 4
  const w = (PAG.contenido - gap * 3) / 4
  tarjetas.forEach((t, i) => {
    const x = PAG.margen + i * (w + gap)
    doc.setFillColor(...C.blanco)
    doc.setDrawColor(...C.borde)
    doc.setLineWidth(0.25)
    doc.roundedRect(x, y, w, 23, 3, 3, 'FD')
    doc.setFillColor(...t.color)
    doc.roundedRect(x, y + 4, 1.4, 15, 0.7, 0.7, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(...C.muted)
    doc.text(t.label.toUpperCase(), x + 5, y + 8.5, { charSpace: 0.3 })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11.5)
    doc.setTextColor(...t.color)
    doc.text(usdCode(t.valor), x + 5, y + 17.5)
  })
  y += 23 + 6

  // Barra de uso de crédito
  if (linea > 0) {
    const uso = Math.min(Math.max(deuda / linea, 0), 1)
    const color = uso >= 0.9 ? C.rojo : uso >= 0.7 ? C.ambar : C.teal
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.muted)
    doc.text('Uso de la línea de crédito', PAG.margen, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color)
    doc.text(`${(uso * 100).toFixed(0)}%`, PAG.margen + PAG.contenido, y, { align: 'right' })
    doc.setFillColor(...C.gris)
    doc.roundedRect(PAG.margen, y + 2.5, PAG.contenido, 3.4, 1.7, 1.7, 'F')
    if (uso > 0) {
      doc.setFillColor(...color)
      doc.roundedRect(PAG.margen, y + 2.5, Math.max(PAG.contenido * uso, 3.4), 3.4, 1.7, 1.7, 'F')
    }
    y += 14
  } else {
    y += 4
  }
  return y
}

/* ---------- Gráfico de barras: facturado vs pagado por mes ---------- */
function dibujarGraficoMensual(doc, y, facturas, pagos) {
  const mapa = new Map()
  const clave = (f) => { const d = new Date(f); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
  facturas.forEach((f) => { const k = clave(f.created_at); const m = mapa.get(k) || { f: 0, p: 0 }; m.f += Number(f.monto_facturado || 0); mapa.set(k, m) })
  pagos.forEach((p) => { const k = clave(p.created_at); const m = mapa.get(k) || { f: 0, p: 0 }; m.p += Number(p.monto || 0); mapa.set(k, m) })
  const meses = [...mapa.keys()].sort().slice(-8)
  if (meses.length < 2) return y // con un solo mes el gráfico no aporta

  const alto = 62
  if (y + alto > Y_LIMITE) { doc.addPage(); y = 20 }
  y = dibujarSeccion(doc, y, 'Facturado vs. pagado por mes')

  const areaX = PAG.margen + 2
  const areaW = PAG.contenido - 4
  const areaH = 34
  y += 3 // aire para los valores sobre las barras
  const max = Math.max(...meses.flatMap((k) => [mapa.get(k).f, mapa.get(k).p]), 1)

  // líneas guía
  doc.setDrawColor(...C.borde)
  doc.setLineWidth(0.15)
  for (let i = 0; i <= 3; i++) doc.line(areaX, y + areaH - (areaH * i) / 3, areaX + areaW, y + areaH - (areaH * i) / 3)

  const grupoW = areaW / meses.length
  const barW = Math.min(9, grupoW * 0.32)
  meses.forEach((k, i) => {
    const { f, p } = mapa.get(k)
    const cx = areaX + grupoW * i + grupoW / 2
    const hf = (f / max) * areaH
    const hp = (p / max) * areaH
    doc.setFillColor(...C.azul)
    if (hf > 0) doc.roundedRect(cx - barW - 0.6, y + areaH - hf, barW, hf, 1, 1, 'F')
    doc.setFillColor(...C.teal)
    if (hp > 0) doc.roundedRect(cx + 0.6, y + areaH - hp, barW, hp, 1, 1, 'F')

    // valores compactos sobre cada barra
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    if (hf > 0) { doc.setTextColor(...C.azul); doc.text(compacto(f), cx - barW / 2 - 0.6, y + areaH - hf - 1.4, { align: 'center' }) }
    if (hp > 0) { doc.setTextColor(...C.teal); doc.text(compacto(p), cx + barW / 2 + 0.6, y + areaH - hp - 1.4, { align: 'center' }) }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    const [anio, mes] = k.split('-')
    doc.text(`${MESES[Number(mes) - 1]} ${anio.slice(2)}`, cx, y + areaH + 5, { align: 'center' })
  })

  // leyenda
  const ly = y + areaH + 11
  doc.setFillColor(...C.azul); doc.roundedRect(PAG.margen + 2, ly - 2.6, 3.4, 3.4, 0.8, 0.8, 'F')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C.texto)
  doc.text('Facturado', PAG.margen + 7.5, ly)
  doc.setFillColor(...C.teal); doc.roundedRect(PAG.margen + 32, ly - 2.6, 3.4, 3.4, 0.8, 0.8, 'F')
  doc.text('Pagado', PAG.margen + 37.5, ly)
  doc.setTextColor(...C.muted)
  doc.text(`Máximo del gráfico: ${usdCode(max)}`, PAG.margen + PAG.contenido, ly, { align: 'right' })

  return ly + 9
}

/* ---------- Vencimientos con semáforo ---------- */
function dibujarVencimientos(doc, y, ordenes) {
  const lista = ordenes
    .filter((o) => o.fecha_vencimiento)
    .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))
    .slice(0, 12)
  if (!lista.length) return y

  if (y + 30 > Y_LIMITE) { doc.addPage(); y = 20 }
  y = dibujarSeccion(doc, y, 'Vencimientos de crédito')

  const hoy = new Date()
  const dias = (f) => Math.ceil((new Date(f) - hoy) / 86400000)
  const estado = (o) => {
    const d = dias(o.fecha_vencimiento)
    if (o.vencida || d < 0) return { txt: `VENCIDA (${Math.abs(d)} d)`, fondo: C.rojoClaro, color: C.rojo }
    if (d <= 5) return { txt: `POR VENCER (${d} d)`, fondo: C.ambarClaro, color: C.ambar }
    return { txt: `VIGENTE (${d} d)`, fondo: C.verdeClaro, color: C.verde }
  }

  // La columna "Estado" se dibuja como píldora (onFila), el texto de esa celda va vacío
  y = dibujarTabla(
    doc, y,
    [
      { label: 'Orden', ancho: 26, bold: true },
      { label: 'Fecha de vencimiento', ancho: 54 },
      { label: 'Estado', ancho: 56 },
      { label: 'Monto', ancho: 34, align: 'right', bold: true },
    ],
    lista.map((o) => [`#${o.id}`, fechaLarga(o.fecha_vencimiento), '', usdCode(o.total_usd)]),
    {
      onFila: (d, { y: yy, idx, cols }) => {
        const e = estado(lista[idx])
        dibujarPildora(d, cols[2].x + 3, yy + 5.6, e.txt, { fondo: e.fondo, color: e.color })
      },
    }
  )
  return y
}

/* ---------- Movimientos del período ---------- */
function dibujarMovimientos(doc, y, facturas, pagos) {
  if (y + 30 > Y_LIMITE) { doc.addPage(); y = 20 }
  y = dibujarSeccion(doc, y, 'Movimientos del período')

  const movs = [
    ...facturas.map((f) => ({
      fecha: f.created_at, tipo: 'Factura',
      desc: f.nota ? `Factura N.º ${f.numero_factura} — ${f.nota}` : `Factura N.º ${f.numero_factura}`,
      ref: `N.º ${f.numero_factura}`, monto: Number(f.monto_facturado), signo: -1,
    })),
    ...pagos.map((p) => ({
      fecha: p.created_at, tipo: 'Pago',
      desc: p.detalle ? `Abono registrado — ${p.detalle}` : 'Abono registrado',
      ref: `Recibo ${p.id}`, monto: Number(p.monto), signo: 1,
    })),
  ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

  y = dibujarTabla(
    doc, y,
    [
      { label: 'Fecha', ancho: 22 },
      { label: 'Tipo', ancho: 18 },
      { label: 'Descripción', ancho: 78 },
      { label: 'Referencia', ancho: 28, color: C.muted },
      { label: 'Monto', ancho: 34, align: 'right', bold: true, color: (v) => (String(v).startsWith('+') ? C.verde : C.rojo) },
    ],
    movs.map((m) => [fechaCorta(m.fecha), m.tipo, m.desc, m.ref, `${m.signo > 0 ? '+' : '-'} ${usdCode(m.monto)}`]),
    { vacio: 'No hay movimientos registrados en este período.' }
  )
  if (!movs.length) return y

  const tf = movs.filter((m) => m.signo < 0).reduce((s, m) => s + m.monto, 0)
  const tp = movs.filter((m) => m.signo > 0).reduce((s, m) => s + m.monto, 0)
  const neto = tp - tf

  if (y + 30 > Y_LIMITE) { doc.addPage(); y = 20 }
  const ancho = 84
  const x = PAG.margen + PAG.contenido - ancho
  doc.setFillColor(...C.gris)
  doc.setDrawColor(...C.borde)
  doc.setLineWidth(0.2)
  doc.roundedRect(x, y - 2, ancho, 28, 3, 3, 'FD')
  const fila = (label, valor, color, yy, negrita = false) => {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.muted)
    doc.text(label, x + 5, yy)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...color)
    doc.text(valor, x + ancho - 5, yy, { align: 'right' })
  }
  fila('Total facturado', usdCode(tf), C.rojo, y + 5)
  fila('Total pagado', usdCode(tp), C.verde, y + 11.5)
  doc.setDrawColor(...C.borde); doc.line(x + 5, y + 14.5, x + ancho - 5, y + 14.5)
  fila('Diferencia neta del período', `${neto >= 0 ? '+' : '-'} ${usdCode(Math.abs(neto))}`, neto >= 0 ? C.verde : C.rojo, y + 21, true)
  return y + 34
}

/* ---------- Órdenes pendientes de facturación ---------- */
function dibujarOrdenesPendientes(doc, y, ordenes) {
  if (y + 30 > Y_LIMITE) { doc.addPage(); y = 20 }
  y = dibujarSeccion(doc, y, 'Órdenes pendientes de facturación en el período')
  return dibujarTabla(
    doc, y,
    [
      { label: 'Orden', ancho: 30, bold: true },
      { label: 'Forma de pago', ancho: 50 },
      { label: 'Fecha', ancho: 50 },
      { label: 'Total', ancho: 40, align: 'right', bold: true },
    ],
    ordenes.map((o) => [`#${o.id}`, o.forma_pago === 'credito' ? 'Crédito' : 'Contado', fechaCorta(o.created_at), usdCode(o.total_usd)])
  )
}
