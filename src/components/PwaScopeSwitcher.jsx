import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// PWA unica: hay un solo manifest, un solo service worker y un solo icono
// instalado (el de la tienda) para todos, staff incluido. Este componente SOLO
// ajusta la metadata cosmetica de la pestana, para que el panel de personal se
// sienta distinto sin tocar la identidad de instalacion.
//
// NO cambiar aqui el manifest ni el apple-touch-icon:
//   - el navegador ya parseo el manifest al cargar la pagina, asi que un
//     setAttribute posterior no cambia la instalabilidad;
//   - el apple-touch-icon es lo que iOS congela como icono instalado, y
//     swapearlo daria un icono staff en iOS y de tienda en Android.
const COLOR_CLIENTE = '#0052DC'
const COLOR_STAFF = '#1B4B8F'

function PwaScopeSwitcher() {
  const location = useLocation()

  useEffect(() => {
    const esStaff = location.pathname.startsWith('/staff')

    document.title = esStaff ? 'Carrisán Staff' : 'Drogueria Carrisan, C.A.'

    const themeColor = document.querySelector('meta[name="theme-color"]')
    if (themeColor) {
      themeColor.setAttribute('content', esStaff ? COLOR_STAFF : COLOR_CLIENTE)
    }

    // Solo cosmetico: la pestana del navegador, no el icono instalado.
    const favicon = document.querySelector('link[rel="icon"]')
    if (favicon) {
      favicon.setAttribute('href', '/favicon.svg')
      favicon.setAttribute('type', 'image/svg+xml')
    }
  }, [location.pathname])

  return null
}

export default PwaScopeSwitcher
