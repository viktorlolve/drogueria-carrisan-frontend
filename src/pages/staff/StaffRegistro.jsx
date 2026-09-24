import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Alert,
  Badge,
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
import {
  ShieldCheck,
  ClipboardCheck,
  Truck,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react'
import TurnstileWidget from '../../components/registro/TurnstileWidget'
import { validarEmail, validarPassword } from '../../utils/validadores'
import { useStaffAuth } from '../../context/StaffAuthContext'
import api from '../../api/axios'
import staffApi from '../../api/staffAxios'
import logo from '../../assets/minilogo color sin fondo.png'

/* Paleta de marca (staff = teal, no azul de cliente) */
const TEAL = '#12A594'
const VERDE_STAFF = '#0D9373'
const GRIS_OSCURO = '#232B45'

/* Puntos destacados del panel de branding (desktop) — mismos que StaffLogin,
   para que login y registro de personal se sientan la misma plataforma. */
const PANEL_FEATURES = [
  { icon: ClipboardCheck, texto: 'Pedidos, aprobaciones y despachos' },
  { icon: Truck, texto: 'Contabilidad, facturación y cobranza' },
  { icon: ShieldCheck, texto: 'Acceso seguro por rol y departamento' },
]

const ROLES_STAFF = {
  vendedor: 'Vendedor',
  despachador: 'Despachador',
  almacenista: 'Almacenista',
  contabilidad: 'Contabilidad',
  administrador: 'Administrador',
  director: 'Director',
  admin: 'Administrador',
}

function StaffRegistro() {
  const navigate = useNavigate()
  const { iniciarSesionConDatos } = useStaffAuth()

  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [codigoValido, setCodigoValido] = useState(false)
  const [rolAsignado, setRolAsignado] = useState(null)
  const [errorCodigo, setErrorCodigo] = useState('')

  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)

  function calcularFuerzaPassword(pw) {
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[a-z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++

    if (score <= 1) return { width: '20%', color: '#e53e3e', label: 'Débil' }
    if (score <= 3) return { width: '60%', color: '#dd6b20', label: 'Media' }
    if (score === 4) return { width: '80%', color: '#38a169', label: 'Fuerte' }
    return { width: '100%', color: '#276749', label: 'Muy fuerte' }
  }

  async function verificarCodigo(e) {
    e.preventDefault()
    const limpio = codigo.trim().toUpperCase()
    if (!limpio) {
      setErrorCodigo('Ingresa tu código de invitación')
      return
    }

    setErrorCodigo('')
    setVerificando(true)
    try {
      const { data } = await api.post('/auth/verificar-codigo', { codigo: limpio, tipo: 'staff' })
      setCodigoValido(true)
      setRolAsignado(data.rol_staff || null)
    } catch (err) {
      setErrorCodigo(err.response?.data?.error || 'No se pudo verificar el código')
    } finally {
      setVerificando(false)
    }
  }

  function volverAlCodigo() {
    setCodigoValido(false)
    setRolAsignado(null)
    setErrorGeneral('')
  }

  function validarFormulario() {
    const nuevosErrores = {}
    if (!validarEmail(email)) nuevosErrores.email = 'Ingresa un correo válido'
    if (!nombre.trim()) nuevosErrores.nombre = 'Campo requerido'
    const pwCheck = validarPassword(password)
    if (!pwCheck.valido) nuevosErrores.password = pwCheck.error
    if (password !== confirmarPassword) nuevosErrores.confirmarPassword = 'Las contraseñas no coinciden'
    if (!turnstileToken) nuevosErrores.turnstile = 'Completa la verificación de seguridad'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorGeneral('')
    if (!validarFormulario()) {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setCargando(true)
    try {
      const { data } = await staffApi.post('/staff/registro', {
        email: email.trim().toLowerCase(),
        nombre: nombre.trim(),
        password,
        codigo: codigo.trim().toUpperCase(),
        turnstileToken,
      })
      // Auto-login: el backend devuelve token + staff, igual que /staff/login.
      iniciarSesionConDatos(data)
      navigate('/staff/dashboard')
    } catch (err) {
      setErrorGeneral(err.response?.data?.error || 'No se pudo completar el registro. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  const fuerzaPassword = calcularFuerzaPassword(password)

  const pieCard = (
    <>
      <Separator borderColor="gray.100" />
      <Box textAlign="center" fontSize="sm" color="gray.500">
        ¿Ya tenés acceso?{' '}
        <Link to="/staff/login" style={{ color: TEAL, fontWeight: 600 }}>
          Iniciá sesión
        </Link>
      </Box>
      <Flex align="center" justify="center" gap={1.5} color="gray.400" fontSize="xs">
        <Lock size={12} aria-hidden="true" />
        <Text>Acceso restringido · Uso interno — Drogueria Carrisan</Text>
      </Flex>
    </>
  )

  return (
    <Flex minH="100dvh" w="100%" bg="#FBFAF7">
      {/* ---------- Panel de branding — solo desktop (lg+), igual que StaffLogin ---------- */}
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

      {/* ---------- Panel del formulario (fondo blanco sobrio, sin glass) ---------- */}
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
            <Flex justify="center">
              <Link to="/staff/login" aria-label="Ir al panel del personal">
                <img
                  src={logo}
                  alt="Drogueria Carrisan"
                  style={{ height: 44, width: 'auto', objectFit: 'contain' }}
                />
              </Link>
            </Flex>

            {!codigoValido ? (
              <>
                <Box textAlign="center">
                  <Heading as="h1" size="lg" fontWeight="800" color={GRIS_OSCURO}>
                    Código de invitación
                  </Heading>
                  <Text mt={1.5} fontSize="sm" color="gray.500">
                    El registro de personal es exclusivo para quienes tienen un código
                    generado por la administración. Ingresá el código que te compartieron.
                  </Text>
                </Box>

                <Flex
                  gap={2.5}
                  p={3}
                  rounded="lg"
                  bg="teal.50"
                  border="1px solid"
                  borderColor="teal.200"
                >
                  <Box color={TEAL} flexShrink={0} mt="1px">
                    <KeyRound size={16} />
                  </Box>
                  <Text fontSize="sm" color="gray.600">
                    El código es personal e intransferible. Si no tenés uno, solicitá el
                    acceso con tu líder o con la administración.
                  </Text>
                </Flex>

                <form onSubmit={verificarCodigo}>
                  <Stack gap={4}>
                    <Field.Root required invalid={!!errorCodigo}>
                      <Field.Label
                        htmlFor="codigo"
                        fontSize="sm"
                        fontWeight="600"
                        color={GRIS_OSCURO}
                      >
                        Código de invitación <Field.RequiredIndicator color="red.400" />
                      </Field.Label>
                      <Input
                        id="codigo"
                        size="lg"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        placeholder="Ej: ABC123"
                        autoFocus
                        bg="white"
                        borderColor="gray.200"
                        invalid={!!errorCodigo}
                        _focus={{ borderColor: VERDE_STAFF, boxShadow: `0 0 0 1px ${VERDE_STAFF}` }}
                      />
                      {errorCodigo && (
                        <Field.ErrorText fontSize="sm" role="alert">
                          {errorCodigo}
                        </Field.ErrorText>
                      )}
                    </Field.Root>

                    <Button
                      type="submit"
                      w="100%"
                      size="lg"
                      mt={1}
                      bgGradient="linear-gradient(135deg, #0D9373 0%, #12A594 100%)"
                      color="white"
                      fontWeight="700"
                      _hover={{ bgGradient: 'linear-gradient(135deg, #0C8268 0%, #0FA688 100%)' }}
                      _active={{ bgGradient: 'linear-gradient(135deg, #0B6F5B 0%, #0D9373 100%)' }}
                      loading={verificando}
                      loadingText="Verificando..."
                    >
                      Verificar código
                    </Button>
                  </Stack>
                </form>
              </>
            ) : (
              <>
                <Box textAlign="center">
                  <Heading as="h1" size="lg" fontWeight="800" color={GRIS_OSCURO}>
                    Completa tu registro
                  </Heading>
                  <Text mt={1.5} fontSize="sm" color="gray.500">
                    Código verificado — ya podés completar tus datos
                  </Text>
                </Box>

                <Flex
                  align="center"
                  justify="space-between"
                  gap={3}
                  p={3}
                  rounded="lg"
                  bg="teal.50"
                  border="1px solid"
                  borderColor="teal.200"
                >
                  <Flex align="center" gap={2.5} minW="0">
                    <Badge
                      bg={TEAL}
                      color="white"
                      rounded="md"
                      px={2.5}
                      py={1}
                      fontWeight="700"
                      textTransform="none"
                      fontSize="xs"
                      flexShrink={0}
                    >
                      {ROLES_STAFF[rolAsignado] || rolAsignado || 'Personal'}
                    </Badge>
                    <Text fontSize="sm" color="gray.600" isTruncated>
                      Rol asignado
                    </Text>
                  </Flex>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={volverAlCodigo}
                    color={VERDE_STAFF}
                    fontWeight="600"
                    flexShrink={0}
                    px={2}
                  >
                    Cambiar código
                  </Button>
                </Flex>

                {errorGeneral && (
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
                        {errorGeneral}
                      </Alert.Title>
                    </Alert.Content>
                  </Alert.Root>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <Stack gap={4}>
                    <Field.Root required invalid={!!errores.email}>
                      <Field.Label
                        htmlFor="email"
                        fontSize="sm"
                        fontWeight="600"
                        color={GRIS_OSCURO}
                      >
                        Correo electrónico (para iniciar sesión){' '}
                        <Field.RequiredIndicator color="red.400" />
                      </Field.Label>
                      <Input
                        id="email"
                        type="email"
                        size="lg"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        autoFocus
                        bg="white"
                        borderColor="gray.200"
                        invalid={!!errores.email}
                        _focus={{ borderColor: VERDE_STAFF, boxShadow: `0 0 0 1px ${VERDE_STAFF}` }}
                      />
                      {errores.email && (
                        <Field.ErrorText fontSize="sm" role="alert">
                          {errores.email}
                        </Field.ErrorText>
                      )}
                    </Field.Root>

                    <Field.Root required invalid={!!errores.nombre}>
                      <Field.Label
                        htmlFor="nombre"
                        fontSize="sm"
                        fontWeight="600"
                        color={GRIS_OSCURO}
                      >
                        Nombre completo <Field.RequiredIndicator color="red.400" />
                      </Field.Label>
                      <Input
                        id="nombre"
                        size="lg"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        autoComplete="name"
                        placeholder="Ej: María Pérez"
                        bg="white"
                        borderColor="gray.200"
                        invalid={!!errores.nombre}
                        _focus={{ borderColor: VERDE_STAFF, boxShadow: `0 0 0 1px ${VERDE_STAFF}` }}
                      />
                      {errores.nombre && (
                        <Field.ErrorText fontSize="sm" role="alert">
                          {errores.nombre}
                        </Field.ErrorText>
                      )}
                    </Field.Root>

                    <Field.Root required invalid={!!errores.password}>
                      <Field.Label
                        htmlFor="password"
                        fontSize="sm"
                        fontWeight="600"
                        color={GRIS_OSCURO}
                      >
                        Contraseña <Field.RequiredIndicator color="red.400" />
                      </Field.Label>
                      <Box position="relative">
                        <Input
                          id="password"
                          type={mostrarPassword ? 'text' : 'password'}
                          size="lg"
                          pr="3rem"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder="Mínimo 8 caracteres con letras y números"
                          bg="white"
                          borderColor="gray.200"
                          invalid={!!errores.password}
                          _focus={{ borderColor: VERDE_STAFF, boxShadow: `0 0 0 1px ${VERDE_STAFF}` }}
                        />
                        <Button
                          type="button"
                          onClick={() => setMostrarPassword((v) => !v)}
                          aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          position="absolute"
                          top="50%"
                          right="1"
                          transform="translateY(-50%)"
                          variant="ghost"
                          size="sm"
                          color="gray.500"
                          h="auto"
                          p={1}
                          _hover={{ color: VERDE_STAFF, bg: 'transparent' }}
                        >
                          {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                      </Box>

                      {password && (
                        <Box mt={2}>
                          <Box h="1.5" rounded="full" bg="gray.100" overflow="hidden">
                            <Box
                              h="100%"
                              rounded="full"
                              style={{ width: fuerzaPassword.width, background: fuerzaPassword.color }}
                            />
                          </Box>
                          <Text
                            fontSize="xs"
                            fontWeight="600"
                            mt={1}
                            color={fuerzaPassword.color}
                            role="status"
                          >
                            {fuerzaPassword.label}
                          </Text>
                        </Box>
                      )}

                      {errores.password && (
                        <Field.ErrorText fontSize="sm" role="alert">
                          {errores.password}
                        </Field.ErrorText>
                      )}
                    </Field.Root>

                    <Field.Root required invalid={!!errores.confirmarPassword}>
                      <Field.Label
                        htmlFor="confirmarPassword"
                        fontSize="sm"
                        fontWeight="600"
                        color={GRIS_OSCURO}
                      >
                        Confirmar contraseña <Field.RequiredIndicator color="red.400" />
                      </Field.Label>
                      <Box position="relative">
                        <Input
                          id="confirmarPassword"
                          type={mostrarConfirmar ? 'text' : 'password'}
                          size="lg"
                          pr="3rem"
                          value={confirmarPassword}
                          onChange={(e) => setConfirmarPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder="Repite la contraseña"
                          bg="white"
                          borderColor="gray.200"
                          invalid={!!errores.confirmarPassword}
                          _focus={{ borderColor: VERDE_STAFF, boxShadow: `0 0 0 1px ${VERDE_STAFF}` }}
                        />
                        <Button
                          type="button"
                          onClick={() => setMostrarConfirmar((v) => !v)}
                          aria-label={mostrarConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          position="absolute"
                          top="50%"
                          right="1"
                          transform="translateY(-50%)"
                          variant="ghost"
                          size="sm"
                          color="gray.500"
                          h="auto"
                          p={1}
                          _hover={{ color: VERDE_STAFF, bg: 'transparent' }}
                        >
                          {mostrarConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                      </Box>
                      {errores.confirmarPassword && (
                        <Field.ErrorText fontSize="sm" role="alert">
                          {errores.confirmarPassword}
                        </Field.ErrorText>
                      )}
                    </Field.Root>

                    <Box>
                      <Box display="flex" justifyContent="center" mx="auto" mt={1} mb={1}>
                        <TurnstileWidget onVerificado={setTurnstileToken} onExpirado={() => setTurnstileToken('')} />
                      </Box>
                      {errores.turnstile && (
                        <Text fontSize="sm" color="red.600" role="alert">
                          {errores.turnstile}
                        </Text>
                      )}
                    </Box>

                    <Button
                      type="submit"
                      w="100%"
                      size="lg"
                      mt={1}
                      bgGradient="linear-gradient(135deg, #0D9373 0%, #12A594 100%)"
                      color="white"
                      fontWeight="700"
                      _hover={{ bgGradient: 'linear-gradient(135deg, #0C8268 0%, #0FA688 100%)' }}
                      _active={{ bgGradient: 'linear-gradient(135deg, #0B6F5B 0%, #0D9373 100%)' }}
                      loading={cargando}
                      loadingText="Creando cuenta..."
                    >
                      Crear cuenta
                    </Button>
                  </Stack>
                </form>
              </>
            )}

            {pieCard}
          </Card.Body>
        </Card.Root>
      </Flex>
    </Flex>
  )
}

export default StaffRegistro