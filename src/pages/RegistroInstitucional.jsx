import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Building2, FileCheck2, ShieldCheck } from 'lucide-react'
import SelectorEstadoCiudad from '../components/registro/SelectorEstadoCiudad'
import SelectorHorarioSemanal from '../components/registro/SelectorHorarioSemanal'
import SubidaArchivoDrive from '../components/registro/SubidaArchivoDrive'
import TurnstileWidget from '../components/registro/TurnstileWidget'
import PasswordStrength from '../components/registro/PasswordStrength'
import { TIPOS_INSTITUCION } from '../data/tiposInstitucion'
import {
  validarEmail,
  validarRifInstitucion,
  validarTelefonoVenezuela,
  validarDireccion,
  validarNombreInstitucion,
  validarPassword
} from '../utils/validadores'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import logo from '../assets/minilogo color sin fondo.png'
import './Auth.css'

const CODIGOS_TELEFONO = ['414', '424', '412', '422', '416', '426']

/* Metadata de cada paso: título corto (barra de progreso), título/descr.
   dentro de la card, e ícono. Reemplaza al <Stepper> compartido —
   esta página usa su propia barra de progreso (ver Auth.css .reginst-*). */
const PASOS = [
  {
    corto: 'Datos',
    titulo: 'Datos de tu institución',
    descripcion: 'Información básica para crear tu cuenta',
    icono: Building2,
  },
  {
    corto: 'Documentos',
    titulo: 'Documentos',
    descripcion: 'RIF obligatorio + opcionales para línea de crédito',
    icono: FileCheck2,
  },
  {
    corto: 'Confirmación',
    titulo: 'Crea tu contraseña',
    descripcion: 'Último paso para activar tu cuenta',
    icono: ShieldCheck,
  },
]

function RegistroInstitucional() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  const [paso, setPaso] = useState(0)
  const [direccionPaso, setDireccionPaso] = useState('adelante')

  const [form, setForm] = useState({
    email: searchParams.get('email') || '',
    razon_social: '',
    nombre_comercial: '',
    tipo_institucion: '',
    rifDigitos: '',
    estado: '',
    ciudad: '',
    direccion_fiscal: '',
    telInstCodigo: '414',
    telInstDigitos: '',
    nombre_representante: '',
    telRepCodigo: '414',
    telRepDigitos: ''
  })
  const [horarioRecepcion, setHorarioRecepcion] = useState(null)
  const [rifArchivoUrl, setRifArchivoUrl] = useState('')
  const [permisoSanitarioUrl, setPermisoSanitarioUrl] = useState('')
  const [cedulaFarmaceuticoUrl, setCedulaFarmaceuticoUrl] = useState('')
  const [tituloFarmaceuticoUrl, setTituloFarmaceuticoUrl] = useState('')
  const [autorizacionDirectorUrl, setAutorizacionDirectorUrl] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false)
  const [aceptaComercial, setAceptaComercial] = useState(false)
  const [notifSistema, setNotifSistema] = useState(true)
  const [notifPromociones, setNotifPromociones] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [cargando, setCargando] = useState(false)
  const [registroCompleto, setRegistroCompleto] = useState(false)

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
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

    const nombreCheck = validarNombreInstitucion(form.razon_social)
    if (!nombreCheck.valido) nuevosErrores.razon_social = nombreCheck.error

    if (!form.tipo_institucion) nuevosErrores.tipo_institucion = 'Selecciona un tipo'

    const rifCheck = validarRifInstitucion(form.rifDigitos)
    if (!rifCheck.valido) nuevosErrores.rif = rifCheck.error

    if (!form.estado) nuevosErrores.estado = 'Selecciona un estado'
    if (!form.ciudad) nuevosErrores.ciudad = 'Selecciona una ciudad'

    const direccionCheck = validarDireccion(form.direccion_fiscal)
    if (!direccionCheck.valido) nuevosErrores.direccion_fiscal = direccionCheck.error

    const telInstCheck = validarTelefonoVenezuela(form.telInstCodigo, form.telInstDigitos)
    if (!telInstCheck.valido) nuevosErrores.telefono_institucional = telInstCheck.error

    if (!form.nombre_representante.trim()) nuevosErrores.nombre_representante = 'Campo requerido'

    const telRepCheck = validarTelefonoVenezuela(form.telRepCodigo, form.telRepDigitos)
    if (!telRepCheck.valido) nuevosErrores.telefono_representante = telRepCheck.error

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  function validarPaso1() {
    const nuevosErrores = {}
    if (!rifArchivoUrl) nuevosErrores.rif_archivo = 'Debes subir el RIF en PDF'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  function validarPaso2() {
    const nuevosErrores = {}
    if (!aceptaTerminos || !aceptaPrivacidad || !aceptaComercial) nuevosErrores.terminos = 'Debes aceptar los 3 términos para continuar'
    const passwordCheck = validarPassword(password)
    if (!passwordCheck.valido) nuevosErrores.password = passwordCheck.error
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
      const { rifFormateado } = validarRifInstitucion(form.rifDigitos)
      const { telefonoFormateado: telInstFormateado } = validarTelefonoVenezuela(form.telInstCodigo, form.telInstDigitos)
      const { telefonoFormateado: telRepFormateado } = validarTelefonoVenezuela(form.telRepCodigo, form.telRepDigitos)

      await api.post('/auth/register', {
        email: form.email.trim().toLowerCase(),
        password,
        tipo_usuario: 'institucional',
        estado: form.estado,
        ciudad: form.ciudad,
        telefono: telInstFormateado,
        notificaciones_sistema: notifSistema,
        notificaciones_promociones: notifPromociones,
        perfil: {
          razon_social: form.razon_social.trim(),
          nombre_comercial: form.nombre_comercial || null,
          tipo_institucion: form.tipo_institucion,
          rif: rifFormateado,
          rif_archivo_url: rifArchivoUrl,
          permiso_sanitario_url: permisoSanitarioUrl || null,
          cedula_farmaceutico_url: cedulaFarmaceuticoUrl || null,
          titulo_farmaceutico_url: tituloFarmaceuticoUrl || null,
          autorizacion_director_url: autorizacionDirectorUrl || null,
          direccion_fiscal: form.direccion_fiscal.trim(),
          telefono_institucional: telInstFormateado,
          horario_recepcion: horarioRecepcion,
          nombre_representante: form.nombre_representante.trim(),
          telefono_representante: telRepFormateado
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

  // Chip de resumen persistente: aparece desde que hay razón social,
  // acompaña al usuario en los pasos 2 y 3 como recordatorio de qué cuenta está creando.
  const mostrarResumen = paso > 0 && form.razon_social.trim()
  const IconoPaso = PASOS[paso].icono

  return (
    <div className="auth-page reginst-page">
      <header className="reginst-topbar">
        <Link to="/" className="auth-logo" style={{ margin: 0 }}>
          <img src={logo} alt="Logo" className="logologin" style={{ margin: 0 }} />
        </Link>
        <Link to="/login" className="reginst-topbar-link">
          ¿Ya tenés cuenta? Iniciá sesión
        </Link>
      </header>

      <main className="reginst-main">
        <div className="reginst-head">
          <h1>Registro institucional</h1>
          <p>Clínicas, farmacias, centros quirúrgicos y demás instituciones de salud</p>
        </div>

        {/* Barra de progreso grande */}
        <nav className="reginst-progreso" aria-label={`Paso ${paso + 1} de ${PASOS.length}`}>
          {PASOS.map((p, i) => {
            const completado = i < paso
            const activo = i === paso
            return (
              <div
                key={p.corto}
                className={`reginst-progreso__paso${completado ? ' reginst-progreso__paso--completado' : ''}${activo ? ' reginst-progreso__paso--activo' : ''}`}
                aria-current={activo ? 'step' : undefined}
              >
                <div className="reginst-progreso__linea" aria-hidden="true" />
                <div className="reginst-progreso__circulo">
                  {completado ? (
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="reginst-progreso__label">{p.corto}</span>
              </div>
            )
          })}
        </nav>

        {mostrarResumen && (
          <div className="reginst-resumen-chip">
            <Building2 size={15} aria-hidden="true" />
            <span>{form.nombre_comercial || form.razon_social}</span>
            {form.rifDigitos && <span className="reginst-resumen-chip__rif">RIF J-{form.rifDigitos}</span>}
          </div>
        )}

        <div className="reginst-card">
          <div className="reginst-paso-titulo">
            <span className="reginst-paso-titulo__icono">
              <IconoPaso size={19} aria-hidden="true" />
            </span>
            <div>
              <h2>{PASOS[paso].titulo}</h2>
              <p>{PASOS[paso].descripcion}</p>
            </div>
          </div>

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
                  <label htmlFor="tipo_institucion">Tipo de institución</label>
                  <select
                    id="tipo_institucion"
                    value={form.tipo_institucion}
                    onChange={(e) => actualizarCampo('tipo_institucion', e.target.value)}
                    className={errores.tipo_institucion ? 'registro-input--error' : ''}
                    aria-invalid={!!errores.tipo_institucion}
                    aria-describedby={errores.tipo_institucion ? 'tipo_institucion-error' : undefined}
                  >
                    <option value="">Selecciona un tipo</option>
                    {TIPOS_INSTITUCION.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {errores.tipo_institucion && <span id="tipo_institucion-error" className="registro-error-texto" role="alert">{errores.tipo_institucion}</span>}
                </div>

                <div className="registro-campo">
                  <label htmlFor="razon_social">Razón social</label>
                  <input
                    id="razon_social"
                    value={form.razon_social}
                    onChange={(e) => actualizarCampo('razon_social', e.target.value)}
                    className={errores.razon_social ? 'registro-input--error' : ''}
                    aria-invalid={!!errores.razon_social}
                    aria-describedby={errores.razon_social ? 'razon_social-error' : undefined}
                  />
                  {errores.razon_social && <span id="razon_social-error" className="registro-error-texto" role="alert">{errores.razon_social}</span>}
                </div>

                <div className="registro-campo">
                  <label htmlFor="nombre_comercial">Nombre comercial (opcional)</label>
                  <input
                    id="nombre_comercial"
                    value={form.nombre_comercial}
                    onChange={(e) => actualizarCampo('nombre_comercial', e.target.value)}
                    onFocus={() => {
                      if (!form.nombre_comercial.trim() && form.razon_social.trim()) {
                        actualizarCampo('nombre_comercial', form.razon_social.trim())
                      }
                    }}
                  />
                  <p className="registro-ayuda">
                    El nombre con el que te conocen comercialmente (ej. "Farmacia MiFarma"). Se copia automáticamente de la razón social; puedes editarlo.
                  </p>
                </div>

                <div className="registro-campo-doble">
                  <div className="registro-campo">
                    <label htmlFor="rif">RIF</label>
                    <div className="registro-campo-rif">
                      <span className="registro-campo-rif-prefijo">J-</span>
                      <input
                        id="rif"
                        inputMode="numeric"
                        maxLength={9}
                        placeholder="123456789"
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
                    <label htmlFor="telefono_institucional">Teléfono institucional</label>
                    <div className="registro-campo-telefono">
                      <select
                        value={form.telInstCodigo}
                        onChange={(e) => actualizarCampo('telInstCodigo', e.target.value)}
                        aria-label="Código de teléfono institucional"
                      >
                        {CODIGOS_TELEFONO.map((c) => (
                          <option key={c} value={c}>0{c}</option>
                        ))}
                      </select>
                      <input
                        inputMode="numeric"
                        maxLength={7}
                        placeholder="1234567"
                        value={form.telInstDigitos}
                        onChange={(e) => actualizarCampo('telInstDigitos', e.target.value.replace(/\D/g, ''))}
                        className={errores.telefono_institucional ? 'registro-input--error' : ''}
                        aria-invalid={!!errores.telefono_institucional}
                        aria-describedby={errores.telefono_institucional ? 'telefono_institucional-error' : undefined}
                      />
                    </div>
                    {errores.telefono_institucional && <span id="telefono_institucional-error" className="registro-error-texto" role="alert">{errores.telefono_institucional}</span>}
                  </div>
                </div>

                <div className="registro-campo">
                  <label htmlFor="direccion_fiscal">Dirección fiscal</label>
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
                  <p className="registro-ayuda">
                    Debe ser la dirección que aparece en tu RIF. La dirección de entrega la agregarás cuando realices tu primer pedido.
                  </p>
                </div>

                <SelectorEstadoCiudad
                  estado={form.estado}
                  ciudad={form.ciudad}
                  onChangeEstado={(v) => actualizarCampo('estado', v)}
                  onChangeCiudad={(v) => actualizarCampo('ciudad', v)}
                  errorEstado={errores.estado}
                  errorCiudad={errores.ciudad}
                />

                <div className="registro-campo-doble">
                  <div className="registro-campo">
                    <label htmlFor="nombre_representante">Nombre del representante</label>
                    <input
                      id="nombre_representante"
                      value={form.nombre_representante}
                      onChange={(e) => actualizarCampo('nombre_representante', e.target.value)}
                      className={errores.nombre_representante ? 'registro-input--error' : ''}
                      aria-invalid={!!errores.nombre_representante}
                      aria-describedby={errores.nombre_representante ? 'nombre_representante-error' : undefined}
                    />
                    {errores.nombre_representante && <span id="nombre_representante-error" className="registro-error-texto" role="alert">{errores.nombre_representante}</span>}
                  </div>
                  <div className="registro-campo">
                    <label htmlFor="telefono_representante">Teléfono del representante</label>
                    <div className="registro-campo-telefono">
                      <select
                        value={form.telRepCodigo}
                        onChange={(e) => actualizarCampo('telRepCodigo', e.target.value)}
                        aria-label="Código de teléfono del representante"
                      >
                        {CODIGOS_TELEFONO.map((c) => (
                          <option key={c} value={c}>0{c}</option>
                        ))}
                      </select>
                      <input
                        inputMode="numeric"
                        maxLength={7}
                        placeholder="1234567"
                        value={form.telRepDigitos}
                        onChange={(e) => actualizarCampo('telRepDigitos', e.target.value.replace(/\D/g, ''))}
                        className={errores.telefono_representante ? 'registro-input--error' : ''}
                        aria-invalid={!!errores.telefono_representante}
                        aria-describedby={errores.telefono_representante ? 'telefono_representante-error' : undefined}
                      />
                    </div>
                    {errores.telefono_representante && <span id="telefono_representante-error" className="registro-error-texto" role="alert">{errores.telefono_representante}</span>}
                  </div>
                </div>

                <div className="registro-campo">
                  <label>Horario de recepción de pedidos</label>
                  <SelectorHorarioSemanal value={horarioRecepcion} onChange={setHorarioRecepcion} />
                </div>
              </>
            )}

            {paso === 1 && (
              <>
                <div className="reginst-doc-destacado">
                  <SubidaArchivoDrive
                    tipoDocumento="rif"
                    etiqueta="RIF"
                    obligatorio
                    onSubida={setRifArchivoUrl}
                    onQuitar={() => setRifArchivoUrl('')}
                  />
                  {errores.rif_archivo && <span id="rif_archivo-error" className="registro-error-texto" role="alert">{errores.rif_archivo}</span>}
                </div>

                <h3 className="registro-seccion-titulo-paso">Documentos para línea de crédito (opcionales)</h3>
                <p className="registro-seccion-explicacion">
                  Estos documentos no son requeridos para abrir tu código con nosotros. Son necesarios para completar el trámite de línea de crédito; puedes cargarlos ahora o entregarlos/enviarlos directamente a los asesores de la Droguería más adelante.
                </p>

                <div className="reginst-doc-grid">
                  <SubidaArchivoDrive
                    tipoDocumento="permiso_sanitario"
                    etiqueta="Permiso Sanitario de Funcionamiento"
                    onSubida={setPermisoSanitarioUrl}
                    onQuitar={() => setPermisoSanitarioUrl('')}
                  />

                  <SubidaArchivoDrive
                    tipoDocumento="cedula_farmaceutico_regente"
                    etiqueta="Cédula Farmacéutico Regente"
                    onSubida={setCedulaFarmaceuticoUrl}
                    onQuitar={() => setCedulaFarmaceuticoUrl('')}
                  />

                  <SubidaArchivoDrive
                    tipoDocumento="titulo_farmaceutico_regente"
                    etiqueta="Título Farmacéutico Regente"
                    onSubida={setTituloFarmaceuticoUrl}
                    onQuitar={() => setTituloFarmaceuticoUrl('')}
                  />

                  <SubidaArchivoDrive
                    tipoDocumento="autorizacion_director_medico"
                    etiqueta="Autorización del Director Médico u otro ente gestor de la institución"
                    onSubida={setAutorizacionDirectorUrl}
                    onQuitar={() => setAutorizacionDirectorUrl('')}
                  />
                </div>

                <div className="registro-planilla-fila">
                  <span className="registro-ayuda">¿Necesitas el modelo de autorización?</span>
                  <a className="registro-btn-planilla" href="/planillas/autorizacion_director.doc" download>
                    Descargar planilla
                  </a>
                </div>
              </>
            )}

            {paso === 2 && (
              <>
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
                      className="registro-password-toggle"
                    >
                      {mostrarPassword ? (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {password.length >= 1 && <PasswordStrength password={password} />}
                  {errores.password && <span id="password-error" className="registro-error-texto" role="alert">{errores.password}</span>}
                </div>

                <div className="registro-campo">
                  <label htmlFor="confirmar-password">Confirmar contraseña</label>
                  <div className="registro-input-con-toggle" style={{ position: 'relative' }}>
                    <input
                      id="confirmar-password"
                      type={mostrarConfirmarPassword ? 'text' : 'password'}
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
                      onClick={() => setMostrarConfirmarPassword((prev) => !prev)}
                      aria-label={mostrarConfirmarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="registro-password-toggle"
                    >
                      {mostrarConfirmarPassword ? (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errores.confirmarPassword && <span id="confirmar-password-error" className="registro-error-texto" role="alert">{errores.confirmarPassword}</span>}
                </div>

                <div className="registro-notificaciones">
                  <p className="registro-notif-nota">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    Notificaciones desde la web (no al correo)
                  </p>
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

                <label className={`registro-checkbox${errores.terminos && !aceptaComercial ? ' registro-checkbox--error' : ''}`}>
                  <input
                    type="checkbox"
                    checked={aceptaComercial}
                    onChange={(e) => setAceptaComercial(e.target.checked)}
                  />
                  <span>
                    He leído y acepto la <Link to="/terminoscomerciales">Política Comercial</Link>
                  </span>
                </label>
                {errores.terminos && <span id="terminos-error" className="registro-error-texto" role="alert">{errores.terminos}</span>}

                <TurnstileWidget onVerificado={setTurnstileToken} onExpirado={() => setTurnstileToken('')} />
                {errores.turnstile && <span id="turnstile-error" className="registro-error-texto" role="alert">{errores.turnstile}</span>}

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

export default RegistroInstitucional