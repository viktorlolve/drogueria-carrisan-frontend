import { useEffect, useState } from 'react'
import { Truck, Store } from 'lucide-react'
import {
  calcularDespacho,
  calcularRetiro,
  fraseDespacho,
  fraseRetiro,
} from '../utils/horarioDespacho'
import './InfoDespacho.css'

// Tarjeta informativa del resumen del carrito: dice cuándo se despacha el
// pedido (o cuándo se puede retirar) según el día y la hora actuales.
// Se refresca cada minuto por si el cliente deja la pestaña abierta.
export default function InfoDespacho({ tipoEnvio }) {
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const esRetiro = tipoEnvio === 'retiro'
  const retiro = calcularRetiro(ahora)
  const despacho = fraseDespacho(calcularDespacho(ahora))

  return (
    <section className="info-despacho" aria-live="polite">
      <span className="info-despacho__icono" aria-hidden="true">
        {esRetiro ? <Store size={18} /> : <Truck size={18} />}
      </span>
      <div className="info-despacho__cuerpo">
        <p className="info-despacho__titulo">
          {esRetiro ? 'Retiro en depósito' : 'Despacho estimado'}
        </p>
        {esRetiro ? (
          <p className="info-despacho__texto">
            Puedes retirarlo <strong>{fraseRetiro(retiro)}</strong>.
          </p>
        ) : (
          <p className="info-despacho__texto">
            Tu orden {despacho.prefijo} <strong>{despacho.destacado}</strong>.
          </p>
        )}
      </div>
    </section>
  )
}