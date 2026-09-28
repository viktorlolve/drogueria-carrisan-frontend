import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PrivacidadContent from '../components/legal/PrivacidadContent'
import './Privacidad.css'

// ---------------------------------------------------------
// Aviso de Privacidad — mismo patrón de diseño que /terminos
// (índice con anclas, secciones numeradas). El TEXTO es original,
// redactado para el negocio real de Droguería Carrisan, inspirado
// en las categorías típicas de un aviso de privacidad (qué se
// recopila, cómo se usa, con quién se comparte, tus opciones, etc.)
// pero sin copiar contenido de terceros.
//
// ⚠️ Borrador de referencia, no asesoría legal. Antes de publicarlo,
// hazlo revisar por un abogado en Venezuela.
// ---------------------------------------------------------
const INDICE = [
  { id: 'alcance', label: '1. Qué Cubre este Aviso' },
  { id: 'informacion-recopilada', label: '2. Qué Información Recopilamos' },
  { id: 'uso-informacion', label: '3. Cómo Usamos tu Información' },
  { id: 'como-recopilamos', label: '4. Cómo Recopilamos tu Información' },
  { id: 'con-quien-compartimos', label: '5. Con Quién Compartimos tu Información' },
  { id: 'preferencias', label: '6. Tus Opciones y Preferencias' },
  { id: 'acceso-actualizacion', label: '7. Acceder y Actualizar tu Información' },
  { id: 'seguridad', label: '8. Cómo Protegemos tu Información' },
  { id: 'retencion', label: '9. Cuánto Tiempo la Conservamos' },
  { id: 'menores', label: '10. Privacidad de Menores de Edad' },
  { id: 'terceros', label: '11. Enlaces a Servicios de Terceros' },
  { id: 'cookies', label: '12. Cookies y Tecnologías Similares' },
  { id: 'cambios', label: '13. Cambios a este Aviso' },
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
    <ul className="privacidad-indice__lista">
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

function Privacidad() {
  const [indiceAbierto, setIndiceAbierto] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="privacidad-page">
      <div className="privacidad-header">
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
          <h1>Aviso de Privacidad</h1>
        </div>
        <p className="privacidad-header__fecha">Última actualización: 12 de agosto de 2026</p>
      </div>

      <div className="privacidad-aviso">
        <strong>Resumen:</strong> usamos tu información para gestionar tu cuenta, procesar tus
        pedidos y darte soporte comercial. No vendemos tu información a terceros. Podés pedirnos
        acceder, corregir o eliminar tus datos escribiéndonos a{' '}
        <a href="mailto:dcarrisan@gmail.com">dcarrisan@gmail.com</a>.
      </div>

      <button
        type="button"
        className="privacidad-indice__toggle privacidad-mobile-only"
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
        <aside className="privacidad-indice privacidad-indice--mobile privacidad-mobile-only">
          <IndiceLinks onNavigate={() => setIndiceAbierto(false)} />
        </aside>
      )}

      <div className="privacidad-layout">
        <aside className="privacidad-indice privacidad-desktop-only">
          <p className="privacidad-indice__titulo">Índice</p>
          <IndiceLinks />
        </aside>

        <div className="privacidad-contenido">
          <PrivacidadContent />
        </div>
      </div>
    </div>
  )
}

export default Privacidad