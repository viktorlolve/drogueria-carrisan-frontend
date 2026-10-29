import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import './NoticiasTeaser.css'

const CANTIDAD_TEASER = 8

function formatearFecha(fechaISO) {
  if (!fechaISO) return ''
  const fecha = new Date(fechaISO)
  if (Number.isNaN(fecha.getTime())) return ''
  return fecha.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
}

function NoticiasTeaser() {
  const [noticias, setNoticias] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api
      .get('/noticias')
      .then((res) => setNoticias(Array.isArray(res.data) ? res.data.slice(0, CANTIDAD_TEASER) : []))
      .catch((err) => console.error('Error al cargar noticias:', err))
      .finally(() => setCargando(false))
  }, [])

  if (!cargando && noticias.length === 0) return null

  const [destacada, ...resto] = noticias

  return (
    <section className="noticias-teaser">
      <div className="noticias-teaser__header">
        <div className="noticias-teaser__eyebrow">
          <span className="noticias-teaser__eyebrow-dot" aria-hidden="true" />
          Noticias del sector
        </div>
        <Link to="/noticias" className="noticias-teaser__ver-todas">Ver todas</Link>
      </div>

      <h2 className="noticias-teaser__titulo">CRS News</h2>

      {cargando ? (
        <div className="noticias-teaser__cuerpo">
          <div className="noticias-teaser__destacada noticias-teaser__destacada--skeleton" />
          <div className="noticias-teaser__lista">
            {Array.from({ length: CANTIDAD_TEASER - 1 }).map((_, i) => (
              <div key={i} className="noticias-teaser__item noticias-teaser__item--skeleton" />
            ))}
          </div>
        </div>
      ) : (
        <div className="noticias-teaser__cuerpo">
          
            <a
            href={destacada.link}
            target="_blank"
            rel="noopener noreferrer"
            className="noticias-teaser__destacada"
          >
            <div className="noticias-teaser__destacada-img-wrap">
              {destacada.imagen ? (
                <img
                  src={destacada.imagen}
                  alt={destacada.titulo}
                  className="noticias-teaser__destacada-img"
                  loading="lazy"
                />
              ) : (
                <div className="noticias-teaser__destacada-img noticias-teaser__img--placeholder" aria-hidden="true">📰</div>
              )}
              <span className="noticias-teaser__fuente-badge">
                {destacada.fuente || 'Fuente externa'}
              </span>
            </div>
            <div className="noticias-teaser__destacada-texto">
              <span className="noticias-teaser__fecha">{formatearFecha(destacada.fecha)}</span>
              <h3 className="noticias-teaser__destacada-titulo">{destacada.titulo}</h3>
              {destacada.resumen && (
                <p className="noticias-teaser__destacada-resumen">{destacada.resumen}</p>
              )}
            </div>
          </a>

          <div className="noticias-teaser__lista">
            {resto.map((noticia) => (
              
                <a
                key={noticia.link}
                href={noticia.link}
                target="_blank"
                rel="noopener noreferrer"
                className="noticias-teaser__item"
              >
                {noticia.imagen ? (
                  <img
                    src={noticia.imagen}
                    alt={noticia.titulo}
                    className="noticias-teaser__item-img"
                    loading="lazy"
                  />
                ) : (
                  <div className="noticias-teaser__item-img noticias-teaser__img--placeholder" aria-hidden="true">📰</div>
                )}
                <div className="noticias-teaser__item-texto">
                  <span className="noticias-teaser__item-fuente">
                    {noticia.fuente || 'Fuente externa'} · {formatearFecha(noticia.fecha)}
                  </span>
                  <h4 className="noticias-teaser__item-titulo">{noticia.titulo}</h4>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default NoticiasTeaser