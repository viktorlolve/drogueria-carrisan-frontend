// Moléculas destacadas de la portada de /vademecum (bloque "Las más consultadas").
//
// Es una lista curada a mano, NO un top de popularidad: la plataforma todavía no
// registra qué moléculas busca la gente (no hay tabla de búsquedas), así que
// estos son los principios activos de consulta habitual en droguería y clínica,
// elegidos por cobertura clínica (7 grupos ATC distintos).
//
// Cada entrada fue VERIFICADA contra la API el 2026-09-30:
//   - `id` existe en `moleculas_referencias` (bigint)
//   - `GET /moleculas/moleculas/:id` devuelve `ficha_tecnica` != null
//     (si fuera null, la card caería en "Ficha en revisión")
//   - `atc` es el código del nivel 5 real de esa molécula
//   - `registros` = `paginacion.total` (productos del catálogo INHRR que la usan)
//
// `registros` es informativo y puede derivar si se re-importa el INHRR: si eso
// pasa, basta con corregir el número (o el texto, que no promete nada exacto).

export const MOLECULAS_FRECUENTES = [
  { id: 1, nombre: 'Paracetamol', atc: 'N02BE01', registros: 14, uso: 'Dolor y fiebre' },
  { id: 3877, nombre: 'Ibuprofeno', atc: 'M01AE01', registros: 152, uso: 'Antiinflamatorio' },
  { id: 221, nombre: 'Amoxicilina', atc: 'J01CA04', registros: 92, uso: 'Antibiótico' },
  { id: 366, nombre: 'Azitromicina', atc: 'J01FA10', registros: 39, uso: 'Antibiótico' },
  { id: 2584, nombre: 'Omeprazol', atc: 'A02BC01', registros: 9, uso: 'Antiácido' },
  { id: 212, nombre: 'Amlodipino', atc: 'C08CA01', registros: 47, uso: 'Presión arterial' },
  { id: 2131, nombre: 'Losartan', atc: 'C09CA01', registros: 89, uso: 'Presión arterial' },
  { id: 1739, nombre: 'Hidroclorotiazida', atc: 'C03AA03', registros: 134, uso: 'Diurético' },
  { id: 2280, nombre: 'Metformina', atc: 'A10BA02', registros: 64, uso: 'Diabetes' },
  { id: 3105, nombre: 'Salbutamol', atc: 'R03AC02', registros: 18, uso: 'Asma y vías respiratorias' },
  { id: 1034, nombre: 'Dexametasona', atc: 'S01CB01', registros: 44, uso: 'Corticoide' },
  { id: 2125, nombre: 'Loratadina', atc: 'R06AX13', registros: 66, uso: 'Alergia' },
]

export default MOLECULAS_FRECUENTES
