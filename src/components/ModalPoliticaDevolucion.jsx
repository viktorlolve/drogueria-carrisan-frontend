import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { RotateCcw, X, PackageX, Clock, FileText, Ban, MessageCircle } from 'lucide-react'
import './ModalPoliticaDevolucion.css'

// ⚠️ TEXTO BORRADOR: plazos y condiciones inventados como punto de partida.
// Deben validarse con la empresa (y con las normas sanitarias aplicables a
// medicamentos) antes de publicarse.
const SECCIONES = [
  {
    Icono: PackageX,
    titulo: 'Cuándo aplica',
    items: [
      'Producto dañado o con el empaque comprometido al recibirlo.',
      'Producto distinto laboratorio o presentación.',
      'Producto vencido o con fecha de vencimiento menor a la acordada.',
    ],
  },
  {
    Icono: Clock,
    titulo: 'Plazo para reportarlo',
    items: ['Dentro de las 24 horas siguientes a la entrega o al retiro del pedido.'],
  },
  {
    Icono: FileText,
    titulo: 'Condiciones',
    items: [
      'Empaque original, sin abrir y con lote y fecha visibles.',
      'Número de orden.',
      'Fotos del producto y del empaque que muestren el problema.',
    ],
  },
  {
    Icono: Ban,
    titulo: 'No aplica en',
    items: [
      'Productos refrigerados una vez entregados.',
      'Medicamentos controlados.',
      'Productos abiertos, usados o con el empaque alterado.',
    ],
  },
]

export default function ModalPoliticaDevolucion({ abierto, onCerrar }) {
  useEffect(() => {
    if (!abierto) return undefined

    const alTeclear = (e) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', alTeclear)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = overflowPrevio
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  // createPortal a document.body: evita que lo recorte cualquier contenedor
  // con overflow/transform (sidebar sticky, drawer, tarjetas).
  return createPortal(
    <div className="dev-modal__overlay" onClick={onCerrar}>
      <div
        className="dev-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-modal-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dev-modal__header">
          <span className="dev-modal__header-icono" aria-hidden="true">
            <RotateCcw size={20} />
          </span>
          <div>
            <h2 id="dev-modal-titulo" className="dev-modal__titulo">Política de devolución</h2>
            <p className="dev-modal__subtitulo">Lo que necesitas saber si algo no llega como esperabas</p>
          </div>
          <button type="button" className="dev-modal__cerrar" onClick={onCerrar} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>

        <div className="dev-modal__cuerpo">
          {SECCIONES.map(({ Icono, titulo, items }) => (
            <section key={titulo} className="dev-modal__seccion">
              <h3 className="dev-modal__seccion-titulo">
                <Icono size={16} aria-hidden="true" />
                {titulo}
              </h3>
              <ul>
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}

          <section className="dev-modal__seccion dev-modal__seccion--resolucion">
            <h3 className="dev-modal__seccion-titulo">
              <MessageCircle size={16} aria-hidden="true" />
              Cómo solicitarlo
            </h3>
            <p>
              Escríbenos al whatsapp directamente con tu número de orden y las fotos. Revisamos el caso y
              resolvemos con reposición del producto o nota de crédito en tu cuenta.
            </p>
          </section>
        </div>

        <footer className="dev-modal__footer">
          <Link to="/contacto" className="dev-modal__btn dev-modal__btn--secundario" onClick={onCerrar}>
            Contactar a la empresa
          </Link>
          <button type="button" className="dev-modal__btn dev-modal__btn--primario" onClick={onCerrar}>
            Entendido
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}

// Botón que abre el modal. Reutilizable en cualquier página.
export function BotonPoliticaDevolucion({ className = '', children }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <button
        type="button"
        className={`dev-trigger ${className}`.trim()}
        onClick={() => setAbierto(true)}
      >
        {children}
      </button>
      <ModalPoliticaDevolucion abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  )
}