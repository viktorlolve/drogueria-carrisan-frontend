import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, MessageCircle, Package, ArrowLeft, Clock } from 'lucide-react'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import './Chat.css'

// ---------------------------------------------------------------
// Centro de Comunicaciones. Sidebar con todas las conversaciones
// del usuario (la 'general' siempre fija arriba, luego las de
// orden ordenadas por actividad reciente) + panel de mensajes.
//
// En móvil solo se ve un panel a la vez: la lista, o el chat
// abierto (con botón de volver) — mismo criterio de "una pantalla
// a la vez" que el drawer de LayoutPaginaPrincipal.
// ---------------------------------------------------------------

function formatHora(fechaISO) {
  return new Date(fechaISO).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

function formatFechaRelativa(fechaISO) {
  const fecha = new Date(fechaISO)
  const ahora = new Date()
  const esHoy = fecha.toDateString() === ahora.toDateString()
  if (esHoy) return formatHora(fechaISO)
  const ayer = new Date(ahora)
  ayer.setDate(ahora.getDate() - 1)
  if (fecha.toDateString() === ayer.toDateString()) return 'Ayer'
  return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })
}

function tituloConversacion(conv) {
  if (conv.tipo === 'general') return 'Chat general'
  return `Orden #${conv.orden_id}`
}

function ChatListItem({ conv, activa, onClick }) {
  const Icono = conv.tipo === 'general' ? MessageCircle : Package
  const ultimo = conv.ultimo_mensaje
  return (
    <button
      type="button"
      className={`chat-item ${activa ? 'chat-item--activo' : ''}`}
      onClick={onClick}
    >
      <span className={`chat-item__icono ${conv.tipo === 'general' ? 'chat-item__icono--general' : ''}`}>
        <Icono size={18} />
      </span>
      <div className="chat-item__body">
        <div className="chat-item__top">
          <p className="chat-item__titulo">{tituloConversacion(conv)}</p>
          {ultimo && <span className="chat-item__fecha">{formatFechaRelativa(ultimo.created_at)}</span>}
        </div>
        <p className="chat-item__preview">
          {ultimo ? ultimo.contenido : 'Sin mensajes todavía'}
        </p>
      </div>
      {conv.no_leidos > 0 && <span className="chat-item__badge">{conv.no_leidos}</span>}
    </button>
  )
}

function Burbuja({ mensaje, esPropio }) {
  return (
    <div className={`chat-burbuja ${esPropio ? 'chat-burbuja--propio' : ''}`}>
      <p className="chat-burbuja__texto">{mensaje.contenido}</p>
      <span className="chat-burbuja__hora">{formatHora(mensaje.created_at)}</span>
    </div>
  )
}

function ChatCentro() {
  const { user } = useAuth()
  const { ordenId } = useParams()
  const navigate = useNavigate()

  const [conversaciones, setConversaciones] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [conversacionActiva, setConversacionActiva] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [cargandoMensajes, setCargandoMensajes] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [panelEmojisAbierto, setPanelEmojisAbierto] = useState(false)
  const [vistaMovil, setVistaMovil] = useState('lista') // 'lista' | 'chat'
  const scrollRef = useRef(null)

  const remitenteTipo = user?.es_admin ? 'admin' : 'cliente'

  // ---------------------------------------------------------------
  // Respuestas rápidas y selector de emojis
  // ---------------------------------------------------------------
  const RESPUESTAS_RAPIDAS = [
    'Hola, ¿en qué puedo ayudarte?',
    '¿Cuál es el precio de este producto?',
    '¿Dónde está mi pedido?',
    'Necesito una factura',
  ]

  const EMOJIS = [
    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
    '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
    '😋','😛','😜','😝','🤪','🤨','🧐','🤓','😎','🥸',
    '🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','😮',
    '😳','😨','😰','😥','😢','😭','😱','😖','😣','😩',
    '😫','😤','😠','😡','🤬','😷','🤒','🤕','🤢','🤮',
    '🤧','🥵','🥶','🥴','😵','🤯','🤠','😴','🤤','😺',
  ]

  const insertarEmoji = (emoji) => {
    setTexto((prev) => prev + emoji)
    setPanelEmojisAbierto(false)
  }

  const usarRespuestaRapida = (respuesta) => {
    setTexto(respuesta)
  }

  const cargarConversaciones = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/conversaciones')
      setConversaciones(data)
      return data
    } catch (err) {
      console.error('Error al cargar conversaciones:', err)
      return []
    } finally {
      setCargandoLista(false)
    }
  }, [])

  const abrirConversacion = useCallback(async (conv) => {
    setConversacionActiva(conv)
    setVistaMovil('chat')
    setCargandoMensajes(true)
    try {
      const { data } = await api.get(`/chat/conversaciones/${conv.id}/mensajes`)
      setMensajes(data)
      // Refleja localmente que ya se leyeron, sin esperar otro fetch
      setConversaciones((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, no_leidos: 0 } : c))
      )
    } catch (err) {
      console.error('Error al cargar mensajes:', err)
    } finally {
      setCargandoMensajes(false)
    }
  }, [])

  // Carga inicial: la lista, y si venimos de /chat/orden/:ordenId
  // (botón "Chat de esta orden" en OrdenDetalle), abrimos/creamos
  // esa conversación directamente.
  useEffect(() => {
    async function iniciar() {
      if (ordenId) {
        try {
          const { data: conv } = await api.get(`/chat/orden/${ordenId}`)
          await cargarConversaciones()
          await abrirConversacion(conv)
        } catch (err) {
          console.error('Error al abrir chat de orden:', err)
          setCargandoLista(false)
        }
      } else {
        const data = await cargarConversaciones()
        // Desktop: abre el chat general por defecto si existe
        const general = data.find((c) => c.tipo === 'general')
        if (general && window.innerWidth >= 1024) {
          abrirConversacion(general)
        }
      }
    }
    iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes])

  async function enviarMensaje(e) {
    e.preventDefault()
    if (!texto.trim() || !conversacionActiva || enviando) return

    const contenido = texto.trim()
    setTexto('')
    setEnviando(true)

    try {
      const { data: nuevoMensaje } = await api.post(
        `/chat/conversaciones/${conversacionActiva.id}/mensajes`,
        { contenido }
      )
      setMensajes((prev) => [...prev, nuevoMensaje])
      setConversaciones((prev) =>
        prev.map((c) =>
          c.id === conversacionActiva.id
            ? { ...c, ultimo_mensaje: nuevoMensaje, updated_at: nuevoMensaje.created_at }
            : c
        )
      )
    } catch (err) {
      console.error('Error al enviar mensaje:', err)
      setTexto(contenido)
    } finally {
      setEnviando(false)
    }
  }

  function volverALista() {
    setVistaMovil('lista')
  }

  const conversacionesOrdenadas = [...conversaciones].sort((a, b) => {
    if (a.tipo === 'general') return -1
    if (b.tipo === 'general') return 1
    return new Date(b.updated_at) - new Date(a.updated_at)
  })

  return (
    <LayoutPaginaPrincipal activo="chat" titulo="Centro de Comunicaciones" nav={NAV_UNIFICADO}>
      <div className="chat-page">
        {/* Lista de conversaciones */}
        <aside className={`chat-lista ${vistaMovil === 'chat' ? 'chat-lista--oculta-movil' : ''}`}>
          {cargandoLista ? (
            <div className="chat-lista__vacio">Cargando conversaciones...</div>
          ) : conversacionesOrdenadas.length === 0 ? (
            <div className="chat-lista__vacio">
              <MessageCircle size={28} />
              <p>Todavía no tienes conversaciones</p>
            </div>
          ) : (
            conversacionesOrdenadas.map((conv) => (
              <ChatListItem
                key={conv.id}
                conv={conv}
                activa={conversacionActiva?.id === conv.id}
                onClick={() => abrirConversacion(conv)}
              />
            ))
          )}
        </aside>

        {/* Panel de chat */}
        <section className={`chat-panel ${vistaMovil === 'lista' ? 'chat-panel--oculto-movil' : ''}`}>
          {!conversacionActiva ? (
            <div className="chat-panel__vacio">
              <MessageCircle size={32} />
              <p>Selecciona una conversación para empezar</p>
            </div>
          ) : (
            <>
              <header className="chat-panel__header">
                <button type="button" className="chat-panel__volver" onClick={volverALista}>
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <p className="chat-panel__titulo">{tituloConversacion(conversacionActiva)}</p>
                  {conversacionActiva.tipo === 'orden' && (
                    <button
                      type="button"
                      className="chat-panel__link-orden"
                      onClick={() => navigate(`/orders/${conversacionActiva.orden_id}`)}
                    >
                      Ver orden
                    </button>
                  )}
                </div>
              </header>

              <div className="chat-panel__aviso">
                <Clock size={16} />
                <div className="chat-panel__aviso-cuerpo">
                  <p className="chat-panel__aviso-titulo">Tiempo estimado de respuesta</p>
                  <p className="chat-panel__aviso-texto">
                    En horario laboral respondemos a la brevedad. Según tu conexión a internet, es
                    muy posible que tengas que recargar la página para visualizar los nuevos
                    mensajes.
                  </p>
                </div>
              </div>

              <div className="chat-panel__mensajes" ref={scrollRef}>
                {cargandoMensajes ? (
                  <div className="chat-panel__vacio">Cargando mensajes...</div>
                ) : mensajes.length === 0 ? (
                  <div className="chat-panel__vacio">
                    <p>Escribe tu primer mensaje para empezar la conversación.</p>
                  </div>
                ) : (
                  mensajes.map((m) => (
                    <Burbuja key={m.id} mensaje={m} esPropio={m.remitente_tipo === remitenteTipo} />
                  ))
                )}
              </div>

              {/* Barra de respuestas rápidas */}
              <div className="chat-panel__respuestas-rapidas">
                {RESPUESTAS_RAPIDAS.map((respuesta) => (
                  <button
                    key={respuesta}
                    type="button"
                    className="chat-panel__respuesta-rapida"
                    onClick={() => usarRespuestaRapida(respuesta)}
                    disabled={enviando}
                  >
                    {respuesta}
                  </button>
                ))}
              </div>

              <form className="chat-panel__form" onSubmit={enviarMensaje}>
                <div className="chat-panel__input-wrapper">
                  <input
                    type="text"
                    className="chat-panel__input"
                    placeholder="Escribe un mensaje..."
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    disabled={enviando}
                  />
                  <button
                    type="button"
                    className="chat-panel__emoji-btn"
                    onClick={() => setPanelEmojisAbierto(!panelEmojisAbierto)}
                    disabled={enviando}
                    aria-label="Selector de emojis"
                  >
                    😊
                  </button>
                  {panelEmojisAbierto && (
                    <div className="chat-panel__emoji-panel">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="chat-panel__emoji"
                          onClick={() => insertarEmoji(emoji)}
                          disabled={enviando}
                          aria-label={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit" className="chat-panel__enviar" disabled={!texto.trim() || enviando}>
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </LayoutPaginaPrincipal>
  )
}

export default ChatCentro
