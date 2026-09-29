import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { validarPassword } from '../utils/validadores'
import './Auth.css'

function RecuperarPassword() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [exito, setExito] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (honeypot) {
      setError('No se pudo procesar la solicitud')
      return
    }

    if (password !== confirmarPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    const pwCheck = validarPassword(password)
    if (!pwCheck.valido) {
      setError(pwCheck.error || 'La contraseña debe tener al menos 8 caracteres, incluyendo letras y números')
      return
    }

    setCargando(true)
    try {
      await api.post('/auth/reset-password', {
        email,
        password,
      })
      setExito(true)
    } catch (err) {
      // Mensaje genérico a propósito — no decimos si falló el email o si
      // el reinicio no está autorizado, para no darle pistas a quien
      // intenta adivinar datos ajenos.
      setError(err.response?.data?.error || 'No se pudo procesar la solicitud')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <span className="auth-logo-dot auth-logo-dot--teal" />
          <span className="auth-logo-dot auth-logo-dot--indigo" />
          Carrisan
        </Link>

        {exito ? (
          <>
            <h1>Contraseña actualizada</h1>
            <p className="auth-subtitulo">
              Ya podés iniciar sesión con tu nueva contraseña.
            </p>
            <Link to="/login" className="auth-submit auth-submit--link">
              Ir a iniciar sesión
            </Link>
          </>
        ) : (
          <>
            <h1>Recuperar acceso</h1>
            <p className="auth-subtitulo">
              Ingresa tu correo electrónico y la nueva contraseña que
              deseas usar. El administrador debe autorizar el reinicio
              primero.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                Correo electrónico
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="auth-field">
                Nueva contraseña
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="auth-field">
                Confirmar nueva contraseña
                <input
                  type="password"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>

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

              <button type="submit" className="auth-submit" disabled={cargando}>
                {cargando ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>

            <p className="auth-switch">
              <Link to="/login">Volver a iniciar sesión</Link>
            </p>
          </>
        )}

        <p className="auth-footer-rif">RIF J-40068410-2</p>
      </div>
    </div>
  )
}

export default RecuperarPassword
