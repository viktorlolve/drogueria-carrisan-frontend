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
import logoBlanco from '../../assets/minilogo blanco sin fondo.png'
import hero from '../../assets/hero.png'

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
    <Flex
      minH="100dvh"
      w="100%"
      position="relative"
      overflow="hidden"
      bgGradient="to-br"
      gradientFrom="#0A6E5C"
      gradientTo="#12A594"
    >
      {/* Glow decorativos del fondo teal (detrás de todo) */}
      <Box
        aria-hidden="true"
        position="absolute"
        top="-160px"
        right="-120px"
        w="460px"
        h="460px"
        rounded="full"
        bg="whiteAlpha.200"
        filter="blur(90px)"
        pointerEvents="none"
      />
      <Box
        aria-hidden="true"
        position="absolute"
        bottom="-180px"
        left="-140px"
        w="520px"
        h="520px"
        rounded="full"
        bg="blackAlpha.300"
        filter="blur(100px)"
        pointerEvents="none"
      />
      <Box
        aria-hidden="true"
        position="absolute"
        top="38%"
        left="28%"
        w="380px"
        h="380px"
        rounded="full"
        bg="teal.200"
        opacity="0.18"
        filter="blur(100px)"
        pointerEvents="none"
      />

      {/* ---------- Panel de branding — solo desktop (lg+) ---------- */}
      <Box
        display={{ base: 'none', lg: 'flex' }}
        flex="1"
        flexDirection="column"
        bg="transparent"
        color="white"
        px={{ lg: 14, xl: 20 }}
        py={{ lg: 10, xl: 14 }}
        position="relative"
        overflowY="auto"
      >
        {/* Glow decorativo */}
        <Box
          aria-hidden="true"
          position="absolute"
          top="-120px"
          right="-120px"
          w="380px"
          h="380px"
          rounded="full"
          bg="whiteAlpha.200"
          filter="blur(80px)"
          pointerEvents="none"
        />

        {/* Marca */}
        <Flex align="center" gap={3}>
          <Box bg="whiteAlpha.200" p={2} rounded="xl" lineHeight="0">
            <img src={logoBlanco} alt="Drogueria Carrisan" style={{ height: 34 }} />
          </Box>
          <Box>
            <Text fontWeight="800" fontSize="lg" lineHeight="1.1">
              Drogueria Carrisan
            </Text>
            <Text fontSize="xs" color="whiteAlpha.700">
              Plataforma interna del personal
            </Text>
          </Box>
        </Flex>

        {/* Mensaje + features + imagen */}
        <Box flex="1" maxW="460px" my={{ lg: 8, xl: 10 }}>
          <Text
            fontSize="xs"
            fontWeight="700"
            letterSpacing="2px"
            textTransform="uppercase"
            color="whiteAlpha.700"
          >
            Panel B2B farmacéutico
          </Text>
          <Heading as="h2" size="2xl" fontWeight="800" mt={3} lineHeight="1.15">
            Tu jornada de trabajo, en un solo lugar
          </Heading>
          <Text mt={3} fontSize="sm" color="whiteAlpha.800">
            Gestioná pedidos, aprobaciones de almacén, despachos y finanzas desde una única
            plataforma segura.
          </Text>

          <Stack mt={6} gap={2.5}>
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

          <Box
            mt={8}
            rounded="2xl"
            overflow="hidden"
            border="1px solid"
            borderColor="whiteAlpha.300"
            shadow="dark-lg"
          >
            {/* IMAGEN: hero.png como foto decorativa del sector farmacéutico.
                Si querés otra, reemplazá la importación o la ruta src={hero}. */}
            <img
              src={hero}
              alt=""
              aria-hidden="true"
              style={{ width: '100%', height: 210, objectFit: 'cover', display: 'block' }}
            />
          </Box>
        </Box>

        <Text fontSize="xs" color="whiteAlpha.600">
          © 2026 Drogueria Carrisan · Valencia, Venezuela
        </Text>
      </Box>

      {/* ---------- Panel del formulario (fondo teal de la página a través) ---------- */}
      <Flex
        flex="1"
        position="relative"
        align="center"
        justify="center"
        p={{ base: 4, md: 8 }}
        minH="100dvh"
        bg="transparent"
        overflow="hidden"
      >
        {/* Glows decorativos sobre el fondo */}
        <Box
          aria-hidden="true"
          position="absolute"
          top="-100px"
          right="-100px"
          w="300px"
          h="300px"
          rounded="full"
          bg="whiteAlpha.200"
          filter="blur(70px)"
          pointerEvents="none"
          display={{ lg: 'none' }}
        />
        <Box
          aria-hidden="true"
          position="absolute"
          bottom="-140px"
          left="-140px"
          w="360px"
          h="360px"
          rounded="full"
          bg="teal.200"
          opacity="0.25"
          filter="blur(90px)"
          pointerEvents="none"
        />

        <Card.Root
          w="100%"
          maxW="md"
          bg="rgba(255, 255, 255, 0.82)"
          style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          rounded="3xl"
          position="relative"
          boxShadow={{
            base: '0 24px 48px rgba(2, 12, 32, 0.35)',
            md: '0 24px 56px rgba(4, 62, 50, 0.38)',
          }}
          border="1px solid"
          borderColor="whiteAlpha.500"
        >
          <Card.Body p={{ base: 6, md: 8 }} display="flex" flexDirection="column" gap={5}>
            {/* Logo (se mantiene el enlace original) */}
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