import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStaffAuth } from '../context/StaffAuthContext'
import './ProtegerImagenes.css'

// ---------------------------------------------------------------
// ProtegerImagenes — quita el menú contextual (y el arrastre) SOLO
// cuando el clic cae sobre una imagen, para que el catálogo no invite
// a "Guardar imagen como…" / "Copiar dirección de imagen".
//
// Alcance a propósito:
//   · NO se bloquea el clic derecho en el resto de la página (textos,
//     inputs, enlaces siguen con su menú normal: bloquear todo molesta y
//     rompe accesibilidad).
//   · NO se bloquea dentro de [data-permitir-guardar] — la excepción
//     para lo que SÍ se quiere descargable (ej. la tarjeta de "Compartir
//     como imagen", que tiene su propio botón Descargar PNG).
//   · El dueño (es_admin) y el personal (sesión staff) quedan exentos:
//     curan fotos y necesitan copiar URLs todo el tiempo.
//
// OJO — esto es cosmético, no seguridad real: la URL de la foto viaja en
// el HTML/JSON y se puede pedir igual por devtools o por HTTP. Para
// proteger de verdad hace falta hotlink/referrer o URLs firmadas; esta
// clase solo elimina el atajo de un clic.
// ---------------------------------------------------------------

const OBJETIVO = 'img, [data-proteger-imagen]'
const EXCEPCION = '[data-permitir-guardar]'

function debeBloquear(destino) {
  if (!(destino instanceof Element)) return false
  const objetivo = destino.closest(OBJETIVO)
  if (!objetivo) return false
  return !objetivo.closest(EXCEPCION)
}

export default function ProtegerImagenes() {
  const { user } = useAuth()
  const { staff } = useStaffAuth()
  const exento = !!user?.es_admin || !!staff

  useEffect(() => {
    if (exento) return

    // capture: los handlers de página pueden hacer stopPropagation, y el
    // nuestro tiene que ganar igual.
    const onContextMenu = (e) => {
      if (debeBloquear(e.target)) e.preventDefault()
    }
    // El segundo atajo de guardado: arrastrar la foto al escritorio.
    const onDragStart = (e) => {
      if (debeBloquear(e.target)) e.preventDefault()
    }

    document.addEventListener('contextmenu', onContextMenu, true)
    document.addEventListener('dragstart', onDragStart, true)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true)
      document.removeEventListener('dragstart', onDragStart, true)
    }
  }, [exento])

  return null
}
