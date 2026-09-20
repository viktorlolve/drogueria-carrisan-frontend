import { Link } from 'react-router-dom'
import './AdCard.css'

function AdCard({
  imagen,
  overlay = false,
  link,
  alt = '',
  titulo = 'Promoción especial',
  subtitulo = 'Aprovecha esta oferta exclusiva',
  cta = 'Ver más',
  variante = 'default',
}) {
  let contenido

  if (imagen && overlay) {
    contenido = (
      <div className="ad-card__con-overlay">
        <img src={imagen} alt={alt} className="ad-card__img ad-card__img--overlay" loading="lazy" />
        <div className="ad-card__overlay-gradiente" aria-hidden="true" />
        <div className="ad-card__overlay-contenido">
          <h3 className="ad-card__overlay-titulo">{titulo}</h3>
          <p className="ad-card__overlay-subtitulo">{subtitulo}</p>
          {link && cta && <span className="ad-card__overlay-cta">{cta}</span>}
        </div>
      </div>
    )
  } else if (imagen) {
    contenido = (
      <picture>
        <img src={imagen} alt={alt} className="ad-card__img ad-card__img--puro" loading="lazy" />
      </picture>
    )
  } else {
    contenido = (
      <div className={`ad-card__placeholder ad-card__placeholder--${variante}`}>
        <div className="ad-card__placeholder-top">
          <span className="ad-card__icono" aria-hidden="true">✨</span>
          <div className="ad-card__textos">
            <h3 className="ad-card__titulo">{titulo}</h3>
            <p className="ad-card__subtitulo">{subtitulo}</p>
          </div>
        </div>
        {link && <span className="ad-card__cta-placeholder">{cta}</span>}
      </div>
    )
  }

  return (
    <div className="ad-card">
      {link ? <Link to={link} className="ad-card__link">{contenido}</Link> : contenido}
    </div>
  )
}

export default AdCard
