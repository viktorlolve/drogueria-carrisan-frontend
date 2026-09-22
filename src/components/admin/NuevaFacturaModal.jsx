import { useState, useEffect } from 'react'
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
  Spinner,
} from '@chakra-ui/react'
import { X } from 'lucide-react'
import api from '../../api/axios'
import { toaster } from '../ui/toaster'

const AZUL = '#0052DC'
const INDIGO = '#1A1A3A'

function money(n) {
  return Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function NuevaFacturaModal({ clienteId, isOpen, onClose, onCreada }) {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccionadas, setSeleccionadas] = useState([])
  const [numeroFactura, setNumeroFactura] = useState('')
  const [montoManual, setMontoManual] = useState('')
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [prevOpen, setPrevOpen] = useState(isOpen)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) {
      setSeleccionadas([])
      setNumeroFactura('')
      setMontoManual('')
      setNota('')
      setCargando(true)
    }
  }

  useEffect(() => {
    if (!isOpen || !clienteId) return
    let activo = true
    api.get(`/facturas/sin-facturar/${clienteId}`)
      .then(({ data }) => {
        if (activo) setOrdenes(data)
      })
      .catch((err) => {
        if (!activo) return
        console.error(err)
        toaster.create({ title: 'No se pudieron cargar las órdenes sin facturar', type: 'error' })
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [isOpen, clienteId])

  function toggleOrden(id) {
    const idStr = String(id)
    setSeleccionadas((prev) =>
      prev.includes(idStr) ? prev.filter((v) => v !== idStr) : [...prev, idStr]
    )
  }

  const totalSeleccionado = ordenes
    .filter((o) => seleccionadas.includes(String(o.id)))
    .reduce((sum, o) => sum + Number(o.total_usd || 0), 0)

  const montoFinal = montoManual !== '' ? Number(montoManual) : totalSeleccionado

  async function guardar() {
    if (!numeroFactura.trim()) {
      toaster.create({ title: 'Ingresa el número de factura', type: 'warning' })
      return
    }
    if (!montoFinal || montoFinal <= 0) {
      toaster.create({ title: 'El monto facturado debe ser mayor a 0', type: 'warning' })
      return
    }
    try {
      setGuardando(true)
      await api.post('/facturas', {
        usuario_id: clienteId,
        numero_factura: numeroFactura.trim(),
        monto_facturado: montoFinal,
        nota: nota.trim() || undefined,
        orden_ids: seleccionadas.map(Number),
      })
      toaster.create({ title: 'Factura registrada', type: 'success' })
      onCreada?.()
      onClose()
    } catch (err) {
      console.error(err)
      const msg = err?.response?.data?.error || 'No se pudo registrar la factura'
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
              <Dialog.Title>Registrar factura</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger position="absolute" top="14px" right="14px" asChild>
              <IconButton variant="ghost" size="sm" color="white" _hover={{ bg: 'whiteAlpha.300' }} aria-label="Cerrar">
                <X size={18} />
              </IconButton>
            </Dialog.CloseTrigger>
            <Dialog.Body py={5} flex="1" overflowY="auto">
              <Stack gap={4}>
                <Field.Root required>
                  <Field.Label fontSize="sm">Número de factura</Field.Label>
                  <Input
                    placeholder="Ej: 00123"
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="sm">Órdenes a incluir (opcional)</Field.Label>
                  {cargando ? (
                    <Flex justify="center" py={4}><Spinner size="sm" color={AZUL} /></Flex>
                  ) : ordenes.length === 0 ? (
                    <Text fontSize="sm" color="gray.400">Este cliente no tiene órdenes sin facturar</Text>
                  ) : (
                    <Box maxH="220px" overflowY="auto" border="1px solid" borderColor="gray.100" borderRadius="lg" p={3}>
                      <Stack gap={2}>
                        {ordenes.map((o) => (
                          <Flex
                            as="label"
                            key={o.id}
                            justify="space-between"
                            align="center"
                            cursor="pointer"
                            fontSize="sm"
                          >
                            <Flex align="center" gap={2}>
                              <input
                                type="checkbox"
                                checked={seleccionadas.includes(String(o.id))}
                                onChange={() => toggleOrden(o.id)}
                              />
                              <Text>Orden #{o.id} · {o.forma_pago}</Text>
                            </Flex>
                            <Text fontWeight="600">${money(o.total_usd)}</Text>
                          </Flex>
                        ))}
                      </Stack>
                    </Box>
                  )}
                  <Field.HelperText>Puedes dejarlo vacío si es una factura sin órdenes web (ej. pedido telefónico).</Field.HelperText>
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="sm">Monto facturado (USD)</Field.Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={montoManual !== '' ? montoManual : (totalSeleccionado || '')}
                    onChange={(e) => setMontoManual(e.target.value)}
                  />
                  <Field.HelperText>
                    Se autocompleta con la suma de las órdenes seleccionadas (${money(totalSeleccionado)}). Puedes editarlo.
                  </Field.HelperText>
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="sm">Nota (opcional)</Field.Label>
                  <Textarea placeholder="Referencia interna..." value={nota} onChange={(e) => setNota(e.target.value)} rows={2} />
                </Field.Root>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid" borderColor="gray.100" flexShrink={0} p={4}>
              <Button variant="ghost" mr={3} onClick={onClose}>Cancelar</Button>
              <Button bg={AZUL} color="white" _hover={{ bg: '#0041B0' }} loading={guardando} onClick={guardar}>
                Registrar factura
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default NuevaFacturaModal
