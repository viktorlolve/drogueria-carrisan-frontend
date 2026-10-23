import { useState, useEffect, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useEsMobile } from '../hooks/useEsMobile'
import { adsVisibles, arteDe, indiceSeguro, debeRotar } from './adRotativoArtes'
import './AdRotativo.css'

// Banner de ads rotativo, full-width — cicla entre varias creatividades en
// orden aleatorio.
//
// DIRECCIÓN DE ARTE (2026-10-23): cada dispositivo tiene SU caja y SU arte.
//   desktop → caja 4:1     (arte ideal 2048×512)
//   móvil   → caja 16:9    (arte ideal 1280×720)
// La caja la fija el CSS (aspect-ratio), no el archivo: así el banner no
// cambia de alto al rotar. El arte entra con object-fit: cover centrado.
//
// Una ad que no tiene el arte del dispositivo actual NO se muestra en ese
// dispositivo (una panorámica 4:1 en el celular quedaría ilegible y una
// vertical en desktop se recortaría). Una ad sin ningún arte es una
// maqueta: pinta el placeholder en ambos.
//
// Props:
//   ads       — array de items. Cada item:
//                 { id, imagenDesktop, imagenMovil, link, alt } → slide con
//                   arte real por vista (URLs en src/config/adRotativoTemporada.js)
//                 { titulo, subtitulo, variante, link } (sin imágenes) → slide
//                   en modo placeholder, para maquetar antes de tener el arte.
//   intervalo — ms entre cada rotación (default 6000)
//   dots      — mostrar puntitos indicadores debajo del banner (default true)
//
// Solo se descarga el arte que se está viendo. Se precarga el siguiente para
// que el cambio no parpadee.

const MQ_REDUCIDO = '(prefers-reduced-motion: reduce)'

function suscribirMovimientoReducido(alCambiar) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(MQ_REDUCIDO)
  mq.addEventListener('change', alCambiar)
  return () => mq.removeEventListener('change', alCambiar)
}

function leerMovimientoReducido() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(MQ_REDUCIDO).matches
}

function barajar(array) {
  const copia = [...array]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function AdRotativo({ ads = [], intervalo = 6000, dots = true }) {
  const esMovil = useEsMobile(768)
  const reducido = useSyncExternalStore(
    suscribirMovimientoReducido,
    leerMovimientoReducido,
    () => false
  )

  const listaBase = Array.isArray(ads) ? ads : []
  // Firma estable de la config: la prop llega como un array nuevo en cada
  // render del Home, así que el orden solo se rebaraja cuando cambian las ads
  // (no en cada re-render).
  const firma = listaBase.map((ad) => (ad && (ad.id || ad.imagenDesktop || ad.imagenMovil)) || '').join('|')

  const [firmaPrevia, setFirmaPrevia] = useState(firma)
  const [orden, setOrden] = useState(() => barajar(listaBase))
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)

  // Ajuste de estado durante el render (patrón del proyecto): cuando llega la
  // config real de la vitrina o cambia la lista, se rebaraja y se vuelve al
  // primer ad. Sin esto el componente se quedaba con las ads del fallback.
  if (firma !== firmaPrevia) {
    setFirmaPrevia(firma)
    setOrden(barajar(listaBase))
    setIndice(0)
  }

  const lista = adsVisibles(orden, esMovil)
  const actual = indiceSeguro(indice, lista.length)
  const item = lista[actual] || null

  useEffect(() => {
    if (!debeRotar({ cantidad: lista.length, pausado, reducido })) return
    const timer = setInterval(() => {
      setIndice((i) => (i + 1) % lista.length)
    }, intervalo)
    return () => clearInterval(timer)
  }, [lista.length, intervalo, pausado, reducido])

  // Precarga el arte siguiente (una imagen, no el carrusel entero).
  const siguienteArte =
    lista.length > 1 ? arteDe(lista[(actual + 1) % lista.length], esMovil) : null

  useEffect(() => {
    if (!siguienteArte) return
    const img = new Image()
    img.src = siguienteArte
  }, [siguienteArte])

  if (!item) return null

  const arte = arteDe(item, esMovil)
  const mostrarDots = dots && lista.length > 1

  const contenido = arte ? (
    <img
      src={arte}
      alt={item.alt || ''}
      className="ad-rotativo__img"
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div className={`ad-rotativo__placeholder ad-rotativo__placeholder--${item.variante || 'default'}`}>
      <div className="ad-rotativo__textos">
        <h3 className="ad-rotativo__titulo">{item.titulo || 'Próximamente'}</h3>
        {item.subtitulo && <p className="ad-rotativo__subtitulo">{item.subtitulo}</p>}
      </div>
    </div>
  )

  return (
    <div
      className="ad-rotativo"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      role="region"
      aria-roledescription="carrusel"
      aria-label="Anuncios destacados"
    >
      <div className="ad-rotativo__marco">
        {item.link ? (
          <Link to={item.link} className="ad-rotativo__slide">
            {contenido}
          </Link>
        ) : (
          <div className="ad-rotativo__slide">{contenido}</div>
        )}
      </div>

      {mostrarDots && (
        <div className="ad-rotativo__dots">
          {lista.map((ad, i) => (
            <button
              key={ad.id || i}
              type="button"
              className={`ad-rotativo__dot ${i === actual ? 'ad-rotativo__dot--activo' : ''}`}
              aria-label={`Ver anuncio ${i + 1} de ${lista.length}`}
              aria-current={i === actual ? 'true' : undefined}
              onClick={() => setIndice(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AdRotativo
