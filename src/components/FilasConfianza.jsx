import { BadgePercent, PackageCheck, ChevronRight, RotateCcw, Tag, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getCopyEtiqueta } from '../config/copyEtiqueta'
import { BotonPoliticaDevolucion } from './ModalPoliticaDevolucion'
import './FilasConfianza.css'

// Tarjeta de garantías compartida por el carrito y el detalle de producto.
// Se viste con el className que le pase el contenedor (por ejemplo el
// `pd-purchase__trust`, que la oculta en móvil).
// `sinPrecio`: en productos sin precio las filas 1-2 cambian a copy de
// consulta (no hay descuento que prometer); la devolución se mantiene.
export default function FilasConfianza({ className = '', sinPrecio = false }) {
  const { user } = useAuth()
  const copyPrecio = getCopyEtiqueta(user)

  return (
    <div className={`fconf ${className}`.trim()}>
      {sinPrecio ? (
        <>
          <div className="fconf__fila">
            <span className="fconf__icono"><Tag size={18} /></span>
            <div className="fconf__texto">
              <strong>Consultar precio</strong>
              <span>Solicita el precio y te respondemos con la disponibilidad</span>
            </div>
          </div>

          <div className="fconf__fila">
            <span className="fconf__icono"><Clock size={18} /></span>
            <div className="fconf__texto">
              <strong>Respuesta de asesor</strong>
              <span>Un asesor te contacta para darte el precio</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* El primer cuadro depende de la etiqueta de precio del cliente
              (`users.etiqueta`): ver `config/copyEtiqueta.js`. */}
          <div className="fconf__fila">
            <span className="fconf__icono"><BadgePercent size={18} /></span>
            <div className="fconf__texto">
              <strong>{copyPrecio.titulo}</strong>
              <span>{copyPrecio.detalle}</span>
            </div>
          </div>

          <div className="fconf__fila">
            <span className="fconf__icono"><PackageCheck size={18} /></span>
            <div className="fconf__texto">
              <strong>Entrega revisada</strong>
              <span>Revisamos tu pedido antes de despacharlo</span>
            </div>
          </div>
        </>
      )}

      <BotonPoliticaDevolucion className="fconf__fila fconf__fila--accion">
        <span className="fconf__icono"><RotateCcw size={18} /></span>
        <div className="fconf__texto">
          <strong>Política de devolución</strong>
          <span>Consulta el plazo y las condiciones</span>
        </div>
        <ChevronRight size={16} className="fconf__chevron" />
      </BotonPoliticaDevolucion>
    </div>
  )
}
