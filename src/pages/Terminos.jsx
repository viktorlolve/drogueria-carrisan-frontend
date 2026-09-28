import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TerminosContent from '../components/legal/TerminosContent'
import './Terminos.css'

// ---------------------------------------------------------
// Índice — mismas entradas que los <section id="..."> de abajo.
// El diseño (índice con anclas, secciones numeradas, subsecciones
// con letra, avisos destacados) está inspirado en la página de
// Términos de Walmart. El TEXTO es original, redactado para el
// negocio real de Droguería Carrisan — no es una copia.
//
// ⚠️ Este es un borrador de referencia, no asesoría legal. Antes
// de publicarlo, hazlo revisar por un abogado en Venezuela para
// confirmar que se ajusta a tu operación real y a la ley aplicable.
// ---------------------------------------------------------
const INDICE = [
  { id: 'aceptacion', label: '1. Aceptación de los Términos' },
  { id: 'definiciones', label: '2. Definiciones' },
  { id: 'cuenta', label: '3. Elegibilidad y Registro de Cuenta' },
  { id: 'uso-permitido', label: '4. Uso Permitido de la Plataforma' },
  { id: 'catalogo-precios', label: '5. Catálogo, Precios y Disponibilidad' },
  { id: 'pedidos', label: '6. Proceso de Pedidos' },
  { id: 'pagos', label: '7. Pagos y Línea de Crédito' },
  { id: 'envio', label: '8. Envío, Retiro y Entrega' },
  { id: 'devoluciones', label: '9. Devoluciones y Garantías' },
  { id: 'propiedad-intelectual', label: '10. Propiedad Intelectual' },
  { id: 'contenido-usuario', label: '11. Contenido Generado por el Usuario' },
  { id: 'privacidad', label: '12. Privacidad y Protección de Datos' },
  { id: 'responsabilidad', label: '13. Limitación de Responsabilidad' },
  { id: 'indemnizacion', label: '14. Indemnización' },
  { id: 'terminacion', label: '15. Suspensión y Terminación de Cuenta' },
  { id: 'modificaciones', label: '16. Modificaciones a estos Términos' },
  { id: 'ley-aplicable', label: '17. Ley Aplicable y Jurisdicción' },
  { id: 'contacto', label: '18. Contacto' },
]

function IndiceLinks({ onNavigate }) {
  function handleClick(e, id) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (onNavigate) onNavigate()
  }

  return (
    <ul className="terminos-indice__lista">
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

function Terminos() {
  const [indiceAbierto, setIndiceAbierto] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="terminos-page">
      <div className="terminos-header">
        <div className="pagina-titulo">
          <button
            type="button"
            className="pagina-volver"
            onClick={() => navigate(-1)}
            aria-label="Volver atrás"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 6 9 12 15 18" />
            </svg>
          </button>
          <h1>Términos y Condiciones de Uso</h1>
        </div>
        <p className="terminos-header__fecha">Última actualización: 12 de agosto de 2026</p>
      </div>

      <div className="terminos-aviso">
        <strong>Antes de continuar:</strong> estos Términos incluyen disposiciones importantes
        sobre precios y disponibilidad (Sección 5), línea de crédito y pagos (Sección 7),
        devoluciones (Sección 9) y limitación de responsabilidad (Sección 13). Te recomendamos
        leerlos completos antes de usar la plataforma.
      </div>

      {/* Índice — en mobile es colapsable y va arriba; en desktop es un sidebar fijo */}
      <button
        type="button"
        className="terminos-indice__toggle terminos-mobile-only"
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
        <aside className="terminos-indice terminos-indice--mobile terminos-mobile-only">
          <IndiceLinks onNavigate={() => setIndiceAbierto(false)} />
        </aside>
      )}

      <div className="terminos-layout">
        <aside className="terminos-indice terminos-desktop-only">
          <p className="terminos-indice__titulo">Índice</p>
          <IndiceLinks />
        </aside>

        <div className="terminos-contenido">
          <TerminosContent />
        </div>
      </div>
    </div>
  )
}

export default Terminos