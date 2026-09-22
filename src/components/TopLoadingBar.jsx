import { useEffect, useLayoutEffect, useState } from 'react'
import { Box } from '@chakra-ui/react'
import { useLocation } from 'react-router-dom'
import { useLoadingBar } from '../context/LoadingBarContext'

function TopLoadingBar() {
  const { isLoading, notifyNavigation } = useLoadingBar()
  const [navHeight, setNavHeight] = useState(0)
  const location = useLocation()

  // Rutas donde NO queremos mostrar el loading bar
  const excludedRoutes = ['/login', '/registro']
  const shouldShowLoadingBar = !excludedRoutes.includes(location.pathname)

  // Cada navegación enciende la barra: indica que la página (lazy/Suspense
  // + requests) está cargando. Las peticiones en vuelo la extienden hasta
  // que la página termina de cargar por completo.
  useEffect(() => {
    notifyNavigation()
  }, [location.pathname, notifyNavigation])

  useLayoutEffect(() => {
    // Desktop = fila principal + barra secundaria; móvil/tablet solo la principal.
    // Re-medir en cada cambio de ruta porque el navbar aparece/desaparece
    // (login, registro, staff) y las alturas difieren por breakpoint.
    // Sin navbar (staff, login, etc.) la barra queda pegada arriba (offset 0).
    function medirNavbar() {
      const main = document.querySelector('.navbar__main')
      if (!main) {
        setNavHeight(0)
        return
      }
      const secondary = document.querySelector('.navbar__secondary')
      setNavHeight(main.offsetHeight + (secondary ? secondary.offsetHeight : 0))
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

  if (!isLoading || !shouldShowLoadingBar) return null

  return (
    <Box
      position="fixed"
      top={`${navHeight}px`}
      left="0"
      width="100%"
      height="4px"
      zIndex={1001}
      overflow="hidden"
      bg="rgba(255,255,255,0.16)"
      pointerEvents="none"
    >
      {/* Gradiente aurora en colores de marca */}
      <Box
        height="100%"
        width="100%"
        bgGradient="linear(to-r, #0052DC, #12A594, #FFC220, #12A594, #0052DC)"
        backgroundSize="300% 100%"
        boxShadow="0 0 10px rgba(0,82,220,0.6), 0 0 4px rgba(18,165,148,0.35)"
        animation="loadingAurora 3.2s ease-in-out infinite"
        sx={{
          '@keyframes loadingAurora': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
          },
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
          },
        }}
      />

      {/* Destello que recorre la barra cada ciclo */}
      <Box
        position="absolute"
        top="0"
        left="0"
        height="100%"
        width="45%"
        bgGradient="linear(to-r, transparent, rgba(255,255,255,0.55), transparent)"
        animation="loadingSheen 1.6s ease-in-out infinite"
        sx={{
          '@keyframes loadingSheen': {
            '0%': { transform: 'translateX(-120%)' },
            '60%': { transform: 'translateX(245%)' },
            '100%': { transform: 'translateX(245%)' },
          },
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            opacity: 0,
          },
        }}
      />
    </Box>
  )
}

export default TopLoadingBar