// Formatters compartidos por las vistas de órdenes (tarjeta de pedido,
// resumen de cuenta, Reports). Viven acá —y no dentro de una página— porque
// los dos consumidores de la card (Mi Cuenta y Mis Órdenes) deben pintar
// los mismos números y fechas: si cada uno tiene su copia, el mismo dato
// aparece con dos formatos distintos según por dónde se mire.

// Monto en USD con el código ISO al inicio (moneda referencial de la cuenta):
// "USD 1,234.56". El símbolo $ queda reservado solo para precios de productos.
// `valor` nulo/vacío → "USD 0.00".
export function formatearUSD(valor) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'code' }).format(valor || 0)
}

// Monto en bolívares con el código ISO al inicio (área bancaria): "VES 1.234,56".
// En los precios de productos se sigue usando "Bs." aparte.
export function formatearVES(valor) {
  return `VES ${Number(valor || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Monto en USD con el formato de Venezuela. `valor` nulo/vacío → "USD 0.00".
export function formatearMonto(valor) {
  return formatearUSD(valor)
}

// Fecha corta dd/mm/aa → "15/08/26". Formato a mano (no toLocaleDateString)
// para no depender de la versión de ICU del navegador. Devuelve null si no hay
// fecha válida, y el consumidor omite el dato en vez de pintar "Invalid Date".
export function formatearFechaCorta(iso) {
  if (!iso) return null
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return null
  const dd = String(fecha.getDate()).padStart(2, '0')
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const aa = String(fecha.getFullYear()).slice(-2)
  return `${dd}/${mm}/${aa}`
}
