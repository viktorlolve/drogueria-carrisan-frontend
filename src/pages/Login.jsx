import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { PackageSearch, ShieldCheck, Clock3 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/minilogo color sin fondo.png'
import api from '../api/axios'
import { validarEmail } from '../utils/validadores'
import './Auth.css'

/* Puntos destacados del panel de marca (desktop) */
const PANEL_FEATURES = [
  { icon: PackageSearch, texto: 'Catálogo completo con precios y disponibilidad al día' },
  { icon: Clock3, texto: 'Pedidos, historial y facturas desde un mismo lugar' },
  { icon: ShieldCheck, texto: 'Pagos y datos protegidos en cada transacción' },
]

function Login() {
  const [paso, setPaso] = useState('email')
  const [direccionSlide, setDireccionSlide] = useState('adelante') // 'adelante' | 'atras' — controla hacia dónde entra/sale el card
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mostrarCheck, setMostrarCheck] = useState(false) // true durante el breve instante de éxito antes de cambiar de paso
  const [mostrarPassword, setMostrarPassword] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sesionExpirada = searchParams.get('expirado') === '1'

  async function handleContinuar(e) {
    e.preventDefault()
    setError('')

    const emailLimpio = email.trim().toLowerCase()
    setEmail(emailLimpio)

    if (!validarEmail(emailLimpio)) {
      setError('Ingresá un correo electrónico válido (ejemplo@correo.com)')
      return
    }

    if (honeypot) {
      setError('No se pudo procesar la solicitud')
      return
    }

    setCargando(true)
    try {
      const { data } = await api.post('/auth/check-email', { email: emailLimpio })
      if (data.existe) {
        // Muestra el check de éxito en el botón un instante antes de
        // deslizar al paso de contraseña — le da a la acción una
        // confirmación visual antes del salto de pantalla.
        setMostrarCheck(true)
        setDireccionSlide('adelante')
        setTimeout(() => {
          setPaso('password')
          setMostrarCheck(false)
        }, 400)
      } else {
        navigate(`/registro?email=${encodeURIComponent(emailLimpio)}`)
      }
    } catch {
      setError('No se pudo verificar el correo. Intentá de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  async function handleIngresar(e) {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const user = await login(email, password)
      navigate(user.es_admin ? '/admin' : '/')
    } catch (err) {
      setError(err.response?.data?.error || 'Correo o contraseña incorrectos')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-page auth-page--login">
      <div className="auth-shell">
        {/* ---------- Panel de marca (solo desktop) ---------- */}
        <aside className="auth-brand-panel" aria-hidden="true">
          <div className="auth-brand-panel__top">
            <span className="auth-brand-panel__logo-chip">
              <img src={logo} alt="" className="auth-brand-panel__logo" />
            </span>
            <div>
              <div className="auth-brand-panel__brand">Droguería Carrisán</div>
              <div className="auth-brand-panel__tag">Distribución B2B farmacéutica</div>
            </div>
          </div>

          <div className="auth-brand-panel__body">
            <p className="auth-brand-eyebrow">Portal de clientes</p>
            <h2 className="auth-brand-title">
              Todo tu abastecimiento, en un solo lugar
            </h2>
            <p className="auth-brand-subtitle">
              Consultá catálogo, hacé pedidos y llevá el control de tu cuenta con tu
              distribuidor de confianza.
            </p>

            <div className="auth-brand-graphic">
              <div className="auth-brand-graphic__card auth-brand-graphic__card--1" />
              <div className="auth-brand-graphic__card auth-brand-graphic__card--2" />
              <div className="auth-brand-graphic__card auth-brand-graphic__card--3">
                <ShieldCheck size={16} />
                <span>Pedido confirmado</span>
              </div>
            </div>

            <ul className="auth-brand-features">
              {PANEL_FEATURES.map(({ icon: Icono, texto }) => (
                <li key={texto} className="auth-brand-feature">
                  <span className="auth-brand-feature__icon">
                    <Icono size={15} />
                  </span>
                  {texto}
                </li>
              ))}
            </ul>
          </div>

          <p className="auth-brand-panel__footer">
            © 2026 Drogueria Carrisan, C.A. · RIF J-40068410-2
          </p>
        </aside>

        {/* ---------- Panel del formulario ---------- */}
        <main className="auth-container">
          <Link to="/" className="auth-logo">
            <img src={logo} alt="Logo" className="logologin" />
          </Link>

          {sesionExpirada && (
            <div role="alert" className="auth-banner auth-banner--warning">
              Tu sesión expiró. Iniciá sesión de nuevo para continuar.
            </div>
          )}

          {error && <div role="alert" className="auth-error">{error}</div>}

          {paso === 'email' ? (
            <div key="paso-email" className={`auth-paso auth-paso--${direccionSlide}`}>
              <div className="auth-card">
                <h1 className="auth-title">Iniciar sesión</h1>
                <p className="auth-subtitle">
                  Ingresá tu correo. Te ayudaremos a continuar con tu cuenta o crear una nueva.
                </p>

                <form className="auth-form" onSubmit={handleContinuar}>
                  <div className="auth-input-group">
                    <label htmlFor="email">Correo electrónico</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                      placeholder="tu@correo.com"
                      required
                    />
                  </div>

                  {/* Honeypot oculta para anti-spam */}
                  <div className="auth-honeypot" aria-hidden="true">
                    <label htmlFor="sitio_web">Sitio web</label>
                    <input
                      id="sitio_web"
                      name="sitio_web"
                      type="text"
                      tabIndex="-1"
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className={`auth-btn-primary${mostrarCheck ? ' auth-btn-primary--exito' : ''}`}
                    disabled={cargando || mostrarCheck}
                  >
                    {mostrarCheck ? (
                      <svg className="auth-btn-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : cargando ? 'Verificando...' : 'Continuar'}
                  </button>
                </form>

                <p className="auth-privacy-text">
                  Proteger tu información personal es nuestra prioridad.<br />
                  <Link to="/privacidad" style={{ color: '#0052DC', textDecoration: 'none' }}>
                    Ve nuestras políticas de privacidad
                  </Link>
                </p>
              </div>

              {/* Crear cuenta — link simple, sin competir en peso con la card de login */}
              <p className="auth-crear-cuenta">
                ¿No tenés cuenta aún?{' '}
                <button type="button" onClick={() => navigate('/registro')}>
                  Creá una gratis
                </button>
              </p>
            </div>
          ) : (
            <div key="paso-password" className={`auth-paso auth-paso--${direccionSlide}`}>
              <div className="auth-card auth-card--angosto">
                <h1 className="auth-title">Ingresá tu contraseña</h1>

                <div className="auth-email-confirmado">
                  <span>{email}</span>
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => {
                      setDireccionSlide('atras')
                      setPaso('email')
                      setPassword('')
                      setError('')
                    }}
                  >
                    Cambiar
                  </button>
                </div>

                <form className="auth-form" onSubmit={handleIngresar}>
                  <div className="auth-input-group">
                    <label htmlFor="password">Contraseña</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="password"
                        type={mostrarPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        autoFocus
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        aria-pressed={mostrarPassword}
                        onClick={() => setMostrarPassword((prev) => !prev)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        {mostrarPassword ? (
                          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="auth-olvido-wrapper">
                    <Link to="/recuperar" className="auth-olvido">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  <button type="submit" className="auth-btn-primary" disabled={cargando}>
                    {cargando ? 'Ingresando...' : 'Ingresar'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer inferior */}
      <footer className="auth-footer">
        <div className="auth-footer-content">
          © 2026 Drogueria Carrisan, C.A. Todos los derechos reservados.
          <div className="auth-footer-links">
            <Link to="/terminos">Términos de uso</Link>
            <Link to="/privacidad">Aviso de privacidad</Link>
            <Link to="/contacto">Soporte</Link>
            <Link to="/staff/login" className="auth-footer-staff-link">
              Acceso de personal
            </Link>
          </div>
          <span className="auth-footer-rif">RIF J-40068410-2</span>
        </div>
      </footer>
    </div>
  )
}

export default Login