import { useState, useEffect } from 'react'
import api from '../../api/axios'
import FacturaForm from './FacturaForm'
import PagoForm from './PagoForm'

function ClienteDetalle({ clienteId, onVolver }) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrarFacturaForm, setMostrarFacturaForm] = useState(false)
  const [mostrarPagoForm, setMostrarPagoForm] = useState(false)
  const [facturaEnEdicion, setFacturaEnEdicion] = useState(null)

useEffect(() => {
    let activo = true
    api.get(`/clientes/estado-cuenta/${clienteId}`)
      .then(({ data }) => {
        if (activo) setDatos(data)
      })
      .catch((err) => {
        if (activo) {
          console.error(err)
          setError('No se pudo cargar el detalle del cliente')
        }
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [clienteId])

async function cargarDetalle() {
    try {
      const { data } = await api.get(`/clientes/estado-cuenta/${clienteId}`)
      setDatos(data)
    } catch (err) {
      setError('No se pudo cargar el detalle del cliente')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

async function handleEliminarPago(pagoId) {
  const confirmado = window.confirm('┬┐Seguro que quer├®s eliminar este pago? Las facturas que hab├¡a saldado volver├ín a estado pendiente.')
  if (!confirmado) return

  try {
    await api.delete(`/pagos/${pagoId}`)
    await cargarDetalle()
  } catch (err) {
    alert(err.response?.data?.message || 'No se pudo eliminar el pago')
  }
}

  function abrirNuevaFactura() {
  setFacturaEnEdicion(null)
  setMostrarFacturaForm(true)
}

function abrirEdicionFactura(factura) {
  setFacturaEnEdicion(factura)
  setMostrarFacturaForm(true)
}

function cerrarFacturaForm() {
  setMostrarFacturaForm(false)
  setFacturaEnEdicion(null)
}

  async function handleGuardado() {
  setMostrarFacturaForm(false)
  setFacturaEnEdicion(null)
  setMostrarPagoForm(false)
  await cargarDetalle()
}

  if (cargando) return <p>Cargando detalle...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  const { cliente, resumen, facturas, pagos } = datos

  return (
    <div>
      <button onClick={onVolver}>ÔåÉ Volver</button>

      <h2>{cliente.nombre}</h2>
      <p>{cliente.email}</p>

      <div className="resumen-cuenta">
        <p>L├¡nea de cr├®dito: ${resumen.linea_credito.toFixed(2)}</p>
        <p>Total facturado: ${resumen.total_facturado.toFixed(2)}</p>
        <p>Total pagado: ${resumen.total_pagado.toFixed(2)}</p>
        <p>Deuda actual: ${resumen.deuda_actual.toFixed(2)}</p>
        <p style={{ color: resumen.saldo >= 0 ? 'green' : 'red' }}>
          <strong>
            Saldo: {resumen.saldo >= 0 ? '+' : ''}${resumen.saldo.toFixed(2)}
          </strong>
        </p>
      </div>

      <div className="acciones-cuenta">
        <button onClick={abrirNuevaFactura}>+ Nueva factura</button>
        <button onClick={() => setMostrarPagoForm(true)}>+ Nuevo abono</button>
      </div>

      <h3>Facturas</h3>
      {facturas.length === 0 ? (
        <p>Sin facturas registradas</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>N├║mero</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>├ôrdenes incluidas</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => (
              <tr key={f.id}>
                <td>{f.numero_factura}</td>
                <td>${Number(f.monto_facturado).toFixed(2)}</td>
                <td>{f.estado}</td>
                <td>{f.factura_ordenes.map((fo) => fo.orden_id).join(', ') || 'ÔÇö'}</td>
                <td>{new Date(f.created_at).toLocaleDateString('es-VE')}</td>
                <td><button onClick={() => abrirEdicionFactura(f)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Pagos</h3>
  {pagos.length === 0 ? (
    <p>Sin pagos registrados</p>
  ) : (
    <table>
      <thead>
        <tr>
          <th>Monto</th>
          <th>Tipo</th>
          <th>Detalle</th>
          <th>Facturas saldadas</th>
          <th>Fecha</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {pagos.map((p) => (
          <tr key={p.id}>
            <td>${Number(p.monto).toFixed(2)}</td>
            <td>{p.tipo}</td>
            <td>{p.detalle || 'ÔÇö'}</td>
            <td>{p.pago_facturas.map((pf) => pf.factura_id).join(', ') || 'ÔÇö'}</td>
            <td>{new Date(p.created_at).toLocaleDateString('es-VE')}</td>
            <td>
              <button onClick={() => handleEliminarPago(p.id)}>Eliminar</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}

      {mostrarFacturaForm && (
        <FacturaForm
          clienteId={clienteId}
          factura={facturaEnEdicion}
          onClose={cerrarFacturaForm}
          onGuardado={handleGuardado}
        />
      )}

      {mostrarPagoForm && (
        <PagoForm
          clienteId={clienteId}
          facturasPendientes={facturas.filter((f) => f.estado === 'pendiente')}
          onClose={() => setMostrarPagoForm(false)}
          onGuardado={handleGuardado}
        />
      )}
    </div>
  )
}

export default ClienteDetalle
