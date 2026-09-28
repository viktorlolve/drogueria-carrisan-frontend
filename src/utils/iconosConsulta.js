// Mapas de iconos (lucide-react) para las páginas de consulta:
// Registro sanitario INHRR y Vademécum clínico.
import {
  Pill,
  Hospital,
  Stethoscope,
  Shapes,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Ban,
  Info,
  ClipboardList,
  TriangleAlert,
  Link2,
  Baby,
  Activity,
  Siren,
} from 'lucide-react'

export const ICONO_CATEGORIA = {
  ME: Pill,
  HO: Hospital,
  MM: Stethoscope,
  MI: Shapes,
}

export const ICONO_ESTADO = {
  vigente: ShieldCheck,
  por_vencer: Clock,
  vencido: ShieldAlert,
  cancelado: Ban,
  sin_dato: Info,
}

// Claves = columnas de moleculas_ficha_tecnica (ver config/seccionesFicha.js)
export const ICONO_SECCION = {
  indicaciones_terapeuticas: ClipboardList,
  posologia: Pill,
  contraindicaciones: Ban,
  advertencias: TriangleAlert,
  interacciones: Link2,
  embarazo_lactancia: Baby,
  efectos_adversos: Activity,
  sobredosis: Siren,
}