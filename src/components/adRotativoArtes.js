// ---------------------------------------------------------------
// Funciones PURAS de la dirección de arte del AdRotativo. Sin React,
// sin imports: se testean con `node --test` (scripts/
// adRotativoArtes.test.mjs) sin montar nada.
//
// Regla central: cada dispositivo tiene SU caja y SU arte.
//   desktop → caja 4:1     (2048×512)
//   móvil   → caja 16:9    (1280×720)
//
// Una ad que no tiene el arte del dispositivo actual NO se muestra ahí
// (no se recorta una panorámica en el celular ni una vertical en
// desktop). Una ad sin ningún arte es una maqueta: el componente pinta
// el placeholder en ambos dispositivos.
// ---------------------------------------------------------------

/** ¿El valor tiene una URL de verdad? Tolera '', espacios, null y undefined. */
export function tieneArte(valor) {
  return typeof valor === 'string' && valor.trim() !== ''
}

/**
 * Arte que corresponde a la ad según el dispositivo.
 *
 * Devuelve `null` cuando la ad no tiene arte para este dispositivo (el
 * llamador decide: no mostrarla, o mostrar el placeholder si tampoco
 * tiene el del otro dispositivo).
 */
export function arteDe(ad, esMovil) {
  if (!ad) return null
  const arte = esMovil ? ad.imagenMovil : ad.imagenDesktop
  return tieneArte(arte) ? arte.trim() : null
}

/**
 * Ads que rotan en el dispositivo actual, en el orden recibido.
 *
 * - Con el arte del dispositivo → entra.
 * - Solo con el arte del otro dispositivo → queda fuera (evita recortes
 *   que rompen el texto horneado del arte).
 * - Sin ningún arte → entra igual (maqueta con placeholder).
 */
export function adsVisibles(ads, esMovil) {
  if (!Array.isArray(ads)) return []
  return ads.filter((ad) => {
    if (!ad) return false
    if (arteDe(ad, esMovil)) return true
    // Maqueta: no tiene ningún arte → se muestra el placeholder.
    return !tieneArte(ad.imagenDesktop) && !tieneArte(ad.imagenMovil)
  })
}

/**
 * Índice válido para la lista actual. Al pasar de desktop a móvil la
 * lista se acorta y el índice guardado puede quedar fuera de rango.
 */
export function indiceSeguro(indice, largo) {
  if (!largo || largo < 1) return 0
  if (!Number.isFinite(indice) || indice < 0) return 0
  return Math.floor(indice) % largo
}

/**
 * ¿Corresponde rotar sola? Con una sola ad no hay nada que rotar; se
 * respeta la pausa del mouse y `prefers-reduced-motion: reduce`.
 */
export function debeRotar({ cantidad, pausado, reducido }) {
  return cantidad > 1 && !pausado && !reducido
}
