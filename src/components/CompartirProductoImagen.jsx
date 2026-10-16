// src/components/CompartirProductoImagen.jsx
// Botón + modal que genera una imagen 1080×1350 (Instagram vertical) del producto,
// lista para compartir por WhatsApp o redes.
// Rediseño (Opción 1, aprobada por el dueño 2026-10-15): lienzo BLANCO puro, sin halo
// ni anillo sobre la foto, sin decoración de cruces/puntos; encabezado con logo + estado
// + laboratorio + nombre; zona media con la foto a la izquierda (con sombra de contacto)
// y un panel de información a la derecha (checks + hasta 7 filas); insignia de descuento
// conservada; franja de precio con "Ahorras", referencia en Bs y QR al producto; y una
// tira de contacto (WhatsApp · Instagram · Facebook) que cierra la pieza.
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
  MEDIA_Y,
  MEDIA_H,
  PRODUCTO_W,
  PRODUCTO_CX,
  PRODUCTO_CY,
  PANEL_X,
  PANEL_W,
  PANEL_PAD,
  CONTENIDO_ANCHO,
  ALTO_CHECKS,
  CHECK_R,
  FILA_LH,
  FILA_PAD,
  BADGE_CX,
  BADGE_CY,
  BADGE_R,
  BADGE_ANILLO_R,
  PIE_Y,
  PIE_H,
  TIRA_Y,
  TIRA_H,
  TIRA_ICONO,
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

// Íconos de la tira de contacto (decoración reconocible; el dato real es el texto).
function dibujarIconoContacto(ctx, tipo, x, y, s) {
  ctx.save()
  ctx.strokeStyle = MENTA
  ctx.fillStyle = MENTA
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const c = s / 2

  if (tipo === 'whatsapp') {
    // Globo de diálogo con la colita abajo a la izquierda + auricular
    ctx.beginPath()
    ctx.arc(x + c, y + c - 1, c - 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + 3, y + s - 6)
    ctx.lineTo(x + 3.5, y + s - 1)
    ctx.lineTo(x + 9.5, y + s - 5.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + c - 6, y + c - 5)
    ctx.quadraticCurveTo(x + c + 3, y + c + 2, x + c + 1, y + c + 7)
    ctx.stroke()
  } else if (tipo === 'instagram') {
    rr(ctx, x + 2, y + 2, s - 4, s - 4, 7)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x + c, y + c, s * 0.21, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x + s - 9, y + 9, 1.9, 0, Math.PI * 2)
    ctx.fill()
  } else if (tipo === 'facebook') {
    ctx.beginPath()
    ctx.arc(x + c, y + c, c - 1, 0, Math.PI * 2)
    ctx.stroke()
    ctx.font = `700 ${Math.round(s * 0.62)}px ${F_TEXTO}`
    ctx.textAlign = 'center'
    ctx.fillText('f', x + c + 1, y + s * 0.78)
    ctx.textAlign = 'left'
  }
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
  const fotoTop = MEDIA_Y + 12
  const fotoBot = MEDIA_Y + MEDIA_H - 12
  const cajaFotoW = PRODUCTO_W
  const cajaFotoH = fotoBot - fotoTop

  if (img) {
    const esc = Math.min(cajaFotoW / img.naturalWidth, cajaFotoH / img.naturalHeight)
    const dw = img.naturalWidth * esc
    const dh = img.naturalHeight * esc
    const dx = PRODUCTO_CX - dw / 2
    const dy = PRODUCTO_CY - dh / 2

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
    dibujarCapsula(ctx, PRODUCTO_CX, PRODUCTO_CY, 380, 140, -0.35, 1, '#C7D2E4')
  }

  /* ---- Insignia de descuento (sobre la zona del producto) ---- */
  if (disponible && conDescuento) {
    const txt = formatearDescuento(producto.descuento_activo)
    const bx = BADGE_CX
    const by = BADGE_CY
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
  rr(ctx, PANEL_X, MEDIA_Y, PANEL_W, MEDIA_H, 28)
  ctx.fillStyle = '#F7F9FE'
  ctx.fill()
  ctx.restore()
  rr(ctx, PANEL_X, MEDIA_Y, PANEL_W, MEDIA_H, 28)
  ctx.lineWidth = 2
  ctx.strokeStyle = '#E4EAF6'
  ctx.stroke()

  // Contenido del panel, recortado a su forma (equivale al overflow:hidden del mockup)
  ctx.save()
  rr(ctx, PANEL_X, MEDIA_Y, PANEL_W, MEDIA_H, 28)
  ctx.clip()

  const x0 = PANEL_X + PANEL_PAD
  let yc = MEDIA_Y + PANEL_PAD

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

    // QR al producto (si el generador falló, no se promete un código que no existe)
    if (qr) {
      ctx.save()
      ctx.shadowColor = 'rgba(6, 20, 60, 0.28)'
      ctx.shadowBlur = 18
      ctx.shadowOffsetY = 6
      rr(ctx, 896, 1084, 112, 112, 12)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.restore()
      dibujarQR(ctx, qr, 904, 1092, 96, INDIGO)
      ctx.font = `600 17px ${F_TEXTO}`
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.78)'
      ctx.fillText('Escanea para ver el producto', 1008, 1218)
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
