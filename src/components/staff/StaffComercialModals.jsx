import { useState, useEffect } from 'react'
import { Search, Plus, Minus, X, CheckCircle2, ChevronRight } from 'lucide-react'
import staffApi from '../../api/staffAxios'
import StaffModal from './StaffModal'
import { Pill, Package, Banknote, ClipboardList } from 'lucide-react'
import './StaffComercialModals.css'
import { formatearUSD } from '../../utils/formato'

function formatUSD(v) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const COLUMNAS_COTIZACION = [
  { estado: 'pendiente', titulo: 'Pendientes', color: '#f59e0b', bg: '#fef3c7' },
  { estado: 'cotizada', titulo: 'Cotizadas', color: '#3b82f6', bg: '#dbeafe' },
  { estado: 'rechazada', titulo: 'Rechazadas', color: '#ef4444', bg: '#fee2e2' },
]

function esVencida(cotizacion) {
  return cotizacion.estado === 'cotizada' &&
    cotizacion.fecha_expiracion &&
    new Date(cotizacion.fecha_expiracion) < new Date()
}

export function ModalCotizacion({ cotizacion, onClose, onResponder, onRechazar }) {
  const [precio, setPrecio] = useState('')
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  if (!cotizacion) return null

  const vencida = esVencida(cotizacion)
  const iniciales = (cotizacion.users?.nombre || cotizacion.users?.email || '?').trim().charAt(0).toUpperCase()

  async function handleResponder() {
    const valor = Number(precio)
    if (!valor || valor <= 0) {
      setError('Ingresa un precio válido')
      return
    }
    setEnviando(true)
    setError('')
    try {
      await onResponder(cotizacion.id, { precio_unitario: valor, nota_admin: nota || undefined })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al responder la cotización')
    } finally {
      setEnviando(false)
    }
  }

  async function handleRechazar() {
    setEnviando(true)
    setError('')
    try {
      await onRechazar(cotizacion.id, { nota_admin: nota || undefined })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al rechazar la cotización')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <StaffModal titulo={`Cotización #${cotizacion.id}`} ancho="sm" onCerrar={onClose} bloqueado={enviando}>

      <div className="odm-header">
        <div>
          <p className="odm-fecha">
            {new Date(cotizacion.fecha_solicitud).toLocaleString('es-VE')}
          </p>
        </div>
        <span
          className="odm-badge"
          style={{
            backgroundColor: vencida ? '#f1f5f9' : COLUMNAS_COTIZACION.find((c) => c.estado === cotizacion.estado)?.bg,
            color: vencida ? '#64748b' : COLUMNAS_COTIZACION.find((c) => c.estado === cotizacion.estado)?.color,
          }}
        >
          {vencida ? 'Vencida' : COLUMNAS_COTIZACION.find((c) => c.estado === cotizacion.estado)?.titulo}
        </span>
      </div>

      <div className="odm-cliente">
        <div className="odm-cliente-avatar">{iniciales}</div>
        <div className="odm-cliente-info">
          <strong>{cotizacion.users?.nombre || 'Cliente'}</strong>
          <span>{cotizacion.users?.email}</span>
        </div>
      </div>

      <div className="odm-divider" />

      <div className="odm-section">
        <p className="odm-section-title">
          <span className="odm-section-icon"><Pill size={15} /></span> Producto
        </p>
        <div className="odm-item">
          <div className="odm-item-media">
            {cotizacion.productos?.foto_url ? (
              <img src={cotizacion.productos.foto_url} alt={cotizacion.productos.nombre_comercial} />
            ) : (
              <span className="odm-item-placeholder"><Package size={20} /></span>
            )}
          </div>
          <div className="odm-item-body">
            <p className="odm-item-nombre">{cotizacion.productos?.nombre_comercial}</p>
            {cotizacion.productos?.disponible === false && (
              <p className="odm-item-cantidad">Producto marcado no disponible</p>
            )}
          </div>
        </div>
      </div>

      <div className="odm-divider" />

      {cotizacion.estado === 'pendiente' && (
        <div className="odm-section">
          <p className="odm-section-title">
            <span className="odm-section-icon"><Banknote size={15} /></span> Responder cotización
          </p>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Precio en USD"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            className="odm-estado-select"
            style={{ marginBottom: 10 }}
          />
          <textarea
            placeholder="Nota para el cliente (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            className="odm-estado-select"
            style={{ resize: 'vertical' }}
          />
          {error && <p className="kb-error">{error}</p>}
          <div className="kb-modal-acciones">
            <button className="kb-btn-rechazar" onClick={handleRechazar} disabled={enviando}>
              Rechazar
            </button>
            <button className="kb-btn-responder" onClick={handleResponder} disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar cotización'}
            </button>
          </div>
        </div>
      )}

      {cotizacion.estado === 'cotizada' && (
        <div className="odm-section">
          <p className="odm-section-title">
            <span className="odm-section-icon"><Banknote size={15} /></span> Precio asignado
          </p>
          <div className="odm-totales">
            <div className="odm-total-final">
              <span>Precio</span>
              <span className="odm-total-valor">${formatUSD(cotizacion.precio_unitario)}</span>
            </div>
            <div className="odm-total-row">
              <span>{vencida ? 'Venció' : 'Vence'}</span>
              <span>{new Date(cotizacion.fecha_expiracion).toLocaleString('es-VE')}</span>
            </div>
          </div>
          {cotizacion.nota_admin && <p className="odm-notas">{cotizacion.nota_admin}</p>}
        </div>
      )}

      {cotizacion.estado === 'rechazada' && cotizacion.nota_admin && (
        <div className="odm-section">
          <p className="odm-section-title">Motivo</p>
          <p className="odm-notas">{cotizacion.nota_admin}</p>
        </div>
      )}
    </StaffModal>
  )
}

export function FilaRequerimiento({ item, valores, onChange, soloLectura }) {
  const rechazado = valores.rechazado

  if (soloLectura) {
    return (
      <div className="ra-fila ra-fila--lectura">
        <span className="ra-fila__original">{item.nombre_solicitado} (x{item.cantidad})</span>
        {item.estado_item === 'listo' && item.productos ? (
          <span className="ra-fila__resultado ra-fila__resultado--ok">
            {item.productos.nombre_comercial} — ${formatUSD(item.productos.precio_usd)}
          </span>
        ) : (
          <span className="ra-fila__resultado ra-fila__resultado--rechazado">Rechazado</span>
        )}
      </div>
    )
  }

  const nombreOriginal = item.producto_id != null
    ? (item.productos?.nombre_comercial || item.nombre_solicitado)
    : item.nombre_solicitado

  return (
    <div className={`ra-fila ${rechazado ? 'ra-fila--rechazada' : ''}`}>
      <div className="ra-fila__original">
        <span>{nombreOriginal}</span>
        <span className="ra-fila__cantidad">x{item.cantidad}</span>
        {item.nota_usuario && <span className="ra-fila__nota">{item.nota_usuario}</span>}
      </div>
      {item.producto_id != null ? (
        <span className="ra-fila__input ra-fila__input--nombre">Producto existente — solo precio</span>
      ) : (
        <input
          type="text"
          placeholder="Nombre final"
          value={valores.nombre_final}
          onChange={(e) => onChange({ ...valores, nombre_final: e.target.value })}
          disabled={rechazado}
          className="ra-fila__input ra-fila__input--nombre"
        />
      )}
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="Precio"
        value={valores.precio_unitario}
        onChange={(e) => onChange({ ...valores, precio_unitario: e.target.value })}
        disabled={rechazado}
        className="ra-fila__input ra-fila__input--precio"
      />
      <label className="ra-fila__rechazar">
        <input
          type="checkbox"
          checked={rechazado}
          onChange={(e) => onChange({ ...valores, rechazado: e.target.checked })}
        />
        Rechazar
      </label>
    </div>
  )
}

export function ModalRequerimientoDetalle({ requerimiento, onClose, onResponder }) {
  const [valores, setValores] = useState(() => {
    const iniciales = {}
    if (!requerimiento) return iniciales
    requerimiento.requerimiento_items.forEach((item) => {
      iniciales[item.id] = {
        nombre_final: item.nombre_solicitado,
        precio_unitario: '',
        rechazado: false,
      }
    })
    return iniciales
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  if (!requerimiento) return null

  const soloLectura = requerimiento.estado === 'respondido'
  const inicialesUsuario = (requerimiento.users?.nombre || requerimiento.users?.email || '?').trim().charAt(0).toUpperCase()

  async function handleGuardar() {
    const items = []
    const items_rechazados = []

    for (const item of requerimiento.requerimiento_items) {
      const v = valores[item.id]
      if (v.rechazado) {
        items_rechazados.push(item.id)
        continue
      }
      const nombreVisible = item.productos?.nombre_comercial || item.nombre_solicitado
      if (item.producto_id != null) {
        // Producto existente (creado por "Avísame"): solo se pide precio.
        if (!v.precio_unitario || Number(v.precio_unitario) <= 0) {
          setError(`Falta precio para "${nombreVisible}" — o márcalo como rechazado`)
          return
        }
        items.push({ id: item.id, nombre_final: nombreVisible, precio_unitario: Number(v.precio_unitario) })
        continue
      }
      if (!v.nombre_final.trim() || !v.precio_unitario || Number(v.precio_unitario) <= 0) {
        setError(`Falta nombre o precio para "${item.nombre_solicitado}" — o márcalo como rechazado`)
        return
      }
      items.push({ id: item.id, nombre_final: v.nombre_final.trim(), precio_unitario: Number(v.precio_unitario) })
    }

    setEnviando(true)
    setError('')
    try {
      await onResponder(requerimiento.id, { items, items_rechazados })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al responder el requerimiento')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <StaffModal titulo={`Requerimiento #${requerimiento.id}`} ancho="sm" onCerrar={onClose} bloqueado={enviando}>

      <div className="odm-header">
        <div>
          <p className="odm-fecha">{new Date(requerimiento.fecha_solicitud).toLocaleString('es-VE')}</p>
        </div>
        <span
          className="odm-badge"
          style={{
            backgroundColor: soloLectura ? '#d1fae5' : '#fef3c7',
            color: soloLectura ? '#10b981' : '#f59e0b',
          }}
        >
          {soloLectura ? 'Respondido' : 'Pendiente'}
        </span>
      </div>

      <div className="odm-cliente">
        <div className="odm-cliente-avatar">{inicialesUsuario}</div>
        <div className="odm-cliente-info">
          <strong>{requerimiento.users?.nombre || 'Cliente'}</strong>
          <span>{requerimiento.users?.email}</span>
        </div>
      </div>

      <div className="odm-divider" />

      <div className="odm-section">
        <p className="odm-section-title">
          <span className="odm-section-icon"><ClipboardList size={15} /></span> Productos solicitados
        </p>
        <div className="ra-filas">
          {requerimiento.requerimiento_items.map((item) => (
            <FilaRequerimiento
              key={item.id}
              item={item}
              valores={valores[item.id] || { nombre_final: '', precio_unitario: '', rechazado: false }}
              onChange={(v) => setValores((prev) => ({ ...prev, [item.id]: v }))}
              soloLectura={soloLectura}
            />
          ))}
        </div>
      </div>

      {!soloLectura && (
        <>
          {error && <p className="kb-error">{error}</p>}
          <div className="kb-modal-acciones">
            <button className="kb-btn-responder" style={{ flex: 1 }} onClick={handleGuardar} disabled={enviando}>
              {enviando ? 'Guardando...' : 'Guardar respuesta'}
            </button>
          </div>
        </>
      )}
    </StaffModal>
  )
}

export function ModalCrearPresupuesto({ clienteId, onClose, onCreado }) {
  const [cliente, setCliente] = useState(clienteId ? { id: clienteId } : null)
  const [queryCliente, setQueryCliente] = useState('')
  const [resultadosClientes, setResultadosClientes] = useState([])
  const [buscandoClientes, setBuscandoClientes] = useState(false)

  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  // { producto_id, nombre, precio_usd, cantidad } — precio_usd es el que
  // devuelve /staff/productos al momento de agregar (el backend vuelve a
  // tomar el precio vigente al crear el presupuesto; esto es solo para que
  // el vendedor vea cuánto va quedando mientras arma la lista).
  const [filas, setFilas] = useState([])
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (clienteId || queryCliente.trim().length < 2) return
    const t = setTimeout(async () => {
      setBuscandoClientes(true)
      try {
        const { data } = await staffApi.get('/staff/clientes', { params: { buscar: queryCliente.trim() } })
        setResultadosClientes(data?.clientes || [])
      } catch { setResultadosClientes([]) }
      finally { setBuscandoClientes(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [queryCliente, clienteId])

  useEffect(() => {
    if (query.trim().length < 1) return
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await staffApi.get('/staff/productos', { params: { buscar: query.trim() } })
        setResultados((data || []).slice(0, 8))
      } catch { setResultados([]) }
      finally { setBuscando(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const clientesVisibles = clienteId || queryCliente.trim().length < 2 ? [] : resultadosClientes
  const productosVisibles = query.trim().length < 1 ? [] : resultados
  const total = filas.reduce((acc, f) => acc + Number(f.precio_usd || 0) * f.cantidad, 0)

  function seleccionarCliente(c) {
    setCliente(c)
    setQueryCliente('')
    setResultadosClientes([])
  }

  function agregarProducto(p) {
    setFilas((prev) => {
      const ex = prev.find((f) => f.producto_id === p.id)
      if (ex) return prev.map((f) => f.producto_id === p.id ? { ...f, cantidad: f.cantidad + 1 } : f)
      return [...prev, { producto_id: p.id, nombre: p.nombre_comercial, precio_usd: p.precio_usd, cantidad: 1 }]
    })
    setQuery('')
    setResultados([])
  }

  function cambiarCantidad(pid, delta) {
    setFilas((prev) => prev.map((f) => f.producto_id === pid ? { ...f, cantidad: f.cantidad + delta } : f).filter((f) => f.cantidad > 0))
  }

  async function crear() {
    if (!cliente) { setError('Selecciona el cliente'); return }
    if (filas.length === 0) { setError('Agrega al menos un producto'); return }
    setCreando(true)
    setError('')
    try {
      await staffApi.post('/staff/presupuestos', {
        usuario_id: cliente.id,
        items: filas.map((f) => ({ producto_id: f.producto_id, cantidad: f.cantidad })),
      })
      onCreado()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear presupuesto')
    } finally {
      setCreando(false)
    }
  }

  return (
    <StaffModal titulo="Crear presupuesto" ancho="md" onCerrar={onClose} bloqueado={creando}>
      <div className="pcp-raiz">
        {!cliente ? (
          <div className="pcp-paso">
            <p className="pcp-paso-label">1 · Cliente</p>
            <div className="pcp-buscador">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar cliente (nombre, email, RIF)..."
                value={queryCliente}
                onChange={(e) => setQueryCliente(e.target.value)}
                autoFocus
              />
            </div>
            {buscandoClientes && <p className="pcp-aviso">Buscando...</p>}
            {!buscandoClientes && queryCliente.trim().length >= 2 && clientesVisibles.length === 0 && (
              <p className="pcp-aviso">Sin clientes que coincidan</p>
            )}
            {clientesVisibles.length > 0 && (
              <div className="pcp-lista">
                {clientesVisibles.slice(0, 6).map((c) => (
                  <button key={c.id} type="button" className="pcp-item" onClick={() => seleccionarCliente(c)}>
                    <span className="pcp-avatar">{(c.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
                    <span className="pcp-item-info">
                      <span className="pcp-item-nombre">{c.nombre || 'Sin nombre'}</span>
                      <span className="pcp-item-sub">{c.email}{c.rif_cedula ? ` · ${c.rif_cedula}` : ''}</span>
                    </span>
                    <ChevronRight size={15} className="pcp-item-flecha" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="pcp-cliente-chip">
              <span className="pcp-avatar">{(cliente.nombre?.trim()?.[0] || 'C').toUpperCase()}</span>
              <span className="pcp-cliente-chip-info">
                <strong>{cliente.nombre || `Cliente #${cliente.id}`}</strong>
                {cliente.email && <span>{cliente.email}</span>}
              </span>
              {!clienteId && (
                <button type="button" className="pcp-link-btn" onClick={() => setCliente(null)}>Cambiar</button>
              )}
            </div>

            <div className="pcp-paso">
              <p className="pcp-paso-label">2 · Productos</p>
              <div className="pcp-buscador">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              {buscando && <p className="pcp-aviso">Buscando...</p>}

              {productosVisibles.length > 0 && (
                <div className="pcp-lista">
                  {productosVisibles.map((p) => (
                    <button key={p.id} type="button" className="pcp-item" onClick={() => agregarProducto(p)}>
                      <span className="pcp-item-info">
                        <span className="pcp-item-nombre">{p.nombre_comercial}</span>
                        <span className="pcp-item-sub">{p.laboratorio || ''}</span>
                      </span>
                      <span className="pcp-item-precio">${formatUSD(p.precio_usd)}</span>
                      <span className="pcp-item-agregar"><Plus size={14} /></span>
                    </button>
                  ))}
                </div>
              )}

              {filas.length === 0 ? (
                <div className="pcp-vacio">
                  <ClipboardList size={24} />
                  <p>Busca productos para armar el presupuesto</p>
                </div>
              ) : (
                <div className="pcp-filas">
                  {filas.map((f) => (
                    <div key={f.producto_id} className="pcp-fila">
                      <div className="pcp-fila-info">
                        <p className="pcp-fila-nombre">{f.nombre}</p>
                        <p className="pcp-fila-precio">${formatUSD(f.precio_usd)} c/u</p>
                      </div>
                      <div className="pcp-fila-cantidad">
                        <button type="button" onClick={() => cambiarCantidad(f.producto_id, -1)} aria-label="Quitar uno"><Minus size={12} /></button>
                        <span>{f.cantidad}</span>
                        <button type="button" onClick={() => cambiarCantidad(f.producto_id, 1)} aria-label="Agregar uno"><Plus size={12} /></button>
                      </div>
                      <span className="pcp-fila-subtotal">${formatUSD(f.precio_usd * f.cantidad)}</span>
                      <button
                        type="button"
                        className="pcp-fila-quitar"
                        onClick={() => setFilas((prev) => prev.filter((x) => x.producto_id !== f.producto_id))}
                        aria-label="Quitar producto"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  <div className="pcp-total">
                    <span>Total del presupuesto</span>
                    <span>{formatearUSD(total)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {error && <p className="pcp-error">{error}</p>}

        <div className="pcp-footer">
          <button type="button" className="pcp-btn pcp-btn--outline" onClick={onClose} disabled={creando}>Cancelar</button>
          <button type="button" className="pcp-btn pcp-btn--primario" onClick={crear} disabled={creando || !cliente || filas.length === 0}>
            {creando ? (
              'Creando...'
            ) : filas.length === 0 ? (
              'Crear presupuesto'
            ) : (
              <>
                <CheckCircle2 size={15} />
                Crear · {formatearUSD(total)}
              </>
            )}
          </button>
        </div>
      </div>
    </StaffModal>
  )
}