// src/utils/generarOrdenPDF.js
//
// Orden de pedido: copia en PDF de una orden (`/orders/:id`) para el cliente.
// Es un documento INFORMATIVO, no fiscal: no reemplaza a la factura.
//
// DISEÑO "BAJO CONSUMO DE TINTA" (editorial tipográfico), el mismo lenguaje
// del presupuesto:
//   · Fondo 100 % blanco: cero rellenos, cero degradados, cero zebra.
//   · El número de orden va grande (pero compacto); el resto son líneas finas.
//   · Tinta casi negra. El azul de marca #0052DC aparece solo en el sello de
//     estado y en el total.
//   · Logo rasterizado en negro (monocromo).
//
// Bloques: membrete (logo + datos de empresa) · título (n.º de orden ·
// comprador · fecha/modalidad/estado) · productos (con molécula) · totales ·
// recepción (firma).
//
// NOTA DE DISEÑO (v2): a diferencia de la primera versión, este formato NO
// dibuja columnas de "Entrega" ni "Pago" (no aportan nada al pedido en línea)
// y el comprador vive en el bloque de título, entre el número de orden y la
// fecha/modalidad. Esto libera ~50-60mm verticales para que un pedido de
// 10 artículos quepa en una sola página.
//
// Qué lee de la orden (todo opcional salvo `id`): created_at, estado,
// tipo_envio, forma_pago, ordenes_items (cantidad, precio_unitario, anulado,
// productos.nombre_comercial, productos.molecula), subtotal_usd,
// descuento_cupon, cupon_codigo, costo_envio_usd, total_usd, users {nombre,
// rif_cedula, telefono, email}, sub_usuarios {nombre}. Si un dato no viene,
// esa línea simplemente no se dibuja: el PDF nunca inventa ni imprime
// "undefined".
//
// IMPORTANTE: para que la molécula aparezca, el backend debe traer
// `productos(nombre_comercial, molecula)` en el select de GET /orders/:id
// (hoy solo trae nombre_comercial). Sin ese campo, la línea de molécula
// simplemente no se dibuja (no rompe nada, solo no se ve).
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
  PAG, usd, usdCode, fechaLarga, fechaHora, nuevoDoc, datosEmpresa, textoEsp,
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

/* Título de sección editorial: "01  PRODUCTOS" (a todo el ancho) */
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

/* ---------- Panel de datos (columna derecha del bloque de título) ----------
   Un único bloque visual, de arriba hacia abajo: nombre del comprador (el
   dato más importante, destacado), su contacto en una sola línea secundaria,
   una regla fina, y luego filas etiqueta/valor (Realizada, Modalidad) con el
   mismo lenguaje visual que la caja de totales (etiqueta a la izquierda,
   valor en negrita a la derecha, ambos sobre la misma línea de base). */
function bloqueInfoDerecha(doc, xr, y, w, { nombre, contacto, filas }) {
  let yy = y
  if (nombre) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); tinta(doc, T.tinta)
    const ls = lineasMax(doc, nombre, w, 2)
    doc.text(ls, xr, yy + 4.2, { align: 'right' })
    yy += 4.2 + (ls.length - 1) * 4.6
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); tinta(doc, T.suave)
    doc.text('Comprador no registrado', xr, yy + 4.2, { align: 'right' })
    yy += 4.2
  }
  if (contacto) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); tinta(doc, T.gris)
    doc.text(lineasMax(doc, contacto, w, 1), xr, yy + 4.4, { align: 'right' })
    yy += 4.4
  }
  yy += 2.6
  linea(doc, yy, { grosor: 0.3, color: T.linea, x1: xr - w, x2: xr })
  yy += 5.4

  filas.forEach(({ label, valor }, i) => {
    if (!valor) return
    etiqueta(doc, label, xr - w, yy, { color: T.suave, size: 6.3 })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.6); tinta(doc, T.tinta)
    doc.text(lineasMax(doc, valor, w * 0.6, 1), xr, yy, { align: 'right' })
    if (i < filas.length - 1) yy += 6.3
  })
  return yy + 3
}

/* ---------- Tabla de productos ----------
   A diferencia de una tabla genérica, la columna "Producto" dibuja DOS
   renglones por fila cuando hay molécula: el nombre (negrita) y, debajo,
   la molécula en gris suave y letra chica. Devuelve { y, xTotales }:
   `xTotales` es el borde izquierdo de la columna "P. unitario", para que la
   caja de totales arranque exactamente debajo de ella. */
function tablaProductos(doc, y, { numero, items, vacio }) {
  const columnas = [
    { label: 'N.º', ancho: 9, align: 'left' },
    { label: 'Producto', ancho: 84, align: 'left' },
    { label: 'Cant.', ancho: 14, align: 'center' },
    { label: 'P. unitario', ancho: 30, align: 'right' },
    { label: 'Subtotal', ancho: 33, align: 'right' },
  ]
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

  if (!items.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    tinta(doc, T.gris)
    doc.text(vacio || 'Sin registros.', PAG.margen, y + 4, { maxWidth: PAG.contenido })
    return { y: y + 12, xTotales: cols[3].x }
  }

  const wProd = cols[1].w - 4
  let yy = cabecera(y)
  items.forEach((it, i) => {
    // Nombre: son productos (nombres cortos), 1 línea alcanza casi siempre.
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.3)
    const lsNombre = lineasMax(doc, it.nombre, wProd, 1)

    // Molécula (si viene del backend): 1 línea, más chica y más suave.
    let lsMol = []
    if (it.molecula) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.3)
      lsMol = lineasMax(doc, it.molecula, wProd, 1)
    }

    const altoNombre = lsNombre.length * 3.9
    const altoMol = lsMol.length ? 3.4 : 0
    const alto = Math.max(9.5, altoNombre + altoMol + 5)

    if (yy + alto > Y_MAX) {
      doc.addPage()
      yy = cabecera(cabeceraContinuacion(doc, numero))
    }

    // N.º
    doc.setFont('courier', 'normal')
    doc.setFontSize(7.8)
    tinta(doc, T.gris)
    doc.text(String(i + 1).padStart(2, '0'), tx(cols[0]), yy + 6)

    // Producto (nombre + molécula debajo)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.3)
    tinta(doc, T.tinta)
    doc.text(lsNombre, tx(cols[1]), yy + 5.6)
    if (lsMol.length) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.3)
      tinta(doc, T.suave)
      doc.text(lsMol, tx(cols[1]), yy + 5.6 + altoNombre + 0.4)
    }

    // Cant.
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.3)
    tinta(doc, T.tinta)
    doc.text(String(it.cantidad), tx(cols[2]), yy + 6, { align: 'center' })

    // P. unitario / Subtotal: nunca se parten, se encogen si no caben.
    ;[
      { col: cols[3], v: usd(it.precio), bold: false },
      { col: cols[4], v: usd(it.subtotal), bold: true },
    ].forEach(({ col, v, bold }) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      let tam = 8.3
      doc.setFontSize(tam)
      while (doc.getTextWidth(v) > col.w - 3 && tam > 6) {
        tam -= 0.25
        doc.setFontSize(tam)
      }
      tinta(doc, T.tinta)
      doc.text(v, tx(col), yy + 6, { align: 'right' })
    })

    yy += alto
    linea(doc, yy, { grosor: 0.15, color: T.linea })
  })

  return { y: yy + 5, xTotales: cols[3].x }
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
      const producto = it.productos || it.producto || {}
      return {
        nombre: producto.nombre_comercial || `Producto #${it.producto_id}`,
        molecula: producto.molecula || null,
        cantidad,
        precio,
        subtotal: cantidad * precio,
      }
    })

  const sumaItems = items.reduce((s, it) => s + it.subtotal, 0)
  const descuento = Number(orden.descuento_cupon || 0)
  const envio = Number(orden.costo_envio_usd || 0)
  const total = orden.total_usd !== null && orden.total_usd !== undefined ? Number(orden.total_usd) : sumaItems - descuento + envio
  const subtotal = Number(orden.subtotal_usd || 0) || (orden.total_usd != null ? total + descuento - envio : sumaItems)

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

  /* ===== Bloque de título: fila de cabecera (tipo de doc. + sello de estado)
     seguida de dos columnas: número de orden a la izquierda, panel de datos
     del comprador/fecha/modalidad a la derecha, separadas por una regla
     vertical fina. Todo el bloque cierra con una regla fina horizontal antes
     del resumen. ===== */
  etiqueta(doc, 'Orden de pedido  ·  Documento no fiscal', PAG.margen, 40, { color: T.tinta, size: 7.5 })

  if (estadoTxt) {
    const colEstado = cancelada ? T.tinta : T.azul
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    const wEstado = Math.min(doc.getTextWidth(estadoTxt) + 0.8 * (estadoTxt.length - 1) + 8, 72)
    doc.setDrawColor(...colEstado)
    doc.setLineWidth(0.45)
    doc.roundedRect(xr - wEstado, 35.4, wEstado, 6.4, 3.2, 3.2, 'S')
    tinta(doc, colEstado)
    textoEsp(doc, estadoTxt, xr - wEstado / 2, 39.8, { align: 'center', cs: 0.7 })
  }
  linea(doc, 44, { grosor: 0.3, color: T.linea })

  const xDivisoria = PAG.margen + 74
  const yContenido = 51

  // Número de orden (columna izquierda)
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
  doc.text('N.º de orden', PAG.margen, yBase + 6)
  const yNumeroFin = yBase + 8

  // Panel de datos (columna derecha): comprador + realizada + modalidad
  const u = { ...(cliente || {}), ...(orden.users || {}) } // orden.users manda sobre `cliente`
  const contacto = [u.rif_cedula && `RIF/C.I. ${u.rif_cedula}`, u.telefono].filter(Boolean).join('   ·   ')
  const wInfo = xr - (xDivisoria + 8)
  const yInfoFin = bloqueInfoDerecha(doc, xr, yContenido, wInfo, {
    nombre: u.nombre,
    contacto,
    filas: [
      { label: 'Realizada', valor: fechaLarga(orden.created_at) },
      { label: 'Modalidad', valor: lineasMax(doc, modalidad, wInfo * 0.6, 1)[0] },
    ],
  })

  const yRegla = Math.max(yNumeroFin, yInfoFin) + 3
  // Regla vertical entre el número y el panel de datos
  doc.setDrawColor(...T.linea)
  doc.setLineWidth(0.3)
  doc.line(xDivisoria, 44.6, xDivisoria, yRegla - 3)

  /* ===== Regla gruesa + resumen ===== */
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

  /* ===== 01 · Productos ===== */
  let y = yRegla + 14
  if (y + 30 > Y_MAX) { doc.addPage(); y = cabeceraContinuacion(doc, numero) }
  y = seccion(doc, y, '01', 'Productos')
  const { y: yTabla, xTotales } = tablaProductos(doc, y + 3, {
    numero,
    items,
    vacio: 'Esta orden no tiene productos activos.',
  })
  y = yTabla

  /* ===== Totales: caja angosta que arranca bajo "P. unitario" ===== */
  const renglones = [{ k: 'Subtotal', v: usd(subtotal) }]
  if (descuento > 0) renglones.push({ k: `Descuento cupón${orden.cupon_codigo ? ` (${orden.cupon_codigo})` : ''}`, v: `- ${usd(descuento)}` })
  if (envio > 0) renglones.push({ k: 'Envío', v: usd(envio) })

  const xCaja = xTotales
  const wCaja = PAG.ancho - PAG.margen - xCaja
  const hCaja = 16
  const altoTotales = renglones.length * 5.2 + 3 + hCaja + 3
  if (y + altoTotales > Y_TOTALES) { doc.addPage(); y = cabeceraContinuacion(doc, numero) }

  renglones.forEach((r, i) => {
    const yy = y + i * 5.2
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.3)
    tinta(doc, T.gris)
    doc.text(lineasMax(doc, r.k, wCaja - 32, 1), xCaja, yy + 3.6)
    doc.setFont('helvetica', 'bold')
    tinta(doc, T.tinta)
    doc.text(r.v, xCaja + wCaja, yy + 3.6, { align: 'right' })
    linea(doc, yy + 5, { grosor: 0.15, x1: xCaja, x2: xCaja + wCaja })
  })
  y += renglones.length * 5.2 + 3

  // Contorno fino desplazado (efecto de sombra sin relleno) y caja principal
  doc.setDrawColor(...T.suave)
  doc.setLineWidth(0.2)
  doc.rect(xCaja + 1.5, y + 1.5, wCaja, hCaja, 'S')
  doc.setDrawColor(...T.tinta)
  doc.setLineWidth(0.9)
  doc.rect(xCaja, y, wCaja, hCaja, 'S')

  etiqueta(doc, 'Total de la orden', xCaja + 5, y + 5.6, { color: T.tinta, size: 6.2 })
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

  /* ===== Recepción: firma de quien recibe, a la izquierda de la caja =====
     Reemplaza la vieja leyenda "Copia informativa...". Si la orden está
     cancelada no tiene sentido pedir firma: se deja el aviso de cancelación. */
  const anchoNota = xCaja - PAG.margen - 10
  if (cancelada) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    tinta(doc, T.gris)
    doc.text(
      doc.splitTextToSize('Esta orden fue cancelada. El documento se conserva solo como referencia.', Math.max(anchoNota, 50)),
      PAG.margen, y + 6
    )
  } else if (anchoNota >= 40) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    tinta(doc, T.tinta)
    textoEsp(doc, 'RECIBIDO CONFORME', PAG.margen, y + 4, { cs: 0.6 })

    const wFirma = anchoNota * 0.6
    const xFecha = PAG.margen + wFirma + 8
    const wFecha = anchoNota - wFirma - 8
    linea(doc, y + 12, { grosor: 0.3, color: T.gris, x1: PAG.margen, x2: PAG.margen + wFirma })
    linea(doc, y + 12, { grosor: 0.3, color: T.gris, x1: xFecha, x2: xFecha + wFecha })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    tinta(doc, T.gris)
    doc.text('Firma y nombre de quien recibe', PAG.margen, y + 15.5)
    doc.text('Fecha', xFecha, y + 15.5)
  } else {
    // Caja de totales muy ancha (pocas columnas / montos grandes): nota breve.
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    tinta(doc, T.gris)
    doc.text('Recibido conforme — firma y fecha al recibir.', PAG.margen, y + 8, { maxWidth: Math.max(anchoNota, 60) })
  }

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