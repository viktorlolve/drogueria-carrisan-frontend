# AGENTS.md — Frontend (drogueria-carrisan-frontend)

## Comandos

```bash
npm run dev      # Desarrollo (Vite en localhost:5173)
npm run build    # Build de produccion
npm run lint     # ESLint
npm run preview  # Preview del build
```

## Stack

- React 19 + React Router 7 (BrowserRouter)
- Vite 8 + vite-plugin-pwa (service worker con injectManifest)
- Chakra UI v3 (parcial, no todo el proyecto lo usa)
- Axios para HTTP (configurado en src/api/axios.js)
- JWT auth via localStorage
- Leaflet para mapas
- Recharts para graficos/analytics
- jsPDF + jspdf-autotable para PDFs de facturas/reportes
- xlsx para exportar Excel
- @dnd-kit para drag-and-drop (orden de prioridades, etc.)

## Estructura src/

```
src/
├── api/
│   ├── axios.js              # Instancia de Axios del CLIENTE (token localStorage 'token')
│   └── staffAxios.js         # Instancia de Axios del STAFF (token localStorage 'staff_token') — sesion separada
├── assets/                   # Imagenes, logos, favicon
├── components/               # Componentes reutilizables
│   ├── admin/                # Componentes del panel admin (~33 archivos)
│   ├── icons/                # Iconos custom
│   ├── paginas-principales/  # Layouts de navegacion
│   ├── registro/             # Stepper, Selectores de estado/ciudad, SubidaArchivos
│   ├── ui/                   # Wrappers de Chakra UI (provider, toaster, tooltip)
│   └── PrivateRouteStaff.jsx # Guard de staff: sesion staff + rolesPermitidos opcional
├── config/empresa.js         # Datos estaticos de la empresa
├── context/                  # React Contexts
│   ├── AuthContext.jsx        # CLIENTE: JWT + sesion + expiracion (user.es_admin)
│   ├── StaffAuthContext.jsx   # STAFF: JWT + sesion separada (staff.rol)
│   ├── CartContext.jsx        # Carrito de compras
│   ├── EnvioContext.jsx       # Gestion de envios/direcciones
│   ├── FavoritosContext.jsx   # Lista de favoritos
│   ├── NavBadgesContext.jsx   # Conteos del nav de cliente (GET /nav/badges, poll 60s, pausa con pestaña oculta)
│   └── LoadingBarContext.jsx  # Barra de carga superior
├── hooks/                    # Custom hooks (useEsMobile, usePush)
├── pages/                    # Paginas (~50+ archivos)
│   └── staff/                # StaffLogin, StaffRegistro, StaffDashboard (panel sin sidebar), StaffDepartamento (hub), StaffPedidos, StaffEnvios, StaffOrdenes, StaffSolicitudes, StaffPresupuestos, StaffFacturacion, StaffCuentasPorCobrar, StaffOrdenesPorCancelar, StaffCredito, StaffTesoreria, StaffReportesFinancieros, StaffClientes, StaffClienteFicha, StaffChat, StaffCupones, StaffPromociones, StaffPrecios, StaffDirecciones, StaffModuloPlaceholder (+ CSS por página)
├── utils/                    # Helpers (validadores, generadores de PDF, etc.)
├── App.jsx                   # Router principal (Routes)
├── main.jsx                  # Entry point (BrowserRouter + Provider Chakra)
└── sw.js                     # Service worker para PWA
```

## Arquitectura de componentes

### Contexts — Providers en App.jsx (orden de anidamiento)
1. AuthProvider — CLIENTE: JWT, login/logout, user state (user.es_admin)
2. StaffAuthProvider — STAFF: sesion interna separada (staff.rol)
3. CartProvider — carrito de compras
4. FavoritosProvider — productos favoritos
5. EnvioProvider — direcciones de envio
6. LoadingBarProvider — barra de progreso superior
7. NavBadgesProvider — conteos del nav de cliente (`useNavBadges()`); va dentro de `AuthProvider` porque usa el JWT de cliente

## Nav unificado del cliente (IMPLEMENTADO — 2026-10-05)

El sidebar de las páginas de cliente dejó de ser una lista plana con submenús de 2 niveles: ahora son
**grupos en acordeón** (todos inline) + un grupo Ayuda al pie. Diseño y plan verbatim:
`analisis/design-nav-unificado-2026-10-02.md` y `analisis/plan-nav-unificado-2026-10-02.md`.

### Fuente única: `NAV_UNIFICADO` (`src/components/paginas-principales/NavUnificado.js`)

```js
export const NAV_UNIFICADO = {
  grupos: [
    { id: 'actividad', titulo: 'Mi actividad', items: [...] },
    { id: 'cuenta',    titulo: 'Mi cuenta',    items: [...] },
    { id: 'financiero',titulo: 'Estado de cuenta', items: [...] },
    { id: 'solicitudes',titulo:'Solicitudes',  items: [...] },
  ],
  pie: { id: 'ayuda', titulo: 'Ayuda', items: [...] },   // se pinta con variante sin ícono
}
```

- Cada item: `{ id, to, icono, texto }` + opcionales **`contador`** (clave del badge) y **`soloCliente`**.
- Grupos: Mi actividad (Pedidos, Notificaciones, Chat, Presupuesto) · Mi cuenta (Mi cuenta, Direcciones,
  Sub-usuarios) · **Favoritos** (Mis items, Comprar de nuevo → `/mis-items?tab=recomprar`, ambos
  `soloCliente`) · Estado de cuenta (Resumen, Pagos, Facturas, Reportes, Ampliación) · Solicitudes
  (Cotizaciones, Requerimientos, Documentos) · Ayuda al pie (Preguntas frecuentes, Cómo usar la
  plataforma, Contacto).
- **Cada grupo declara `id`** (y `icono` plano, el mismo estilo que los enlaces). El `id` del grupo es
  la clave del Set de grupos abiertos del acordeón: sin `id` todos los grupos comparten la clave
  `undefined` y se abren/cierran de una — `normalizarNav` deriva uno estable desde el título si falta
  (`navUnificadoHelpers.js`, con test de regresión).
- El **item activo se marca con una barrita azul de 3px** a la izquierda (`box-shadow: inset`), nunca
  con una flecha: la chevron es solo para abrir/cerrar el grupo.
- `NavAdmin.js` usa el MISMO layout y ya comparte este acordeón (grupos con `id` e `icono`).
  `NavStaff.js` y `Navbar.jsx` siguen **fuera** de este rediseño.

### Layout y helpers

- `Layoutpaginaprincipal.jsx` (`ContenidoNav`) pinta los grupos como acordeón: header `<button>`
  abre/cierra (no navega), los items se renderizan inline. Al cambiar la ruta con el layout ya
  montado, el grupo del item activo se abre solo (patrón "ajustar estado durante el render" del
  AGENTS, NO `setState` en `useEffect`). Cada `NavLink` lleva `onClick={onNavigate}` para cerrar el
  drawer móvil; `drawerResetKey` remonta `ContenidoNav` al cerrar el drawer.
- `navUnificadoHelpers.js` (funciones puras, testeadas): `normalizarNav` (tolerante a items sueltos),
  `grupoDeItem`, `gruposAbiertosIniciales`.
- `NavNotificaciones.js` **ya NO existe** (el submenú de 2 niveles se eliminó). No lo reintroduzcas.

### Badges — `GET /nav/badges`

- Backend: `src/controllers/nav.badges.controller.js` + `routes/nav.badges.routes.js` (`verifyJWT`),
  montado como `/nav/badges`. Devuelve `{ conteos: { notificaciones, chat, cotizaciones, requerimientos, documentos }, actualizado_en }`.
- Frontend: `useNavBadges()` de `src/context/NavBadgesContext.jsx` — poll 60 s, **pausa cuando la
  pestaña está oculta** (`visibilitychange`), cancela peticiones con `CanceledError` al desmontar y
  **conserva los valores anteriores si la petición falla**. Solo refresca con sesión de cliente.
- El item del nav trae `contador: 'notificaciones'` etc.; `ItemNav` pinta `99+` a partir de 100.
- **Deuda B5 (anotada a propósito)**: `Navbar.jsx` sigue llamando `GET /notifications/unread-count`
  (mismo dato, otro endpoint) porque quedó fuera de alcance. Cuando se toque el Navbar, migrarlo a
  `useNavBadges()`. Otra deuda: `Cotizaciones.jsx:23` calcula "vencida" en el cliente para su badge
  interno; el badge del nav usa el filtro de servidor (B1) — están alineados, pero son dos lugares
  que tocar si cambia la ventana de expiración.

### Verificación

```bash
node scripts/verificar-nav.mjs                    # guard: 20/20 rutas del nav existen en App.jsx
node --test scripts/navUnificadoHelpers.test.mjs  # 11 tests de los helpers
npm run lint && npx vite build --mode development
```

Al **agregar un item al nav**, creá la ruta en `App.jsx` en el mismo commit o el guard falla.
Un `to` con query (`?tab=`) se compara por su **ruta base** (`scripts/verificar-nav.mjs`).

### Preferencias de notificación (2 cosas distintas — no las mezcles)

`PreferenciasNotificaciones.jsx` (`.acu-*` no: clases `.notif-prefs-*`, dentro de
`components/paginas-principales/`) vive en el centro de notificaciones y tiene **dos listas**:

1. **Avisos push (backend)** — `GET/PUT /notifications/preferences`, columnas `push_*`, solo las
   **6 claves de `CLAVES_PUSH`** (`notificacionesCatalogo.js`): ordenes, pagos, chat, credito,
   sistema, ofertas. El maestro es `usePush` (suscripción del navegador).
2. **Filtro de la lista (localStorage)** — las **8 categorías** de `ORDEN_CATEGORIAS`, clave
   `notif_categorias_silenciadas`. Oculta de la lista, **no** deja de recibir los avisos.

- **La firma del callback local es `onToggleSilenciar(catId, silenciar)`** (2º argumento = "silenciar",
  NO "visible"): si la categoría está visible y apagás el switch, se manda `true`.
- Deep link desde Mi Cuenta: `/notificaciones?preferencias=1` (el panel hace scroll al montar).
- **`push_documentos` y `push_solicitudes` NO existen** en el backend y **no se crean**: los avisos de
  documentos y solicitudes viajan por `push_sistema`. Un switch propio sería migración + `push.service.js`.
- `MiCuenta.jsx` conserva **solo el interruptor maestro** de push + una fila que enlaza a
  `/notificaciones?preferencias=1` (patrón `modal-permisos__fila--link` + `ChevronRight`, no clases
  nuevas). El estado `prefs` y el GET de preferencias se fueron de ahí.

### `/ayuda/como-usar`

Página **pública** (como `/ayuda` y `/contacto`, sin `PrivateRoute`): `pages/AyudaComoUsar.jsx` +
`AyudaComoUsar.css` (clases `.acu-*`). Guía en 8 secciones (primer ingreso, buscar productos, hacer un
pedido, formas de pago, estado de cuenta, solicitudes, notificaciones, sub-usuarios y direcciones) con
acordeón, chips de salto por ancla y bloque de contacto reusando `CONTACTO` de `src/config/contacto.js`.
**El copy lo revisa el dueño**: no inventes precios, plazos ni políticas que no estén en el código; si
cambia una regla, se edita la constante `SECCIONES` del archivo.

### Rutas protegidas
- `<PrivateRoute>` — Requiere autenticacion (cualquier usuario logueado)
- `<PrivateRouteSensible>` — Requiere auth + puede tener restricciones adicionales
- `<PrivateRoute adminOnly>` — Solo admin
- `<PrivateRouteStaff>` — Requiere sesion staff (+ `rolesPermitidos` opcional)

### Registro — 3 formularios independientes
- `/registro` → RegistroConTipo (selector de tipo)
- `/registro/institucional` → RegistroInstitucional (multi-paso: Datos → Documentos → Confirmacion)
- `/registro/profesional` → RegistroProfesional (multi-paso)
- `/registro/honorifico` → RegistroHonorifico (multi-paso, requiere codigo de invitacion)

Cada formulario de registro es un archivo JSX autonomo con su propio estado local (useState, no useReducer). No comparten logica de formulario entre si. El paso final de Confirmacion NO lleva Turnstile (eliminado 2026-09-28 — ver AGENTS raiz); la proteccion anti-bot es el `authLimiter` del backend (10 req/15 min).

### Login — Flujo de dos pasos
1. El usuario escribe email → se verifica si existe via POST /auth/check-email
2. Si existe →滑 al paso de contrasena. Si no → redirige a /registro con el email precargado

### API — Interceptor de Axios
- Agrega Authorization: Bearer <token> automaticamente
- Si recibe 401 (excepto en /auth/login), limpia token y redirige a /login?expirado=1
- Muestra loading bar en cada request

### CSS
- NO se usa CSS modules ni CSS-in-JS para todo. La mayoria de componentes tienen su propio archivo .css al lado.
- Auth pages usan Auth.css compartido
- Los estilos son CSS plain, no Tailwind, no CSS modules
- Paleta de marca: #1B4B8F (azul oscuro), #12A594 (teal), #0052DC (azul principal), #232B45 (gris oscuro)

## Paginas principales

| Pagina | Ruta | Auth? | Descripcion |
|--------|------|-------|-------------|
| Home | /home | Si | Dashboard del usuario con carruseles, ofertas, etc. |
| Catalogo | /catalogo | Si (wrapper) | Catalogo de productos con busqueda y filtros. Exige sesión vía `ConSesionCatalogo` (ver nota abajo) |
| RegistroInhrr | /registro-inhrr | No | Consulta publica del registro sanitario INHRR (medicamentos, hospitalarios, misceláneos) con filtros por categoría/forma/laboratorio/molécula/ATC. Ficha por SKU con datos completos del registro. |
| Vademecum (IMPLEMENTADO — 2026-09-10) | /vademecum · /vademecum/:id | No | **Task F completa** — buscador por molécula (`GET /moleculas/moleculas?search=`) + ficha clínica CIMA (acordeones de `ficha_tecnica`, fallback "Ficha en revisión") + breadcrumb ATC (`atc_arbol`) + productos INHRR paginados + botón **"Buscar en Catálogo"** → `/catalogo?molecula=<nombre>`. Enlaces en `Footer.jsx` y `MenuDrawer.jsx`. Secciones de ficha compartidas en `src/config/seccionesFicha.js`. |
| ProductoDetalle | /producto/:id | Si (wrapper) | Detalle de producto individual. Exige sesión vía `ConSesionCatalogo` (ver nota abajo). **Bloques de ficha clínica IMPLEMENTADOS (2026-09-10)**: tab "Composición" enlaza cada molécula a `/vademecum/:id`; sección **"Ficha clínica"** (acordeón por molécula, cargada en paralelo) debajo de los tabs y antes de los carruseles, con referencia AEMPS-CIMA. |
| Carrito | /carrito | Si | Carrito de compras + checkout |
| MisOrdenes | /orders | Si | Historial de pedidos |
| OrdenDetalle | /orders/:id | Si | Detalle de un pedido |
| MiCuenta | /cuenta | Si | Perfil y configuracion |
| MisItems | /mis-items | Si | Listas personalizadas de items |
| EstadoCuenta | /estado-de-cuenta | Si+ | Estado de cuenta (sensible). Las pestañas cuelgan de la misma raíz: `/estado-de-cuenta/pagos`, `/estado-de-cuenta/facturas`, `/estado-de-cuenta/reportes`, `/estado-de-cuenta/ampliacion`. **OJO: la ruta es `/estado-de-cuenta`, no `/estado-cuenta`** |
| Admin | /admin/* | Admin | Panel administrativo completo |
| Chat | /chat | No | Chat con la empresa |
| Notificaciones | /notificaciones | Si | Centro de notificaciones |
| Direcciones | /direcciones | Si | Gestion de direcciones de envio |
| Ofertas | /ofertas | Si | Ofertas especiales |
| Cotizaciones | /mis-solicitudes/cotizaciones | Si | Solicitudes de cotizacion |
| Presupuesto | /presupuesto | Si | Presupuesto/requerimiento rapido |

**Nota — el catálogo comercial exige sesión (2026-09-30).** `/catalogo` y `/producto/:id` van envueltos en `<ConSesionCatalogo>` (`src/components/`), no en `PrivateRoute`: sin sesión se muestra `CatalogoAcceso` **en el mismo lugar y con la misma URL** (para que un enlace de WhatsApp siga sirviendo y, tras loguearse, vuelva al mismo producto), y con sesión renderiza los hijos. El backend exige JWT en `GET /products`, `GET /products/:id` y las rutas de `moleculas` del producto. **El nombre del producto sigue siendo público**: por `GET /products/buscar?q=` (payload mínimo `id, nombre_comercial, sku, laboratorio, linea`; con sesión agrega `foto_url` y `precio_usd` — lo usan el navbar, `BuscadorMovil` y `/presupuesto`) y por `/registro-inhrr` + `/vademecum`.

## Avísame cuando llegue unificado (IMPLEMENTADO - 2026-10-06)

Unifica el card de producto sin precio y el botón "Avísame". Plan/spec en la raíz: `analisis/plan-avisame-unificado-2026-10-06.md` + `design-avisame-unificado-2026-10-06.md`.

- `FilasConfianza` recibe `sinPrecio` (derivado de `ProductoDetalle`; Carrito no la pasa → intacto). Con `sinPrecio`: fila 1 "Consultar precio"/"Solicita el precio y te respondemos con la disponibilidad" (`Tag`), fila 2 "Respuesta de asesor"/"Un asesor te contacta para darte el precio" (`Clock`), devolución idéntica; NO muestra "Entrega revisada".
- `ProductoDetalle` tiene UN solo CTA `Avisame cuando llegue` / `Te avisaremos` / `Consultando...` (antes dos botones: "Solicitar precio" + "Avísame"). Sin sesión: "Inicia sesion" + " para avisarte cuando llegue" (sinPrecio) o " para comprar". Se eliminó el navigate a `/mis-solicitudes/requerimientos?producto=` (el import `navigate` sigue, usado en el error). `getCopyEtiqueta(user)`/badges intactos para productos con precio.
- `Notificaciones.jsx` `handleClick`: prioridad `chat_mensaje` → `notif.url` → `orden_id`; `clickable = !!notif.url || !!notif.orden_id || tipo==='chat_mensaje'`. `notif.url` llega por `GET /notifications` (select(*) ya incluye la columna 047).
- Modales de responder (staff `StaffComercialModals.jsx` `FilaRequerimiento`/`ModalRequerimientoDetalle`; admin `RequerimientosAdmin.jsx` `FilaItem`/`ModalRequerimiento`): si `item.producto_id != null` el nombre es `item.productos?.nombre_comercial || item.nombre_solicitado`, el input "Nombre final" se sustituye por un span "Producto existente — solo precio", y en `handleGuardar` solo exige precio (payload idéntico `{ id, nombre_final: <nombre>, precio_unitario }`; el backend decide por DB). Items sin producto: UI previa intacta.

## Notificaciones — ícono y color por tipo (2026-10-01)

`src/utils/notificacionesCatalogo.js` es la **única fuente** de ícono/color de cada notificación. La resolución es `getConfigTipo(tipo)` = **categoría + override por tipo** (`COLOR_POR_TIPO` / `ICONOS_POR_TIPO`); si el tipo no está en el override se cae al ícono/color de su categoría. `getIconoTipo()` delega en `getConfigTipo()`. Reglas del dueño (no re-debatar):

- **Todo lo del pedido usa la caja azul** (`Package`): `orden_confirmada`, `orden_aprobada`, `orden_enviada`, `orden_entregada`, `orden_cancelada`, `orden_actualizada`, `estado_cambiado` y `orden_por_vencer` (este último con `Clock`, ámbar: no es un problema). `orden_creada` usa `ShoppingBag`, también azul.
- `orden_incidencia` es la **única** de órdenes en ámbar (`AlertTriangle`).
- **El ícono de pago (`DollarSign`) queda solo para `pago_reportado`** y es ámbar; `pago_verificado` lleva `CheckCircle` verde; `pago_registado` `CreditCard` azul y `pago_rechazado` `Ban` rojo.
- La leyenda (`Notificaciones.jsx`) recorre **`ORDEN_CATEGORIAS`** (una fila por sección), **nunca** `DESCRIPCION_CATEGORIA` como si fueran tipos — ese bug pintaba todos los íconos `Info` gris. Cada fila muestra **un solo ícono, el de su sección** (el mismo del filtro): el dueño quitó el ícono extra de Pagos (la tilde verde del pago verificado) porque ensuciaba la lectura.
- **"Marcar todas leídas" se renderiza dos veces**: en la prop `acciones` del layout (desktop) y en `.notif-mobile-acciones` dentro de la página (móvil). Motivo: `Layoutpaginaprincipal.css` hace `.ppal-main__header { display: none }` en `<1024px`, así que **todo lo que se pase en `acciones` desaparece en móvil** — si agregas otra acción a esa prop y quieres verla en móvil, necesita su equivalente en el body. El contenido del botón está en la constante JSX `botonMarcarTodas` para no duplicarlo.
- Colores disponibles en `Notificaciones.css` como `.notif-icon--<color>` (incluye `--amber`); `colorPalette` de los badges usa el nombre del color.
- OJO: el backend agrupa todos los hitos del pedido como tipo `estado_cambiado`; **no** deduzcas el estado parseando el mensaje para cambiar el ícono.

## Vademécum clínico — ficha de molécula (IMPLEMENTADO — 2026-09-10)

Contexto: el vademécum explica por **molécula** (ficha clínica CIMA); el INHRR es solo registro sanitario. El backend enriqueció `GET /moleculas/moleculas/:id` (2026-09-10) — **contrato listo para consumir**, ver "Contrato del endpoint" abajo. Detalle completo y conteos en el AGENTS raíz (sección vademécum clínico).

### Contrato del endpoint enriquecido `GET /moleculas/moleculas/:id`

Respuesta (ruta pública, IEEE sin auth, ✅ verificado 2026-09-10 contra servidor real):

```jsonc
{
  "id": 1,
  "atc_id": 18,
  "nombre": "Paracetamol",
  "nombre_generico_en": "Acetaminophen",
  "sinonimos": ["..."],           // array; vacío si no hay
  "descripcion": null,             // SIEMPRE null hoy (no inventar — plan aparte cuando el dueño traiga los textos)
  "atc_clasificaciones": { "id": 18, "nivel": 5, "codigo": "N02BE01", "nombre": "Paracetamol", "padre_id": 17, "padre": { /* nivel 4, encadenado hasta nivel 1 */ } },
  "atc_arbol": [                   // cadena plana ALCANZABLE ascendente nivel 1 -> nivel 5:
    { "id": 10, "codigo": "N",     "nombre": "SISTEMA NERVIOSO", "nivel": 1 },
    { "id": 15, "codigo": "N02",   "nombre": "ANALGESICOS",      "nivel": 2 },
    { "id": 16, "codigo": "N02B",  "nombre": "OTROS ANALGESICOS Y ANTIPIRETICOS", "nivel": 3 },
    { "id": 17, "codigo": "N02BE", "nombre": "Anilidas",         "nivel": 4 },
    { "id": 18, "codigo": "N02BE01","nombre": "Paracetamol",     "nivel": 5 }
  ],
  "ficha_tecnica": {               // null si la molécula NO tiene ficha CIMA (hay ~250 así)
    "molecula_id": 1, "cima_nregistro": "47178", "fuente": "AEMPS - CIMA (España)",
    "indicaciones_terapeuticas": "texto HTML limpiado…",
    "posologia": "…", "contraindicaciones": "…", "advertencias": "…",
    "interacciones": "…", "embarazo_lactancia": "…", "efectos_adversos": "…",
    "sobredosis": "…", "updated_at": "…"
  },
  "productos": [                   // productos del catálogo INHRR que usan la molécula (PAGINADOS)
    { "sku": "ME23799", "ef": "E.F.…", "nombre": "TACHIPIRIN 250 mg SUPOSITORIOS", "forma": "SUPOSITORIOS", "categoria": "ME", "laboratorio": "…" }
  ],
  "paginacion": { "total": 14, "pagina": 1, "por_pagina": 50, "total_paginas": 1 }
}
```

Query params de paginación (solo afectan `productos`): `?pagina=1&por_pagina=50` (máx 100). `atc_arbol` vacío `[]` si la molécula no tiene ATC. 404 con `{ error: 'Molécula no encontrada' }` si el id no existe.

### Qué falta en el frontend (IMPLEMENTADO — 2026-09-10)

1. **Página de vademécum = buscador por molécula + ficha clínica** ✅ (`src/pages/Vademecum.jsx` + `Vademecum.css`):
   - Rutas `/vademecum` (buscador) y `/vademecum/:id` (ficha), públicas sin auth.
   - Búsqueda `GET /moleculas/moleculas?search=` (RPC `buscar_moleculas`, debounce 350ms); resultados → ficha por id.
   - Ficha: nombre + `nombre_generico_en` + sinónimos + breadcrumb ATC (`atc_arbol`, niveles 1→5) + **ficha clínica** (acordeones por sección de `ficha_tecnica`; `null` → "Ficha en revisión — aún no disponible") + lista de productos INHRR **paginada** (`?pagina=&por_pagina=25`) + botón **"Buscar en Catálogo"** → `/catalogo?molecula=<nombre>`.
   - **NADA de fichas por producto** en el vademécum (regla del plan). Acceso: `Footer.jsx` y `MenuDrawer.jsx` (junto a "Registro sanitario (INHRR)").
   - Secciones de ficha compartidas: `src/config/seccionesFicha.js` (SECCIONES_FICHA — claves = columnas de `moleculas_ficha_tecnica`).
2. **ProductoDetalle.jsx — bloques de moléculas y ficha clínica** ✅:
   - Tab "Composición": cada molécula (`moleculas_referencias.nombre`) es `<Link>` a `/vademecum/:id` (CSS `.composicion-nombre--link`).
   - Sección **"Ficha clínica"** (`detalle-ficha-clinica__*`): acordeón con un item por molécula (toggle + concentración + link "Ver en Vademécum"); al abrir muestra las secciones de `ficha_tecnica` (via `GET /moleculas/moleculas/:id` en paralelo, guardadas en `fichasClinicas` por `molId`); `ficha_tecnica` null → "Ficha en revisión". Va debajo del bloque de tabs y antes de los carruseles (sección propia, dejaría espacio a un carrusel futuro). Nota de fuente AEMPS-CIMA al pie.
   - `id` de la molécula viene de `moleculas_referencias.id` (el producto devuelve `moleculas` en `GET /moleculas/products/:id/completo`); las fichas se cargan con los ids únicos.

## Catálogo INHRR → tienda (IMPLEMENTADO — 2026-09-07)

Los **7,416 productos INHRR** (`productos_catalogo`) entraron a `productos` como **"consultar precio"** (`precio_usd=null`, `disponible=false`, foto placeholder) → **7,356 importadas** (script backend `scripts/importar-tienda.mjs`, idempotente). El comprador los pide por requerimiento hasta que tengan precio; al fijar precio (>0) se vuelven comprables y avisan ("avísame cuando llegue"). Diseño y fases F1–F4 en el **AGENTS.md raíz**. **QA funcional EJECUTADO (2026-09-09/10)**: A–H verificados en navegador (plan archivado); hallazgos mayores resueltos (migración `025_notificaciones_tipos.sql` aplicada, lote de precios arreglado commit `e8d1eff`). **"Avísame cuando llegue" IMPLEMENTADO (2026-09-10)**: rutas `GET/POST/DELETE /products/:id/avisame` montadas en backend con `verifyJWT` + botón en `ProductoDetalle.jsx` (solo productos sin precio y con sesión, estado ternario). Pendiente operativo (no bloquea): limpieza del QA (cuentas QA, scripts `_qa_*.mjs`, logs), decidir estado TRAMAL. (Deuda de lint: **cerrada 2026-09-28**, ver sección "Lint" de este archivo.) Implementado en este repo:

- **F2 — UX tienda**: `components/ProductCard.jsx` (sin precio → botón **"Consultar"** → `/producto/:id` en ambas variantes; CSS `.pcard__btn-consultar`), `pages/ProductoDetalle.jsx` (CTA **"Solicitar precio"** → `/mis-solicitudes/requerimientos?producto=<nombre>`), **`pages/Requerimientos.jsx` acepta `?producto=`** (pre-llena la primera fila y abre el formulario), guard en `context/CartContext.jsx` (`addItem` ignora productos sin precio).
- **F3 — Admin**: `components/admin/ProductosAdmin.jsx` con **paginación server-side (20/pág) + filtros** (disponible, "Solo sin precio", línea, forma, laboratorio dinámico, búsqueda, sort) + celda de precio editable inline + **Importar Precios (XLSX)** → `POST /products/precios-bulk`. `components/admin/EstadisticasProductos.jsx` + `AnalyticsPage.jsx` consumen `GET /products/stats`.
- **F4 — Staff Comercial**: página **`pages/staff/StaffPrecios.jsx`** (con CSS `.sp-*` en `pages/staff/StaffComercial.css`) registrada en `components/staff/NavStaff.js` (`MODULOS.comercial`, item `id:'precios'`, icono `BadgeDollarSign`) y en `pages/staff/STAFF_PAGINAS.js` → ruta `/staff/precios`, hub y sidebar aparecen solos. Grid con filtros (buscar, línea, forma, laboratorio, grupo ATC) + edición inline + lote (fijo/±/%). Usa `staffApi` + `LayoutDepartamento departamento="comercial" activo="precios"` y endpoints `/staff/precios/*` (NUNCA `api` de cliente).

## Paginas admin (dentro de /admin)

El Admin.jsx usa rutas anidadas. Componentes en `src/components/admin/`:
- DashboardAdmin, OrdenesAdmin, ProductosAdmin, UsuariosAdmin
- PagosAdmin, FacturaForm, EstadoCuentaAdmin
- PromocionesAdmin, DescuentosAdmin, DeliveryAdmin
- AnalyticsVentas, EstadisticasProductos, TasaCambio
- ChatAdmin, DocumentosAdmin, RequerimientosAdmin, CotizacionesAdmin
- MoleculasPanel, FichasProductoAdmin
- MonitoreoAdmin (2026-09-29) — estado del sistema: servidor, BD, tareas cron, tráfico, 5xx y pendientes del negocio. Ruta `/admin/monitoreo`, item en el grupo "General" de `NavAdmin.js` (icono `Activity`). CSS propio `.mon-*` reusando los tokens de `Admin.css`. Consume `GET /admin/monitoreo` con el `api` de cliente (`verifyJWT` + `verifyAdmin` = dueño vía bridge).

  **Detalle de lint**: su `cargar()` es una **cadena de `.then()`**, no `async`/`await` — ver la sección "Lint" de este archivo. Si alguien lo convierte a `async` con `setState` después del `await`, `react-hooks/set-state-in-effect` lo va a marcar. El ref `enCurso` evita superponer peticiones y el refresh solo corre con la pestaña visible.

## PWA / Service Worker

- Configurada via vite-plugin-pwa con injectManifest
- Service worker en src/sw.js
- Workbox para caching (precaching + strategies)
- Manifest: Drogueria Carrisan, theme #0052DC
- **PWA ÚNICA (decidido 2026-09-28, Plan A).** Hay un solo HTML (`index.html`), un solo manifest (`manifest.webmanifest`, `scope: "/"`, `start_url: "/"`), un solo service worker (`sw.js`, scope `/`) y **un solo ícono instalado** para todos, staff incluido. La "PWA staff" anterior (`staff.html` + `public/manifest-staff.json` + `staff-*.png`) fue eliminada: era imposible de instalar de forma fiable (mismo origen = un solo SW = una sola app instalable) y `staff.html` acababa con **dos** `<link rel="manifest">`, lo que hacía la instalabilidad impredecible. `/staff/*` se sirve por el catch-all rewrite de `vercel.json` → `index.html`, y `App.jsx` enruta las rutas staff normalmente.
  - El personal entra por el link "Acceso personal" del login de clientes (`src/pages/Login.jsx:311`) o por `/staff/login`, y **si tiene sesión staff pero no sesión de cliente, abrir la app instalada lo manda directo a `/staff/dashboard`** (`RootRedirect.jsx`). Con ambas sesiones gana la de cliente (comportamiento de siempre).
  - `PwaScopeSwitcher` (montado en `App.jsx:157`) SOLO ajusta `document.title`, `meta[name="theme-color"]` (azul `#0052DC` en tienda / azul marino `#1B4B8F` en staff) y el favicon de la pestaña. **Prohibido volver a tocar el manifest o el `apple-touch-icon` desde JS**: el navegador ya parseó el manifest al cargar (un `setAttribute` posterior no cambia la instalabilidad) y el `apple-touch-icon` es lo que iOS congela como ícono instalado — swapearlo daría ícono staff en iOS y de tienda en Android.
  - Regresión: `node scripts/verificar-pwa.mjs` (tras `npx vite build`) falla si reaparece un segundo manifest, `staff.html`, iconos `staff-*`, un segundo service worker, o el rewrite `/staff → staff.html` de `vercel.json`.
  - Push funciona con esta PWA única: la suscripción vive en el `PushManager` del navegador, no en el service worker, así que sobrevive a los deploys (`registerType: 'autoUpdate'` + `vercel.json` sin bloque `headers` → `sw.js` se revalida siempre).

## Autenticacion de personal interno (staff) — Frontend

El personal de la empresa (vendedor, despachador, almacenista, contabilidad, administrador, director, admin) NO usa el login de clientes (`/auth/login`). Tiene su propio flujo bajo `/staff` (login separado, como en el backend).

- **Dos sesiones independientes en el mismo navegador** (coexisten sin pisarse):
  - Cliente: `localStorage.token` + `localStorage.user` → AuthContext, gates con `user.es_admin`
  - Staff: `localStorage.staff_token` + `localStorage.staff_user` → StaffAuthContext, `staff.rol`
  - Claves de localStorage, contexts y axios distintos. Nunca mezclar `useAuth` con `useStaffAuth`.

- **API layer**: `src/api/staffAxios.js` es una instancia axios separada que lee `staff_token`. Ante un 401 (excepto en `/staff/login`) limpia la sesion y redirige a `/staff/login?expirado=1`. NO usa la loading bar de `axios.js` (esa barra solo funciona en el cliente).

- **StaffAuthContext** exporta: `{ staff, token, loading, loginStaff, logoutStaff }`. `loginStaff(email,password)` hace POST `/staff/login` y guarda `data.token` + `data.staff`.

- **Guard**: `<PrivateRouteStaff rolesPermitidos={[...]}>` envuelve las paginas staff. Sin `rolesPermitidos` solo exige sesion staff; con roles redirige a `/staff/dashboard` si el `staff.rol` no coincide. El Navbar se oculta en cualquier ruta `/staff/*` (ver Navbar.jsx).

- **LayoutStaff + NavStaff** (`src/components/staff/`): sidebar persistente (desktop ≥1024px) / drawer móvil. `NavStaff.js` define `ROLES_BRIDGE_ADMIN` (solo rol `admin` — el dueño) y las estructuras de departamentos. Cada ítem se filtra con `item.roles.includes(staff.rol)`. El `director` ve todos los módulos.

- **Categorización por departamentos** (ver sección "Categorización por departamentos (staff)" abajo): el `StaffDashboard` ya NO usa sidebar — es un panel visual standalone con tarjetas de departamento. Las páginas de trabajo usan `LayoutDepartamento` (sidebar filtrado al departamento activo, con color propio por depto). `LayoutStaff` queda como legacy sin uso activo.

- **Admin bridge**: POST `/staff/admin-bridge` devuelve un JWT de CLIENTE valido (mismo formato que `/auth/login`) para la cuenta `users` cuyo email coincida y tenga `es_admin=true`. El frontend escribe `token` + `user` en localStorage del cliente y hace `window.location.href='/admin'` (recarga completa a proposito — AuthContext ya montado no relee localStorage; un `navigate` no bastaria). El staff debe tener una cuenta cliente con `es_admin=true` con el MISMO email para poder entrar a `/admin`. El botón aparece en el dashboard (tarjeta "Panel administrativo") y también en el nav de `LayoutDepartamento` (grupo "Administración").

- **PWA staff**: ver seccion PWA arriba. El swap lo hace `<PwaScopeSwitcher/>` montado en `App.jsx`.

## Categorización por departamentos (staff)

Desde 2026-09-04 el módulo staff se organiza en **3 departamentos**: `finanzas`, `comercial` y `logistica`. Cada departamento tiene color, icono y descripción propios; los módulos se agrupan bajo su departamento, y el sidebar solo muestra los módulos del departamento en el que estás.

### Estructura de datos — `src/components/staff/NavStaff.js`

- `DEPARTAMENTOS` — metadata visual de los 3 deptos: `{ id, nombre, descripcion, color, colorStrong, colorLight, icono }`. Lo usa el `StaffDashboard` para renderizar las tarjetas.
  - **Finanzas** → `#0D9373` (verde/teal), icono `Landmark`
  - **Comercial** → `#2563EB` (azul), icono `TrendingUp`
  - **Logística** → `#D97706` (naranja), icono `Truck`
- `MODULOS` — objeto `{ finanzas: [...], comercial: [...], logistica: [...] }`. Cada depto es un array de grupos con `{ titulo, items: [{ id, to, icono, texto, roles }] }`. **Aquí se agregan los módulos NUEVOS** (ej. crédito y cobranza en finanzas, proveedores en comercial, inventario en logística); cada item declara a qué roles es visible.
- `ROLES_BRIDGE_ADMIN` = `['admin']` — solo el dueño ve el botón al panel `/admin`.
- `NAV_STAFF` — array legacy "aplanado" (General + todos los grupos), usado solo por `LayoutStaff` (sin uso activo).

### Páginas y layouts

| Pieza | Archivos | Comportamiento |
|-------|----------|----------------|
| **StaffDashboard** (`/staff/dashboard`) | `pages/staff/StaffDashboard.jsx` + `.css` | **Standalone, SIN sidebar.** Header con brand + usuario + logout, hero con gradiente corporativo (#1B4B8F) y tarjetas de departamento (un `Link` por depto → navega al **primer módulo accesible** del depto). Cada tarjeta lista chips con los módulos visibles para el rol. Tarjeta "Panel administrativo" aparte (solo roles bridge). |
| **StaffDepartamento** (`/staff/finanzas` · `/staff/comercial` · `/staff/logistica`) | `pages/staff/StaffDepartamento.jsx` + `.css` | Hub/landing del depto. Reutiliza `LayoutDepartamento` (sin módulo activo) y muestra su hero (icono + nombre + color vía `--ldep-*`) + tarjetas de los módulos visibles para el rol (usa el campo `desc` de cada item). Sin módulos visibles → `<Navigate>` al dashboard. Los `Link` del `StaffDashboard` apuntan a estos hubs. |
| **LayoutDepartamento** | `components/staff/LayoutDepartamento.jsx` + `.css` | `<LayoutDepartamento departamento="logistica" activo="pedidos" titulo="...">`. Sidebar del depto (solo sus módulos, filtrados por rol) + header de depto (icono + nombre) + "Volver al dashboard" + botón bridge en el nav. Inyecta las variables CSS `--ldep-color`, `--ldep-color-strong`, `--ldep-color-soft` desde `DEPARTAMENTOS`. Drawer móvil igual que el LayoutStaff original. |

### Rutas de módulos (generadas desde `MODULOS`)

| Ruta | Layout | Departamento | Módulo activo |
|------|--------|--------------|---------------|
| `/staff/dashboard` | ninguno (standalone) | — | — |
| `/staff/finanzas` | LayoutDepartamento (`activo=""`) | Hub Finanzas | — |
| `/staff/comercial` | LayoutDepartamento (`activo=""`) | Hub Comercial | — |
| `/staff/logistica` | LayoutDepartamento (`activo=""`) | Hub Logística | — |
| `/staff/ventas` | LayoutDepartamento | `finanzas` | `ventas` (Facturación — StaffFacturacion) |
| `/staff/cuentas-por-cobrar` | LayoutDepartamento | `finanzas` | `cuentas-por-cobrar` (StaffCuentasPorCobrar) |
| `/staff/ordenes-por-cancelar` | LayoutDepartamento | `finanzas` | `ordenes-por-cancelar` (StaffOrdenesPorCancelar) |
| `/staff/credito` | LayoutDepartamento | `finanzas` | `credito` (StaffCredito) |
| `/staff/tesoreria` | LayoutDepartamento | `finanzas` | `tesoreria` (StaffTesoreria) |
| `/staff/reportes-financieros` | LayoutDepartamento | `finanzas` | `reportes-financieros` (StaffReportesFinancieros) |
| `/staff/clientes` | LayoutDepartamento | `comercial` | `clientes` (StaffClientes) |
| `/staff/clientes/:id` | LayoutDepartamento | `comercial` | Ficha de cliente (StaffClienteFicha) |
| `/staff/chat` | LayoutDepartamento | `comercial` | `chat` (StaffChat — Comunicaciones) |
| `/staff/ordenes` | LayoutDepartamento | `comercial` | `ordenes` (StaffOrdenes) |
| `/staff/solicitudes` | LayoutDepartamento | `comercial` | `solicitudes` (StaffSolicitudes — kanban cotizaciones+requerimientos) |
| `/staff/presupuestos` | LayoutDepartamento | `comercial` | `presupuestos` (StaffPresupuestos) |
| `/staff/promociones` | LayoutDepartamento | `comercial` | `promociones` (StaffPromociones) |
| `/staff/precios` | LayoutDepartamento | `comercial` | `precios` (StaffPrecios) |
| `/staff/cupones` | LayoutDepartamento | `comercial` | `cupones` (StaffCupones) |
| `/staff/pedidos` | LayoutDepartamento | `logistica` | `pedidos` (StaffPedidos — pipeline completo almacén) |
| `/staff/envios` | LayoutDepartamento | `logistica` | `envios` (StaffEnvios — despacho) |
| `/staff/direcciones` | LayoutDepartamento | `logistica` | `direcciones` (StaffDirecciones) |

**OJO**: `/staff/pagos`, `/staff/almacen`, `/staff/despacho`, `/staff/cotizaciones`, `/staff/requerimientos` y `/staff/documentos` ya NO son rutas de navegación. Pagos→absorbidos en Cuentas por cobrar/Crédito, Almacen→`pedidos`, Despacho→`envios`, Cotizaciones/Requerimientos→`solicitudes`, Documentos→tab en la ficha de cliente. Los archivos `StaffAlmacen.jsx`, `StaffVentas.jsx`, `StaffPagos.jsx`, `StaffDespacho.jsx`, `StaffDocumentos.jsx` NO existen (eliminados).

**Regla:** las páginas de trabajo usan `LayoutDepartamento` (nunca `LayoutStaff`). El `activo` del layout debe coincidir con el `id` del item en `MODULOS` para marcar el link activo del sidebar. Los roles finos por submódulo se definen en el campo `roles` de cada item (aún en evolución).

### Base estructural (2026-09-05) — agregar módulos/páginas/tabs es declarativo

- **Rutas staff generadas**: `<RutasStaff />` en `App.jsx` genera los hubs (`/staff/finanzas|comercial|logistica`) y las páginas de módulos a partir de `DEPARTAMENTOS`/`MODULOS`. El guard de rol sale de `item.roles`. **No se toca `App.jsx` al agregar un módulo.**
- **STAFF_PAGINAS** (`src/pages/staff/STAFF_PAGINAS.js`): mapa `id → componente`. Si un módulo de `MODULOS` no está en el mapa, su ruta cae en **`StaffModuloPlaceholder`** (`src/pages/staff/StaffModuloPlaceholder.jsx`) — página "en construcción" envuelta en `LayoutDepartamento`, navegable desde hub y sidebar. Registra módulos planificados para que aparezcan como "en construcción".
- **StaffTabs** (`src/components/staff/StaffTabs.jsx` + `.css`): tabs reutilizables para las páginas de trabajo. El color del tab activo usa `--ldep-color` (color del depto) — no fijes colores por página. Lo usan las páginas con tabs (StaffPedidos, StaffFacturacion, StaffCredito, etc.).
- Receta completa en `analisis/plan-paginas-staff-departamentos.md` → sección "Cómo agregar un módulo (receta)".

## Paginas staff (dentro de /staff)

| Ruta | Guard | Departamento | Estado | Descripcion |
|------|-------|--------------|--------|-------------|
| /staff/login | publico | — | funcional | Login interno (email+password), usa Auth.css |
| /staff/registro | publico | — | funcional | Registro de personal con código de invitación staff (`StaffRegistro.jsx` + `StaffRegistro.css`): verifica el código via `/auth/verificar-codigo {tipo:'staff'}`, formula (email, nombre, password), POST `/staff/registro` → auto-login (iniciarSesionConDatos) → /staff/dashboard |
| /staff/dashboard | PrivateRouteStaff | — | funcional | Panel visual standalone (sin sidebar): tarjetas de departamento + boton admin-bridge (`StaffDashboard.css`) |
| /staff/finanzas · /staff/comercial · /staff/logistica | PrivateRouteStaff | — | funcional | Hubs de departamento (`StaffDepartamento`): hero del depto + tarjetas de módulos visibles por rol |
| /staff/ventas | roles: contabilidad/administrador/director/admin | Finanzas | funcional | **Facturación** (`StaffFacturacion.jsx`): emitir facturas/recibos + notas de crédito y débito + historial + anular. Endpoints `/staff/contabilidad/facturas*` (migración `026_facturacion.sql`) |
| /staff/cuentas-por-cobrar | roles: contabilidad/administrador/director/admin | Finanzas | funcional | Clientes con línea de crédito (línea/deuda/saldo) + estado de cuenta al detallar (órdenes pendientes, facturas, pagos) (`StaffFinanzas.css`) |
| /staff/ordenes-por-cancelar | roles: contabilidad/administrador/director/admin | Finanzas | funcional | Cola de órdenes contado en `preparando` (o legacy `procesando`) sin pago verificado; botón "Cancelar pedido" (`StaffFinanzas.css`) |
| /staff/credito | roles: contabilidad/administrador/director/admin | Finanzas | funcional | **Crédito y cobranza** (`StaffCredito.jsx`): aging report, notas de cobranza, recordatorios push, freeze de crédito. Migración `026_credito_cobranza.sql` (ver AGENTS raíz) |
| /staff/tesoreria | roles: contabilidad/administrador/director/admin | Finanzas | funcional | **Tesorería** (`StaffTesoreria.jsx`): ingresos (read-only), egresos + salidas internas, por tercero, export PDF/CSV. Migraciones `027`/`028` |
| /staff/reportes-financieros | roles: contabilidad/administrador/director/admin | Finanzas | funcional | **Reportes financieros** (`StaffReportesFinancieros.jsx`): panel + informe mensual PDF (Recharts), 6 bloques. Backend `/staff/reportes/resumen` |
| /staff/clientes | roles: vendedor/administrador/director/admin | Comercial | funcional | **Clientes** (`StaffClientes.jsx`): lista con buscador/paginación server-side + ficha `StaffClienteFicha.jsx` con 4 tabs (Resumen, Pedidos, Presupuestos, Documentos). Ver AGENTS raíz |
| /staff/clientes/:id | roles: vendedor/administrador/director/admin | Comercial | funcional | Ficha de cliente (`StaffClienteFicha.jsx`), ruta manual en `App.jsx` (NO generada por MODULOS): header con datos + botones "Crear orden" y "Crear presupuesto" + 4 tabs. Crédito read-only |
| /staff/chat | roles: vendedor/administrador/director/admin | Comercial | funcional | **Comunicaciones** (`StaffChat.jsx` + `StaffChat.css`): lista plana de conversaciones + panel de chat, buscador client-side, refresco cada 30s. Backend `staff.chat.controller.js` |
| /staff/ordenes | roles: vendedor/administrador/director/admin | Comercial | funcional | Crear orden a nombre de un cliente (buscar cliente, tipo de envio + direccion delivery, items, POST /staff/ordenes). CSS propio `StaffOrdenes.css`. |
| /staff/solicitudes | roles: vendedor/administrador/director/admin | Comercial | funcional | **Solicitudes unificadas** (`StaffSolicitudes.jsx`): kanban de 2 tabs (cotizaciones + requerimientos). Endpoints `/staff/cotizaciones` y `/staff/requerimientos` (sin cambio de ruta) |
| /staff/presupuestos | roles: vendedor/administrador/director/admin | Comercial | funcional | **Presupuestos** (`StaffPresupuestos.jsx`): crear/recotizar/conversión a pedido. Backend `GET /staff/presupuestos` + `GET /staff/productos` |
| /staff/promociones | roles: vendedor/administrador/director/admin | Comercial | funcional | Versión limitada de `PromocionesAdmin` (endpoints `/staff/promociones/*` — nomenclatura unificada): crear/editar/eliminar plantillas + historial. **SIN envío masivo** (queda solo en `/admin`) |
| /staff/precios | roles: vendedor/administrador/director/admin | Comercial | funcional | **Precios** (`StaffPrecios.jsx`): grid con filtros + edición inline + lote + **importar precios de proveedor** (multipart). Ver sección "Importación multi-proveedor" del AGENTS raíz |
| /staff/cupones | roles: admin/administrador/director | Comercial | funcional | **Cupones giftcard** (`StaffCupones.jsx`): genera códigos por % o monto. Migración `034_cupones_descuento.sql` |
| /staff/pedidos | roles: almacenista/administrador/director/admin | Logística | funcional | **Pipeline completo del almacén** (`StaffPedidos.jsx`): tabs revisar/aprobar/preparar + retiros/incidencias/verificar-paquete/agencias. Sustituye a StaffAlmacen legacy. Migración `029_logistica.sql` |
| /staff/envios | roles: despachador/administrador/director/admin | Logística | funcional | **Despacho** (`StaffEnvios.jsx`): cola de órdenes `enviado` + marcar `entregado`. Sustituye a StaffDespacho |
| /staff/direcciones | roles: despachador/administrador/director/admin | Logística | funcional | Direcciones de envío de clientes + dirección de un cliente (`GET /staff/direcciones/cliente/:id`) para planificar despachos |

**Migración Admin → Staff (IMPLEMENTADA — 2026-09-07):** los módulos copiados del admin (cotizaciones, requerimientos, documentos, promociones, direcciones) están **funcionales** (ver tabla de arriba). Las UIs se adaptaron de `src/components/admin/` (mismos patrones Kanban `kb-*`, modales `odm-*`) pero sobre **staffApi** y endpoints **NUEVOS `/staff/*`** (sesión staff, `verifyStaffJWT` + `checkRolStaff`). NO se reutiliza `api` de clientes ni los endpoints admin. El panel `/admin` queda completo solo para el dueño vía bridge. La auditoría de acciones staff la registra el backend con `staff_id` (migración `015_staff_auditoria.sql`, ejecutar a mano en Supabase). Detalle en el AGENTS del backend.

**Plan de módulos staff por rol (el módulo de aprobación/confirmación de órdenes YA está implementado):** ver `analisis/plan-modulos-staff-por-rol.md` (raíz del repo). Hubs por departamento ✅ (`analisis/plan-paginas-staff-departamentos.md`). Migración Admin → Staff ✅ (2026-09-07). **Comercial unificado ✅ (2026-09-14)**: solicitudes (kanban 2 tabs) + presupuestos; **Clientes ✅ (2026-09-14)**: lista + ficha 4 tabs (`StaffClienteFicha`); **Logística unificada ✅ (2026-09-12)**: `pedidos` + `envios` + `direcciones`; **Finanzas ✅ (2026-09-10/11)**: ventas (facturación), cuentas-por-cobrar, ordenes-por-cancelar, crédito, tesorería, reportes-financieros; **Cupones ✅ (2026-09-15)**; **Chat ✅ (2026-09-15)**. Inventario ⏸️ aplazado hasta definir el flujo de trabajo en la empresa. Pendientes futuros: proveedores/compras. Los módulos nuevos se agregan como items en `MODULOS` (**no se toca App.jsx**, se generan solos). Principio: los endpoints NUEVOS de operación van bajo `/staff/*` (sesión staff); el panel `/admin` queda solo para el dueño vía bridge y sus funcionalidades se migran a staff con sesión y endpoints propios.

La pagina de crear orden a cliente (StaffOrdenes) usa **staffApi** (no el `api` de clientes) y los endpoints `/staff/*`: `GET /staff/clientes?buscar=`, `GET /staff/clientes/:id/direcciones`, `POST /staff/ordenes`. El campo `creado_por_staff_id` lo agrega el backend, no el frontend. Los errores de validacion llegan estructurados (credito/stock) y se muestran como toast en pantalla.

`StaffPedidos.jsx` (Logística), `StaffFacturacion.jsx`, `StaffCuentasPorCobrar.jsx`, `StaffOrdenesPorCancelar.jsx`, `StaffCredito.jsx`, `StaffTesoreria.jsx`, `StaffReportesFinancieros.jsx` (Finanzas) usan **staffApi** (endpoints `/staff/*`). Patrón compartido: helpers de formato (`formatUSD`, `formatFecha`) definidos al inicio del archivo, tabs con estado local en el componente padre, y un subcomponente por tab (`TabPorRevisar`, `TabPorPreparar`, `TabFacturas`, `TabAbonos`, etc.). Los "cancelar"/"destructivos" usan `window.confirm` (mismo patrón que el resto del staff). CSS plain por página (`StaffFinanzas.css` compartido por los módulos de Finanzas).

## Estados de órdenes — fuente única de verdad

- **`src/config/estadosOrden.js`** es la ÚNICA fuente de verdad para labels, colores, descripciones y timeline de `order.status` (entrega y pago son dimensiones separadas — ver AGENTS.md raíz, sección "Arquitectura de ordenes").
- PROHIBIDO definir `ESTADOS_CONFIG`/`ESTADOS_ORDEN`/`ETAPAS`/`PASOS`/`LABELS` de estados en componentes o páginas (los duplicados que existían en OrdenDetalle, OrdenDetalleModal, MisOrdenes, MiCuenta, OrdenClienteModal, DashboardAdmin y OrdenesAdmin ya se eliminaron — no reintroducirlos). Importar los helpers de `estadosOrden.js` (`getEtapas`, `getEstadoConfig`, `getLabelEstado`, `normalizarEstado`).
- Los textos se separan por receptor (`labels.cliente`, `labels.staff`, `labels.admin`) y el `enviado` del cliente depende del fulfillment (`clientePorFulfillment`).

## CSS responsive — Auth pages

- `.auth-container` → max-width 440px (login, simples)
- `.auth-container--registro` → max-width 720px (formularios multi-columna)
- Mobile: ambos a 100% con padding reducido
- Desktop: containers centrados con max-width fijo

## Errores comunes a evitar

1. **No agregar imports en App.jsx sin verificar** que el componente exista. Landing.jsx esta conectado via RootRedirect.jsx — no confundir con un archivo huerfano.
2. **El AuthContext exporta `login(email, password)`** que retorna el usuario. No confundir con `login` de React Router.
3. **El Chakra Toaster esta en App.jsx.** No duplicar en main.jsx.
4. **Los PDFs se generan en el frontend** con jsPDF, no en el backend.
5. **Las validaciones** estan en src/utils/validadores.js y se reusan en Login y todos los registros.
6. **La ruta `/analytics` esta protegida** con `<PrivateRoute adminOnly>`. No quitar el guard.
7. **Staff ≠ cliente.** No mezclar `useAuth`/`api` con `useStaffAuth`/`staffApi`. Usa `staffApi` para endpoints `/staff` y `api` para `/auth` y el resto. Nunca llamar `useAuth().login()` desde una pagina staff (eso seria el login de cliente, no staff).
8. **PwaScopeSwitcher ESTÁ montado** en `App.jsx` — no removerlo: el ajuste de `title` + `theme-color` por depto (tienda vs `/staff`) depende de él. Verifica que exista el componente (ver Error #1). Solo ajusta metadata de pestaña: **nunca** el manifest ni el `apple-touch-icon` (ver la sección PWA de este archivo).

## Lint — React Compiler (`eslint-plugin-react-hooks` v6)

**Base verificada 2026-09-28: `npm run lint` → 0 errors, 0 warnings.** `npx vite build` exit 0. La deuda que lasted varios días quedó CERRADA (partía de 89 problems: 76 errors + 13 warnings); ya no hay backlog de lint en el frontend.

Cómo se resolvió `react-hooks/set-state-in-effect` (la regla que dominaba, ~56 errors). **No hay supresiones**: estos 3 patrones resuelven casi todo caso, en orden de preferencia:

1. **Ajustar estado durante el render** cuando el reset depende de una prop/ruta (patrón oficial "set state on a prop change"). Se guarda el valor anterior y se re-renderiza sin estado intermedio:
   ```js
   const [idAnterior, setIdAnterior] = useState(id)
   if (id !== idAnterior) {
     setIdAnterior(id)
     setCargando(true); setError('')   // los resets van AQUÍ
   }
   ```
   Ejemplos: `ProductoDetalle.jsx` (reset por `:id`), `Vademecum.jsx` (reset por `:id` de la ficha y por `terminoActivo`).
2. **Derivar de las props y NO espejarlas en estado local.** El peor caso era el patrón `useState(config.x) + useEffect(() => setX(config.x), [config])` + `onChange` en cada handler: la config del padre ya era la única fuente de verdad y el estado local solo la re-renderizaba tarde. Ahora los editores de `StaffVitrina.jsx` derivan directo de `config` y publican con `onChange({ ...campo })` — menos código y sin el render desfasado. Ojo: este patrón además hacía **bucle infinito** cuando el bloque no tenía config (`configs[bloque] || {}` crea un objeto nuevo por render → el efecto reseteaba con valores nuevos → re-render).
3. **Cadena `.then()` en vez de `async fn` llamada desde el efecto.** La regla NO modela `await` como punto de suspensión: marca cualquier `async` con `setState` aunque el primer `setState` vaya después del `await`. Al invocar `api.get(...).then(...)` el setState cae en un callback y la regla lo acepta. Además permite el guard de cancelación `let activo = true` + `return () => { activo = false }`, que el código viejo no tenía (corrige carreras al cambiar de id). Ejemplos: búsqueda y ficha en `Vademecum.jsx`, fichas clínicas en `ProductoDetalle.jsx`.
   - Para una `async fn` larga que no conviene reescribir (ej. `cargarProducto` en `ProductoDetalle.jsx`), se arranca desde un microtask con guarda de cancelación: `Promise.resolve().then(() => { if (!cancelado) cargar() })`.

Trampa real de esta regla: **un `// eslint-disable-next-line` puede estar tapando una violación legítima** (en `Vademecum.jsx` el reset de la búsqueda estaba así). Antes de borrar una supresión, quitarla y correr `npx eslint <archivo>` para ver si el error aparece; si aparece, se arregla con los patrones de arriba, no se re-tapa.
