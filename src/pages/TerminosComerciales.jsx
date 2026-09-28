import { useState } from 'react'
import TerminosComercialesContent from '../components/legal/TerminosComercialesContent'
import './TerminosComerciales.css'

// ---------------------------------------------------------
// Política Comercial — Línea de Crédito B2B. Mismo patrón de
// diseño que /terminos y /privacidad (índice con anclas,
// secciones numeradas, subsecciones con letra, avisos
// destacados). El TEXTO es original, redactado para el
// negocio real de Droguería Carrisan.
//
// Enlazada desde el checkbox "Política Comercial" en
// RegistroInstitucional.jsx (aceptaComercial), que ya
// apuntaba a /terminoscomerciales.
//
// ⚠️ Este es un borrador de referencia, no asesoría legal.
// Antes de publicarlo, hazlo revisar por un abogado en
// Venezuela, sobre todo la Sección 7 (moneda/facturación) y
// la Sección 10 (ley aplicable).
// ---------------------------------------------------------
const INDICE = [
  { id: 'objeto', label: '1. Objeto y Aceptación' },
  { id: 'definiciones', label: '2. Definiciones' },
  { id: 'elegibilidad', label: '3. Elegibilidad Inicial' },
  { id: 'aprobacion', label: '4. Aprobación y Monto de la Línea' },
  { id: 'plazo', label: '5. Plazo de Crédito' },
  { id: 'ampliacion', label: '6. Ampliación de la Línea de Crédito' },
  { id: 'moneda', label: '7. Moneda de Referencia y Tasa de Cambio' },
  { id: 'facturacion', label: '8. Facturación' },
  { id: 'mora', label: '9. Mora e Incumplimiento de Pago' },
  { id: 'suspension', label: '10. Suspensión y Revocación de la Línea' },
  { id: 'bloqueo-checkout', label: '11. Bloqueo de Compras a Crédito' },
  { id: 'modificaciones', label: '12. Modificaciones a esta Política' },
  { id: 'ley-aplicable', label: '13. Ley Aplicable y Jurisdicción' },
  { id: 'contacto', label: '14. Contacto' },
]

function IndiceLinks({ onNavigate }) {
  function handleClick(e, id) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (onNavigate) onNavigate()
  }

  return (
    <ul className="comercial-indice__lista">
      {INDICE.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`} onClick={(e) => handleClick(e, item.id)}>
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

function TerminosComerciales() {
  const [indiceAbierto, setIndiceAbierto] = useState(false)

  return (
    <div className="comercial-page">
      <div className="comercial-header">
        <h1>Política Comercial — Línea de Crédito B2B</h1>
        <p className="comercial-header__fecha">Última actualización: 17 de septiembre de 2026</p>
      </div>

      <div className="comercial-aviso">
        <strong>Resumen:</strong> toda cuenta nueva opera de contado hasta acumular un historial
        mínimo de compras (Sección 3). La aprobación, el monto y las ampliaciones de la Línea de
        Crédito son evaluadas y autorizadas manualmente por nuestro equipo (Sección 4). No
        cobramos intereses ni recargos por mora, pero un pedido vencido bloquea nuevas compras a
        crédito y afecta futuras ampliaciones (Secciones 9 y 11).
      </div>

      <button
        type="button"
        className="comercial-indice__toggle comercial-mobile-only"
        onClick={() => setIndiceAbierto((v) => !v)}
      >
        <span>Índice de contenidos</span>
        <svg
          className={indiceAbierto ? 'rotado' : ''}
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {indiceAbierto && (
        <aside className="comercial-indice comercial-indice--mobile comercial-mobile-only">
          <IndiceLinks onNavigate={() => setIndiceAbierto(false)} />
        </aside>
      )}

      <div className="comercial-layout">
        <aside className="comercial-indice comercial-desktop-only">
          <p className="comercial-indice__titulo">Índice</p>
          <IndiceLinks />
        </aside>

        <div className="comercial-contenido">
          <TerminosComercialesContent />
        </div>
      </div>
    </div>
  )
}

export default TerminosComerciales