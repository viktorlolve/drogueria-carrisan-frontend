// src/pages/staff/StaffInventario.jsx
//
// Consola de Inventario (Logística): la página donde el almacén revisa el catálogo,
// pone las fotos que faltan y (la gerencia) revisa los precios.
//
// Decisiones que vienen del diseño aprobado
// (analisis/design-inventario-logistica-2026-10-05.md §3, §5 y §6) y que NO se
// deben cambiar sin pasar por el dueño:
//
// 1. `puede_editar_precio` lo decide el ROL del staff y lo manda el servidor en
//    CADA respuesta (lista y detalle). Acá NO se mira `staff.rol` para nada:
//    el frontend solo usa ese flag para habilitar o no el campo.
// 2. La foto tiene DOS vías: subir archivo y editar/pegar la URL a mano.
//    `DELETE /:id/foto` es la ÚNICA vía que borra la foto, y siempre con
//    confirmación — por eso el input de URL no acepta quedar vacío.
// 3. El precio manda y el costo se deriva (`costo = precio × 0.6`) en Postgres.
//    Por eso el campo `costo_usd` es de SOLO LECTURA y se muestra el valor
//    guardado por el servidor, nunca el tecleado: calcularlo en JS mostraría un
//    número que puede diferir en un centavo del que queda guardado.
//
// Las primitivas de tabla/toolbar/paginación son las `.sp-*` de
// `StaffComercial.css` (las mismas que usa /staff/precios); lo propio de esta
// página lleva prefijo `.si-*` y vive en `StaffInventario.css`.

import { useEffect, useRef, useState } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import { useEsMobile } from '../../hooks/useEsMobile'
import { IconoProducto } from '../../components/icons/ProductoImagen'
import './StaffComercial.css'
import './StaffInventario.css'

const POR_PAGINA = 20
// Espejo de los límites del backend. Acá solo evita gastar un request; el
// mensaje que decide es el del servidor y se muestra tal cual.
const URL_FOTO_MAX = 2000
const MAX_FOTO_MB = 8

// Los 4 valores del CHECK `productos_foto_estado_check`, con la explicación que
// la section de estado del drawer muestra debajo del selector.
const FOTO_ESTADOS = [
  { valor: 'sin_foto', etiqueta: 'Sin foto', ayuda: 'No hay foto. Es el estado por defecto.' },
  { valor: 'dudosa', etiqueta: 'Dudosa', ayuda: 'El cruce automático propuso una y nadie la juzgó todavía.' },
  { valor: 'ok', etiqueta: 'OK', ayuda: 'La puso el cruce automático y no se ha tocado.' },
  { valor: 'manual', etiqueta: 'Manual', ayuda: 'La asignó una persona desde esta página.' },
]

// Únicos pares de orden que el servidor acepta (ver `ORDENES` del controller).
const ORDENES_SORT = {
  nombre: ['nombre_asc', 'nombre_desc'],
  precio: ['precio_asc', 'precio_desc'],
}

// Los 5 presets de cola. Cada uno pone UN filtro; el contador sale de
// `GET /opciones.conteos` y el botón activo se marca con `.si-queue__btn--on`.
// Se pueden activar dos a la vez (el servidor los ANDea: sin foto Y sin precio).
const PRESETS_COLA = [
  { texto: 'Sin foto', conteo: 'sin_foto', campo: 'foto_estado', valor: 'sin_foto' },
  { texto: 'Dudosa', conteo: 'dudosa', campo: 'foto_estado', valor: 'dudosa' },
  { texto: 'Sin precio', conteo: 'sin_precio', campo: 'sin_precio', valor: true },
  { texto: 'Sin proveedor', conteo: 'sin_proveedor', campo: 'sin_proveedor', valor: true },
  { texto: 'Asignadas a mano', conteo: 'manual', campo: 'foto_estado', valor: 'manual' },
]

const FILTROS_INICIALES = {
  laboratorio: '',
  linea: '',
  forma: '',
  foto_estado: '',
  sin_precio: false,
  sin_proveedor: false,
}

const formato = (n) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatoFecha = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const siNo = (v) => (v ? 'Sí' : 'No')

// ---------------------------------------------------------------------------
// Piezas visuales
// ---------------------------------------------------------------------------

/**
 * Imagen con fallback a ícono cuando no hay URL o cuando la URL revienta (404
 * de un bucket viejo, hotlink muerto). El reset de `fallo` se ajusta durante el
 * render, no en un efecto con setState (patrón "set state on prop change" del
 * AGENTS del frontend).
 */
function ImagenProducto({ src, alt = '', className = 'si-thumb', vacio = 'Producto sin imagen' }) {
  const [urlAnterior, setUrlAnterior] = useState(src || '')
  const [fallo, setFallo] = useState(false)

  if ((src || '') !== urlAnterior) {
    setUrlAnterior(src || '')
    setFallo(false)
  }

  if (!src || fallo) {
    return (
      <div className={`${className} placeholder-icono`} role="img" aria-label={vacio}>
        <IconoProducto />
      </div>
    )
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFallo(true)}
    />
  )
}

function BadgeFoto({ estado }) {
  return (
    <span className={`si-estado si-estado--${estado || 'sin_foto'}`}>
      {(FOTO_ESTADOS.find((e) => e.valor === estado) || FOTO_ESTADOS[0]).etiqueta}
    </span>
  )
}

function Dato({ etiqueta, valor, mono = false }) {
  return (
    <div className="si-dato">
      <span className="si-dato__k">{etiqueta}</span>
      <span className={`si-dato__v ${mono ? 'si-dato__v--mono' : ''}`}>
        {valor === null || valor === undefined || valor === '' ? '—' : valor}
      </span>
    </div>
  )
}

/**
 * Los filtros + la barra de presets. Se usa igual en el toolbar de escritorio y
 * dentro de la hoja móvil, así que no lleva markup de layout propio.
 */
function BarraFiltros({ filtros, cambiarFiltro, opciones, onLimpiar }) {
  const moleculas = opciones?.moleculas || []

  function alternarPreset(preset) {
    if (typeof preset.valor === 'boolean') {
      cambiarFiltro(preset.campo, !filtros[preset.campo])
      return
    }
    cambiarFiltro(preset.campo, filtros[preset.campo] === preset.valor ? '' : preset.valor)
  }

  return (
    <>
      <input
        type="text"
        placeholder="Buscar por nombre, SKU o laboratorio..."
        value={filtros.buscar}
        onChange={(e) => cambiarFiltro('buscar', e.target.value)}
        className="sp-input sp-input--buscar"
      />
      <select
        value={filtros.laboratorio}
        onChange={(e) => cambiarFiltro('laboratorio', e.target.value)}
        className="sp-select"
      >
        <option value="">Todos los laboratorios</option>
        {(opciones?.laboratorios || []).map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      <select
        value={filtros.linea}
        onChange={(e) => cambiarFiltro('linea', e.target.value)}
        className="sp-select"
      >
        <option value="">Todas las líneas</option>
        {(opciones?.lineas || []).map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      <select
        value={filtros.forma}
        onChange={(e) => cambiarFiltro('forma', e.target.value)}
        className="sp-select"
      >
        <option value="">Todas las formas</option>
        {(opciones?.formas || []).map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
      {/* 4.300 referencias de molécula: va como input+datalist, nunca select. */}
      <input
        type="text"
        list="si-moleculas"
        placeholder="Molécula..."
        value={filtros.molecula}
        onChange={(e) => cambiarFiltro('molecula', e.target.value)}
        className="sp-input si-input-molecula"
      />
      <datalist id="si-moleculas">
        {moleculas.map((m) => (
          <option key={m.nombre} value={m.nombre}>{m.cantidad} productos</option>
        ))}
      </datalist>
      <label className="sp-check">
        <input
          type="checkbox"
          checked={filtros.sin_precio}
          onChange={(e) => cambiarFiltro('sin_precio', e.target.checked)}
        />
        Solo sin precio
      </label>
      <label className="sp-check">
        <input
          type="checkbox"
          checked={filtros.sin_proveedor}
          onChange={(e) => cambiarFiltro('sin_proveedor', e.target.checked)}
        />
        Solo sin proveedor
      </label>
      <button type="button" className="si-btn si-btn--sutil" onClick={onLimpiar}>Limpiar</button>

      <div className="si-queue" role="group" aria-label="Colas de trabajo">
        <span className="si-queue__titulo">Colas</span>
        {PRESETS_COLA.map((preset) => {
          const conteo = opciones?.conteos?.[preset.conteo]
          const activo = filtros[preset.campo] === preset.valor
          return (
            <button
              key={preset.texto}
              type="button"
              className={`si-queue__btn ${activo ? 'si-queue__btn--on' : ''}`}
              onClick={() => alternarPreset(preset)}
              aria-pressed={activo}
            >
              {preset.texto}
              <span className="si-queue__conteo">{conteo == null ? '—' : conteo}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

function StaffInventario() {
  const esMobile = useEsMobile(768)

  // Lista
  const [productos, setProductos] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [pagina, setPagina] = useState(1)
  const [sort, setSort] = useState('nombre_asc')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [seleccion, setSeleccion] = useState([])
  const [recarga, setRecarga] = useState(0)

  // Filtros. Los dos textos van aparte porque van con debounce (escribirlos no
  // puede disparar un request por tecla); el resto viaja en un objeto para que
  // el efecto de la lista tenga una sola dependencia.
  const [buscar, setBuscar] = useState('')
  const [buscarActivo, setBuscarActivo] = useState('')
  const [molecula, setMolecula] = useState('')
  const [moleculaActiva, setMoleculaActiva] = useState('')
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  // Opciones de filtro + contadores de las colas
  const [opciones, setOpciones] = useState(null)
  const [errorOpciones, setErrorOpciones] = useState('')

  // Drawer
  const [drawerId, setDrawerId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [detalleError, setDetalleError] = useState('')
  const [drawerError, setDrawerError] = useState('')
  const [fotoOk, setFotoOk] = useState('')
  const [detalleRecarga, setDetalleRecarga] = useState(0)
  const [urlFoto, setUrlFoto] = useState('')
  const [precioTexto, setPrecioTexto] = useState('')
  const [notaPrecio, setNotaPrecio] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [subidaId, setSubidaId] = useState(0)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [guardandoFoto, setGuardandoFoto] = useState(false)
  const [guardandoPrecio, setGuardandoPrecio] = useState(false)

  // Cuáles de los dos campos de edición tienen algo tecleado SIN guardar. Es un
  // ref y no estado a propósito: el refetch del detalle (cada escritura bumpea
  // `detalleRecarga`) repone los campos con lo que dice el servidor, y con estado
  // estos flags irían en las deps del efecto → un request por tecla, que es lo
  // que el debounce de las líneas de arriba existe para evitar.
  const sucioRef = useRef({ url: false, precio: false })

  // --- debounce de los dos textos -----------------------------------------
  useEffect(() => {
    const t = setTimeout(() => setBuscarActivo(buscar.trim()), 300)
    return () => clearTimeout(t)
  }, [buscar])

  useEffect(() => {
    const t = setTimeout(() => setMoleculaActiva(molecula.trim()), 300)
    return () => clearTimeout(t)
  }, [molecula])

  // --- "seleccionar la página" refleja la selección parcial ----------------
  // `indeterminate` es una propiedad del DOM, no una prop: React no la maneja y
  // por eso va por ref. Sin `setState`, así que la regla
  // `react-hooks/set-state-in-effect` no lo marca. Sin array de deps a propósito:
  // tiene que quedar sincronizado en cada render (la lista puede cambiar por un
  // refetch, no solo por un clic).
  const checkTodosRef = useRef(null)
  useEffect(() => {
    const el = checkTodosRef.current
    if (el) {
      el.indeterminate = productos.length > 0 && seleccion.length > 0 && seleccion.length < productos.length
    }
  })

  // --- abrir/cerrar el drawer: se ajusta durante el render -----------------
  // Patrón "set state on prop change" del AGENTS: resetear con un efecto +
  // setState dispara `react-hooks/set-state-in-effect`. No se escriben refs
  // durante el render (la regla react-hooks/refs lo prohíbe).
  const [drawerIdAnterior, setDrawerIdAnterior] = useState(drawerId)
  if (drawerId !== drawerIdAnterior) {
    setDrawerIdAnterior(drawerId)
    setDetalle(null)
    setDetalleError('')
    setDrawerError('')
    setFotoOk('')
    setNotaPrecio('')
    setArchivo(null)
    setUrlFoto('')
    setPrecioTexto('')
    
  }

  // --- GET /staff/inventario/opciones --------------------------------------
  useEffect(() => {
    let activo = true
    staffApi
      .get('/staff/inventario/opciones')
      .then((res) => {
        if (!activo) return
        setOpciones(res.data)
        setErrorOpciones('')
      })
      .catch((err) => {
        if (!activo) return
        setErrorOpciones('No se pudieron cargar los filtros de inventario')
        console.error('[inventario] error al cargar las opciones:', err?.response?.status, err?.message)
      })
    return () => { activo = false }
  }, [recarga])

  // --- GET /staff/inventario (lista server-side) ---------------------------
  // El spinner inicial sale de `cargando: true`; los recargados posteriores no
  // lo vuelven a mostrar (mismo criterio que StaffPrecios).
  useEffect(() => {
    let activo = true
    const params = {
      pagina: String(pagina),
      por_pagina: String(POR_PAGINA),
      sort,
      activo: 'true',
    }
    if (buscarActivo) params.buscar = buscarActivo
    if (moleculaActiva) params.molecula = moleculaActiva
    if (filtros.laboratorio) params.laboratorio = filtros.laboratorio
    if (filtros.linea) params.linea = filtros.linea
    if (filtros.forma) params.forma = filtros.forma
    if (filtros.foto_estado) params.foto_estado = filtros.foto_estado
    if (filtros.sin_precio) params.sin_precio = 'true'
    if (filtros.sin_proveedor) params.sin_proveedor = 'true'

    staffApi
      .get('/staff/inventario', { params })
      .then((res) => {
        if (!activo) return
        const filas = res.data.productos || []
        // Nunca 0: con 0 páginas el recorte de abajo dispararía un fetch
        // infinito, porque la página 1 siempre es > 0.
        const totalPaginasNuevo = Math.max(1, Number(res.data.total_paginas) || 1)
        setProductos(filas)
        setTotal(res.data.total || 0)
        setTotalPaginas(totalPaginasNuevo)
        // Recorta la página si el conjunto se achicó mientras estábamos en una
        // alta: guardar un precio saca el producto del filtro "sin precio" (o
        // "sin proveedor"), `total_paginas` baja y `pagina` se quedaba por
        // encima. Sin esto la tabla queda vacía y "No hay productos con esos
        // filtros" miente. `setPagina` cambia una dependencia del efecto, así
        // que dispara UN fetch más y ahí termina (ya recortada).
        if (pagina > totalPaginasNuevo) setPagina(totalPaginasNuevo)
        setError('')
        setSeleccion((prev) => prev.filter((id) => filas.some((p) => p.id === id)))
      })
      .catch((err) => {
        if (!activo) return
        setError('No se pudo cargar el inventario')
        console.error('[inventario] error al cargar el listado:', err?.response?.status, err?.message)
      })
      .finally(() => { if (activo) setCargando(false) })

    return () => { activo = false }
  }, [buscarActivo, moleculaActiva, filtros, sort, pagina, recarga])

  // --- GET /staff/inventario/:id (detalle del drawer) ----------------------
  // También se vuelve a correr con `detalleRecarga` después de cada escritura,
  // así el drawer muestra SIEMPRE lo que quedó guardado (el server manda).
  // Salvo en los campos que el operador tiene a medio escribir: reponerlos acá
  // borraría en silencio lo tecleado (precio o URL) sin avisar.
    useEffect(() => {
    if (drawerId == null) return undefined
    let activo = true
    Promise.resolve().then(() => {
      if (!activo) return
      
    })
    staffApi
      .get(`/staff/inventario/${drawerId}`)
      .then((res) => {
        if (!activo) return
        const data = res.data
        setDetalle(data)
        // Al abrir/cambiar de producto, el ref debe estar limpio antes de aplicar
        // lo que manda el servidor.
        sucioRef.current = { url: false, precio: false }
        setUrlFoto(data.producto.foto_url || '')
        setPrecioTexto(
          data.producto.precio_usd != null ? String(data.producto.precio_usd) : '',
        )
        setDetalleError('')
      })
      .catch((err) => {
        if (!activo) return
        setDetalleError(err.response?.data?.error || 'No se pudo cargar el producto')
        console.error('[inventario] error al cargar el detalle:', err?.response?.status, err?.message)
      })
      .finally(() => {
        if (!activo) return
        
      })

    return () => { activo = false }
  }, [drawerId, detalleRecarga])

  // --- cerrar los overlays con Escape + bloquear el scroll del body ---------
  // Un SOLO efecto para el drawer y la hoja de filtros: con dos efectos, el
  // cleanup de uno pondría `overflow = ''` mientras el otro sigue abierto.
  useEffect(() => {
    if (drawerId == null && !filtrosAbiertos) return undefined
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (drawerId != null) setDrawerId(null)
      else setFiltrosAbiertos(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [drawerId, filtrosAbiertos])

  // --- helpers de la UI ---------------------------------------------------

  function cambiarFiltro(campo, valor) {
    if (pagina !== 1) setPagina(1)
    if (campo === 'buscar') { setBuscar(valor); return }
    if (campo === 'molecula') { setMolecula(valor); return }
    setFiltros((prev) => ({ ...prev, [campo]: valor }))
  }

  function limpiarFiltros() {
    setPagina(1)
    setBuscar('')
    setMolecula('')
    setFiltros(FILTROS_INICIALES)
  }

  function toggleSort(campo) {
    const [asc, desc] = ORDENES_SORT[campo]
    setSort((s) => (s === asc ? desc : asc))
    if (pagina !== 1) setPagina(1)
  }

  function flechaSort(campo) {
    return sort === `${campo}_asc` ? '↑' : sort === `${campo}_desc` ? '↓' : ''
  }

  // `aria-sort` va en el <th>, no en el botón: es el estado de orden de la
  // columna, y es lo que anuncia el lector de pantalla.
  function ordenDe(campo) {
    if (sort === `${campo}_asc`) return 'ascending'
    if (sort === `${campo}_desc`) return 'descending'
    return 'none'
  }

  function toggleSeleccion(id) {
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  /**
   * Abre el drawer con Enter o Space, para que la fila sea alcanzable por
   * teclado. La fila es un `<tr>` (no un botón) porque dentro hay un checkbox,
   * así que el papel de tabla se conserva y solo se le agrega el tab stop.
   *
   * El guard `e.target !== e.currentTarget` es lo importante: si el foco está
   * en el checkbox de la fila y el usuario aprieta Espacio, el evento sale de la
   * fila y lo maneja el checkbox, no el drawer (y al revés tampoco: abrir la
   * fila no tilda la selección). `preventDefault` evita que Espacio haga scroll.
   */
  function abrirFilaConTecla(e, id) {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      setDrawerId(id)
    }
  }

  function trasEscribir() {
    setDetalleRecarga((n) => n + 1)
    setRecarga((n) => n + 1)
  }

  // --- escrituras de foto -------------------------------------------------

  async function subirArchivo() {
    if (!archivo) return
    if (archivo.size > MAX_FOTO_MB * 1024 * 1024) {
      setDrawerError(`La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son ${MAX_FOTO_MB} MB`)
      return
    }
    setSubiendoFoto(true)
    setDrawerError('')
    setFotoOk('')
    try {
      const fd = new FormData()
      fd.append('imagen', archivo)
      const { data } = await staffApi.post(`/staff/inventario/${drawerId}/foto`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      setArchivo(null)
      // El input de archivo se remonta para que volver a elegir la MISMA imagen
      // después de un cambio dispare el evento.
      setSubidaId((n) => n + 1)
      setFotoOk(`Foto subida. Quedó como "${data?.foto_estado || 'manual'}".`)
      // No se limpia ningún flag "sucio": una URL o un precio a medio escribir
      // sobreviven al refetch. Los que no había, el refetch los repone con el
      // estado real del servidor.
      trasEscribir()
    } catch (err) {
      setDrawerError(err.response?.data?.error || 'No se pudo subir la imagen')
      console.error('[inventario] error al subir la imagen:', err?.response?.status, err?.message)
    } finally {
      setSubiendoFoto(false)
    }
  }

  async function guardarUrl() {
    const valor = urlFoto.trim()
    // Quitarla NO pasa por acá: `DELETE /:id/foto` es la única ruta que borra la
    // foto y siempre pide confirmación. Vaciar el input es casi siempre un
    // accidente, así que se avisa en vez de despublicar la foto en silencio.
    if (!valor) {
      setDrawerError('Para quitar la foto usa el botón "Quitar foto" (pide confirmación)')
      return
    }
    if (!/^https?:\/\//i.test(valor)) {
      setDrawerError('La URL de la foto debe empezar por http:// o https://')
      return
    }
    if (valor.length > URL_FOTO_MAX) {
      setDrawerError(`La URL de la foto supera los ${URL_FOTO_MAX} caracteres`)
      return
    }
    setGuardandoFoto(true)
    setDrawerError('')
    setFotoOk('')
    try {
      // Solo `foto_url`: el server asume `manual` (la asignó una persona).
      const { data } = await staffApi.patch(`/staff/inventario/${drawerId}/foto`, {
        foto_url: valor,
      })
      setFotoOk(`URL guardada. Estado: "${data?.foto_estado || 'manual'}".`)
      // Guardado = el input ya refleja al servidor (con su redondeo), así que
      // el refetch posterior sí puede reponer este campo. El precio sucio NO se
      // toca: sigue sin guardar y no se debe perder.
      sucioRef.current.url = false
      trasEscribir()
    } catch (err) {
      setDrawerError(err.response?.data?.error || 'No se pudo guardar la URL de la foto')
      console.error('[inventario] error al guardar la URL de la foto:', err?.response?.status, err?.message)
    } finally {
      setGuardandoFoto(false)
    }
  }

  async function cambiarEstadoFoto(nuevo) {
    if (nuevo === (detalle?.producto?.foto_estado || '')) return
    setGuardandoFoto(true)
    setDrawerError('')
    setFotoOk('')
    try {
      const { data } = await staffApi.patch(`/staff/inventario/${drawerId}/foto`, {
        foto_estado: nuevo,
      })
      setFotoOk(`Estado cambiado a "${data?.foto_estado || nuevo}".`)
      trasEscribir()
    } catch (err) {
      setDrawerError(err.response?.data?.error || 'No se pudo cambiar el estado de la foto')
      console.error('[inventario] error al cambiar el estado de la foto:', err?.response?.status, err?.message)
    } finally {
      setGuardandoFoto(false)
    }
  }

  async function quitarFoto() {
    if (!window.confirm(
      '¿Quitar la foto de este producto?\n\nSe vacía la foto y el estado queda en "sin foto". El archivo guardado en Storage NO se borra.',
    )) return
    setGuardandoFoto(true)
    setDrawerError('')
    setFotoOk('')
    try {
      await staffApi.delete(`/staff/inventario/${drawerId}/foto`)
      setFotoOk('Foto quitada.')
      trasEscribir()
    } catch (err) {
      setDrawerError(err.response?.data?.error || 'No se pudo quitar la foto')
      console.error('[inventario] error al quitar la foto:', err?.response?.status, err?.message)
    } finally {
      setGuardandoFoto(false)
    }
  }

  // --- escritura de precio ------------------------------------------------

  async function guardarPrecio() {
    const n = Number(precioTexto)
    if (precioTexto === '' || !Number.isFinite(n) || n < 0) {
      setDrawerError('Escribe un precio mayor o igual a 0 (0 = quitar el precio)')
      return
    }
    setGuardandoPrecio(true)
    setDrawerError('')
    setNotaPrecio('')
    try {
      const { data } = await staffApi.patch(`/staff/inventario/${drawerId}/precio`, {
        precio_usd: n,
      })
      const partes = []
      if (data.precio_usd == null) {
        partes.push('Se quitó el precio: el producto quedó sin precio y despublicado.')
      } else {
        partes.push(`Precio guardado: $${formato(data.precio_usd)}.`)
      }
      if (data.precio_aplicado === false && data.precio_usd != null) {
        // Sin repetir el número: la primera parte de la nota ya lo dice.
        partes.push(
          'El número tecleado no sobrevive el redondeo precio → costo → precio ' +
            '(difiere en un centavo como máximo); se guardó el que se ve ahora.',
        )
      }
      if (data.limitado_por_otro_proveedor) {
        partes.push(
          'El precio no se movió porque otro proveedor tiene un costo menor: el costo ' +
            'del producto es siempre el más barato, y de ahí sale el precio.',
        )
      }
      setNotaPrecio(partes.join(' '))
      // El input ya refleja al servidor (con su redondeo), así que el refetch
      // posterior puede reponer este campo; la URL sucia NO se toca.
      sucioRef.current.precio = false
      trasEscribir()
    } catch (err) {
      setDrawerError(err.response?.data?.error || 'No se pudo guardar el precio')
      console.error('[inventario] error al guardar el precio:', err?.response?.status, err?.message)
    } finally {
      setGuardandoPrecio(false)
    }
  }

  // --- datos derivados del drawer ----------------------------------------
  const producto = detalle?.producto || null
  const fotoUrlActual = producto?.foto_url || ''
  const hayFoto = fotoUrlActual !== ''
  const puedeEditarPrecio = detalle?.puede_editar_precio === true
  const costoMasBarato = (detalle?.costos || []).find((c) => c.es_el_mas_barato) || null
  const refs = (detalle?.moleculas || [])
    .map((m) => m.moleculas_referencias)
    .filter(Boolean)
  // El código ATC (nivel 5), NO el `atc_id` de la FK: un bigint interno no le
  // dice nada a quien lee. `refs` ya viene desempaquetado, así que el embed está
  // en `refs[i].atc_clasificaciones`; es `null` en las 1.428 referencias sin ATC
  // (y con el backend viejo no viene), y ahí el `—` de la fila es la respuesta
  // honesta.
  const atcs = [...new Set(refs.map((r) => r.atc_clasificaciones?.codigo).filter(Boolean))]

  const filtrosActivos =
    (buscar ? 1 : 0) +
    (molecula ? 1 : 0) +
    (filtros.laboratorio ? 1 : 0) +
    (filtros.linea ? 1 : 0) +
    (filtros.forma ? 1 : 0) +
    (filtros.foto_estado ? 1 : 0) +
    (filtros.sin_precio ? 1 : 0) +
    (filtros.sin_proveedor ? 1 : 0)

  // Fuera de rango, por SÍNTOMA y no comparando páginas: `setTotalPaginas` y el
  // `setPagina` del recorte viven en el mismo `.then`, así que React 18 los
  // commitea juntos (batching) y en ese render `pagina === totalPaginas`
  // siempre. Comparar las dos no da `true` nunca; lo que sí se ve en pantalla
  // es la página vacía mientras llega la correcta.
  //
  // `total > 0 && productos.length === 0` = el filtro tiene coincidencias pero
  // el offset pidió una página que ya no existe. Es el único caso en que el
  // backend devuelve vacío con `total > 0`, así que no puede quedar prendido:
  // es derivado del estado commiteado (sin flags que limpiar) y el fetch
  // correctivo lo apaga al traer las filas.
  //
  // El caso legítimo de "no hay nada que coincida" tiene `total === 0`, así que
  // este gate NO lo alcanza y el mensaje de vacío sigue siendo correcto ahí.
  const paginaVaciaFueraDeRango = productos.length === 0 && total > 0
  const vacio = productos.length === 0 && !cargando && !paginaVaciaFueraDeRango && !error

  return (
    <LayoutDepartamento departamento="logistica" activo="inventario" titulo="Inventario">
      <div className="sp-page">
        {esMobile ? (
          <button
            type="button"
            className="si-btn si-btn--filtros"
            onClick={() => setFiltrosAbiertos(true)}
          >
            Filtros{filtrosActivos > 0 ? ` (${filtrosActivos})` : ''}
          </button>
        ) : (
          <div className="sp-toolbar">
            <BarraFiltros
              filtros={{ ...filtros, buscar, molecula }}
              cambiarFiltro={cambiarFiltro}
              opciones={opciones}
              onLimpiar={limpiarFiltros}
            />
          </div>
        )}

        {errorOpciones && <p className="sp-error">{errorOpciones}</p>}

        <div className="sp-resumen">
          Mostrando {productos.length} de {total} productos
          {opciones?.conteos?.total != null && ` · ${opciones.conteos.total} activos en total`}
          {opciones?.moleculas_total
            ? ` · ${opciones.moleculas_total} moléculas distintas`
            : ''}
        </div>

        {error && <p className="sp-error">{error}</p>}

        {cargando || paginaVaciaFueraDeRango ? (
          <div className="sp-loading">
            {/* Si además falló el fetch correctivo, no hay carga en curso:
                decirlo, en vez de un spinner que promete un progreso que no
                va a llegar. El error real ya se muestra arriba con `sp-error`. */}
            {error ? 'No se pudo mostrar esta página.' : 'Cargando inventario...'}
          </div>
        ) : vacio ? (
          <div className="sp-loading">No hay productos con esos filtros.</div>
        ) : esMobile ? (
          <div className="si-tarjetas">
            {productos.map((p) => (
              <button key={p.id} type="button" className="si-tarjeta" onClick={() => setDrawerId(p.id)}>
                <ImagenProducto
                  src={p.foto_url}
                  alt=""
                  className="si-thumb si-thumb--card"
                />
                <span className="si-tarjeta__texto">
                  <span className="si-tarjeta__nombre">{p.nombre_comercial}</span>
                  {p.molecula && <span className="si-tarjeta__mol">{p.molecula}</span>}
                </span>
                <span className="si-tarjeta__precio">
                  {p.precio_usd != null ? `$${formato(p.precio_usd)}` : 'Sin precio'}
                </span>
                <BadgeFoto estado={p.foto_estado} />
              </button>
            ))}
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>
<input
                       type="checkbox"
                       aria-label="Seleccionar la página"
                       checked={productos.length > 0 && seleccion.length === productos.length}
                       ref={checkTodosRef}
                       onChange={(e) =>
                         setSeleccion(e.target.checked ? productos.map((p) => p.id) : [])
                       }
                     />
                  </th>
                  <th />
                  <th aria-sort={ordenDe('nombre')}>
                    <button
                      type="button"
                      className="sp-sortable si-th-sort"
                      onClick={() => toggleSort('nombre')}
                    >
                      Nombre {flechaSort('nombre')}
                    </button>
                  </th>
                  <th>Laboratorio</th>
                  <th>Molécula</th>
                  <th className="si-col-costo">Costo</th>
                  <th aria-sort={ordenDe('precio')}>
                    <button
                      type="button"
                      className="sp-sortable si-th-sort"
                      onClick={() => toggleSort('precio')}
                    >
                      Precio USD {flechaSort('precio')}
                    </button>
                  </th>
                  <th>Foto</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr
                    key={p.id}
                    tabIndex={0}
                    onClick={() => setDrawerId(p.id)}
                    onKeyDown={(e) => abrirFilaConTecla(e, p.id)}
                    className="si-fila"
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Marcar ${p.nombre_comercial}`}
                        checked={seleccion.includes(p.id)}
                        onChange={() => toggleSeleccion(p.id)}
                      />
                    </td>
                    <td>
                      <ImagenProducto
                        src={p.foto_url}
                        alt={p.nombre_comercial}
                        className="si-thumb"
                      />
                    </td>
                    <td className="sp-nombre">
                      <div className="si-nombre">{p.nombre_comercial}</div>
                      {p.sku && <div className="sp-mol">{p.sku}</div>}
                    </td>
                    <td>
                      <div>{p.laboratorio || '—'}</div>
                      {!p.tiene_proveedor && <span className="si-mini-badge">sin proveedor</span>}
                    </td>
                    <td>{p.molecula || '—'}</td>
                    <td className="si-col-costo">
                      {p.costo_usd != null ? `$${formato(p.costo_usd)}` : '—'}
                    </td>
                    <td className="sp-precio">
                      <span className={`si-precio ${p.precio_usd != null ? '' : 'si-precio--vacio'}`}>
                        {p.precio_usd != null ? `$${formato(p.precio_usd)}` : 'Sin precio'}
                      </span>
                    </td>
                    <td><BadgeFoto estado={p.foto_estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          /* Con `pagina` directo, no con una página "efectiva": al recortarse,
             el batching deja `pagina === totalPaginas`, así que esto nunca
             muestra "Página 7 de 6" ni advancement mal deshabilitado. */
          <div className="sp-paginacion">
            <button disabled={pagina <= 1} onClick={() => setPagina(1)} aria-label="Primera página">⏮️</button>
            <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} aria-label="Página anterior">◀️</button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)} aria-label="Página siguiente">▶️</button>
            <button disabled={pagina >= totalPaginas} onClick={() => setPagina(totalPaginas)} aria-label="Última página">⏭️</button>
          </div>
        )}

        {seleccion.length > 0 && (
          <div className="si-seleccion">
            <strong>{seleccion.length} marcados.</strong>{' '}
            <button type="button" className="si-btn si-btn--sutil" onClick={() => setSeleccion([])}>
              Limpiar
            </button>
            <span className="sp-hint">
              Las acciones en bloque (precio o foto para varios productos) todavía no están en
              esta página: por ahora el checkbox solo lleva la cuenta.
            </span>
          </div>
        )}

        {/* Hoja de filtros en móvil */}
        {esMobile && filtrosAbiertos && (
          <div className="si-sheet">
            <div className="si-sheet__overlay" onClick={() => setFiltrosAbiertos(false)} />
            <div className="si-sheet__panel" role="dialog" aria-modal="true" aria-label="Filtros del inventario">
              <div className="si-sheet__header">
                <span className="si-sheet__titulo">Filtros</span>
                <button
                  type="button"
                  className="si-sheet__cerrar"
                  onClick={() => setFiltrosAbiertos(false)}
                >
                  Cerrar
                </button>
              </div>
              <div className="sp-toolbar">
                <BarraFiltros
                  filtros={{ ...filtros, buscar, molecula }}
                  cambiarFiltro={cambiarFiltro}
                  opciones={opciones}
                  onLimpiar={limpiarFiltros}
                />
              </div>
              <button
                type="button"
                className="si-btn si-btn--principal"
                onClick={() => setFiltrosAbiertos(false)}
              >
                Ver {total} producto{total === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        )}

        {/* Drawer del producto */}
        {drawerId != null && (
          <div className="si-drawer" role="dialog" aria-modal="true" aria-label="Detalle del producto">
            <div className="si-drawer__overlay" onClick={() => setDrawerId(null)} />
            <div className="si-drawer__panel">
              <div className="si-drawer__header">
                <div className="si-drawer__head-textos">
                  <p className="si-drawer__eyebrow">Producto #{drawerId}</p>
                  <h2 className="si-drawer__titulo">
                    {producto?.nombre_comercial || 'Cargando...'}
                  </h2>
                  {producto?.sku && <p className="si-drawer__sku">{producto.sku}</p>}
                </div>
                <button
                  type="button"
                  className="si-drawer__cerrar"
                  onClick={() => setDrawerId(null)}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <div className="si-drawer__body">
                {detalleError && <p className="si-nota si-nota--error" role="alert">{detalleError}</p>}
{drawerError && <p className="si-nota si-nota--error" role="alert">{drawerError}</p>}
{fotoOk && <p className="si-nota si-nota--ok" role="status">{fotoOk}</p>}

                {producto && (
                  <>
                    {/* 1. Foto */}
                    <section className="si-fieldset">
                      <h3 className="si-fieldset__titulo">Foto</h3>
                      <ImagenProducto
                        src={producto.foto_url}
                        alt={producto.nombre_comercial}
                        className="si-preview"
                        vacio="Este producto no tiene foto"
                      />
                      {!hayFoto && (
                        <p className="sp-hint">
                          Sin foto: es lo que aparece en el catálogo hasta que le pongas una.
                        </p>
                      )}

                      <div className="si-fila-botones">
                        <label className="sp-importar__file si-file">
                          {archivo ? archivo.name : 'Elegir imagen...'}
                          <input
                            key={subidaId}
                            type="file"
                            accept="image/*"
                            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                          />
                        </label>
                        <button
                          type="button"
                          className="si-btn si-btn--principal"
                          onClick={subirArchivo}
                          disabled={!archivo || subiendoFoto}
                        >
                          {subiendoFoto ? 'Subiendo...' : 'Subir foto'}
                        </button>
                      </div>
                      <p className="sp-hint">
                        Se re-codifica a JPEG (máx 800 px) y se guarda en nuestro Storage. La
                        imagen anterior no se borra del bucket.
                      </p>

                      <div className="si-fila-botones">
                        <input
                          type="text"
                          className="sp-input si-input-url"
                          placeholder="https://... (URL de la foto)"
                          value={urlFoto}
                          onChange={(e) => { setUrlFoto(e.target.value); setDrawerError('') }}
                        />
                        <button
                          type="button"
                          className="si-btn"
                          onClick={guardarUrl}
                          disabled={guardandoFoto || urlFoto.trim() === fotoUrlActual}
                        >
                          Guardar URL
                        </button>
                      </div>

                      <div className="si-fila-botones">
                        <button
                          type="button"
                          className="si-btn si-btn--peligro"
                          onClick={quitarFoto}
                          disabled={!hayFoto || guardandoFoto}
                        >
                          Quitar foto
                        </button>
                        <a
                          className="si-btn si-btn--sutil"
                          href={`/producto/${producto.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir en el catálogo público
                        </a>
                      </div>
                    </section>

                    {/* 2. Estado de la foto */}
                    <section className="si-fieldset">
                      <label className="si-label" htmlFor="si-select-estado">
                          <span>Estado de la foto</span>
                          <select
                            id="si-select-estado"
                            className="sp-select si-select-estado"
                            value={producto.foto_estado || 'sin_foto'}
                            disabled={guardandoFoto}
                            onChange={(e) => cambiarEstadoFoto(e.target.value)}
                          >
                            {FOTO_ESTADOS.map((e) => {
                              // Coherencia (la misma regla del server): con foto no se
                              // puede elegir "sin foto", y sin foto no se puede elegir
                              // "ok" ni "manual". Se deshabilitan en vez de dejar que
                              // el servidor las rechace con un 400.
                              const imposible = hayFoto
                                ? e.valor === 'sin_foto'
                                : (e.valor === 'ok' || e.valor === 'manual')
                              return (
                                <option key={e.valor} value={e.valor} disabled={imposible}>
                                  {e.etiqueta}
                                </option>
                              )
                            })}
                          </select>
                        </label>
                      <p className="sp-hint">
                        {(FOTO_ESTADOS.find((e) => e.valor === producto.foto_estado)
                          || FOTO_ESTADOS[0]).ayuda}
                      </p>
                    </section>

                    {/* 3. Precio */}
                    <section className="si-fieldset">
                      <h3 className="si-fieldset__titulo">Precio</h3>
                      <div className="si-grid-precio">
                        <label className="si-label">
                          <span>Precio USD (editable)</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="sp-input"
                            value={precioTexto}
                            disabled={!puedeEditarPrecio}
                            onChange={(e) => { setPrecioTexto(e.target.value); setNotaPrecio('') }}
                          />
                        </label>
                        <label className="si-label">
                          <span>Costo USD (derivado)</span>
                          <input
                            type="text"
                            readOnly
                            className="sp-input si-input--readonly"
                            value={
                              producto.costo_usd != null ? `$${formato(producto.costo_usd)}` : ''
                            }
                          />
                        </label>
                      </div>

                      <p className="sp-hint">
                        El costo no se escribe: sale del precio (costo = precio × 0.6) y lo calcula
                        el servidor. Si el producto tiene proveedor, el costo que ves es el más
                        barato: <strong>{costoMasBarato ? costoMasBarato.proveedor : 'ninguno'}</strong>
                        {detalle.costos.length > 1 &&
                          ` (de ${detalle.costos.length} proveedores; gana el mínimo)`}.
                      </p>

                      {detalle.sin_proveedor ? (
                        <p className="si-nota">
                          Este producto no tiene ninguna fila de proveedor: el precio se escribe
                          directo en el catálogo y no viene de ningún Excel. La próxima importación
                          de proveedor no lo toca (no hay fila que pisar).
                        </p>
                      ) : (
                        <p className="si-nota">
                          El ajuste manual se guarda en la fila del proveedor y la próxima
                          importación de ese proveedor lo pisa: no hay marca de «editado a mano».
                        </p>
                      )}

                      {!puedeEditarPrecio && (
                        <p className="si-sin-permiso">El precio se cambia en Comercial</p>
                      )}

                      <div className="si-fila-botones">
                        <button
                          type="button"
                          className="si-btn si-btn--principal"
                          onClick={guardarPrecio}
                          disabled={!puedeEditarPrecio || guardandoPrecio}
                        >
                          {guardandoPrecio ? 'Guardando...' : 'Guardar precio'}
                        </button>
                        <button
                          type="button"
                          className="si-btn si-btn--sutil"
                          onClick={() => {
                            setPrecioTexto(
                              producto.precio_usd != null ? String(producto.precio_usd) : '',
                            )
                            setNotaPrecio('')
                            setDrawerError('')
                          }}
                          disabled={!puedeEditarPrecio}
                        >
                          Descartar
                        </button>
                      </div>
                      <p className="sp-hint">
                        Un precio de <strong>0</strong> no es un error: quita el precio y despublica
                        el producto.
                      </p>
                      {notaPrecio && <p className="si-nota si-nota--ok" role="status">{notaPrecio}</p>}
                    </section>

                    {/* 4. Datos (solo lectura) */}
                    <section className="si-fieldset">
                      <h3 className="si-fieldset__titulo">Datos</h3>
                      <div className="si-datos">
                        <Dato etiqueta="SKU" valor={producto.sku} mono />
                        <Dato etiqueta="Registro INHRR" valor={producto.fuente_inhrr_ef} mono />
                        <Dato etiqueta="Laboratorio" valor={producto.laboratorio} />
                        <Dato etiqueta="Línea" valor={producto.linea} />
                        <Dato etiqueta="Forma" valor={producto.forma} />
                        <Dato etiqueta="Molécula (columna)" valor={producto.molecula} />
                        <Dato
                          etiqueta="Moléculas (vademécum)"
                          valor={refs.map((r) => r.nombre).join(', ')}
                        />
                        <Dato
                          etiqueta="ATC"
                          valor={atcs.length > 0 ? atcs.join(', ') : '—'}
                          mono
                        />
                        <Dato
                          etiqueta="Publicación"
                          valor={`activo: ${siNo(producto.activo)} · visible: ${siNo(
                            producto.visible_catalogo,
                          )} · disponible: ${siNo(producto.disponible)}`}
                        />
                        <Dato etiqueta="Creado" valor={formatoFecha(producto.created_at)} />
                        <Dato etiqueta="Actualizado" valor={formatoFecha(producto.updated_at)} />
                        <Dato etiqueta="URL de la foto" valor={fotoUrlActual} mono />
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutDepartamento>
  )
}

export default StaffInventario
