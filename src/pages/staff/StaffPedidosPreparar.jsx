import { useState } from 'react'
import staffApi from '../../api/staffAxios'
import LayoutDepartamento from '../../components/staff/LayoutDepartamento'
import ColaOrdenes from '../../components/staff/ColaOrdenes'
import { useColaStaff } from '../../hooks/useColaStaff'
import { useStaffBadges } from '../../context/StaffBadgesContext'
import { exportarGuiaDespacho } from '../../utils/exportUtils'

// Órdenes aprobadas y en 'preparando'. La cola trae TODAS las de ese estado
// (incluidas las que esperan pago); el badge `preparar` del nav cuenta solo las
// accionables, y `preparar_esperando_pago` alimenta el aviso de arriba.
export default function StaffPedidosPreparar() {
  const { datos, cargando, error, recargarTodo } = useColaStaff('/staff/almacen/preparar')
  const { conteos } = useStaffBadges()

  return (
    <LayoutDepartamento departamento="logistica" activo="preparar" titulo="Preparar Órdenes">
      <p className="sp-meta">
        Verifica el paquete y despacha: “Marcar como enviado” para delivery/envío nacional,
        “Marcar listo para retiro” cuando el cliente recoge en tienda.
      </p>
      {(conteos.preparar_esperando_pago > 0) && (
        <p className="sp-aviso">
          {conteos.preparar_esperando_pago} {conteos.preparar_esperando_pago === 1 ? 'orden espera' : 'órdenes esperan'} pago de contabilidad — no se pueden despachar todavía.
        </p>
      )}
      <ColaOrdenes
        ordenes={datos}
        cargando={cargando}
        error={error}
        vacio="No hay pedidos por preparar."
        renderAcciones={(orden) => (
          <AccionesPreparar orden={orden} onRecargar={recargarTodo} />
        )}
      />
    </LayoutDepartamento>
  )
}

function AccionesPreparar({ orden, onRecargar }) {
  const [verificando, setVerificando] = useState({})
  const [procesando, setProcesando] = useState(false)

  const esRetiro = orden.tipo_envio === 'retiro'
  const abierto = verificando[orden.id] !== undefined
  const v = verificando[orden.id] || {}
  const items = Array.isArray(orden.ordenes_items) ? orden.ordenes_items : []
  const vivos = items.filter((i) => !i.anulado)
  const agotados = items.filter((i) => i.anulado)
  const verificado = vivos.length > 0 && vivos.every((i) => v[i.id])

  function toggleItem(ordenId, itemId) {
    setVerificando((prev) => {
      const actual = prev[ordenId] || {}
      return { ...prev, [ordenId]: { ...actual, [itemId]: !actual[itemId] } }
    })
  }

  function abrirVerificacion() {
    setVerificando((prev) => ({ ...prev, [orden.id]: {} }))
  }

  async function confirmarPaquete() {
    setProcesando(true)
    try {
      await staffApi.post(`/staff/logistica/${orden.id}/verificar-paquete`)
      await onRecargar()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo verificar el paquete')
    } finally {
      setProcesando(false)
    }
  }

  async function salir(destino) {
    if (destino === 'cancelar' && !window.confirm(`¿Cancelar la orden #${orden.id}?`)) return
    setProcesando(true)
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
      setProcesando(false)
    }
  }

  return (
    <>
      {orden.forma_pago === 'contado' && orden.estado_pago !== 'verificado' && (
        <p className="sp-aviso">Pendiente de pago — falta que contabilidad verifique.</p>
      )}

      {/* Los agotados NO son checkboxes: no van en el paquete, y decirlo
          explica por que el total de la card es menor al de la orden original. */}
      {agotados.length > 0 && (
        <p className="sp-ajuste">
          {agotados.length} {agotados.length === 1 ? 'producto agotado' : 'productos agotados'} — no van en el paquete:
          {' '}{agotados.map((i) => `${i.cantidad}x ${i.productos?.nombre_comercial}`).join(', ')}
        </p>
      )}

      <div className="sp-acciones">
        {!esRetiro && !abierto && (
          <button className="sp-btn sp-btn--principal" onClick={abrirVerificacion} disabled={procesando}>
            Verificar paquete
          </button>
        )}
        {!esRetiro && abierto && (
          <div className="sp-caja-verificar">
            <p className="sp-caja-titulo">Marca cada producto como verificado:</p>
            {vivos.map((item) => (
              <label key={item.id} className="sp-verificar-item">
                <input type="checkbox" checked={!!v[item.id]} onChange={() => toggleItem(orden.id, item.id)} />
                <span>{item.cantidad}x {item.productos?.nombre_comercial}</span>
              </label>
            ))}
            <button className="sp-btn" onClick={confirmarPaquete} disabled={!verificado || procesando}>
              {verificado ? 'Confirmar paquete' : 'Marca todos los productos'}
            </button>
          </div>
        )}
        {esRetiro ? (
          <button className="sp-btn sp-btn--principal" onClick={() => salir('listo_para_retiro')} disabled={procesando}>
            Marcar listo para retiro
          </button>
        ) : (
          <button className="sp-btn sp-btn--principal" onClick={() => salir('enviado')} disabled={procesando || (abierto && !verificado)}>
            Marcar como enviado
          </button>
        )}
        <button className="sp-btn sp-btn--ghost" onClick={() => exportarGuiaDespacho(orden)}>Imprimir guía</button>
        <button className="sp-btn sp-btn--danger" onClick={() => salir('cancelar')} disabled={procesando}>Cancelar</button>
      </div>
    </>
  )
}
