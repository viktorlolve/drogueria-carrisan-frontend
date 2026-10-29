import { useCallback, useEffect, useRef, useState } from 'react'

// Distancia vertical (en px, por encima y por debajo del viewport) a la que se
// considera que un bloque "está por aparecer". Con 800px el navegador alcanza a
// descargar la fila completa antes de que el usuario llegue a ella.
const MARGEN_POR_DEFECTO = '800px 0px'

// ¿Para qué existe?
// Los carruseles de productos tienen scroll horizontal y sus fotos usan
// loading="lazy". Chrome solo descarga las imágenes que están (o están casi) en
// el viewport, así que al abrir la página baja únicamente la foto de la primera
// tarjeta y cada siguiente se pide recién cuando el usuario desliza: entre que
// desliza y llega la foto se ve el placeholder por medio segundo.
//
// Con este hook el carrusel avisa cuando se acerca al viewport y sus tarjetas
// pasan a loading="eager", de modo que toda la fila ya está en caché antes del
// primer swipe. Mientras el carrusel está lejos, las imágenes siguen "lazy" y
// no cuestan ancho de banda.
//
// El valor que devuelve `refCerca` es un *callback ref* (no un `useRef`) a
// propósito: con un `useRef` el efecto del primer render corre con
// `ref.current === null` y, como las dependencias no vuelven a cambiar, el
// observer nunca llegaría a engancharse al nodo.
export function useCercaDeViewport(rootMargin = MARGEN_POR_DEFECTO) {
  // Sin IntersectionObserver (navegador viejo) cargamos todo de una: mejor
  // gastar datos que mostrar huecos.
  const [cerca, setCerca] = useState(() => typeof IntersectionObserver === 'undefined')
  const cercaRef = useRef(cerca)
  const observerRef = useRef(null)

  const refCerca = useCallback((nodo) => {
    observerRef.current?.disconnect()
    observerRef.current = null

    if (!nodo || cercaRef.current) return
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver((entradas) => {
      if (!entradas.some((entrada) => entrada.isIntersecting)) return
      cercaRef.current = true
      observer.disconnect()
      observerRef.current = null
      setCerca(true)
    }, { rootMargin })

    observer.observe(nodo)
    observerRef.current = observer
  }, [rootMargin])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return { refCerca, cerca }
}

export default useCercaDeViewport
