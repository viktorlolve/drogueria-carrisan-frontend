import { Fragment, useEffect, useState } from 'react'
import { partesRestantes } from '../utils/tiempoOferta'
import './CuentaRegresiva.css'

const dos = (n) => String(n).padStart(2, '0')

// Cuenta regresiva hacia `fin` (timestamp en ms). Tiene su propio timer de 1 s
// para no re-renderizar la página completa cada segundo.
// Si `fin` cambia, el padre debe remontarlo con key={fin}.
// `onFin` se llama una vez cuando llega a cero.
function CuentaRegresiva({ fin, onFin, className = '' }) {
  const [ms, setMs] = useState(() => Math.max(0, fin - Date.now()))

  useEffect(() => {
    const id = setInterval(() => {
      const restante = fin - Date.now()
      if (restante <= 0) {
        clearInterval(id)
        setMs(0)
        onFin?.()
      } else {
        setMs(restante)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [fin, onFin])

  const { dias, horas, minutos, segundos } = partesRestantes(ms)
  const unidades = [
    ...(dias > 0 ? [{ v: dias, l: dias === 1 ? 'día' : 'días' }] : []),
    { v: horas, l: 'horas' },
    { v: minutos, l: 'min' },
    { v: segundos, l: 'seg' },
  ]
  // El texto accesible no incluye segundos: así solo cambia una vez por minuto.
  const aria = `Quedan ${dias} ${dias === 1 ? 'día' : 'días'}, ${horas} horas y ${minutos} minutos`

  return (
    <div className={`cr ${className}`} role="timer" aria-label={aria}>
      {unidades.map((u, i) => (
        <Fragment key={u.l}>
          {i > 0 && <span className="cr__sep" aria-hidden="true">:</span>}
          <div className="cr__unidad" aria-hidden="true">
            <span className="cr__valor">{dos(u.v)}</span>
            <span className="cr__etiqueta">{u.l}</span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

export default CuentaRegresiva
