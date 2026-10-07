// src/components/CompartirProductoImagen.jsx
// Botón + modal que genera una imagen 1080×1350 (Instagram vertical) del producto
// con foto, nombre, laboratorio, presentación y precio, lista para compartir.
// Diseño: lienzo blanco (las fotos del catálogo tienen fondo blanco y se funden
// con el halo vía 'multiply'), franja de marca arriba (logo + nombre) y abajo (precio).
// Se dibuja con Canvas 2D (cero dependencias nuevas).
// Compartir: menú nativo del celular (Web Share con archivo) + descarga PNG de respaldo.
//
// Uso:
//   <CompartirProductoImagen producto={producto} detalles={detalles} imagenUrl={galeria[imagenActiva]} tasaVes={tasaVes} />
// (`detalles` es opcional: aporta el registro sanitario a la lista de checks.)

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ImageDown, X, Share2, Download, Loader2 } from 'lucide-react'
import './CompartirProductoImagen.css'

const W = 1080
const H = 1350
const PAD = 72

// Paleta de marca
const AZUL = '#0052DC'
const INDIGO = '#1A1A3A'
const TEAL = '#12A594'
const ORO = '#F59E0B'

// ── Pendientes de marca ──────────────────────────────────────────────────
// LOGO_URL: cuando exista el logo, pon aquí su ruta (ej. '/logo-blanco.png' en /public).
// Mientras esté vacío se dibuja un recuadro "LOGO" de placeholder.
const LOGO_URL = ''
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

const fmtUsd = (n) => `$${Number(n).toFixed(2)}`
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

function dibujarCruz(ctx, cx, cy, s, color, lw) {
  const a = s / 3
  const h = s / 2
  ctx.beginPath()
  ctx.moveTo(cx - a / 2, cy - h)
  ctx.lineTo(cx + a / 2, cy - h)
  ctx.lineTo(cx + a / 2, cy - a / 2)
  ctx.lineTo(cx + h, cy - a / 2)
  ctx.lineTo(cx + h, cy + a / 2)
  ctx.lineTo(cx + a / 2, cy + a / 2)
  ctx.lineTo(cx + a / 2, cy + h)
  ctx.lineTo(cx - a / 2, cy + h)
  ctx.lineTo(cx - a / 2, cy + a / 2)
  ctx.lineTo(cx - h, cy + a / 2)
  ctx.lineTo(cx - h, cy - a / 2)
  ctx.lineTo(cx - a / 2, cy - a / 2)
  ctx.closePath()
  ctx.lineJoin = 'round'
  ctx.lineWidth = lw
  ctx.strokeStyle = color
  ctx.stroke()
}

function dibujarPuntos(ctx, x, y, cols, rows, gap, r, color) {
  ctx.fillStyle = color
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      ctx.beginPath()
      ctx.arc(x + i * gap, y + j * gap, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
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

// Franja de marca: degradado + brillo + puntos + cápsulas, recortado a la forma.
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

/* ---------------- render principal ---------------- */

async function renderizarTarjeta(canvas, { producto, detalles, imagenUrl, tasaVes }) {
  // Asegura que las fuentes de marca estén listas antes de dibujar
  try {
    await Promise.all([
      document.fonts.load(`700 62px ${F_TITULO}`),
      document.fonts.load(`800 96px ${F_NUM}`),
      document.fonts.load(`600 26px ${F_TEXTO}`),
      document.fonts.load(`500 26px ${F_TEXTO}`),
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

  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'alphabetic'

  const precio = producto.precio_usd != null && Number(producto.precio_usd) > 0 ? Number(producto.precio_usd) : null
  const tieneDescuento = precio != null && producto.precio_original_usd != null && producto.descuento_activo
  const disponible = !!producto.disponible

  /* ---- Pre-medición del bloque de texto (define la altura de la franja superior) ---- */
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
  const sub = [producto.presentacion, producto.forma].filter(Boolean).join('  ·  ')
  ctx.font = `500 30px ${F_TEXTO}`
  const subLinea = sub ? envolverTexto(ctx, sub, anchoTexto, 1)[0] : ''
  ctx.font = `500 26px ${F_TEXTO}`
  const molLinea = producto.molecula ? envolverTexto(ctx, producto.molecula, anchoTexto, 1)[0] : ''

  let yy = 196
  let yLab = null
  if (labLinea) { yy += 24; yLab = yy; yy += 22 }
  const yTitulo0 = yy + 52
  yy = yTitulo0 + (lineasTitulo.length - 1) * 70
  const yRegla = yy + 28
  yy = yRegla + 4
  let ySub = null
  if (subLinea) { yy += 44; ySub = yy }
  let yMol = null
  if (molLinea) { yy += subLinea ? 42 : 44; yMol = yy }
  const bandaH = yy + 62

  const PIE_Y = 1096 // inicio de la franja inferior
  const fotoTop = bandaH + 14
  const fotoBot = 984
  const fotoH = fotoBot - fotoTop
  const cyF = (fotoTop + fotoBot) / 2
  const rHalo = Math.min(fotoH / 2 - 24, 310) // el anillo exterior (+22) queda dentro de la zona de foto

  /* ---- Lienzo blanco con un toque de color hacia abajo ---- */
  const lienzo = ctx.createLinearGradient(0, 0, 0, H)
  lienzo.addColorStop(0, '#FFFFFF')
  lienzo.addColorStop(0.7, '#F4F8FD')
  lienzo.addColorStop(1, '#E8F1FB')
  ctx.fillStyle = lienzo
  ctx.fillRect(0, 0, W, H)

  // Decoración de línea fina (cruces, anillos, puntos)
  dibujarCruz(ctx, 122, fotoTop + fotoH * 0.62, 84, 'rgba(0,82,220,0.16)', 4)
  dibujarCruz(ctx, W - 112, fotoBot - 56, 62, 'rgba(18,165,148,0.28)', 4)
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(0,82,220,0.16)'
  ctx.beginPath(); ctx.arc(156, fotoTop + 44, 17, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = 'rgba(18,165,148,0.30)'
  ctx.beginPath(); ctx.arc(W - 176, fotoBot - 132, 24, 0, Math.PI * 2); ctx.stroke()
  dibujarPuntos(ctx, PAD, fotoTop + 18, 5, 4, 18, 2.6, 'rgba(0,82,220,0.20)')
  dibujarPuntos(ctx, W - PAD - 72, fotoBot - 168, 5, 4, 18, 2.6, 'rgba(0,82,220,0.20)')

  /* ---- Halo + producto ---- */
  const cxH = W / 2
  const halo = ctx.createRadialGradient(cxH, cyF, 10, cxH, cyF, rHalo)
  halo.addColorStop(0, '#FFFFFF')
  halo.addColorStop(0.65, 'rgba(0,82,220,0.05)')
  halo.addColorStop(1, 'rgba(0,82,220,0.14)')
  ctx.beginPath()
  ctx.arc(cxH, cyF, rHalo, 0, Math.PI * 2)
  ctx.fillStyle = halo
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cxH, cyF, rHalo + 22, 0, Math.PI * 2)
  ctx.lineWidth = 2.5
  ctx.strokeStyle = 'rgba(0,82,220,0.13)'
  ctx.stroke()

  if (img) {
    const bw = 800
    const bh = fotoH - 24
    const esc = Math.min(bw / img.naturalWidth, bh / img.naturalHeight)
    const dw = img.naturalWidth * esc
    const dh = img.naturalHeight * esc
    const dx = cxH - dw / 2
    const dy = cyF - dh / 2
    // sombra de contacto (elipse suave) bajo el producto
    const rx = Math.min(dw * 0.42, 300)
    ctx.save()
    ctx.translate(cxH, dy + dh - 14)
    ctx.scale(1, 0.14)
    const sombra = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    sombra.addColorStop(0, 'rgba(26,26,58,0.30)')
    sombra.addColorStop(1, 'rgba(26,26,58,0)')
    ctx.fillStyle = sombra
    ctx.beginPath()
    ctx.arc(0, 0, rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    // 'multiply': el blanco de la foto desaparece sobre el halo (no se ve el rectángulo)
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(img, dx, dy, dw, dh)
    ctx.restore()
  } else {
    // Sin foto: cápsula de marca como en el resto de la plataforma
    dibujarCapsula(ctx, cxH, cyF, 380, 140, -0.35, 1, '#C7D2E4')
  }

  /* ---- Franja superior (logo + nombre) ---- */
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

  // Textos del producto
  if (labLinea) {
    ctx.font = `700 24px ${F_TEXTO}`
    conEspaciado(ctx, 4)
    ctx.fillStyle = '#5EEAD4'
    ctx.fillText(labLinea, PAD, yLab)
    conEspaciado(ctx, 0)
  }
  ctx.font = `700 64px ${F_TITULO}`
  ctx.fillStyle = '#FFFFFF'
  lineasTitulo.forEach((linea, i) => ctx.fillText(linea, PAD, yTitulo0 + i * 70))
  rr(ctx, PAD, yRegla, 96, 4, 2)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fill()
  if (subLinea) {
    ctx.font = `500 30px ${F_TEXTO}`
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.fillText(subLinea, PAD, ySub)
  }
  if (molLinea) {
    ctx.font = `500 26px ${F_TEXTO}`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText(molLinea, PAD, yMol)
  }

  /* ---- Insignia de descuento (flota sobre la zona de la foto) ---- */
  if (disponible && tieneDescuento) {
    const d = producto.descuento_activo
    // descuento_activo.tipo es 'porcentaje' o monto fijo (ver
    // calcularDescuentoUSD en descuentos.controller.js): hardcodear "%"
    // mentiría en los descuentos de monto ("-$5.00" impreso como "-5%").
    const txt = d.tipo === 'porcentaje' ? `-${d.valor}%` : `-${fmtUsd(d.valor)}`
    const bx = W - PAD - 92
    const by = fotoTop + 112
    ctx.save()
    ctx.shadowColor = 'rgba(180, 100, 0, 0.35)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 12
    ctx.beginPath()
    ctx.arc(bx, by, 92, 0, Math.PI * 2)
    ctx.fillStyle = ORO
    ctx.fill()
    ctx.restore()
    ctx.beginPath()
    ctx.arc(bx, by, 80, 0, Math.PI * 2)
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(26,26,58,0.28)'
    ctx.setLineDash([3, 9])
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineCap = 'butt'
    ctx.fillStyle = INDIGO
    ctx.textAlign = 'center'
    ctx.font = `800 ${txt.length > 5 ? 38 : 54}px ${F_NUM}`
    ctx.fillText(txt, bx, by + 12)
    ctx.font = `800 22px ${F_NUM}`
    conEspaciado(ctx, 4)
    ctx.fillText('OFF', bx, by + 44)
    conEspaciado(ctx, 0)
    ctx.textAlign = 'left'
  }

  /* ---- Lista de checks (solo datos reales del producto) ---- */
  const checks = [
    detalles?.registro_sanitario && 'Registro sanitario verificado',
    disponible && 'Disponible para despacho',
    'Vendido por Droguería Carrisán',
    producto.pais_origen && `Origen: ${producto.pais_origen}`,
    producto.forma && `Forma: ${producto.forma}`,
  ].filter(Boolean).slice(0, 4)

  const colW = (W - PAD * 2) / 2
  ctx.font = `600 25px ${F_TEXTO}`
  checks.forEach((txt, i) => {
    const col = i % 2
    const fila = Math.floor(i / 2)
    const x = PAD + col * colW
    const yBase = 1018 + fila * 52
    dibujarCheck(ctx, x + 17, yBase - 9, 17)
    ctx.fillStyle = INDIGO
    ctx.fillText(envolverTexto(ctx, txt, colW - 56, 1)[0], x + 46, yBase)
  })

  /* ---- Franja inferior (precio) ---- */
  pintarBanda(ctx, {
    y: PIE_Y,
    h: H - PIE_Y,
    radios: [150, 56, 0, 0],
    desde: [0, H],
    hasta: [W, PIE_Y],
    stops: [[0, '#0A2E8F'], [0.5, AZUL], [1, TEAL]],
    brillo: { x: 120, y: H - 20, r: 520, color: 'rgba(70,140,255,0.40)' },
    capsulas: [[900, 1290, 460, 168, 0.5, 0.06]],
  })

  if (precio != null) {
    ctx.font = `700 22px ${F_TEXTO}`
    conEspaciado(ctx, 3)
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.fillText('PRECIO', PAD + 4, 1172)
    conEspaciado(ctx, 0)

    ctx.font = `800 96px ${F_NUM}`
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(fmtUsd(precio), PAD, 1262)
    const anchoPrecio = ctx.measureText(fmtUsd(precio)).width

    if (tieneDescuento) {
      ctx.font = `600 34px ${F_NUM}`
      const orig = fmtUsd(producto.precio_original_usd)
      const ox = PAD + anchoPrecio + 24
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText(orig, ox, 1260)
      const ow = ctx.measureText(orig).width
      ctx.beginPath()
      ctx.moveTo(ox - 2, 1248)
      ctx.lineTo(ox + ow + 2, 1248)
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // Columna derecha: referencia en Bs y ahorro
    const derX = W - PAD - 8
    ctx.textAlign = 'right'
    if (tasaVes) {
      ctx.font = `700 22px ${F_TEXTO}`
      conEspaciado(ctx, 3)
      ctx.fillStyle = 'rgba(255,255,255,0.78)'
      ctx.fillText('REFERENCIA', derX, 1172)
      conEspaciado(ctx, 0)
      ctx.font = `800 38px ${F_NUM}`
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(fmtBs(precio * Number(tasaVes)), derX, 1220)
    }
    if (tieneDescuento) {
      const ahorro = Number(producto.precio_original_usd) - precio
      if (ahorro > 0) {
        const t = `Ahorras ${fmtUsd(ahorro)}`
        ctx.font = `800 26px ${F_NUM}`
        const tw = ctx.measureText(t).width + 40
        const py = tasaVes ? 1238 : 1190
        rr(ctx, derX - tw, py, tw, 44, 22)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.fillStyle = AZUL
        ctx.textAlign = 'center'
        ctx.fillText(t, derX - tw / 2, py + 31)
      }
    }
    ctx.textAlign = 'left'
  } else {
    ctx.font = `800 64px ${F_NUM}`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.fillText('Consultar precio', W / 2, 1250)
    ctx.textAlign = 'left'
  }

  /* ---- Pie ---- */
  const hoy = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  ctx.font = `500 22px ${F_TEXTO}`
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.textAlign = 'center'
  ctx.fillText(
    [SITIO_WEB, `Precio vigente al ${hoy}`, 'Sujeto a disponibilidad'].filter(Boolean).join('  ·  '),
    W / 2,
    1325
  )
  ctx.textAlign = 'left'

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
        onClick={() => setAbierto(true)}
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