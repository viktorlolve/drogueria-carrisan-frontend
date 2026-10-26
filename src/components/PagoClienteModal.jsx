import { useEffect, useState } from 'react'
import { X, Download, Loader2, CheckCircle2, Clock, Ban, Receipt, AlertCircle } from 'lucide-react'
import { generarComprobantePagoPDF, etiquetaMetodo } from '../utils/generarComprobantePagoPDF'
import { formatearUSD, formatearVES, formatearTasa } from '../utils/formato'
import './OrdenClienteModal.css' // reutiliza overlay/content/close/header
import './PagoClienteModal.css'

// ---------------------------------------------------------------
// Comprobante de un pago (hoja inferior en móvil, modal en desktop).
//
// El estado NO se inventa: la mayoría de los pagos nace verificado y la tabla
// `pagos` no guarda `estado` (los controllers solo escriben monto, tipo,
// detalle, montos en Bs y tasa). Se usa `estado` cuando existe y se cae a
// "verificado" — el MISMO default del chip del historial
// (`chipDePago` en PagosEstadoCuenta.jsx), así el modal y la lista nunca se
// contradicen.
// ---------------------------------------------------------------

const ESTADOS = {
  verificado: { label: 'Pago verificado', tono: 'ok', Icono: CheckCircle2 },
  registrado: { label: 'Pago registrado', tono: 'neutro', Icono: Clock },
  pendiente: { label: 'Pendiente de verificación', tono: 'espera', Icono: Clock },
  rechazado: { label: 'Pago rechazado', tono: 'malo', Icono: Ban },
}

function estadoDePago(pago) {
  const clave = pago?.estado || 'verificado'
  return (
    ESTADOS[clave] || {
      label: String(clave).charAt(0).toUpperCase() + String(clave).slice(1),
      tono: 'neutro',
      Icono: Clock,
    }
  )
}

function partesDeFecha(iso) {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return { fechaLarga: null, hora: null }
  return {
    fechaLarga: fecha.toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    hora: fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function PagoClienteModal({ pago, cliente, facturas = [], onClose }) {
  const [descargando, setDescargando] = useState(false)
  const [errorPdf, setErrorPdf] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // El overlay tapa la pantalla: sin esto el dedo sigue desplazando la página
  // de atrás en móvil. Se restaura el valor previo (no ''), por si hay otro
  // overlay debajo.
  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [])

  if (!pago) return null

  // El equivalente en Bs solo existe cuando el pago viene de un reporte de
  // cliente (con tasa capturada en el momento). Un abono cargado directo por
  // el staff no tiene monto_bs/tasa_usada — en ese caso no mostramos conversión
  // en vez de fingir un "VES 0,00" con tasa 0.
  const tieneConversionBs = pago.monto_bs != null && pago.tasa_usada != null

  const { fechaLarga, hora } = partesDeFecha(pago.created_at)
  const estado = estadoDePago(pago)
  const IconoEstado = estado.Icono

  // `pago_facturas` solo trae `factura_id`; el número se resuelve contra las
  // facturas del cliente que ya recibe el modal (mismo criterio que el PDF).
  const porId = new Map((facturas || []).map((f) => [f.id, f]))
  const facturasAplicadas = []
  const vistas = new Set()
  for (const vinculo of pago.pago_facturas || []) {
    const id = vinculo.factura_id
    if (id == null || vistas.has(id)) continue
    vistas.add(id)
    const factura = porId.get(id)
    facturasAplicadas.push({
      id,
      texto: factura?.numero_factura ? `N.º ${factura.numero_factura}` : `Factura #${id}`,
    })
  }

  async function descargar() {
    setDescargando(true)
    setErrorPdf('')
    try {
      await generarComprobantePagoPDF({ pago, cliente, facturas })
    } catch (err) {
      console.error(err)
      setErrorPdf('No se pudo generar el comprobante. Inténtalo de nuevo.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="ocm-overlay" onClick={onClose}>
      <div
        className="ocm-content pcm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Pago ${pago.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="ocm-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        <div className="ocm-header">
          <h2 className="ocm-numero">Pago #{pago.id}</h2>
          {fechaLarga && <p className="ocm-fecha">{fechaLarga}</p>}
        </div>

        <div className="pcm-hero">
          <span className="pcm-hero__label">Total pagado</span>
          <span className="pcm-hero__valor">{formatearUSD(pago.monto)}</span>
          {tieneConversionBs && (
            <span className="pcm-hero__bs">{formatearVES(pago.monto_bs)}</span>
          )}
          {tieneConversionBs && (
            <span className="pcm-hero__tasa">
              Tasa aplicada: {formatearTasa(pago.tasa_usada)} Bs. / USD
            </span>
          )}
        </div>

        <div className="pcm-perforacion" aria-hidden="true" />

        <dl className="pcm-datos">
          <dt>Estado</dt>
          <dd>
            <span className={`pcm-estado pcm-estado--${estado.tono}`}>
              <IconoEstado size={13} />
              {estado.label}
            </span>
          </dd>

          <dt>Método</dt>
          <dd>{etiquetaMetodo(pago.tipo)}</dd>

          {hora && (
            <>
              <dt>Hora</dt>
              <dd>{hora}</dd>
            </>
          )}
        </dl>

        {facturasAplicadas.length > 0 && (
          <section className="pcm-seccion">
            <h3 className="pcm-seccion__titulo">
              {facturasAplicadas.length === 1 ? 'Factura aplicada' : 'Facturas aplicadas'}
            </h3>
            <div className="pcm-chips">
              {facturasAplicadas.map((f) => (
                <span key={f.id} className="pcm-chip">
                  <Receipt size={12} />
                  {f.texto}
                </span>
              ))}
            </div>
          </section>
        )}

        {pago.detalle && (
          <div className="pcm-detalle">
            <span className="pcm-detalle__etiqueta">Detalle</span>
            <p className="pcm-detalle__texto">{pago.detalle}</p>
          </div>
        )}

        {pago.codigo_verificacion && (
          <div className="pcm-verificacion">
            <span>Código de verificación</span>
            <code>{pago.codigo_verificacion}</code>
          </div>
        )}

        {errorPdf && (
          <p className="pcm-error" role="alert">
            <AlertCircle size={14} />
            {errorPdf}
          </p>
        )}

        <button
          type="button"
          className="pcm-btn-descarga"
          onClick={descargar}
          disabled={descargando}
        >
          {descargando ? <Loader2 size={16} className="pcm-giro" /> : <Download size={16} />}
          {descargando ? 'Generando PDF…' : 'Descargar comprobante (PDF)'}
        </button>
      </div>
    </div>
  )
}
