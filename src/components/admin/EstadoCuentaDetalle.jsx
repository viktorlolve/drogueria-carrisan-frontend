import { useState, useEffect } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Flex,
  Text,
  Badge,
  SimpleGrid,
  Tabs,
  Table,
  Spinner,
  Button,
  HStack,
  VStack,
  IconButton,
  useDisclosure,
} from '@chakra-ui/react'
import { FileText, Wallet, ShoppingCart, Plus, Receipt, CreditCard, X } from 'lucide-react'
import api from '../../api/axios'
import NuevaFacturaModal from './NuevaFacturaModal'
import NuevoPagoModal from './NuevoPagoModal'
import NuevaOrdenModal from './NuevaOrdenModal'

const AZUL = '#0052DC'
const INDIGO = '#1A1A3A'

function money(n) {
  return Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ESTADO_ORDEN_COLOR = {
  pendiente: 'yellow',
  enviado: 'blue',
  entregado: 'green',
  cancelado: 'red',
}

const ESTADO_PAGO_COLOR = {
  pendiente_verificacion: 'orange',
  verificado: 'green',
}

function iniciales(nombre) {
  return (nombre?.trim()?.[0] || 'C').toUpperCase()
}

function AvatarCirculo({ nombre, size = '32px', bg = AZUL }) {
  return (
    <Flex align="center" justify="center" w={size} h={size} minW={size} borderRadius="full" bg={bg} color="white" fontWeight="600">
      {iniciales(nombre)}
    </Flex>
  )
}

function ResumenCard({ icon: IconCmp, label, value, color = INDIGO }) {
  return (
    <Box bg="gray.50" borderRadius="lg" p={4} border="1px solid" borderColor="gray.100">
      <HStack gap={3}>
        <Flex align="center" justify="center" w="36px" h="36px" borderRadius="lg" bg={`${color}15`}>
          <IconCmp size={18} color={color} />
        </Flex>
        <Box>
          <Text fontSize="lg" fontWeight="700" color={INDIGO}>{value}</Text>
          <Text fontSize="xs" color="gray.500">{label}</Text>
        </Box>
      </HStack>
    </Box>
  )
}

function EstadoCuentaDetalle({ clienteId, isOpen, onClose }) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const facturaModal = useDisclosure()
  const pagoModal = useDisclosure()
  const ordenModal = useDisclosure()

  const [prevOpen, setPrevOpen] = useState(isOpen)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) {
      setCargando(true)
    } else {
      setDatos(null)
    }
  }

  useEffect(() => {
    if (!isOpen || !clienteId) return
    let activo = true
    api.get(`/clientes/${clienteId}/estado-cuenta`)
      .then(({ data }) => {
        if (!activo) return
        setError('')
        setDatos(data)
      })
      .catch((err) => {
        if (!activo) return
        setError('No se pudo cargar el detalle del cliente')
        console.error(err)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [isOpen, clienteId])

  async function cargarDetalle() {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get(`/clientes/${clienteId}/estado-cuenta`)
      setDatos(data)
    } catch (err) {
      setError('No se pudo cargar el detalle del cliente')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} placement="center">
      <Portal>
        <Dialog.Backdrop position="fixed" inset={0} bg="blackAlpha.600" zIndex={1400} />
        <Dialog.Positioner position="fixed" inset={0} display="flex" alignItems="center" justifyContent="center" p={4} zIndex={1500} overflowY="auto">
          <Dialog.Content
            maxW="4xl"
            w="100%"
            maxH="90vh"
            my="auto"
            bg="white"
            borderRadius="xl"
            boxShadow="2xl"
            display="flex"
            flexDir="column"
            overflow="hidden"
          >
            <Dialog.Header bg={INDIGO} color="white" borderTopRadius="xl" flexShrink={0} p={5}>
              {cargando || !datos ? (
                <Dialog.Title>Cargando cliente...</Dialog.Title>
              ) : (
                <HStack gap={3}>
                  <AvatarCirculo nombre={datos.cliente?.nombre} />
                  <Box>
                    <Dialog.Title fontSize="md">{datos.cliente?.nombre || 'Sin nombre'}</Dialog.Title>
                    <Text fontSize="xs" opacity={0.8}>{datos.cliente?.email}</Text>
                  </Box>
                </HStack>
              )}
            </Dialog.Header>
            <Dialog.CloseTrigger position="absolute" top="14px" right="14px" color="white" asChild>
              <IconButton variant="ghost" size="sm" color="white" _hover={{ bg: 'whiteAlpha.300' }} aria-label="Cerrar">
                <X size={18} />
              </IconButton>
            </Dialog.CloseTrigger>

            <Dialog.Body bg="gray.50" pb={6} flex="1" overflowY="auto" px={{ base: 4, md: 6 }}>
              {cargando ? (
                <Flex align="center" justify="center" minH="300px">
                  <Spinner size="lg" color={AZUL} borderWidth="3px" />
                </Flex>
              ) : error ? (
                <Flex align="center" justify="center" minH="300px" direction="column" gap={3}>
                  <Text color="red.500">{error}</Text>
                  <Button onClick={cargarDetalle} colorPalette="blue" size="sm">Reintentar</Button>
                </Flex>
              ) : datos ? (
                <VStack align="stretch" gap={5} pt={4}>
                  {/* Resumen bancario */}
                  <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
                    <ResumenCard icon={Wallet} label="Línea de crédito" value={`$${money(datos.resumen?.linea_credito)}`} />
                    <ResumenCard icon={FileText} label="Deuda actual" value={`$${money(datos.resumen?.deuda_actual)}`} color="orange.500" />
                    <ResumenCard
                      icon={CreditCard}
                      label="Saldo disponible"
                      value={`${datos.resumen?.saldo >= 0 ? '+' : ''}$${money(datos.resumen?.saldo)}`}
                      color={datos.resumen?.saldo >= 0 ? 'green.500' : 'red.500'}
                    />
                    <ResumenCard icon={ShoppingCart} label="Órdenes pendientes" value={datos.ordenes_pendientes?.length || 0} />
                  </SimpleGrid>

                  {/* Acciones rápidas */}
                  <HStack gap={3} wrap="wrap">
                    <Button size="sm" colorPalette="blue" onClick={ordenModal.onOpen}>
                      <Plus size={15} />
                      Agregar orden
                    </Button>
                    <Button size="sm" variant="outline" borderColor={AZUL} color={AZUL} onClick={facturaModal.onOpen}>
                      <Receipt size={15} />
                      Agregar factura
                    </Button>
                    <Button size="sm" variant="outline" borderColor={AZUL} color={AZUL} onClick={pagoModal.onOpen}>
                      <CreditCard size={15} />
                      Agregar pago
                    </Button>
                  </HStack>

                  {/* Tabs */}
                  <Tabs.Root defaultValue="ordenes" colorPalette="blue" variant="enclosed" size="sm">
                    <Tabs.List>
                      <Tabs.Trigger value="ordenes">Órdenes pendientes</Tabs.Trigger>
                      <Tabs.Trigger value="facturas">Facturas</Tabs.Trigger>
                      <Tabs.Trigger value="pagos">Pagos</Tabs.Trigger>
                    </Tabs.List>

                    <Tabs.Content value="ordenes" px={0} pt={3}>
                      <Box bg="white" borderRadius="lg" overflow="hidden" border="1px solid" borderColor="gray.100">
                        <Table.Root size="sm">
                          <Table.Header bg="gray.50">
                            <Table.Row borderBottom="1px solid" borderColor="gray.100">
                              <Table.ColumnHeader px={4} py={3}>Orden</Table.ColumnHeader>
                              <Table.ColumnHeader px={4} py={3}>Fecha</Table.ColumnHeader>
                              <Table.ColumnHeader px={4} py={3}>Forma de pago</Table.ColumnHeader>
                              <Table.ColumnHeader px={4} py={3}>Estado</Table.ColumnHeader>
                              <Table.ColumnHeader textAlign="end" px={4} py={3}>Monto</Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {(datos.ordenes_pendientes || []).length === 0 ? (
                              <Table.Row borderBottom="1px solid" borderColor="gray.100">
                                <Table.Cell colSpan={5} px={4} py={3}>
                                  <Text py={4} textAlign="center" color="gray.400">Sin órdenes pendientes</Text>
                                </Table.Cell>
                              </Table.Row>
                            ) : (
                              datos.ordenes_pendientes.map((o) => (
                                <Table.Row key={o.id} borderBottom="1px solid" borderColor="gray.100">
                                  <Table.Cell px={4} py={3}>#{o.id}</Table.Cell>
                                  <Table.Cell px={4} py={3}>{fecha(o.created_at)}</Table.Cell>
                                  <Table.Cell textTransform="capitalize" px={4} py={3}>{o.forma_pago}</Table.Cell>
                                  <Table.Cell px={4} py={3}>
                                    <Badge colorPalette={ESTADO_ORDEN_COLOR[o.estado] || 'gray'} borderRadius="full">
                                      {o.estado}
                                    </Badge>
                                  </Table.Cell>
                                  <Table.Cell textAlign="end" fontWeight="600" px={4} py={3}>${money(o.total_usd)}</Table.Cell>
                                </Table.Row>
                              ))
                            )}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    </Tabs.Content>

                    <Tabs.Content value="facturas" px={0} pt={3}>
                      <Box bg="white" borderRadius="lg" overflow="hidden" border="1px solid" borderColor="gray.100">
                        <Table.Root size="sm">
                          <Table.Header bg="gray.50">
                            <Table.Row borderBottom="1px solid" borderColor="gray.100">
                              <Table.ColumnHeader px={4} py={3}>Factura</Table.ColumnHeader>
                              <Table.ColumnHeader px={4} py={3}>Fecha</Table.ColumnHeader>
                              <Table.ColumnHeader textAlign="end" px={4} py={3}>Tasa usada</Table.ColumnHeader>
                              <Table.ColumnHeader textAlign="end" px={4} py={3}>Monto</Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {(datos.facturas || []).length === 0 ? (
                              <Table.Row borderBottom="1px solid" borderColor="gray.100">
                                <Table.Cell colSpan={4} px={4} py={3}>
                                  <Text py={4} textAlign="center" color="gray.400">Sin facturas registradas</Text>
                                </Table.Cell>
                              </Table.Row>
                            ) : (
                              datos.facturas.map((f) => (
                                <Table.Row key={f.id} borderBottom="1px solid" borderColor="gray.100">
                                  <Table.Cell px={4} py={3}>#{f.numero_factura || f.id}</Table.Cell>
                                  <Table.Cell px={4} py={3}>{fecha(f.created_at)}</Table.Cell>
                                  <Table.Cell textAlign="end" px={4} py={3}>{f.tasa_cambio ? money(f.tasa_cambio) : '—'}</Table.Cell>
                                  <Table.Cell textAlign="end" fontWeight="600" px={4} py={3}>${money(f.monto_facturado)}</Table.Cell>
                                </Table.Row>
                              ))
                            )}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    </Tabs.Content>

                    <Tabs.Content value="pagos" px={0} pt={3}>
                      <Box bg="white" borderRadius="lg" overflow="hidden" border="1px solid" borderColor="gray.100">
                        <Table.Root size="sm">
                          <Table.Header bg="gray.50">
                            <Table.Row borderBottom="1px solid" borderColor="gray.100">
                              <Table.ColumnHeader px={4} py={3}>Pago</Table.ColumnHeader>
                              <Table.ColumnHeader px={4} py={3}>Fecha</Table.ColumnHeader>
                              <Table.ColumnHeader px={4} py={3}>Estado</Table.ColumnHeader>
                              <Table.ColumnHeader textAlign="end" px={4} py={3}>Monto</Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {(datos.pagos || []).length === 0 ? (
                              <Table.Row borderBottom="1px solid" borderColor="gray.100">
                                <Table.Cell colSpan={4} px={4} py={3}>
                                  <Text py={4} textAlign="center" color="gray.400">Sin pagos registrados</Text>
                                </Table.Cell>
                              </Table.Row>
                            ) : (
                              datos.pagos.map((p) => (
                                <Table.Row key={p.id} borderBottom="1px solid" borderColor="gray.100">
                                  <Table.Cell px={4} py={3}>#{p.id}</Table.Cell>
                                  <Table.Cell px={4} py={3}>{fecha(p.created_at)}</Table.Cell>
                                  <Table.Cell px={4} py={3}>
                                    <Badge colorPalette={ESTADO_PAGO_COLOR[p.estado] || 'gray'} borderRadius="full">
                                      {p.estado?.replace('_', ' ') || '—'}
                                    </Badge>
                                  </Table.Cell>
                                  <Table.Cell textAlign="end" fontWeight="600" px={4} py={3}>${money(p.monto)}</Table.Cell>
                                </Table.Row>
                              ))
                            )}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    </Tabs.Content>
                  </Tabs.Root>
                </VStack>
              ) : null}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>

      <NuevaFacturaModal
        clienteId={clienteId}
        isOpen={facturaModal.open}
        onClose={facturaModal.onClose}
        onCreada={cargarDetalle}
      />
      <NuevoPagoModal
        clienteId={clienteId}
        ordenes={datos?.ordenes_pendientes}
        isOpen={pagoModal.open}
        onClose={pagoModal.onClose}
        onCreado={cargarDetalle}
      />
      <NuevaOrdenModal
        usuarioId={clienteId}
        nombreUsuario={datos?.cliente?.nombre}
        isOpen={ordenModal.open}
        onClose={ordenModal.onClose}
        onCreada={cargarDetalle}
      />
    </Dialog.Root>
  )
}

export default EstadoCuentaDetalle
