import { X, Download } from 'lucide-react'
import './ModalInstalarStaff.css'

// ---------------------------------------------------------------
// Modal informativo de instalación PARA EL PANEL STAFF.
//
// Es el fallback cuando el navegador no ofreció el prompt nativo
// (beforeinstallprompt). Se adapta a la plataforma:
//   - iOS           -> pasos de "Agregar a pantalla de inicio"
//   - Android       -> pasos del menú "Instalar aplicación" (sin compartir)
//   - Desktop/otro  -> pasos del icono de instalar en Chrome/Edge
// ---------------------------------------------------------------
function detectarPlataforma() {
  const ua = navigator.userAgent || ''
  return {
    esIOS: /iphone|ipad|ipod/i.test(ua),
    esAndroid: /android/i.test(ua),
  }
}

const PASOS_IOS = [
  { fuerte: 'Tocá el botón Compartir', detalle: 'El ícono del cuadro con flecha ↑ en la barra de abajo' },
  { fuerte: 'Seleccioná "Agregar a pantalla de inicio"', detalle: 'Desplazate hacia abajo si no lo ves de inmediato' },
  { fuerte: 'Tocá "Agregar"', detalle: 'Listo, la app queda en tu pantalla de inicio' },
]

const PASOS_ANDROID = [
  { fuerte: 'Tocá el menú ⋮ de Chrome', detalle: 'Los tres puntos, arriba a la derecha' },
  { fuerte: 'Elegí "Instalar aplicación"', detalle: 'Aparece dentro del menú de opciones' },
  { fuerte: 'Tocá "Instalar"', detalle: 'La app se agrega sola a tu pantalla de inicio' },
]

const PASOS_DESKTOP = [
  { fuerte: 'Tocá el icono de instalar', detalle: 'En la barra de direcciones de Chrome o Edge' },
  { fuerte: 'Confirmá con "Instalar"', detalle: 'El navegador la abre como una aplicación propia' },
  { fuerte: 'Usala desde tu escritorio', detalle: 'Queda un acceso directo a "Carrisán Staff"' },
]

function ModalInstalarStaff({ onClose }) {
  const { esIOS, esAndroid } = detectarPlataforma()
  const pasos = esIOS ? PASOS_IOS : esAndroid ? PASOS_ANDROID : PASOS_DESKTOP
  const titulo = esIOS ? 'Agregar a pantalla de inicio' : 'Instalar Carrisán Staff'
  const sub =
    esAndroid
      ? 'Tu navegador no mostró la pregunta de instalación todavía. Podés instalarla manualmente en unos segundos:'
      : 'Instalá la app para acceder más rápido al panel interno.'

  return (
    <div className="sim-overlay" onClick={onClose}>
      <div className="sim-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sim-cerrar" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        <div className="sim-icono">
          <Download size={26} />
        </div>

        <h3 className="sim-titulo">{titulo}</h3>
        <p className="sim-sub">{sub}</p>

        <ol className="sim-pasos">
          {pasos.map((paso, i) => (
            <li key={i} className="sim-paso">
              <span className="sim-paso-numero">{i + 1}</span>
              <div className="sim-paso-texto">
                <strong>{paso.fuerte}</strong>
                <span>{paso.detalle}</span>
              </div>
            </li>
          ))}
        </ol>

        <button type="button" className="sim-btn" onClick={onClose}>
          Entendido
        </button>
      </div>
    </div>
  )
}

export default ModalInstalarStaff