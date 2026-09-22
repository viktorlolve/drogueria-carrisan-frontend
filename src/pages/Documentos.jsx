import { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../api/axios'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import { Download, Clock } from 'lucide-react'
import './Documentos.css'

// Mismo catálogo que TIPOS_DOCUMENTO del backend, solo para pintar las
// opciones — si agregas un tipo nuevo allá, replica la entrada acá.
const TIPOS = [
  { id: 'rif', label: 'RIF', automatica: true, desc: 'Descarga inmediata, válida por 72 horas' },
  { id: 'estado_cuenta', label: 'Estado de cuenta', automatica: false, desc: 'Te lo enviamos a tu correo' },
  { id: 'referencia_comercial', label: 'Referencia comercial', automatica: true, desc: 'Se genera al instante con tus datos' },
  { id: 'otro', label: 'Otro documento', automatica: false, desc: 'Cuéntanos qué necesitas' },
]

// RIF: el backend ya resuelve el enlace fijo de Drive (env var
// URL_DOCUMENTO_RIF), aprueba la solicitud al instante y calcula
// fecha_expiracion (72h) + el enfriamiento de 72h más. Acá solo leemos
// esos datos de la solicitud más reciente.
const RIF_ENFRIAMIENTO_MS = 72 * 60 * 60 * 1000

const NOVENTA_DIAS_MS = 90 * 24 * 60 * 60 * 1000

// ── Utilidades de tiempo ────────────────────────────────────────────
function descomponerTiempo(ms) {
  if (ms <= 0) return { dias: 0, horas: 0, minutos: 0 }
  const dias = Math.floor(ms / (1000 * 60 * 60 * 24))
  const horas = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutos = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return { dias, horas, minutos }
}

function formatoCorto({ dias, horas, minutos }) {
  if (dias > 0) return `${dias}d ${horas}h ${minutos}m`
  if (horas > 0) return `${horas}h ${minutos}m`
  return `${minutos}m`
}

// Cronómetro simple y discreto: solo días/horas/minutos, se refresca cada minuto.
function Cronometro({ hasta, texto }) {
  const [ahora, setAhora] = useState(null)

  useEffect(() => {
    const primero = setTimeout(() => setAhora(Date.now()), 0)
    const id = setInterval(() => setAhora(Date.now()), 60000)
    return () => { clearTimeout(primero); clearInterval(id) }
  }, [])

  const restante = hasta - (ahora ?? hasta)
  if (restante <= 0) return null

  return (
    <p className="doc-cronometro">
      <Clock size={12} />
      <span>{texto} {formatoCorto(descomponerTiempo(restante))}</span>
    </p>
  )
}

// ── Estado del RIF, derivado de la solicitud automática más reciente ──
// que devuelve GET /documentos/mios (ya viene ordenada por fecha_solicitud
// descendente, así que la primera que encontremos es la última).
function useEstadoRif(solicitudes, solicitarRif) {
  const [ahora, setAhora] = useState(null)

  useEffect(() => {
    const primero = setTimeout(() => setAhora(Date.now()), 0)
    const id = setInterval(() => setAhora(Date.now()), 60000)
    return () => { clearTimeout(primero); clearInterval(id) }
  }, [])

  const ultima = solicitudes.find((s) => s.tipo_documento === 'rif' && s.es_automatica)
  const t = ahora ?? 0

  let estado = 'disponible'
  let expiraEn = null
  let habilitaEn = null

  if (ultima) {
    if (ultima.url_documento) {
      // El backend ya nos manda null si venció; si hay url, seguimos dentro de las 72h.
      estado = 'descargable'
      expiraEn = new Date(ultima.fecha_expiracion).getTime()
    } else if (ultima.fecha_expiracion) {
      habilitaEn = new Date(ultima.fecha_expiracion).getTime() + RIF_ENFRIAMIENTO_MS
      if (t < habilitaEn) estado = 'enfriamiento'
    }
  }

  function descargar() {
    if (!ultima?.url_documento) return
    window.open(ultima.url_documento, '_blank', 'noreferrer')
  }

  return { estado, expiraEn, habilitaEn, descargar, solicitar: solicitarRif }
}

// ── Referencia comercial: PDF armado en el navegador con los datos      ──
// del cliente. El texto y la firma son siempre los mismos, solo cambia
// el nombre y la cédula/RIF. jsPDF se importa dinámico (se descarga solo
// al generar la referencia, no en el bundle inicial).
async function generarReferenciaPDF({ nombre, identificacion }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margenX = 72
  const anchoTexto = 468
  let y = 90

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('DROGUERÍA CARRISAN, C.A.', margenX, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  y += 16
  const fecha = new Date().toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`Caracas, ${fecha}`, margenX, y)

  y += 50
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('REFERENCIA COMERCIAL', 306, y, { align: 'center' })

  y += 30
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('A quien pueda interesar:', margenX, y)

  y += 26
  const parrafo1 =
    `Por medio de la presente, Droguería Carrisan, C.A. hace constar que ${nombre}, ` +
    `titular de la Cédula/RIF N.° ${identificacion}, es cliente comercial de nuestra empresa, ` +
    `con quien mantenemos relaciones comerciales activas.`
  const lineas1 = doc.splitTextToSize(parrafo1, anchoTexto)
  doc.text(lineas1, margenX, y)
  y += lineas1.length * 15 + 14

  const parrafo2 =
    'Durante este tiempo, el cliente ha manejado montos de siete (7) cifras o más de forma ' +
    'trimestral, cumpliendo satisfactoriamente con sus compromisos comerciales.'
  const lineas2 = doc.splitTextToSize(parrafo2, anchoTexto)
  doc.text(lineas2, margenX, y)
  y += lineas2.length * 15 + 14

  const parrafo3 =
    'La presente referencia se emite a solicitud del interesado, para los fines que estime conveniente.'
  const lineas3 = doc.splitTextToSize(parrafo3, anchoTexto)
  doc.text(lineas3, margenX, y)
  y += lineas3.length * 15 + 36

  doc.text('Sin otro particular,', margenX, y)
  y += 24
  doc.text('Atentamente,', margenX, y)

  // Espacio para la firma
  y += 70
  doc.line(margenX, y, margenX + 220, y)
  y += 16
  doc.setFont('helvetica', 'bold')
  doc.text('Victor H. Carrillo S.', margenX, y)
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.text('Director General', margenX, y)
  y += 14
  doc.text('Droguería Carrisan, C.A.', margenX, y)

  const slug = nombre.trim().toLowerCase().replace(/\s+/g, '-')
  doc.save(`referencia-comercial-${slug}.pdf`)
}

function TarjetaTipo({ tipo, onSolicitar, enviando, rif }) {
  const [mostrarNota, setMostrarNota] = useState(false)
  const [descripcion, setDescripcion] = useState('')

  if (tipo.id === 'otro' && mostrarNota) {
    return (
      <div className="doc-tipo doc-tipo--form">
        <p className="doc-tipo__label">{tipo.label}</p>
        <textarea
          placeholder="¿Qué documento necesitas?"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          className="doc-tipo__textarea"
        />
        <button
          className="doc-tipo__btn"
          onClick={() => onSolicitar(tipo.id, descripcion)}
          disabled={!descripcion.trim() || enviando}
        >
          Enviar solicitud
        </button>
      </div>
    )
  }

  // RIF: la tarjeta cambia de estado sola (solicitar → descargar → enfriamiento)
  if (tipo.id === 'rif') {
    return (
      <div className="doc-tipo">
        <p className="doc-tipo__label">{tipo.label}</p>
        <p className="doc-tipo__desc">{tipo.desc}</p>

        {rif.estado === 'descargable' && (
          <>
            <button className="doc-tipo__btn doc-tipo__btn--descargar" onClick={rif.descargar}>
              <Download size={14} /> Descargar
            </button>
            <Cronometro hasta={rif.expiraEn} texto="Disponible por" />
          </>
        )}

        {rif.estado === 'enfriamiento' && (
          <>
            <button className="doc-tipo__btn" disabled>
              Solicitar
            </button>
            <Cronometro hasta={rif.habilitaEn} texto="Disponible de nuevo en" />
          </>
        )}

        {rif.estado === 'disponible' && (
          <button className="doc-tipo__btn" onClick={rif.solicitar} disabled={enviando}>
            Solicitar
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="doc-tipo">
      <p className="doc-tipo__label">{tipo.label}</p>
      <p className="doc-tipo__desc">{tipo.desc}</p>
      <button
        className="doc-tipo__btn"
        onClick={() => (tipo.id === 'otro' ? setMostrarNota(true) : onSolicitar(tipo.id))}
        disabled={enviando}
      >
        Solicitar
      </button>
    </div>
  )
}

function SolicitudCard({ solicitud }) {
  const tipo = TIPOS.find((t) => t.id === solicitud.tipo_documento)

  return (
    <div className="doc-card">
      <div className="doc-card__top">
        <span className="doc-card__nombre">{tipo?.label || solicitud.tipo_documento}</span>
        <span className={`doc-card__estado doc-card__estado--${solicitud.estado}`}>
          {solicitud.estado === 'pendiente' && 'En revisión'}
          {solicitud.estado === 'aprobada' && (solicitud.es_automatica ? 'Entregado' : 'Aprobada')}
          {solicitud.estado === 'rechazada' && 'Rechazada'}
        </span>
      </div>

      {solicitud.descripcion && <p className="doc-card__desc">{solicitud.descripcion}</p>}

      {solicitud.estado === 'aprobada' && solicitud.es_automatica && solicitud.tipo_documento === 'rif' && (
        <p className="doc-card__nota">Disponible para descarga arriba, mientras esté vigente</p>
      )}

      {solicitud.estado === 'aprobada' && solicitud.es_automatica && solicitud.tipo_documento === 'referencia_comercial' && (
        <p className="doc-card__nota">Generada al instante con tus datos</p>
      )}

      {solicitud.estado === 'aprobada' && !solicitud.es_automatica && (
        <p className="doc-card__nota">Lo enviamos a tu correo registrado</p>
      )}

      {solicitud.estado === 'rechazada' && solicitud.nota_admin && (
        <p className="doc-card__nota">{solicitud.nota_admin}</p>
      )}
    </div>
  )
}

// Campo real confirmado en documentos.controller.js: fecha_solicitud.
function obtenerFechaCreacion(solicitud) {
  return solicitud.fecha_solicitud ? new Date(solicitud.fecha_solicitud) : null
}

function Documentos() {
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [ahora, setAhora] = useState(null)

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/documentos/mios')
      setSolicitudes(data)
    } catch (err) {
      console.error('Error al cargar documentos', err)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    async function iniciar() {
      await cargar()
    }
    iniciar()
  }, [cargar])

  useEffect(() => {
    const primero = setTimeout(() => setAhora(Date.now()), 0)
    const id = setInterval(() => setAhora(Date.now()), 60000)
    return () => { clearTimeout(primero); clearInterval(id) }
  }, [])

  async function handleSolicitar(tipo_documento, descripcion) {
    setEnviando(true)
    try {
      const { data } = await api.post('/documentos', { tipo_documento, descripcion })

      // RIF: la descarga arranca de una vez, sin esperar al refresh de la lista.
      if (tipo_documento === 'rif' && data.es_automatica && data.url_documento) {
        window.open(data.url_documento, '_blank', 'noreferrer')
      }

      // Referencia comercial: el PDF se arma en el momento con los datos que mandó el backend.
      if (tipo_documento === 'referencia_comercial') {
        const { nombre, identificacion } = data.datos_cliente || {}
        if (!nombre || !identificacion) {
          alert('Tu perfil no tiene registrada la cédula o RIF. Actualízalo antes de generar la referencia.')
        } else {
          await generarReferenciaPDF({ nombre, identificacion })
        }
      }

      cargar()
    } catch (err) {
      if (err.response?.status === 429) {
        alert(err.response.data?.error || 'Todavía no puedes solicitar este documento de nuevo')
      } else {
        alert(err.response?.data?.error || 'Error al solicitar el documento')
      }
    } finally {
      setEnviando(false)
    }
  }

  const rif = useEstadoRif(solicitudes, () => handleSolicitar('rif'))

  // Solo mostramos actividad de los últimos 90 días; pasado ese tiempo se
  // consideran limpiadas de la vista. El borrado real en la base de datos
  // necesita un job en el backend — avísame si quieres que lo armemos.
  const solicitudesRecientes = useMemo(() => {
    const limite = (ahora ?? 0) - NOVENTA_DIAS_MS
    return solicitudes.filter((s) => {
      const fecha = obtenerFechaCreacion(s)
      return !fecha || fecha.getTime() >= limite
    })
  }, [solicitudes, ahora])

  return (
    <LayoutPaginaPrincipal activo="documentos" titulo="Documentos" nav={NAV_UNIFICADO}>
      <div className="doc-page">
        <div className="doc-tipos">
          {TIPOS.map((tipo) => (
            <TarjetaTipo
              key={tipo.id}
              tipo={tipo}
              onSolicitar={handleSolicitar}
              enviando={enviando}
              rif={rif}
            />
          ))}
        </div>

        {!cargando && solicitudesRecientes.length > 0 && (
          <div className="doc-historial">
            <h2 className="doc-historial__titulo">Actividad reciente</h2>
            <div className="doc-lista">
              {solicitudesRecientes.map((s) => (
                <SolicitudCard key={s.id} solicitud={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </LayoutPaginaPrincipal>
  )
}

export default Documentos
