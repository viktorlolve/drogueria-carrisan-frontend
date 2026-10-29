import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import './HeroCarrusel.css'

// ---------------------------------------------------------------
// Carrusel hero reusable — pensado para importarse en cualquier
// página (Ofertas, Home, etc). Las imágenes las carga quien use el
// componente, no viven acá.
//
// Uso:
//   <HeroCarrusel
//     slides={[
//       { id: 1, imagen: '/hero/promo1.jpg', imagenMovil: '/hero/promo1-m.jpg', link: '/ofertas', alt: 'Promo 1' },
//       { id: 2, imagen: '/hero/promo2.jpg', link: '/producto/45', alt: 'Promo 2' },
//     ]}
//     intervaloMs={5000}
//   />
//
// - imagenMovil es opcional (si no la das, usa 'imagen' en todos los tamaños)
// - link es opcional (si no hay, el slide no es clickeable)
// - Pausa el autoavance al hover (desktop) o al tocar (mobile, mientras
//   dura el swipe) — se reanuda solo.
// ---------------------------------------------------------------

function HeroCarrusel({ slides = [], intervaloMs = 5000, altura }) {
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)
  const timerRef = useRef(null)
  const touchStartX = useRef(null)

  const total = slides.length

  const irA = useCallback((i) => {
    setIndice((i + total) % total)
  }, [total])

  const siguiente = useCallback(() => irA(indice + 1), [indice, irA])
  const anterior = useCallback(() => irA(indice - 1), [indice, irA])

  useEffect(() => {
    if (pausado || total <= 1) return
    timerRef.current = setTimeout(siguiente, intervaloMs)
    return () => clearTimeout(timerRef.current)
  }, [indice, pausado, total, intervaloMs, siguiente])

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    setPausado(true)
  }

  function handleTouchEnd(e) {
    if (touchStartX.current == null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (deltaX > 50) anterior()
    else if (deltaX < -50) siguiente()
    touchStartX.current = null
    setPausado(false)
  }

  if (total === 0) {
    return (
      <div className="hero-carrusel hero-carrusel--vacio" style={altura ? { height: altura } : undefined}>
        <span>Espacio para banner hero</span>
      </div>
    )
  }

  return (
    <div
      className="hero-carrusel"
      style={altura ? { height: altura } : undefined}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="hero-carrusel__pista"
        style={{ transform: `translateX(-${indice * 100}%)` }}
      >
        {slides.map((slide) => {
          const contenido = (
            <picture>
              {slide.imagenMovil && (
                <source media="(max-width: 640px)" srcSet={slide.imagenMovil} />
              )}
              {/* El hero está siempre en la primera pantalla: todos sus slides
                  se descargan juntos. Con loading="lazy" los slides fuera del
                  viewport (la pista los esconde con translateX) se pedían recién
                  al rotar el carrusel y el banner aparecía en blanco un instante. */}
              <img src={slide.imagen} alt={slide.alt || ''} loading="eager" />
            </picture>
          )
          const tieneOverlay = slide.titulo || slide.botonTexto
          return (
            <div className="hero-carrusel__slide" key={slide.id}>
              {slide.link ? <Link to={slide.link}>{contenido}</Link> : contenido}
              {tieneOverlay && (
                <div className="hero-carrusel__overlay">
                  <div className="hero-carrusel__overlay-contenido">
                    {slide.subtitulo && (
                      <p className="hero-carrusel__subtitulo">{slide.subtitulo}</p>
                    )}
                    {slide.titulo && (
                      <h2 className="hero-carrusel__titulo">{slide.titulo}</h2>
                    )}
                    {slide.botonTexto && (
                      <Link
                        to={slide.botonLink || slide.link || '#'}
                        className="hero-carrusel__boton"
                      >
                        {slide.botonTexto}
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {total > 1 && (
        <div className="hero-carrusel__controles">
          <button type="button" className="hero-carrusel__flecha hero-carrusel__flecha--izq" onClick={anterior} aria-label="Anterior">
            ‹
          </button>
          <button
            type="button"
            className="hero-carrusel__pausa"
            onClick={() => setPausado((p) => !p)}
            aria-label={pausado ? 'Reanudar carrusel' : 'Pausar carrusel'}
          >
            {pausado ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button type="button" className="hero-carrusel__flecha hero-carrusel__flecha--der" onClick={siguiente} aria-label="Siguiente">
            ›
          </button>
          <div className="hero-carrusel__dots">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                className={`hero-carrusel__dot ${i === indice ? 'hero-carrusel__dot--activo' : ''}`}
                onClick={() => irA(i)}
                aria-label={`Ir al slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default HeroCarrusel
