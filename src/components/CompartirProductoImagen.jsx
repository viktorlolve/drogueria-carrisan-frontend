// src/components/CompartirProductoImagen.jsx
// Botón + modal que genera una imagen 1080×1350 (Instagram vertical) del producto
// con foto, nombre, laboratorio, presentación y precio, lista para compartir.
// Se dibuja con Canvas 2D (cero dependencias nuevas).
// Compartir: menú nativo del celular (Web Share con archivo) + descarga PNG de respaldo.
//
// Uso:
//   <CompartirProductoImagen producto={producto} imagenUrl={galeria[imagenActiva]} tasaVes={tasaVes} />

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
const PAPER = '#FBFAF7'
const ORO = '#F59E0B'

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

/* ---------------- render principal ---------------- */

async function renderizarTarjeta(canvas, { producto, imagenUrl, tasaVes }) {
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

  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'alphabetic'

  const precio = producto.precio_usd != null && Number(producto.precio_usd) > 0 ? Number(producto.precio_usd) : null
  const tieneDescuento = precio != null && producto.precio_original_usd != null && producto.descuento_activo
  const disponible = !!producto.disponible

  /* ---- Fondo: degradado de marca ---- */
  const fondo = ctx.createLinearGradient(0, 0, W, H)
  fondo.addColorStop(0, INDIGO)
  fondo.addColorStop(0.55, '#0A2E8F')
  fondo.addColorStop(1, AZUL)
  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, W, H)

  const brilloTeal = ctx.createRadialGradient(W - 60, 120, 0, W - 60, 120, 620)
  brilloTeal.addColorStop(0, 'rgba(18,165,148,0.50)')
  brilloTeal.addColorStop(1, 'rgba(18,165,148,0)')
  ctx.fillStyle = brilloTeal
  ctx.fillRect(0, 0, W, H)

  const brilloAzul = ctx.createRadialGradient(80, H - 120, 0, 80, H - 120, 700)
  brilloAzul.addColorStop(0, 'rgba(70,140,255,0.38)')
  brilloAzul.addColorStop(1, 'rgba(70,140,255,0)')
  ctx.fillStyle = brilloAzul
  ctx.fillRect(0, 0, W, H)

  // Puntos sutiles
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  for (let x = 36; x < W; x += 54) {
    for (let y = 36; y < H; y += 54) {
      ctx.beginPath()
      ctx.arc(x, y, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Cápsulas decorativas
  dibujarCapsula(ctx, 930, 300, 520, 190, -0.55, 0.07)
  dibujarCapsula(ctx, 120, 760, 460, 168, 0.5, 0.06)

  /* ---- Encabezado ---- */
  ctx.font = `800 25px ${F_NUM}`
  conEspaciado(ctx, 3)
  const marca = 'DROGUERÍA CARRISÁN'
  const anchoMarca = ctx.measureText(marca).width
  const pillW = anchoMarca + 40 + 62
  rr(ctx, PAD, 68, pillW, 66, 33)
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 2
  ctx.stroke()
  // cruz farmacia
  ctx.beginPath()
  ctx.arc(PAD + 38, 101, 20, 0, Math.PI * 2)
  ctx.fillStyle = TEAL
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  rr(ctx, PAD + 38 - 3.5, 101 - 11, 7, 22, 2); ctx.fill()
  rr(ctx, PAD + 38 - 11, 101 - 3.5, 22, 7, 2); ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(marca, PAD + 70, 110)
  conEspaciado(ctx, 0)

  // Badge derecho: descuento o agotado
  let badge = null
  if (!disponible) badge = { txt: 'AGOTADO', bg: '#DC2626', fg: '#FFFFFF' }
  else if (tieneDescuento) {
    // descuento_activo.tipo es 'porcentaje' o monto fijo (ver
    // calcularDescuentoUSD en descuentos.controller.js): hardcodear "%"
    // mentiría en los descuentos de monto ("-$5.00" impreso como "-5%").
    const d = producto.descuento_activo
    badge = {
      txt: d.tipo === 'porcentaje' ? `-${d.valor}% OFF` : `-${fmtUsd(d.valor)} OFF`,
      bg: ORO,
      fg: INDIGO,
    }
  }
  if (badge) {
    ctx.font = `800 28px ${F_NUM}`
    conEspaciado(ctx, 1)
    const bw = ctx.measureText(badge.txt).width + 56
    rr(ctx, W - PAD - bw, 68, bw, 66, 33)
    ctx.fillStyle = badge.bg
    ctx.fill()
    ctx.fillStyle = badge.fg
    ctx.textAlign = 'center'
    ctx.fillText(badge.txt, W - PAD - bw / 2, 111)
    ctx.textAlign = 'left'
    conEspaciado(ctx, 0)
  }

  /* ---- Tarjeta de la foto ---- */
  const cx = PAD, cy = 178, cw = W - PAD * 2, ch = 556
  ctx.save()
  ctx.shadowColor = 'rgba(5, 10, 40, 0.45)'
  ctx.shadowBlur = 70
  ctx.shadowOffsetY = 34
  rr(ctx, cx, cy, cw, ch, 56)
  ctx.fillStyle = PAPER
  ctx.fill()
  ctx.restore()

  ctx.save()
  rr(ctx, cx, cy, cw, ch, 56)
  ctx.clip()
  const halo = ctx.createRadialGradient(cx + cw / 2, cy + ch / 2, 40, cx + cw / 2, cy + ch / 2, 520)
  halo.addColorStop(0, '#FFFFFF')
  halo.addColorStop(1, '#EEF2F8')
  ctx.fillStyle = halo
  ctx.fillRect(cx, cy, cw, ch)

  if (img) {
    const pad = 54
    const bw = cw - pad * 2
    const bh = ch - pad * 2
    const esc = Math.min(bw / img.naturalWidth, bh / img.naturalHeight)
    const dw = img.naturalWidth * esc
    const dh = img.naturalHeight * esc
    const dx = cx + (cw - dw) / 2
    const dy = cy + (ch - dh) / 2
    // sombra suave bajo el producto
    ctx.save()
    ctx.shadowColor = 'rgba(26, 26, 58, 0.22)'
    ctx.shadowBlur = 36
    ctx.shadowOffsetY = 20
    ctx.drawImage(img, dx, dy, dw, dh)
    ctx.restore()
  } else {
    // Sin foto: cápsula de marca como en el resto de la plataforma
    dibujarCapsula(ctx, cx + cw / 2, cy + ch / 2, 380, 140, -0.35, 1, '#C7D2E4')
  }
  ctx.restore()

  /* ---- Textos ---- */
  let y = 806
  const lab = (producto.laboratorio || '').toUpperCase()
  if (lab) {
    ctx.font = `700 24px ${F_TEXTO}`
    conEspaciado(ctx, 4)
    ctx.fillStyle = '#5EEAD4'
    const l = envolverTexto(ctx, lab, W - PAD * 2, 1)
    ctx.fillText(l[0], PAD, y)
    conEspaciado(ctx, 0)
    y += 30
  }

  ctx.font = `700 64px ${F_TITULO}`
  ctx.fillStyle = '#FFFFFF'
  const lineasTitulo = envolverTexto(ctx, producto.nombre_comercial || 'Producto', W - PAD * 2, 2)
  y += 62
  lineasTitulo.forEach((linea, i) => {
    ctx.fillText(linea, PAD, y + i * 70)
  })
  y += (lineasTitulo.length - 1) * 70

  // Sublínea: presentación · forma
  const partes = [producto.presentacion, producto.forma].filter(Boolean)
  const sub = partes.join('  ·  ')
  if (sub) {
    ctx.font = `500 30px ${F_TEXTO}`
    ctx.fillStyle = 'rgba(255,255,255,0.78)'
    const l = envolverTexto(ctx, sub, W - PAD * 2, 1)
    ctx.fillText(l[0], PAD, y + 52)
    y += 52
  }
  if (producto.molecula) {
    ctx.font = `500 26px ${F_TEXTO}`
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    const l = envolverTexto(ctx, producto.molecula, W - PAD * 2, 1)
    ctx.fillText(l[0], PAD, y + 44)
  }

  /* ---- Panel de precio ---- */
  const py = 1118, ph = 160
  rr(ctx, PAD, py, W - PAD * 2, ph, 46)
  ctx.fillStyle = 'rgba(255,255,255,0.13)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 2
  ctx.stroke()

  if (precio != null) {
    ctx.font = `700 22px ${F_TEXTO}`
    conEspaciado(ctx, 3)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText('PRECIO', PAD + 44, py + 46)
    conEspaciado(ctx, 0)

    ctx.font = `800 96px ${F_NUM}`
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(fmtUsd(precio), PAD + 40, py + 136)
    const anchoPrecio = ctx.measureText(fmtUsd(precio)).width

    if (tieneDescuento) {
      ctx.font = `600 34px ${F_NUM}`
      const orig = fmtUsd(producto.precio_original_usd)
      const ox = PAD + 40 + anchoPrecio + 26
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.fillText(orig, ox, py + 134)
      const ow = ctx.measureText(orig).width
      ctx.beginPath()
      ctx.moveTo(ox - 2, py + 122)
      ctx.lineTo(ox + ow + 2, py + 122)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // Columna derecha: ahorro o Bs
    const derX = W - PAD - 44
    ctx.textAlign = 'right'
    if (tasaVes) {
      ctx.font = `700 22px ${F_TEXTO}`
      conEspaciado(ctx, 3)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText('REFERENCIA', derX, py + 46)
      conEspaciado(ctx, 0)
      ctx.font = `800 38px ${F_NUM}`
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(fmtBs(precio * Number(tasaVes)), derX, py + 100)
    }
    if (tieneDescuento) {
      const ahorro = Number(producto.precio_original_usd) - precio
      if (ahorro > 0) {
        const t = `Ahorras ${fmtUsd(ahorro)}`
        ctx.font = `800 26px ${F_NUM}`
        const tw = ctx.measureText(t).width + 40
        rr(ctx, derX - tw, py + (tasaVes ? 112 : 84), tw, 42, 21)
        ctx.fillStyle = TEAL
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.textAlign = 'center'
        ctx.fillText(t, derX - tw / 2, py + (tasaVes ? 142 : 114))
      }
    }
    ctx.textAlign = 'left'
  } else {
    ctx.font = `800 64px ${F_NUM}`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.fillText('Consultar precio', W / 2, py + 100)
    ctx.textAlign = 'left'
  }

  /* ---- Pie ---- */
  const hoy = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  ctx.font = `500 22px ${F_TEXTO}`
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.textAlign = 'center'
  ctx.fillText(`Precio vigente al ${hoy}  ·  Sujeto a disponibilidad`, W / 2, 1322)
  ctx.textAlign = 'left'

  return { conFoto: !!img || !imagenUrl }
}

/* ---------------- componente ---------------- */

const aSlug = (s) =>
  String(s || 'producto')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 50)

export default function CompartirProductoImagen({ producto, imagenUrl, tasaVes }) {
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
      const { conFoto } = await renderizarTarjeta(canvasRef.current, { producto, imagenUrl, tasaVes })
      setFotoFallo(!conFoto)
      blobRef.current = await new Promise((res, rej) =>
        canvasRef.current.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png')
      )
      setEstado('listo')
    } catch {
      setEstado('error')
    }
  }, [producto, imagenUrl, tasaVes])

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
