import { useState, useEffect } from 'react'
import { Download, Bell, X } from 'lucide-react'
import { usePush } from '../hooks/usePush'
import { safeGetItem, safeSetItem } from '../utils/safeStorage'

const STORAGE_KEYDismiss = 'carrisan_banner_onboarding_dismissed'

function yaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function BannerOnboarding() {
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const { soportado, suscrito, permiso, pidiendoPermiso, activar } = usePush()

  // Ajuste de estado en fase de render (patrón oficial de React): cuando el
  // permiso de notificaciones pasa a 'default' tras la detección asíncrona
  // del hook, el banner se vuelve visible.
  const [permisoPrev, setPermisoPrev] = useState(permiso)
  if (permiso !== permisoPrev) {
    setPermisoPrev(permiso)
    if (!yaInstalado() && safeGetItem(STORAGE_KEYDismiss) !== '1' && permiso === 'default' && soportado) {
      setVisible(true)
    }
  }

  useEffect(() => {
    if (yaInstalado() || safeGetItem(STORAGE_KEYDismiss) === '1') return

    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [permiso, soportado])

  useEffect(() => {
    if (visible && suscrito && deferredPrompt === null) {
      const timer = setTimeout(() => {
        setVisible(false)
        safeSetItem(STORAGE_KEYDismiss, '1')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [visible, suscrito, deferredPrompt])

  if (!visible) return null

  async function handleInstalar() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') {
      safeSetItem(STORAGE_KEYDismiss, '1')
      setVisible(false)
    }
  }

  function handleNotificaciones() {
    activar()
  }

  function handleCerrar() {
    setVisible(false)
    safeSetItem(STORAGE_KEYDismiss, '1')
  }

  const showInstalar = deferredPrompt && !yaInstalado()
  const showNotificaciones = soportado && !suscrito && permiso !== 'denied'

  return (
    <div className="banner-onboarding">
      <button type="button" className="banner-onboarding__cerrar" onClick={handleCerrar} aria-label="Cerrar">
        <X size={16} />
      </button>

      <div className="banner-onboarding__icono">
        <img src="/android-chrome-192x192.png" alt="" width="40" height="40" />
      </div>

      <div className="banner-onboarding__texto">
        <span className="banner-onboarding__titulo">Instalá la app</span>
        <span className="banner-onboarding__descripcion">
          Accedé más rápido y recibí avisos importantes de tu cuenta.
        </span>
      </div>

      <div className="banner-onboarding__acciones">
        {showInstalar && (
          <button type="button" className="banner-onboarding__btn banner-onboarding__btn--primario" onClick={handleInstalar}>
            <Download size={15} /> Instalar
          </button>
        )}
        {showNotificaciones && (
          <button
            type="button"
            className="banner-onboarding__btn banner-onboarding__btn--secundario"
            onClick={handleNotificaciones}
            disabled={pidiendoPermiso}
          >
            <Bell size={15} /> {pidiendoPermiso ? 'Activando…' : 'Notificaciones'}
          </button>
        )}
      </div>
    </div>
  )
}
