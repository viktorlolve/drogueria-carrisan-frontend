import { useCallback, useEffect, useState } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import StaffTabs from '../../components/staff/StaffTabs'
import { exportarGuiaDespacho } from '../../utils/exportUtils'
import './StaffPedidos.css'

function formatUSD(valor) {
  return Number(valor || 0).toFixed(2)
}

function formatFecha(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function etiquetaEnvio(orden) {
  const t = orden.tipo_envio
  if (t === 'delivery') return 'Delivery'
  if (t === 'envio_nacional') return 'Envío nacional'
  return 'Retiro en tienda'
}

function direccion(orden) {
  if (orden.tipo_envio === 'delivery') {
    const d = orden.direcciones_envio
    return d ? `${d.direccion || ''}, ${d.ciudad || ''} ${d.estado || ''}`.replace(/^,\s*/, '').trim() || 'Dirección no disponible' : 'Dirección no disponible'
  }
  if (orden.tipo_envio === 'envio_nacional') return `Envío nacional — ${orden.agencia_envio || 'agencia'}`
  return 'Retiro en tienda'
}

function TABS(contadores) {
  return [
    { id: 'revisar', texto: 'Por revisar', contador: contadores.revisar },
    { id: 'preparar', texto: 'Por preparar', contador: contadores.preparar },
    { id: 'retiros', texto: 'Retiros', contador: contadores.retiros },
    { id: 'incidencias', texto: 'Incidencias', contador: contadores.incidencias },
    { id: 'completadas', texto: 'Completadas' },
  ]
}

function StaffPedidos() {
  const [tab, setTab] = useState('revisar')
  const [revisar, setRevisar] = useState([])
  const [preparar, setPreparar] = useState([])
  const [retiros, setRetiros] = useState([])
  const [incidencias, setIncidencias] = useState([])
  const [completadas, setCompletadas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  async function cargarTodo() {
    setError('')
    setCargando(true)
    try {
      const [r, p, rts, inc] = await Promise.all([
        staffApi.get('/staff/almacen/revisar'),
        staffApi.get('/staff/almacen/preparar'),
        staffApi.get('/staff/logistica/retiros'),
        staffApi.get('/staff/logistica/incidencias'),
      ])
      setRevisar(r.data)
      setPreparar(p.data)
      setRetiros(rts.data)
      setIncidencias(inc.data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar los pedidos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    let activo = true
    Promise.all([
      staffApi.get('/staff/almacen/revisar'),
      staffApi.get('/staff/almacen/preparar'),
      staffApi.get('/staff/logistica/retiros'),
      staffApi.get('/staff/logistica/incidencias'),
    ])
      .then(([r, p, rts, inc]) => {
        if (!activo) return
        setRevisar(r.data)
        setPreparar(p.data)
        setRetiros(rts.data)
        setIncidencias(inc.data)
      })
      .catch((err) => { if (activo) setError(err.response?.data?.error || 'No se pudo cargar los pedidos') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  const cargarCompletadas = useCallback(async () => {
    try {
      const { data } = await staffApi.get('/staff/logistica/completadas', { params: { desde: new Date(Date.now() - 30 * 86400000).toISOString() } })
      setCompletadas(data.ordenes || [])
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar las completadas')
    }
  }, [])

  const contadores = {
    revisar: revisar.length,
    preparar: preparar.length,
    retiros: retiros.length,
    incidencias: incidencias.length,
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="pedidos" titulo="Pedidos">
      <div className="sp-header">
        <StaffTabs tabs={TABS(contadores)} activo={tab} onChange={setTab} />
        <AgenciasModal />
      </div>

      {cargando && <p>Cargando...</p>}
      {error && <p className="sp-error">{error}</p>}

      {!cargando && !error && tab === 'revisar' && <TabPorRevisar ordenes={revisar} onRecargar={cargarTodo} />}
      {!cargando && !error && tab === 'preparar' && <TabPorPreparar ordenes={preparar} onRecargar={cargarTodo} />}
      {!cargando && !error && tab === 'retiros' && <TabRetiros ordenes={retiros} onRecargar={cargarTodo} />}
      {!cargando && !error && tab === 'incidencias' && <TabIncidencias ordenes={incidencias} onRecargar={cargarTodo} />}
      {!cargando && !error && tab === 'completadas' && <TabCompletadas ordenes={completadas} onCargar={cargarCompletadas} />}
    </LayoutDepartamento>
  )
}

function CardOrden({ orden }) {
  return (
    <div className="sp-card">
      <div className="sp-card-head">
        <p className="sp-card-titulo">Orden #{orden.id} — ${formatUSD(orden.total_usd)}</p>
        <span className={`sp-badge ${orden.forma_pago === 'credito' ? 'sp-badge--credito' : 'sp-badge--contado'}`}>
          {orden.forma_pago === 'credito' ? 'Crédito' : 'Contado'}
        </span>
      </div>
      <p className="sp-card-cliente">
        {orden.users?.nombre} {orden.users?.telefono ? `— ${orden.users.telefono}` : ''}
      </p>
      {(orden.direcciones_envio || orden.agencia_envio) && (
        <p className="sp-card-meta"><strong>Envío:</strong> {direccion(orden)}</p>
      )}
      <ul className="sp-card-items">
        {(orden.ordenes_items || []).map((item) => (
          <li key={item.id} className={item.anulado ? 'sp-item--anulado' : ''}>
            {item.cantidad}x {item.productos?.nombre_comercial}
            {item.anulado ? ' — agotado' : ` — $${formatUSD(item.precio_unitario)} c/u`}
          </li>
        ))}
      </ul>
    </div>
  )
}

function TabPorRevisar({ ordenes, onRecargar }) {
  const [editando, setEditando] = useState(null)
  const [items, setItems] = useState([])
  const [procesando, setProcesando] = useState(false)

  if (ordenes.length === 0) return <p>No hay pedidos por revisar.</p>

  function abrirEditor(orden) {
    setEditando(orden)
    setItems((orden.ordenes_items || []).map((i) => ({
      id: i.id,
      nombre: i.productos?.nombre_comercial || 'Producto',
      cantidad: i.cantidad,
      cantidadOriginal: i.cantidad,
      anulado: i.anulado || false,
      anuladoOriginal: i.anulado || false,
      nota_anulacion: i.nota_anulacion || '',
      precio_unitario: Number(i.precio_unitario),
      total_item: Number(i.precio_unitario) * i.cantidad,
    })))
  }

  function cerrar() { setEditando(null); setItems([]) }

  function cambiarCantidad(id, delta) {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id || i.anulado) return i
      const nueva = i.cantidad + delta
      if (nueva < 1) return i
      return { ...i, cantidad: nueva, total_item: i.precio_unitario * nueva }
    }))
  }

  function toggleAnulado(id) {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i
      const anulado = !i.anulado
      return { ...i, anulado, total_item: anulado ? 0 : i.precio_unitario * i.cantidad }
    }))
  }

  function cambiarNota(id, nota) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, nota_anulacion: nota } : i)))
  }

  const total = items.reduce((s, i) => s + i.total_item, 0)
  const huboCambios = items.some((i) => i.cantidad !== i.cantidadOriginal || i.anulado !== i.anuladoOriginal)

  async function aprobar() {
    setProcesando(true)
    try {
      const payload = items.map((i) => {
        const body = { id: i.id }
        if (i.cantidad !== i.cantidadOriginal) body.cantidad = i.cantidad
        if (i.anulado !== i.anuladoOriginal) {
          body.anulado = i.anulado
          if (i.anulado) body.nota_anulacion = i.nota_anulacion || 'Agotado'
        }
        return body
      })
      await staffApi.patch(`/staff/almacen/${editando.id}/aprobar`, { items: payload })
      cerrar()
      await onRecargar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo aprobar la orden')
    } finally {
      setProcesando(false)
    }
  }

  async function cancelar(orden) {
    if (!window.confirm(`¿Cancelar la orden #${orden.id} de ${orden.users?.nombre || 'cliente'}? Esta acción no se puede deshacer.`)) return
    setProcesando(true)
    try {
      await staffApi.patch(`/staff/almacen/${orden.id}/cancelar`)
      await onRecargar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo cancelar la orden')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div>
      {ordenes.map((orden) => (
        <div key={orden.id}>
          <CardOrden orden={orden} />
          <div className="sp-acciones">
            <button className="sp-btn" onClick={() => abrirEditor(orden)}>Revisar y aprobar</button>
            <button className="sp-btn sp-btn--ghost" onClick={() => exportarGuiaDespacho(orden)}>Imprimir guía</button>
            <button className="sp-btn sp-btn--danger" onClick={() => cancelar(orden)} disabled={procesando}>Cancelar pedido</button>
          </div>
        </div>
      ))}

      {editando && (
        <div className="sp-modal" onClick={cerrar}>
          <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="sp-modal-titulo">Revisar orden #{editando.id}</h3>
            <p className="sp-card-cliente">{editando.users?.nombre} — {editando.forma_pago === 'credito' ? 'Crédito' : 'Contado'}</p>

            <div className="sp-editor">
              {items.map((i) => (
                <div key={i.id} className={`sp-editor-item ${i.anulado ? 'is-anulado' : ''}`}>
                  <div className="sp-editor-info">
                    <strong>{i.nombre}</strong>
                    <span>${formatUSD(i.precio_unitario)} c/u — subtotal ${formatUSD(i.anulado ? 0 : i.total_item)}</span>
                  </div>
                  <div className="sp-editor-controles">
                    <button className="sp-stepper-btn" disabled={i.anulado} onClick={() => cambiarCantidad(i.id, -1)}>-</button>
                    <span className="sp-stepper-val">{i.anulado ? '—' : i.cantidad}</span>
                    <button className="sp-stepper-btn" disabled={i.anulado} onClick={() => cambiarCantidad(i.id, 1)}>+</button>
                    <button className={`sp-btn-anular ${i.anulado ? 'is-anulado' : ''}`} onClick={() => toggleAnulado(i.id)}>
                      {i.anulado ? 'Reactivar' : 'Anular (agotado)'}
                    </button>
                  </div>
                  {i.anulado && (
                    <input
                      className="sp-nota"
                      placeholder="Nota del agotado (opcional)"
                      value={i.nota_anulacion}
                      onChange={(e) => cambiarNota(i.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            <p className="sp-total">
              Total: <strong>${formatUSD(total)}</strong>
              {huboCambios && <span className="sp-total-aviso"> — se recalculará al aprobar</span>}
            </p>

            <div className="sp-acciones">
              <button className="sp-btn" onClick={cerrar} disabled={procesando}>Volver</button>
              <button className="sp-btn sp-btn--principal" onClick={aprobar} disabled={procesando}>
                {procesando ? 'Aprobando...' : 'Aprobar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabPorPreparar({ ordenes, onRecargar }) {
  const [verificando, setVerificando] = useState({})
  const [procesando, setProcesando] = useState(null)

  if (ordenes.length === 0) return <p>No hay pedidos por preparar.</p>

  function toggleItem(ordenId, itemId) {
    setVerificando((prev) => {
      const actual = prev[ordenId] || {}
      return {
        ...prev,
        [ordenId]: { ...actual, [itemId]: !actual[itemId] },
      }
    })
  }

  function irVerificando(ordenId) {
    setVerificando((prev) => ({ ...prev, [ordenId]: {} }))
  }

  function unItem(orden, itemId) {
    const v = verificando[orden.id] || {}
    return !!v[itemId]
  }

  function paqueteVerificado(orden) {
    const v = verificando[orden.id] || {}
    const vivos = (orden.ordenes_items || []).filter((i) => !i.anulado)
    return vivos.length > 0 && vivos.every((i) => v[i.id])
  }

  async function confirmarPaquete(orden) {
    setProcesando(orden.id)
    try {
      await staffApi.post(`/staff/logistica/${orden.id}/verificar-paquete`)
      await onRecargar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo verificar el paquete')
    } finally {
      setProcesando(null)
    }
  }

  async function salir(orden, destino) {
    if (destino === 'cancelar') {
      if (!window.confirm(`¿Cancelar la orden #${orden.id}?`)) return
    }
    setProcesando(orden.id)
    try {
      if (destino === 'cancelar') {
        await staffApi.patch(`/staff/almacen/${orden.id}/cancelar`)
      } else {
        const url = destino === 'enviado'
          ? `/staff/almacen/${orden.id}/enviado`
          : `/staff/almacen/${orden.id}/listo-para-retiro`
        await staffApi.patch(url)
      }
      await onRecargar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo marcar el pedido')
    } finally {
      setProcesando(null)
    }
  }

  return (
    <div>
      {ordenes.map((orden) => {
        const esRetiro = orden.tipo_envio === 'retiro'
        const v = verificando[orden.id]
        const abierto = v !== undefined
        const verificado = paqueteVerificado(orden)
        return (
          <div key={orden.id}>
            <CardOrden orden={orden} />
            {orden.forma_pago === 'contado' && orden.estado_pago !== 'verificado' && (
              <p className="sp-aviso">Pendiente de pago — falta que contabilidad verifique.</p>
            )}
            <div className="sp-acciones">
              {!esRetiro && !abierto && (
                <button className="sp-btn sp-btn--principal" onClick={() => irVerificando(orden.id)} disabled={procesando === orden.id}>
                  Verificar paquete
                </button>
              )}
              {!esRetiro && abierto && (
                <div className="sp-caja-verificar">
                  <p className="sp-caja-titulo">Marca cada producto como verificado:</p>
                  {(orden.ordenes_items || []).map((item) => (
                    <label key={item.id} className="sp-verificar-item">
                      <input
                        type="checkbox"
                        checked={unItem(orden, item.id)}
                        onChange={() => toggleItem(orden.id, item.id)}
                        disabled={item.anulado}
                      />
                      <span>{item.cantidad}x {item.productos?.nombre_comercial}</span>
                    </label>
                  ))}
                  <button
                    className="sp-btn"
                    onClick={() => confirmarPaquete(orden)}
                    disabled={!verificado || procesando === orden.id}
                  >
                    {verificado ? 'Confirmar paquete' : 'Marca todos los productos'}
                  </button>
                </div>
              )}
              {esRetiro ? (
                <button className="sp-btn sp-btn--principal" onClick={() => salir(orden, 'listo_para_retiro')} disabled={procesando === orden.id}>
                  Marcar listo para retiro
                </button>
              ) : (
                <button className="sp-btn sp-btn--principal" onClick={() => salir(orden, 'enviado')} disabled={procesando === orden.id || (abierto && !verificado)}>
                  Marcar como enviado
                </button>
              )}
              <button className="sp-btn sp-btn--ghost" onClick={() => exportarGuiaDespacho(orden)}>Imprimir guía</button>
              <button className="sp-btn sp-btn--danger" onClick={() => salir(orden, 'cancelar')} disabled={procesando === orden.id}>Cancelar</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TabRetiros({ ordenes, onRecargar }) {
  const [procesando, setProcesando] = useState(null)

  if (ordenes.length === 0) return <p>No hay retiros por confirmar.</p>

  async function marcarRetirado(orden) {
    setProcesando(orden.id)
    try {
      await staffApi.patch(`/staff/logistica/${orden.id}/retirado`)
      await onRecargar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo marcar como retirado')
    } finally {
      setProcesando(null)
    }
  }

  return (
    <div>
      {ordenes.map((orden) => (
        <div key={orden.id}>
          <CardOrden orden={orden} />
          <div className="sp-acciones">
            <button className="sp-btn sp-btn--principal" onClick={() => marcarRetirado(orden)} disabled={procesando === orden.id}>
              Marcar retirado
            </button>
            <button className="sp-btn sp-btn--ghost" onClick={() => exportarGuiaDespacho(orden)}>Imprimir guía</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function TabIncidencias({ ordenes, onRecargar }) {
  const [procesando, setProcesando] = useState(null)

  if (ordenes.length === 0) return <p>No hay incidencias.</p>

  async function reintentar(orden) {
    setProcesando(orden.id)
    try {
      await staffApi.patch(`/staff/logistica/${orden.id}/reintentar`)
      await onRecargar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo reintentar el envío')
    } finally {
      setProcesando(null)
    }
  }

  async function cancelar(orden) {
    if (!window.confirm(`¿Cancelar la orden #${orden.id} de ${orden.users?.nombre || 'cliente'}? Esta acción no se puede deshacer.`)) return
    setProcesando(orden.id)
    try {
      await staffApi.patch(`/staff/almacen/${orden.id}/cancelar`)
      await onRecargar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo cancelar la orden')
    } finally {
      setProcesando(null)
    }
  }

  return (
    <div>
      {ordenes.map((orden) => (
        <div key={orden.id}>
          <CardOrden orden={orden} />
          <p className="sp-incidencia">
            <strong>Incidencia:</strong> {orden.incidencia_motivo} ({formatFecha(orden.incidencia_fecha)})
          </p>
          <div className="sp-acciones">
            <button className="sp-btn sp-btn--principal" onClick={() => reintentar(orden)} disabled={procesando === orden.id}>Reenviar</button>
            <button className="sp-btn sp-btn--danger" onClick={() => cancelar(orden)} disabled={procesando === orden.id}>Cancelar pedido</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function TabCompletadas({ ordenes, onCargar }) {
  useEffect(() => {
    if (ordenes.length === 0) onCargar()
  }, [onCargar, ordenes.length])

  if (ordenes.length === 0) return <p>Sin completadas en los últimos 30 días.</p>

  return (
    <div>
      <p className="sp-meta">Últimos 30 días — estado entregado/retirado.</p>
      {ordenes.map((orden) => (
        <div key={orden.id} className="sp-card">
          <div className="sp-card-head">
            <p className="sp-card-titulo">Orden #{orden.id} — ${formatUSD(orden.total_usd)}</p>
            <span className="sp-badge sp-badge--entregado">{etiquetaEnvio(orden)}</span>
          </div>
          <p className="sp-card-cliente">
            {orden.users?.nombre} — {formatFecha(orden.created_at)}
          </p>
          <ul className="sp-card-items">
            {(orden.ordenes_items || []).map((item) => (
              <li key={item.id}>
                {item.cantidad}x {item.productos?.nombre_comercial}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function AgenciasModal() {
  const [abierto, setAbierto] = useState(false)
  const [agencias, setAgencias] = useState([])
  const [cargando, setCargando] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', ubicacion: '', tarifa_sugerida: '' })
  const [editandoId, setEditandoId] = useState(null)

  async function cargar() {
    setCargando(true)
    try {
      const { data } = await staffApi.get('/staff/logistica/agencias')
      setAgencias(data || [])
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudieron cargar las agencias')
    } finally {
      setCargando(false)
    }
  }

  function abrir() {
    setAbierto(true)
    setEditandoId(null)
    setForm({ nombre: '', telefono: '', ubicacion: '', tarifa_sugerida: '' })
    cargar()
  }

  async function guardar() {
    if (!form.nombre.trim()) return alert('El nombre es requerido')
    try {
      if (editandoId) {
        await staffApi.patch(`/staff/logistica/agencias/${editandoId}`, form)
      } else {
        await staffApi.post('/staff/logistica/agencias', form)
      }
      setEditandoId(null)
      setForm({ nombre: '', telefono: '', ubicacion: '', tarifa_sugerida: '' })
      cargar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo guardar la agencia')
    }
  }

  function editar(a) {
    setEditandoId(a.id)
    setForm({ nombre: a.nombre, telefono: a.telefono || '', ubicacion: a.ubicacion || '', tarifa_sugerida: a.tarifa_sugerida || '' })
  }

  async function desactivar(a) {
    if (!window.confirm(`¿Desactivar la agencia "${a.nombre}"?`)) return
    try {
      await staffApi.delete(`/staff/logistica/agencias/${a.id}`)
      cargar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo desactivar la agencia')
    }
  }

  return (
    <>
      <button className="sp-btn sp-btn--outline" type="button" onClick={abrir}>Agencias de envío</button>
      {abierto && (
        <div className="sp-modal" onClick={() => setAbierto(false)}>
          <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="sp-modal-titulo">Agencias de envío nacional</h3>
            {cargando ? (
              <p>Cargando...</p>
            ) : (
              <div className="sp-agencias">
                {agencias.map((a) => (
                  <div key={a.id} className={`sp-agencia ${a.activo ? '' : 'sp-agencia--inactiva'}`}>
                    <p><strong>{a.nombre}</strong> {a.telefono ? `— ${a.telefono}` : ''}</p>
                    <p className="sp-agencia-meta">
                      {a.ubicacion ? `${a.ubicacion} · ` : ''}
                      {a.tarifa_sugerida ? `Tarifa $${a.tarifa_sugerida}` : 'Sin tarifa'}
                      {!a.activo && ' · INACTIVA'}
                    </p>
                    <div className="sp-acciones">
                      <button className="sp-btn" onClick={() => editar(a)}>Editar</button>
                      {a.activo && <button className="sp-btn sp-btn--danger" onClick={() => desactivar(a)}>Desactivar</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <hr />
            <div className="sp-agencia-form">
              <input placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              <input placeholder="Ubicación" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
              <input placeholder="Tarifa sugerida ($)" value={form.tarifa_sugerida} onChange={(e) => setForm({ ...form, tarifa_sugerida: e.target.value })} />
              <div className="sp-acciones">
                <button className="sp-btn" onClick={() => { setEditandoId(null); setForm({ nombre: '', telefono: '', ubicacion: '', tarifa_sugerida: '' }) }}>Limpiar</button>
                <button className="sp-btn sp-btn--principal" onClick={guardar}>{editandoId ? 'Guardar cambios' : 'Crear agencia'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default StaffPedidos
