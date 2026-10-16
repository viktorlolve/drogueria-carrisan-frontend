// src/components/CompartirProductoImagen.jsx
// Botón + modal que genera una imagen 1080×1350 (Instagram vertical) del producto,
// lista para compartir por WhatsApp o redes.
// Rediseño (Opción 1, aprobada por el dueño 2026-10-15): lienzo BLANCO puro, sin halo
// ni anillo sobre la foto, sin decoración de cruces/puntos; encabezado con logo + estado
// + laboratorio + nombre; zona media CENTRADA (mismo aire arriba y abajo) con la foto a la
// izquierda (con sombra de contacto) y un panel de información a la derecha (checks + hasta
// 7 filas); insignia de descuento conservada; franja de precio con "Ahorras", referencia en
// Bs y QR al producto (tarjeta de 144 con la leyenda "Escanea para ver el producto" en 3
// líneas a su izquierda); y una tira de contacto (WhatsApp · Instagram · Facebook) que cierra
// la pieza, con glifos oficiales de Simple Icons (Instagram sin el punto del flash).
// Se dibuja con Canvas 2D (cero dependencias nuevas; el QR usa `qrcode`, ya presente).
//
// Geometría y reglas: analisis/design-compartir-imagen-2026-10-15.md
// Lógica pura testeable: ./compartirImagenHelpers.js (scripts/compartirImagenHelpers.test.mjs)
//
// Uso:
//   <CompartirProductoImagen producto={producto} detalles={detalles} imagenUrl={galeria[imagenActiva]} tasaVes={tasaVes} />
// (`detalles` es opcional: aporta el registro sanitario a la lista de filas.)

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ImageDown, X, Share2, Download, Loader2 } from 'lucide-react'
import { LOGO_COLOR_HORIZONTAL } from '../config/logos'
import { toaster } from './ui/toaster'
import {
  W,
  H,
  PAD,
  MEDIA_H,
  centrarZonaMedia,
  PRODUCTO_W,
  PRODUCTO_CX,
  PRODUCTO_DY,
  PANEL_X,
  PANEL_W,
  PANEL_PAD,
  CONTENIDO_ANCHO,
  ALTO_CHECKS,
  CHECK_R,
  FILA_LH,
  FILA_PAD,
  BADGE_CX,
  BADGE_DY,
  BADGE_R,
  BADGE_ANILLO_R,
  PIE_Y,
  PIE_H,
  TIRA_Y,
  TIRA_H,
  TIRA_ICONO,
  QR_TAM,
  QR_PAD,
  QR_X,
  QR_Y,
  QR_LEYENDA,
  QR_LEYENDA_FUENTE,
  QR_LEYENDA_LH,
  posicionLeyendaQR,
  fmtUsd,
  precioNumerico,
  tieneDescuento,
  mensajeNoGenerable,
  armarChecks,
  armarFilas,
  altoFila,
  altoUltimaFila,
  altoBloqueFilas,
  escalaAutofit,
  escalaFilaPrecio,
  altoFilasDisponible,
  formatearDescuento,
  tamanoTextoDescuento,
  armarTiraContacto,
  medirTiraContacto,
  PIE_PRECIO_FUENTE,
  PIE_ORIG_FUENTE,
  PIE_PILL_FUENTE,
  PIE_PRECIO_GAP,
} from './compartirImagenHelpers'
import './CompartirProductoImagen.css'

// Paleta de marca
const AZUL = '#0052DC'
const INDIGO = '#1A1A3A'
const TEAL = '#12A594'
const ORO = '#F59E0B'
const MENTA = '#5EEAD4'

// ── Pendientes de marca ──────────────────────────────────────────────────────
// LOGO_URL: logo real que se dibuja sobre la pill blanca de la franja superior.
// Si estuviera vacío se dibujaría el recuadro "LOGO" de placeholder.
const LOGO_URL = LOGO_COLOR_HORIZONTAL
const LOGO_TAGLINE = 'TAGLINE'
// SITIO_WEB: si se define, aparece en el pie (ej. 'drogueriacarrisan.com'). Vacío = no se muestra.
const SITIO_WEB = ''

const F_TITULO = '"Bricolage Grotesque", "Inter", system-ui, sans-serif'
const F_NUM = '"Manrope", "Inter", system-ui, sans-serif'
const F_TEXTO = '"Inter", system-ui, sans-serif'

/* ---------------- helpers de canvas ---------------- */

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function conEspaciado(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
}

function envolverTexto(ctx, texto, maxAncho, maxLineas) {
  const palabras = String(texto || '').trim().split(/\s+/)
  const lineas = []
  let actual = ''
  for (let i = 0; i < palabras.length; i++) {
    const prueba = actual ? `${actual} ${palabras[i]}` : palabras[i]
    if (ctx.measureText(prueba).width <= maxAncho || !actual) {
      actual = prueba
    } else {
      lineas.push(actual)
      actual = palabras[i]
      if (lineas.length === maxLineas) break
    }
  }
  if (lineas.length < maxLineas && actual) lineas.push(actual)
  // ¿quedó texto sin dibujar? -> elipsis en la última línea
  const usadas = lineas.join(' ').split(/\s+/).length
  if (usadas < palabras.length && lineas.length) {
    let ult = lineas[lineas.length - 1]
    while (ult.length > 1 && ctx.measureText(`${ult}…`).width > maxAncho) ult = ult.slice(0, -1)
    lineas[lineas.length - 1] = `${ult.trimEnd()}…`
  }
  return lineas
}

function cargarImagen(url) {
  const intentar = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  // Si la foto ya estaba en caché sin cabeceras CORS, el 2º intento con parámetro la fuerza de nuevo.
  return intentar(url).catch(() => intentar(`${url}${url.includes('?') ? '&' : '?'}cors=${Date.now()}`))
}

function dibujarCapsula(ctx, cx, cy, largo, ancho, ang, alpha, colorBase = '#FFFFFF') {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(ang)
  ctx.globalAlpha = alpha
  rr(ctx, -largo / 2, -ancho / 2, largo, ancho, ancho / 2)
  ctx.fillStyle = colorBase
  ctx.fill()
  ctx.save()
  rr(ctx, -largo / 2, -ancho / 2, largo, ancho, ancho / 2)
  ctx.clip()
  ctx.fillStyle = TEAL
  ctx.fillRect(0, -ancho / 2, largo / 2, ancho)
  ctx.restore()
  ctx.restore()
}

const fmtBs = (n) =>
  `Bs. ${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/* ---------------- helpers de dibujo del rediseño ---------------- */

// Rectángulo con radio distinto por esquina: [arribaIzq, arribaDer, abajoDer, abajoIzq]
function trazarBanda(ctx, x, y, w, h, [tl, tr, br, bl]) {
  ctx.beginPath()
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + w - tr, y)
  ctx.arcTo(x + w, y, x + w, y + tr, tr)
  ctx.lineTo(x + w, y + h - br)
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br)
  ctx.lineTo(x + bl, y + h)
  ctx.arcTo(x, y + h, x, y + h - bl, bl)
  ctx.lineTo(x, y + tl)
  ctx.arcTo(x, y, x + tl, y, tl)
  ctx.closePath()
}

function dibujarCheck(ctx, cx, cy, r) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = TEAL
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.42, cy + r * 0.02)
  ctx.lineTo(cx - r * 0.1, cy + r * 0.34)
  ctx.lineTo(cx + r * 0.46, cy - r * 0.3)
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = r * 0.26
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.lineCap = 'butt'
}

// Franja de marca: degradado + brillo + textura de puntos + cápsulas, recortado a la forma.
function pintarBanda(ctx, { y, h, radios, desde, hasta, stops, brillo, capsulas = [] }) {
  ctx.save()
  ctx.shadowColor = 'rgba(10, 20, 80, 0.30)'
  ctx.shadowBlur = 44
  ctx.shadowOffsetY = desde[1] < hasta[1] ? 16 : -16
  trazarBanda(ctx, 0, y, W, h, radios)
  const g = ctx.createLinearGradient(desde[0], desde[1], hasta[0], hasta[1])
  stops.forEach(([o, c]) => g.addColorStop(o, c))
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()

  ctx.save()
  trazarBanda(ctx, 0, y, W, h, radios)
  ctx.clip()
  const b = ctx.createRadialGradient(brillo.x, brillo.y, 0, brillo.x, brillo.y, brillo.r)
  b.addColorStop(0, brillo.color)
  b.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = b
  ctx.fillRect(0, y, W, h)
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  for (let px = 36; px < W; px += 54) {
    for (let py = y + 20; py < y + h; py += 54) {
      ctx.beginPath()
      ctx.arc(px, py, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  capsulas.forEach(([cx, cy, l, a, ang, al]) => dibujarCapsula(ctx, cx, cy, l, a, ang, al))
  ctx.restore()
}

// Íconos de la tira de contacto: glifos OFICIALES de Simple Icons (CC0), no formas dibujadas
// a mano con coordenadas. El dueño reportó que el de WhatsApp se veía "raro" y que Instagram
// tenía "un punto raro" → cada glifo viene en su viewBox 24×24 y se traza con Path2D,
// escalándolo al tamaño del ícono; el relleno va en MENTA. Al de Instagram se le quitó el
// subpath del punto del flash (M16.953 5.5864…) para que no salga ese punto.
const ICONOS_CONTACTO = {
  whatsapp:
    'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
  // Instagram sin el subpath del punto del flash (M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424).
  instagram:
    'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  facebook:
    'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
}

function dibujarIconoContacto(ctx, tipo, x, y, s) {
  const d = ICONOS_CONTACTO[tipo]
  if (!d) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s / 24, s / 24) // los glifos vienen en viewBox 24×24
  ctx.fillStyle = MENTA
  ctx.fill(new Path2D(d)) // relleno nonzero (regla por defecto del canvas)
  ctx.restore()
}

// QR real: se pinta módulo a módulo (síncrono, sin pasar por el DOM/canvas del navegador).
function dibujarQR(ctx, qr, x, y, tam, color) {
  const mod = qr?.modules
  if (!mod || !mod.size) return
  const celda = tam / mod.size
  ctx.fillStyle = color
  for (let r = 0; r < mod.size; r++) {
    for (let c = 0; c < mod.size; c++) {
      if (mod.data[r * mod.size + c]) {
        ctx.fillRect(x + c * celda, y + r * celda, Math.ceil(celda), Math.ceil(celda))
      }
    }
  }
}

/* ---------------- render principal ---------------- */

async function renderizarTarjeta(canvas, { producto, detalles, imagenUrl, tasaVes }) {
  // Asegura que las fuentes de marca estén listas antes de dibujar
  try {
    await Promise.all([
      document.fonts.load(`700 64px ${F_TITULO}`),
      document.fonts.load(`700 24px ${F_TEXTO}`),
      document.fonts.load(`500 22px ${F_TEXTO}`),
      document.fonts.load(`500 19px ${F_TEXTO}`),
      document.fonts.load(`600 19px ${F_TEXTO}`),
      document.fonts.load(`700 19px ${F_TEXTO}`),
      document.fonts.load(`700 20px ${F_TEXTO}`),
      document.fonts.load(`500 20px ${F_TEXTO}`),
      document.fonts.load(`700 25px ${F_TEXTO}`),
      document.fonts.load(`600 17px ${F_TEXTO}`),
      document.fonts.load(`800 64px ${F_NUM}`),
      document.fonts.load(`800 54px ${F_NUM}`),
      document.fonts.load(`800 38px ${F_NUM}`),
      document.fonts.load(`800 ${PIE_PILL_FUENTE}px ${F_NUM}`),
      document.fonts.load(`700 24px ${F_NUM}`),
      document.fonts.load(`700 20px ${F_NUM}`),
      document.fonts.load(`600 ${PIE_ORIG_FUENTE}px ${F_NUM}`),
    ])
  } catch { /* si falla, se usa la fuente de respaldo */ }

  let img = null
  if (imagenUrl) {
    try { img = await cargarImagen(imagenUrl) } catch { img = null }
  }
  let logo = null
  if (LOGO_URL) {
    try { logo = await cargarImagen(LOGO_URL) } catch { logo = null }
  }
  let qr = null
  try {
    const QRCode = (await import('qrcode')).default
    qr = QRCode.create(`${window.location.origin}/producto/${producto.id}`, { errorCorrectionLevel: 'M' })
  } catch { /* sin QR: la pieza sigue siendo válida */ }

  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'alphabetic'

  const precio = precioNumerico(producto)
  const conDescuento = tieneDescuento(producto)
  const disponible = !!producto.disponible

  /* ---- Pre-medición del encabezado (define la altura de la franja superior) ---- */
  const anchoTexto = W - PAD * 2
  const lab = (producto.laboratorio || '').toUpperCase()
  let labLinea = ''
  if (lab) {
    ctx.font = `700 24px ${F_TEXTO}`
    conEspaciado(ctx, 4)
    labLinea = envolverTexto(ctx, lab, anchoTexto, 1)[0] || ''
    conEspaciado(ctx, 0)
  }
  ctx.font = `700 64px ${F_TITULO}`
  const lineasTitulo = envolverTexto(ctx, producto.nombre_comercial || 'Producto', anchoTexto, 2)

  let yy = 196
  let yLab = null
  if (labLinea) { yy += 24; yLab = yy; yy += 22 }
  const yTitulo0 = yy + 52
  yy = yTitulo0 + (lineasTitulo.length - 1) * 70
  const yRegla = yy + 28
  const bandaH = yRegla + 4 + 62

  // Zona media centrada entre el encabezado y la franja de precio (mismo aire arriba y
  // abajo). `mediaY` reemplaza al MEDIA_Y fijo del diseño; producto y badge cuelgan de ella.
  const mediaY = centrarZonaMedia(bandaH)
  const prodCY = mediaY + PRODUCTO_DY
  const badgeCY = mediaY + BADGE_DY

  /* ---- Lienzo blanco puro ---- */
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  /* ---- Franja superior (logo + estado + nombre) ---- */
  pintarBanda(ctx, {
    y: 0,
    h: bandaH,
    radios: [0, 0, 150, 56],
    desde: [0, 0],
    hasta: [W, bandaH],
    stops: [[0, INDIGO], [0.55, '#0A2E8F'], [1, AZUL]],
    brillo: { x: W - 40, y: 80, r: 560, color: 'rgba(18,165,148,0.55)' },
    capsulas: [[930, 150, 520, 190, -0.55, 0.07]],
  })

  // Logo (placeholder hasta tener el logo real)
  const logoW = 250
  const logoH = 80
  if (logo) {
    rr(ctx, PAD, 56, logoW, logoH, 40)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    const e = Math.min((logoW - 48) / logo.naturalWidth, (logoH - 24) / logo.naturalHeight)
    const lw = logo.naturalWidth * e
    const lh = logo.naturalHeight * e
    ctx.drawImage(logo, PAD + (logoW - lw) / 2, 56 + (logoH - lh) / 2, lw, lh)
  } else {
    rr(ctx, PAD, 56, logoW, logoH, 24)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fill()
    ctx.setLineDash([10, 8])
    ctx.lineWidth = 2.5
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.font = `800 32px ${F_NUM}`
    conEspaciado(ctx, 4)
    ctx.fillText('LOGO', PAD + logoW / 2, 56 + 38)
    ctx.font = `600 15px ${F_TEXTO}`
    conEspaciado(ctx, 5)
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillText(LOGO_TAGLINE, PAD + logoW / 2, 56 + 62)
    conEspaciado(ctx, 0)
    ctx.textAlign = 'left'
  }

  // Estado de disponibilidad (píldora a la derecha)
  const estadoTxt = disponible ? 'DISPONIBLE' : 'AGOTADO'
  ctx.font = `800 24px ${F_NUM}`
  conEspaciado(ctx, 2)
  const ew = ctx.measureText(estadoTxt).width + 36 + 44
  rr(ctx, W - PAD - ew, 66, ew, 60, 30)
  ctx.fillStyle = disponible ? '#FFFFFF' : '#DC2626'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(W - PAD - ew + 30, 96, 8, 0, Math.PI * 2)
  ctx.fillStyle = disponible ? TEAL : '#FFFFFF'
  ctx.fill()
  ctx.fillStyle = disponible ? INDIGO : '#FFFFFF'
  ctx.fillText(estadoTxt, W - PAD - ew + 50, 105)
  conEspaciado(ctx, 0)

  // Textos del producto (laboratorio + nombre + regla)
  if (labLinea) {
    ctx.font = `700 24px ${F_TEXTO}`
    conEspaciado(ctx, 4)
    ctx.fillStyle = MENTA
    ctx.fillText(labLinea, PAD, yLab)
    conEspaciado(ctx, 0)
  }
  ctx.font = `700 64px ${F_TITULO}`
  ctx.fillStyle = '#FFFFFF'
  lineasTitulo.forEach((linea, i) => ctx.fillText(linea, PAD, yTitulo0 + i * 70))
  rr(ctx, PAD, yRegla, 96, 4, 2)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fill()

  /* ---- Zona media: producto (izquierda) ---- */
  const fotoTop = mediaY + 12
  const fotoBot = mediaY + MEDIA_H - 12
  const cajaFotoW = PRODUCTO_W
  const cajaFotoH = fotoBot - fotoTop

  if (img) {
    const esc = Math.min(cajaFotoW / img.naturalWidth, cajaFotoH / img.naturalHeight)
    const dw = img.naturalWidth * esc
    const dh = img.naturalHeight * esc
    const dx = PRODUCTO_CX - dw / 2
    const dy = prodCY - dh / 2

    // Sombra de contacto (elipse aplastada bajo el producto)
    const rx = Math.min(dw * 0.42, 300)
    ctx.save()
    ctx.translate(PRODUCTO_CX, dy + dh - 14)
    ctx.scale(1, 0.14)
    const sombra = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    sombra.addColorStop(0, 'rgba(26,26,58,0.30)')
    sombra.addColorStop(1, 'rgba(26,26,58,0)')
    ctx.fillStyle = sombra
    ctx.beginPath()
    ctx.arc(0, 0, rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 'multiply': el blanco de la foto desaparece sobre el fondo blanco puro
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(img, dx, dy, dw, dh)
    ctx.restore()
  } else {
    // Sin foto: cápsula de marca como en el resto de la plataforma
    dibujarCapsula(ctx, PRODUCTO_CX, prodCY, 380, 140, -0.35, 1, '#C7D2E4')
  }

  /* ---- Insignia de descuento (sobre la zona del producto) ---- */
  if (disponible && conDescuento) {
    const txt = formatearDescuento(producto.descuento_activo)
    const bx = BADGE_CX
    const by = badgeCY
    ctx.save()
    ctx.shadowColor = 'rgba(180, 100, 0, 0.35)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 12
    ctx.beginPath()
    ctx.arc(bx, by, BADGE_R, 0, Math.PI * 2)
    ctx.fillStyle = ORO
    ctx.fill()
    ctx.restore()
    // Anillo interior punteado (se conserva del diseño anterior)
    ctx.beginPath()
    ctx.arc(bx, by, BADGE_ANILLO_R, 0, Math.PI * 2)
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(26,26,58,0.28)'
    ctx.setLineDash([3, 9])
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineCap = 'butt'
    ctx.fillStyle = INDIGO
    ctx.textAlign = 'center'
    ctx.font = `800 ${tamanoTextoDescuento(txt)}px ${F_NUM}`
    ctx.fillText(txt, bx, by + 12)
    ctx.font = `800 22px ${F_NUM}`
    conEspaciado(ctx, 4)
    ctx.fillText('OFF', bx, by + 44)
    conEspaciado(ctx, 0)
    ctx.textAlign = 'left'
  }

  /* ---- Panel de información (derecha) ---- */
  ctx.save()
  ctx.shadowColor = 'rgba(16, 32, 80, 0.10)'
  ctx.shadowBlur = 36
  ctx.shadowOffsetY = 14
  rr(ctx, PANEL_X, mediaY, PANEL_W, MEDIA_H, 28)
  ctx.fillStyle = '#F7F9FE'
  ctx.fill()
  ctx.restore()
  rr(ctx, PANEL_X, mediaY, PANEL_W, MEDIA_H, 28)
  ctx.lineWidth = 2
  ctx.strokeStyle = '#E4EAF6'
  ctx.stroke()

  // Contenido del panel, recortado a su forma (equivale al overflow:hidden del mockup)
  ctx.save()
  rr(ctx, PANEL_X, mediaY, PANEL_W, MEDIA_H, 28)
  ctx.clip()

  const x0 = PANEL_X + PANEL_PAD
  let yc = mediaY + PANEL_PAD

  // Checks
  const checks = armarChecks({ disponible, tieneDescuento: conDescuento })
  ctx.font = `600 19px ${F_TEXTO}`
  const anchoCheckTexto = CONTENIDO_ANCHO - (CHECK_R * 2 + 12)
  checks.forEach((txt) => {
    dibujarCheck(ctx, x0 + CHECK_R, yc + 12.5, CHECK_R)
    ctx.fillStyle = INDIGO
    ctx.fillText(envolverTexto(ctx, txt, anchoCheckTexto, 1)[0], x0 + CHECK_R * 2 + 12, yc + 18)
    yc += ALTO_CHECKS
  })

  // Separador
  yc += 12
  ctx.fillStyle = '#E4EAF6'
  rr(ctx, x0, yc, CONTENIDO_ANCHO, 2, 1)
  ctx.fill()
  yc += 2 + 14

  // Filas (con autofit si el contenido no entra)
  const filas = armarFilas(producto, detalles)
  const medirFilas = (k) => {
    const fLabel = `600 ${19 * k}px ${F_TEXTO}`
    const fValor = `700 ${20 * k}px ${F_NUM}`
    return filas.map((f) => {
      ctx.font = fLabel
      const anchoLabel = ctx.measureText(f.label).width
      ctx.font = fValor
      const lineas = envolverTexto(ctx, f.valor, Math.max(48, CONTENIDO_ANCHO - anchoLabel - 24), 2)
      return { ...f, lineas }
    })
  }
  let k = 1
  let medidas = medirFilas(1)
  const altoNatural = altoBloqueFilas(medidas.map((m) => m.lineas.length), 1)
  const disponibleFilas = altoFilasDisponible(checks.length)
  if (altoNatural > disponibleFilas) {
    k = escalaAutofit(altoNatural, disponibleFilas)
    medidas = medirFilas(k)
  }

  const padF = FILA_PAD * k
  const lhF = FILA_LH * k
  medidas.forEach((m, i) => {
    const ultima = i === medidas.length - 1
    const altoBloque = ultima ? altoUltimaFila(m.lineas.length, k) : altoFila(m.lineas.length, k)
    const baseY = yc + padF + lhF * 0.78

    ctx.font = `600 ${19 * k}px ${F_TEXTO}`
    ctx.fillStyle = '#7A8699'
    ctx.fillText(envolverTexto(ctx, m.label, CONTENIDO_ANCHO, 1)[0], x0, baseY)

    ctx.font = `700 ${20 * k}px ${F_NUM}`
    ctx.fillStyle = INDIGO
    ctx.textAlign = 'right'
    m.lineas.forEach((ln, j) => ctx.fillText(ln, x0 + CONTENIDO_ANCHO, baseY + j * lhF))
    ctx.textAlign = 'left'

    yc += altoBloque
    if (!ultima) {
      ctx.fillStyle = '#E9EEF8'
      rr(ctx, x0, yc - 1, CONTENIDO_ANCHO, 1, 0.5)
      ctx.fill()
    }
  })
  ctx.restore() // fin del clip del panel

  /* ---- Franja de precio ---- */
  pintarBanda(ctx, {
    y: PIE_Y,
    h: PIE_H,
    radios: [150, 56, 0, 0],
    desde: [0, H],
    hasta: [W, PIE_Y],
    stops: [[0, '#0A2E8F'], [0.5, AZUL], [1, TEAL]],
    brillo: { x: 320, y: 1360, r: 520, color: 'rgba(70,140,255,0.40)' },
    capsulas: [],
  })

  if (precio != null) {
    ctx.font = `700 20px ${F_TEXTO}`
    conEspaciado(ctx, 3)
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.fillText('PRECIO', PAD + 4, 1080)
    conEspaciado(ctx, 0)

    // Fila de precio. La pill "Ahorras" va centrada y NO se encoge, así que el precio
    // (y el original tachado) se escalan juntos para no montarse sobre ella — ver
    // escalaFilaPrecio en compartirImagenHelpers.js (defecto medido con precios altos).
    const txtPrecio = fmtUsd(precio)
    const orig = conDescuento ? fmtUsd(producto.precio_original_usd) : null
    const ahorro = conDescuento ? Number(producto.precio_original_usd) - precio : 0
    const conPill = !!orig && ahorro > 0

    // Ancho de la pill con su fuente fija (no participa del autofit)
    let anchoPill = 0
    if (conPill) {
      ctx.font = `800 ${PIE_PILL_FUENTE}px ${F_NUM}`
      anchoPill = ctx.measureText(`Ahorras ${fmtUsd(ahorro)}`).width + 44
    }

    // Anchos naturales de precio y original para calcular el factor
    ctx.font = `800 ${PIE_PRECIO_FUENTE}px ${F_NUM}`
    let anchoPrecio = ctx.measureText(txtPrecio).width
    let anchoOrig = 0
    if (orig) {
      ctx.font = `600 ${PIE_ORIG_FUENTE}px ${F_NUM}`
      anchoOrig = ctx.measureText(orig).width
    }
    const kp = conPill ? escalaFilaPrecio(anchoPrecio, anchoOrig, anchoPill) : 1

    ctx.font = `800 ${Math.round(PIE_PRECIO_FUENTE * kp)}px ${F_NUM}`
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(txtPrecio, PAD, 1167)
    anchoPrecio = ctx.measureText(txtPrecio).width

    if (orig) {
      ctx.font = `600 ${Math.round(PIE_ORIG_FUENTE * kp)}px ${F_NUM}`
      const ox = PAD + anchoPrecio + PIE_PRECIO_GAP
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.fillText(orig, ox, 1160)
      const ow = ctx.measureText(orig).width
      ctx.beginPath()
      ctx.moveTo(ox - 2, 1150)
      ctx.lineTo(ox + ow + 2, 1150)
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // Referencia en Bs (si hay tasa)
    if (tasaVes) {
      ctx.font = `700 20px ${F_TEXTO}`
      conEspaciado(ctx, 3)
      ctx.fillStyle = 'rgba(255,255,255,0.66)'
      ctx.fillText('REF.', PAD + 4, 1218)
      const anchoREF = ctx.measureText('REF.').width
      conEspaciado(ctx, 0)
      ctx.font = `700 24px ${F_NUM}`
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillText(fmtBs(precio * Number(tasaVes)), PAD + anchoREF + 12, 1218)
    }

    // Pill de ahorro (centrada en la franja; ancho ya calculado arriba)
    if (conPill) {
      const t = `Ahorras ${fmtUsd(ahorro)}`
      rr(ctx, (W - anchoPill) / 2, 1096, anchoPill, 46, 23)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.font = `800 ${PIE_PILL_FUENTE}px ${F_NUM}`
      ctx.fillStyle = AZUL
      ctx.textAlign = 'center'
      ctx.fillText(t, W / 2, 1096 + 32)
      ctx.textAlign = 'left'
    }

    // QR al producto (si el generador falló, no se promete un código que no existe).
    // Tarjeta más grande (QR_TAM 144, antes 112) y la leyenda se movió de abajo a la
    // IZQUIERDA, en 3 líneas, centrada verticalmente contra la tarjeta.
    if (qr) {
      ctx.save()
      ctx.shadowColor = 'rgba(6, 20, 60, 0.28)'
      ctx.shadowBlur = 18
      ctx.shadowOffsetY = 6
      rr(ctx, QR_X, QR_Y, QR_TAM, QR_TAM, 14)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.restore()
      dibujarQR(ctx, qr, QR_X + QR_PAD, QR_Y + QR_PAD, QR_TAM - QR_PAD * 2, INDIGO)
      const { xFin, baselines } = posicionLeyendaQR()
      ctx.font = `600 ${QR_LEYENDA_FUENTE}px ${F_TEXTO}`
      ctx.textAlign = 'right'
      ctx.fillStyle = MENTA
      QR_LEYENDA.forEach((linea, i) => ctx.fillText(linea, xFin, baselines[i]))
      ctx.textAlign = 'left'
    }

    // Pie de la franja
    const hoy = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    ctx.font = `500 19px ${F_TEXTO}`
    ctx.fillStyle = 'rgba(255,255,255,0.66)'
    ctx.textAlign = 'center'
    ctx.fillText(
      [SITIO_WEB, `Precio vigente al ${hoy}`, 'Sujeto a disponibilidad'].filter(Boolean).join('  ·  '),
      W / 2,
      1258
    )
    ctx.textAlign = 'left'
  } else {
    // Red de seguridad: el gating del componente evita llegar aquí
    ctx.font = `800 64px ${F_NUM}`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.fillText('Consultar precio', W / 2, 1160)
    ctx.textAlign = 'left'
  }

  /* ---- Tira de contacto ---- */
  ctx.fillStyle = '#071F63'
  ctx.fillRect(0, TIRA_Y, W, TIRA_H)
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  ctx.fillRect(0, TIRA_Y, W, 1)

  const tira = armarTiraContacto()
  ctx.font = `700 25px ${F_TEXTO}`
  const anchosTira = tira.map((it) => ctx.measureText(it.texto).width)
  const { items: posTira } = medirTiraContacto(anchosTira)
  const cyTira = TIRA_Y + TIRA_H / 2
  posTira.forEach((p, i) => {
    dibujarIconoContacto(ctx, tira[i].icono, p.x, cyTira - TIRA_ICONO / 2, TIRA_ICONO)
    ctx.font = `700 25px ${F_TEXTO}`
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(tira[i].texto, p.xTexto, cyTira + 9)
  })

  return { conFoto: !!img || !imagenUrl }
}

/* ---------------- componente ---------------- */

const aSlug = (s) =>
  String(s || 'producto')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 50)

export default function CompartirProductoImagen({ producto, detalles, imagenUrl, tasaVes }) {
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState('generando') // generando | listo | error
  const [fotoFallo, setFotoFallo] = useState(false)
  const [aviso, setAviso] = useState('')
  const canvasRef = useRef(null)
  const blobRef = useRef(null)

  const nombreArchivo = `carrisan-${aSlug(producto?.nombre_comercial)}.png`

  const generar = useCallback(async () => {
    if (!canvasRef.current || !producto) return
    setEstado('generando')
    setAviso('')
    blobRef.current = null
    try {
      const { conFoto } = await renderizarTarjeta(canvasRef.current, { producto, detalles, imagenUrl, tasaVes })
      setFotoFallo(!conFoto)
      blobRef.current = await new Promise((res, rej) =>
        canvasRef.current.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png')
      )
      setEstado('listo')
    } catch {
      setEstado('error')
    }
  }, [producto, detalles, imagenUrl, tasaVes])

  // El botón sigue habilitado (así el usuario recibe la explicación); el corte está acá.
  const abrir = useCallback(() => {
    const msg = mensajeNoGenerable(producto)
    if (msg) {
      toaster.create({ title: msg, type: 'warning', duration: 5000 })
      return
    }
    setAbierto(true)
  }, [producto])

  useEffect(() => {
    if (abierto) generar()
  }, [abierto, generar])

  // Bloqueo de scroll + Escape
  useEffect(() => {
    if (!abierto) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && setAbierto(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [abierto])

  function descargar() {
    if (!blobRef.current) return
    const url = URL.createObjectURL(blobRef.current)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }

  async function compartir() {
    if (!blobRef.current) return
    const archivo = new File([blobRef.current], nombreArchivo, { type: 'image/png' })
    if (navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: producto.nombre_comercial })
      } catch (e) {
        if (e?.name !== 'AbortError') descargar()
      }
    } else {
      descargar()
      setAviso('Tu navegador no permite compartir directo; la imagen se descargó.')
    }
  }

  if (!producto) return null

  return (
    <>
      <button
        type="button"
        className="pd-icon-btn"
        onClick={abrir}
        aria-label="Compartir como imagen"
        title="Compartir como imagen"
      >
        <ImageDown size={18} />
      </button>

      {abierto && createPortal(
        <div className="cpi-overlay" onClick={() => setAbierto(false)}>
          <div
            className="cpi-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Compartir producto como imagen"
            data-permitir-guardar="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cpi-head">
              <div>
                <h3>Compartir como imagen</h3>
                <p>Formato 1080×1350, ideal para WhatsApp e Instagram</p>
              </div>
              <button type="button" className="cpi-close" onClick={() => setAbierto(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <div className="cpi-preview">
              {estado === 'generando' && (
                <div className="cpi-loading"><Loader2 size={28} className="cpi-spin" /><span>Generando imagen…</span></div>
              )}
              {estado === 'error' && (
                <div className="cpi-loading">
                  <span>No se pudo generar la imagen.</span>
                  <button type="button" className="cpi-btn cpi-btn--ghost" onClick={generar}>Reintentar</button>
                </div>
              )}
              <canvas ref={canvasRef} className={`cpi-canvas${estado === 'listo' ? ' cpi-canvas--ok' : ''}`} />
            </div>

            {fotoFallo && estado === 'listo' && (
              <p className="cpi-aviso">No se pudo cargar la foto del producto; se usó el ícono de marca.</p>
            )}
            {aviso && <p className="cpi-aviso">{aviso}</p>}

            <div className="cpi-actions">
              <button type="button" className="cpi-btn cpi-btn--primary" onClick={compartir} disabled={estado !== 'listo'}>
                <Share2 size={18} /> Compartir
              </button>
              <button type="button" className="cpi-btn cpi-btn--ghost" onClick={descargar} disabled={estado !== 'listo'}>
                <Download size={18} /> Descargar PNG
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
