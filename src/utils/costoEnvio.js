// src/utils/costoEnvio.js
//
// Tarifa de delivery para una ciudad. REGLA ÚNICA, espejo de
// `costoEnvioParaCiudad` en `drogueria-carrisan-backend/src/controllers/ordenes.controller.js`:
// la orden cobra lo que el cliente ve en el carrito, así que si cambia acá
// TIENE que cambiar allá (y al revés).
//
// Regla: coincidencia EXACTA de ciudad → primera tarifa activa (el backend
// devuelve /delivery-tarifas/activas ordenadas por ciudad asc) → 8.00.
// Las tarifas sin costo válido cuentan como 0 (nunca NaN en el total).

export const COSTO_ENVIO_POR_DEFECTO = 8

export function costoEnvioParaCiudad(tarifas, ciudad) {
  const lista = (Array.isArray(tarifas) ? tarifas : []).filter((t) => t && typeof t === 'object')
  const exacta = ciudad ? lista.find((t) => t.ciudad === ciudad) : null
  const elegida = exacta || lista[0]
  const costo = elegida && elegida.costo != null ? Number(elegida.costo) : COSTO_ENVIO_POR_DEFECTO
  if (!Number.isFinite(costo) || costo < 0) return 0
  return Math.round(costo * 100) / 100
}
