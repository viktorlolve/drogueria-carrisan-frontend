import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import SelectorEstadoCiudad from '../components/registro/SelectorEstadoCiudad'
import SubidaArchivoDrive from '../components/registro/SubidaArchivoDrive'
import Stepper from '../components/registro/Stepper'
import TurnstileWidget from '../components/registro/TurnstileWidget'
import PasswordStrength from '../components/registro/PasswordStrength'
import {
  PROFESIONES,
  TITULOS_POR_DEFECTO,
  obtenerEspecialidades
} from '../data/profesionesSalud'
import {
  validarEmail,
  validarPassword,
  validarRifMedico,
  validarTelefonoVenezuela,
  validarDireccion
} from '../utils/validadores'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import logo from '../assets/minilogo color sin fondo.png'
import './Auth.css'

const CODIGOS_TELEFONO = ['414', '424', '412', '422', '416', '426']
const PREFIJOS_RIF = ['V', 'E']
const PASOS = ['Datos', 'Documentos', 'Confirmación']

function RegistroProfesional() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  const [paso, setPaso] = useState(0)
  const [direccionPaso, setDireccionPaso] = useState('adelante')

  const [form, setForm] = useState({
    email: searchParams.get('email') || '',
    profesion: '',
    titulo: '',
    nombre: '',
    apellido: '',
    especialidad: '',
    rifPrefijo: 'V',
    rifDigitos: '',
    estado: '',
    ciudad: '',
    direccion_fiscal: '',
    telCodigo: '414',
    telDigitos: ''
  })
  const [cedulaArchivoUrl, setCedulaArchivoUrl] = useState('')
  const [rifArchivoUrl, setRifArchivoUrl] = useState('')
  const [certificadoUrl, setCertificadoUrl] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false)
  const [notifSistema, setNotifSistema] = useState(true)
  const [notifPromociones, setNotifPromociones] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [errores, setErrores] = useState({})
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState('')
  const [cargando, setCargando] = useState(false)
  const [registroCompleto, setRegistroCompleto] = useState(false)

  const especialidadesDisponibles = obtenerEspecialidades(form.profesion)
  const esProfesionOtro = form.profesion === 'otro'

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function cambiarProfesion(valor) {
    const opcionesTitulo = TITULOS_POR_DEFECTO[valor]
    setForm((prev) => ({
      ...prev,
      profesion: valor,
      titulo: opcionesTitulo ? opcionesTitulo[0] : '',
      especialidad: ''
    }))
  }

  function avanzarPaso() {
    setDireccionPaso('adelante')
    setPaso((prev) => prev + 1)
  }

  function retrocederPaso() {
    setDireccionPaso('atras')
    setPaso((prev) => prev - 1)
  }

  function irAtras() {
    if (paso > 0) {
      retrocederPaso()
      return
    }
    if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1)
    } else {
      navigate('/registro')
    }
  }

  function validarPaso0() {
    const nuevosErrores = {}

    if (!validarEmail(form.email)) nuevosErrores.email = 'Ingresa un correo válido'
    if (!form.profesion) nuevosErrores.profesion = 'Selecciona una profesión'
    if (!form.titulo.trim()) nuevosErrores.titulo = 'Campo requerido'
    if (!form.nombre.trim()) nuevosErrores.nombre = 'Campo requerido'
    if (!form.apellido.trim()) nuevosErrores.apellido = 'Campo requerido'

    const rifCheck = validarRifMedico(form.rifPrefijo, form.rifDigitos)
    if (!rifCheck.valido) nuevosErrores.rif = rifCheck.error

    if (!form.estado) nuevosErrores.estado = 'Selecciona un estado'
    if (!form.ciudad) nuevosErrores.ciudad = 'Selecciona una ciudad'

    const telCheck = validarTelefonoVenezuela(form.telCodigo, form.telDigitos)
    if (!telCheck.valido) nuevosErrores.telefono = telCheck.error

    if (form.direccion_fiscal.trim()) {
      const direccionCheck = validarDireccion(form.direccion_fiscal)
      if (!direccionCheck.valido) nuevosErrores.direccion_fiscal = direccionCheck.error
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  function validarPaso1() {
    const nuevosErrores = {}
    if (!cedulaArchivoUrl) nuevosErrores.cedula_archivo = 'Debes subir la cédula de identidad'
    if (!rifArchivoUrl) nuevosErrores.rif_archivo = 'Debes subir el RIF en PDF'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  function validarPaso2() {
    const nuevosErrores = {}
    if (!aceptaTerminos || !aceptaPrivacidad) nuevosErrores.terminos = 'Debes aceptar los términos y la política de privacidad'
    if (!validarPassword(password).valido) nuevosErrores.password = validarPassword(password).error || 'La contraseña no es válida'
    if (password !== confirmarPassword) nuevosErrores.confirmarPassword = 'Las contraseñas no coinciden'
    if (!turnstileToken) nuevosErrores.turnstile = 'Completa la verificación de seguridad'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  function handleSiguiente() {
    let valido = false
    if (paso === 0) valido = validarPaso0()
    else if (paso === 1) valido = validarPaso1()
    else if (paso === 2) valido = validarPaso2()

    if (!valido) {
      document.querySelector('.registro-input--error, [aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    if (paso < 2) {
      avanzarPaso()
    } else {
      handleSubmit()
    }
  }

  async function handleSubmit() {
    setErrorGeneral('')
    setCargando(true)
    try {
      const { rifFormateado } = validarRifMedico(form.rifPrefijo, form.rifDigitos)
      const { telefonoFormateado } = validarTelefonoVenezuela(form.telCodigo, form.telDigitos)

      await api.post('/auth/register', {
        email: form.email.trim().toLowerCase(),
        password,
        tipo_usuario: 'profesional',
        estado: form.estado,
        ciudad: form.ciudad,
        telefono: telefonoFormateado,
        notificaciones_sistema: notifSistema,
        notificaciones_promociones: notifPromociones,
        perfil: {
          profesion: form.profesion,
          titulo: form.titulo.trim(),
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          especialidad: form.especialidad || null,
          rif: rifFormateado,
          rif_archivo_url: rifArchivoUrl,
          cedula_archivo_url: cedulaArchivoUrl,
          certificado_acreditacion_url: certificadoUrl || null,
          direccion_fiscal: form.direccion_fiscal.trim() || null
        },
        turnstileToken,
      })

      await login(form.email.trim().toLowerCase(), password)
      setRegistroCompleto(true)
    } catch (err) {
      setErrorGeneral(err.response?.data?.error || 'No se pudo completar el registro. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  if (registroCompleto) {
    return (
      <div className="auth-page">
        <main className="auth-container">
          <div className="auth-exito-icono">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="auth-title">¡Registro exitoso!</h1>
          <p className="auth-subtitle">
            Tu cuenta fue creada con éxito. Ya podés explorar el catálogo cuando quieras.
          </p>
          <button className="auth-btn-primary" onClick={() => navigate('/')}>
            Ir a la tienda
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <main className="auth-container auth-container--registro">
        <Link to="/" className="auth-logo">
          <img src={logo} alt="Logo" className="logologin" />
        </Link>

        <div className="auth-card">
        <h1 className="auth-title">Registro Profesional de la Salud</h1>
        <p className="auth-subtitle">Médicos, enfermeros, bionalistas y demás profesionales de la salud</p>

        <Stepper pasos={PASOS} pasoActual={paso} />

        <div className={`registro-paso-contenedor ${direccionPaso === 'atras' ? 'registro-paso-contenedor--atras' : ''}`} key={paso}>
          {paso === 0 && (
            <>
              <div className="registro-campo">
                <label htmlFor="email">Correo electrónico (para iniciar sesión)</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => actualizarCampo('email', e.target.value)}
                  className={errores.email ? 'registro-input--error' : ''}
                  aria-invalid={!!errores.email}
                  aria-describedby={errores.email ? 'email-error' : undefined}
                />
                {errores.email && <span id="email-error" className="registro-error-texto" role="alert">{errores.email}</span>}
              </div>

              <div className="registro-campo">
                <label htmlFor="profesion">Profesión</label>
                <select
                  id="profesion"
                  value={form.profesion}
                  onChange={(e) => cambiarProfesion(e.target.value)}
                  className={errores.profesion ? 'registro-input--error' : ''}
                  aria-invalid={!!errores.profesion}
                  aria-describedby={errores.profesion ? 'profesion-error' : undefined}
                >
                  <option value="">Selecciona tu profesión</option>
                  {PROFESIONES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                {errores.profesion && <span id="profesion-error" className="registro-error-texto" role="alert">{errores.profesion}</span>}
              </div>

              {especialidadesDisponibles.length > 0 && (
                <div className="registro-campo">
                  <label htmlFor="especialidad">Especialidad</label>
                  <select
                    id="especialidad"
                    value={form.especialidad}
                    onChange={(e) => actualizarCampo('especialidad', e.target.value)}
                  >
                    <option value="">Selecciona una especialidad</option>
                    {especialidadesDisponibles.map((esp) => (
                      <option key={esp} value={esp}>{esp}</option>
                    ))}
                  </select>
                </div>
              )}

              {esProfesionOtro && (
                <div className="registro-campo">
                  <label htmlFor="especialidadLibre">Especialidad (opcional)</label>
                  <input
                    id="especialidadLibre"
                    value={form.especialidad}
                    onChange={(e) => actualizarCampo('especialidad', e.target.value)}
                  />
                </div>
              )}

              <div className="registro-campo-triple">
                <div className="registro-campo">
                  <label htmlFor="titulo">Título</label>
                  {esProfesionOtro || !TITULOS_POR_DEFECTO[form.profesion] ? (
                    <input
                      id="titulo"
                      placeholder="Ej: Ing., T.S.U."
                      value={form.titulo}
                      onChange={(e) => actualizarCampo('titulo', e.target.value)}
                      className={errores.titulo ? 'registro-input--error' : ''}
                      aria-invalid={!!errores.titulo}
                      aria-describedby={errores.titulo ? 'titulo-error' : undefined}
                    />
                  ) : (
                    <select
                      id="titulo"
                      value={form.titulo}
                      onChange={(e) => actualizarCampo('titulo', e.target.value)}
                      className={errores.titulo ? 'registro-input--error' : ''}
                      aria-invalid={!!errores.titulo}
                      aria-describedby={errores.titulo ? 'titulo-error' : undefined}
                    >
                      {TITULOS_POR_DEFECTO[form.profesion].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  )}
                  {errores.titulo && <span id="titulo-error" className="registro-error-texto" role="alert">{errores.titulo}</span>}
                </div>

                <div className="registro-campo">
                  <label htmlFor="nombre">Nombre</label>
                  <input
                    id="nombre"
                    value={form.nombre}
                    onChange={(e) => actualizarCampo('nombre', e.target.value)}
                    className={errores.nombre ? 'registro-input--error' : ''}
                    aria-invalid={!!errores.nombre}
                    aria-describedby={errores.nombre ? 'nombre-error' : undefined}
                  />
                  {errores.nombre && <span id="nombre-error" className="registro-error-texto" role="alert">{errores.nombre}</span>}
                </div>

                <div className="registro-campo">
                  <label htmlFor="apellido">Apellido</label>
                  <input
                    id="apellido"
                    value={form.apellido}
                    onChange={(e) => actualizarCampo('apellido', e.target.value)}
                    className={errores.apellido ? 'registro-input--error' : ''}
                    aria-invalid={!!errores.apellido}
                    aria-describedby={errores.apellido ? 'apellido-error' : undefined}
                  />
                  {errores.apellido && <span id="apellido-error" className="registro-error-texto" role="alert">{errores.apellido}</span>}
                </div>
              </div>

              <div className="registro-campo">
                <label htmlFor="rif">Cédula de Identidad</label>
                <div className="registro-campo-rif">
                  <select
                    value={form.rifPrefijo}
                    onChange={(e) => actualizarCampo('rifPrefijo', e.target.value)}
                    aria-label="Prefijo de cédula de identidad"
                    style={{ width: '70px', flexShrink: 0 }}
                  >
                    {PREFIJOS_RIF.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <input
                    id="rif"
                    inputMode="numeric"
                    maxLength={9}
                    placeholder="1234567"
                    value={form.rifDigitos}
                    onChange={(e) => actualizarCampo('rifDigitos', e.target.value.replace(/\D/g, ''))}
                    className={errores.rif ? 'registro-input--error' : ''}
                    aria-invalid={!!errores.rif}
                    aria-describedby={errores.rif ? 'rif-error' : undefined}
                  />
                </div>
                {errores.rif && <span id="rif-error" className="registro-error-texto" role="alert">{errores.rif}</span>}
              </div>

              <div className="registro-campo">
                <label htmlFor="telefono">Teléfono</label>
                <div className="registro-campo-telefono">
                  <select
                    value={form.telCodigo}
                    onChange={(e) => actualizarCampo('telCodigo', e.target.value)}
                    aria-label="Código de teléfono"
                  >
                    {CODIGOS_TELEFONO.map((c) => (
                      <option key={c} value={c}>0{c}</option>
                    ))}
                  </select>
                  <input
                    id="telefono"
                    inputMode="numeric"
                    maxLength={7}
                    placeholder="1234567"
                    value={form.telDigitos}
                    onChange={(e) => actualizarCampo('telDigitos', e.target.value.replace(/\D/g, ''))}
                    className={errores.telefono ? 'registro-input--error' : ''}
                    aria-invalid={!!errores.telefono}
                    aria-describedby={errores.telefono ? 'telefono-error' : undefined}
                  />
                </div>
                {errores.telefono && <span id="telefono-error" className="registro-error-texto" role="alert">{errores.telefono}</span>}
              </div>

              <SelectorEstadoCiudad
                estado={form.estado}
                ciudad={form.ciudad}
                onChangeEstado={(v) => actualizarCampo('estado', v)}
                onChangeCiudad={(v) => actualizarCampo('ciudad', v)}
                errorEstado={errores.estado}
                errorCiudad={errores.ciudad}
              />

              <div className="registro-campo">
                <label htmlFor="direccion_fiscal">Dirección fiscal (opcional)</label>
                <textarea
                  id="direccion_fiscal"
                  rows={2}
                  value={form.direccion_fiscal}
                  onChange={(e) => actualizarCampo('direccion_fiscal', e.target.value)}
                  className={errores.direccion_fiscal ? 'registro-input--error' : ''}
                  aria-invalid={!!errores.direccion_fiscal}
                  aria-describedby={errores.direccion_fiscal ? 'direccion_fiscal-error' : undefined}
                />
                {errores.direccion_fiscal && <span id="direccion_fiscal-error" className="registro-error-texto" role="alert">{errores.direccion_fiscal}</span>}
              </div>
            </>
          )}

          {paso === 1 && (
            <>
              <h3 className="registro-seccion-titulo-paso">Documentos requeridos</h3>

              <SubidaArchivoDrive
                tipoDocumento="cedula_identidad"
                etiqueta="Cédula de Identidad"
                obligatorio
                aceptaImagenes
                onSubida={setCedulaArchivoUrl}
                onQuitar={() => setCedulaArchivoUrl('')}
              />
              {errores.cedula_archivo && <span className="registro-error-texto" role="alert">{errores.cedula_archivo}</span>}

              <SubidaArchivoDrive
                tipoDocumento="rif"
                etiqueta="RIF"
                obligatorio
                onSubida={setRifArchivoUrl}
                onQuitar={() => setRifArchivoUrl('')}
              />
              {errores.rif_archivo && <span className="registro-error-texto" role="alert">{errores.rif_archivo}</span>}

              <SubidaArchivoDrive
                tipoDocumento="certificado_acreditacion"
                etiqueta="Certificado de acreditación profesional"
                onSubida={setCertificadoUrl}
                onQuitar={() => setCertificadoUrl('')}
              />
            </>
          )}

          {paso === 2 && (
            <>
              <div className="registro-notificaciones">
                <div className="registro-notif-grupo">
                  <label>¿Desea recibir notificaciones del sistema?</label>
                  <div className="registro-notif-opciones">
                    <label>
                      <input
                        type="radio"
                        name="notifSistema"
                        checked={notifSistema === true}
                        onChange={() => setNotifSistema(true)}
                      />
                      Sí
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="notifSistema"
                        checked={notifSistema === false}
                        onChange={() => setNotifSistema(false)}
                      />
                      No
                    </label>
                  </div>
                </div>

                <div className="registro-notif-grupo">
                  <label>¿Desea recibir notificaciones de promociones?</label>
                  <div className="registro-notif-opciones">
                    <label>
                      <input
                        type="radio"
                        name="notifPromociones"
                        checked={notifPromociones === true}
                        onChange={() => setNotifPromociones(true)}
                      />
                      Sí
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="notifPromociones"
                        checked={notifPromociones === false}
                        onChange={() => setNotifPromociones(false)}
                      />
                      No
                    </label>
                  </div>
                </div>
              </div>

              <label className={`registro-checkbox${errores.terminos && !aceptaTerminos ? ' registro-checkbox--error' : ''}`}>
                <input
                  type="checkbox"
                  checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                />
                <span>
                  He leído y acepto los <Link to="/terminos">Términos y Condiciones</Link>
                </span>
              </label>

              <label className={`registro-checkbox${errores.terminos && !aceptaPrivacidad ? ' registro-checkbox--error' : ''}`}>
                <input
                  type="checkbox"
                  checked={aceptaPrivacidad}
                  onChange={(e) => setAceptaPrivacidad(e.target.checked)}
                />
                <span>
                  He leído y acepto la <Link to="/privacidad">Política de Privacidad</Link>
                </span>
              </label>
              {errores.terminos && <span id="terminos-error" className="registro-error-texto" role="alert">{errores.terminos}</span>}

              <div className="registro-campo">
                <label htmlFor="password">Contraseña</label>
                <div className="registro-input-con-toggle" style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={mostrarPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    className={errores.password ? 'registro-input--error' : ''}
                    aria-invalid={!!errores.password}
                    aria-describedby={errores.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword((prev) => !prev)}
                    aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={mostrarPassword}
                    className="registro-password-toggle"
                  >
                    {mostrarPassword ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
                {errores.password && <span id="password-error" className="registro-error-texto" role="alert">{errores.password}</span>}
                {password.length > 0 && !errores.password && <PasswordStrength password={password} />}
              </div>

              <div className="registro-campo">
                <label htmlFor="confirmar-password">Confirmar contraseña</label>
                <div className="registro-input-con-toggle" style={{ position: 'relative' }}>
                  <input
                    id="confirmar-password"
                    type={mostrarPassword ? 'text' : 'password'}
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                    placeholder="Repetí tu contraseña"
                    autoComplete="new-password"
                    className={errores.confirmarPassword ? 'registro-input--error' : ''}
                    aria-invalid={!!errores.confirmarPassword}
                    aria-describedby={errores.confirmarPassword ? 'confirmar-password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword((prev) => !prev)}
                    aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={mostrarPassword}
                    className="registro-password-toggle"
                  >
                    {mostrarPassword ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
                {errores.confirmarPassword && <span id="confirmar-password-error" className="registro-error-texto" role="alert">{errores.confirmarPassword}</span>}
              </div>

              <TurnstileWidget onVerificado={setTurnstileToken} onExpirado={() => setTurnstileToken('')} />
              {errores.turnstile && <span className="registro-error-texto" role="alert">{errores.turnstile}</span>}

              {errorGeneral && <p className="auth-error" role="alert">{errorGeneral}</p>}
            </>
          )}
        </div>

        <div className="registro-nav-botones">
          <button type="button" className="registro-btn-atras" onClick={irAtras}>
            ← Atrás
          </button>
          <button
            type="button"
            className="registro-btn-siguiente"
            onClick={handleSiguiente}
            disabled={cargando}
          >
            {paso === 2 ? (cargando ? 'Creando cuenta...' : 'Crear cuenta') : 'Siguiente'}
          </button>
        </div>
        </div>
      </main>

      <footer className="auth-footer">
        <div className="auth-footer-content">
          © 2026 Drogueria Carrisan, C.A. Todos los derechos reservados.
          <div className="auth-footer-links">
            <Link to="/terminos">Términos de uso</Link>
            <Link to="/privacidad">Aviso de privacidad</Link>
            <Link to="/contacto">Soporte</Link>
          </div>
          <span className="auth-footer-rif">RIF J-40068410-2</span>
        </div>
      </footer>
    </div>
  )
}

export default RegistroProfesional
