import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { logoMiniatura, nombreVisible } from '../config/laboratoriosLogos'

// Cache en memoria de logos ya decodificados. El carrusel se desmonta al
// navegar y vuelve a montar al regresar: sin esto las tarjetas nacerían
// invisibles (fade) aunque el navegador ya tenga el archivo en cache.
const logosListos = new Set()

// Logo de una tarjeta de laboratorio, compartido por el carrusel del Home
// (LaboratoriosCarrusel) y el del catálogo (LaboratoriosCarruselCatalogo).
//
// `className` es la clase del <img>; el modificador `--listo` se le agrega
// (ej. `lab-car__logo` → `lab-car__logo lab-car__logo--listo`). `classNameIcono`
// es la clase del ícono de fallback.
//
// Los logos se piden sin `loading="lazy"` a propósito: la fila es un scroll
// horizontal y el navegador considera "fuera de viewport" todo lo que está a
// la derecha, así que en móvil las imágenes recién se descargaban al deslizar
// el carrusel (tarjetas grises que aparecían después).
function LogoTile({
  laboratorio,
  logo,
  className = 'lab-car__logo',
  classNameIcono = 'cat-car__icono',
}) {
  const [src, setSrc] = useState(() => logoMiniatura(logo))
  const [roto, setRoto] = useState(false)
  const [listo, setListo] = useState(() => logosListos.has(logo))

  if (roto) {
    return <FlaskConical className={classNameIcono} strokeWidth={1.6} aria-hidden="true" />
  }

  function alCargar() {
    logosListos.add(logo)
    setListo(true)
  }

  // Si la transformación de Supabase no responde, se reintenta con el
  // original (un logo válido nunca deja la tarjeta vacía); si el original
  // también falla, cae al ícono de laboratorio.
  function alFallar() {
    if (src !== logo) setSrc(logo)
    else setRoto(true)
  }

  return (
    <img
      src={src}
      alt={nombreVisible(laboratorio)}
      className={`${className}${listo ? ` ${className}--listo` : ''}`}
      loading="eager"
      decoding="async"
      onLoad={alCargar}
      onError={alFallar}
    />
  )
}

export default LogoTile
