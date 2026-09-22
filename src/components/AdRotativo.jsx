import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './AdRotativo.css'

// Banner de ads rotativo, full-width — cicla entre varias creatividades en
// orden aleatorio. Un mismo ad se muestra con dos artes distintos según el
// dispositivo (formato banner panorámico en desktop, más cuadrado en móvil);
// el CSS muestra uno u otro visualizador según el breakpoint.
//
// Props:
//   ads       — array de items (requerido, al menos 1). Cada item:
//                 { id, imagenDesktop, imagenMovil, link, alt } → slide con
//                   imagen real por vista (la url de cada formato se edita en
//                   src/config/adRotativoTemporada.js)
//                 { titulo, subtitulo, variante, link } (sin imágenes) → slide
//                   en modo placeholder, para maquetar antes de tener el arte.
//   intervalo — ms entre cada rotación (default 6000)
//   dots      — mostrar puntitos indicadores debajo del banner (default true)
//
// Sin transición: la imagen se ve directa y solo se reemplaza en cada
// rotación. object-fit: cover en ambas vistas para que el arte siempre llene
// el contenedor sin dejar ver el fondo.

function barajar(array) {
  const copia = [...array]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function AdRotativo({ ads = [], intervalo = 6000, dots = true }) {
  const [orden] = useState(() => barajar(ads))
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (orden.length <= 1 || pausado) return
    timerRef.current = setInterval(() => {
      setIndice((i) => (i + 1) % orden.length)
    }, intervalo)
    return () => clearInterval(timerRef.current)
  }, [orden.length, intervalo, pausado])

  if (orden.length === 0) return null

  const mostrarDots = dots && orden.length > 1
  const item = orden[indice]

  const renderSlide = (imagen) => {
    const contenido = imagen ? (
      <img
        src={imagen}
        alt={item.alt || ''}
        className="ad-rotativo__img"
        loading="lazy"
      />
    ) : (
      <div className={`ad-rotativo__placeholder ad-rotativo__placeholder--${item.variante || 'default'}`}>
        <div className="ad-rotativo__textos">
          <h3 className="ad-rotativo__titulo">{item.titulo || 'Próximamente'}</h3>
          {item.subtitulo && <p className="ad-rotativo__subtitulo">{item.subtitulo}</p>}
        </div>
      </div>
    )

    return item.link ? (
      <Link to={item.link} className="ad-rotativo__slide" tabIndex={0}>
        {contenido}
      </Link>
    ) : (
      <div className="ad-rotativo__slide">{contenido}</div>
    )
  }

  return (
    <div
      className={`ad-rotativo ${mostrarDots ? 'ad-rotativo--dots' : ''}`}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="ad-rotativo__vista ad-rotativo__vista--movil">
        {renderSlide(item.imagenMovil)}
      </div>
      <div className="ad-rotativo__vista ad-rotativo__vista--desktop">
        {renderSlide(item.imagenDesktop)}
      </div>

      {mostrarDots && (
        <div className="ad-rotativo__dots">
          {orden.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`ad-rotativo__dot ${i === indice ? 'ad-rotativo__dot--activo' : ''}`}
              aria-label={`Ver ad ${i + 1}`}
              onClick={() => setIndice(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AdRotativo