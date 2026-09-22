import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Minus, X, UserRound, Store } from 'lucide-react'
import api from '../../api/axios'
import { toaster } from '../ui/toaster'
import './NuevaOrdenRapida.css'

function formatUSD(valor) {
  return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ---------------------------------------------------------------
// Versión admin del "Presupuesto" del cliente: mismo patrón de
// buscador + cantidades acumuladas, pero en vez de generar un
// presupuesto con precio congelado, crea una orden real de una vez
// (equivalente a que el cliente hubiese comprado por el carrito).
//
// No maneja envío en absoluto — no hay campo de costo de envío ni
// selector de tipo de entrega. El endpoint POST /orders no guarda
// ningún dato de envío de todos modos (ver nota en el commit), así
// que simplemente no enviar esos campos ya equivale a retiro en
// tienda, que es el comportamiento real del sistema hoy.
// ---------------------------------------------------------------
function NuevaOrdenRapida() {
  const navigate = useNavigate()

  const [cliente, setCliente] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true)
  const [queryCliente, setQueryCliente] = useState('')

  const [queryProducto, setQueryProducto] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [queryBuscada, setQueryBuscada] = useState('')

  const [filas, setFilas] = useState([])
  const [formaPago, setFormaPago] = useState('contado')
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    let activo = true
    api.get('/users')
      .then(({ data }) => {
        if (activo) setUsuarios(data)
      })
      .catch((err) => {
        if (!activo) return
        console.error('Error al cargar clientes', err)
        toaster.create({ title: 'No se pudieron cargar los clientes', type: 'error' })
      })
      .finally(() => {
        if (activo) setCargandoUsuarios(false)
      })
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    if (!cliente) return
    const q = queryProducto.trim()
    if (q.length < 1) return
    const debounce = setTimeout(async () => {
      try {
        const { data } = await api.get('/products', { params: { search: q } })
        setSugerencias(data.slice(0, 8))
        setQueryBuscada(q)
      } catch (err) {
        console.error('Error buscando productos', err)
        setQueryBuscada(q)
      }
    }, 250)
    return () => clearTimeout(debounce)
  }, [queryProducto, cliente])

  const sugerenciasVisibles = queryProducto.trim().length >= 1 ? sugerencias : []
  const buscando = queryProducto.trim().length >= 1 && queryBuscada !== queryProducto.trim()

  function agregarProducto(producto) {
    setFilas((prev) => {
      const existente = prev.find((f) => f.producto.id === producto.id)
      if (existente) {
        return prev.map((f) => (f.producto.id === producto.id ? { ...f, cantidad: f.cantidad + 1 } : f))
      }
      return [...prev, { producto, cantidad: 1 }]
    })
    setQueryProducto('')
    setSugerencias([])
  }

  function cambiarCantidad(productoId, delta) {
    setFilas((prev) =>
      prev
        .map((f) => (f.producto.id === productoId ? { ...f, cantidad: f.cantidad + delta } : f))
        .filter((f) => f.cantidad > 0)
    )
  }

  function quitarFila(productoId) {
    setFilas((prev) => prev.filter((f) => f.producto.id !== productoId))
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    if (!queryCliente.trim()) return true
    const texto = queryCliente.toLowerCase()
    return u.nombre?.toLowerCase().includes(texto) || u.email?.toLowerCase().includes(texto)
  })

  const total = filas.reduce((acc, f) => acc + Number(f.producto.precio_usd) * f.cantidad, 0)

  async function crearOrden() {
    if (!cliente || filas.length === 0) return
    setCreando(true)
    try {
      const { data } = await api.post('/orders', {
        usuario_id: cliente.id,
        items: filas.map((f) => ({ producto_id: f.producto.id, cantidad: f.cantidad })),
        forma_pago: formaPago,
      })
      toaster.create({ title: `Orden #${data.id} creada — retiro en tienda`, type: 'success' })
      navigate(`/admin/ordenes`)
    } catch (err) {
      console.error('Error al crear orden', err)
      const mensaje = err.response?.data?.error || 'Error al crear la orden'
      toaster.create({ title: mensaje, type: 'error' })
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="nor-page">
      <div className="nor-aviso">
        <Store size={16} />
        <span>Esta orden se crea como <strong>retiro en tienda</strong> — no incluye envío.</span>
      </div>

      {!cliente ? (
        <div className="nor-clientes">
          <h2>Selecciona un cliente</h2>
          <div className="nor-buscador__input-wrap">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar cliente por nombre o correo..."
              value={queryCliente}
              onChange={(e) => setQueryCliente(e.target.value)}
              autoFocus
            />
          </div>

          <div className="nor-clientes__lista">
            {cargandoUsuarios ? (
              <div className="nor-mensaje">Cargando clientes...</div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="nor-mensaje">Sin clientes que coincidan</div>
            ) : (
              usuariosFiltrados.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="nor-clientes__item"
                  onClick={() => setCliente({ id: u.id, nombre: u.nombre })}
                >
                  <span className="nor-clientes__avatar">{(u.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
                  <span className="nor-clientes__info">
                    <span className="nor-clientes__nombre">{u.nombre || 'Sin nombre'}</span>
                    <span className="nor-clientes__email">{u.email}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="nor-cliente-activo">
            <UserRound size={15} />
            <span>Cliente: <strong>{cliente.nombre}</strong></span>
            <button type="button" onClick={() => { setCliente(null); setFilas([]) }}>Cambiar</button>
          </div>

          <div className="nor-buscador">
            <div className="nor-buscador__input-wrap">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar producto para agregar..."
                value={queryProducto}
                onChange={(e) => setQueryProducto(e.target.value)}
                autoFocus
              />
            </div>

            {queryProducto.trim() && (
              <div className="nor-buscador__resultados">
                {buscando ? (
                  <div className="nor-mensaje">Buscando...</div>
                ) : sugerenciasVisibles.length === 0 ? (
                  <div className="nor-mensaje">Sin resultados para "{queryProducto}"</div>
                ) : (
                  sugerenciasVisibles.map((p) => (
                    <button key={p.id} type="button" className="nor-buscador__item" onClick={() => agregarProducto(p)}>
                      <span className="nor-buscador__nombre">{p.nombre_comercial}</span>
                      <span className="nor-buscador__precio">${formatUSD(p.precio_usd)}</span>
                      <Plus size={16} />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="nor-filas">
            {filas.length === 0 ? (
              <div className="nor-mensaje nor-mensaje--grande">Busca un producto arriba para empezar a facturar</div>
            ) : (
              filas.map((f) => (
                <div key={f.producto.id} className="nor-fila">
                  <div className="nor-fila__info">
                    <p className="nor-fila__nombre">{f.producto.nombre_comercial}</p>
                    <p className="nor-fila__precio">${formatUSD(f.producto.precio_usd)} c/u</p>
                  </div>
                  <div className="nor-fila__stepper">
                    <button type="button" onClick={() => cambiarCantidad(f.producto.id, -1)} aria-label="Restar">
                      <Minus size={14} />
                    </button>
                    <span>{f.cantidad}</span>
                    <button type="button" onClick={() => cambiarCantidad(f.producto.id, 1)} aria-label="Sumar">
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="nor-fila__subtotal">${formatUSD(f.producto.precio_usd * f.cantidad)}</span>
                  <button type="button" className="nor-fila__quitar" onClick={() => quitarFila(f.producto.id)} aria-label="Quitar">
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="nor-footer">
            <div className="nor-footer__pago">
              <span>Forma de pago</span>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </select>
            </div>

            <div className="nor-footer__total">
              <span>Total</span>
              <span>${formatUSD(total)}</span>
            </div>

            <button
              type="button"
              className="nor-footer__crear-btn"
              onClick={crearOrden}
              disabled={filas.length === 0 || creando}
            >
              {creando ? 'Creando orden...' : `Crear orden · $${formatUSD(total)}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default NuevaOrdenRapida