import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  Field,
  Flex,
  Heading,
  Input,
  Separator,
  Stack,
  Text,
} from '@chakra-ui/react'
import { ShieldCheck, ClipboardCheck, Truck, Lock } from 'lucide-react'
import { useStaffAuth } from '../../context/StaffAuthContext'
import logo from '../../assets/minilogo color sin fondo.png'

/* Paleta de marca */
const TEAL = '#12A594'
const VERDE_STAFF = '#0D9373'
const GRIS_OSCURO = '#232B45'

/* Puntos destacados del panel de branding (desktop) */
const PANEL_FEATURES = [
  { icon: ClipboardCheck, texto: 'Pedidos, aprobaciones y despachos' },
  { icon: Truck, texto: 'Contabilidad, facturación y cobranza' },
  { icon: ShieldCheck, texto: 'Acceso seguro por rol y departamento' },
]

function StaffLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const { loginStaff } = useStaffAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sesionExpirada = searchParams.get('expirado') === '1'

  async function handleIngresar(e) {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      await loginStaff(email.trim().toLowerCase(), password)
      navigate('/staff/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Correo o contraseña incorrectos')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Flex minH="100dvh" w="100%" bg="#FBFAF7">
      {/* ---------- Panel de branding — solo desktop (lg+) ---------- */}
      <Box
        display={{ base: 'none', lg: 'flex' }}
        flex="0 0 44%"
        maxW="560px"
        flexDirection="column"
        justifyContent="space-between"
        bg="linear-gradient(165deg, #0A3A30 0%, #12A594 100%)"
        color="white"
        px={{ lg: 12, xl: 16 }}
        py={{ lg: 12, xl: 14 }}
        position="relative"
        overflow="hidden"
      >
        {/* Glows decorativos — sutiles, dos como máximo */}
        <Box
          aria-hidden="true"
          position="absolute"
          top="-140px"
          right="-160px"
          w="420px"
          h="420px"
          rounded="full"
          bg="whiteAlpha.150"
          filter="blur(90px)"
          pointerEvents="none"
        />
        <Box
          aria-hidden="true"
          position="absolute"
          bottom="-160px"
          left="-120px"
          w="360px"
          h="360px"
          rounded="full"
          bg="blackAlpha.300"
          filter="blur(90px)"
          pointerEvents="none"
        />

        {/* Marca */}
        <Flex align="center" gap={3} position="relative" zIndex={1}>
          <Flex
            align="center"
            justify="center"
            w="44px"
            h="44px"
            bg="white"
            rounded="xl"
            flexShrink={0}
          >
            <img src={logo} alt="Drogueria Carrisan" style={{ height: 24 }} />
          </Flex>
          <Box>
            <Text fontWeight="800" fontSize="md" lineHeight="1.15">
              Drogueria Carrisan
            </Text>
            <Text fontSize="xs" color="whiteAlpha.700">
              Plataforma interna del personal
            </Text>
          </Box>
        </Flex>

        {/* Mensaje + features + gráfico abstracto */}
        <Box position="relative" zIndex={1} maxW="400px">
          <Text
            fontSize="xs"
            fontWeight="700"
            letterSpacing="1.5px"
            textTransform="uppercase"
            color="whiteAlpha.700"
          >
            Panel B2B farmacéutico
          </Text>
          <Heading as="h2" size="2xl" fontWeight="800" mt={3} lineHeight="1.18" letterSpacing="-0.5px">
            Tu jornada de trabajo, en un solo lugar
          </Heading>
          <Text mt={3} fontSize="sm" color="whiteAlpha.800">
            Gestioná pedidos, aprobaciones de almacén, despachos y finanzas desde una única
            plataforma segura.
          </Text>

          {/* Gráfico abstracto: cola de despacho */}
          <Flex mt={7} gap={2.5} align="flex-end" h="72px">
            <Box flex="1" h="46%" rounded="lg" bg="whiteAlpha.150" />
            <Box flex="1" h="72%" rounded="lg" bg="whiteAlpha.250" />
            <Box flex="1" h="100%" rounded="lg" bg="white" opacity={0.92} />
            <Box flex="1" h="64%" rounded="lg" bg="whiteAlpha.250" />
            <Box flex="1" h="38%" rounded="lg" bg="whiteAlpha.150" />
          </Flex>

          <Stack mt={7} gap={2.5}>
            {PANEL_FEATURES.map(({ icon: Icono, texto }) => (
              <Flex key={texto} align="center" gap={2.5} color="whiteAlpha.900">
                <Box
                  as="span"
                  display="inline-flex"
                  p={1.5}
                  rounded="lg"
                  bg="whiteAlpha.200"
                  color="white"
                >
                  <Icono size={15} />
                </Box>
                <Text fontSize="sm">{texto}</Text>
              </Flex>
            ))}
          </Stack>
        </Box>

        <Text fontSize="xs" color="whiteAlpha.600" position="relative" zIndex={1}>
          © 2026 Drogueria Carrisan · Valencia, Venezuela
        </Text>
      </Box>

      {/* ---------- Panel del formulario (fondo blanco sobrio) ---------- */}
      <Flex flex="1" align="center" justify="center" p={{ base: 5, md: 8 }} minH="100dvh">
        <Card.Root
          w="100%"
          maxW="md"
          bg="white"
          rounded="2xl"
          border="1px solid"
          borderColor="gray.200"
          boxShadow="0 8px 28px rgba(15, 23, 42, 0.06)"
        >
          <Card.Body p={{ base: 6, md: 8 }} display="flex" flexDirection="column" gap={5}>
            {/* Logo */}
            <Flex justify="center">
              <Link to="/staff/login" aria-label="Ir al panel del personal">
                <img
                  src={logo}
                  alt="Drogueria Carrisan"
                  style={{ height: 44, width: 'auto', objectFit: 'contain' }}
                />
              </Link>
            </Flex>

            {/* Título y subtítulo */}
            <Box textAlign="center">
              <Heading as="h1" size="lg" fontWeight="800" color={GRIS_OSCURO}>
                Acceso de personal interno
              </Heading>
              <Text mt={1.5} fontSize="sm" color="gray.500">
                Vendedores, despachadores, almacenistas y administración.
              </Text>
            </Box>

            {/* Aviso de sesión expirada */}
            {sesionExpirada && (
              <Alert.Root
                status="warning"
                role="status"
                rounded="lg"
                bg="orange.50"
                border="1px solid"
                borderColor="orange.200"
              >
                <Alert.Indicator color="orange.500" />
                <Alert.Content>
                  <Alert.Title fontSize="sm" color="orange.800">
                    Tu sesión expiró. Iniciá sesión de nuevo para continuar.
                  </Alert.Title>
                </Alert.Content>
              </Alert.Root>
            )}

            {/* Error de login */}
            {error && (
              <Alert.Root
                status="error"
                role="alert"
                rounded="lg"
                bg="red.50"
                border="1px solid"
                borderColor="red.200"
              >
                <Alert.Indicator color="red.500" />
                <Alert.Content>
                  <Alert.Title fontSize="sm" color="red.700">
                    {error}
                  </Alert.Title>
                </Alert.Content>
              </Alert.Root>
            )}

            {/* Formulario */}
            <form onSubmit={handleIngresar}>
              <Stack gap={4}>
                <Field.Root required>
                  <Field.Label
                    htmlFor="staff-email"
                    fontSize="sm"
                    fontWeight="600"
                    color={GRIS_OSCURO}
                  >
                    Correo electrónico <Field.RequiredIndicator color="red.400" />
                  </Field.Label>
                  <Input
                    id="staff-email"
                    type="email"
                    size="lg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    placeholder="tu@correo.com"
                    required
                    bg="white"
                    borderColor="gray.200"
                    _focus={{ borderColor: VERDE_STAFF, boxShadow: `0 0 0 1px ${VERDE_STAFF}` }}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label
                    htmlFor="staff-password"
                    fontSize="sm"
                    fontWeight="600"
                    color={GRIS_OSCURO}
                  >
                    Contraseña <Field.RequiredIndicator color="red.400" />
                  </Field.Label>
                  <Input
                    id="staff-password"
                    type="password"
                    size="lg"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    bg="white"
                    borderColor="gray.200"
                    _focus={{ borderColor: VERDE_STAFF, boxShadow: `0 0 0 1px ${VERDE_STAFF}` }}
                  />
                </Field.Root>

                <Button
                  type="submit"
                  w="100%"
                  size="lg"
                  mt={1}
                  bgGradient="linear-gradient(135deg, #0D9373 0%, #12A594 100%)"
                  color="white"
                  fontWeight="700"
                  _hover={{
                    bgGradient: 'linear-gradient(135deg, #0C8268 0%, #0FA688 100%)',
                  }}
                  _active={{
                    bgGradient: 'linear-gradient(135deg, #0B6F5B 0%, #0D9373 100%)',
                  }}
                  loading={cargando}
                  loadingText="Ingresando..."
                >
                  Ingresar
                </Button>
              </Stack>
            </form>

            {/* Footer discreto */}
            <Separator borderColor="gray.100" />
            <Box textAlign="center" fontSize="sm" color="gray.500">
              ¿No tenés acceso?{' '}
              <Link to="/staff/registro" style={{ color: TEAL, fontWeight: 600 }}>
                Registrate con tu código
              </Link>
            </Box>
            <Box textAlign="center" fontSize="xs" color="gray.400">
              ¿No sos personal?{' '}
              <Link to="/login" style={{ color: TEAL, fontWeight: 600 }}>
                Ir al login de clientes
              </Link>
            </Box>
            <Flex align="center" justify="center" gap={1.5} color="gray.400" fontSize="xs">
              <Lock size={12} aria-hidden="true" />
              <Text>Acceso restringido · Uso interno — Drogueria Carrisan</Text>
            </Flex>
          </Card.Body>
        </Card.Root>
      </Flex>
    </Flex>
  )
}

export default StaffLogin