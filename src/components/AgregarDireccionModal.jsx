// src/components/AgregarDireccionModal.jsx
import { useState } from 'react'
import {
  Dialog, Portal, Button, Input, NativeSelect, Textarea, VStack, Box, Text,
} from '@chakra-ui/react'
import { toaster } from './ui/toaster'
import MapaPicker from './MapaPicker'

const TARIFAS_DELIVERY = {
  'Valencia Norte': 1.99, 'Valencia Centro': 2.99, 'Valencia Sur': 2.99, Naguanagua: 2.99, 'San Diego': 4.99, Guacara: 7.99, 'Los Guayos': 4.99, 'Flor Amarillo': 5.99, Tocuyito: 7.99,
}
const AGENCIAS = ['MRW', 'Domesa', 'Tealca', 'Zoom']

function AgregarDireccionModal({ isOpen, onClose, tipo, guardarDireccion, onGuardada }) {
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    direccion: '',
    ciudad: 'Valencia',
    estado: 'Carabobo',
    telefono_contacto: '',
    cedula: '',
    agencia_preferida: '',
referencia: '',
    coordenadas: null,
  })

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const payload = tipo === 'delivery'
        ? { ...form, costo_delivery: TARIFAS_DELIVERY[form.ciudad] }
        : form

      const nueva = await guardarDireccion(payload)
      toaster.create({ title: 'Dirección guardada', type: 'success', duration: 2500 })
      onGuardada?.(nueva)
      onClose()
    } catch {
      toaster.create({ title: 'No se pudo guardar la dirección', type: 'error', duration: 3000 })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => { if (!e.open) onClose() }}
      size={{ base: 'full', md: 'lg' }}
      placement="center"
      closeOnInteractOutside={false}
      closeOnEscape={true}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxH={{ base: '100dvh', md: '85vh' }}
            borderRadius={{ base: 0, md: '16px' }}
            display="flex"
            flexDirection="column"
            overflow="hidden"
            bg="white"
            color="gray.900"
          >
            <Dialog.Header flexShrink={0}>
              <Dialog.Title>
                {tipo === 'delivery' ? 'Agregar dirección de delivery' : 'Agregar destino de envío nacional'}
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>

            <Dialog.Body overflowY="auto" flex="1">
              <VStack gap={4} align="stretch">
                {tipo === 'delivery' && (
  <>
    <Input
      placeholder="Nombre (Ej: Casa, Oficina)"   // 🆕 campo que faltaba
      value={form.nombre}
      onChange={set('nombre')}
      required
    />

    <NativeSelect.Root>
      <NativeSelect.Field value={form.ciudad} onChange={set('ciudad')}>
        {Object.keys(TARIFAS_DELIVERY).map((c) => (
          <option key={c} value={c}>{c} - ${TARIFAS_DELIVERY[c]}</option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>

    <Input
      placeholder="Teléfono de contacto"
      value={form.telefono_contacto}
      onChange={set('telefono_contacto')}
    />

    <Textarea
      placeholder="Dirección exacta de entrega"
      value={form.direccion}
      onChange={set('direccion')}
      rows={2}
    />

    <Input
      placeholder="Referencia (opcional)"   // 🆕
      value={form.referencia}
      onChange={set('referencia')}
    />

    <Box borderRadius="8px" overflow="hidden" h="220px">
      <MapaPicker
        onSelect={(coords) =>
          setForm((f) => ({
            ...f,
            coordenadas: coords,
            direccion: f.direccion || coords.direccion,
          }))
        }
      />
    </Box>

    <Text fontSize="sm" color="gray.500">
      Costo estimado: ${TARIFAS_DELIVERY[form.ciudad]}
    </Text>
  </>
)}

                {tipo === 'envio_nacional' && (
                  <>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={form.agencia_preferida}
                        onChange={set('agencia_preferida')}
                      >
                        <option value="">Selecciona la agencia</option>
                        {AGENCIAS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>

                    <Input placeholder="Estado" value={form.estado} onChange={set('estado')} />
                    <Input placeholder="Ciudad" value={form.ciudad} onChange={set('ciudad')} />
                    <Input
                      placeholder="Nombre de quien recibe"
                      value={form.nombre}
                      onChange={set('nombre')}
                    />
                    <Input placeholder="Cédula" value={form.cedula} onChange={set('cedula')} />
                    <Input
                      placeholder="Teléfono"
                      value={form.telefono_contacto}
                      onChange={set('telefono_contacto')}
                    />
                    <Textarea
                      placeholder="Dirección de la agencia o destino"
                      value={form.direccion}
                      onChange={set('direccion')}
                      rows={2}
                    />
                  </>
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer flexShrink={0} gap={2}>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button colorPalette="blue" onClick={handleGuardar} loading={guardando}>
                Confirmar dirección
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default AgregarDireccionModal