import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import logo from '../assets/minilogo color sin fondo.png'
import { LegalLink } from '../components/legal/LegalModal'
import './Auth.css'
import './RegistroConTipo.css'

/**
 * Paso 1 del registro (público). Por normativa sanitaria venezolana la
 * Droguería solo vende a instituciones de salud, así que el público SOLO
 * ve el registro institucional (con su panel explicativo). Los perfiles
 * profesional y honorífico se registran exclusivamente vía la página por
 * invitación (/registro/invita, con token) que el dueño comparte por
 * URL/QR. Este componente simplemente navega a /registro/institucional,
 * pasando el email pre-llenado si vino de /login.
 */
function RegistroConTipo() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailPrellenado = searchParams.get('email') || ''

  function irA() {
    const query = emailPrellenado ? `?email=${encodeURIComponent(emailPrellenado)}` : ''
    navigate(`/registro/institucional${query}`)
  }

  return (
    <div className="auth-page">
      <main className="auth-container registro-tipo-container">
        <Link to="/" className="auth-logo">
          <img src={logo} alt="Logo" className="logologin" />
        </Link>

        <div className="auth-card">
          <h1 className="auth-title">Registro cuenta B2B</h1>
          <p className="auth-subtitle">
            Procede con tu registro institucional y les contactaremos una vez confirmemos la informacion
          </p>

          <div className="registro-tipo__panel">
            <div className="registro-tipo__izq">
              <button
                type="button"
                className={`registro-tipo__card registro-tipo__card--institucional registro-tipo__card--seleccionada`}
                onClick={irA}
                aria-pressed="true"
              >
                <div className="registro-tipo__imagen">
                  <img
                    src="https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/institucional.jpg"
                    alt=""
                    className="registro-tipo__imagen-img"
                    loading="lazy"
                  />
                </div>

                <div className="registro-tipo__cuerpo">
                  <h3>Usuario Institucional</h3>
                  <p>Clínica, farmacia, centro quirúrgico u otra institución de salud</p>
                </div>

                <span className="registro-tipo__check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="#fff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              <button
                type="button"
                className="auth-submit registro-tipo__siguiente"
                onClick={irA}
              >
                Siguiente
              </button>
            </div>

            <aside className="registro-tipo__info">
              <h2>Solo para instituciones de salud</h2>
              <p className="registro-tipo__info-intro">
                De acuerdo con la normativa sanitaria venezolana, Drogueria Carrisan solo
                comercializa insumos médicos con instituciones de salud (clínicas, farmacias,
                centros quirúrgicos, hospitales y afines) que cuenten con su registro y permiso
                sanitario emitido por la Contraloría Sanitaria.
              </p>
              <ul className="registro-tipo__info-lista">
                <li>
                  <strong>Solo necesitas tu RIF</strong> para abrir tu cuenta: es el único
                  documento obligatorio del registro (se adjunta en PDF).
                </li>
                <li>
                  <strong>Documentos adicionales</strong> En este proceso tambien puedes adjuntar el permiso sanitario, la cédula y el título del farmacéutico regente y la autorización del director médico. Si no los tienes a la mano, los entregas luego a tus asesores de la Drogueria.
                </li>
              </ul>
              <p className="registro-tipo__info-nota">
                ¿Tienes alguna duda? ¡Contactanos!
                </p>
                <p className="registro-tipo__info-intro">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle" aria-hidden="true"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path></svg><a class="ct-dato__texto" href="https://wa.link/imsb5w" target="_blank" rel="noopener noreferrer">WhatsApp</a> +58 414 5949532
                  </p>
            </aside>
          </div>
        </div>
      </main>

      <footer className="auth-footer">
        <div className="auth-footer-content">
          <span className="auth-footer-rif">RIF J-40068410-2</span>
          <div className="auth-footer-links">
            <LegalLink doc="terminos">Términos de uso</LegalLink>
            <LegalLink doc="privacidad">Aviso de privacidad</LegalLink>
            <a href="/contacto" target="_blank" rel="noopener noreferrer">Soporte</a>
          </div>
          © 2026 Drogueria Carrisan, C.A. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}

export default RegistroConTipo