import {
  Pill, HeartPulse, Activity, Utensils, Citrus, Brain, Flower2, Wind,
  Thermometer, HandHeart, Eye, ShieldPlus, Bug, Venus, Mars, Cross, LayoutGrid,
  Droplet, Bandage, Hospital,
} from 'lucide-react'

// Mapeo icono (nombre Lucide guardado en categorias_tienda.icono) → componente.
// Los nombres vienen del seed de la migración 032: agregar acá cualquier icono nuevo
// que se use en categorias_tienda. Fallback genérico: LayoutGrid.
export const ICONOS_CATEGORIAS = {
  Pill, HeartPulse, Activity, Utensils, Citrus, Brain, Flower2, Wind,
  Thermometer, HandHeart, Eye, ShieldPlus, Bug, Venus, Mars, Cross, LayoutGrid,
  Droplet, Bandage, Hospital,
}

// Override por id de categoría. GANA sobre `categorias_tienda.icono` de la BD,
// así cambiar el ícono de una categoría no requiere migración.
// Los nombres viejos (Activity, HandHeart, Cross) siguen en ICONOS_CATEGORIAS:
// si se saca una entrada de acá, la categoría vuelve al ícono de la BD.
export const ICONO_POR_CATEGORIA = {
  antidiabeticos: Droplet,
  piel: Bandage,
  hospitalario: Hospital,
}

export const ICONO_CATEGORIA_FALLBACK = LayoutGrid

// Resuelve el ícono de una categoría: override por id > nombre en la BD > fallback.
// `cat` es una fila de categorias_tienda (`{ id, nombre, icono }`).
export function iconoParaCategoria(cat) {
  if (!cat) return ICONO_CATEGORIA_FALLBACK
  return ICONO_POR_CATEGORIA[cat.id] || ICONOS_CATEGORIAS[cat.icono] || ICONO_CATEGORIA_FALLBACK
}