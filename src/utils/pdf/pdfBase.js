// src/utils/pdf/pdfBase.js
//
// Módulo base de TODOS los PDFs de la plataforma (factura, comprobante, reporte,
// guía de despacho, referencia comercial, presupuesto). Un solo lugar para la
// paleta, el membrete con degradado, el pie, tarjetas, tablas y el bloque de QR.
// Si algo visual cambia, se cambia aquí y todos los formatos lo heredan.
//
// Unidades: mm, A4 (salvo que el formato pida otra cosa).

import empresaInfo from '../../config/empresa'

/* ---------- Paleta de marca ---------- */
export const C = {
  indigo: [26, 26, 58],
  azul: [0, 82, 220],
  teal: [18, 165, 148],
  paper: [251, 250, 247],
  gris: [244, 246, 250],
  borde: [226, 230, 238],
  texto: [30, 31, 45],
  muted: [110, 113, 133],
  blanco: [255, 255, 255],
  verde: [21, 128, 61],
  verdeClaro: [220, 244, 228],
  rojo: [190, 30, 45],
  rojoClaro: [252, 228, 230],
  ambar: [180, 100, 6],
  ambarClaro: [254, 243, 214],
  luz: [214, 222, 244], // texto claro sobre degradado
}

/* ---------- Página ---------- */
export const PAG = { ancho: 210, alto: 297, margen: 16 }
PAG.contenido = PAG.ancho - PAG.margen * 2
export const Y_LIMITE = PAG.alto - 26 // bajo este punto se salta de página

/* ---------- Formateadores ---------- */
export const usd = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v) || 0)

export const bs = (v) =>
  `Bs. ${Number(v || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const fechaCorta = (f) =>
  new Date(f).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })

export const fechaLarga = (f) =>
  new Date(f).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })

export const fechaHora = (f) =>
  `${fechaCorta(f)} ${new Date(f).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`

/* ---------- Datos de empresa: nunca imprimir placeholders ---------- */
const esPlaceholder = (v) =>
  !v || /0{6,}|000-0000000|Dirección fiscal de la empresa|TODO/i.test(String(v))

export function datosEmpresa() {
  return {
    nombre: empresaInfo.nombre,
    tagline: empresaInfo.tagline,
    rif: esPlaceholder(empresaInfo.rif) ? null : empresaInfo.rif,
    telefono: esPlaceholder(empresaInfo.telefono) ? null : empresaInfo.telefono,
    email: esPlaceholder(empresaInfo.email) ? null : empresaInfo.email,
    direccion: esPlaceholder(empresaInfo.direccion) ? null : empresaInfo.direccion,
  }
}

/* ---------- Opacidad (jsPDF GState) ---------- */
export function conOpacidad(doc, opacity, fn) {
  try {
    doc.saveGraphicsState()
    doc.setGState(new doc.GState({ opacity }))
    fn()
  } finally {
    doc.restoreGraphicsState()
  }
}

/* ---------- Texto con espaciado entre letras y alineación correcta ----------
   jsPDF calcula mal el align right/center cuando hay charSpace (el texto se corre
   y se corta en el borde), así que se alinea a mano. */
export function textoEsp(doc, txt, x, y, { align = 'left', cs = 0.6 } = {}) {
  const w = doc.getTextWidth(txt) + cs * (txt.length - 1)
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x
  doc.text(txt, x0, y, { charSpace: cs })
}

/* ---------- Marca: círculo teal con cruz ---------- */
export function dibujarMarca(doc, cx, cy, r = 6) {
  doc.setFillColor(...C.teal)
  doc.circle(cx, cy, r, 'F')
  doc.setFillColor(...C.blanco)
  const g = r * 0.36
  const l = r * 1.08
  doc.roundedRect(cx - g / 2, cy - l / 2, g, l, g / 4, g / 4, 'F')
  doc.roundedRect(cx - l / 2, cy - g / 2, l, g, g / 4, g / 4, 'F')
}

/* ---------- Degradado horizontal Índigo → Azul ---------- */
function degradado(doc, x, y, w, h, desde = C.indigo, hasta = C.azul, pasos = 70) {
  const paso = w / pasos
  for (let i = 0; i < pasos; i++) {
    const t = i / (pasos - 1)
    const col = desde.map((c, k) => Math.round(c + (hasta[k] - c) * t))
    doc.setFillColor(...col)
    doc.rect(x + i * paso, y, paso + 0.4, h, 'F') // +0.4 evita costuras visibles
  }
}

/* ---------- Membrete con degradado ----------
   etiqueta: texto pequeño arriba a la derecha ("FACTURA", "COMPROBANTE DE PAGO"...)
   numero:   texto grande a la derecha ("N.º 0012")
   sub:      línea pequeña bajo el número (fecha, período...)
   Devuelve la Y donde termina el membrete. */
export function dibujarMembrete(doc, { etiqueta, numero, sub, alto = 50, numeroSize = 21 } = {}) {
  const e = datosEmpresa()
  degradado(doc, 0, 0, PAG.ancho, alto)

  // Luces decorativas (círculos translúcidos)
  conOpacidad(doc, 0.22, () => {
    doc.setFillColor(...C.teal)
    doc.circle(PAG.ancho - 8, -6, 38, 'F')
  })
  conOpacidad(doc, 0.10, () => {
    doc.setFillColor(...C.blanco)
    doc.circle(PAG.ancho - 52, alto + 4, 26, 'F')
    doc.circle(-6, alto - 6, 22, 'F')
  })

  // Marca + nombre
  dibujarMarca(doc, PAG.margen + 6, 17, 6.2)
  doc.setTextColor(...C.blanco)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(e.nombre.toUpperCase(), PAG.margen + 16, 16.5, { charSpace: 0.4 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.luz)
  doc.text(e.tagline, PAG.margen + 16, 21.5)

  // Bloque derecho: tipo de documento
  if (etiqueta) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.luz)
    textoEsp(doc, etiqueta.toUpperCase(), PAG.ancho - PAG.margen, 14, { align: 'right', cs: 1 })
  }
  if (numero) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(numeroSize)
    doc.setTextColor(...C.blanco)
    doc.text(numero, PAG.ancho - PAG.margen, 25, { align: 'right' })
  }
  if (sub) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.luz)
    doc.text(sub, PAG.ancho - PAG.margen, 31, { align: 'right' })
  }

  // Línea de datos de la empresa (solo los reales) dentro del degradado
  const datos = [e.rif && `RIF ${e.rif}`, e.telefono, e.email].filter(Boolean).join('   ·   ')
  if (datos) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.luz)
    doc.text(datos, PAG.margen, alto - 10)
  }
  if (e.direccion) {
    doc.setFontSize(7.5)
    doc.text(e.direccion, PAG.margen, alto - 5.5, { maxWidth: 130 })
  }

  // Filo teal inferior
  doc.setFillColor(...C.teal)
  doc.rect(0, alto, PAG.ancho, 1.2, 'F')
  return alto + 10
}

/* ---------- Pie en todas las páginas ---------- */
export function dibujarPie(doc, texto = 'Documento generado automáticamente por la plataforma.') {
  const e = datosEmpresa()
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFillColor(...C.teal)
    doc.rect(PAG.margen, PAG.alto - 15, 12, 0.9, 'F')
    doc.setDrawColor(...C.borde)
    doc.setLineWidth(0.2)
    doc.line(PAG.margen + 12, PAG.alto - 14.55, PAG.ancho - PAG.margen, PAG.alto - 14.55)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.indigo)
    doc.text(e.nombre, PAG.margen, PAG.alto - 9.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.muted)
    doc.text(texto, PAG.margen, PAG.alto - 5.5, { maxWidth: 150 })
    doc.text(`Página ${i} de ${total}`, PAG.ancho - PAG.margen, PAG.alto - 9.5, { align: 'right' })
  }
}

/* ---------- Título de sección ---------- */
export function dibujarSeccion(doc, y, texto) {
  doc.setFillColor(...C.teal)
  doc.roundedRect(PAG.margen, y - 3.6, 1.6, 5, 0.8, 0.8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...C.indigo)
  doc.text(texto, PAG.margen + 4.5, y)
  return y + 6
}

/* ---------- Tarjetas de datos (2-3 columnas) ----------
   campos: [{ label, valor, destacado? }] ; columnas: cuántas por fila */
export function dibujarTarjetaDatos(doc, y, titulo, campos, { columnas = 3 } = {}) {
  const filas = Math.ceil(campos.length / columnas)
  const altoTitulo = titulo ? 8 : 0
  const alto = altoTitulo + filas * 12 + 4
  doc.setFillColor(...C.gris)
  doc.setDrawColor(...C.borde)
  doc.setLineWidth(0.2)
  doc.roundedRect(PAG.margen, y, PAG.contenido, alto, 3, 3, 'FD')

  if (titulo) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...C.teal)
    doc.text(titulo.toUpperCase(), PAG.margen + 6, y + 6, { charSpace: 0.8 })
  }

  const colAncho = (PAG.contenido - 12) / columnas
  campos.forEach((c, i) => {
    const fila = Math.floor(i / columnas)
    const col = i % columnas
    const x = PAG.margen + 6 + col * colAncho
    const yy = y + altoTitulo + fila * 12 + 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...C.muted)
    doc.text(c.label.toUpperCase(), x, yy, { charSpace: 0.4 })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(c.destacado ? 10.5 : 9)
    doc.setTextColor(...(c.destacado ? C.indigo : C.texto))
    doc.text(String(c.valor ?? '—'), x, yy + 5, { maxWidth: colAncho - 4 })
  })
  return y + alto + 7
}

/* ---------- Tarjeta del cliente (con RIF, dirección y teléfono si existen) ---------- */
export function dibujarTarjetaCliente(doc, y, cliente, titulo = 'Facturado a') {
  const campos = [
    { label: 'Razón social / Nombre', valor: cliente?.nombre || 'Cliente', destacado: true },
    { label: 'RIF / Cédula', valor: cliente?.rif_cedula || '—' },
    { label: 'Teléfono', valor: cliente?.telefono || '—' },
  ]
  const yFin = dibujarTarjetaDatos(doc, y, titulo, campos, { columnas: 3 })
  // Segunda línea: correo y dirección fiscal (solo si existen)
  const extra = [cliente?.email, cliente?.direccion_fiscal].filter(Boolean).join('   ·   ')
  if (extra) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.muted)
    doc.text(extra, PAG.margen + 2, yFin - 2.5, { maxWidth: PAG.contenido - 4 })
    return yFin + 5
  }
  return yFin
}

/* ---------- Píldora de estado ---------- */
export function dibujarPildora(doc, x, y, texto, { fondo = C.verdeClaro, color = C.verde, align = 'left' } = {}) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  const w = doc.getTextWidth(texto) + 8
  const x0 = align === 'right' ? x - w : x
  doc.setFillColor(...fondo)
  doc.roundedRect(x0, y - 4.2, w, 6.4, 3.2, 3.2, 'F')
  doc.setTextColor(...color)
  doc.text(texto, x0 + 4, y)
  return w
}

/* ---------- Tabla genérica con zebra, salto de página y filas multilínea ----------
   columnas: [{ label, ancho (mm), align?, bold?, color?: rgb | (valor, fila)=>rgb }]
   filas: array de arrays (mismo orden que columnas) */
export function dibujarTabla(doc, y, columnas, filas, { fuente = 8.5, vacio = 'Sin registros.', onFila = null } = {}) {
  const total = columnas.reduce((s, c) => s + c.ancho, 0)
  const escala = PAG.contenido / total
  const cols = columnas.map((c) => ({ ...c, w: c.ancho * escala }))
  let xAcum = PAG.margen
  cols.forEach((c) => { c.x = xAcum; xAcum += c.w })

  const cabecera = (yy) => {
    doc.setFillColor(...C.indigo)
    doc.roundedRect(PAG.margen, yy, PAG.contenido, 8, 1.6, 1.6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.blanco)
    cols.forEach((c) => {
      const tx = c.align === 'right' ? c.x + c.w - 3 : c.align === 'center' ? c.x + c.w / 2 : c.x + 3
      textoEsp(doc, c.label.toUpperCase(), tx, yy + 5.2, { align: c.align || 'left', cs: 0.4 })
    })
    return yy + 10
  }

  if (!filas.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...C.muted)
    doc.text(vacio, PAG.margen, y + 6, { maxWidth: PAG.contenido })
    return y + 14
  }

  y = cabecera(y)
  filas.forEach((fila, idx) => {
    doc.setFontSize(fuente)
    // alto según la celda con más líneas
    const lineasPorCelda = fila.map((v, i) => {
      doc.setFont('helvetica', cols[i].bold ? 'bold' : 'normal')
      return doc.splitTextToSize(String(v ?? ''), cols[i].w - 6)
    })
    const lineas = Math.max(...lineasPorCelda.map((l) => l.length))
    const alto = Math.max(8, lineas * 4 + 4)

    if (y + alto > Y_LIMITE) {
      doc.addPage()
      y = cabecera(16)
    }
    if (idx % 2 === 1) {
      doc.setFillColor(...C.gris)
      doc.rect(PAG.margen, y, PAG.contenido, alto, 'F')
    }
    lineasPorCelda.forEach((ls, i) => {
      const c = cols[i]
      doc.setFont('helvetica', c.bold ? 'bold' : 'normal')
      doc.setFontSize(fuente)
      const col = typeof c.color === 'function' ? c.color(fila[i], fila) : c.color || C.texto
      doc.setTextColor(...col)
      const tx = c.align === 'right' ? c.x + c.w - 3 : c.align === 'center' ? c.x + c.w / 2 : c.x + 3
      doc.text(ls, tx, y + 5.4, { align: c.align || 'left' })
    })
    if (onFila) onFila(doc, { y, alto, idx, fila, cols })
    y += alto
  })
  doc.setDrawColor(...C.borde)
  doc.setLineWidth(0.2)
  doc.line(PAG.margen, y, PAG.margen + PAG.contenido, y)
  return y + 7
}

/* ---------- Caja de total destacada (degradado) ---------- */
export function dibujarTotal(doc, y, etiqueta, valor, { ancho = 82, color = null } = {}) {
  if (y + 22 > Y_LIMITE) { doc.addPage(); y = 20 }
  const x = PAG.margen + PAG.contenido - ancho
  if (color) {
    doc.setFillColor(...color)
    doc.roundedRect(x, y, ancho, 18, 3, 3, 'F')
  } else {
    degradado(doc, x, y, ancho, 18)
    // esquinas redondeadas: recorte con marco blanco
    doc.setDrawColor(...C.blanco)
    doc.setLineWidth(2.4)
    doc.roundedRect(x - 1.2, y - 1.2, ancho + 2.4, 20.4, 4, 4, 'S')
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.luz)
  doc.text(etiqueta.toUpperCase(), x + 6, y + 6.5, { charSpace: 0.8 })
  doc.setFontSize(15)
  doc.setTextColor(...C.blanco)
  doc.text(valor, x + ancho - 6, y + 14, { align: 'right' })
  return y + 26
}

/* ---------- Verificación por QR ----------
   Dibuja una tarjeta con el QR, el folio y el código. Si falta el código
   (p. ej. datos cacheados de antes), simplemente no se dibuja. */
export function urlVerificacion(tipo, id, codigo) {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/verificar/${tipo}/${id}?c=${encodeURIComponent(codigo)}`
}

export async function dibujarVerificacion(doc, y, { tipo, id, codigo, folio }) {
  if (!codigo) return y
  const QRCode = (await import('qrcode')).default
  const url = urlVerificacion(tipo, id, codigo)
  const dataUrl = await QRCode.toDataURL(url, {
    margin: 0, width: 320, errorCorrectionLevel: 'M',
    color: { dark: '#1A1A3A', light: '#FFFFFF' },
  })

  const alto = 36
  if (y + alto > Y_LIMITE) { doc.addPage(); y = 20 }

  doc.setFillColor(...C.paper)
  doc.setDrawColor(...C.borde)
  doc.setLineWidth(0.25)
  doc.roundedRect(PAG.margen, y, PAG.contenido, alto, 3, 3, 'FD')
  doc.setFillColor(...C.teal)
  doc.roundedRect(PAG.margen, y, 1.8, alto, 0.9, 0.9, 'F')

  // QR sobre fondo blanco
  doc.setFillColor(...C.blanco)
  doc.roundedRect(PAG.margen + 7, y + 4, 28, 28, 2, 2, 'F')
  doc.addImage(dataUrl, 'PNG', PAG.margen + 9, y + 6, 24, 24)

  const x = PAG.margen + 42
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...C.teal)
  doc.text('DOCUMENTO VERIFICABLE', x, y + 9, { charSpace: 0.8 })

  doc.setFontSize(10.5)
  doc.setTextColor(...C.indigo)
  doc.text('Comprueba que este documento es auténtico', x, y + 15.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.muted)
  doc.text('Escanea el código QR con la cámara de tu teléfono para ver', x, y + 21)
  doc.text('los datos oficiales registrados en la plataforma.', x, y + 25.3)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...C.texto)
  doc.text(`Folio ${folio}   ·   Código ${codigo}`, x, y + 30.5)

  return y + alto + 6
}

/* ---------- Guardar ---------- */
export async function nuevoDoc(opciones = {}) {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ unit: 'mm', format: 'a4', ...opciones })
}

/* ---------- Datos para pagar (solo si están configurados en config/empresa.js) ----------
   empresaInfo.datosPago = [{ metodo: 'Zelle', detalle: 'pagos@empresa.com' }, ...]
   Si no hay, no se dibuja nada: jamás se inventan cuentas bancarias. */
export function dibujarDatosPago(doc, y) {
  const lista = Array.isArray(empresaInfo.datosPago) ? empresaInfo.datosPago.filter((d) => d?.metodo && d?.detalle) : []
  if (!lista.length) return y
  y = dibujarSeccion(doc, y, 'Datos para realizar tu pago')
  const campos = lista.slice(0, 6).map((d) => ({ label: d.metodo, valor: d.detalle }))
  return dibujarTarjetaDatos(doc, y, null, campos, { columnas: 2 })
}
