import { useState } from 'react'
import {
  Dialog,
  Portal,
  Field,
  Input,
  Textarea,
  Box,
  Text,
  Flex,
  Stack,
  HStack,
  Button,
  IconButton,
  Badge,
  Separator,
} from '@chakra-ui/react'
import { X } from 'lucide-react'
import api from '../../api/axios'
import { toaster } from '../ui/toaster'

const AZUL = '#0052DC'
const INDIGO = '#1A1A3A'
const PASOS = ['Cuenta', 'Contacto', 'Preferencias']

function colorEtiqueta(etiqueta) {
  const mapa = { admin: 'purple', distribuidor: 'blue', cliente: 'gray' }
  return mapa[etiqueta] || 'teal'
}

function UsuarioForm({ usuario, etiquetasSugeridas = [], isOpen, onClose, onGuardado }) {
  const esEdicion = Boolean(usuario)

  const [email, setEmail] = useState(usuario?.email || '')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState(usuario?.nombre || '')
  const [etiqueta, setEtiqueta] = useState(usuario?.etiqueta || 'distribuidor')
  const [rifCedula, setRifCedula] = useState(usuario?.rif_cedula || '')
  const [direccionFiscal, setDireccionFiscal] = useState(usuario?.direccion_fiscal || '')
  const [direccionEntrega, setDireccionEntrega] = useState(usuario?.direccion_entrega || '')
  const [telefono, setTelefono] = useState(usuario?.telefono || '')
  const [lineaCredito, setLineaCredito] = useState(usuario?.linea_credito ?? '')
  const [activo, setActivo] = useState(usuario?.activo ?? true)
  const [deliveryGratis, setDeliveryGratis] = useState(usuario?.delivery_gratis || false)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [errores, setErrores] = useState({})
  const [paso, setPaso] = useState(1)

  function validarPaso1() {
    const errs = {}
    if (!email.trim()) {
      errs.email = 'El email es requerido'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Email inválido'
    }
    if (!esEdicion && !password) {
      errs.password = 'La contraseña es requerida'
    } else if (!esEdicion && password.length < 6) {
      errs.password = 'Mínimo 6 caracteres'
    }
    if (!nombre.trim()) {
      errs.nombre = 'El nombre es requerido'
    }
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  function validarPaso2() {
    const errs = {}
    if (rifCedula && rifCedula.length < 6) errs.rifCedula = 'RIF/Cédula muy corto'
    if (telefono && telefono.length < 7) errs.telefono = 'Teléfono muy corto'
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  function irSiguiente() {
    if (paso === 1 && validarPaso1()) setPaso(2)
    else if (paso === 2 && validarPaso2()) setPaso(3)
  }

  function irAnterior() {
    setPaso((p) => Math.max(1, p - 1))
  }

  async function guardar() {
    setError('')
    if (!validarPaso1()) {
      setPaso(1)
      return
    }
    setGuardando(true)

    const payload = {
      email: email.trim().toLowerCase(),
      nombre: nombre.trim(),
      etiqueta,
      rif_cedula: rifCedula || null,
      direccion_fiscal: direccionFiscal || null,
      direccion_entrega: direccionEntrega || null,
      telefono: telefono || null,
      linea_credito: Number(lineaCredito) || 0,
      delivery_gratis: deliveryGratis,
      ...(esEdicion && { activo }),
    }

    // La contraseña solo se envía al crear un usuario nuevo — no se permite
    // modificarla desde el panel de administración una vez creado.
    if (!esEdicion) {
      payload.password = password
    }

    try {
      if (esEdicion) {
        await api.patch(`/users/${usuario.id}`, payload)
      } else {
        await api.post('/users', payload)
      }
      onGuardado()
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar el usuario')
      toaster.create({ title: 'No se pudo guardar el usuario', type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} placement="center" scrollBehavior="inside">
      <Portal>
        <Dialog.Backdrop position="fixed" inset={0} bg="blackAlpha.600" zIndex={1400} />
        <Dialog.Positioner position="fixed" inset={0} display="flex" alignItems="center" justifyContent="center" p={4} zIndex={1500} overflowY="auto">
          <Dialog.Content maxW="xl" w="100%" maxH="90vh" my="auto" bg="white" borderRadius="xl" boxShadow="2xl" display="flex" flexDir="column" overflow="hidden">
            <Dialog.Header bg={INDIGO} color="white" borderTopRadius="xl" flexShrink={0} p={5}>
              <Dialog.Title>{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger position="absolute" top="14px" right="14px" asChild>
              <IconButton variant="ghost" size="sm" color="white" _hover={{ bg: 'whiteAlpha.300' }} aria-label="Cerrar">
                <X size={18} />
              </IconButton>
            </Dialog.CloseTrigger>

            {/* Indicador de pasos */}
            <Flex px={6} pt={5} pb={2} align="center" gap={2}>
              {PASOS.map((nombrePaso, i) => {
                const numero = i + 1
                const activo_ = paso === numero
                const completado = paso > numero
                return (
                  <HStack key={nombrePaso} flex={1} gap={2}>
                    <Flex
                      align="center" justify="center" w="26px" h="26px" borderRadius="full"
                      bg={activo_ || completado ? AZUL : 'gray.100'}
                      color={activo_ || completado ? 'white' : 'gray.400'}
                      fontSize="xs" fontWeight="700"
                    >
                      {completado ? '✓' : numero}
                    </Flex>
                    <Text fontSize="xs" color={activo_ ? INDIGO : 'gray.400'} fontWeight={activo_ ? '600' : '400'}>
                      {nombrePaso}
                    </Text>
                    {numero < PASOS.length && <Box flex={1} h="1px" bg="gray.100" />}
                  </HStack>
                )
              })}
            </Flex>

            <Dialog.Body pt={2} flex="1" overflowY="auto">
              {error && (
                <Box bg="red.50" color="red.600" fontSize="sm" p={3} borderRadius="md" mb={4}>{error}</Box>
              )}

              {/* Paso 1: Cuenta */}
              {paso === 1 && (
                <Stack gap={4}>
                  <Field.Root invalid={Boolean(errores.email)} required>
                    <Field.Label fontSize="sm">Email</Field.Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@ejemplo.com" />
                    {errores.email && <Field.ErrorText>{errores.email}</Field.ErrorText>}
                  </Field.Root>

                  {esEdicion ? (
                    <Box bg="gray.50" borderRadius="md" p={3}>
                      <Text fontSize="xs" color="gray.500">
                        La contraseña no se puede modificar desde este panel por seguridad.
                      </Text>
                    </Box>
                  ) : (
                    <Field.Root invalid={Boolean(errores.password)} required>
                      <Field.Label fontSize="sm">Contraseña</Field.Label>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                      {errores.password && <Field.ErrorText>{errores.password}</Field.ErrorText>}
                    </Field.Root>
                  )}

                  <Field.Root invalid={Boolean(errores.nombre)} required>
                    <Field.Label fontSize="sm">Nombre completo</Field.Label>
                    <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
                    {errores.nombre && <Field.ErrorText>{errores.nombre}</Field.ErrorText>}
                  </Field.Root>

                  <Field.Root>
                    <Field.Label fontSize="sm">Etiqueta</Field.Label>
                    <Input
                      list="etiquetas-sugeridas"
                      value={etiqueta}
                      onChange={(e) => setEtiqueta(e.target.value)}
                      placeholder="ej: distribuidor, cliente, mayorista..."
                    />
                    <datalist id="etiquetas-sugeridas">
                      {etiquetasSugeridas.map((etq) => <option key={etq} value={etq} />)}
                    </datalist>
                    <Field.HelperText>
                      Texto libre — aún no hay etiquetas fijas definidas, escribe la que corresponda.
                    </Field.HelperText>
                  </Field.Root>
                </Stack>
              )}

              {/* Paso 2: Contacto */}
              {paso === 2 && (
                <Stack gap={4}>
                  <Field.Root invalid={Boolean(errores.rifCedula)}>
                    <Field.Label fontSize="sm">RIF</Field.Label>
                    <Input value={rifCedula} onChange={(e) => setRifCedula(e.target.value)} placeholder="J-12345678-9" />
                    {errores.rifCedula && <Field.ErrorText>{errores.rifCedula}</Field.ErrorText>}
                  </Field.Root>

                  <Field.Root invalid={Boolean(errores.telefono)}>
                    <Field.Label fontSize="sm">Teléfono</Field.Label>
                    <Input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+58 212-555-1234" />
                    {errores.telefono && <Field.ErrorText>{errores.telefono}</Field.ErrorText>}
                  </Field.Root>

                  <Field.Root>
                    <Field.Label fontSize="sm">Dirección fiscal</Field.Label>
                    <Textarea value={direccionFiscal} onChange={(e) => setDireccionFiscal(e.target.value)} rows={2} placeholder="Dirección principal de la empresa" />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label fontSize="sm">Dirección de entrega</Field.Label>
                    <Textarea value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)} rows={2} placeholder="Dirección para envíos" />
                  </Field.Root>
                </Stack>
              )}

              {/* Paso 3: Preferencias */}
              {paso === 3 && (
                <Stack gap={4}>
                  <Field.Root>
                    <Field.Label fontSize="sm">Línea de crédito (USD)</Field.Label>
                    <Input type="number" step="0.01" min="0" value={lineaCredito} onChange={(e) => setLineaCredito(e.target.value)} placeholder="0.00" />
                  </Field.Root>

                  <Flex as="label" align="center" gap={3} p={3} border="1px solid" borderColor="gray.100" borderRadius="lg" cursor="pointer">
                    <input type="checkbox" checked={deliveryGratis} onChange={(e) => setDeliveryGratis(e.target.checked)} />
                    <Box>
                      <Text fontSize="sm" fontWeight="600" color={INDIGO}>Delivery gratis</Text>
                      <Text fontSize="xs" color="gray.500">No pagará el envío en moto dentro de la ciudad</Text>
                    </Box>
                  </Flex>

                  {esEdicion && (
                    <Flex as="label" align="center" gap={3} p={3} border="1px solid" borderColor="gray.100" borderRadius="lg" cursor="pointer">
                      <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                      <Box>
                        <Text fontSize="sm" fontWeight="600" color={INDIGO}>Usuario activo</Text>
                        <Text fontSize="xs" color="gray.500">Los usuarios inactivos no pueden iniciar sesión</Text>
                      </Box>
                    </Flex>
                  )}

                  <Separator />

                  <Box bg="gray.50" borderRadius="lg" p={4}>
                    <Text fontSize="sm" fontWeight="700" color={INDIGO} mb={2}>Resumen</Text>
                    <Stack gap={1} fontSize="sm">
                      <Flex justify="space-between"><Text color="gray.500">Email</Text><Text fontWeight="600">{email || '—'}</Text></Flex>
                      <Flex justify="space-between"><Text color="gray.500">Nombre</Text><Text fontWeight="600">{nombre || '—'}</Text></Flex>
                      <Flex justify="space-between" align="center">
                        <Text color="gray.500">Etiqueta</Text>
                        <Badge colorPalette={colorEtiqueta(etiqueta)} textTransform="capitalize">{etiqueta || '—'}</Badge>
                      </Flex>
                      <Flex justify="space-between"><Text color="gray.500">Crédito</Text><Text fontWeight="600">${Number(lineaCredito || 0).toFixed(2)}</Text></Flex>
                      <Flex justify="space-between"><Text color="gray.500">Delivery</Text><Text fontWeight="600">{deliveryGratis ? 'Gratis' : 'Pago normal'}</Text></Flex>
                      {esEdicion && (
                        <Flex justify="space-between"><Text color="gray.500">Estado</Text><Text fontWeight="600">{activo ? 'Activo' : 'Inactivo'}</Text></Flex>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              )}
            </Dialog.Body>

            <Dialog.Footer borderTop="1px solid" borderColor="gray.100" flexShrink={0} p={4}>
              {paso > 1 ? (
                <Button variant="ghost" onClick={irAnterior}>Anterior</Button>
              ) : (
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              )}
              <Box flex={1} />
              {paso < 3 ? (
                <Button bg={AZUL} color="white" _hover={{ bg: '#0041B0' }} onClick={irSiguiente}>Siguiente</Button>
              ) : (
                <Button bg={AZUL} color="white" _hover={{ bg: '#0041B0' }} loading={guardando} onClick={guardar}>
                  {esEdicion ? 'Guardar cambios' : 'Crear usuario'}
                </Button>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default UsuarioForm
