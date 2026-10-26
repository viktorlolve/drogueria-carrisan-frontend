// src/utils/generarComprobantePagoPDF.js
//
// Comprobante (recibo) de un pago registrado — molde "Editorial".
// Media hoja HORIZONTAL: 160 × 94 mm (1,70:1), márgenes de 6,5 mm.
//
// Composición (una sola columna, de arriba abajo):
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ [logo + RIF · tel · mail]        COMPROBANTE DE PAGO         │
//   │                                        N.º 8712              │
//   │                              22 de octubre de 2026 · 3:14pm  │
//   ├──────────────────────────────────────────────────────────────┤
//   │ PAGADO POR                              TOTAL PAGADO         │
//   │ Cliente institucional              USD  1.234,56             │
//   │ RIF · tel · mail                 VES 45.123,17 · tasa 36.67  │
//   ├──────────────────────────────────────────────────────────────┤
//   │ DETALLE DE OPERACIÓN                                         │
//   │ Método ........................................ Transferencia │
//   │ Fecha y hora ............................ 22/10/2026 15:14    │
//   │ Facturas aplicadas ....................... N.º 0001 · N.º 0002│
//   │ ─────────────────────────────────────────────────────────────│
//   │ Total pagado ................................ USD 1,234.56    │
//   ├──────────────────────────────────────────────────────────────┤
//   │ Pago registrado el ...                    ▓▓▓  VERIFICAR     │
//   │ Documento generado electrónicamente...    ▓▓▓  Folio / Código│
//   └──────────────────────────────────────────────────────────────┘
//
// Reglas de datos (no negociables):
//  · Solo se dibuja lo que existe en el payload. No se inventan bancos,
//    referencias, titulares, fechas ni estados.
//  · `monto_bs` / `tasa_usada` solo aparecen si el pago los trae (vienen del
//    reporte que cargó el cliente); nunca se recalcula la tasa del día.
//  · El pie dice "Pago registrado" (hecho verificable: la fila existe), nunca
//    "pago confirmado".
//  · El QR solo se dibuja con un `codigo_verificacion` real.
//
// Reglas de maquetación:
//  · La página es horizontal: jsPDF hay que declararla con
//    `orientation: 'landscape'`. Sin eso normaliza a vertical (95,5 × 160 mm)
//    y todo lo que va a la derecha se sale del papel.
//  · Nunca se pagina: si el detalle crece (un `detalle` largo, muchas
//    facturas), la página crece en alto y el pie sigue al contenido.
//  · La factura usa otro generador; aquí no se toca nada compartido.

import {
  C,
  PAG,
  datosEmpresa,
  nuevoDoc,
  cargarLogoClaro,
  usdCode,
  bs,
  fechaCorta,
  fechaHora,
  fechaLarga,
  urlVerificacion,
  qrDataUrl,
} from './pdf/pdfBase'

const METODOS = {
  transferencia: 'Transferencia bancaria',
  pago_movil: 'Pago móvil',
  zelle: 'Zelle',
  efectivo: 'Efectivo',
  abono: 'Abono',
  otro: 'Otro',
}

const PAGINA_COMPROBANTE = { ancho: 160, alto: 94, margen: 6.5 }

// jsPDF normaliza a vertical (intercambia ancho y alto) cuando el formato es
// apaisado, así que la orientación hay que declararla. Sin esto la página sale
// de 95,5 × 160 mm y todo lo que va a la derecha queda fuera del papel.
const ORIENTACION = { orientation: 'landscape' }

// Blanco mínimo que se respeta abajo cuando la página tiene que crecer.
const PIE_MINIMO = 3.4

// 1 pt = 25,4/72 mm. jsPDF trabaja en mm y su tipografía en pt: esta constante
// convierte una a la otra (y `charSpace` de jsPDF también está en mm).
const PT = 25.4 / 72

// Interlineado de las filas del detalle. Es más apretado que el 1,35 del resto
// (un recibo se lee en bloque, no como prosa) y es lo que hace que el caso
// normal —cuatro filas— cierre justo en los 94 mm aprobados.
const LH_FILA = 1.2

const COLOR = {
  tinta: [34, 34, 34], // #222222
  gris: [119, 119, 119], // #777777
  tenue: [142, 145, 150], // #8E9196 — etiquetas y metadatos
  linea: [221, 221, 221], // #DDDDDD
  lineaSuave: [237, 237, 237], // #EDEDED
  banda: [245, 245, 245], // #F5F5F5
  azul: C.azul, // #0052DC
}

// Tracking en mm (equivale a los `letter-spacing` del diseño en em).
const TRACKING = {
  titulo: 0.275, // 6 pt × .13em
  seccion: 0.25, // 5,5 pt × .13em
  etiqueta: 0.26, // 5,5 pt × .14em
  qr: 0.18, // 5,6 pt × .09em
}

/* ---------- Medidas de texto ----------
   `charSpace` NO lo cuenta `getTextWidth`, así que el ancho real de un texto
   con tracking es ancho + cs × (caracteres - 1). Medir sin eso desalinea todo
   lo que se pinta alineado a la derecha. */

const altoLinea = (pt, factor = 1.35) => pt * PT * factor

// La línea de base queda al 80 % de la caja de línea (Arial: ascendente .905em,
// descendente .212em sobre un interlineado de 1.35em).
const lineaBase = (top, pt, factor = 1.35) => top + altoLinea(pt, factor) * 0.8

function anchoTexto(doc, txt, cs = 0) {
  const t = String(txt ?? '')
  if (!t) return 0
  return doc.getTextWidth(t) + (cs ? cs * (t.length - 1) : 0)
}

function escribir(doc, txt, x, y, { align = 'left', cs = 0 } = {}) {
  const t = String(txt ?? '')
  if (!t) return 0
  const w = anchoTexto(doc, t, cs)
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x
  if (cs) doc.text(t, x0, y, { charSpace: cs })
  else doc.text(t, x0, y)
  return w
}

function partir(doc, txt, ancho) {
  const t = String(txt ?? '').trim()
  if (!t) return []
  return doc.splitTextToSize(t, Math.max(8, ancho))
}

const hora = (f) =>
  new Date(f).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })

const numero = (v) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0)

/* ---------- Plan + dibujo ----------
   `construir` mide (con el doc que recibe) y devuelve un plan con su propio
   `dibujar()`. Se llama dos veces: una sobre un doc de 160×94 para saber si el
   contenido cabe, y otra sobre el doc definitivo. Nunca pagina. */
function construir(doc, datos) {
  const { pago, cliente, empresa, facturas, logo, qr } = datos

  const x0 = PAG.margen
  const xFin = PAG.ancho - PAG.margen
  const contenido = xFin - x0

  // ---------------------------------------------------------------------------
  // Datos (solo los reales)
  // ---------------------------------------------------------------------------
  const totalTexto = usdCode(pago.monto)
  const moneda = usdCode(0).replace(/[^A-Za-z]/g, '') || 'USD'
  const montoTexto = numero(pago.monto)
  const metodo = METODOS[pago.tipo] || pago.tipo || 'No especificado'
  const fechaLargaPago = fechaLarga(pago.created_at)
  const horaPago = hora(pago.created_at)

  const porId = new Map((facturas || []).map((f) => [f.id, f]))
  const numerosFactura = (pago.pago_facturas || []).map((pf) => {
    const f = porId.get(pf.factura_id)
    return f?.numero_factura ? `N.º ${f.numero_factura}` : `Factura #${pf.factura_id}`
  })

  const filasBase = [
    { k: 'Método', v: metodo },
    { k: 'Fecha y hora', v: fechaHora(pago.created_at) },
    pago.detalle ? { k: 'Detalle', v: String(pago.detalle) } : null,
    numerosFactura.length ? { k: 'Facturas aplicadas', v: numerosFactura.join('  ·  ') } : null,
  ].filter(Boolean)

  const subImporte =
    pago.monto_bs && pago.tasa_usada
      ? `${bs(pago.monto_bs)}  ·  tasa ${Number(pago.tasa_usada).toFixed(2)}`
      : ''

  const metaEmpresa = [empresa.rif ? `RIF ${empresa.rif}` : '', empresa.telefono, empresa.email]
    .filter(Boolean)
    .join('  ·  ')

  const metaCliente = [
    cliente?.rif_cedula ? `RIF / C.I. ${cliente.rif_cedula}` : '',
    cliente?.telefono,
    cliente?.email,
  ]
    .filter(Boolean)
    .join('  ·  ')

  // ---------------------------------------------------------------------------
  // Cabecera
  // ---------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6)
  const tituloDoc = 'COMPROBANTE DE PAGO'
  const anchoTitulo = anchoTexto(doc, tituloDoc, TRACKING.titulo)

  doc.setFontSize(9)
  const folioTexto = `N.º ${pago.id ?? '—'}`
  const anchoFolio = anchoTexto(doc, folioTexto)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  const fechaDoc = `${fechaLargaPago}  ·  ${horaPago}`
  const anchoFechaDoc = anchoTexto(doc, fechaDoc)

  // La columna de identificación se queda con el ancho de su texto más largo.
  const anchoId = Math.max(anchoTitulo, anchoFolio, anchoFechaDoc)
  const anchoMarca = contenido - anchoId - 6

  doc.setFontSize(5.7)
  const lineasMetaEmpresa = partir(doc, metaEmpresa, anchoMarca)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  const lineasNombreEmpresa = partir(doc, empresa.nombre, anchoMarca)

  // Sin logo (Node, CORS, red) se dibuja el nombre de la empresa en texto.
  const altoMarca = logo
    ? 7 + 1.1 + lineasMetaEmpresa.length * altoLinea(5.7)
    : lineasNombreEmpresa.length * altoLinea(9.5) +
      (lineasMetaEmpresa.length ? 1.1 + lineasMetaEmpresa.length * altoLinea(5.7) : 0)

  const altoId = altoLinea(6) + 0.7 + altoLinea(9) + 0.4 + altoLinea(6)
  const altoHead = Math.max(altoMarca, altoId) + 2 + 0.25

  // ---------------------------------------------------------------------------
  // Banda: pagador a la izquierda, importe a la derecha
  // ---------------------------------------------------------------------------
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  const anchoEtqTotal = anchoTexto(doc, 'TOTAL PAGADO', TRACKING.etiqueta)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  const anchoMonto = anchoTexto(doc, montoTexto)
  doc.setFontSize(9)
  const anchoMoneda = anchoTexto(doc, moneda)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.2)
  const anchoSub = subImporte ? anchoTexto(doc, subImporte) : 0

  const anchoImporte = anchoMoneda + 1.2 + anchoMonto
  const anchoDerecha = Math.max(anchoEtqTotal, anchoImporte, anchoSub)
  const anchoIzquierda = contenido - 3.4 * 2 - 6 - anchoDerecha

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.6)
  const lineasQuien = partir(doc, cliente?.nombre || 'Cliente', anchoIzquierda)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.1)
  const lineasMetaCliente = partir(doc, metaCliente, anchoIzquierda)

  const altoIzqBanda =
    altoLinea(5.5) +
    1 +
    lineasQuien.length * altoLinea(8.6, 1.2) +
    (lineasMetaCliente.length ? 0.8 + lineasMetaCliente.length * altoLinea(6.1) : 0)
  const altoDerBanda = altoLinea(5.5) + 18 * PT + (subImporte ? 1 + altoLinea(6.2) : 0)
  const altoBanda = Math.max(altoIzqBanda, altoDerBanda) + 2.8 * 2

  // ---------------------------------------------------------------------------
  // Detalle de la operación
  // ---------------------------------------------------------------------------
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.9)
  const anchoEtiqueta = Math.max(
    anchoTexto(doc, 'Total pagado'),
    ...filasBase.map((f) => anchoTexto(doc, f.k)),
  )
  const anchoValor = contenido - anchoEtiqueta - 4

  const filas = filasBase.map((f) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.9)
    const lineasValor = partir(doc, f.v, anchoValor)
    doc.setFont('helvetica', 'normal')
    return {
      ...f,
      lineasValor,
      alto: 1.1 * 2 + Math.max(1, lineasValor.length) * altoLinea(6.9, LH_FILA),
    }
  })

  const altoFilas = filas.reduce((t, f) => t + f.alto, 0)
  // margen 1 + borde 0,4 + padding 1,1 × 2 + línea de 9 pt
  const altoTotal = 1 + 0.4 + 2.2 + altoLinea(9)

  // ---------------------------------------------------------------------------
  // Pie: nota + QR de verificación (solo con código real)
  // ---------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.6)
  const anchoVerificar = anchoTexto(doc, 'VERIFICAR', TRACKING.qr)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5)
  const textoFolioQr = `Folio ${pago.id ?? '—'}`
  const textoCodigoQr = qr && pago.codigo_verificacion ? `Código ${pago.codigo_verificacion}` : ''
  const anchoTxtQr = Math.max(
    anchoVerificar,
    anchoTexto(doc, textoFolioQr),
    anchoTexto(doc, textoCodigoQr),
  )

  const altoQr = 10.5
  const anchoQrBloque = qr ? altoQr + 2.4 + anchoTxtQr : 0
  const anchoNota = Math.min(108, contenido - (qr ? anchoQrBloque + 6 : 0))

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.6)
  const anchoPagoRegistrado = anchoTexto(doc, 'Pago registrado')
  doc.setFont('helvetica', 'normal')
  // Sin punto final: la hora ya termina en "a. m." / "p. m." y quedaría "m..".
  const restoConHora = ` en el sistema el ${fechaCorta(pago.created_at)} a las ${horaPago}`

  // Si la frase con hora no cabe, se omite la hora: ya está en el detalle.
  const restoNota =
    anchoPagoRegistrado + anchoTexto(doc, restoConHora) <= anchoNota
      ? restoConHora
      : ` el ${fechaCorta(pago.created_at)}.`

  doc.setFontSize(5)
  const lineasLegal = partir(
    doc,
    'Documento generado electrónicamente; no requiere firma.',
    anchoNota,
  )

  const altoNota = altoLinea(5.6) + 0.6 + lineasLegal.length * altoLinea(5)
  const altoPie = 2 + 0.2 + Math.max(altoNota, qr ? altoQr : 0)

  // ---------------------------------------------------------------------------
  // Alto final
  // ---------------------------------------------------------------------------
  const altoContenido =
    altoHead +
    (2.8 + altoBanda) +
    (2.2 + altoLinea(5.5) + 1.1) +
    altoFilas +
    altoTotal +
    2.2 +
    altoPie

  const altoPagina = Math.max(
    PAGINA_COMPROBANTE.alto,
    Math.ceil((PAG.margen + altoContenido + PIE_MINIMO) * 10) / 10,
  )

  // ---------------------------------------------------------------------------
  // Dibujo
  // ---------------------------------------------------------------------------
  function dibujar() {
    let y = PAG.margen

    // ----- cabecera -----
    if (logo) {
      doc.addImage(logo.data, 'JPEG', x0, y, 7 * logo.ratio, 7)
      if (lineasMetaEmpresa.length) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(5.7)
        doc.setTextColor(...COLOR.tenue)
        let ym = y + 7 + 1.1
        for (const l of lineasMetaEmpresa) {
          doc.text(l, x0, lineaBase(ym, 5.7))
          ym += altoLinea(5.7)
        }
      }
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...COLOR.tinta)
      let ym = y
      for (const l of lineasNombreEmpresa) {
        doc.text(l, x0, lineaBase(ym, 9.5))
        ym += altoLinea(9.5)
      }
      if (lineasMetaEmpresa.length) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(5.7)
        doc.setTextColor(...COLOR.tenue)
        ym += 1.1
        for (const l of lineasMetaEmpresa) {
          doc.text(l, x0, lineaBase(ym, 5.7))
          ym += altoLinea(5.7)
        }
      }
    }

    // Identificación: título en versalitas grises, folio como valor, fecha.
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(...COLOR.tenue)
    let yd = y
    escribir(doc, tituloDoc, xFin, lineaBase(yd, 6), { align: 'right', cs: TRACKING.titulo })
    yd += altoLinea(6) + 0.7

    doc.setFontSize(9)
    doc.setTextColor(...COLOR.tinta)
    escribir(doc, folioTexto, xFin, lineaBase(yd, 9), { align: 'right' })
    yd += altoLinea(9) + 0.4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...COLOR.gris)
    escribir(doc, fechaDoc, xFin, lineaBase(yd, 6), { align: 'right' })

    y += altoHead - 0.25
    doc.setDrawColor(...COLOR.linea)
    doc.setLineWidth(0.25)
    doc.line(x0, y, xFin, y)
    y += 0.25

    // ----- banda -----
    y += 2.8
    const yBanda = y
    doc.setFillColor(...COLOR.banda)
    doc.rect(x0, yBanda, contenido, altoBanda, 'F')

    const xIzqBanda = x0 + 3.4
    const xDerBanda = xFin - 3.4
    const medioBanda = yBanda + altoBanda / 2

    let yi = medioBanda - altoIzqBanda / 2
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...COLOR.tenue)
    escribir(doc, 'PAGADO POR', xIzqBanda, lineaBase(yi, 5.5), { cs: TRACKING.etiqueta })
    yi += altoLinea(5.5) + 1

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.6)
    doc.setTextColor(...COLOR.tinta)
    for (const l of lineasQuien) {
      doc.text(l, xIzqBanda, lineaBase(yi, 8.6, 1.2))
      yi += altoLinea(8.6, 1.2)
    }

    if (lineasMetaCliente.length) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.1)
      doc.setTextColor(...COLOR.gris)
      yi += 0.8
      for (const l of lineasMetaCliente) {
        doc.text(l, xIzqBanda, lineaBase(yi, 6.1))
        yi += altoLinea(6.1)
      }
    }

    let yder = medioBanda - altoDerBanda / 2
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...COLOR.tenue)
    escribir(doc, 'TOTAL PAGADO', xDerBanda, lineaBase(yder, 5.5), {
      align: 'right',
      cs: TRACKING.etiqueta,
    })
    yder += altoLinea(5.5)

    const baseImporte = lineaBase(yder, 18, 1)
    const xImporte = xDerBanda - anchoImporte
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.azul)
    doc.text(moneda, xImporte, baseImporte)
    doc.setFontSize(18)
    doc.text(montoTexto, xImporte + anchoMoneda + 1.2, baseImporte)
    yder += 18 * PT

    if (subImporte) {
      yder += 1
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.2)
      doc.setTextColor(...COLOR.gris)
      escribir(doc, subImporte, xDerBanda, lineaBase(yder, 6.2), { align: 'right' })
    }

    y = yBanda + altoBanda

    // ----- detalle -----
    y += 2.2
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...COLOR.tenue)
    escribir(doc, 'DETALLE DE OPERACIÓN', x0, lineaBase(y, 5.5), { cs: TRACKING.seccion })
    y += altoLinea(5.5) + 1.1

    for (const f of filas) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.9)
      doc.setTextColor(...COLOR.gris)
      doc.text(f.k, x0, lineaBase(y + 1.1, 6.9, LH_FILA))

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.9)
      doc.setTextColor(...COLOR.tinta)
      let yv = y + 1.1
      for (const l of f.lineasValor) {
        escribir(doc, l, xFin, lineaBase(yv, 6.9, LH_FILA), { align: 'right' })
        yv += altoLinea(6.9, LH_FILA)
      }

      y += f.alto
      doc.setDrawColor(...COLOR.lineaSuave)
      doc.setLineWidth(0.2)
      doc.line(x0, y, xFin, y)
    }

    // Total: cierre en negro (el azul queda reservado al importe de la banda).
    y += 1
    doc.setDrawColor(...COLOR.tinta)
    doc.setLineWidth(0.4)
    doc.line(x0, y, xFin, y)
    y += 0.4 + 1.1

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.6)
    doc.setTextColor(...COLOR.tinta)
    doc.text('Total pagado', x0, lineaBase(y, 9))
    doc.setFontSize(9)
    escribir(doc, totalTexto, xFin, lineaBase(y, 9), { align: 'right' })
    y += altoLinea(9) + 1.1

    // ----- pie -----
    y += 2.2
    doc.setDrawColor(...COLOR.linea)
    doc.setLineWidth(0.2)
    doc.line(x0, y, xFin, y)
    y += 0.2 + 2

    let yn = y
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.6)
    doc.setTextColor(...COLOR.tinta)
    doc.text('Pago registrado', x0, lineaBase(yn, 5.6))
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR.gris)
    doc.text(restoNota, x0 + anchoPagoRegistrado, lineaBase(yn, 5.6))
    yn += altoLinea(5.6) + 0.6

    doc.setFontSize(5)
    for (const l of lineasLegal) {
      doc.text(l, x0, lineaBase(yn, 5))
      yn += altoLinea(5)
    }

    if (qr) {
      const xQr = xFin - anchoQrBloque
      try {
        doc.addImage(qr, 'PNG', xQr, y, altoQr, altoQr)
      } catch {
        // Si la imagen falla, el bloque de texto sigue siendo válido.
      }

      const xTxt = xQr + altoQr + 2.4
      const altoBloqueTxt = altoLinea(5.6) + 0.6 + altoLinea(5) + 0.4 + altoLinea(5)
      let yq = y + Math.max(0, (altoQr - altoBloqueTxt) / 2)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.6)
      doc.setTextColor(...COLOR.tinta)
      doc.text('VERIFICAR', xTxt, lineaBase(yq, 5.6), { charSpace: TRACKING.qr })
      yq += altoLinea(5.6) + 0.6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5)
      doc.setTextColor(...COLOR.gris)
      doc.text(textoFolioQr, xTxt, lineaBase(yq, 5))
      yq += altoLinea(5) + 0.4
      if (textoCodigoQr) doc.text(textoCodigoQr, xTxt, lineaBase(yq, 5))
    }
  }

  return { altoPagina, dibujar }
}

/* ---------- Entrada ----------
   Uso:  await generarComprobantePagoPDF({ pago, cliente, facturas? })
   `facturas` (opcional) = lista de facturas del cliente; sirve para mostrar el
   N.º de factura en vez del id interno en "Facturas aplicadas". */
export async function generarComprobantePagoPDF({ pago, cliente, facturas = [] }) {
  const empresa = datosEmpresa()
  const logo = await cargarLogoClaro()

  const qr = pago?.codigo_verificacion
    ? await qrDataUrl(urlVerificacion('pago', pago.id, pago.codigo_verificacion), { width: 160 })
    : null

  const datos = { pago, cliente, empresa, facturas, logo, qr }

  // 1ª pasada: medir sobre la página nominal (no se guarda).
  const borrador = await nuevoDoc({ pagina: PAGINA_COMPROBANTE, ...ORIENTACION })
  const plan = construir(borrador, datos)

  // 2ª pasada: si el contenido no cabe en 94 mm, la página crece (nunca pagina).
  const doc =
    plan.altoPagina > PAGINA_COMPROBANTE.alto
      ? await nuevoDoc({
          pagina: { ...PAGINA_COMPROBANTE, alto: plan.altoPagina },
          ...ORIENTACION,
        })
      : borrador

  const final = doc === borrador ? plan : construir(doc, datos)
  final.dibujar()

  doc.save(`comprobante-pago-${pago.id}.pdf`)
}

// Los consumidores (EstadoCuenta, PagosEstadoCuenta, PagoClienteModal) importan
// el módulo por defecto.
export default generarComprobantePagoPDF
