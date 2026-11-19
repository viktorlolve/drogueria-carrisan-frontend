import { useEffect, useLayoutEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLoadingBar } from '../context/LoadingBarContext'
import './TopLoadingBar.css'

// Breakpoint desktop: igual que StaffNavbar / Navbar (sidebar aparece >=1024px).
// En desktop el navbar es sticky (no baja al scrollear), así que el loading
// se ancla justo debajo de él y queda pegado ahí al scrollear.
// En móvil/tablet (o sin navbar) siempre carga en la parte superior del viewport.
const DESKTOP_BREAKPOINT = 1024

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
    function medirNavbar() {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT

      // Móvil/tablet (o desktop sin navbar): la barra va en la parte
      // superior del viewport (top: 0), nunca debajo de nada.
      if (!desktop) {
        setNavHeight(0)
        setNavMounted(true)
        return
      }

      // Desktop: mide la navbar que exista. Cliente usa .navbar__main +
      // .navbar__secondary; staff usa .snb (StaffNavbar). Solo una de las
      // dos existe según la ruta activa.
      const main = document.querySelector('.navbar__main') || document.querySelector('.snb')
      if (!main) {
        setNavHeight(0)
        setNavMounted(true)
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
      document.querySelector('.snb'),
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
