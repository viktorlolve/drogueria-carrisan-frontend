import { useEffect, useState } from 'react'
import { X, Download, Loader2, Package } from 'lucide-react'
import generarFacturaPDF from '../utils/generarFacturaPDF'
import { formatearUSD } from '../utils/formato'
import './OrdenClienteModal.css' // reutiliza overlay/content/close/header/divider
import './FacturaClienteModal.css'

// ---------------------------------------------------------------
// Detalle de una factura (hoja inferior en móvil, modal en desktop).
//
// Antes, tocar una factura en Estado de cuenta abría OrdenClienteModal, que
// lee orden.id / tipo_envio / estado: con una factura mostraba "Orden #<id de
// la factura>" y datos que no corresponden. Este modal lee los campos reales
// de la factura (los mismos que usa generarFacturaPDF).
// ---------------------------------------------------------------

function leerItem(item) {
  const nombre = item.productos?.nombre_comercial || item.nombre || item.descripcion || 'Producto'
  const cantidad = Number(item.cantidad ?? item.qty ?? 1)
  const subtotal = Number(item.subtotal ?? item.total ?? item.monto ?? 0)
  const precioUnit = Number(item.precio_unitario_usd ?? item.precio_unitario ?? (cantidad ? subtotal / cantidad : 0))
  return { nombre, cantidad, subtotal: subtotal || precioUnit * cantidad }
}

export default function FacturaClienteModal({ factura, cliente, onClose }) {
  const [descargando, setDescargando] = useState(false)
  const [errorPdf, setErrorPdf] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!factura) return null

  const ordenes = (factura.factura_ordenes || []).map((fo) => fo.orden_id).filter(Boolean)
  const items = (factura.factura_ordenes || []).flatMap((fo) =>
    (fo.ordenes?.ordenes_items || []).map(leerItem)
  )

  async function descargar() {
    setDescargando(true)
    setErrorPdf('')
    try {
      await generarFacturaPDF({ factura, cliente })
    } catch (err) {
      console.error(err)
      setErrorPdf('No se pudo generar el PDF. Inténtalo de nuevo.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="ocm-overlay" onClick={onClose}>
      <div
        className="ocm-content"
        role="dialog"
        aria-modal="true"
        aria-label={`Factura ${factura.numero_factura}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="ocm-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        <div className="ocm-header">
          <h2 className="ocm-numero">Factura N.º {factura.numero_factura}</h2>
          <p className="ocm-fecha">
            Emitida el{' '}
            {new Date(factura.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="fcm-monto">
          <span className="fcm-monto__label">Total facturado</span>
          <span className="fcm-monto__valor">{formatearUSD(factura.monto_facturado)}</span>
        </div>

        {ordenes.length > 0 && (
          <div className="fcm-bloque">
            <h3 className="fcm-titulo">{ordenes.length === 1 ? 'Orden asociada' : 'Órdenes asociadas'}</h3>
            <div className="fcm-chips">
              {ordenes.map((id) => (
                <span key={id} className="fcm-chip">#{id}</span>
              ))}
            </div>
          </div>
        )}

        <div className="fcm-bloque">
          <h3 className="fcm-titulo">Productos facturados</h3>
          {items.length === 0 ? (
            <p className="fcm-vacio">
              <Package size={16} />
              Esta factura no tiene el detalle de productos disponible (orden telefónica o sin líneas registradas).
            </p>
          ) : (
            <ul className="fcm-items">
              {items.map((it, i) => (
                <li key={`${it.nombre}-${i}`}>
                  <span className="fcm-items__nombre">
                    {it.nombre}
                    <small>× {it.cantidad}</small>
                  </span>
                  <span className="fcm-items__monto">{formatearUSD(it.subtotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {factura.nota && (
          <div className="fcm-bloque">
            <h3 className="fcm-titulo">Nota</h3>
            <p className="fcm-nota">{factura.nota}</p>
          </div>
        )}

        {factura.codigo_verificacion && (
          <div className="fcm-verificacion">
            <span>Código de verificación</span>
            <code>{factura.codigo_verificacion}</code>
          </div>
        )}

        {errorPdf && <p className="fcm-error" role="alert">{errorPdf}</p>}

        <button type="button" className="fcm-btn" onClick={descargar} disabled={descargando}>
          {descargando ? <Loader2 size={16} className="fcm-giro" /> : <Download size={16} />}
          {descargando ? 'Generando PDF…' : 'Descargar factura (PDF)'}
        </button>
      </div>
    </div>
  )
}