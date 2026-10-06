import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Flex, Spinner } from '@chakra-ui/react'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { EnvioProvider } from './context/EnvioContext'
import { FavoritosProvider } from './context/FavoritosContext'
import { NavBadgesProvider } from './context/NavBadgesContext'
import { LoadingBarProvider, useLoadingBar } from './context/LoadingBarContext'
import { registerLoadingBar } from './api/axios'
import { StaffAuthProvider } from './context/StaffAuthContext'
import { StaffBadgesProvider } from './context/StaffBadgesContext'
import TopLoadingBar from './components/TopLoadingBar'
import Navbar from './components/Navbar'
import ScrollToTop from './components/ScrollToTop'
import ScrollToTopFloat from './components/ScrollToTopFloat'
import PrivateRoute from './components/PrivateRoute'
import ConSesionCatalogo from './components/ConSesionCatalogo'
import PrivateRouteSensible from './components/PrivateRouteSensible'
import PrivateRouteStaff from './components/PrivateRouteStaff'
import RequiereInvitacion from './components/registro/RequiereInvitacion'
import RootRedirect from './components/RootRedirect'
import { Toaster } from './components/ui/toaster'
import PwaScopeSwitcher from './components/PwaScopeSwitcher'
import ProtegerImagenes from './components/ProtegerImagenes'
import { STAFF_PAGINAS } from './pages/staff/STAFF_PAGINAS'
import { DEPARTAMENTOS, MODULOS } from './components/staff/NavStaff'

// Code-splitting por ruta: cada página se descarga al navegar a ella,
// no al arrancar. El chunk inicial queda con providers/layouts compartidos.
const Home = lazy(() => import('./pages/Home'))
const Catalogo = lazy(() => import('./pages/Catalogo'))
const RegistroInhrr = lazy(() => import('./pages/RegistroInhrr'))
const Vademecum = lazy(() => import('./pages/Vademecum'))
const Login = lazy(() => import('./pages/Login'))
const RecuperarPassword = lazy(() => import('./pages/Recuperarpassword'))
const Registro = lazy(() => import('./pages/RegistroConTipo'))
const RegistroInvita = lazy(() => import('./pages/RegistroInvita'))
const RegistroInstitucional = lazy(() => import('./pages/RegistroInstitucional'))
const RegistroProfesional = lazy(() => import('./pages/RegistroProfesional'))
const RegistroHonorifico = lazy(() => import('./pages/RegistroHonorifico'))
const Carrito = lazy(() => import('./pages/Carrito'))
const MisOrdenes = lazy(() => import('./pages/MisOrdenes'))
const Admin = lazy(() => import('./pages/Admin'))
const QuienesSomos = lazy(() => import('./pages/QuienesSomos'))
const Ayuda = lazy(() => import('./pages/Ayuda'))
const AyudaComoUsar = lazy(() => import('./pages/AyudaComoUsar'))
const Contacto = lazy(() => import('./pages/Contacto'))
const MiCuenta = lazy(() => import('./pages/MiCuenta'))
const MisItems = lazy(() => import('./pages/MisItems'))
const Notificaciones = lazy(() => import('./pages/Notificaciones'))
const Terminos = lazy(() => import('./pages/Terminos'))
const Privacidad = lazy(() => import('./pages/Privacidad'))
const TerminosComerciales = lazy(() => import('./pages/TerminosComerciales'))
const EstadoCuenta = lazy(() => import('./pages/EstadoCuenta'))
const ProductoDetalle = lazy(() => import('./pages/ProductoDetalle'))
const ListaDetalle = lazy(() => import('./pages/ListaDetalle'))
const Menu = lazy(() => import('./pages/Menu'))
const Ofertas = lazy(() => import('./pages/Ofertas'))
const LineaFarmacia = lazy(() => import('./pages/LineaFarmacia'))
const LineaHospitalaria = lazy(() => import('./pages/LineaHospitalaria'))
const OrdenDetalle = lazy(() => import('./pages/OrdenDetalle'))
const Direcciones = lazy(() => import('./pages/Direcciones'))
const Pagos = lazy(() => import('./pages/Pagos'))
const PagosEstadoCuenta = lazy(() => import('./pages/PagosEstadoCuenta'))
const FacturasEstadoCuenta = lazy(() => import('./pages/FacturasEstadoCuenta'))
const AmpliacionEstadoCuenta = lazy(() => import('./pages/AmpliacionEstadoCuenta'))
const ReportesEstadoCuenta = lazy(() => import('./pages/ReportesEstadoCuenta'))
const Cotizaciones = lazy(() => import('./pages/Cotizaciones'))
const Requerimientos = lazy(() => import('./pages/Requerimientos'))
const Documentos = lazy(() => import('./pages/Documentos'))
const ChatCentro = lazy(() => import('./pages/Chat'))
const SubUsuarios = lazy(() => import('./pages/SubUsuarios'))
const Presupuesto = lazy(() => import('./pages/Presupuesto'))
const Mantenimiento = lazy(() => import('./pages/Mantenimiento'))
const Noticias = lazy(() => import('./pages/Noticias'))
const VerificarDocumento = lazy(() => import('./pages/VerificarDocumento'))
const AnalyticsVentas = lazy(() => import('./components/admin/AnalyticsVentas'))
const StaffLogin = lazy(() => import('./pages/staff/StaffLogin'))
const StaffRegistro = lazy(() => import('./pages/staff/StaffRegistro'))
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard'))
const StaffDepartamento = lazy(() => import('./pages/staff/StaffDepartamento'))
const StaffModuloPlaceholder = lazy(() => import('./pages/staff/StaffModuloPlaceholder'))
const StaffClienteFicha = lazy(() => import('./pages/staff/StaffClienteFicha'))
const StaffNotificaciones = lazy(() => import('./pages/staff/StaffNotificaciones'))

function PageLoading() {
  return (
    <Flex align="center" justify="center" minHeight="60vh">
      <Spinner thickness="4px" color="#1B4B8F" size="lg" />
    </Flex>
  )
}

function LoadingBarBridge() {
  const bar = useLoadingBar()
  useEffect(() => { registerLoadingBar(bar) }, [bar])
  return <TopLoadingBar />
}

// ---------------------------------------------------------------
// Rutas staff generadas desde la fuente única de verdad
// (DEPARTAMENTOS + MODULOS en NavStaff.js):
//   - Hub de cada departamento: /staff/<depto.id>
//   - Página de cada módulo: /staff/<item.to> con el guard de su
//     rol (item.roles). Si el módulo no tiene página registrada en
//     STAFF_PAGINAS, cae en StaffModuloPlaceholder ("en construcción").
// Agregar un módulo nuevo = agregarlo a MODULOS (+STAFF_PAGINAS si
// tiene página real). Nada más que cambiar aquí.
// ---------------------------------------------------------------
function RutasStaff() {
  const rutas = []
  for (const depto of DEPARTAMENTOS) {
    rutas.push(
      <Route
        key={`hub-${depto.id}`}
        path={`/staff/${depto.id}`}
        element={<PrivateRouteStaff><StaffDepartamento departamento={depto.id} /></PrivateRouteStaff>}
      />
    )
  }
  for (const [deptoId, grupos] of Object.entries(MODULOS)) {
    for (const grupo of grupos) {
      for (const item of grupo.items) {
        const Pagina = STAFF_PAGINAS[item.id] || StaffModuloPlaceholder
        rutas.push(
          <Route
            key={`${deptoId}-${item.id}`}
            path={item.to}
            element={
              <PrivateRouteStaff rolesPermitidos={item.roles}>
                <Pagina departamento={deptoId} activo={item.id} titulo={item.texto} descripcion={item.desc} />
              </PrivateRouteStaff>
            }
          />
        )
      }
    }
  }
  // Ruta manual: ficha de cliente (sub-ruta de /staff/clientes, no generada por MODULOS)
  rutas.push(
    <Route
      key="clientes-ficha"
      path="/staff/clientes/:id"
      element={
        <PrivateRouteStaff rolesPermitidos={['vendedor', 'administrador', 'director', 'admin']}>
          <StaffClienteFicha />
        </PrivateRouteStaff>
      }
    />
  )
  // Ruta manual: bandeja de notificaciones del staff. Transversal a los
  // 7 roles y accedida desde la campana del StaffNavbar ("Ver todas");
  // el item de sidebar se quitó el 2026-10-06, así que ya no se genera
  // desde MODULOS.
  rutas.push(
    <Route
      key="staff-notificaciones"
      path="/staff/notificaciones"
      element={
        <PrivateRouteStaff>
          <StaffNotificaciones />
        </PrivateRouteStaff>
      }
    />
  )
  return rutas
}

function App() {
  return (
  <AuthProvider>
    <StaffAuthProvider>
      <StaffBadgesProvider>
        <NavBadgesProvider>
          <CartProvider>
            <FavoritosProvider>
              <EnvioProvider>
                <ScrollToTop />
                <LoadingBarProvider>
                  <PwaScopeSwitcher />
                  <ProtegerImagenes />
                  <Navbar />
                  <ScrollToTopFloat />
                  <LoadingBarBridge />
                  <Toaster />
                  <Suspense fallback={<PageLoading />}>
                    <Routes>
                      <Route path="/" element={<RootRedirect />} />
                      <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
                      <Route path="/catalogo" element={<ConSesionCatalogo><Catalogo /></ConSesionCatalogo>} />
                      <Route path="/registro-inhrr" element={<RegistroInhrr />} />
                      <Route path="/vademecum" element={<Vademecum />} />
                      <Route path="/vademecum/:id" element={<Vademecum />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/recuperar" element={<RecuperarPassword />} />
                      <Route path="/registro" element={<Registro />} />
                      <Route path="/registro/invita" element={<RegistroInvita />} />
                      <Route path="/registro/finalizar" element={<Registro />} />
                      <Route path="/registro/institucional" element={<RegistroInstitucional />} />
                      <Route path="/registro/profesional" element={<RequiereInvitacion><RegistroProfesional /></RequiereInvitacion>} />
                      <Route path="/registro/honorifico" element={<RequiereInvitacion><RegistroHonorifico /></RequiereInvitacion>} />
                      <Route path="/carrito" element={<PrivateRoute><Carrito /></PrivateRoute>} />
                      <Route path="/orders" element={<PrivateRoute><MisOrdenes /></PrivateRoute>} />
                      <Route path="/orders/:id" element={<PrivateRoute><OrdenDetalle /></PrivateRoute>} />
                      <Route path="/pagos" element={<PrivateRouteSensible><Pagos /></PrivateRouteSensible>} />
                      <Route path="/admin/*" element={<PrivateRoute adminOnly><Admin /></PrivateRoute>} />
                      <Route path="/staff/login" element={<StaffLogin />} />
                      <Route path="/staff/registro" element={<StaffRegistro />} />
                      <Route path="/staff/dashboard" element={<PrivateRouteStaff><StaffDashboard /></PrivateRouteStaff>} />
                      {RutasStaff()}
                      <Route path="/quienes-somos" element={<QuienesSomos />} />
                      <Route path="/ayuda" element={<Ayuda />} />
      <Route path="/ayuda/como-usar" element={<AyudaComoUsar />} />
                      <Route path="/contacto" element={<Contacto />} />
                      <Route path="/cuenta" element={<PrivateRoute><MiCuenta /></PrivateRoute>} />
                      <Route path="/mis-items" element={<PrivateRoute><MisItems /></PrivateRoute>} />
                      <Route path="/notificaciones" element={<PrivateRoute><Notificaciones /></PrivateRoute>} />
                      <Route path="/terminos" element={<Terminos />} />
                      <Route path="/privacidad" element={<Privacidad />} />
                      <Route path="/terminoscomerciales" element={<TerminosComerciales />} />
                      <Route path="/mantenimiento" element={<Mantenimiento />} />
                      <Route path="/noticias" element={<Noticias />} />
                      {/* Pública a propósito: la abre quien escanea el QR de un papel, sin sesión. */}
                      <Route path="/verificar/:tipo/:id" element={<VerificarDocumento />} />
                      <Route path="/estado-de-cuenta" element={<PrivateRouteSensible><EstadoCuenta /></PrivateRouteSensible>} />
                      <Route path="/producto/:id" element={<ConSesionCatalogo><ProductoDetalle /></ConSesionCatalogo>} />
                      <Route path="/listas/:id" element={<PrivateRoute><ListaDetalle /></PrivateRoute>} />
                      <Route path="/menu" element={<PrivateRoute><Menu /></PrivateRoute>} />
                      <Route path="/ofertas" element={<PrivateRoute><Ofertas /></PrivateRoute>} />
                      <Route path="/farmacia" element={<PrivateRoute><LineaFarmacia /></PrivateRoute>} />
                      <Route path="/hospitalaria" element={<PrivateRoute><LineaHospitalaria /></PrivateRoute>} />
                      <Route path="/direcciones" element={<PrivateRoute><Direcciones /></PrivateRoute>} />
                      <Route path="/estado-de-cuenta/pagos" element={<PrivateRouteSensible><PagosEstadoCuenta /></PrivateRouteSensible>} />
                      <Route path="/estado-de-cuenta/facturas" element={<PrivateRouteSensible><FacturasEstadoCuenta /></PrivateRouteSensible>} />
                      <Route path="/estado-de-cuenta/reportes" element={<PrivateRouteSensible><ReportesEstadoCuenta /></PrivateRouteSensible>} />
                      <Route path="/estado-de-cuenta/ampliacion" element={<PrivateRouteSensible><AmpliacionEstadoCuenta /></PrivateRouteSensible>} />
                      <Route path="/mis-solicitudes/cotizaciones" element={<PrivateRoute><Cotizaciones /></PrivateRoute>} />
                      <Route path="/mis-solicitudes/requerimientos" element={<PrivateRoute><Requerimientos /></PrivateRoute>} />
                      <Route path="/mis-solicitudes/documentos" element={<PrivateRoute><Documentos /></PrivateRoute>} />
                      <Route path="/chat" element={<ChatCentro />} />
                      <Route path="/chat/orden/:ordenId" element={<ChatCentro />} />
                      <Route path="/subusuarios" element={<SubUsuarios />} />
                      <Route path="/presupuesto" element={<Presupuesto />} />
                      <Route path="/analytics" element={<PrivateRoute adminOnly><AnalyticsVentas /></PrivateRoute>} />
                    </Routes>
                  </Suspense>
                </LoadingBarProvider>
              </EnvioProvider>
            </FavoritosProvider>
          </CartProvider>
        </NavBadgesProvider>
      </StaffBadgesProvider>
    </StaffAuthProvider>
  </AuthProvider>
  )
}

export default App