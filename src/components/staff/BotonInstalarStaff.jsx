import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import ModalInstalarIphone from '../ModalInstalarIphone'

// ---------------------------------------------------------------
// Botón "Instalar app" discreto (icon-only) para el StaffDashboard.
//
// Detecta si la PWA ya está instalada (display-mode: standalone) y
// se oculta en ese caso.
//
// - Android/Chrome: usa beforeinstallprompt para instalar nativamente
// - iPhone/Safari / desktop sin prompt: abre el modal informativo
// - Se oculta al aceptar la instalación (evento appinstalled)
// ---------------------------------------------------------------
function estaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function BotonInstalarStaff() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [instalado, setInstalado] = useState(estaInstalado)
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    if (estaInstalado()) return

    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    function onAppInstalled() {
      setInstalado(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  if (instalado || estaInstalado()) return null

  async function handleInstalar() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      if (outcome === 'accepted') {
        setInstalado(true)
      }
      return
    }

    setModalAbierto(true)
  }

  return (
    <>
      <button
        type="button"
        className="sd-instalar"
        onClick={handleInstalar}
        aria-label="Instalar app"
        title="Instalar app"
      >
        <Download size={17} />
      </button>

      {modalAbierto && (
        <ModalInstalarIphone onClose={() => setModalAbierto(false)} />
      )}
    </>
  )
}

export default BotonInstalarStaff