import { useState, useEffect, useRef } from 'react'
import { X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Play, Volume2, VolumeX, Loader2, MessageCircle, Link2, Pause } from 'lucide-react'
import api from '../api/axios'
import './CarruselCortos.css'

const BANNER_TITULO = 'Tu dosis diaria de contenido'
const BANNER_SUBTITULO = 'Consejos, novedades y curiosidades del sector farmacéutico'

let promesaApiYT = null

function cargaApiYT() {
  if (!promesaApiYT) {
    promesaApiYT = new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        resolve()
        return
      }
      const previo = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previo === 'function') previo()
        resolve()
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.appendChild(script)
    })
  }
  return promesaApiYT
}

// Player vía YouTube IFrame API: el sonido se cambia con mute()/unMute()
// SIN recargar el video (un <iframe> con src distinto lo reinicia).
function ShortsPlayer({ videoId, conSonido, enPausa, jugadorRef }) {
  const contenedorRef = useRef(null)
  const conSonidoRef = useRef(false)
  const enPausaRef = useRef(false)
  const videoIdRef = useRef(videoId)

  useEffect(() => {
    conSonidoRef.current = conSonido
  }, [conSonido])

  useEffect(() => {
    enPausaRef.current = enPausa
  }, [enPausa])

  useEffect(() => {
    videoIdRef.current = videoId
  }, [videoId])

  useEffect(() => {
    let activo = true
    const contenedor = contenedorRef.current
    if (!contenedor) return undefined

    cargaApiYT().then(() => {
      if (!activo || !window.YT?.Player) return
      const jugador = new window.YT.Player(contenedor, {
        videoId: videoIdRef.current,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          mute: 1,
          loop: 1,
          playlist: videoIdRef.current,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            const j = jugadorRef.current
            if (!j) return
            j.setVolume(100)
            if (conSonidoRef.current) j.unMute()
            else j.mute()
            if (enPausaRef.current) j.pauseVideo()
            else j.playVideo()
          },
        },
      })
      jugadorRef.current = jugador
    })

    return () => {
      activo = false
      if (jugadorRef.current) {
        jugadorRef.current.destroy()
        jugadorRef.current = null
      }
    }
  }, [videoId, jugadorRef])

  useEffect(() => {
    const j = jugadorRef.current
    if (!j || !j.getPlayerState) return
    if (conSonido) j.unMute()
    else j.mute()
  }, [conSonido, jugadorRef])

  useEffect(() => {
    const j = jugadorRef.current
    if (!j || !j.getPlayerState) return
    if (enPausa) j.pauseVideo()
    else j.playVideo()
  }, [enPausa, jugadorRef])

  return <div className="cc-slide__video" ref={contenedorRef} />
}

function MiniaturaMovimiento({ video, activo }) {
  const [congelada, setCongelada] = useState(false)

  useEffect(() => {
    if (!activo) {
      setCongelada(false)
      return undefined
    }
    const t = setTimeout(() => setCongelada(true), 3000)
    return () => clearTimeout(t)
  }, [activo, video.id])

  if (!activo || congelada) return null
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${video.id}&playsinline=1&iv_load_policy=3&rel=0&modestbranding=1`}
      title={video.titulo}
      className="cc__preview-frame"
      allow="autoplay; encrypted-media; picture-in-picture"
      loading="lazy"
    />
  )
}

function CarruselCortos() {
  const [videos, setVideos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [hayError, setHayError] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [idx, setIdx] = useState(0)
  const [conSonido, setConSonido] = useState(false)
  const [enPausa, setEnPausa] = useState(false)
  const [fuentes, setFuentes] = useState([])
  const [feedVideos, setFeedVideos] = useState([])
  const [fuenteActual, setFuenteActual] = useState(null)
  const [feedCargando, setFeedCargando] = useState(false)
  const scrollerRef = useRef(null)
  const filaRef = useRef(null)
  const jugadorRef = useRef(null)
  const schedRef = useRef(null)
  const [activos, setActivos] = useState(new Set())

  useEffect(() => {
    let activo = true
    api
      .get('/shorts')
      .then((res) => {
        if (!activo) return
        const lista = res.data?.videos
        setVideos(Array.isArray(lista) ? lista : [])
        setFuentes(Array.isArray(res.data?.fuentes) ? res.data.fuentes : [])
        setHayError(false)
      })
      .catch(() => {
        if (activo) setHayError(true)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    const fila = filaRef.current
    if (!fila || videos.length === 0) return undefined
    const target = (el) => el.getAttribute('data-video-id')
    const limpiar = () => setActivos(new Set())
    const recalcular = () => {
      const centro = fila.getBoundingClientRect().left + fila.offsetWidth / 2
      const cercanos = Array.from(fila.querySelectorAll('.cc__preview'))
        .map((el) => {
          const caja = el.getBoundingClientRect()
          return { id: target(el), dist: Math.abs(caja.left + caja.width / 2 - centro) }
        })
        .filter((x) => x.id)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3)
      setActivos(new Set(cercanos.map((x) => x.id)))
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) recalcular()
      },
      { root: fila, threshold: 0 }
    )
    const targets = Array.from(fila.querySelectorAll('.cc__preview'))
    targets.forEach((t) => obs.observe(t))
    recalcular()
    const onScroll = () => {
      window.clearTimeout(schedRef.current)
      schedRef.current = window.setTimeout(recalcular, 80)
    }
    fila.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      obs.disconnect()
      fila.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.clearTimeout(schedRef.current)
      limpiar()
    }
  }, [videos])

  useEffect(() => {
    if (!abierto) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [abierto])

  useEffect(() => {
    if (!abierto || !scrollerRef.current) return undefined
    const contenedor = scrollerRef.current
    const slides = Array.from(contenedor.children)
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entrada of entries) {
          if (entrada.isIntersecting) {
            setIdx(slides.indexOf(entrada.target))
            break
          }
        }
      },
      { root: contenedor, threshold: 0.6 }
    )
    slides.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [abierto, feedVideos])

  if (cargando) return null
  if (hayError || videos.length === 0) return null

  const cargarFeed = async (canalId) => {
    const fuente = fuentes.find((f) => f.canal_id === canalId) || { canal_id: canalId, nombre: canalId }
    setFeedCargando(true)
    setFuenteActual(fuente)
    try {
      const res = await api.get('/shorts', { params: { fuente: canalId } })
      const listaFeed = res.data?.videos
      setFeedVideos(Array.isArray(listaFeed) ? listaFeed : [])
      setIdx(0)
      scrollerRef.current?.scrollTo({ top: 0 })
    } catch {
      setFeedVideos([])
    } finally {
      setFeedCargando(false)
    }
  }
  const abrir = (i) => {
    const v = videos[i]
    if (!v) return
    setIdx(0)
    setAbierto(true)
    cargarFeed(v.canal_id)
  }
  const cerrar = () => setAbierto(false)
  const irA = (i) => {
    if (i < 0 || i >= feedVideos.length) return
    scrollerRef.current?.children[i]?.scrollIntoView({ behavior: 'smooth' })
  }
  const siguienteFeed = () => {
    if (idx < feedVideos.length - 1) {
      irA(idx + 1)
      return
    }
    const positivo = fuentes.findIndex((f) => f.canal_id === fuenteActual?.canal_id) + 1
    const prox = fuentes[positivo]
    if (prox) cargarFeed(prox.canal_id)
  }
  const scrollFila = (direccion) => {
    filaRef.current?.scrollBy({ left: direccion * 380, behavior: 'smooth' })
  }
  const alternarSonido = () => {
    const j = jugadorRef.current
    if (j && !conSonido) {
      j.setVolume(100)
      j.unMute()
    } else if (j) {
      j.mute()
    }
    setConSonido((s) => !s)
  }
  const alternarPausa = () => {
    const j = jugadorRef.current
    if (j && !enPausa) j.pauseVideo()
    else if (j) j.playVideo()
    setEnPausa((p) => !p)
  }
  const compartirWhatsApp = () => {
    const v = feedVideos[idx]
    if (!v) return
    window.open(`https://wa.me/?text=${encodeURIComponent(`${v.titulo}\n${v.url}`)}`, '_blank', 'noopener')
  }
  const copiarEnlace = async () => {
    const v = feedVideos[idx]
    if (!v) return
    navigator.clipboard?.writeText(v.url)
  }

  return (
    <section className="cc">
      {/* Mini banner solo móvil */}
      <div className="cc__mini">
        <span className="cc__mini-ico"><Play size={15} /></span>
        <span className="cc__mini-texto">{BANNER_TITULO}</span>
      </div>

      <div className="cc__cuerpo">
        {/* Banner lateral solo desktop */}
        <aside className="cc__banner">
          <span className="cc__banner-chip"><Play size={13} /> Shorts</span>
          <h2 className="cc__banner-titulo">{BANNER_TITULO}</h2>
          <p className="cc__banner-sub">{BANNER_SUBTITULO}</p>
        </aside>

        <div className="cc__lado">
          <button
            type="button"
            className="cc__flecha cc__flecha--prev"
            onClick={() => scrollFila(-1)}
            aria-label="Anterior"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="cc__fila" ref={filaRef}>
            {videos.map((video, i) => (
              <button
                key={video.id}
                type="button"
                className="cc__preview"
                data-video-id={video.id}
                onClick={() => abrir(i)}
                aria-label={`Reproducir ${video.titulo}`}
              >
                <img src={video.thumb} alt={video.titulo} className="cc__preview-img" loading="lazy" />
                <MiniaturaMovimiento video={video} activo={activos.has(video.id)} />
                {!activos.has(video.id) && (
                  <span className="cc__preview-play"><Play size={20} /></span>
                )}
                <span className="cc__preview-titulo">{video.titulo}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="cc__flecha cc__flecha--next"
            onClick={() => scrollFila(1)}
            aria-label="Siguiente"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {abierto && (
        <div className="cc-modal" role="dialog" aria-modal="true" aria-label="Reproductor de cortos">
          <button type="button" className="cc-modal__cerrar" onClick={cerrar} aria-label="Cerrar">
            <X size={26} />
          </button>

          <button
            type="button"
            className="cc-modal__sonido"
            onClick={alternarSonido}
            aria-label={conSonido ? 'Silenciar' : 'Activar sonido'}
          >
            {conSonido ? <Volume2 size={22} /> : <VolumeX size={22} />}
            <span className="cc-modal__sonido-label">{conSonido ? 'Silenciar' : 'Activar sonido'}</span>
          </button>

          <div className="cc-shorts__acciones">
            <button type="button" className="cc-shorts__accion" onClick={compartirWhatsApp} aria-label="Compartir por WhatsApp">
              <MessageCircle size={20} />
            </button>
            <button type="button" className="cc-shorts__accion" onClick={copiarEnlace} aria-label="Copiar enlace">
              <Link2 size={20} />
            </button>
            <button type="button" className="cc-shorts__accion" onClick={alternarPausa} aria-label={enPausa ? 'Reanudar' : 'Pausar'}>
              {enPausa ? <Play size={20} /> : <Pause size={20} />}
            </button>
          </div>

          {fuenteActual && fuenteActual.nombre && (
            <span className="cc-modal__fuente">{fuenteActual.nombre}</span>
          )}

          {feedVideos.length > 1 && (
            <>
              <button
                type="button"
                className="cc-modal__nav cc-modal__nav--arriba"
                onClick={() => irA(idx - 1)}
                disabled={idx === 0}
                aria-label="Anterior"
              >
                <ChevronUp size={26} />
              </button>
              <button
                type="button"
                className="cc-modal__nav cc-modal__nav--abajo"
                onClick={siguienteFeed}
                disabled={false}
                aria-label="Siguiente"
              >
                <ChevronDown size={26} />
              </button>
            </>
          )}

          <div className="cc-modal__scroller" ref={scrollerRef}>
            {feedCargando ? (
              <div className="cc-slide cc-slide--spinner">
                <Loader2 size={32} className="cc-spinner" />
              </div>
            ) : (
              feedVideos.map((video, i) => (
                <div key={`${video.canal_id}-${video.id}`} className={`cc-slide${i === idx ? ' cc-slide--activo' : ''}`}>
                  {i === idx ? (
                    <ShortsPlayer videoId={video.id} conSonido={conSonido} enPausa={enPausa} jugadorRef={jugadorRef} />
                  ) : (
                    <img src={video.thumb} alt={video.titulo} className="cc-slide__thumb" loading="lazy" />
                  )}
                  <span className="cc-slide__titulo">{video.titulo}</span>
                  {video.producto && (
                    <a
                      href={video.producto.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cc-shorts__producto"
                    >
                      <span className="cc-shorts__producto-label">Ver producto</span>
                      <span className="cc-shorts__producto-nombre">{video.producto.nombre}</span>
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default CarruselCortos