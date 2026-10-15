// ---------------------------------------------------------------
// Funciones PURAS del aviso de notificaciones. Sin React, sin
// imports: se testean con `node --test` (scripts/
// avisoNotificacionesHelpers.test.mjs) sin montar nada.
//
// El aviso invita a activar el push del navegador al entrar a Mi
// Cuenta. Vive acá la decisión de mostrarlo porque es la parte con
// ramas (navegador sin soporte, permiso bloqueado, ya activado,
// ya eligió "Ahora no"), y es lo único que vale la pena testear
// sin DOM.
// ---------------------------------------------------------------

// Decisión por dispositivo. En otro dispositivo el aviso se vuelve a
// preguntar (no hay nada en el servidor).
export const CLAVE_AVISO = 'carrisan_aviso_notificaciones'
export const VALOR_NO_MOSTRAR = 'no_mostrar'

/**
 * ¿El valor guardado en localStorage equivale a "ya eligió Ahora no"?
 * Tolera null/undefined/vacío/basura para que un valor corrupto no
 * rompa ni oculte el aviso por accidente.
 */
export function esDecisionNoMostrar(valorCrudo) {
  return valorCrudo === VALOR_NO_MOSTRAR
}

/**
 * ¿Se debe mostrar el aviso en este momento?
 *
 * Recibe el estado crudo de `usePush()` (soportado/suscrito/permiso) más
 * la decisión guardada. Cualquier caso donde el aviso no aporte se
 * descarta acá:
 *
 * - navegador sin push (soportado=false) → el botón no haría nada.
 * - todavía detectando (suscrito/permiso null) → esperar, no parpadear.
 * - ya activado (suscrito=true) → nada que pedir.
 * - permiso bloqueado (denied) → no se puede activar; lo maneja el
 *   engranaje de Mi Cuenta con instrucciones para desbloquear.
 * - ya eligió "Ahora no" en este dispositivo → respetar la decisión.
 */
export function debeMostrarAviso({ soportado, suscrito, permiso, dijoAhoraNo }) {
  if (!soportado) return false
  if (suscrito !== false) return false
  if (permiso === null) return false
  if (permiso === 'denied') return false
  if (dijoAhoraNo) return false
  return true
}
