// src/utils/generarOrdenPDF.js
//
// Orden de pedido: copia en PDF de una orden (`/orders/:id`) para el cliente.
// Es un documento INFORMATIVO, no fiscal: no reemplaza a la factura.
//
// DISEÑO "BAJO CONSUMO DE TINTA" (editorial tipográfico), el mismo lenguaje
// del presupuesto:
//   · Fondo 100 % blanco: cero rellenos, cero degradados, cero zebra.
//   · El número de orden va gigante; el resto son líneas finas.
//   · Tinta casi negra. El azul de marca #0052DC aparece solo en el sello de
//     estado y en el total.
//   · Logo rasterizado en negro (monocromo).
//
// Bloques: comprador · entrega · pago (tres columnas) · productos · totales.
//
// Qué lee de la orden (todo opcional salvo `id`): created_at, estado,
// tipo_envio, forma_pago, estado_pago, fecha_vencimiento, ordenes_items
// (cantidad, precio_unitario, anulado, productos.nombre_comercial),
// subtotal_usd, descuento_cupon, cupon_codigo, costo_envio, total_usd,
// direcciones_envio {direccion, ciudad, estado}, agencias_envio {nombre},
// agencia_envio (texto legacy), users {nombre, rif_cedula, telefono, email},
// sub_usuarios {nombre}. Si un dato no viene, esa línea simplemente no se
// dibuja: el PDF nunca inventa ni imprime "undefined".
//
// `cliente` (opcional) completa los datos del comprador cuando la orden no
// trae `users` (p. ej. el usuario logueado). Los datos de `orden.users` tienen
// prioridad. NO pasar el usuario logueado si es un admin viendo la orden de
// otro: se imprimiría el nombre del admin como comprador.
//
// Este formato dibuja todo por su cuenta y NO modifica pdfBase.js: ese módulo
// lo comparten la factura, el comprobante, etc. Solo se reutilizan de pdfBase
// las utilidades neutras (página, formateadores, datos de empresa).
//
// Uso:  await generarOrdenPDF({ orden, cliente })

import { LOGO_BLANCO } from '../config/logos'
import { FULFILLMENT_METHODS, getLabelEstado, normalizarEstado } from '../config/estadosOrden'
import {
  PAG, usd, usdCode, fechaCorta, fechaLarga, fechaHora, nuevoDoc, datosEmpresa, textoEsp,
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
const Y_TOTALES = 278 // los totales pueden llegar más abajo: el pie empieza en 281

// Notas de entrega redactadas para el CLIENTE (las `descripcion` de
// FULFILLMENT_METHODS están escritas para el equipo, en tercera persona).
const NOTA_ENTREGA = {
  retiro: 'Presenta tu número de orden al retirar.',
  envio_nacional: 'El envío se paga al recibir en destino.',
}

const PAGO_LABEL = {
  esperando: 'Pendiente de pago',
  reportado: 'Pago en revisión',
  verificado: 'Pago verificado',
  rechazado: 'Comprobante rechazado',
}

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

/* Título de sección editorial: "04  PRODUCTOS" (a todo el ancho) */
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
  etiqueta(doc, `Orden  N.º ${numero}`, PAG.margen, 12, { color: T.tinta, size: 7 })
  etiqueta(doc, 'continuación', PAG.ancho - PAG.margen, 12, { align: 'right', color: T.suave })
  linea(doc, 15.5, { grosor: 0.4, color: T.tinta })
  return 25
}

/* ---------- Tabla editorial: solo líneas finas ---------- */
function tabla(doc, y, { columnas, filas, fuente = 9, numero, vacio }) {
  const total = columnas.reduce((s, c) => s + c.ancho, 0)
  const escala = PAG.contenido / total
  const cols = columnas.map((c) => ({ ...c, w: c.ancho * escala }))
  let x = PAG.margen
  cols.forEach((c) => { c.x = x; x += c.w })

  const tx = (c) => (c.align === 'right' ? c.x + c.w - 1 : c.align === 'center' ? c.x + c.w / 2 : c.x)

  const cabecera = (yy) => {
    cols.forEach((c) => etiqueta(doc, c.label, tx(c), yy, { align: c.align || 'left', size: 6.3 }))
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
    // Las columnas `nowrap` (importes) nunca se parten: si no caben, bajan el cuerpo
    const tam = []
    const celdas = fila.map((v, i) => {
      doc.setFont('helvetica', cols[i].bold ? 'bold' : 'normal')
      tam[i] = fuente
      if (cols[i].nowrap) {
        const t = String(v ?? '')
        doc.setFontSize(fuente)
        while (doc.getTextWidth(t) > cols[i].w - 3 && tam[i] > 6) {
          tam[i] -= 0.25
          doc.setFontSize(tam[i])
        }
        return t ? [t] : []
      }
      doc.setFontSize(fuente)
      return lineasMax(doc, v ?? '', cols[i].w - 4, 3)
    })
    const n = Math.max(1, ...celdas.map((l) => l.length))
    const alto = Math.max(9, n * 4 + 4.5)

    if (yy + alto > Y_MAX) {
      doc.addPage()
      yy = cabecera(cabeceraContinuacion(doc, numero))
    }

    celdas.forEach((ls, i) => {
      const c = cols[i]
      if (c.mono) {
        doc.setFont('courier', 'normal')
        doc.setFontSize(fuente - 0.5)
      } else {
        doc.setFont('helvetica', c.bold ? 'bold' : 'normal')
        doc.setFontSize(tam[i])
      }
      tinta(doc, c.mono ? T.gris : T.tinta)
      doc.text(ls, tx(c), yy + 6, { align: c.align || 'left' })
    })
    yy += alto
    linea(doc, yy, { grosor: 0.15, color: T.linea })
  })
  return yy + 5
}

/* ---------- Columna de información (comprador / entrega / pago) ---------- */
function columnaInfo(doc, x, y, w, num, titulo, lineas) {
  doc.setFont('courier', 'bold')
  doc.setFontSize(8.5)
  tinta(doc, T.tinta)
  doc.text(num, x, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  textoEsp(doc, titulo.toUpperCase(), x + 9, y, { cs: 0.9 })
  linea(doc, y + 2.4, { grosor: 0.45, color: T.tinta, x1: x, x2: x + w })

  let yy = y + 9
  let hayDatos = false
  lineas.forEach(({ txt, estilo = 'normal', max = 3 }) => {
    if (!txt) return
    hayDatos = true
    if (estilo === 'principal') {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); tinta(doc, T.tinta)
    } else if (estilo === 'suave') {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); tinta(doc, T.gris)
    } else {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); tinta(doc, T.tinta)
    }
    const ls = lineasMax(doc, txt, w, max)
    doc.text(ls, x, yy)
    yy += ls.length * (estilo === 'principal' ? 4.8 : 4.2) + 0.8
  })
  if (!hayDatos) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); tinta(doc, T.suave)
    doc.text('—', x, yy)
    yy += 5
  }
  return yy
}

/* ---------- Principal ---------- */
export default async function generarOrdenPDF({ orden, cliente = null }) {
  const doc = await nuevoDoc()
  const logo = await cargarLogoNegro()
  const e = datosEmpresa()
  const numero = String(orden.id ?? '')

  // Órdenes viejas sin tipo_envio se tratan como delivery (igual que la pantalla)
  const tipo = orden.tipo_envio || 'delivery'
  const metodo = FULFILLMENT_METHODS[tipo]
  const modalidad = metodo?.label || String(tipo)
  const estadoId = normalizarEstado(orden.estado)
  const estadoTxt = String(getLabelEstado(estadoId, { rol: 'cliente', fulfillmentMethod: tipo }) || '').toUpperCase()
  const cancelada = estadoId === 'cancelado'

  // Los ítems anulados no cuentan para la orden
  const items = (orden.ordenes_items || [])
    .filter((it) => it.anulado !== true)
    .map((it) => {
      const cantidad = Number(it.cantidad || 0)
      const precio = Number(it.precio_unitario || 0)
      return {
        nombre: it.productos?.nombre_comercial || it.producto?.nombre_comercial || `Producto #${it.producto_id}`,
        cantidad,
        precio,
        subtotal: cantidad * precio,
      }
    })

  const sumaItems = items.reduce((s, it) => s + it.subtotal, 0)
  const descuento = Number(orden.descuento_cupon || 0)
  const envio = Number(orden.costo_envio || 0)
  const total = orden.total_usd !== null && orden.total_usd !== undefined ? Number(orden.total_usd) : sumaItems - descuento + envio
  const subtotal = Number(orden.subtotal_usd || 0) || (orden.total_usd != null ? total + descuento - envio : sumaItems)

  /* ===== Portada: aros decorativos (solo contorno, trazos finos) ===== */
  doc.setDrawColor(...T.aro)
  doc.setLineWidth(0.25)
  ;[18, 30, 42].forEach((r) => doc.circle(PAG.ancho, 0, r, 'S'))
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
  const contacto = [e.rif && `RIF ${e.rif}`, e.telefono, e.email].filter(Boolean).join('   ·   ')
  if (contacto) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, contacto, 120, 1), PAG.margen, 30)
  }

  /* ===== Título editorial: etiqueta + número gigante ===== */
  etiqueta(doc, 'Orden de pedido  ·  Documento no fiscal', PAG.margen, 46, { color: T.tinta, size: 7.5 })

  doc.setFont('helvetica', 'bold')
  let tam = 84
  doc.setFontSize(tam)
  while (doc.getTextWidth(numero) > 108 && tam > 28) {
    tam -= 3
    doc.setFontSize(tam)
  }
  // Altura de los dígitos ≈ 0.72 del cuerpo (1 pt = 0.3528 mm)
  const yBase = 52 + tam * 0.3528 * 0.72
  tinta(doc, T.tinta)
  doc.text(numero, PAG.margen - 1, yBase)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  tinta(doc, T.gris)
  doc.text('N.º de orden', PAG.margen, yBase + 7)

  /* ===== Bloque derecho: fecha, modalidad y sello de estado ===== */
  const xr = PAG.ancho - PAG.margen

  etiqueta(doc, 'Realizada', xr, 54, { align: 'right', color: T.suave })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  tinta(doc, T.tinta)
  doc.text(fechaLarga(orden.created_at), xr, 60, { align: 'right' })

  etiqueta(doc, 'Modalidad', xr, 70, { align: 'right', color: T.suave })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  tinta(doc, T.tinta)
  doc.text(lineasMax(doc, modalidad, 70, 1), xr, 76.5, { align: 'right' })

  // Sello de estado: solo contorno (azul; negro si la orden está cancelada)
  if (estadoTxt) {
    const colEstado = cancelada ? T.tinta : T.azul
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    const wEstado = Math.min(doc.getTextWidth(estadoTxt) + 0.8 * (estadoTxt.length - 1) + 9, 84)
    doc.setDrawColor(...colEstado)
    doc.setLineWidth(0.5)
    doc.roundedRect(xr - wEstado, 82, wEstado, 7, 3.5, 3.5, 'S')
    tinta(doc, colEstado)
    textoEsp(doc, estadoTxt, xr - wEstado / 2, 86.8, { align: 'center', cs: 0.8 })
  }

  /* ===== Regla gruesa + resumen ===== */
  const yRegla = Math.max(yBase + 12, 92)
  linea(doc, yRegla, { grosor: 1.1, color: T.tinta })

  const formaPagoTxt = orden.forma_pago === 'credito' ? 'Crédito' : orden.forma_pago === 'contado' ? 'Contado' : null
  const resumen = [
    `${items.length} artículo${items.length === 1 ? '' : 's'}`,
    formaPagoTxt && `Pago a ${formaPagoTxt.toLowerCase()}`,
    `Realizada el ${fechaHora(orden.created_at)}`,
  ].filter(Boolean).join('   ·   ')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  tinta(doc, T.gris)
  doc.text(lineasMax(doc, resumen, PAG.contenido, 1), PAG.margen, yRegla + 6)

  /* ===== 01 comprador · 02 entrega · 03 pago ===== */
  const gap = 8
  const wc = (PAG.contenido - gap * 2) / 3
  const x1 = PAG.margen
  const x2 = x1 + wc + gap
  const x3 = x2 + wc + gap
  const yBloques = yRegla + 17

  // Comprador: orden.users manda sobre `cliente`
  const u = { ...(cliente || {}), ...(orden.users || {}) }
  const realizadoPor = orden.sub_usuarios?.nombre
  const lComprador = [
    { txt: u.nombre, estilo: 'principal', max: 2 },
    { txt: u.rif_cedula && `RIF / C.I. ${u.rif_cedula}` },
    { txt: u.telefono },
    { txt: u.email, max: 2 },
    { txt: realizadoPor && realizadoPor !== u.nombre ? `Realizado por: ${realizadoPor}` : null, estilo: 'suave' },
  ]

  // Entrega: depende de la modalidad; solo se imprime lo que la orden trae
  const d = orden.direcciones_envio
  const ciudadEstado = [d?.ciudad, d?.estado].filter(Boolean).join(', ')
  let lEntrega
  if (tipo === 'envio_nacional') {
    lEntrega = [
      { txt: modalidad, estilo: 'principal', max: 2 },
      { txt: (orden.agencias_envio?.nombre || orden.agencia_envio) && `Agencia: ${orden.agencias_envio?.nombre || orden.agencia_envio}`, max: 2 },
      { txt: ciudadEstado && `Destino: ${ciudadEstado}` },
      { txt: NOTA_ENTREGA.envio_nacional, estilo: 'suave' },
    ]
  } else if (tipo === 'retiro') {
    lEntrega = [
      { txt: modalidad, estilo: 'principal', max: 2 },
      { txt: e.direccion && `Retira en: ${e.direccion}`, max: 3 },
      { txt: NOTA_ENTREGA.retiro, estilo: 'suave' },
    ]
  } else {
    lEntrega = [
      { txt: modalidad, estilo: 'principal', max: 2 },
      { txt: d?.direccion, max: 4 },
      { txt: ciudadEstado },
    ]
  }

  // Pago
  const estadoPagoTxt = orden.forma_pago === 'contado' ? PAGO_LABEL[orden.estado_pago] : null
  const lPago = [
    { txt: formaPagoTxt, estilo: 'principal' },
    { txt: estadoPagoTxt },
    { txt: orden.forma_pago === 'credito' && orden.fecha_vencimiento ? `Vence el ${fechaCorta(orden.fecha_vencimiento)}` : null },
    { txt: orden.cupon_codigo && descuento > 0 ? `Cupón aplicado: ${orden.cupon_codigo}` : null, estilo: 'suave' },
  ]

  const e1 = columnaInfo(doc, x1, yBloques, wc, '01', 'Comprador', lComprador)
  const e2 = columnaInfo(doc, x2, yBloques, wc, '02', 'Entrega', lEntrega)
  const e3 = columnaInfo(doc, x3, yBloques, wc, '03', 'Pago', lPago)

  /* ===== 04 · Productos ===== */
  let y = Math.max(e1, e2, e3) + 8
  if (y + 30 > Y_MAX) { doc.addPage(); y = cabeceraContinuacion(doc, numero) }
  y = seccion(doc, y, '04', 'Productos')
  y = tabla(doc, y + 3, {
    numero,
    vacio: 'Esta orden no tiene productos activos.',
    columnas: [
      { label: 'N.º', ancho: 10, mono: true },
      { label: 'Producto', ancho: 80, bold: true },
      { label: 'Cant.', ancho: 16, align: 'center' },
      { label: 'P. unitario', ancho: 34, align: 'right', nowrap: true },
      { label: 'Subtotal', ancho: 38, align: 'right', bold: true, nowrap: true },
    ],
    filas: items.map((it, i) => [
      String(i + 1).padStart(2, '0'), it.nombre, String(it.cantidad), usd(it.precio), usd(it.subtotal),
    ]),
  })

  /* ===== Totales: renglones finos + caja de borde grueso ===== */
  const renglones = [{ k: 'Subtotal', v: usd(subtotal) }]
  if (descuento > 0) renglones.push({ k: `Descuento cupón${orden.cupon_codigo ? ` (${orden.cupon_codigo})` : ''}`, v: `- ${usd(descuento)}` })
  if (envio > 0) renglones.push({ k: 'Envío', v: usd(envio) })

  const wCaja = 98
  const hCaja = 25
  const altoTotales = renglones.length * 6.5 + 4 + hCaja + 3
  if (y + altoTotales > Y_TOTALES) { doc.addPage(); y = cabeceraContinuacion(doc, numero) }
  const xCaja = PAG.ancho - PAG.margen - wCaja - 2

  renglones.forEach((r, i) => {
    const yy = y + i * 6.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, r.k, wCaja - 40, 1), xCaja, yy + 4.2)
    doc.setFont('helvetica', 'bold')
    tinta(doc, T.tinta)
    doc.text(r.v, xCaja + wCaja, yy + 4.2, { align: 'right' })
    linea(doc, yy + 6.2, { grosor: 0.15, x1: xCaja, x2: xCaja + wCaja })
  })
  y += renglones.length * 6.5 + 4

  // Contorno fino desplazado (efecto de sombra sin relleno) y caja principal
  doc.setDrawColor(...T.suave)
  doc.setLineWidth(0.25)
  doc.rect(xCaja + 2, y + 2, wCaja, hCaja, 'S')
  doc.setDrawColor(...T.tinta)
  doc.setLineWidth(1)
  doc.rect(xCaja, y, wCaja, hCaja, 'S')

  etiqueta(doc, 'Total de la orden', xCaja + 6, y + 8, { color: T.tinta, size: 6.8 })
  const textoTotal = usdCode(total)
  doc.setFont('helvetica', 'bold')
  let tt = 24
  doc.setFontSize(tt)
  while (doc.getTextWidth(textoTotal) > wCaja - 12 && tt > 12) {
    tt -= 1
    doc.setFontSize(tt)
  }
  tinta(doc, T.azul)
  doc.text(textoTotal, xCaja + wCaja - 6, y + 19.6, { align: 'right' })

  // Nota a la izquierda de la caja
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  tinta(doc, T.gris)
  doc.text(
    doc.splitTextToSize(
      cancelada
        ? 'Esta orden fue cancelada. El documento se conserva solo como referencia.'
        : 'Copia informativa de tu orden. Los montos están expresados en USD.',
      xCaja - PAG.margen - 8
    ),
    PAG.margen, y + 8
  )

  /* ===== Pie en todas las páginas ===== */
  const paginas = doc.internal.getNumberOfPages()
  const legenda = 'Orden de pedido sin valor fiscal: no es una factura. Los precios pueden variar hasta la emisión de la factura.'
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

  doc.save(`orden-${orden.id}.pdf`)
}