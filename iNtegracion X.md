# Guía de Integración — Sistema de Atracciones

**API Gateway (Producción):** `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io`  
**API Gateway (Desarrollo):** `https://localhost:7000`

Todos los endpoints de esta guía se consumen a través del Gateway. No es necesario apuntar directamente a los microservicios.

---

## Rutas Públicas (sin JWT)

### Catálogo de Atracciones

| Método | Ruta completa | Descripción |
|--------|--------------|-------------|
| `GET` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/attraction` | Listar todas las atracciones activas |
| `GET` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/attraction/top` | Atracciones mejor valoradas |
| `GET` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/attraction/{slug}` | Detalle de atracción por slug |
| `GET` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/productoption/by-attraction/{attractionId}` | Opciones de producto y precios de una atracción |

**Parámetros de búsqueda para `GET /api/v1/attraction`:**

```
?page=1&pageSize=20&search=tour&ubicacion=Quito&disponible=true
```

---

### Disponibilidad

| Método | Ruta completa | Descripción |
|--------|--------------|-------------|
| `GET` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/booking/disponibilidad?attractionId={uuid}` | Disponibilidad de los próximos 30 días |
| `GET` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/booking/disponibilidad?attractionId={uuid}&fecha=2026-07-15` | Disponibilidad de una fecha específica |

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "data": [
    {
      "fecha": "2026-07-15",
      "cuposDisponibles": 20,
      "horarios": [
        {
          "slotId": "a1b2c3d4-...",
          "horaInicio": "09:00",
          "horaFin": "11:00",
          "cuposDisponibles": 12,
          "cuposTotales": 20
        }
      ]
    }
  ]
}
```

> El `slotId` de cada horario es el que se envía en el campo `slotId` al crear la reserva.

---

### Booking (Reserva — sin autenticación)

| Método | Ruta completa | Descripción |
|--------|--------------|-------------|
| `POST` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/booking` | Crear reserva como invitado |

---

### Payment (Pago — sin autenticación)

| Método | Ruta completa | Descripción |
|--------|--------------|-------------|
| `POST` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/payment` | Registrar pago de una reserva |
| `PUT` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/payment/{paymentId}/status` | Confirmar resultado del pago |

---

## Rutas con Autenticación (JWT Bearer)

### Auth

| Método | Ruta completa | Descripción |
|--------|--------------|-------------|
| `POST` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/auth/register` | Registrar nueva cuenta |
| `POST` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/auth/login` | Iniciar sesión y obtener JWT |

### Booking Autenticado

| Método | Ruta completa | Descripción |
|--------|--------------|-------------|
| `GET` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/booking/mis-reservas` | Historial de reservas del usuario |
| `POST` | `https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/booking/{bookingId}/cancel` | Cancelar reserva propia |

---

## Flujos de Integración

---

### Flujo 1 — Reserva Pública (Usuario Invitado)

Este es el flujo principal para integradores externos. No requiere que el usuario tenga cuenta.

```
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 1 — Descubrir el catálogo                                      │
│                                                                     │
│  GET /api/v1/attraction                                             │
│  ← Devuelve lista de atracciones con id, nombre, precio base        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 2 — Ver detalle y precios de la atracción elegida              │
│                                                                     │
│  GET /api/v1/attraction/{slug}                                      │
│  ← Devuelve descripción completa, imágenes, ubicación               │
│                                                                     │
│  GET /api/v1/productoption/by-attraction/{attractionId}             │
│  ← Devuelve opciones con sus priceTiers                             │
│     Cada priceTier tiene: { id, label, price }                      │
│     Ejemplo: { id: "uuid-adulto", label: "Adulto", price: 45.00 }  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 3 — Consultar disponibilidad                                   │
│                                                                     │
│  GET /api/v1/booking/disponibilidad?attractionId={id}&fecha=...     │
│  ← Devuelve horarios disponibles. Cada horario tiene un slotId.     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 4 — El usuario llena el formulario de reserva                  │
│                                                                     │
│  El frontend recolecta:                                             │
│  - slotId elegido (del paso 3)                                      │
│  - Por cada pasajero: nombre, apellido, documento, priceTierId      │
│  - Datos de contacto: nombre, email                                 │
│  - Datos fiscales opcionales (billing)                              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 5 — Crear la reserva (SIN JWT)                                 │
│                                                                     │
│  POST /api/v1/booking                                               │
│                                                                     │
│  Body:                                                              │
│  {                                                                  │
│    "slotId": "a1b2c3d4-...",                                        │
│    "attractionId": "11111111-...",                                  │
│    "productOptionId": "aaaaaaaa-...",                               │
│    "contactName": "María García",                                   │
│    "contactEmail": "maria@email.com",                               │
│    "tickets": [                                                     │
│      {                                                              │
│        "priceTierId": "f1f1f1f1-...",                               │
│        "firstName": "María",                                        │
│        "lastName": "García",                                        │
│        "documentNumber": "0912345678",                              │
│        "documentType": "CI"                                         │
│      }                                                              │
│    ],                                                               │
│    "billing": {                                                     │
│      "customerName": "María García",                                │
│      "taxId": "0912345678",                                         │
│      "email": "maria@email.com"                                     │
│    }                                                                │
│  }                                                                  │
│                                                                     │
│  ← El sistema:                                                      │
│    1. Genera un UUID aleatorio como userId del invitado             │
│    2. Bloquea los cupos en el inventario                            │
│    3. Crea la reserva con status "Confirmed"                        │
│    4. Crea la factura en Billing via gRPC (transparente)            │
│    5. Devuelve la respuesta                                         │
│                                                                     │
│  Respuesta:                                                         │
│  {                                                                  │
│    "success": true,                                                 │
│    "data": {                                                        │
│      "bookingId": "bbbbbbbb-...",   ← GUARDAR ESTE ID               │
│      "pnrCode": "A1B2C3D4",                                         │
│      "status": "Confirmed",                                         │
│      "totalAmount": 52.88,                                          │
│      "currency": "USD",                                             │
│      "activityDate": "2026-07-15T09:00:00Z",                        │
│      "attractionName": "Tour Ciudad Histórica"                      │
│    },                                                               │
│    "message": "Reserva creada exitosamente."                        │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

> **Nota de seguridad:** Al ser pública, cualquier persona con un `slotId` y `priceTierId` válidos puede crear una reserva. Esto es aceptable en el modelo de integración ya que la reserva requiere datos del pasajero y posteriormente un pago.

---

### Flujo 2 — Pago de la Reserva (Usuario Invitado)

Continúa inmediatamente después del Flujo 1. El frontend ya tiene el `bookingId`.

```
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 1 — Mostrar pantalla de pago                                   │
│                                                                     │
│  El frontend muestra:                                               │
│  - Resumen de la reserva (attractionName, totalAmount, currency)    │
│  - Formulario de tarjeta simulado (número, nombre, fecha, CVV)      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 2 — Registrar el pago (SIN JWT)                                │
│                                                                     │
│  POST /api/v1/payment                                               │
│                                                                     │
│  Body:                                                              │
│  {                                                                  │
│    "bookingId": "bbbbbbbb-...",    ← del paso anterior              │
│    "paymentMethodId": 1,           ← 1=Crédito, 2=Débito            │
│    "amount": 52.88,                ← debe coincidir con totalAmount  │
│    "currencyCode": "USD",                                           │
│    "transactionExternalId": "ch_simulated_abc123"                   │
│  }                                                                  │
│                                                                     │
│  ← Respuesta:                                                       │
│  {                                                                  │
│    "id": "pppppppp-..."   ← paymentId para el siguiente paso        │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 3 — Confirmar el resultado del procesador (SIN JWT)            │
│                                                                     │
│  PUT /api/v1/payment/{paymentId}/status                             │
│                                                                     │
│  Body:                                                              │
│  {                                                                  │
│    "statusId": 2,                  ← 2=Completado/Pagado            │
│    "transactionExternalId": "ch_simulated_abc123",                  │
│    "gatewayResponse": "approved"                                    │
│  }                                                                  │
│                                                                     │
│  ← 204 No Content (éxito)                                           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 4 — Mostrar confirmación al usuario                            │
│                                                                     │
│  El frontend muestra la pantalla de "¡Gracias por tu compra!"       │
│  con el código PNR y el resumen de la reserva.                      │
│                                                                     │
│  En el backend, el sistema habrá:                                   │
│  - Marcado el pago como "Completado"                                │
│  - La factura fue creada automáticamente al crear la reserva        │
└─────────────────────────────────────────────────────────────────────┘
```

**Resumen del estado final en el sistema tras el flujo completo:**

| Entidad | Estado |
|---------|--------|
| Reserva (Booking) | `Confirmed` |
| Factura (Invoice) | Creada automáticamente al crear la reserva |
| Pago (Payment) | `Completed` (statusId = 2) |
| Inventario (Slot) | Cupos decrementados |

---

### Flujo 3 — Usuario Registrado (Opcional)

Para integradores que quieren ofrecer historial de reservas a sus usuarios.

```
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 1 — Registrar cuenta                                           │
│                                                                     │
│  POST /api/v1/auth/register                                         │
│  { "email": "...", "password": "...", "firstName": "...", ... }     │
│  ← Devuelve JWT                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 2 — Login para sesiones posteriores                            │
│                                                                     │
│  POST /api/v1/auth/login                                            │
│  { "email": "...", "password": "..." }                              │
│  ← { "token": "eyJhbGciOi...", "expiresAt": "..." }                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 3 — Crear reserva con JWT (el userId ya no es un UUID random)  │
│                                                                     │
│  POST /api/v1/booking                                               │
│  Authorization: Bearer eyJhbGciOi...                                │
│  (mismo body que el flujo invitado)                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PASO 4 — Ver historial de reservas                                  │
│                                                                     │
│  GET /api/v1/booking/mis-reservas                                   │
│  Authorization: Bearer eyJhbGciOi...                                │
│  ← Lista de reservas del usuario                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Referencia Rápida de IDs Necesarios por Flujo

Para construir el body de `POST /api/v1/booking` se necesitan exactamente estos 3 IDs:

| Campo en el body | De dónde se obtiene |
|-----------------|---------------------|
| `slotId` | `GET /api/v1/booking/disponibilidad` → `data[].horarios[].slotId` |
| `productOptionId` | `GET /api/v1/productoption/by-attraction/{id}` → `data[].id` |
| `tickets[].priceTierId` | `GET /api/v1/productoption/by-attraction/{id}` → `data[].priceTiers[].id` |

El `attractionId` es el `id` de la atracción obtenido del catálogo (`GET /api/v1/attraction`).

---

## Códigos de Estado de Pago

| statusId | Nombre | Descripción |
|----------|--------|-------------|
| 1 | Pendiente | Pago registrado, esperando confirmación |
| 2 | Completado | Pago confirmado y exitoso |
| 3 | Fallido | El procesador rechazó el pago |
| 4 | Reembolsado | Pago devuelto (requiere rol Admin/Partner) |

## Métodos de Pago

| paymentMethodId | Nombre |
|-----------------|--------|
| 1 | Tarjeta de Crédito |
| 2 | Tarjeta de Débito |
| 3 | Transferencia Bancaria |
