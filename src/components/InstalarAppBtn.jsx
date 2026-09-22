import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import ModalInstalarIphone from './ModalInstalarIphone'

// ---------------------------------------------------------------
// Botón "Instalar app" para el sidebar/drawer de LayoutPaginaPrincipal.
//
// Detecta si la PWA ya está instalada (display-mode: standalone) y
// oculta el botón si es así.
//
// - Android/Chrome: usa beforeinstallprompt para instalar nativamente
// - iPhone/Safari: abre un modal informativo con pasos
// - Desktop/otros: muestra el modal con instrucciones
//
// Siempre visible cuando la app no está instalada (sin dismiss).
// ---------------------------------------------------------------
function estaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function InstalarAppBtn() {
  const [visible, setVisible] = useState(() => !estaInstalado() && !window.beforeinstallprompt)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    if (estaInstalado()) return

    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  if (!visible || estaInstalado()) return null

  async function handleInstalar() {
    // Si hay prompt nativo (Android/Chrome), usarlo
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      if (outcome === 'accepted') {
        setVisible(false)
      }
      return
    }

    // En iOS o desktop sin prompt, abrir modal informativo
    setModalAbierto(true)
  }

  return (
    <>
      <button type="button" className="ppal-nav__instalar-btn" onClick={handleInstalar}>
        <Download size={16} />
        <span>Instalar app</span>
      </button>

      {modalAbierto && (
        <ModalInstalarIphone onClose={() => setModalAbierto(false)} />
      )}
    </>
  )
}
