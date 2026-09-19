import { useRef } from 'react'
import { Link } from 'react-router-dom'
import PromoCardGrande from './PromoCardGrande'
import './SeccionPromocional.css'

// Sección promocional tipo Walmart: split en dos mitades.
//   => Panel promocional (imagen + texto superpuesto + badge + CTA)
//   => Carrusel de productos mostrando 3 a la vez, con flechas.
//
// Props:
//   imagen     — URL de la imagen promocional
//   alt        — Texto alternativo de la imagen
//   titulo     — Título grande superpuesto
//   subtitulo  — Subtítulo (opcional)
//   badgeTexto — Texto del badge de descuento (opcional)
//   textoCta   — Texto del botón CTA (opcional)
//   linkCta    — Ruta del botón CTA
//   linkImagen — Link de toda la imagen promocional (opcional)
//   productos  — Array de productos del carrusel
//   tasaVes    — Tasa de cambio USD -> Bs
//   verTodoTo  — Link del "Ver todo" del carrusel
//   tituloCarrusel — Título del carrusel (default: ver todo)
//   invertido  — true: imagen a la derecha / carrusel a la izquierda
//   soloImagen — true: la sección se convierte en un banner de imagen puro
//                 (full-width, sin overlay, sin texto y sin carrusel). El
//                 texto ya viene horneado en la imagen. Usa `linkCta` para
//                 hacer toda la imagen clicable.

const ITEMS_POR_PAGINA = 3

function PanelPromocional({
  imagen,
  alt = '',
  titulo,
  subtitulo,
  badgeTexto,
  textoCta,
  linkCta,
  linkImagen,
}) {
  const contenido = (
    <>
      <img src={imagen} alt={alt} className="seccion-promo__img" loading="lazy" />
      <div className="seccion-promo__overlay" aria-hidden="true" />
      {badgeTexto && (
        <span className="seccion-promo__badge">{badgeTexto}</span>
      )}
      <div className="seccion-promo__texto">
        {titulo && <h3 className="seccion-promo__titulo">{titulo}</h3>}
        {subtitulo && <p className="seccion-promo__subtitulo">{subtitulo}</p>}
        {textoCta && linkCta && (
          <span className="seccion-promo__cta">{textoCta}</span>
        )}
      </div>
    </>
  )

  return (
    <div className="seccion-promo__panel">
      {linkImagen ? (
        <Link to={linkImagen} className="seccion-promo__panel-link">
          {contenido}
        </Link>
      ) : (
        <div className="seccion-promo__panel-link">{contenido}</div>
      )}
    </div>
  )
}

function SeccionPromocional({
  imagen,
  alt,
  titulo,
  subtitulo,
  badgeTexto,
  textoCta,
  linkCta,
  linkImagen,
  productos,
  tasaVes,
  verTodoTo = '/catalogo',
  tituloCarrusel = 'Recomendados',
  invertido = false,
  cargando = false,
  soloImagen = false,
}) {
  const filaRef = useRef(null)

  function scroll(direccion) {
    const fila = filaRef.current
    if (!fila || fila.children.length === 0) return
    const card = fila.children[0]
    const cardWidth = card?.offsetWidth || 320
    const gap = 12
    const avance = cardWidth * ITEMS_POR_PAGINA + gap * ITEMS_POR_PAGINA
    fila.scrollBy({ left: direccion * avance, behavior: 'smooth' })
  }

  if (soloImagen) {
    if (!imagen) return null

    const banner = (
      <img src={imagen} alt={alt} className="seccion-promo__banner" loading="lazy" />
    )

    return (
      <section className="seccion-promo seccion-promo--solo-imagen">
        {linkCta ? (
          <Link to={linkCta} className="seccion-promo__banner-link" aria-label={alt || 'Promoción'}>
            {banner}
          </Link>
        ) : (
          banner
        )}
      </section>
    )
  }

  if (!cargando && (!productos || productos.length === 0)) return null

  return (
    <section className={`seccion-promo ${invertido ? 'seccion-promo--invertido' : ''}`}>
      <PanelPromocional
        imagen={imagen}
        alt={alt}
        titulo={titulo}
        subtitulo={subtitulo}
        badgeTexto={badgeTexto}
        textoCta={textoCta}
        linkCta={linkCta}
        linkImagen={linkImagen}
      />

      <div className="seccion-promo__carrusel-wrap">
        <div className="seccion-promo__header">
          <h2 className="seccion-promo__titulo-carrusel">{tituloCarrusel}</h2>
          <div className="seccion-promo__acciones">
            <Link to={verTodoTo} className="seccion-promo__ver-todo">Ver todo</Link>
            <div className="seccion-promo__flechas">
              <button onClick={() => scroll(-1)} aria-label="Anterior">‹</button>
              <button onClick={() => scroll(1)} aria-label="Siguiente">›</button>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="seccion-promo__fila seccion-promo__fila--skeleton" ref={filaRef}>
            {[0, 1, 2].map((i) => (
              <div className="seccion-promo__skeleton" key={i} />
            ))}
          </div>
        ) : (
          <div className="seccion-promo__fila" ref={filaRef}>
            {productos.map((producto) => (
              <PromoCardGrande key={producto.id} producto={producto} tasaVes={tasaVes} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default SeccionPromocional
