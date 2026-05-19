# 🌊 Requisitos Frontend Angular — Plataforma de Atracciones
> **Referencia de Diseño:** [TideScape](https://tidescape.framer.ai/) — Tonos costeros, elegante, limpio y moderno.
> **Gateway Base URL:** `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io`

---

## FASE 0 — Configuración del API Gateway (Prerrequisito)

Antes de comenzar el frontend, el Gateway debe exponer **todos** los endpoints que la aplicación Angular necesitará. A continuación se listan las rutas que deben estar mapeadas en el `appsettings.json` del Gateway.

### Rutas ya configuradas ✅

| Prefijo de Ruta | Cluster destino | Descripción |
|---|---|---|
| `/api/v1/Auth/{**catch-all}` | `identity-cluster` | Login, Registro, Reset de contraseña |
| `/api/v1/client/{**catch-all}` | `identity-cluster` | Validar cliente por documento |
| `/api/v1/catalog/{**catch-all}` | `catalog-cluster` | Catálogo: atracciones, categorías, tags, medios |
| `/api/v1/booking/{**catch-all}` | `booking-cluster` | Reservas, disponibilidad, cancelaciones |
| `/api/v1/admin-booking/{**catch-all}` | `booking-cluster` | Reservas seguras validadas con gRPC |
| `/api/v1/review/{**catch-all}` | `booking-cluster` | Reseñas de experiencias |
| `/api/v1/billing/{**catch-all}` | `billing-cluster` | Facturas |
| `/api/v1/payment/{**catch-all}` | `billing-cluster` | Pagos simulados |

### Rutas que posiblemente faltan (Verificar en el backend) ⚠️

| Prefijo de Ruta | Cluster destino | Descripción | Acción |
|---|---|---|---|
| `/api/v1/catalog/category/{**catch-all}` | `catalog-cluster` | CRUD de Categorías (Admin) | Verificar existencia en Catalog |
| `/api/v1/catalog/location/{**catch-all}` | `catalog-cluster` | CRUD de Ubicaciones (Admin) | Verificar existencia en Catalog |
| `/api/v1/catalog/tag/{**catch-all}` | `catalog-cluster` | CRUD de Tags (Admin) | Verificar existencia en Catalog |
| `/api/v1/catalog/itinerary/{**catch-all}` | `catalog-cluster` | Gestión de rutas y paradas | Verificar existencia en Catalog |
| `/api/v1/users/{**catch-all}` | `identity-cluster` | Gestión de Usuarios (Admin) | Verificar existencia en Identify |
| `/api/v1/admin-booking/management` | `booking-cluster` | Panel de reservas admin | Ya existe en `BookingController` |

---

## FASE 1 — Diseño del Sistema y Configuración del Proyecto Angular

### 1.1 Paleta de Colores (Inspirada en TideScape)

| Token | Valor HEX | Uso |
|---|---|---|
| `--color-primary` | `#1A3C5E` | Azul oceánico profundo — navbar, botones principales |
| `--color-secondary` | `#2A7F8A` | Teal costero — acentos, íconos activos |
| `--color-accent` | `#D4A853` | Dorado arena — CTA, badges de precio, estrellas |
| `--color-surface` | `#F5F0E8` | Beige arena — fondos de tarjetas, secciones |
| `--color-bg` | `#FAFAF8` | Blanco roto — fondo principal de la app |
| `--color-text-primary` | `#1C2B3A` | Azul carbón oscuro — texto principal |
| `--color-text-muted` | `#6B7F8E` | Gris azulado — texto secundario, placeholders |
| `--color-success` | `#2E8B57` | Verde mar — confirmaciones, estado activo |
| `--color-danger` | `#C0392B` | Rojo coral — errores, cancelaciones |

### 1.2 Tipografía

- **Títulos y Headings:** `Cormorant Garamond` (serif elegante) — peso 600/700
- **Cuerpo y UI:** `DM Sans` (sans-serif moderno y limpio) — peso 400/500
- **Importar desde Google Fonts en `styles.scss`**

### 1.3 Filosofía de Diseño

- **Glassmorphism sutil** para modales y overlays (`backdrop-filter: blur(16px)`)
- **Imágenes full-width** con overlay gradiente en la parte inferior
- **Animaciones suaves** con `@angular/animations` — fade-in en carga de tarjetas
- **Espaciado generoso** — los elementos deben "respirar" (padding 24px-48px)
- **Bordes redondeados** — `border-radius: 12px–20px` en tarjetas y botones
- **Sombras sutiles** — `box-shadow: 0 4px 24px rgba(26, 60, 94, 0.08)`

### 1.4 Estructura de Carpetas del Proyecto Angular

```
src/
├── app/
│   ├── core/                          # Singleton: guardias, interceptores, servicios globales
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── role.guard.ts
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts    # Agrega JWT Bearer en cada request
│   │   │   └── error.interceptor.ts   # Manejo global de errores HTTP
│   │   └── services/
│   │       └── token.service.ts       # Lectura/escritura del JWT en localStorage
│   │
│   ├── shared/                        # Componentes, pipes y directivas reutilizables
│   │   ├── components/
│   │   │   ├── navbar/
│   │   │   ├── footer/
│   │   │   ├── attraction-card/       # Tarjeta visual de atracción
│   │   │   ├── rating-stars/
│   │   │   ├── loader-spinner/
│   │   │   ├── empty-state/
│   │   │   └── confirmation-modal/
│   │   ├── models/                    # Interfaces TypeScript que mapean los DTOs del backend
│   │   │   ├── attraction.model.ts
│   │   │   ├── booking.model.ts
│   │   │   ├── auth.model.ts
│   │   │   ├── billing.model.ts
│   │   │   └── pagination.model.ts
│   │   └── pipes/
│   │       ├── currency-format.pipe.ts
│   │       └── date-local.pipe.ts
│   │
│   ├── features/                      # Módulos de funcionalidad (lazy loading)
│   │   ├── auth/                      # Login, Registro
│   │   ├── home/                      # Landing page pública
│   │   ├── catalog/                   # Catálogo de atracciones (Cliente)
│   │   ├── booking/                   # Flujo de reserva (Cliente)
│   │   ├── my-account/                # Historial, cancelaciones (Cliente)
│   │   └── admin/                     # Panel completo de administración
│   │       ├── dashboard/
│   │       ├── attractions/           # CRUD de Atracciones
│   │       ├── catalog-setup/         # Categorías, Ubicaciones, Tags
│   │       ├── itineraries/           # Rutas y Paradas
│   │       ├── bookings-mgmt/         # Gestión de Reservas
│   │       └── billing-mgmt/          # Reportes de Facturación
│   │
│   ├── app.routes.ts
│   ├── app.config.ts
│   └── app.component.ts
│
├── environments/
│   ├── environment.ts                 # { apiUrl: 'https://gateway-service...' }
│   └── environment.prod.ts
│
└── styles.scss                        # Design tokens, tipografía, clases globales
```

---

## FASE 2 — Módulo de Autenticación (`/auth`)

### Pantallas

1. **Login** (`/auth/login`)
   - Formulario con email y password
   - Botón "Iniciar Sesión"
   - Link "¿Olvidaste tu contraseña?"
   - Al autenticarse, guardar el JWT y redirigir por rol (`Client` → `/catalog`, `Admin` → `/admin/dashboard`)

2. **Registro** (`/auth/register`)
   - Campos: nombre, apellido, email, contraseña, documento, teléfono
   - Validaciones reactivas en tiempo real

### Endpoint consumido

| Método | URL | Descripción |
|---|---|---|
| `POST` | `/api/v1/Auth/Login` | Obtener token JWT |
| `POST` | `/api/v1/Auth/Register` | Registrar usuario |

---

## FASE 3 — Portal del Cliente

### 3.1 Home / Landing (`/`)

**Secciones:**
- **Hero:** Imagen full-screen con video/imagen de atracción destacada, botón CTA "Explorar Atracciones"
- **Categorías visuales:** Grid de tarjetas de categorías con íconos (Aventura, Cultura, Gastronomía, etc.)
- **Atracciones Destacadas:** Carrusel horizontal con tarjetas de las atracciones mejor valoradas
- **¿Cómo funciona?:** Iconos de 3 pasos — Elige → Reserva → Disfruta
- **CTA Final:** Sección con fondo de imagen, botón "Ver todas las atracciones"

### 3.2 Catálogo (`/catalog`)

**Layout:** Grid de tarjetas, 3 columnas en desktop, 1 en móvil.

**Componentes:**
- **Barra de búsqueda** con filtros: texto libre, categoría (dropdown), ubicación, disponible (toggle)
- **Tarjeta de Atracción (`AttractionCardComponent`):**
  - Imagen principal (`attraction_media` donde `is_main = true`)
  - Nombre, rating promedio con estrellas, ubicación
  - Precio desde (precio mínimo de los `price_tier`)
  - Botón "Ver Detalle"

**Endpoint consumido:**

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/api/v1/catalog/attraction?search=&categoria=&page=` | Listar atracciones con filtros |

### 3.3 Detalle de Atracción (`/catalog/:slug`)

**Layout:** Imagen galería, información, opciones de compra.

**Secciones:**
- **Galería de medios:** Slider de imágenes/videos (`attraction_media`)
- **Info principal:** Nombre, descripción completa, rating, ubicación en mapa (Google Maps embed con lat/lng)
- **Tabs:** "Descripción" | "Itinerario" | "Incluye/Excluye" | "Reseñas"
  - **Itinerario Tab:** Mapa de paradas ordenadas (`tour_stop`) con nombre, duración y descripción de cada parada
  - **Incluye/Excluye Tab:** Lista de `attraction_inclusion` (tipo included / excluded)
  - **Reseñas Tab:** Listado de reseñas con puntuación general y criterios
- **Panel lateral "Reservar":**
  - Selector de Producto (`product_option`)
  - Selector de Fecha → llama a `GET /api/v1/booking/disponibilidad?attractionId=`
  - Selector de horario (slot)
  - Selector de pasajeros por categoría de precio (`price_tier`)
  - Resumen del precio total
  - Botón "Continuar a Pago"

**Endpoints consumidos:**

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/api/v1/attraction/{slug}` | Detalle de atracción |
| `GET` | `/api/v1/booking/disponibilidad?attractionId=` | Slots disponibles por fecha |

### 3.4 Flujo de Checkout (`/booking/checkout`)

**Pasos (Stepper):**

1. **Revisión del pedido:** Resumen visual — atracción, fecha, hora, pasajeros, precio total
2. **Datos del comprador:** Formulario con nombre, email, documento (pre-llenado si el usuario tiene perfil)
3. **Pago simulado:**
   - Formulario de tarjeta de crédito (solo visual — simulación)
   - Botón "Confirmar Reserva"
4. **Confirmación:**
   - Código PNR generado → `bookingId`, `pnrCode`, `attractionName`
   - Botón "Ver mis reservas" y "Volver al catálogo"

**Endpoints consumidos:**

| Método | URL | Descripción |
|---|---|---|
| `POST` | `/api/v1/booking` | Crear reserva (flujo externo/cliente) |
| `POST` | `/api/v1/payment` | Registrar pago simulado |

### 3.5 Mi Cuenta (`/my-account`)

**Tabs:**
1. **Mis Reservas:** Listado con PNR, atracción, fecha, estado y botón "Cancelar"
2. **Mis Facturas:** Listado con número de factura, monto, fecha, botón "Descargar PDF" (simulado)
3. **Mis Datos:** Formulario de edición de perfil

**Endpoints consumidos:**

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/api/v1/booking/mis-reservas` | Historial de reservas del usuario |
| `POST` | `/api/v1/booking/{id}/cancel` | Cancelar reserva |
| `GET` | `/api/v1/billing/management` | Facturas del usuario |

---

## FASE 4 — Panel de Administración (`/admin`)

> Acceso restringido. El `RoleGuard` valida que el JWT tenga el claim `Admin`.

### 4.1 Dashboard (`/admin/dashboard`)

**Widgets (tarjetas de métricas):**
- Total de reservas del mes
- Ingresos del mes (suma de `total_amount` de bookings confirmados)
- Atracciones activas / inactivas
- Últimas 5 reservas en tiempo real

### 4.2 Gestión de Atracciones (`/admin/attractions`)

**Lista de Atracciones:**
- Tabla con columnas: Nombre, Categoría, Ubicación, Estado (activo/publicado), Acciones
- Filtros de búsqueda y paginación
- Botón "Nueva Atracción"

**Formulario de Atracción (Crear/Editar):**
- Datos básicos: nombre, slug, descripción corta, descripción completa, dirección, lat/lng, punto de encuentro
- Jerarquía: Selector de Categoría → Subcategoría → Ubicación
- Tags: Selector múltiple con autocompletado
- **Tab Medios:** Subida de imágenes/videos, marcar imagen principal
- **Tab Opciones de Producto:**
  - Lista de `product_option` (Ej: "Tour Privado", "Tour Grupal")
  - Por cada opción: configurar `price_tier` (Adulto, Niño, Senior con precios)
  - Configurar política de cancelación
- **Tab Itinerario:**
  - Crear/editar `tour_itinerary`
  - Agregar `tour_stop` con número de parada, nombre, descripción, lat/lng y duración

**Endpoints consumidos:**

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/api/v1/attraction` | Listar atracciones |
| `POST` | `/api/v1/attraction` | Crear nueva atracción |
| `PUT` | `/api/v1/attraction/{id}` | Editar atracción |
| `DELETE` | `/api/v1/attraction/{id}` | Eliminar/desactivar |

### 4.3 Configuración del Catálogo (`/admin/catalog-setup`)

**Tabs:**
1. **Categorías:** CRUD de `category` (nombre, slug, ícono)
2. **Subcategorías:** CRUD de `subcategory` ligada a una categoría padre
3. **Ubicaciones:** CRUD de `locations` con soporte de jerarquía (`parent_id`)
4. **Tags:** CRUD de `tag`
5. **Categorías de Ticket:** CRUD de `ticket_category` (Adulto, Niño, etc.)
6. **Tipos de Medios:** Ver `media_type`

### 4.4 Gestión de Reservas Admin (`/admin/bookings`)

**Lista de Reservas:**
- Tabla con filtros por: fecha, estado, atracción, email del cliente
- Columnas: PNR, Cliente, Atracción, Fecha, Monto, Estado
- Acciones: Ver detalle, Cancelar

**Endpoints consumidos:**

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/api/v1/admin-booking/management` | Listar reservas (rol Admin/Partner) |
| `GET` | `/api/v1/admin-booking/{pnr}` | Ver detalle de reserva por PNR |
| `POST` | `/api/v1/admin-booking/cancel` | Cancelar reserva como admin |

### 4.5 Gestión de Facturación (`/admin/billing`)

**Reportes:**
- Tabla de facturas con filtros por fecha y cliente
- Totales agrupados por mes
- Exportación CSV (simulada)

**Endpoints consumidos:**

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/api/v1/billing/management` | Listar facturas |

### 4.6 Gestión de Inventario/Disponibilidad (`/admin/inventory`)

**Funcionalidad:**
- Seleccionar una atracción y su `product_option`
- Ver calendario de slots (`availability_slot`) con cupos disponibles
- Agregar nuevos slots (fecha, hora inicio/fin, capacidad total)

---

## FASE 5 — Características Avanzadas y Pulido

### 5.1 Mapa Interactivo de Itinerario
- Integración con **Leaflet.js** o **Google Maps**
- Mostrar pines numerados para cada `tour_stop`
- Al clickear un pin, mostrar panel lateral con info de la parada


---

## Resumen del Plan de Fases

| Fase | Alcance | Dependencia |
|---|---|---|
| **Fase 0** | Configurar todas las rutas en el API Gateway | Backend listo ✅ |
| **Fase 1** | Setup del proyecto Angular + Design System (tokens, tipografía, componentes base) | Fase 0 |
| **Fase 2** | Módulo de Autenticación (Login, Registro, Guardias, Interceptores) | Fase 1 |
| **Fase 3** | Portal del Cliente: Home, Catálogo, Detalle, Checkout, Mi Cuenta | Fase 2 |
| **Fase 4** | Panel de Administración: Dashboard, CRUD Atracciones, Reservas, Facturación | Fase 2 |
| **Fase 5** | Pulido: Mapa Itinerario, Reseñas, Toasts, Skeleton Loaders, PWA básico | Fases 3 y 4 |

---

> **Nota de Arquitectura:** Todos los llamados HTTP deben pasar exclusivamente por el API Gateway. El `AuthInterceptor` en Angular leerá el token JWT del `localStorage` y lo inyectará automáticamente como cabecera `Authorization: Bearer <token>` en cada petición a los endpoints protegidos. Los endpoints públicos (catálogo, disponibilidad) no necesitan token.
