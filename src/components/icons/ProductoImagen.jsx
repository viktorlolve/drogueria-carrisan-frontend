// src/components/icons/ProductoImagen.jsx
// Imagen de producto con fallback a ICONO (SVG inline, sin cargar ningún archivo).
// Si `src` está presente renderiza un <img> igual que antes.
// Si no hay foto, renderiza un contenedor con la clase del img + un icono de
// cápsula farmacéutica. Para modificar el ícono/estilo en el futuro: editar el
// SVG de aquí y `ProductoImagen.css` — no hace falta ningún placeholder.png.

import './ProductoImagen.css'

// Icono de cápsula/píldora (dibujado a mano). usa currentColor para heredar color.
export const IconoProducto = ({ size = '60%', className = '' }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 48 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    <rect x="1.5" y="1.5" width="45" height="21" rx="10.5" fill="currentColor" opacity="0.18" />
    <rect x="23.5" y="1.5" width="23" height="21" rx="10.5" fill="currentColor" opacity="0.55" />
    <path
      d="M1.5 10.5 L46.5 10.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      opacity="0.7"
    />
    <circle cx="14" cy="10.5" r="2" fill="currentColor" opacity="0.5" />
  </svg>
)

export function ProductoImagen({
  src,
  alt = '',
  className = '',
  loading,
  style,
  width,
  height,
  ...rest
}) {
  if (src) {
    return (
      <img
        {...rest}
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        style={style}
        width={width}
        height={height}
      />
    )
  }

  // Sin foto: contenedor con la misma clase (heredan sus dimensiones/bordes) +
  // marcador de placeholder + icono centrado. objectFit no aplica en un div
  // (no hay imagen); width/height numéricos se convierten a style.
  const dimStyle = { ...style }
  if (!dimStyle.width && width != null) dimStyle.width = `${width}px`
  if (!dimStyle.height && height != null) dimStyle.height = `${height}px`

  return (
    <div
      {...rest}
      className={`${className} placeholder-icono`.trim()}
      role="img"
      aria-label={alt || 'Producto sin imagen'}
      style={dimStyle}
    >
      <IconoProducto />
    </div>
  )
}

export default ProductoImagen