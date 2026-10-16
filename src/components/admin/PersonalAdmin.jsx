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
  UserX,
  Search,
  RefreshCcw,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'
import api from '../../api/axios'
import { toaster } from '../ui/toaster'
import { ROLES_STAFF, ETIQUETA_ROL } from '../../utils/rolesStaff.js'
import { validarEmail, validarPassword } from '../../utils/validadores.js'

const AZUL = '#0052DC'
const INDIGO = '#1A1A3A'
const ITEMS_POR_PAGINA = 10

// Color de badge por rol de staff (mismos 7 roles del backend).
const COLOR_ROL = {
  vendedor: 'blue',
  despachador: 'orange',
  almacenista: 'yellow',
  contabilidad: 'green',
  administrador: 'purple',
  director: 'purple',
  admin: 'red',
}

function iniciales(nombre) {
  return (nombre || '?').trim().charAt(0).toUpperCase() || '?'
}

function AvatarIniciales({ nombre }) {
  return (
    <Flex
      align="center"
      justify="center"
      boxSize="34px"
      borderRadius="full"
      bg={`${INDIGO}12`}
      color={INDIGO}
      fontSize="sm"
      fontWeight="700"
      flexShrink={0}
    >
      {iniciales(nombre)}
    </Flex>
  )
}

function StatCard({ icon, label, value, color = INDIGO }) {
  return (
    <Box bg="white" borderRadius="xl" p={4} boxShadow="0 1px 3px rgba(26,26,58,0.08)" border="1px solid" borderColor="gray.100">
      <HStack gap={3}>
        <Flex align="center" justify="center" w="40px" h="40px" borderRadius="lg" bg={`${color}15`}>
          <Icon as={icon} boxSize={5} color={color} />
        </Flex>
        <Box minW={0}>
          <Text fontSize="xl" fontWeight="700" color={INDIGO} lineHeight="1.1">{value}</Text>
          <Text fontSize="xs" color="gray.500" lineClamp={1}>{label}</Text>
        </Box>
      </HStack>
    </Box>
  )
}

const estiloSelect = {
  borderRadius: 'lg',
  borderWidth: '1px',
  borderColor: 'gray.200',
  bg: 'white',
  px: 3,
  py: 2,
  fontSize: 'sm',
}

// ---------------------------------------------------------------
// Formulario de creación / edición de una cuenta de staff.
// Al crear pide contraseña (validarPassword); al editar, no.
// ---------------------------------------------------------------
function PersonalForm({ persona, onClose, onGuardado }) {
  const esEdicion = Boolean(persona)

  const [nombre, setNombre] = useState(persona?.nombre || '')
  const [email, setEmail] = useState(persona?.email || '')
  const [rol, setRol] = useState(persona?.rol || 'vendedor')
  const [password, setPassword] = useState('')
  const [activo, setActivo] = useState(persona?.activo !== false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    setError('')

    const nombreLimpio = nombre.trim()
    const emailLimpio = email.trim().toLowerCase()

    if (!nombreLimpio) {
      setError('El nombre es requerido')
      return
    }
    if (!validarEmail(emailLimpio)) {
      setError('Ingresa un email válido')
      return
    }
    if (!esEdicion) {
      const { valido, error: errPass } = validarPassword(password)
      if (!valido) {
        setError(errPass)
        return
      }
    }

    const payload = { nombre: nombreLimpio, email: emailLimpio, rol }
    if (esEdicion) payload.activo = activo
    else payload.password = password

    setGuardando(true)
    try {
      if (esEdicion) await api.put(`/admin/staff/${persona.id}`, payload)
      else await api.post('/admin/staff', payload)
      onGuardado()
    } catch (err) {
      // 409 = email duplicado / protección de rol / último admin, etc.
      setError(err?.response?.data?.error || 'No se pudo guardar la cuenta')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Box
      position="fixed"
      inset={0}
      bg="blackAlpha.600"
      zIndex={1400}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      onClick={onClose}
    >
      <Box bg="white" borderRadius="xl" p={6} maxW="440px" w="100%" onClick={(e) => e.stopPropagation()}>
        <Heading size="md" color={INDIGO} mb={4}>
          {esEdicion ? 'Editar cuenta' : 'Nueva cuenta de personal'}
        </Heading>

        {error && (
          <Box bg="red.50" color="red.600" fontSize="sm" p={3} borderRadius="md" mb={4}>{error}</Box>
        )}

        <Box mb={3}>
          <Text fontSize="sm" fontWeight="600" color={INDIGO} mb={1}>Nombre</Text>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" borderRadius="lg" />
        </Box>

        <Box mb={3}>
          <Text fontSize="sm" fontWeight="600" color={INDIGO} mb={1}>Email</Text>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@drogueriacarrisan.com" borderRadius="lg" />
        </Box>

        <Box mb={3}>
          <Text fontSize="sm" fontWeight="600" color={INDIGO} mb={1}>Rol</Text>
          <Box as="select" value={rol} onChange={(e) => setRol(e.target.value)} w="100%" {...estiloSelect}>
            {ROLES_STAFF.map((r) => (
              <option key={r} value={r}>{ETIQUETA_ROL[r] || r}</option>
            ))}
          </Box>
        </Box>

        {!esEdicion && (
          <Box mb={3}>
            <Text fontSize="sm" fontWeight="600" color={INDIGO} mb={1}>Contraseña</Text>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres, 1 letra y 1 número"
              borderRadius="lg"
            />
          </Box>
        )}

        {esEdicion && (
          <Flex as="label" align="center" gap={3} p={3} border="1px solid" borderColor="gray.100" borderRadius="lg" cursor="pointer" mb={3}>
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            <Box>
              <Text fontSize="sm" fontWeight="600" color={INDIGO}>Cuenta activa</Text>
              <Text fontSize="xs" color="gray.500">Las cuentas inactivas no pueden iniciar sesión</Text>
            </Box>
          </Flex>
        )}

        <HStack justify="end" gap={3} mt={4}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button bg={AZUL} color="white" _hover={{ bg: '#0041B0' }} loading={guardando} onClick={guardar}>
            {esEdicion ? 'Guardar cambios' : 'Crear cuenta'}
          </Button>
        </HStack>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------
// Modal para cambiar la contraseña de una cuenta.
// ---------------------------------------------------------------
function CambiarPassword({ persona, onClose, onGuardado }) {
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    setError('')
    const { valido, error: errPass } = validarPassword(password)
    if (!valido) {
      setError(errPass)
      return
    }
    setGuardando(true)
    try {
      await api.patch(`/admin/staff/${persona.id}/password`, { password })
      onGuardado()
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo cambiar la contraseña')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Box
      position="fixed"
      inset={0}
      bg="blackAlpha.600"
      zIndex={1400}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      onClick={onClose}
    >
      <Box bg="white" borderRadius="xl" p={6} maxW="420px" w="100%" onClick={(e) => e.stopPropagation()}>
        <Heading size="md" color={INDIGO} mb={2}>Cambiar contraseña</Heading>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Nueva contraseña para <strong>{persona.nombre || persona.email}</strong>. Se revocarán sus sesiones abiertas.
        </Text>

        {error && (
          <Box bg="red.50" color="red.600" fontSize="sm" p={3} borderRadius="md" mb={4}>{error}</Box>
        )}

        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres, 1 letra y 1 número"
          borderRadius="lg"
          autoFocus
        />

        <HStack justify="end" gap={3} mt={4}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button bg={AZUL} color="white" _hover={{ bg: '#0041B0' }} loading={guardando} onClick={guardar}>
            Cambiar contraseña
          </Button>
        </HStack>
      </Box>
    </Box>
  )
}

function PersonalAdmin() {
  const [staff, setStaff] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [paginaActual, setPaginaActual] = useState(1)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [staffEnEdicion, setStaffEnEdicion] = useState(null)
  const [staffPassword, setStaffPassword] = useState(null)
  const [staffAEliminar, setStaffAEliminar] = useState(null)

  useEffect(() => { cargarStaff() }, [])

  async function cargarStaff() {
    try {
      setCargando(true)
      setError('')
      const { data } = await api.get('/admin/staff')
      setStaff(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('No se pudo cargar el personal')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  function abrirNuevo() {
    setStaffEnEdicion(null)
    setMostrarForm(true)
  }

  function abrirEdicion(persona) {
    setStaffEnEdicion(persona)
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setStaffEnEdicion(null)
  }

  async function handleGuardado() {
    cerrarForm()
    toaster.create({ title: 'Cuenta guardada', type: 'success' })
    await cargarStaff()
  }

  async function handlePasswordGuardado() {
    setStaffPassword(null)
    toaster.create({ title: 'Contraseña actualizada', type: 'success' })
    await cargarStaff()
  }

  async function handleToggleActivo(persona) {
    try {
      const { data } = await api.put(`/admin/staff/${persona.id}`, { activo: persona.activo === false })
      setStaff((prev) => prev.map((s) => (s.id === persona.id ? { ...s, ...(data || {}), activo: persona.activo === false } : s)))
      toaster.create({ title: persona.activo === false ? 'Cuenta reactivada' : 'Cuenta desactivada', type: 'success' })
    } catch (err) {
      toaster.create({ title: err?.response?.data?.error || 'No se pudo cambiar el estado', type: 'error' })
    }
  }

  async function handleEliminar(id) {
    try {
      await api.delete(`/admin/staff/${id}`)
      setStaff((prev) => prev.filter((s) => s.id !== id))
      setStaffAEliminar(null)
      toaster.create({ title: 'Cuenta eliminada', type: 'success' })
    } catch (err) {
      toaster.create({ title: err?.response?.data?.error || 'No se pudo eliminar la cuenta', type: 'error' })
    }
  }

  const staffFiltrado = useMemo(() => {
    let resultado = [...staff]
    if (busqueda) {
      const texto = busqueda.toLowerCase()
      resultado = resultado.filter(
        (s) => s.nombre?.toLowerCase().includes(texto) || s.email?.toLowerCase().includes(texto)
      )
    }
    if (filtroRol !== 'todos') {
      resultado = resultado.filter((s) => s.rol === filtroRol)
    }
    if (filtroEstado !== 'todos') {
      const activo = filtroEstado === 'activo'
      resultado = resultado.filter((s) => (s.activo !== false) === activo)
    }
    // El backend ya entrega ordenado por nombre; se preserva.
    return resultado
  }, [staff, busqueda, filtroRol, filtroEstado])

  const totalPaginas = Math.max(1, Math.ceil(staffFiltrado.length / ITEMS_POR_PAGINA))
  const paginaSegura = Math.min(paginaActual, totalPaginas)
  const staffPaginado = staffFiltrado.slice(
    (paginaSegura - 1) * ITEMS_POR_PAGINA,
    paginaSegura * ITEMS_POR_PAGINA
  )

  const stats = useMemo(() => ({
    total: staff.length,
    activos: staff.filter((s) => s.activo !== false).length,
    inactivos: staff.filter((s) => s.activo === false).length,
    porRol: ROLES_STAFF.reduce((acc, r) => {
      acc[r] = staff.filter((s) => s.rol === r).length
      return acc
    }, {}),
  }), [staff])

  if (cargando) {
    return (
      <Flex direction="column" align="center" justify="center" minH="60vh" gap={3}>
        <Spinner size="xl" color={AZUL} borderWidth="3px" />
        <Text color="gray.500">Cargando personal...</Text>
      </Flex>
    )
  }

  if (error) {
    return (
      <Flex direction="column" align="center" justify="center" minH="60vh" gap={3}>
        <Text color="red.500">{error}</Text>
        <Button onClick={cargarStaff} colorPalette="blue">
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
          <Heading size="lg" color={INDIGO}>Personal</Heading>
          <Text color="gray.500" fontSize="sm">Cuentas internas de la empresa (staff)</Text>
        </Box>
        <HStack gap={2}>
          <Button variant="ghost" onClick={cargarStaff} color={AZUL}>
            <RefreshCcw size={16} />
          </Button>
          <Button bg={AZUL} color="white" _hover={{ bg: '#0041B0' }} onClick={abrirNuevo}>
            <Plus size={16} />
            Nueva cuenta
          </Button>
        </HStack>
      </Flex>

      {/* Resumen general */}
      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4} mb={4}>
        <StatCard icon={Users} label="Total de cuentas" value={stats.total} />
        <StatCard icon={UserCheck} label="Activas" value={stats.activos} color="#0D9373" />
        <StatCard icon={UserX} label="Inactivas" value={stats.inactivos} color="#D97706" />
      </SimpleGrid>

      {/* Resumen por rol */}
      <SimpleGrid columns={{ base: 2, md: 4, xl: 7 }} gap={3} mb={6}>
        {ROLES_STAFF.map((r) => (
          <StatCard
            key={r}
            icon={ShieldCheck}
            label={ETIQUETA_ROL[r] || r}
            value={stats.porRol[r] || 0}
            color={AZUL}
          />
        ))}
      </SimpleGrid>

      {/* Toolbar */}
      <Flex
        bg="white"
        borderRadius="xl"
        p={4}
        boxShadow="0 1px 3px rgba(26,26,58,0.08)"
        border="1px solid"
        borderColor="gray.100"
        gap={3}
        wrap="wrap"
        align="center"
      >
        <InputGroup maxW="320px" startElement={<Search size={16} color="#9CA3AF" />}>
          <Input
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1) }}
            borderRadius="lg"
          />
        </InputGroup>

        <Box as="select" value={filtroRol} onChange={(e) => { setFiltroRol(e.target.value); setPaginaActual(1) }} maxW="200px" {...estiloSelect}>
          <option value="todos">Todos los roles</option>
          {ROLES_STAFF.map((r) => (
            <option key={r} value={r}>{ETIQUETA_ROL[r] || r}</option>
          ))}
        </Box>

        <Box as="select" value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1) }} maxW="180px" {...estiloSelect}>
          <option value="todos">Todos los estados</option>
          <option value="activo">Activas</option>
          <option value="inactivo">Inactivas</option>
        </Box>
      </Flex>

      <Text fontSize="sm" color="gray.500" my={3}>
        Mostrando {staffPaginado.length} de {staffFiltrado.length} cuentas
      </Text>

      {/* Tabla */}
      <Box bg="white" borderRadius="xl" overflow="hidden" border="1px solid" borderColor="gray.100" boxShadow="0 1px 3px rgba(26,26,58,0.08)">
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header bg="gray.50">
              <Table.Row borderBottom="1px solid" borderColor="gray.100">
                <Table.ColumnHeader px={4} py={3}>Personal</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Rol</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Estado</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} textAlign="end">Acciones</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {staffPaginado.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={4} px={4} py={8} textAlign="center">
                    <Text color="gray.400">No hay cuentas que coincidan</Text>
                  </Table.Cell>
                </Table.Row>
              ) : (
                staffPaginado.map((persona) => (
                  <Table.Row key={persona.id} opacity={persona.activo === false ? 0.55 : 1} borderBottom="1px solid" borderColor="gray.100">
                    <Table.Cell px={4} py={3}>
                      <HStack gap={3}>
                        <AvatarIniciales nombre={persona.nombre} />
                        <Box minW={0}>
                          <Text fontWeight="600" color={INDIGO}>{persona.nombre || 'Sin nombre'}</Text>
                          <Text fontSize="xs" color="gray.500">{persona.email}</Text>
                        </Box>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>
                      <Badge colorPalette={COLOR_ROL[persona.rol] || 'gray'} borderRadius="full">
                        {ETIQUETA_ROL[persona.rol] || persona.rol}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette={persona.activo !== false ? 'green' : 'gray'}
                        onClick={() => handleToggleActivo(persona)}
                      >
                        {persona.activo !== false ? 'Activo' : 'Inactivo'}
                      </Button>
                    </Table.Cell>
                    <Table.Cell px={4} py={3} textAlign="end">
                      <Menu.Root>
                        <Menu.Trigger asChild>
                          <IconButton variant="ghost" size="sm" aria-label="Acciones">
                            <MoreVertical size={16} />
                          </IconButton>
                        </Menu.Trigger>
                        <Portal>
                          <Menu.Positioner>
                            <Menu.Content>
                              <Menu.Item value="editar" onClick={() => abrirEdicion(persona)}>
                                <Pencil size={14} style={{ marginRight: 8 }} /> Editar
                              </Menu.Item>
                              <Menu.Item value="password" onClick={() => setStaffPassword(persona)}>
                                <KeyRound size={14} style={{ marginRight: 8 }} /> Cambiar contraseña
                              </Menu.Item>
                              <Menu.Item value="estado" onClick={() => handleToggleActivo(persona)}>
                                <UserX size={14} style={{ marginRight: 8 }} />
                                {persona.activo === false ? 'Reactivar' : 'Desactivar'}
                              </Menu.Item>
                              <Menu.Item value="eliminar" color="red.500" onClick={() => setStaffAEliminar(persona)}>
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
        <HStack justify="center" gap={3} mt={4}>
          <IconButton size="sm" variant="outline" disabled={paginaSegura === 1} onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={16} />
          </IconButton>
          <Text fontSize="sm" color="gray.500">Página {paginaSegura} de {totalPaginas}</Text>
          <IconButton size="sm" variant="outline" disabled={paginaSegura === totalPaginas} onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}>
            <ChevronRight size={16} />
          </IconButton>
        </HStack>
      )}

      {/* Modal crear/editar */}
      {mostrarForm && (
        <PersonalForm
          persona={staffEnEdicion}
          onClose={cerrarForm}
          onGuardado={handleGuardado}
        />
      )}

      {/* Modal cambiar contraseña */}
      {staffPassword && (
        <CambiarPassword
          persona={staffPassword}
          onClose={() => setStaffPassword(null)}
          onGuardado={handlePasswordGuardado}
        />
      )}

      {/* Confirmar eliminación */}
      {staffAEliminar && (
        <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={1400} display="flex" alignItems="center" justifyContent="center" p={4} onClick={() => setStaffAEliminar(null)}>
          <Box bg="white" borderRadius="xl" p={6} maxW="420px" w="100%" onClick={(e) => e.stopPropagation()}>
            <Heading size="md" color={INDIGO} mb={2}>Eliminar cuenta</Heading>
            <Text fontSize="sm" color="gray.600" mb={1}>
              ¿Estás seguro de eliminar a <strong>{staffAEliminar.nombre || staffAEliminar.email}</strong>?
            </Text>
            <Text fontSize="xs" color="red.500" mb={4}>
              Es irreversible y fallará si la cuenta tiene historial (órdenes, pagos, auditoría). En ese caso, desactívala en su lugar.
            </Text>
            <HStack justify="end" gap={3}>
              <Button variant="ghost" onClick={() => setStaffAEliminar(null)}>Cancelar</Button>
              <Button colorPalette="red" onClick={() => handleEliminar(staffAEliminar.id)}>Eliminar</Button>
            </HStack>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default PersonalAdmin
