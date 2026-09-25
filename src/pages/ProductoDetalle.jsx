import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Heart, Share2, Check, Stethoscope, Pill, Route, ShieldAlert,
  AlertTriangle, ShieldCheck, Package, Boxes, Thermometer,
  FileCheck2, Building2, ReceiptText, CreditCard,
} from 'lucide-react'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useFavoritos } from '../context/FavoritosContext'
import HomeCarrusel from '../components/HomeCarrusel'
import Valoraciones from '../components/Valoraciones'
import { agruparPorLinea } from '../utils/agruparPorLinea'
import BottomNav from '../components/BottomNav'
import { ProductoImagen } from '../components/icons/ProductoImagen'
import SECCIONES_FICHA from '../config/seccionesFicha'
import './ProductoDetalle.css'

const CANTIDAD_CARRUSELES = 2
const MINIMO_POR_CARRUSEL = 4

// Campos de la ficha técnica: clave en `detalles` + etiqueta + ícono.
// Reemplaza la tabla plana por un grid de tarjetas más escaneable.
const FICHA_CAMPOS = [
  { clave: 'indicaciones', etiqueta: 'Indicaciones', Icono: Stethoscope },
  { clave: 'dosis_recomendada', etiqueta: 'Dosis recomendada', Icono: Pill },
  { clave: 'via_administracion', etiqueta: 'Vía de administración', Icono: Route },
  { clave: 'contraindicaciones', etiqueta: 'Contraindicaciones', Icono: ShieldAlert },
  { clave: 'efectos_secundarios', etiqueta: 'Efectos secundarios', Icono: AlertTriangle },
  { clave: 'precauciones', etiqueta: 'Precauciones', Icono: ShieldCheck },
  { clave: 'presentacion', etiqueta: 'Presentación', Icono: Package },
  { clave: 'unidades_por_presentacion', etiqueta: 'Unidades por presentación', Icono: Boxes },
  { clave: 'condiciones_almacenamiento', etiqueta: 'Almacenamiento', Icono: Thermometer },
  { clave: 'registro_sanitario', etiqueta: 'Registro sanitario', Icono: FileCheck2 },
  { clave: 'titular_registro', etiqueta: 'Titular del registro', Icono: Building2 },
]

function barajar(array) {
  const copia = [...array]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function elegirCarruseles(producto, otrosActivos, relacionadosPorMolecula) {
  const pool = []
  const usados = new Set()

  if (relacionadosPorMolecula.length >= MINIMO_POR_CARRUSEL) {
    const items = barajar(relacionadosPorMolecula).filter((p) => !usados.has(p.id)).slice(0, 12)
    items.forEach((p) => usados.add(p.id))
    if (items.length >= MINIMO_POR_CARRUSEL) {
      pool.push({ titulo: 'Mismo principio activo', productos: items })
    }
  }

  const mismaLinea = otrosActivos.filter((p) => p.linea && p.linea === producto.linea && !usados.has(p.id))
  if (mismaLinea.length >= MINIMO_POR_CARRUSEL) {
    mismaLinea.slice(0, 12).forEach((p) => usados.add(p.id))
    pool.push({ titulo: `Mas de ${producto.linea}`, productos: mismaLinea.slice(0, 12) })
  }

  const mismoLaboratorio = otrosActivos.filter((p) => p.laboratorio && p.laboratorio === producto.laboratorio && !usados.has(p.id))
  if (mismoLaboratorio.length >= MINIMO_POR_CARRUSEL) {
    mismoLaboratorio.slice(0, 12).forEach((p) => usados.add(p.id))
    pool.push({ titulo: `Mas de ${producto.laboratorio}`, productos: mismoLaboratorio.slice(0, 12) })
  }

  const ofertas = otrosActivos.filter((p) => p.descuento_activo && !usados.has(p.id))
  if (ofertas.length >= MINIMO_POR_CARRUSEL) {
    ofertas.slice(0, 12).forEach((p) => usados.add(p.id))
    pool.push({ titulo: 'Ofertas destacadas', productos: ofertas.slice(0, 12) })
  }

  const restantes = otrosActivos.filter((p) => !usados.has(p.id))
  if (restantes.length >= MINIMO_POR_CARRUSEL * 2) {
    restantes.slice(0, 12).forEach((p) => usados.add(p.id))
    pool.push({ titulo: 'Tambien te puede interesar', productos: restantes.slice(0, 12) })
  }

  const seccionesPorLinea = agruparPorLinea(otrosActivos.filter((p) => !usados.has(p.id))).map((s) => ({
    titulo: s.titulo,
    productos: s.productos,
    verTodoTo: s.verTodoTo,
  }))
  pool.push(...seccionesPorLinea)

  return barajar(pool).slice(0, CANTIDAD_CARRUSELES)
}

function Estrellas({ promedio, tamano = '1rem' }) {
  return (
    <span className="pd-rating-stars" style={{ fontSize: tamano }} aria-label={`${promedio} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(promedio) ? 'star-fill' : 'star-empty'}>★</span>
      ))}
    </span>
  )
}

function ProductoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { user } = useAuth()
  const { esFavorito, toggleFavorito } = useFavoritos()

  const [producto, setProducto] = useState(null)
  const [detalles, setDetalles] = useState(null)
  const [moleculas, setMoleculas] = useState([])
  const [valoraciones, setValoraciones] = useState({ promedio: 0, total: 0, valoraciones: [] })
  const [tasaVes, setTasaVes] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [agregado, setAgregado] = useState(false)
  const [carruseles, setCarruseles] = useState([])
  const [imagenActiva, setImagenActiva] = useState(0)
  const [tabActiva, setTabActiva] = useState('ficha')
  const [fichasClinicas, setFichasClinicas] = useState({})
  const [cargandoFichas, setCargandoFichas] = useState(false)
  const [seccionAbierta, setSeccionAbierta] = useState('')
  const [suscripcion, setSuscripcion] = useState(null)
  const [procesandoToggle, setProcesandoToggle] = useState(false)
  const [zoomActivo, setZoomActivo] = useState(false)
  const [zoomOrigen, setZoomOrigen] = useState({ x: 50, y: 50 })
  const [linkCopiado, setLinkCopiado] = useState(false)

  const timerRef = useRef(null)
  const controllerRef = useRef(null)
  const descRef = useRef(null)
  const specsRef = useRef(null)
  const tabsRef = useRef(null)
  const resenasRef = useRef(null)

  const sinPrecio = producto ? (producto.precio_usd == null || Number(producto.precio_usd) <= 0) : false

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    setImagenActiva(0)
    setTabActiva('ficha')
    setAgregado(false)
    setSeccionAbierta('')
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    if (!user || !producto || !sinPrecio) return
    let activo = true
    api
      .get(`/products/${producto.id}/avisame`)
      .then((res) => activo && setSuscripcion(Boolean(res.data.suscrito)))
      .catch(() => activo && setSuscripcion(false))
    return () => { activo = false }
  }, [user, producto, sinPrecio])

  const cargarProducto = useCallback(async () => {
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setCargando(true)
    setCarruseles([])
    setSuscripcion(null)
    setError('')

    try {
      const [resCompleto, resTasa] = await Promise.all([
        api.get(`/moleculas/products/${id}/completo`, { signal: controller.signal }),
        api.get('/prices', { signal: controller.signal }),
      ])

      const { producto: p, detalles: d, moleculas: m } = resCompleto.data
      setProducto(p)
      setDetalles(d)
      setMoleculas(m || [])
      setTasaVes(resTasa.data.usd_a_ves)

      const tieneFichaTecnica = !!d && (
        d.indicaciones || d.contraindicaciones || d.dosis_recomendada ||
        d.via_administracion || d.efectos_secundarios || d.precauciones ||
        d.presentacion || d.registro_sanitario
      )
      setTabActiva(tieneFichaTecnica ? 'ficha' : 'fichaclinica')

      const fichasPromise = (m && m.length > 0) ? (async () => {
        setCargandoFichas(true)
        const ids = [...new Set(m.map((mol) => mol.moleculas_referencias?.id).filter(Boolean))]
        const entradas = await Promise.all(ids.map(async (molId) => {
          try {
            const { data } = await api.get(`/moleculas/moleculas/${molId}`, { signal: controller.signal })
            return [molId, { ficha_tecnica: data.ficha_tecnica || null }]
          } catch { return [molId, { ficha_tecnica: null }] }
        }))
        setFichasClinicas(Object.fromEntries(entradas))
        setCargandoFichas(false)
      })() : Promise.resolve()

      const valoracionesPromise = api
        .get(`/products/${id}/valoraciones`, { signal: controller.signal })
        .then((res) => setValoraciones(res.data))
        .catch(() => {})

      const carruselesPromise = (async () => {
        try {
          const [{ data: todos }, resRel] = await Promise.all([
            api.get('/products', { signal: controller.signal }),
            api.get(`/moleculas/productos/${id}/relacionados-por-molecula`, { signal: controller.signal })
              .catch(() => ({ data: [] })),
          ])
          setCarruseles(elegirCarruseles(p, todos.filter((pr) => pr.activo && pr.id !== p.id), resRel.data || []))
        } catch (err) { console.error('Carruseles:', err) }
      })()

      await Promise.all([fichasPromise, valoracionesPromise, carruselesPromise])
    } catch (err) {
      if (err?.name === 'CanceledError') return
      setError('Producto no encontrado')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => {
    cargarProducto()
  }, [cargarProducto])

  function handleAgregar() {
    addItem(producto, cantidad)
    setAgregado(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setAgregado(false), 2000)
  }

  async function toggleAvisame() {
    if (!user || !producto || suscripcion === null || procesandoToggle) return
    setProcesandoToggle(true)
    try {
      if (suscripcion) {
        await api.delete(`/products/${producto.id}/avisame`)
        setSuscripcion(false)
      } else {
        await api.post(`/products/${producto.id}/avisame`)
        setSuscripcion(true)
      }
    } catch (err) {
      console.error('No se pudo actualizar la suscripcion de disponibilidad', err)
    } finally {
      setProcesandoToggle(false)
    }
  }

  function handleZoomMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    setZoomOrigen({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  function handleCompartir() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2000)
    })
  }

  function irASeccion(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function irAAncla(id) {
    const refs = { descripcion: descRef, specs: specsRef, ficha: tabsRef, resenas: resenasRef }
    irASeccion(refs[id])
  }

  if (cargando) {
    return (
      <div className="pd-page">
        <div className="pd-skeleton">
          <div className="pd-sk-gallery">
            <div className="pd-sk-image" />
            <div className="pd-sk-thumbs">
              <div className="pd-sk-thumb" />
              <div className="pd-sk-thumb" />
              <div className="pd-sk-thumb" />
            </div>
          </div>
          <div className="pd-sk-info">
            <div className="pd-sk-line pd-sk-brand" />
            <div className="pd-sk-line pd-sk-title" />
            <div className="pd-sk-line" />
            <div className="pd-sk-line pd-sk-short" />
            <div className="pd-sk-line" />
            <div className="pd-sk-line pd-sk-short" />
          </div>
          <div className="pd-sk-purchase">
            <div className="pd-sk-line pd-sk-price" />
            <div className="pd-sk-line" />
            <div className="pd-sk-btn" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !producto) {
    return (
      <div className="pd-page">
        <div className="pd-error">
          <h2>Producto no encontrado</h2>
          <p>No pudimos encontrar el producto que buscas.</p>
          <button onClick={() => navigate('/catalogo')}>Volver al catalogo</button>
        </div>
      </div>
    )
  }

  const precioVes = tasaVes && producto.precio_usd != null
    ? (producto.precio_usd * tasaVes).toFixed(2)
    : null

  const galeria = [producto.foto_url, ...(detalles?.imagen_secundaria_urls || [])].filter(Boolean)

  const tieneFichaTecnica = !!detalles && (
    detalles.indicaciones || detalles.contraindicaciones || detalles.dosis_recomendada ||
    detalles.via_administracion || detalles.efectos_secundarios || detalles.precauciones ||
    detalles.presentacion || detalles.registro_sanitario
  )
  const tieneComposicion = moleculas.length > 0
  const tieneSpecs = !!(producto.laboratorio || producto.forma || producto.linea || producto.pais_origen)

  const anclas = [
    producto.descripcion && { id: 'descripcion', label: 'Descripción' },
    tieneSpecs && { id: 'specs', label: 'Especificaciones' },
    (tieneFichaTecnica || tieneComposicion) && { id: 'ficha', label: 'Ficha técnica' },
    { id: 'resenas', label: 'Reseñas' },
  ].filter(Boolean)

  const categoriasClinicas = SECCIONES_FICHA
    .map(({ clave, etiqueta, icono }) => {
      const entradas = moleculas
        .map((m) => {
          const ref = m.moleculas_referencias
          const molId = ref?.id
          const ficha = molId ? fichasClinicas[molId]?.ficha_tecnica : null
          const texto = ficha?.[clave]
          return texto ? { id: molId || 'anon', nombre: ref?.nombre || 'Molécula', texto } : null
        })
        .filter(Boolean)
      return { clave, etiqueta, icono, entradas }
    })
    .filter((c) => c.entradas.length > 0)

  return (
    <div className="pd-page">
      <nav className="pd-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Inicio</Link>
        <span className="pd-breadcrumb__sep">/</span>
        <Link to="/catalogo">Catalogo</Link>
        <span className="pd-breadcrumb__sep">/</span>
        <span className="pd-breadcrumb__current">{producto.nombre_comercial}</span>
      </nav>

      <div className="pd-hero">
        <div className="pd-gallery">
          <div
            className="pd-gallery__main"
            onMouseEnter={() => setZoomActivo(true)}
            onMouseLeave={() => setZoomActivo(false)}
            onMouseMove={handleZoomMove}
          >
            <ProductoImagen
              src={galeria[imagenActiva] || null}
              alt={producto.nombre_comercial}
              className={`pd-gallery__img${zoomActivo ? ' pd-gallery__img--zoom' : ''}`}
              style={zoomActivo ? { transformOrigin: `${zoomOrigen.x}% ${zoomOrigen.y}%` } : undefined}
            />
            {!producto.disponible && (
              <span className="pd-badge pd-badge--red">No disponible</span>
            )}
            {producto.descuento_activo && (
              <span className="pd-badge pd-badge--gold">
                -{producto.descuento_activo.valor}%
              </span>
            )}
          </div>
          {galeria.length > 1 && (
            <div className="pd-gallery__thumbs">
              {galeria.map((url, i) => (
                <button
                  key={i}
                  className={`pd-gallery__thumb ${i === imagenActiva ? 'active' : ''}`}
                  onClick={() => setImagenActiva(i)}
                  aria-label={`Imagen ${i + 1} de ${galeria.length}`}
                >
                  <img src={url} alt={`${producto.nombre_comercial} — imagen ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pd-info">
          {producto.marcas?.nombre && (
            <span className="pd-info__brand">{producto.marcas.nombre}</span>
          )}

          <div className="pd-info__title-row">
            <h1 className="pd-info__title">{producto.nombre_comercial}</h1>
            <div className="pd-info__title-actions">
              {user && (
                <button
                  type="button"
                  className={`pd-icon-btn ${esFavorito(producto.id) ? 'active' : ''}`}
                  onClick={() => toggleFavorito(producto)}
                  aria-label={esFavorito(producto.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  aria-pressed={esFavorito(producto.id)}
                >
                  <Heart size={18} fill={esFavorito(producto.id) ? '#DC2626' : 'none'} />
                </button>
              )}
              <button
                type="button"
                className="pd-icon-btn"
                onClick={handleCompartir}
                aria-label="Copiar enlace del producto"
              >
                {linkCopiado ? <Check size={18} color="#16A34A" /> : <Share2 size={18} />}
              </button>
            </div>
          </div>

          {valoraciones.total > 0 && (
            <div
              className="pd-info__rating"
              role="button"
              tabIndex={0}
              onClick={() => irAAncla('resenas')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') irAAncla('resenas') }}
            >
              <Estrellas promedio={valoraciones.promedio} />
              <span className="pd-info__rating-text">
                {valoraciones.promedio} · {valoraciones.total} {valoraciones.total === 1 ? 'valoracion' : 'valoraciones'}
              </span>
            </div>
          )}

          <div className="pd-info__meta">
            {producto.sku && (
              <span className="pd-info__sku">SKU: {producto.sku}</span>
            )}
            {producto.presentacion && (
              <span className="pd-info__presentacion">{producto.presentacion}</span>
            )}
          </div>

          <span className={`pd-info__availability ${producto.disponible ? 'available' : 'unavailable'}`}>
            {producto.disponible ? 'Disponible' : 'Agotado'}
          </span>

          {anclas.length > 1 && (
            <nav className="pd-anchor-nav" aria-label="Ir a sección">
              {anclas.map((a) => (
                <button key={a.id} type="button" onClick={() => irAAncla(a.id)}>
                  {a.label}
                </button>
              ))}
            </nav>
          )}

          {producto.descripcion && (
            <p className="pd-info__desc" ref={descRef}>{producto.descripcion}</p>
          )}

          <div className="pd-info__specs" ref={specsRef}>
            {producto.laboratorio && (
              <div className="pd-spec">
                <span className="pd-spec__label">Laboratorio</span>
                <span className="pd-spec__value">{producto.laboratorio}</span>
              </div>
            )}
            {producto.forma && (
              <div className="pd-spec">
                <span className="pd-spec__label">Forma</span>
                <span className="pd-spec__value">{producto.forma}</span>
              </div>
            )}
            {producto.linea && (
              <div className="pd-spec">
                <span className="pd-spec__label">Linea</span>
                <span className="pd-spec__value">{producto.linea}</span>
              </div>
            )}
            {producto.pais_origen && (
              <div className="pd-spec">
                <span className="pd-spec__label">Origen</span>
                <span className="pd-spec__value">{producto.pais_origen}</span>
              </div>
            )}
          </div>

          {tieneComposicion && (
            <div className="pd-info__composition">
              <span className="pd-info__composition-label">Composicion</span>
              <div className="pd-info__composition-list">
                {moleculas.map((m, i) => {
                  const ref = m.moleculas_referencias
                  return (
                    <span key={i} className="pd-chip">
                      {ref && ref.id ? (
                        <Link to={`/vademecum/${ref.id}`}>{ref.nombre}</Link>
                      ) : (
                        <span>{ref?.nombre || 'Molecula'}</span>
                      )}
                      {m.concentracion && (
                        <span className="pd-chip__detail">{m.concentracion} {m.unidad_concentracion}</span>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pd-purchase">
          <div className="pd-purchase__card">
            <div className="pd-purchase__prices">
              {producto.precio_usd != null ? (
                <>
                  {producto.precio_original_usd && (
                    <span className="pd-purchase__original">
                      ${Number(producto.precio_original_usd).toFixed(2)}
                    </span>
                  )}
                  <span className="pd-purchase__price">
                    ${Number(producto.precio_usd).toFixed(2)}
                  </span>
                  {producto.precio_original_usd && (
                    <span className="pd-purchase__savings">
                      Ahorras ${(Number(producto.precio_original_usd) - Number(producto.precio_usd)).toFixed(2)}
                    </span>
                  )}
                  {precioVes && (
                    <span className="pd-purchase__ves">Bs. {precioVes}</span>
                  )}
                </>
              ) : (
                <span className="pd-purchase__consultar">Consultar precio</span>
              )}
            </div>

            <ul className="pd-purchase__trust">
              <li><ReceiptText size={14} aria-hidden="true" /> Factura fiscal incluida</li>
              <li><CreditCard size={14} aria-hidden="true" /> Compra con línea de crédito</li>
              <li><ShieldCheck size={14} aria-hidden="true" /> Pago 100% seguro</li>
            </ul>

            {producto.disponible && (
              <div className="pd-purchase__actions">
                <div className="pd-purchase__qty">
                  <button
                    onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                    disabled={cantidad <= 1}
                    aria-label="Restar cantidad"
                  >
                    -
                  </button>
                  <span aria-live="polite">{cantidad}</span>
                  <button
                    onClick={() => setCantidad((c) => c + 1)}
                    aria-label="Sumar cantidad"
                  >
                    +
                  </button>
                </div>

                <button
                  className={`pd-purchase__cta ${agregado ? 'added' : ''}`}
                  onClick={handleAgregar}
                  disabled={!user}
                >
                  {agregado ? 'Agregado' : 'Agregar al carrito'}
                </button>
              </div>
            )}

            {sinPrecio && (
              <div className="pd-purchase__actions">
                <button
                  className="pd-purchase__cta pd-purchase__cta--teal"
                  onClick={() =>
                    navigate(`/mis-solicitudes/requerimientos?producto=${encodeURIComponent(producto.nombre_comercial)}`)
                  }
                >
                  Solicitar precio
                </button>

                {user && (
                  <button
                    className={`pd-purchase__btn-outline ${suscripcion ? 'subscribed' : ''}`}
                    onClick={toggleAvisame}
                    disabled={suscripcion === null || procesandoToggle}
                  >
                    {suscripcion === null || procesandoToggle
                      ? 'Consultando...'
                      : suscripcion
                        ? 'Te avisaremos'
                        : 'Avisame cuando llegue'}
                  </button>
                )}
              </div>
            )}

            {!user && (
              <p className="pd-purchase__login">
                <Link to="/login">Inicia sesion</Link> para comprar
              </p>
            )}

            <p className="pd-purchase__note">
              * Precios no incluyen IVA. Sujetos a cambios sin previo aviso.
            </p>
          </div>
        </div>
      </div>

      {(detalles?.registro_sanitario || detalles?.titular_registro) && (
        <div className="pd-trust-band">
          <ShieldCheck size={20} aria-hidden="true" />
          <div className="pd-trust-band__text">
            <strong>Producto con registro sanitario verificado</strong>
            <span>
              {detalles.registro_sanitario && `Reg. ${detalles.registro_sanitario}`}
              {detalles.registro_sanitario && detalles.titular_registro && ' · '}
              {detalles.titular_registro && `Titular: ${detalles.titular_registro}`}
            </span>
          </div>
        </div>
      )}

      {(tieneFichaTecnica || tieneComposicion) && (
        <div className="pd-tabs" ref={tabsRef}>
          <div className="pd-tabs__nav" role="tablist">
          {tieneFichaTecnica && (
            <button
              role="tab"
              className={`pd-tabs__btn ${tabActiva === 'ficha' ? 'active' : ''}`}
              onClick={() => setTabActiva('ficha')}
              aria-selected={tabActiva === 'ficha'}
            >
              Ficha tecnica
            </button>
          )}
          {tieneComposicion && (
            <button
              role="tab"
              className={`pd-tabs__btn ${tabActiva === 'fichaclinica' ? 'active' : ''}`}
              onClick={() => setTabActiva('fichaclinica')}
              aria-selected={tabActiva === 'fichaclinica'}
            >
              Ficha clinica
            </button>
          )}
        </div>

        <div className="pd-tabs__panel" role="tabpanel">
          {tabActiva === 'ficha' && detalles && (
            <div className="pd-ficha-grid">
              {FICHA_CAMPOS.filter(({ clave }) => detalles[clave]).map(({ clave, etiqueta, Icono }) => (
                <div key={clave} className="pd-ficha-item">
                  <span className="pd-ficha-item__icono">
                    <Icono size={16} aria-hidden="true" />
                  </span>
                  <div className="pd-ficha-item__body">
                    <span className="pd-ficha-item__label">{etiqueta}</span>
                    <span className="pd-ficha-item__value">{detalles[clave]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tabActiva === 'fichaclinica' && (
            <div className="pd-clinical">
              {cargandoFichas && <span className="pd-clinical__loading">Cargando fichas clinicas...</span>}

              {!cargandoFichas && categoriasClinicas.length > 0 ? (
                <div className="pd-clinical__list">
                  {categoriasClinicas.map(({ clave, etiqueta, icono, entradas }) => {
                    const abierta = seccionAbierta === clave
                    return (
                      <div key={clave} className={`pd-clinical__item ${abierta ? 'open' : ''}`}>
                        <div className="pd-clinical__row">
                          <button
                            type="button"
                            className="pd-clinical__toggle"
                            onClick={() => setSeccionAbierta(abierta ? '' : clave)}
                            aria-expanded={abierta}
                          >
                            <span className="pd-clinical__icono">{icono}</span>
                            <span className="pd-clinical__name">{etiqueta}</span>
                            <span className={`pd-clinical__chevron ${abierta ? 'open' : ''}`}>&#9662;</span>
                          </button>
                        </div>
                        {abierta && (
                          <div className="pd-clinical__body">
                            {entradas.map((e, i) => (
                              <div key={`${e.id}-${i}`} className="pd-clinical__section">
                                {entradas.length > 1 && (
                                  <h4 className="pd-clinical__section-title">{e.nombre}</h4>
                                )}
                                <p className="pd-clinical__section-text">{e.texto}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                !cargandoFichas && (
                  <p className="pd-clinical__empty">
                    Sin ficha clinica disponible para este producto.
                  </p>
                )
              )}
              <p className="pd-clinical__source">
                Informacion farmacologica de referencia (AEMPS - CIMA). No sustituye la consulta con un profesional de la salud.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      <div className="pd-reviews" ref={resenasRef}>
        <Valoraciones productoId={producto.id} />
      </div>

      {carruseles.length > 0 && (
        <div className="pd-related">
          {carruseles.map((c, i) => (
            <HomeCarrusel
              key={`${producto.id}-${i}`}
              titulo={c.titulo}
              productos={c.productos}
              tasaVes={tasaVes}
              verTodoTo={c.verTodoTo || '/catalogo'}
              cargando={false}
            />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default ProductoDetalle