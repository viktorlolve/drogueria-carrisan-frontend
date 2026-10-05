import { BadgePercent, PackageCheck, ChevronRight, RotateCcw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getCopyEtiqueta } from '../config/copyEtiqueta'
import { BotonPoliticaDevolucion } from './ModalPoliticaDevolucion'
import './FilasConfianza.css'

// Tarjeta de garantías compartida por el carrito y el detalle de producto.
// Se viste con el className que le pase el contenedor (por ejemplo el
// `pd-purchase__trust`, que la oculta en móvil).
export default function FilasConfianza({ className = '' }) {
  const { user } = useAuth()
  const copyPrecio = getCopyEtiqueta(user)

  return (
    <div className={`fconf ${className}`.trim()}>
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