import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  InputGroup,
  SimpleGrid,
  HStack,
  Spinner,
  Button,
  Badge,
  Table,
  Menu,
  Portal,
  Icon,
  IconButton,
} from '@chakra-ui/react'
import {
  Users,
  UserCheck,
  ShieldCheck,
  Bike,
  Search,
  RefreshCcw,
  ShoppingCart,
  Plus,
  MoreVertical,
  Pencil,
  Wallet,
  Percent,
  Trash2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
} from 'lucide-react'
import api from '../../api/axios'
import UsuarioForm from './UsuarioForm'
import DescuentoModal from './DescuentoModal'
import EstadoCuentaDetalle from './EstadoCuentaDetalle'
import NuevaOrdenModal from './NuevaOrdenModal'
import { toaster } from '../ui/toaster'

const AZUL = '#0052DC'
const INDIGO = '#1A1A3A'
const ITEMS_POR_PAGINA = 10

// Etiquetas conocidas hasta ahora — el sistema acepta cualquier texto libre,
// esto solo alimenta el filtro y el datalist de sugerencias del formulario.
const ETIQUETAS_SUGERIDAS = ['admin', 'distribuidor', 'cliente']

function iniciales(nombre) {
  return (nombre?.trim()?.[0] || 'U').toUpperCase()
}

function colorEtiqueta(etiqueta) {
  const mapa = { admin: 'purple', distribuidor: 'blue', cliente: 'gray' }
  return mapa[etiqueta] || 'teal'
}

function AvatarCirculo({ nombre, size = '36px' }) {
  return (
    <Flex align="center" justify="center" w={size} h={size} minW={size} borderRadius="full" bg={INDIGO} color="white" fontWeight="600" fontSize="sm">
      {iniciales(nombre)}
    </Flex>
  )
}

function BarraCredito({ usado, total }) {
  if (!total || total <= 0) return <Text fontSize="xs" color="gray.400">Sin línea asignada</Text>
  const porcentaje = Math.min(100, (Number(usado) / Number(total)) * 100)
  return (
    <Box minW="90px">
      <Box h="6px" bg="green.100" borderRadius="full" overflow="hidden">
        <Box h="100%" w={`${porcentaje}%`} bg={porcentaje >= 90 ? 'red.400' : porcentaje >= 60 ? 'orange.400' : 'green.400'} />
      </Box>
      <Text fontSize="xs" color="gray.500" mt={1}>{porcentaje.toFixed(0)}% usado</Text>
    </Box>
  )
}

function StatCard({ icon, label, value, color = INDIGO }) {
  return (
    <Box bg="white" borderRadius="xl" p={4} boxShadow="0 1px 3px rgba(26,26,58,0.08)" border="1px solid" borderColor="gray.100">
      <HStack gap={3}>
        <Flex align="center" justify="center" w="40px" h="40px" borderRadius="lg" bg={`${color}15`}>
          <Icon as={icon} boxSize={5} color={color} />
        </Flex>
        <Box>
          <Text fontSize="xl" fontWeight="700" color={INDIGO} lineHeight="1.1">{value}</Text>
          <Text fontSize="xs" color="gray.500">{label}</Text>
        </Box>
      </HStack>
    </Box>
  )
}

function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [paginaActual, setPaginaActual] = useState(1)

  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null)
  const [usuarioDescuento, setUsuarioDescuento] = useState(null)
  const [usuarioCredito, setUsuarioCredito] = useState(null)
  const [usuarioOrden, setUsuarioOrden] = useState(null)

  useEffect(() => { cargarUsuarios() }, [])

  async function cargarUsuarios() {
    try {
      setCargando(true)
      setError('')
      const { data } = await api.get('/users')
      setUsuarios(data)
    } catch (err) {
      setError('No se pudieron cargar los usuarios')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  function abrirNuevo() {
    setUsuarioEnEdicion(null)
    setMostrarForm(true)
  }

  function abrirEdicion(usuario) {
    setUsuarioEnEdicion(usuario)
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setUsuarioEnEdicion(null)
  }

  async function handleGuardado() {
    cerrarForm()
    toaster.create({ title: 'Usuario guardado', type: 'success' })
    await cargarUsuarios()
  }

  async function handleEliminarUsuario(id) {
    try {
      await api.delete(`/users/${id}`)
      setUsuarios((prev) => prev.filter((u) => u.id !== id))
      setUsuarioAEliminar(null)
      toaster.create({ title: 'Usuario eliminado', type: 'success' })
    } catch (err) {
      toaster.create({ title: 'No se pudo eliminar el usuario', type: 'error' })
      console.error(err)
    }
  }

  async function handleToggleActivo(usuario) {
    try {
      await api.patch(`/users/${usuario.id}`, { activo: !usuario.activo })
      setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, activo: !u.activo } : u)))
    } catch (err) {
      toaster.create({ title: 'No se pudo cambiar el estado', type: 'error' })
      console.error(err)
    }
  }

  async function handleSolicitarReinicio(usuario) {
    try {
      await api.post(`/users/${usuario.id}/solicitar-reinicio`)
      toaster.create({
        title: 'Reinicio autorizado',
        description: `${usuario.nombre || usuario.email} ya puede cambiar su contraseña en /recuperar`,
        type: 'success',
      })
    } catch (err) {
      toaster.create({ title: 'No se pudo autorizar el reinicio', type: 'error' })
      console.error(err)
    }
  }

  const etiquetasDisponibles = useMemo(() => {
    const desdeDatos = usuarios.map((u) => u.etiqueta).filter(Boolean)
    return [...new Set([...ETIQUETAS_SUGERIDAS, ...desdeDatos])]
  }, [usuarios])

  const usuariosFiltrados = useMemo(() => {
    let resultado = [...usuarios]
    if (busqueda) {
      const texto = busqueda.toLowerCase()
      resultado = resultado.filter(
        (u) =>
          u.nombre?.toLowerCase().includes(texto) ||
          u.email?.toLowerCase().includes(texto) ||
          u.rif_cedula?.toLowerCase().includes(texto) ||
          u.telefono?.toLowerCase().includes(texto)
      )
    }
    if (filtroEtiqueta !== 'todos') {
      resultado = resultado.filter((u) => u.etiqueta === filtroEtiqueta)
    }
    if (filtroEstado !== 'todos') {
      const activo = filtroEstado === 'activo'
      resultado = resultado.filter((u) => (u.activo !== false) === activo)
    }
    resultado.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    return resultado
  }, [usuarios, busqueda, filtroEtiqueta, filtroEstado])

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / ITEMS_POR_PAGINA))
  const usuariosPaginados = usuariosFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )

  const stats = useMemo(() => ({
    total: usuarios.length,
    activos: usuarios.filter((u) => u.activo !== false).length,
    admins: usuarios.filter((u) => u.es_admin).length,
    deliveryGratis: usuarios.filter((u) => u.delivery_gratis).length,
  }), [usuarios])

  if (cargando) {
    return (
      <Flex direction="column" align="center" justify="center" minH="60vh" gap={3}>
        <Spinner size="xl" color={AZUL} borderWidth="3px" />
        <Text color="gray.500">Cargando usuarios...</Text>
      </Flex>
    )
  }

  if (error) {
    return (
      <Flex direction="column" align="center" justify="center" minH="60vh" gap={3}>
        <Text color="red.500">{error}</Text>
        <Button onClick={cargarUsuarios} colorPalette="blue">
          <RefreshCcw size={16} />
          Reintentar
        </Button>
      </Flex>
    )
  }

  return (
    <Box bg="gray.50" minH="100vh" p={{ base: 4, md: 6 }}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Box>
          <Heading size="lg" color={INDIGO}>Usuarios</Heading>
          <Text color="gray.500" fontSize="sm">Gestión de clientes, distribuidores y administradores</Text>
        </Box>
        <HStack gap={2}>
          <Button variant="ghost" onClick={cargarUsuarios} color={AZUL}>
            <RefreshCcw size={16} />
          </Button>
          <Button bg={AZUL} color="white" _hover={{ bg: '#0041B0' }} onClick={abrirNuevo}>
            <Plus size={16} />
            Nuevo usuario
          </Button>
        </HStack>
      </Flex>

      {/* Estadísticas */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={6}>
        <StatCard icon={Users} label="Total usuarios" value={stats.total} />
        <StatCard icon={UserCheck} label="Activos" value={stats.activos} color="green.500" />
        <StatCard icon={ShieldCheck} label="Administradores" value={stats.admins} color="purple.500" />
        <StatCard icon={Bike} label="Delivery gratis" value={stats.deliveryGratis} color="orange.500" />
      </SimpleGrid>

      {/* Toolbar */}
      <Flex
        bg="white"
        borderRadius="xl"
        p={3}
        mb={4}
        boxShadow="0 1px 3px rgba(26,26,58,0.08)"
        border="1px solid"
        borderColor="gray.100"
        gap={3}
        wrap="wrap"
        align="center"
      >
        <InputGroup maxW="320px" startElement={<Search size={16} color="#9CA3AF" />}>
          <Input
            placeholder="Buscar por nombre, email, RIF o teléfono..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1) }}
            borderRadius="lg"
          />
        </InputGroup>

        <Box as="select" value={filtroEtiqueta} onChange={(e) => { setFiltroEtiqueta(e.target.value); setPaginaActual(1) }}
          maxW="200px" borderRadius="lg" border="1px solid" borderColor="gray.200" px={3} py={2} fontSize="sm" bg="white">
          <option value="todos">Todas las etiquetas</option>
          {etiquetasDisponibles.map((etq) => (
            <option key={etq} value={etq}>{etq}</option>
          ))}
        </Box>

        <Box as="select" value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1) }}
          maxW="180px" borderRadius="lg" border="1px solid" borderColor="gray.200" px={3} py={2} fontSize="sm" bg="white">
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </Box>
      </Flex>

      <Text fontSize="sm" color="gray.500" mb={3}>
        Mostrando {usuariosPaginados.length} de {usuariosFiltrados.length} usuarios
      </Text>

      {/* Tabla */}
      <Box bg="white" borderRadius="xl" overflow="hidden" border="1px solid" borderColor="gray.100" boxShadow="0 1px 3px rgba(26,26,58,0.08)">
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header bg="gray.50">
              <Table.Row borderBottom="1px solid" borderColor="gray.100">
                <Table.ColumnHeader px={4} py={3}>Usuario</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>RIF/Cédula</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Etiqueta</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Teléfono</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Crédito</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Estado</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end" px={4} py={3}>Acciones</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {usuariosPaginados.length === 0 ? (
                <Table.Row borderBottom="1px solid" borderColor="gray.100">
                  <Table.Cell colSpan={7} px={4} py={3}>
                    <Text py={8} textAlign="center" color="gray.400">No se encontraron usuarios</Text>
                  </Table.Cell>
                </Table.Row>
              ) : (
                usuariosPaginados.map((usuario) => (
                  <Table.Row key={usuario.id} opacity={usuario.activo === false ? 0.55 : 1} borderBottom="1px solid" borderColor="gray.100">
                    <Table.Cell px={4} py={3}>
                      <HStack gap={3}>
                        <AvatarCirculo nombre={usuario.nombre} />
                        <Box>
                          <HStack gap={2}>
                            <Text fontWeight="600" color={INDIGO}>{usuario.nombre || 'Sin nombre'}</Text>
                            {usuario.es_admin && <Badge colorPalette="purple" size="sm">Admin</Badge>}
                          </HStack>
                          <Text fontSize="xs" color="gray.500">{usuario.email}</Text>
                        </Box>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>{usuario.rif_cedula || '—'}</Table.Cell>
                    <Table.Cell px={4} py={3}>
                      <Badge colorPalette={colorEtiqueta(usuario.etiqueta)} borderRadius="full" textTransform="capitalize">
                        {usuario.etiqueta || 'cliente'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>{usuario.telefono || '—'}</Table.Cell>
                    <Table.Cell px={4} py={3}>
                      <Text fontWeight="600" color={INDIGO} fontSize="sm">${Number(usuario.linea_credito || 0).toFixed(2)}</Text>
                      <BarraCredito usado={usuario.deuda_actual || 0} total={usuario.linea_credito} />
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>
                      <Button size="xs" variant="outline" colorPalette={usuario.activo !== false ? 'green' : 'gray'} onClick={() => handleToggleActivo(usuario)}>
                        {usuario.activo !== false ? 'Activo' : 'Inactivo'}
                      </Button>
                    </Table.Cell>
                    <Table.Cell textAlign="end" px={4} py={3}>
                      <Menu.Root>
                        <Menu.Trigger asChild>
                          <IconButton variant="ghost" size="sm" aria-label="Acciones">
                            <MoreVertical size={16} />
                          </IconButton>
                        </Menu.Trigger>
                        <Portal>
                          <Menu.Positioner>
                            <Menu.Content>
                              <Menu.Item value="editar" onClick={() => abrirEdicion(usuario)}>
                                <Pencil size={14} style={{ marginRight: 8 }} /> Editar datos
                              </Menu.Item>
                              <Menu.Item value="credito" onClick={() => setUsuarioCredito(usuario)}>
                                <Wallet size={14} style={{ marginRight: 8 }} /> Línea de crédito
                              </Menu.Item>
                              <Menu.Item value="nueva-orden" onClick={() => setUsuarioOrden(usuario)}>
                                <ShoppingCart size={14} style={{ marginRight: 8 }} /> Nueva orden
                              </Menu.Item>
                              <Menu.Item value="descuento" onClick={() => setUsuarioDescuento(usuario)}>
                                <Percent size={14} style={{ marginRight: 8 }} /> Descuento
                              </Menu.Item>
                              <Menu.Item value="reinicio-clave" onClick={() => handleSolicitarReinicio(usuario)}>
                                <KeyRound size={14} style={{ marginRight: 8 }} /> Autorizar reinicio de clave
                              </Menu.Item>
                              <Menu.Item value="eliminar" color="red.500" onClick={() => setUsuarioAEliminar(usuario)}>
                                <Trash2 size={14} style={{ marginRight: 8 }} /> Eliminar
                              </Menu.Item>
                            </Menu.Content>
                          </Menu.Positioner>
                        </Portal>
                      </Menu.Root>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <HStack justify="center" mt={5} gap={2}>
          <IconButton size="sm" variant="outline" disabled={paginaActual === 1} onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={16} />
          </IconButton>
          <Text fontSize="sm" color="gray.500">Página {paginaActual} de {totalPaginas}</Text>
          <IconButton size="sm" variant="outline" disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}>
            <ChevronRight size={16} />
          </IconButton>
        </HStack>
      )}

      {/* Modal formulario (crear/editar) */}
      {mostrarForm && (
        <UsuarioForm
          usuario={usuarioEnEdicion}
          etiquetasSugeridas={etiquetasDisponibles}
          isOpen={mostrarForm}
          onClose={cerrarForm}
          onGuardado={handleGuardado}
        />
      )}

      {/* Modal de descuento */}
      {usuarioDescuento && (
        <DescuentoModal
          usuario={usuarioDescuento}
          isOpen={Boolean(usuarioDescuento)}
          onClose={() => setUsuarioDescuento(null)}
          onGuardado={cargarUsuarios}
        />
      )}

      {/* Resumen financiero / línea de crédito — reutiliza el mismo panel de Estado de Cuenta */}
      <EstadoCuentaDetalle
        clienteId={usuarioCredito?.id || null}
        isOpen={Boolean(usuarioCredito)}
        onClose={() => { setUsuarioCredito(null); cargarUsuarios() }}
      />

      {/* Nueva orden para un cliente ya definido desde esta lista */}
      <NuevaOrdenModal
        usuarioId={usuarioOrden?.id || null}
        nombreUsuario={usuarioOrden?.nombre}
        isOpen={Boolean(usuarioOrden)}
        onClose={() => setUsuarioOrden(null)}
        onCreada={cargarUsuarios}
      />

      {/* Confirmar eliminación */}
      {usuarioAEliminar && (
        <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={1400} display="flex" alignItems="center" justifyContent="center" onClick={() => setUsuarioAEliminar(null)}>
          <Box bg="white" borderRadius="xl" p={6} maxW="400px" w="90%" onClick={(e) => e.stopPropagation()}>
            <Heading size="md" color={INDIGO} mb={2}>Eliminar usuario</Heading>
            <Text fontSize="sm" color="gray.600" mb={1}>
              ¿Estás seguro de eliminar a <strong>{usuarioAEliminar.nombre || usuarioAEliminar.email}</strong>?
            </Text>
            <Text fontSize="xs" color="red.500" mb={4}>
              Esta acción no se puede deshacer. Se eliminarán sus órdenes y datos asociados.
            </Text>
            <HStack justify="end" gap={3}>
              <Button variant="ghost" onClick={() => setUsuarioAEliminar(null)}>Cancelar</Button>
              <Button colorPalette="red" onClick={() => handleEliminarUsuario(usuarioAEliminar.id)}>Eliminar</Button>
            </HStack>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default UsuariosAdmin
