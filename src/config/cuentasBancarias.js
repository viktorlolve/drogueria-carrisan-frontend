// ---------------------------------------------------------------
// Datos de pago de la empresa, agrupados por TIPO DE CLIENTE.
//
// Cada tipo de usuario (`users.tipo_usuario`) ve SOLO las cuentas
// de su grupo: institucional ve las suyas; profesional y honorifico
// ven las suyas. No existe mezcla: el filtro es un lookup simple.
//
// Estructura por cuenta:
//   {
//     id, Icono, titulo, subtitulo,
//     logo,                    // URL del logo del banco (opcional)
//     metodo: 'transferencia' | 'pago_movil',
//     campos: [{ label, valor, copiar }],
//     copiarTodo: string|null, // bloque multi-línea para "Copiar todos" (opcional)
//     qr: boolean,             // reserva el espacio del QR en la UI
//   }
//
// Reglas de copiado (`copiar`): lo que se MUESTRA (`valor`) lleva el
// formato legible; lo que se COPIA (`copiar`) va limpio para que la
// app del banco lo reciba cómodo. Cuando `copiar` no se declara, se
// copia `valor` tal cual.
//
// `Icono` es un componente de lucide-react.
//
// Si `tipo_usuario` no está en el mapa (cuentas antiguas, admin),
// se usa PROFESIONAL_HONORIFICO como predeterminado.
// ---------------------------------------------------------------
import { Landmark, Smartphone } from 'lucide-react'

// Logo del banco (Supabase Storage, carpeta raíz del bucket y SIN %20)
const LOGO_MERCANTIL =
  'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/mercantil.webp'

// QR de pago (imagen subida por el dueño a la raíz del bucket, SIN %20)
const QR_CARRISAN =
  'https://fqeshthtycmzgyibiurq.supabase.co/storage/v1/object/public/crsnimages/qrcarrisan.jpeg'

// ---------------------------------------------------------------
// Grupo 1 — Clientes INSTITUCIONALES (clinicas, farmacias, centros)
//
// Sin QR (el dueño lo decidió así) y sin "copiar todos".
// ---------------------------------------------------------------
const CUENTAS_INSTITUCIONAL = [
  {
    id: 'inst-mercantil',
    Icono: Landmark,
    metodo: 'transferencia',
    titulo: 'Transferencia Mercantil',
    subtitulo: 'Cuenta corriente — clientes institucionales',
    logo: LOGO_MERCANTIL,
    campos: [
      {
        label: 'Titular',
        valor: 'Droguería Carrisan, C.A.',
        copiar: 'Droguería Carrisan, C.A.',
      },
      { label: 'RIF', valor: 'J-40068410-2', copiar: 'J40068410-2' },
      {
        label: 'Número de cuenta',
        valor: '0105-0137-7911-3707-3810',
        copiar: '01050137791137073810',
      },
    ],
  },
]

// ---------------------------------------------------------------
// Grupo 2 — Clientes PROFESIONALES de la salud y HONORIFICOS
// (mismo banco para ambos): Pago Móvil + espacio para el QR.
// ---------------------------------------------------------------
const CUENTAS_PROFESIONAL_HONORIFICO = [
  {
    id: 'prof-mercantil',
    Icono: Smartphone,
    metodo: 'pago_movil',
    titulo: 'Pago Móvil Mercantil',
    subtitulo: 'Pago inmediato desde tu app bancaria',
    logo: LOGO_MERCANTIL,
    qr: true,
    qrImagen: QR_CARRISAN,
    qrNota: 'Toca para ampliar',
    campos: [
      { label: 'Banco', valor: 'Mercantil', copiar: '0105' },
      { label: 'Cédula', valor: 'V-5.073.225', copiar: '5073225' },
      { label: 'Teléfono', valor: '0416-6411160', copiar: '04166411160' },
    ],
    // Bloque de 3 líneas en ese orden exacto (así lo lee la app bancaria)
    copiarTodo: '0105\n5073225\n04166411160',
    etiquetaTodo: 'Copiar todos los datos',
  },
]

// ---------------------------------------------------------------
// Mapa por tipo de usuario → lista de cuentas que ve ese cliente.
// ---------------------------------------------------------------
export const CUENTAS_POR_TIPO = {
  institucional: CUENTAS_INSTITUCIONAL,
  profesional: CUENTAS_PROFESIONAL_HONORIFICO,
  honorifico: CUENTAS_PROFESIONAL_HONORIFICO,
}

// Predeterminado para tipos sin grupo definido (o sin sesión de tipo).
const CUENTAS_POR_DEFECTO = CUENTAS_PROFESIONAL_HONORIFICO

export function cuentasDe(tipoUsuario) {
  return CUENTAS_POR_TIPO[tipoUsuario] || CUENTAS_POR_DEFECTO
}
