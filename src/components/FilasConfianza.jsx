import { PackageX, ShieldCheck, MessageCircle, ChevronRight, RotateCcw } from 'lucide-react'
import { BotonPoliticaDevolucion } from './ModalPoliticaDevolucion'
import './FilasConfianza.css'

// Tarjeta de garantías compartida por el carrito y el detalle de producto.
// Se viste con el className que le pase el contenedor (por ejemplo el
// `pd-purchase__trust`, que la oculta en móvil).
export default function FilasConfianza({ className = '' }) {
  return (
    <div className={`fconf ${className}`.trim()}>
      <div className="fconf__fila">
        <span className="fconf__icono"><ShieldCheck size={18} /></span>
        <div className="fconf__texto">
          <strong>Pago seguro</strong>
          <span>Datos protegidos · Verificado por la empresa</span>
        </div>
      </div>

      <div className="fconf__fila">
        <span className="fconf__icono"><PackageX size={18} /></span>
        <div className="fconf__texto">
          <strong>Entrega revisada</strong>
          <span>Revisamos tu pedido antes de despacharlo</span>
        </div>
      </div>

      <div className="fconf__fila">
        <span className="fconf__icono"><MessageCircle size={18} /></span>
        <div className="fconf__texto">
          <strong>Soporte directo</strong>
          <span>¿Necesitas ayuda? Escríbenos por el Centro de Ayuda</span>
        </div>
      </div>

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