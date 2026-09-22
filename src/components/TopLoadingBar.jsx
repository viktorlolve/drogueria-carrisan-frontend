import { useEffect, useLayoutEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLoadingBar } from '../context/LoadingBarContext'
import './TopLoadingBar.css'

function TopLoadingBar() {
  const { isLoading, notifyNavigation } = useLoadingBar()
  const [navMounted, setNavMounted] = useState(false)
  const [navHeight, setNavHeight] = useState(0)
  const location = useLocation()

  // Cada navegación enciende la barra: indica que la página (lazy/Suspense
  // + requests) está cargando. Las peticiones en vuelo la extienden hasta
  // que la página termina de cargar por completo.
  useEffect(() => {
    notifyNavigation()
  }, [location.pathname, notifyNavigation])

  useLayoutEffect(() => {
    // Desktop = fila principal + barra secundaria; móvil/tablet solo la principal.
    // La barra SOLO se muestra donde existe el navbar (login, registro y el
    // módulo staff no tienen navbar → nunca se pinta). Re-medir en cada cambio
    // de ruta porque el navbar aparece/desaparece y las alturas difieren.
    function medirNavbar() {
      const main = document.querySelector('.navbar__main')
      if (!main) {
        setNavMounted(false)
        setNavHeight(0)
        return
      }
      const secondary = document.querySelector('.navbar__secondary')
      setNavHeight(main.offsetHeight + (secondary ? secondary.offsetHeight : 0))
      setNavMounted(true)
    }

    medirNavbar()
    window.addEventListener('resize', medirNavbar)

    const observer = new ResizeObserver(medirNavbar)
    const targets = [
      document.querySelector('.navbar__main'),
      document.querySelector('.navbar__secondary'),
    ].filter(Boolean)
    targets.forEach((el) => observer.observe(el))

    return () => {
      window.removeEventListener('resize', medirNavbar)
      observer.disconnect()
    }
  }, [location.pathname])

  if (!isLoading || !navMounted) return null

  return (
    <div className="tlb" style={{ top: `${navHeight}px` }}>
      <div className="tlb__fill" />
      <div className="tlb__sheen" />
    </div>
  )
}

export default TopLoadingBar