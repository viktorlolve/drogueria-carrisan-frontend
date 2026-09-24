// ---------------------------------------------------------------
// Mapa id-de-módulo → componente de página para las páginas de
// trabajo del staff. Las rutas se generan desde MODULOS (NavStaff.js)
// y consultan ESTE mapa; si un módulo no está aquí, su ruta cae en
// StaffModuloPlaceholder ("en construcción") automáticamente.
//
// Agregar un módulo nuevo:
//   1. item en MODULOS (NavStaff.js) con su `to`, `icono`, `roles`
//   2. si ya tiene página real → registrala aquí
//   3. (la tarjeta del hub, el sidebar y la ruta aparecen solos)
//
// Code-splitting: cada página staff se descarga al navegar a ella
// (lazy), no en el chunk inicial.
// ---------------------------------------------------------------
import { lazy } from 'react'

const StaffPedidos = lazy(() => import('./StaffPedidos'))
const StaffEnvios = lazy(() => import('./StaffEnvios'))
const StaffOrdenes = lazy(() => import('./StaffOrdenes'))
const StaffSolicitudes = lazy(() => import('./StaffSolicitudes'))
const StaffPresupuestos = lazy(() => import('./StaffPresupuestos'))
const StaffFacturacion = lazy(() => import('./StaffFacturacion'))
const StaffCuentasPorCobrar = lazy(() => import('./StaffCuentasPorCobrar'))
const StaffOrdenesPorCancelar = lazy(() => import('./StaffOrdenesPorCancelar'))
const StaffPromociones = lazy(() => import('./StaffPromociones'))
const StaffPrecios = lazy(() => import('./StaffPrecios'))
const StaffDirecciones = lazy(() => import('./StaffDirecciones'))
const StaffCredito = lazy(() => import('./StaffCredito'))
const StaffTesoreria = lazy(() => import('./StaffTesoreria'))
const StaffReportesFinancieros = lazy(() => import('./StaffReportesFinancieros'))
const StaffClientes = lazy(() => import('./StaffClientes'))
const StaffChat = lazy(() => import('./StaffChat'))
const StaffCupones = lazy(() => import('./StaffCupones'))
const StaffVitrina = lazy(() => import('./StaffVitrina'))

export const STAFF_PAGINAS = {
  pedidos: StaffPedidos,
  envios: StaffEnvios,
  ordenes: StaffOrdenes,
  ventas: StaffFacturacion,
  'cuentas-por-cobrar': StaffCuentasPorCobrar,
  'ordenes-por-cancelar': StaffOrdenesPorCancelar,
  solicitudes: StaffSolicitudes,
  presupuestos: StaffPresupuestos,
  promociones: StaffPromociones,
  precios: StaffPrecios,
  direcciones: StaffDirecciones,
  credito: StaffCredito,
  tesoreria: StaffTesoreria,
  'reportes-financieros': StaffReportesFinancieros,
  clientes: StaffClientes,
  chat: StaffChat,
  cupones: StaffCupones,
  vitrina: StaffVitrina,
}