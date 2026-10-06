import { useState } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import ColaOrdenes, { formatUSD } from '../../components/staff/ColaOrdenes'
import { useColaStaff } from '../../hooks/useColaStaff'
import { exportarGuiaDespacho } from '../../utils/exportUtils'

// Entrada del pipeline: ordenes recien recibidas. El almacenista revisa,
// anula lo agotado (con nota) y aprueba. Aprobar mueve la orden a
// 'preparando' y recalcula el total en el backend.
export default function StaffPedidosNuevas() {
  const { datos, cargando, error, recargarTodo } = useColaStaff('/staff/almacen/revisar')
  const [procesando, setProcesando] = useState(false)

  async function cancelar(orden) {
    if (!window.confirm(`¿Cancelar la orden #${orden.id} de ${orden.users?.nombre || 'cliente'}? Esta acción no se puede deshacer.`)) return
    setProcesando(true)
    try {
      await staffApi.patch(`/staff/almacen/${orden.id}/cancelar`)
      await recargarTodo()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo cancelar la orden')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <LayoutDepartamento departamento="logistica" activo="nuevas" titulo="Órdenes Nuevas">
      <p className="sp-meta">
        Revisa cada orden, anula lo agotado y aprueba. Al aprobar pasa a “Preparar Órdenes”.
      </p>
      <ColaOrdenes
        ordenes={datos}
        cargando={cargando}
        error={error}
        vacio="No hay pedidos por revisar."
        renderAcciones={(orden) => (
          <>
            <EditorAprobar orden={orden} onCerrar={recargarTodo} />
            <button className="sp-btn sp-btn--ghost" onClick={() => exportarGuiaDespacho(orden)}>Imprimir guía</button>
            <button className="sp-btn sp-btn--danger" onClick={() => cancelar(orden)} disabled={procesando}>Cancelar pedido</button>
          </>
        )}
      />
    </LayoutDepartamento>
  )
}

// Boton + modal de edicion de una orden. Se renderiza por cada orden de la
// cola, asi que mantiene su propio estado local (abierto/cerrado + items).
function EditorAprobar({ orden, onCerrar }) {
  const [abierto, setAbierto] = useState(false)
  const [items, setItems] = useState([])
  const [procesando, setProcesando] = useState(false)

  function abrir() {
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
    setAbierto(true)
  }

  function cerrar() {
    setAbierto(false)
    setItems([])
  }

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
      await staffApi.patch(`/staff/almacen/${orden.id}/aprobar`, { items: payload })
      cerrar()
      await onCerrar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo aprobar la orden')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <>
      <button className="sp-btn" onClick={abrir}>Revisar y aprobar</button>
      {abierto && (
        <div className="sp-modal" onClick={cerrar}>
          <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="sp-modal-titulo">Revisar orden #{orden.id}</h3>
            <p className="sp-card-cliente">{orden.users?.nombre} — {orden.forma_pago === 'credito' ? 'Crédito' : 'Contado'}</p>

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
    </>
  )
}
