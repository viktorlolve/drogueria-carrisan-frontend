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
  Button,
  IconButton,
} from '@chakra-ui/react'
import { X } from 'lucide-react'
import api from '../../api/axios'
import { toaster } from '../ui/toaster'

const AZUL = '#0052DC'
const INDIGO = '#1A1A3A'

function money(n) {
  return Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function NuevoPagoModal({ clienteId, facturas, isOpen, onClose, onCreado }) {
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState('abono')
  const [detalle, setDetalle] = useState('')
  const [seleccionadas, setSeleccionadas] = useState([])
  const [guardando, setGuardando] = useState(false)

  const [prevOpen, setPrevOpen] = useState(isOpen)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) {
      setMonto('')
      setTipo('abono')
      setDetalle('')
      setSeleccionadas([])
    }
  }

  const facturasPendientes = (facturas || []).filter((f) => f.estado !== 'pagada')

  function toggleFactura(id) {
    const idStr = String(id)
    setSeleccionadas((prev) =>
      prev.includes(idStr) ? prev.filter((v) => v !== idStr) : [...prev, idStr]
    )
  }

  async function guardar() {
    if (!monto || Number(monto) <= 0) {
      toaster.create({ title: 'Ingresa un monto válido', type: 'warning' })
      return
    }
    try {
      setGuardando(true)
      await api.post('/pagos', {
        usuario_id: clienteId,
        monto: Number(monto),
        tipo,
        detalle: detalle.trim() || undefined,
        factura_ids: seleccionadas.map(Number),
      })
      toaster.create({ title: 'Pago registrado', type: 'success' })
      onCreado?.()
      onClose()
    } catch (err) {
      console.error(err)
      const msg = err?.response?.data?.error || 'No se pudo registrar el pago'
      toaster.create({ title: msg, type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} placement="center" scrollBehavior="inside">
      <Portal>
        <Dialog.Backdrop position="fixed" inset={0} bg="blackAlpha.600" zIndex={1400} />
        <Dialog.Positioner position="fixed" inset={0} display="flex" alignItems="center" justifyContent="center" p={4} zIndex={1500} overflowY="auto">
          <Dialog.Content maxW="lg" w="100%" maxH="90vh" my="auto" bg="white" borderRadius="xl" boxShadow="2xl" display="flex" flexDir="column" overflow="hidden">
            <Dialog.Header bg={INDIGO} color="white" borderTopRadius="xl" flexShrink={0} p={5}>
              <Dialog.Title>Registrar pago</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger position="absolute" top="14px" right="14px" asChild>
              <IconButton variant="ghost" size="sm" color="white" _hover={{ bg: 'whiteAlpha.300' }} aria-label="Cerrar">
                <X size={18} />
              </IconButton>
            </Dialog.CloseTrigger>
            <Dialog.Body py={5} flex="1" overflowY="auto">
              <Stack gap={4}>
                <Field.Root required>
                  <Field.Label fontSize="sm">Monto (USD)</Field.Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="sm">Tipo</Field.Label>
                  <Box
                    as="select"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    px={3}
                    py={2}
                    fontSize="sm"
                    w="100%"
                  >
                    <option value="abono">Abono</option>
                    <option value="pago_factura">Pago de factura</option>
                  </Box>
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="sm">Facturas a saldar (opcional)</Field.Label>
                  {facturasPendientes.length === 0 ? (
                    <Text fontSize="sm" color="gray.400">Este cliente no tiene facturas pendientes</Text>
                  ) : (
                    <Box maxH="200px" overflowY="auto" border="1px solid" borderColor="gray.100" borderRadius="lg" p={3}>
                      <Stack gap={2}>
                        {facturasPendientes.map((f) => (
                          <Flex as="label" key={f.id} justify="space-between" align="center" cursor="pointer" fontSize="sm">
                            <Flex align="center" gap={2}>
                              <input
                                type="checkbox"
                                checked={seleccionadas.includes(String(f.id))}
                                onChange={() => toggleFactura(f.id)}
                              />
                              <Text>Factura #{f.numero_factura || f.id}</Text>
                            </Flex>
                            <Text fontWeight="600">${money(f.monto_facturado)}</Text>
                          </Flex>
                        ))}
                      </Stack>
                    </Box>
                  )}
                  <Field.HelperText>Si marcas facturas, quedarán como pagadas al guardar.</Field.HelperText>
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="sm">Detalle (opcional)</Field.Label>
                  <Textarea placeholder="Referencia, método de pago, etc." value={detalle} onChange={(e) => setDetalle(e.target.value)} rows={2} />
                </Field.Root>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid" borderColor="gray.100" flexShrink={0} p={4}>
              <Button variant="ghost" mr={3} onClick={onClose}>Cancelar</Button>
              <Button bg={AZUL} color="white" _hover={{ bg: '#0041B0' }} loading={guardando} onClick={guardar}>
                Registrar pago
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default NuevoPagoModal
