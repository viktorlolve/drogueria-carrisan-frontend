import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Flex,
  Text,
  Stack,
  HStack,
  Button,
  IconButton,
  Input,
  Spinner,
  Badge,
} from '@chakra-ui/react'
import { X, Search, Trash2, Plus, Minus, Truck, UserRound } from 'lucide-react'
import api from '../../api/axios'
import { toaster } from '../ui/toaster'

const AZUL = '#0052DC'
const INDIGO = '#1A1A3A'

function money(n) {
  return Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function iniciales(nombre) {
  return (nombre?.trim()?.[0] || 'C').toUpperCase()
}

/**
 * Modal reutilizable para crear una orden desde el panel de administración,
 * como un pequeño módulo de facturación: buscas producto, aparecen resultados
 * abajo, Enter (o click) lo agrega como fila, ajustas cantidad, listo.
 *
 * Se llama desde Usuarios, Órdenes y Estado de Cuenta. Si se le pasa
 * `usuarioId`, la orden se crea directo para ese cliente. Si no, primero
 * pide elegir el cliente.
 */
function NuevaOrdenModal({ usuarioId, nombreUsuario, isOpen, onClose, onCreada }) {
  const [cliente, setCliente] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false)
  const [queryCliente, setQueryCliente] = useState('')

  const [queryProducto, setQueryProducto] = useState('')
  const [resultadosProductos, setResultadosProductos] = useState([])
  const [buscandoProductos, setBuscandoProductos] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(0)
  const [mostrarResultados, setMostrarResultados] = useState(false)

  const [filas, setFilas] = useState([])
  const [costoEnvio, setCostoEnvio] = useState('')
  const [formaPago, setFormaPago] = useState('contado')
  const [guardando, setGuardando] = useState(false)

  const inputProductoRef = useRef(null)
  const debounceRef = useRef(null)

  const [prevOpen, setPrevOpen] = useState(isOpen)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) {
      setFilas([])
      setCostoEnvio('')
      setFormaPago('contado')
      setQueryProducto('')
      setResultadosProductos([])
      setQueryCliente('')
      setCliente(usuarioId ? { id: usuarioId, nombre: nombreUsuario } : null)
      if (!usuarioId) setCargandoUsuarios(true)
    }
  }

  useEffect(() => {
    if (!isOpen || usuarioId) return
    let activo = true
    api.get('/users')
      .then(({ data }) => {
        if (activo) setUsuarios(data)
      })
      .catch((err) => {
        if (!activo) return
        console.error(err)
        toaster.create({ title: 'No se pudieron cargar los clientes', type: 'error' })
      })
      .finally(() => {
        if (activo) setCargandoUsuarios(false)
      })
    return () => {
      activo = false
    }
  }, [isOpen, usuarioId])

  // Búsqueda de productos con debounce — dispara la API mientras se escribe
  useEffect(() => {
    if (!cliente) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!queryProducto.trim()) return

    debounceRef.current = setTimeout(async () => {
      try {
        setBuscandoProductos(true)
        const { data } = await api.get('/products', { params: { search: queryProducto.trim() } })
        setResultadosProductos(data.slice(0, 8))
        setIndiceActivo(0)
        setMostrarResultados(true)
      } catch (err) {
        console.error(err)
      } finally {
        setBuscandoProductos(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [queryProducto, cliente])

  const resultadosProductosVisibles = queryProducto.trim() ? resultadosProductos : []

  function agregarProducto(producto) {
    setFilas((prev) => {
      const existente = prev.find((f) => f.producto_id === producto.id)
      if (existente) {
        return prev.map((f) => f.producto_id === producto.id ? { ...f, cantidad: f.cantidad + 1 } : f)
      }
      return [...prev, {
        producto_id: producto.id,
        nombre_comercial: producto.nombre_comercial,
        precio_usd: producto.precio_usd,
        cantidad: 1,
      }]
    })
    setQueryProducto('')
    setResultadosProductos([])
    setMostrarResultados(false)
    inputProductoRef.current?.focus()
  }

  function actualizarCantidad(producto_id, cantidad) {
    const val = Math.max(1, Number(cantidad) || 1)
    setFilas((prev) => prev.map((f) => f.producto_id === producto_id ? { ...f, cantidad: val } : f))
  }

  function quitarFila(producto_id) {
    setFilas((prev) => prev.filter((f) => f.producto_id !== producto_id))
  }

  function handleKeyDownBusqueda(e) {
    if (!mostrarResultados || resultadosProductos.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceActivo((i) => Math.min(i + 1, resultadosProductos.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const producto = resultadosProductos[indiceActivo]
      if (producto) agregarProducto(producto)
    } else if (e.key === 'Escape') {
      setMostrarResultados(false)
    }
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    if (!queryCliente) return true
    const texto = queryCliente.toLowerCase()
    return u.nombre?.toLowerCase().includes(texto) || u.email?.toLowerCase().includes(texto)
  })

  const subtotal = filas.reduce((sum, f) => sum + Number(f.precio_usd) * f.cantidad, 0)
  const envio = Number(costoEnvio) || 0
  const total = subtotal + envio

  async function guardar() {
    if (filas.length === 0) {
      toaster.create({ title: 'Agrega al menos un producto', type: 'warning' })
      return
    }
    try {
      setGuardando(true)
      await api.post('/orders', {
        usuario_id: cliente.id,
        items: filas.map((f) => ({ producto_id: f.producto_id, cantidad: f.cantidad })),
        forma_pago: formaPago,
      })
      toaster.create({ title: 'Orden creada', type: 'success' })
      onCreada?.()
      onClose()
    } catch (err) {
      console.error(err)
      const msg = err?.response?.data?.error || 'No se pudo crear la orden'
      toaster.create({ title: msg, type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} placement="center">
      <Portal>
        <Dialog.Backdrop position="fixed" inset={0} bg="blackAlpha.600" zIndex={1400} />
        <Dialog.Positioner position="fixed" inset={0} display="flex" alignItems="center" justifyContent="center" p={{ base: 0, md: 4 }} zIndex={1500} overflowY="auto">
          <Dialog.Content
            maxW="2xl" w="100%" h={{ base: '100%', md: 'auto' }} maxH={{ base: '100%', md: '92vh' }}
            my="auto" bg="white" borderRadius={{ base: 0, md: 'xl' }} boxShadow="2xl"
            display="flex" flexDir="column" overflow="hidden"
          >
            <Dialog.Header bg={INDIGO} color="white" borderTopRadius={{ base: 0, md: 'xl' }} flexShrink={0} p={5}>
              <Dialog.Title>Nueva orden</Dialog.Title>
              {cliente?.nombre && (
                <Text fontSize="xs" opacity={0.8} mt={1}>Para {cliente.nombre}</Text>
              )}
            </Dialog.Header>
            <Dialog.CloseTrigger position="absolute" top="14px" right="14px" asChild>
              <IconButton variant="ghost" size="sm" color="white" _hover={{ bg: 'whiteAlpha.300' }} aria-label="Cerrar">
                <X size={18} />
              </IconButton>
            </Dialog.CloseTrigger>

            <Dialog.Body p={0} flex="1" overflowY="auto">
              {/* Paso 0: elegir cliente si no vino definido */}
              {!cliente ? (
                <Box p={5}>
                  <Text fontWeight="600" color={INDIGO} mb={3}>¿Para qué cliente es esta orden?</Text>
                  <Box position="relative">
                    <Flex align="center" border="1px solid" borderColor="gray.200" borderRadius="lg" px={3}>
                      <Search size={16} color="#9CA3AF" />
                      <Input
                        border="none"
                        placeholder="Buscar cliente por nombre o email..."
                        value={queryCliente}
                        onChange={(e) => setQueryCliente(e.target.value)}
                        _focus={{ boxShadow: 'none' }}
                        autoFocus
                      />
                    </Flex>
                  </Box>

                  {cargandoUsuarios ? (
                    <Flex justify="center" py={6}><Spinner color={AZUL} /></Flex>
                  ) : (
                    <Stack gap={0} mt={3} border="1px solid" borderColor="gray.100" borderRadius="lg" overflow="hidden" maxH="45vh" overflowY="auto">
                      {usuariosFiltrados.length === 0 ? (
                        <Text fontSize="sm" color="gray.400" p={4} textAlign="center">Sin resultados</Text>
                      ) : (
                        usuariosFiltrados.map((u) => (
                          <Flex
                            key={u.id}
                            align="center"
                            gap={3}
                            p={3}
                            borderBottom="1px solid"
                            borderColor="gray.100"
                            cursor="pointer"
                            _hover={{ bg: 'gray.50' }}
                            onClick={() => setCliente({ id: u.id, nombre: u.nombre })}
                          >
                            <Flex align="center" justify="center" w="34px" h="34px" borderRadius="full" bg={INDIGO} color="white" fontWeight="600" fontSize="sm">
                              {iniciales(u.nombre)}
                            </Flex>
                            <Box>
                              <Text fontWeight="600" fontSize="sm" color={INDIGO}>{u.nombre || 'Sin nombre'}</Text>
                              <Text fontSize="xs" color="gray.500">{u.email}</Text>
                            </Box>
                          </Flex>
                        ))
                      )}
                    </Stack>
                  )}
                </Box>
              ) : (
                <Box>
                  {/* Buscador de productos con resultados desplegables */}
                  <Box p={4} borderBottom="1px solid" borderColor="gray.100" position="sticky" top={0} bg="white" zIndex={1}>
                    {!usuarioId && (
                      <HStack mb={3} fontSize="xs" color="gray.500">
                        <UserRound size={13} />
                        <Text>Cliente: <strong style={{ color: INDIGO }}>{cliente.nombre}</strong></Text>
                        <Button size="2xs" variant="ghost" color={AZUL} onClick={() => setCliente(null)}>Cambiar</Button>
                      </HStack>
                    )}
                    <Box position="relative">
                      <Flex align="center" border="1px solid" borderColor="gray.200" borderRadius="lg" px={3} bg="gray.50">
                        <Search size={16} color="#9CA3AF" />
                        <Input
                          ref={inputProductoRef}
                          border="none"
                          bg="transparent"
                          placeholder="Escribe para buscar un producto... (ej: amikacina)"
                          value={queryProducto}
                          onChange={(e) => { setQueryProducto(e.target.value); setMostrarResultados(true) }}
                          onFocus={() => setMostrarResultados(true)}
                          onKeyDown={handleKeyDownBusqueda}
                          _focus={{ boxShadow: 'none' }}
                          autoFocus
                        />
                        {buscandoProductos && <Spinner size="xs" color={AZUL} />}
                      </Flex>

                      {/* Panel de resultados */}
                      {mostrarResultados && queryProducto && resultadosProductosVisibles.length > 0 && (
                        <Box
                          position="absolute" top="calc(100% + 4px)" left={0} right={0}
                          bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg"
                          boxShadow="lg" maxH="260px" overflowY="auto" zIndex={20}
                        >
                          {resultadosProductosVisibles.map((p, i) => (
                            <Flex
                              key={p.id}
                              align="center" justify="space-between" px={3} py={2.5}
                              bg={i === indiceActivo ? 'blue.50' : 'white'}
                              cursor="pointer"
                              borderBottom="1px solid" borderColor="gray.50"
                              onMouseEnter={() => setIndiceActivo(i)}
                              onClick={() => agregarProducto(p)}
                            >
                              <Box>
                                <Text fontSize="sm" fontWeight="600" color={INDIGO}>{p.nombre_comercial}</Text>
                                <Text fontSize="xs" color="gray.500">{p.marcas?.nombre || p.laboratorio || ''}</Text>
                              </Box>
                              <Text fontSize="sm" fontWeight="700" color={AZUL}>${money(p.precio_usd)}</Text>
                            </Flex>
                          ))}
                        </Box>
                      )}
                      {mostrarResultados && queryProducto && !buscandoProductos && resultadosProductosVisibles.length === 0 && (
                        <Box position="absolute" top="calc(100% + 4px)" left={0} right={0} bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" boxShadow="lg" p={3} zIndex={20}>
                          <Text fontSize="sm" color="gray.400">Sin productos que coincidan</Text>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Filas de la orden */}
                  <Box p={4}>
                    {filas.length === 0 ? (
                      <Flex direction="column" align="center" justify="center" py={10} color="gray.400">
                        <Text fontSize="sm">Busca un producto arriba para empezar a facturar</Text>
                      </Flex>
                    ) : (
                      <Stack gap={2}>
                        {filas.map((f) => (
                          <Flex key={f.producto_id} align="center" gap={3} p={3} border="1px solid" borderColor="gray.100" borderRadius="lg">
                            <Box flex={1} minW={0}>
                              <Text fontSize="sm" fontWeight="600" color={INDIGO} lineClamp={1}>{f.nombre_comercial}</Text>
                              <Text fontSize="xs" color="gray.500">${money(f.precio_usd)} c/u</Text>
                            </Box>
                            <HStack gap={1}>
                              <IconButton size="xs" variant="outline" aria-label="Restar" onClick={() => actualizarCantidad(f.producto_id, f.cantidad - 1)}>
                                <Minus size={12} />
                              </IconButton>
                              <Input
                                type="number" min={1} value={f.cantidad}
                                onChange={(e) => actualizarCantidad(f.producto_id, e.target.value)}
                                w="52px" textAlign="center" size="sm" px={1}
                              />
                              <IconButton size="xs" variant="outline" aria-label="Sumar" onClick={() => actualizarCantidad(f.producto_id, f.cantidad + 1)}>
                                <Plus size={12} />
                              </IconButton>
                            </HStack>
                            <Text fontSize="sm" fontWeight="700" color={INDIGO} minW="70px" textAlign="right">
                              ${money(f.precio_usd * f.cantidad)}
                            </Text>
                            <IconButton size="xs" variant="ghost" color="red.400" aria-label="Quitar" onClick={() => quitarFila(f.producto_id)}>
                              <Trash2 size={14} />
                            </IconButton>
                          </Flex>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  {/* Resumen: envío, forma de pago, totales */}
                  <Box p={4} bg="gray.50" borderTop="1px solid" borderColor="gray.100">
                    <Stack gap={3}>
                      <Flex align="center" gap={3}>
                        <Truck size={16} color="#6B7280" />
                        <Text fontSize="sm" color="gray.600" minW="110px">Costo de envío</Text>
                        <Input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={costoEnvio} onChange={(e) => setCostoEnvio(e.target.value)}
                          size="sm" maxW="120px" bg="white"
                        />
                      </Flex>

                      <Flex align="center" gap={3}>
                        <Text fontSize="sm" color="gray.600" minW="110px">Forma de pago</Text>
                        <Box
                          as="select" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
                          border="1px solid" borderColor="gray.200" borderRadius="md" px={2} py={1.5} fontSize="sm" bg="white"
                        >
                          <option value="contado">Contado</option>
                          <option value="credito">Crédito</option>
                        </Box>
                        {formaPago === 'credito' && (
                          <Badge colorPalette="orange" fontSize="xs">Sujeto a saldo disponible del cliente</Badge>
                        )}
                      </Flex>

                      <Box borderTop="1px solid" borderColor="gray.200" pt={3}>
                        <Flex justify="space-between" fontSize="sm" color="gray.500">
                          <Text>Subtotal</Text><Text>${money(subtotal)}</Text>
                        </Flex>
                        {envio > 0 && (
                          <Flex justify="space-between" fontSize="sm" color="gray.500">
                            <Text>Envío</Text><Text>${money(envio)}</Text>
                          </Flex>
                        )}
                        <Flex justify="space-between" fontSize="lg" fontWeight="700" color={INDIGO} mt={1}>
                          <Text>Total</Text><Text>${money(total)}</Text>
                        </Flex>
                      </Box>
                    </Stack>
                  </Box>
                </Box>
              )}
            </Dialog.Body>

            {cliente && (
              <Dialog.Footer borderTop="1px solid" borderColor="gray.100" flexShrink={0} p={4}>
                <Button variant="ghost" mr={3} onClick={onClose}>Cancelar</Button>
                <Button bg={AZUL} color="white" _hover={{ bg: '#0041B0' }} loading={guardando} onClick={guardar} disabled={filas.length === 0}>
                  Crear orden · ${money(total)}
                </Button>
              </Dialog.Footer>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default NuevaOrdenModal
