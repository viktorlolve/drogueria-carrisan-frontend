import { useState, useEffect } from 'react'
import './CookieConsent.css'
import { safeGetItem, safeSetItem } from '../utils/safeStorage'

const STORAGE_KEY = 'cookies_consent'

function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    const yaRespondio = safeGetItem(STORAGE_KEY)
    if (!yaRespondio) {
      // pequeño delay para que la animación de entrada se note (no aparece de golpe al cargar)
      const timer = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(timer)
    }
  }, [])

  const responder = (valor) => {
    safeSetItem(
      STORAGE_KEY,
      JSON.stringify({ estado: valor, fecha: new Date().toISOString() })
    )
    setSaliendo(true)
    setTimeout(() => setVisible(false), 350) // debe coincidir con la duración de la animación de salida en CSS
  }

  if (!visible) return null

  return (
    <div className={`cookie-consent ${saliendo ? 'cookie-consent--saliendo' : ''}`}>
      <div className="cookie-consent__icono" aria-hidden="true">🍪</div>
      <div className="cookie-consent__texto">
        <p>
          Usamos cookies para que tu experiencia en Droguería Carrisan sea más dulce
          (y para que el carrito no se te olvide). Puedes aceptarlas o rechazarlas.
        </p>
        <a href="/privacidad" className="cookie-consent__link">
          Política de privacidad
        </a>
      </div>
      <div className="cookie-consent__acciones">
        <button
          type="button"
          className="cookie-consent__btn cookie-consent__btn--rechazar"
          onClick={() => responder('rechazado')}
        >
          Rechazar
        </button>
        <button
          type="button"
          className="cookie-consent__btn cookie-consent__btn--aceptar"
          onClick={() => responder('aceptado')}
        >
          Aceptar
        </button>
      </div>
    </div>
  )
}

export default CookieConsent