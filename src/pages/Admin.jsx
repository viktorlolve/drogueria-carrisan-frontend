import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import DashboardAdmin from '../components/admin/DashboardAdmin'
import TasaCambio from '../components/admin/TasaCambio'
import OrdenesAdmin from '../components/admin/OrdenesAdmin'
import NuevaOrdenRapida from '../components/admin/NuevaOrdenRapida'
import ProductosAdmin from '../components/admin/ProductosAdmin'
import UsuariosAdmin from '../components/admin/UsuariosAdmin'
import EstadoCuentaAdmin from '../components/admin/EstadoCuentaAdmin'
import DescuentosPanel from '../components/admin/DescuentosAdmin'
import PagosAdmin from '../components/admin/PagosAdmin'
import CotizacionesAdmin from '../components/admin/CotizacionesAdmin'
import RequerimientosAdmin from '../components/admin/RequerimientosAdmin'
import DocumentosAdmin from '../components/admin/DocumentosAdmin'
import ChatAdmin from '../components/admin/ChatAdmin'
import PromocionesAdmin from '../components/admin/PromocionesAdmin'
import DeliveryAdmin from '../components/admin/DeliveryAdmin'
import LayoutPaginaPrincipal from '../components/paginas-principales/Layoutpaginaprincipal'
import { NAV_ADMIN } from '../components/paginas-principales/NavAdmin'
import MoleculasPanel from '../components/admin/MoleculasPanel'
import GestionCodigos from '../components/admin/GestionCodigos'
import MonitoreoAdmin from '../components/admin/MonitoreoAdmin'
import './Admin.css'


// ---------------------------------------------------------------
// Admin — migrado a <LayoutPaginaPrincipal> (mismo patrón que
// MisOrdenes/MiCuenta/EstadoCuenta) y ahora con sub-rutas reales de
// React Router en vez del switch + estado local (seccionActiva) que
// había antes. Cada sección es una URL real bajo /admin/* (ver
// App.jsx: la ruta pasó de "/admin" exacta a "/admin/*"):
//
//   /admin                    → Dashboard
//   /admin/ordenes             → Órdenes (Kanban/tabla/cards)
//   /admin/estado-cuenta       → Estado de cuenta
//   ...etc, ver NAV_ADMIN
//
// Esto significa: se puede compartir un link directo a una sección,
// sobrevive un F5, y el botón "atrás" del navegador vuelve a la
// sección anterior en vez de sacarte de /admin por completo.
//
// "activo" para resaltar el ítem de nav correcto se deriva de la URL
// actual (useLocation) en vez de leerse de un estado — el mismo id
// que usa NAV_ADMIN (dashboard, ordenes, etc.) se calcula acá abajo
// comparando pathname.
// ---------------------------------------------------------------

const TITULOS_SECCION = {
  dashboard: 'Dashboard',
  tasa: 'Tasa de cambio',
  ordenes: 'Órdenes',
  nuevaOrden: 'Nueva orden rápida',
  productos: 'Productos',
  descuentos: 'Descuentos',
  estadoCuenta: 'Estado de cuenta',
  pagos: 'Pagos',
  cotizaciones: 'Cotizaciones',
  requerimientos: 'Requerimientos',
  documentos: 'Documentos',
  usuarios: 'Usuarios',
  chat: 'Chat',
  promociones: 'Promociones',
  delivery: 'Delivery',
  moleculas: 'Moléculas',
  gestionCodigos: 'Gestionar códigos',
  monitoreo: 'Monitoreo',
}

// Mapea el segmento de la URL (después de /admin/) al id que ya usa
// NAV_ADMIN para sus items — así no hay que mantener dos listas de
// nombres de sección sincronizadas a mano.
const SEGMENTO_A_ID = {
  '': 'dashboard',
  tasa: 'tasa',
  ordenes: 'ordenes',
  'nueva-orden': 'nuevaOrden',
  productos: 'productos',
  descuentos: 'descuentos',
  'estado-cuenta': 'estadoCuenta',
  pagos: 'pagos',
  cotizaciones: 'cotizaciones',
  requerimientos: 'requerimientos',
  documentos: 'documentos',
  usuarios: 'usuarios',
  chat: 'chat',
  promociones: 'promociones',
  delivery: 'delivery',
  moleculas: 'moleculas',
  'gestion-codigos': 'gestionCodigos',
  monitoreo: 'monitoreo',
}

function Admin() {
  const location = useLocation()
  const navigate = useNavigate()

  const segmento = location.pathname.replace(/^\/admin\/?/, '')
  const seccionActiva = SEGMENTO_A_ID[segmento] || 'dashboard'

  return (
    <LayoutPaginaPrincipal
      activo={seccionActiva}
      titulo={TITULOS_SECCION[seccionActiva] || 'Admin'}
      nav={NAV_ADMIN}
    >
      <div className="admin-seccion">
        <Routes>
          <Route index element={<DashboardAdmin onIrA={(id) => navigate(rutaDeId(id))} />} />
          <Route path="tasa" element={<TasaCambio />} />
          <Route path="monitoreo" element={<MonitoreoAdmin />} />
          <Route path="ordenes" element={<OrdenesAdmin />} />
          <Route path="nueva-orden" element={<NuevaOrdenRapida />} />
          <Route path="productos" element={<ProductosAdmin />} />
          <Route path="moleculas" element={<MoleculasPanel />} />
          <Route path="descuentos" element={<DescuentosPanel />} />
          <Route path="estado-cuenta" element={<EstadoCuentaAdmin />} />
          <Route path="pagos" element={<PagosAdmin />} />
          <Route path="cotizaciones" element={<CotizacionesAdmin />} />
          <Route path="requerimientos" element={<RequerimientosAdmin />} />
          <Route path="documentos" element={<DocumentosAdmin />} />
          <Route path="usuarios" element={<UsuariosAdmin />} />
          <Route path="gestion-codigos" element={<GestionCodigos />} />
          <Route path="chat" element={<ChatAdmin />} />
          <Route path="promociones" element={<PromocionesAdmin />} />
          <Route path="delivery" element={<DeliveryAdmin />} />
        </Routes>
      </div>
    </LayoutPaginaPrincipal>
  )
}

// DashboardAdmin sigue usando su prop "onIrA(id)" para los accesos
// rápidos (ver KPIs, "Ver tablero →", etc.) — acá se traduce ese id
// a la ruta real y se navega, en vez de solo cambiar estado local.
function rutaDeId(id) {
  const segmento = Object.entries(SEGMENTO_A_ID).find(([, v]) => v === id)?.[0] ?? ''
  return `/admin/${segmento}`
}

export default Admin