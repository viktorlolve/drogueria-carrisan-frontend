import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { Star, List, Plus, MoreVertical, Pencil, Trash2, CheckSquare, Bookmark } from 'lucide-react'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
import { useFavoritos } from '../context/FavoritosContext'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_UNIFICADO } from '../components/paginas-principales/NavUnificado'
import BarraHerramientas from '../components/mis-items/BarraHerramientas'
import ComprarDeNuevo from '../components/mis-items/ComprarDeNuevo'
import HojaGuardarEnLista from '../components/mis-items/HojaGuardarEnLista'
import TarjetaProducto from '../components/mis-items/TarjetaProducto'
import Toast from '../components/mis-items/Toast'
import useToast from '../components/mis-items/useToast'
import { ModalNombreLista, ModalConfirmar, ModalAgregarProductos } from '../components/mis-items/ModalesLista'
import '../components/mis-items/MisItems.css'

// Sugerencias de listas rápidas. Solo crea la lista con este nombre;
// no llevan lógica especial más allá de eso.
const LISTAS_SUGERIDAS = ['Favoritos', 'Antibióticos', 'Cuidado Personal', 'Vitaminas']

const TABS = [
  { id: 'items', label: 'Mis Items' },
  { id: 'recomprar', label: 'Comprar de nuevo' },
]

// Lee las listas del usuario junto con sus miembros: devuelve las listas y un
// Map(listaId → Set(productoId)). Función de módulo (no del componente) para
// poder encadenarla con .then() desde el efecto y respetar la regla de lint
// react-hooks/set-state-in-effect (que marca cualquier async con setState).
async function leerListasCompletas() {
  const { data: listasData } = await api.get('/lists')
  const pares = await Promise.all(
    listasData.map(async (l) => {
      const { data: items } = await api.get(`/lists/${l.id}/items`)
      return [l.id, new Set(items.map((it) => it.producto_id))]
    })
  )
  return { listas: listasData, miembros: new Map(pares) }
}

// ---------------------------------------------------------
// Tab: Mis Items (favoritos + chips de listas + filtro por línea)
// ---------------------------------------------------------
function TabMisItems({
  tasaVes,
  favoritos,
  cargandoFav,
  idsEnListas,
  toggleFavorito,
  seleccion,
  setSeleccion,
  salirSeleccion,
  listas,
  cargandoListas,
  miembros,
  abrirCrear,
  abrirAgregar,
  renombrar,
  eliminar,
  abrirHoja,
  notificar,
}) {
  const { items: cartItems, addItem } = useCart()

  const [busqueda, setBusqueda] = useState('')
  const [lineaActiva, setLineaActiva] = useState('todo')
  const [vista, setVista] = useState('grid') // 'grid' | 'lista'
  const [menuChip, setMenuChip] = useState(null) // { lista, top, right }

  function cantidadEnCarrito(productoId) {
    const linea = cartItems.find((i) => i.producto.id === productoId)
    return linea?.cantidad || 0
  }

  const itemsFiltrados = useMemo(() => {
    let resultado = favoritos
    if (lineaActiva !== 'todo') {
      resultado = resultado.filter((p) => p.linea === lineaActiva)
    }
    if (busqueda.trim()) {
      const termino = busqueda.trim().toLowerCase()
      resultado = resultado.filter((p) => p.nombre_comercial?.toLowerCase().includes(termino))
    }
    return resultado
  }, [favoritos, lineaActiva, busqueda])

  // ---- Selección múltiple ----
  const activarSeleccion = () => setSeleccion({ activo: true, ids: new Set() })

  function toggleSeleccion(id) {
    setSeleccion((prev) => {
      const ids = new Set(prev.ids)
      if (ids.has(id)) ids.delete(id)
      else ids.add(id)
      return { ...prev, ids }
    })
  }

  const todosSeleccionados =
    itemsFiltrados.length > 0 && itemsFiltrados.every((p) => seleccion.ids.has(p.id))

  function alternarTodos() {
    if (todosSeleccionados) setSeleccion({ activo: true, ids: new Set() })
    else setSeleccion({ activo: true, ids: new Set(itemsFiltrados.map((p) => p.id)) })
  }

  function guardarSeleccion() {
    const elegidos = favoritos.filter((f) => seleccion.ids.has(f.id))
    abrirHoja(elegidos)
  }

  async function quitarSeleccion() {
    const aQuitar = favoritos.filter((f) => seleccion.ids.has(f.id))
    for (const p of aQuitar) await toggleFavorito(p)
    salirSeleccion()
    if (aQuitar.length > 0) {
      notificar(`${aQuitar.length} producto${aQuitar.length !== 1 ? 's' : ''} quitado${aQuitar.length !== 1 ? 's' : ''}`)
    }
  }

  // ---- Quitar un solo favorito con opción de deshacer ----
  function quitarFavoritoUnico(producto) {
    toggleFavorito(producto)
    notificar('Quitado de tus favoritos', {
      accion: { label: 'Deshacer', onClick: () => toggleFavorito(producto) },
    })
  }

  // ---- Menú de acciones del chip (portal para no recortarse con el scroll) ----
  function abrirMenuChip(e, lista) {
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuChip({
      lista,
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
    })
  }

  return (
    <>
      {/* Chips de listas */}
      <div className="fav-chips">
        <button
          type="button"
          className="fav-chip fav-chip--on"
          onClick={() => { setBusqueda(''); setLineaActiva('todo') }}
        >
          <Star size={15} fill="currentColor" />
          <span>Favoritos</span>
          <span className="fav-chip__n">{favoritos.length}</span>
        </button>

        {cargandoListas
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="fav-chip fav-chip--skeleton" />
            ))
          : listas.map((l) => {
              const total = miembros.get(l.id)?.size || 0
              const contenido = (
                <>
                  <List size={15} />
                  <span>{l.nombre}</span>
                  <span className="fav-chip__n">{total}</span>
                </>
              )
              return l.es_predeterminada ? (
                <Link key={l.id} className="fav-chip" to={`/listas/${l.id}`}>
                  {contenido}
                </Link>
              ) : (
                <div key={l.id} className="fav-chip-menu">
                  <Link className="fav-chip" to={`/listas/${l.id}`}>
                    {contenido}
                  </Link>
                  <button
                    type="button"
                    className="fav-chip-menu__trig"
                    onClick={(e) => abrirMenuChip(e, l)}
                    aria-label={`Acciones de la lista ${l.nombre}`}
                  >
                    <MoreVertical size={15} />
                  </button>
                </div>
              )
            })}

        <button type="button" className="fav-chip fav-chip--nueva" onClick={abrirCrear}>
          <Plus size={16} />
          <span>Nueva lista</span>
        </button>
      </div>

      <div className="fav-cab">
        <div className="fav-cab__titulos">
          <h2>Todos los artículos guardados</h2>
          {!cargandoFav && favoritos.length > 0 && (
            <p>
              {favoritos.length} producto{favoritos.length !== 1 ? 's' : ''} guardado
              {favoritos.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="fav-cab__acciones">
          <button type="button" className="fav-btn fav-btn--secundario" onClick={abrirAgregar}>
            <Plus size={16} /> Agregar producto
          </button>
        </div>
      </div>

      {!cargandoFav && favoritos.length > 0 && (
        <BarraHerramientas
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          placeholder="Buscar en esta lista"
          lineaActiva={lineaActiva}
          onLinea={setLineaActiva}
          vista={vista}
          onVista={setVista}
          extra={
            <button
              type="button"
              className={`fav-barra__btn ${seleccion.activo ? 'fav-barra__btn--on' : ''}`}
              onClick={() => (seleccion.activo ? salirSeleccion() : activarSeleccion())}
              aria-pressed={seleccion.activo}
            >
              <CheckSquare size={16} />
              <span>Seleccionar</span>
            </button>
          }
        />
      )}

      {cargandoFav ? (
        <div className={`fav-grid fav-grid--${vista}`} aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fav-card fav-card--skeleton" />
          ))}
        </div>
      ) : favoritos.length === 0 ? (
        <div className="fav-estado">
          <span className="fav-estado__icono"><Star size={28} /></span>
          <h2>Todavía no tienes productos favoritos</h2>
          <p>Guarda productos para encontrarlos rápido y agregarlos a tus listas.</p>
          <Link to="/catalogo" className="fav-btn fav-btn--primario">Explorar catálogo</Link>
        </div>
      ) : itemsFiltrados.length === 0 ? (
        <p className="fav-vacio-filtro">No hay favoritos que coincidan con los filtros actuales.</p>
      ) : (
        <div className={`fav-grid fav-grid--${vista} ${seleccion.activo ? 'fav-grid--con-barra' : ''}`}>
          {itemsFiltrados.map((producto) => (
            <TarjetaProducto
              key={producto.id}
              producto={producto}
              vista={vista}
              tasaVes={tasaVes}
              cantidadEnCarrito={cantidadEnCarrito(producto.id)}
              onAgregar={() => addItem(producto, 1)}
              onGuardar={() => abrirHoja(producto)}
              enAlgunaLista={idsEnListas.has(producto.id)}
              onQuitar={() => quitarFavoritoUnico(producto)}
              etiquetaQuitar="Quitar de favoritos"
              modoSeleccion={seleccion.activo}
              seleccionado={seleccion.ids.has(producto.id)}
              onToggleSeleccion={() => toggleSeleccion(producto.id)}
            />
          ))}
        </div>
      )}

      {/* Barra fija del modo selección (portal) */}
      {seleccion.activo && createPortal(
        <div className="fav-portal">
          <div className="fav-barra-sel">
            <div className="fav-barra-sel__info">
              <span>
                {seleccion.ids.size} seleccionado{seleccion.ids.size !== 1 ? 's' : ''}
              </span>
              <button type="button" className="fav-link" onClick={alternarTodos}>
                {todosSeleccionados ? 'Quitar selección' : 'Seleccionar todo'}
              </button>
            </div>
            <div className="fav-barra-sel__acciones">
              <button
                type="button"
                onClick={guardarSeleccion}
                disabled={seleccion.ids.size === 0}
              >
                <Bookmark size={18} />
                <span>Guardar en lista</span>
              </button>
              <button
                type="button"
                className="fav-barra-sel__peligro"
                onClick={quitarSeleccion}
                disabled={seleccion.ids.size === 0}
                aria-label="Quitar de favoritos"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Menú de acciones del chip (portal) */}
      {menuChip && createPortal(
        <div className="fav-portal">
          <div className="fav-menu__cierre" onClick={() => setMenuChip(null)} />
          <ul
            className="fav-menu__lista fav-menu__lista--fija"
            style={{ top: menuChip.top, right: menuChip.right }}
          >
            <li>
              <button
                type="button"
                onClick={() => { const l = menuChip.lista; setMenuChip(null); renombrar(l) }}
              >
                <Pencil size={15} /> Renombrar
              </button>
            </li>
            <li>
              <button
                type="button"
                className="fav-menu__peligro"
                onClick={() => { const l = menuChip.lista; setMenuChip(null); eliminar(l) }}
              >
                <Trash2 size={15} /> Eliminar
              </button>
            </li>
          </ul>
        </div>,
        document.body
      )}
    </>
  )
}

// ---------------------------------------------------------
// Componente principal
// ---------------------------------------------------------
function MisItems() {
  // La pestaña activa vive en la URL (?tab=recomprar) en vez de un useState
  // suelto: así el link "Comprar de nuevo" del menú puede llevar directo a esa
  // pestaña, y el botón "atrás" del navegador también funciona como uno espera.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabActivo = searchParams.get('tab') === 'recomprar' ? 'recomprar' : 'items'

  const { favoritos, esFavorito, toggleFavorito, loading: cargandoFav } = useFavoritos()
  const { toast, mostrar, cerrar } = useToast()

  // Tasa de cambio VES — global, se carga una sola vez.
  const [tasaVes, setTasaVes] = useState(null)
  useEffect(() => {
    api
      .get('/prices')
      .then((res) => setTasaVes(res.data.usd_a_ves))
      .catch(() => setTasaVes(null))
  }, [])

  // Listas del usuario + sus miembros (Map(listaId → Set(productoId)))
  const [listas, setListas] = useState([])
  const [miembros, setMiembros] = useState(() => new Map())
  const [cargandoListas, setCargandoListas] = useState(true)
  const [ocupadas, setOcupadas] = useState(() => new Set())

  useEffect(() => {
    let activo = true
    leerListasCompletas()
      .then(({ listas: l, miembros: m }) => {
        if (!activo) return
        setListas(l)
        setMiembros(m)
      })
      .catch(() => { if (activo) console.error('Error al cargar listas') })
      .finally(() => { if (activo) setCargandoListas(false) })
    return () => { activo = false }
  }, [])

  // ---- Modales ----
  const [modalNombre, setModalNombre] = useState(null) // null | { lista: null | listaObj }
  const [modalEliminar, setModalEliminar] = useState(null)
  const [modalAgregar, setModalAgregar] = useState(false)
  const [hojaProductos, setHojaProductos] = useState(null)
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  // ---- Selección múltiple (a nivel de página: el Toast y el layout la leen) ----
  const [seleccion, setSeleccion] = useState({ activo: false, ids: new Set() })
  const salirSeleccion = useMemo(
    () => () => setSeleccion({ activo: false, ids: new Set() }),
    []
  )

  const idsEnListas = useMemo(() => {
    const s = new Set()
    for (const set of miembros.values()) for (const id of set) s.add(id)
    return s
  }, [miembros])

  const nombresExistentes = useMemo(
    () => new Set(listas.map((l) => l.nombre.trim().toLowerCase())),
    [listas]
  )

  const sugerenciasDisponibles = useMemo(
    () => LISTAS_SUGERIDAS.filter((n) => !nombresExistentes.has(n.toLowerCase())),
    [nombresExistentes]
  )

  const existentesParaModal = useMemo(() => {
    const editId = modalNombre?.lista?.id
    return listas.filter((l) => l.id !== editId).map((l) => l.nombre.trim().toLowerCase())
  }, [listas, modalNombre])

  function cambiarTab(id) {
    salirSeleccion()
    setSearchParams(id === 'recomprar' ? { tab: 'recomprar' } : {})
  }

  // ---- Abrir hoja "Guardar en lista" (acepta 1 producto o un arreglo) ----
  function abrirHoja(productos) {
    const arr = Array.isArray(productos) ? productos : [productos]
    if (arr.length === 0) return
    salirSeleccion()
    setHojaProductos(arr)
  }

  // ---- CRUD de listas ----
  async function guardarNombre(nombre) {
    const editando = modalNombre?.lista
    setGuardandoNombre(true)
    try {
      if (editando) {
        await api.patch(`/lists/${editando.id}`, { nombre })
        setListas((prev) => prev.map((l) => (l.id === editando.id ? { ...l, nombre } : l)))
        mostrar('Lista renombrada')
      } else {
        const { data } = await api.post('/lists', { nombre })
        setListas((prev) => [...prev, data])
        setMiembros((prev) => new Map(prev).set(data.id, new Set()))
        mostrar('Lista creada')
      }
      setModalNombre(null)
    } catch {
      mostrar(editando ? 'No se pudo renombrar la lista' : 'No se pudo crear la lista', { tipo: 'error' })
    } finally {
      setGuardandoNombre(false)
    }
  }

  async function eliminarLista() {
    const lista = modalEliminar
    if (!lista) return
    setEliminando(true)
    try {
      await api.delete(`/lists/${lista.id}`)
      setListas((prev) => prev.filter((l) => l.id !== lista.id))
      setMiembros((prev) => {
        const m = new Map(prev)
        m.delete(lista.id)
        return m
      })
      setModalEliminar(null)
      mostrar('Lista eliminada')
    } catch {
      mostrar('No se pudo eliminar la lista', { tipo: 'error' })
    } finally {
      setEliminando(false)
    }
  }

  // ---- Hoja: alternar productos en una lista existente ----
  async function alternarEnLista(lista, productos, accion) {
    setOcupadas((prev) => new Set(prev).add(lista.id))
    try {
      if (accion === 'agregar') {
        const faltan = productos.filter((p) => !miembros.get(lista.id)?.has(p.id))
        for (const p of faltan) {
          await api.post(`/lists/${lista.id}/items`, { producto_id: p.id })
        }
        setMiembros((prev) => {
          const m = new Map(prev)
          const set = new Set(m.get(lista.id) || [])
          faltan.forEach((p) => set.add(p.id))
          m.set(lista.id, set)
          return m
        })
        mostrar('Guardado en la lista')
      } else {
        const quitar = productos.filter((p) => miembros.get(lista.id)?.has(p.id))
        for (const p of quitar) {
          await api.delete(`/lists/${lista.id}/items/${p.id}`)
        }
        setMiembros((prev) => {
          const m = new Map(prev)
          const set = new Set(m.get(lista.id) || [])
          quitar.forEach((p) => set.delete(p.id))
          m.set(lista.id, set)
          return m
        })
        mostrar('Quitado de la lista')
      }
    } catch {
      mostrar('No se pudo actualizar la lista', { tipo: 'error' })
    } finally {
      setOcupadas((prev) => {
        const s = new Set(prev)
        s.delete(lista.id)
        return s
      })
    }
  }

  // ---- Hoja: crear lista nueva y guardar los productos ahí ----
  // Lanza si falla para que la hoja muestre el error con su propio estado.
  async function crearDesdeHoja(nombre, productos) {
    const { data } = await api.post('/lists', { nombre })
    for (const p of productos) {
      await api.post(`/lists/${data.id}/items`, { producto_id: p.id })
    }
    setListas((prev) => [...prev, data])
    setMiembros((prev) => new Map(prev).set(data.id, new Set(productos.map((p) => p.id))))
    mostrar(`Lista "${nombre}" creada`)
  }

  const acciones = {
    abrirCrear: () => setModalNombre({ lista: null }),
    abrirAgregar: () => setModalAgregar(true),
    renombrar: (lista) => setModalNombre({ lista }),
    eliminar: (lista) => setModalEliminar(lista),
    abrirHoja,
    notificar: mostrar,
  }

  return (
    <LayoutPaginaPrincipal
      activo={tabActivo === 'recomprar' ? 'comprar-nuevo' : 'mis-items'}
      titulo="Mis Items"
      subtitulo="Tus favoritos, listas y compras frecuentes"
      nav={NAV_UNIFICADO}
    >
      <div className="fav-root">
        <div className="fav-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`fav-tab ${tabActivo === tab.id ? 'fav-tab--on' : ''}`}
              onClick={() => cambiarTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tabActivo === 'items' ? (
          <TabMisItems
            tasaVes={tasaVes}
            favoritos={favoritos}
            cargandoFav={cargandoFav}
            idsEnListas={idsEnListas}
            toggleFavorito={toggleFavorito}
            seleccion={seleccion}
            setSeleccion={setSeleccion}
            salirSeleccion={salirSeleccion}
            listas={listas}
            cargandoListas={cargandoListas}
            miembros={miembros}
            abrirCrear={acciones.abrirCrear}
            abrirAgregar={acciones.abrirAgregar}
            renombrar={acciones.renombrar}
            eliminar={acciones.eliminar}
            abrirHoja={acciones.abrirHoja}
            notificar={acciones.notificar}
          />
        ) : (
          <ComprarDeNuevo tasaVes={tasaVes} onGuardar={abrirHoja} idsEnListas={idsEnListas} />
        )}
      </div>

      {/* ---- Modales y hoja (portales) ---- */}
      {modalNombre && (
        <ModalNombreLista
          titulo={modalNombre.lista ? 'Renombrar lista' : 'Crear una nueva lista'}
          textoBoton={modalNombre.lista ? 'Guardar' : 'Crear lista'}
          inicial={modalNombre.lista?.nombre || ''}
          existentes={existentesParaModal}
          sugerencias={modalNombre.lista ? [] : sugerenciasDisponibles}
          guardando={guardandoNombre}
          onGuardar={guardarNombre}
          onCerrar={() => setModalNombre(null)}
        />
      )}

      {modalEliminar && (
        <ModalConfirmar
          titulo="Eliminar lista"
          texto={`¿Seguro que quieres eliminar "${modalEliminar.nombre}"? Los productos seguirán en tus favoritos.`}
          textoConfirmar="Eliminar"
          procesando={eliminando}
          onConfirmar={eliminarLista}
          onCerrar={() => setModalEliminar(null)}
        />
      )}

      {hojaProductos && (
        <HojaGuardarEnLista
          productos={hojaProductos}
          listas={listas}
          miembros={miembros}
          ocupadas={ocupadas}
          onAlternar={alternarEnLista}
          onCrear={crearDesdeHoja}
          onCerrar={() => setHojaProductos(null)}
        />
      )}

      {modalAgregar && (
        <ModalAgregarProductos
          modo="favoritos"
          favoritos={favoritos}
          idsEnLista={idsEnListas}
          yaEsta={(p) => esFavorito(p.id)}
          onAgregarUno={async (p) => { if (!esFavorito(p.id)) await toggleFavorito(p) }}
          onCerrar={() => setModalAgregar(false)}
        />
      )}

      <Toast toast={toast} onCerrar={cerrar} sobreBarra={seleccion.activo && tabActivo === 'items'} />
    </LayoutPaginaPrincipal>
  )
}

export default MisItems
