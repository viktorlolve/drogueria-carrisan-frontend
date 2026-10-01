import { X, CheckCircle2, Download } from 'lucide-react'
import generarComprobantePagoPDF from '../utils/generarComprobantePagoPDF'
import './OrdenClienteModal.css' // reutiliza overlay/content/close/divider

function formatUSD(valor) {
  return Number(valor || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatBs(valor) {
  return Number(valor || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PagoClienteModal({ pago, cliente, facturas, onClose }) {
  if (!pago) return null

  // El equivalente en Bs solo existe cuando el pago viene de un reporte de
  // cliente (con tasa capturada en el momento). Un abono cargado directo
  // por el admin no tiene monto_bs/tasa_usada — en ese caso no mostramos
  // conversión en vez de fingir un "Bs. 0,00" con tasa 0.
  const tieneConversionBs = pago.monto_bs != null && pago.tasa_usada != null

  return (
    <div className="ocm-overlay" onClick={onClose}>
      <div className="ocm-content" onClick={(e) => e.stopPropagation()}>
        <button className="ocm-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        <div className="ocm-header">
          <h2 className="ocm-numero">Pago #{pago.id}</h2>
          <p className="ocm-fecha">
            {new Date(pago.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="pcm-monto-hero">
          <span className="pcm-monto-hero__valor">${formatUSD(pago.monto)}</span>
          {tieneConversionBs && (
            <span className="pcm-monto-hero__bs">Bs. {formatBs(pago.monto_bs)}</span>
          )}
        </div>
        {tieneConversionBs && (
          <p className="pcm-tasa">
            Tasa aplicada: <strong>Bs. {formatBs(pago.tasa_usada)}</strong> / $
          </p>
        )}

        {pago.detalle && (
          <>
            <div className="ocm-divider" />
            <div className="ocm-section">
              <h3 className="ocm-section-title">Detalle</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0 }}>{pago.detalle}</p>
            </div>
          </>
        )}

        <p className="ocm-estado-pago-nota">
          <CheckCircle2 size={16} />
          Pago verificado
        </p>

        <button
          type="button"
          className="pcm-btn-descarga"
          onClick={() => generarComprobantePagoPDF({ pago, cliente, facturas })}
        >
          <Download size={16} />
          Descargar comprobante
        </button>
      </div>
    </div>
  )
}