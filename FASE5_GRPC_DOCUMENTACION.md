# Fase 5: Documentación Completa — Comunicación gRPC entre Microservicios

## Tabla de Contenidos
1. [¿Qué es gRPC y por qué se implementó?](#1-qué-es-grpc)
2. [¿Qué es HTTP/2 y por qué dio problemas?](#2-http2-y-los-problemas)
3. [La Solución: Dos Puertos en Catalog](#3-la-solución-dos-puertos)
4. [Arquitectura Completa del Sistema](#4-arquitectura-completa)
5. [Cambios Realizados en el Código](#5-cambios-realizados)
6. [Análisis de las Dos Rutas de Booking](#6-las-dos-rutas-de-booking)
7. [El Gateway (YARP) y las Rutas](#7-el-gateway-yarp)
8. [Análisis del Contrato atracciones-api.yaml](#8-análisis-del-contrato)
9. [Comunicación entre Otros Microservicios](#9-otros-microservicios)
10. [Implicaciones en la Nube](#10-implicaciones-en-la-nube)

---

## 1. ¿Qué es gRPC?

**gRPC** (Google Remote Procedure Call) es un protocolo de comunicación de alto rendimiento creado por Google. A diferencia de REST (donde envías JSON por HTTP), gRPC usa:

- **Protocol Buffers (Protobuf)**: Un formato binario ultra-compacto. En lugar de enviar `{"price": 85.00}` como texto JSON, envía los bytes crudos del número. Esto es **10x más rápido** que JSON.
- **HTTP/2**: El protocolo de transporte obligatorio (más sobre esto en la sección 2).
- **Contratos tipados (`.proto`)**: Un archivo que define exactamente qué datos se envían y reciben, generando código automáticamente en C#.

### ¿Por qué se implementó en este proyecto?

**Problema de seguridad:** Cuando un usuario crea una reserva (booking), el frontend envía un JSON con el precio del boleto. Un hacker podría modificar ese JSON en Postman/DevTools y poner `"unitPrice": 1.00` para un boleto que cuesta $85.00.

**Solución gRPC:** El microservicio de Booking ya NO confía en el precio que envía el frontend. En su lugar, hace una llamada gRPC interna al microservicio de Catalog para preguntar: *"¿Cuál es el precio REAL de este boleto?"*, y usa ese precio oficial. El precio del frontend se ignora completamente.

### El contrato `.proto` de este proyecto

```protobuf
// Archivo: Shared.gRPC/Protos/catalog.proto
service CatalogService {
  rpc ValidateBookingData (ValidateBookingRequest) returns (ValidateBookingResponse);
}
```

Booking envía: `attraction_id`, `product_option_id`, `price_tier_ids[]`
Catalog responde: `attraction_name` (oficial), `product_title` (oficial), `price_tiers[]` con el **precio real** de cada categoría.

---

## 2. HTTP/2 y los Problemas

### ¿Qué es HTTP/2?

HTTP/2 es la evolución de HTTP/1.1 (el protocolo que usan los navegadores desde los años 90). Las diferencias clave:

| Característica | HTTP/1.1 | HTTP/2 |
|---|---|---|
| Formato | Texto plano | Binario |
| Conexiones | Una petición a la vez por conexión | Múltiples peticiones simultáneas (multiplexing) |
| Cabeceras | Se envían completas cada vez | Se comprimen (HPACK) |
| Requisito TLS | No | **Sí** (en navegadores) |

### ¿Por qué gRPC EXIGE HTTP/2?

gRPC necesita el **multiplexing** y el **streaming bidireccional** de HTTP/2. No puede funcionar sobre HTTP/1.1.

### ¿Por qué dio problemas en nuestro código?

El error fue: `HTTP/2 error code 'HTTP_1_1_REQUIRED' (0xd)`

**Explicación:** En desarrollo local, nuestros servidores corren sin HTTPS (sin certificado SSL). El problema es que HTTP/2 normalmente negocia el protocolo usando **ALPN** (Application-Layer Protocol Negotiation), que es una extensión de TLS. Sin TLS, no hay ALPN, y el servidor no puede negociar HTTP/2.

Intentamos varias soluciones que fallaron:

1. **`Http1AndHttp2`** → Requiere TLS para negociar. Sin TLS, siempre cae a HTTP/1.1.
2. **`ConfigureKestrel` explícito** → Conflicto con `launchSettings.json` porque ambos intentan vincular el mismo puerto.

### La solución final: Dos puertos separados (explicado en la sección 3).

---

## 3. La Solución: Dos Puertos

Como `Http1AndHttp2` no funciona sin TLS, la solución es separar los protocolos en puertos dedicados:

```
┌─────────────────────────────────────────────┐
│           CATALOG MICROSERVICE              │
│                                             │
│   Puerto 5002 (HTTP/1.1)                    │
│   ├── REST APIs (/api/v1/catalog/...)       │
│   ├── Swagger UI                            │
│   └── Gateway YARP → conecta aquí           │
│                                             │
│   Puerto 5012 (HTTP/2)                      │
│   └── gRPC Service (CatalogGrpcService)     │
│       └── Booking → conecta aquí            │
└─────────────────────────────────────────────┘
```

### Configuración en `appsettings.json` de Catalog:

```json
"Kestrel": {
  "Endpoints": {
    "Http": {
      "Url": "http://localhost:5002",
      "Protocols": "Http1"        // REST + Swagger
    },
    "Grpc": {
      "Url": "http://localhost:5012",
      "Protocols": "Http2"        // gRPC exclusivo
    }
  }
}
```

### Configuración del cliente gRPC en Booking (`Program.cs`):

```csharp
builder.Services.AddGrpcClient<CatalogService.CatalogServiceClient>(o =>
{
    o.Address = new Uri("http://localhost:5012"); // Puerto HTTP/2 de Catalog
})
.ConfigurePrimaryHttpMessageHandler(() =>
{
    var handler = new SocketsHttpHandler();
    handler.EnableMultipleHttp2Connections = true;
    return handler;
});
```

### ¿El Gateway se ve afectado?

**No.** El Gateway YARP sigue conectando al puerto 5002 (HTTP/1.1) para las APIs REST. El puerto 5012 es exclusivamente para comunicación interna gRPC entre microservicios. El Gateway nunca necesita hablar gRPC.

---

## 4. Arquitectura Completa del Sistema

```
                    ┌──────────────────┐
                    │   FRONTEND /     │
                    │   POSTMAN /      │
                    │   SISTEMA EXT.   │
                    └────────┬─────────┘
                             │ HTTP/1.1
                             ▼
                    ┌──────────────────┐
                    │   GATEWAY (YARP) │
                    │   Puerto: 5000   │
                    └──┬───┬───┬───┬───┘
                       │   │   │   │  HTTP/1.1 (todas)
            ┌──────────┘   │   │   └──────────┐
            ▼              ▼   ▼              ▼
    ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
    │  IDENTIFY    │ │  CATALOG    │ │  BILLING     │
    │  Puerto:5001 │ │  5002(REST) │ │  Puerto:5004 │
    │              │ │  5012(gRPC) │ │              │
    │  - Auth      │ │  - Atracción│ │  - Pagos     │
    │  - Clientes  │ │  - Productos│ │  - Facturas  │
    │  - Usuarios  │ │  - Precios  │ │              │
    └──────────────┘ └──────┬──────┘ └──────────────┘
                            │ gRPC (HTTP/2)
                            │ Puerto 5012
                            ▼
                    ┌──────────────┐
                    │   BOOKING    │
                    │  Puerto:5003 │
                    │              │
                    │  - Reservas  │
                    │  - Reviews   │
                    │  - Inventario│
                    └──────────────┘
```

---

## 5. Cambios Realizados en el Código

### 5.1 Proyecto Compartido: `Microservicios.Atracciones.Shared.gRPC`
- **Nuevo proyecto** con el archivo `catalog.proto`
- Define el servicio `CatalogService` con el método `ValidateBookingData`
- Genera automáticamente las clases C# del cliente y servidor

### 5.2 Catalog.API (Servidor gRPC)
- `Grpc/CatalogGrpcService.cs`: Implementa `ValidateBookingData`. Consulta la BD para obtener nombres y precios oficiales.
- `Program.cs`: Registra `AddGrpc()` y `MapGrpcService<CatalogGrpcService>()`
- `appsettings.json`: Configura Kestrel con dos puertos (5002 REST + 5012 gRPC)

### 5.3 Booking.API (Cliente gRPC)
- `Program.cs`: Registra `AddGrpcClient<CatalogServiceClient>` apuntando a `http://localhost:5012`
- `BookingService.cs` (ruta `/admin-booking`): Intercepta la creación de reserva, llama a Catalog vía gRPC, y **sobrescribe los precios del request** con los oficiales.

### 5.4 Gateway (YARP)
- `appsettings.json`: Se agregó la ruta `admin-booking-route` para que el Gateway pueda redirigir peticiones a `/api/v1/admin-booking`

### 5.5 Base de Datos
- Tablas `audit_log` renombradas (antes `booking_audit_log`, `catalog_audit_log`, etc.)
- Columnas `changed_by`, `ip_address`, `user_agent`, `endpoint` agregadas a `audit_log`
- Registro `booking_status` poblado con los 4 estados
- Datos de prueba (atracción, producto, precios, slot) insertados

---

## 6. Las Dos Rutas de Booking (Explicación Detallada)

Tu proyecto tiene **dos controladores** que crean reservas. **Ninguno es "antiguo"** — ambos tienen propósitos distintos:

### Ruta 1: `POST /api/v1/booking` → `AtraccionesBookingController`
- **Servicio**: `BookingIntegrationService.CrearReservaAsync()`
- **Propósito**: Endpoint del **contrato de integración** con el sistema central de Booking (definido en `atracciones-api.yaml`). Diseñado para ser consumido por un **sistema externo** que ya validó los datos por su cuenta.
- **¿Usa gRPC?**: **NO**. Confía en los datos que le llegan en el request.
- **¿Mapea `UnitPrice`?**: **SÍ**, la propiedad `UnitPrice` existe en `TicketBookingDetailDto` (línea 271). El servicio la usa en `totalAmount += t.UnitPrice` (línea 96 de `BookingIntegrationService`).
- **¿Por qué confía ciegamente?**: Porque en el contexto de integración, el sistema externo que llama a esta API ya tiene sus propios mecanismos de validación. Este endpoint existe para que un sistema de Booking central pueda orquestrar reservas.

**El problema del precio $0.00** que viste antes fue porque enviaste el JSON con la estructura de `passengers` (del otro controlador), no con `tickets`. La normalización (`Normalize()`) convierte `passengers` → `tickets`, pero no incluye `UnitPrice` en esa conversión porque `PassengerBookingDto` no tiene esa propiedad.

### Ruta 2: `POST /api/v1/admin-booking` → `BookingController`
- **Servicio**: `BookingService.CreateBookingAsync()`
- **Propósito**: Endpoint interno de tu plataforma para crear reservas desde tu propia aplicación web/móvil.
- **¿Usa gRPC?**: **SÍ**. Llama a `_catalogClient.ValidateBookingDataAsync()` y sobrescribe `UnitPrice` con el precio oficial de la base de datos de Catalog.
- **Roles permitidos**: `Client`, `Admin`, `Partner`
- **Seguridad**: El `userId` se extrae exclusivamente del token JWT, no del JSON.

### Resumen Visual

```
┌──────────────────────────────────────────────────────────────┐
│  POST /api/v1/booking (AtraccionesBookingController)         │
│  ► Para: Sistema externo de Booking (integración)            │
│  ► Validación gRPC: NO                                       │
│  ► Confía en: Los datos del request                          │
│  ► Servicio: BookingIntegrationService                       │
│  ► UnitPrice: Se toma del TicketBookingDetailDto             │
├──────────────────────────────────────────────────────────────┤
│  POST /api/v1/admin-booking (BookingController)              │
│  ► Para: Tu plataforma web/móvil (usuarios propios)          │
│  ► Validación gRPC: SÍ (llama a Catalog)                    │
│  ► Confía en: SOLO la base de datos de Catalog               │
│  ► Servicio: BookingService                                  │
│  ► UnitPrice: Se SOBRESCRIBE con el precio oficial de gRPC   │
└──────────────────────────────────────────────────────────────┘
```

### ¿Para que `/api/v1/booking` quede funcional como está, que falta?

Funciona correctamente si envías el JSON con la estructura `tickets` que incluye `unitPrice`. El JSON correcto para esta ruta sería:

```json
{
  "slotId": "55555555-...",
  "attractionId": "11111111-...",
  "attractionName": "Tour del Centro",
  "productTitle": "Opción Standard",
  "currency": "USD",
  "tickets": [
    {
      "ticketCategoryId": "...",
      "priceTierId": "44444444-...",
      "firstName": "Juan",
      "lastName": "Pérez",
      "documentNumber": "123456",
      "unitPrice": 85.00,
      "priceTierLabel": "Adulto"
    }
  ]
}
```

---

## 7. El Gateway (YARP) y las Rutas

El API Gateway usa **YARP** (Yet Another Reverse Proxy) de Microsoft. Funciona como un "portero" que recibe TODAS las peticiones en el puerto 5000 y las redirige al microservicio correcto:

| Ruta entrante al Gateway | Se redirige a | Puerto |
|---|---|---|
| `/api/v1/Auth/*` | Identity | 5001 |
| `/api/v1/client/*` | Identity | 5001 |
| `/api/v1/catalog/*` | Catalog | 5002 |
| `/api/v1/booking/*` | Booking | 5003 |
| `/api/v1/admin-booking/*` | Booking | 5003 |
| `/api/v1/review/*` | Booking | 5003 |
| `/api/v1/billing/*` | Billing | 5004 |
| `/api/v1/payment/*` | Billing | 5004 |

**Importante:** El Gateway siempre conecta al puerto HTTP/1.1 de cada servicio. No interactúa con el puerto gRPC (5012). La comunicación gRPC es **exclusivamente interna** entre Booking y Catalog.

### ¿Los dos puertos de Catalog afectan al Gateway?

**No.** El Gateway solo conoce `http://localhost:5002` (REST). El puerto 5012 (gRPC) es invisible para él.

---

## 8. Análisis del Contrato `atracciones-api.yaml`

El contrato define los endpoints que un **sistema externo de Booking** espera consumir. Analicemos si tu proyecto los expone:

### Endpoints del Contrato vs. Tu Proyecto

| Contrato (`atracciones-api.yaml`) | Ruta esperada | ¿Existe? | Ruta real en tu proyecto | Microservicio |
|---|---|---|---|---|
| `GET /atracciones` | Listar atracciones | ⚠️ Parcial | `GET /api/v1/catalog/attraction` | Catalog |
| `GET /atracciones/{id}` | Detalle por ID | ⚠️ Parcial | `GET /api/v1/catalog/attraction/{slug}` (por slug, no ID) | Catalog |
| `GET /atracciones/{id}/disponibilidad` | Disponibilidad | ⚠️ Parcial | `GET /api/v1/booking/disponibilidad` (en Booking, no Catalog) | Booking |
| `POST /booking` | Crear reserva | ✅ Sí | `POST /api/v1/booking` | Booking |
| `GET /booking` (mis reservas) | Listar mis reservas | ✅ Sí | `GET /api/v1/booking/mis-reservas` | Booking |
| `POST /booking/{id}/cancel` | Cancelar reserva | ✅ Sí | `POST /api/v1/booking/{id}/cancel` | Booking |
| `GET /billing/management` | Listar facturas | ✅ Sí | `GET /api/v1/billing/management` | Billing |
| `GET /client/validate/{docNumber}` | Validar cliente | ⚠️ Verificar | `GET /api/v1/client/validate/{docNumber}` | Identity |

### Observaciones

1. **Rutas de Catálogo**: El contrato espera `/atracciones` pero tu Catalog usa `/api/v1/catalog/attraction`. Un sistema externo necesitaría adaptar estas rutas, o podrías crear un controlador "wrapper" con la ruta exacta del contrato.

2. **DTOs de respuesta**: El contrato espera propiedades en español (`nombre`, `descripcion`, `precio`, `ubicacion`). Tu Catalog devuelve DTOs en inglés (`Name`, `Description`, etc.). Los DTOs de integración (`AtraccionBookingDto`) sí usan español y son compatibles.

3. **Disponibilidad**: El contrato la espera en `/atracciones/{id}/disponibilidad` (como sub-recurso de atracciones), pero en tu proyecto está en el microservicio de Booking (`BookingIntegrationService.ObtenerDisponibilidadAsync`).

### ¿Tu API puede conectarse a un sistema externo?

**Sí, es posible**, pero requiere ajustes menores:
- Las rutas base del contrato (`/atracciones`, `/booking`) ya las puedes servir desde el Gateway
- Los DTOs de integración (`BookingIntegrationDTOs.cs`) ya están diseñados con los nombres en español que el contrato espera
- Faltaría crear un controlador en Catalog o en el Gateway que exponga `/atracciones` con el DTO `AtraccionBookingDto` mapeando los datos internos al formato del contrato

---

## 9. Comunicación entre Otros Microservicios

### ¿Los demás microservicios necesitan gRPC?

| Comunicación | ¿Necesaria? | ¿Implementada? | Justificación |
|---|---|---|---|
| Booking → Catalog | ✅ Sí | ✅ Sí | Validar precios y nombres para evitar manipulación |
| Booking → Billing | 🔄 Futura | ❌ No | Cuando se confirme una reserva, Billing podría generar automáticamente una factura |
| Booking → Identity | 🔄 Futura | ❌ No | Validar que el `userId` del token exista realmente en Identity |
| Billing → Booking | 🔄 Futura | ❌ No | Al confirmar un pago, Billing podría actualizar el estado de la reserva |
| Catalog → Identity | ❌ No | ❌ No | No hay dependencia de datos entre catálogo y usuarios |
| Billing → Identity | ❌ No | ❌ No | No hay dependencia directa |

Actualmente, cada microservicio valida el JWT del usuario de forma independiente (cada uno tiene su propia configuración de JWT). La única comunicación backend-a-backend implementada es **Booking → Catalog** vía gRPC.

Si en el futuro necesitas más comunicaciones (ej. facturación automática), seguirías el mismo patrón:
1. Crear un nuevo método en `catalog.proto` (o un nuevo `.proto` para billing)
2. Implementar el servidor en el microservicio proveedor
3. Configurar el cliente gRPC en el microservicio consumidor
4. Agregar un puerto HTTP/2 dedicado en el proveedor

---

## 10. Implicaciones en la Nube

### ¿Qué cambia al subir a producción?

#### 10.1 Los Dos Puertos Dejan de ser Necesarios

En producción con HTTPS (TLS), el problema de HTTP/2 **desaparece**. Con un certificado SSL, puedes usar `Http1AndHttp2` en un solo puerto porque TLS permite la negociación ALPN. La configuración de Kestrel se simplificaría a:

```json
"Kestrel": {
  "EndpointDefaults": {
    "Protocols": "Http1AndHttp2"
  }
}
```

O simplemente dejar la configuración por defecto si usas HTTPS.

#### 10.2 URLs de Servicios

En local usamos `http://localhost:5002`. En la nube, cambiarías a:

```csharp
// En lugar de:
o.Address = new Uri("http://localhost:5012");

// Usarías (ejemplo con Azure/AWS/Docker):
o.Address = new Uri("https://catalog-service.internal:443");
```

Lo ideal es configurar esto vía variables de entorno o `appsettings.Production.json`:

```json
{
  "GrpcServices": {
    "CatalogAddress": "https://catalog-service.internal:443"
  }
}
```

#### 10.3 Opciones de Despliegue

| Plataforma | Cómo funciona gRPC |
|---|---|
| **Docker Compose** | Cada contenedor tiene su red interna. Booking conecta a `http://catalog:5012`. Con TLS interno, un solo puerto basta. |
| **Kubernetes** | Cada microservicio es un "Service" de K8s. gRPC funciona nativamente sobre los ClusterIPs internos con TLS mutual (mTLS). |
| **Azure Container Apps** | Soporta gRPC nativamente. Se configura el transporte HTTP/2 en el ingress. |
| **AWS ECS/Fargate** | Requiere un ALB (Application Load Balancer) con soporte HTTP/2 habilitado. |

#### 10.4 Service Discovery

En local, las URLs están hardcodeadas (`localhost:5012`). En la nube:
- **Docker Compose**: Usa nombres de servicio (`http://catalog-service:5012`)
- **Kubernetes**: Usa DNS interno (`http://catalog-service.default.svc.cluster.local`)
- **Cloud**: Usa service discovery (Consul, AWS Cloud Map, etc.)

#### 10.5 Seguridad en Producción

En producción deberías agregar:
- **mTLS** (mutual TLS): Tanto el cliente como el servidor se autentican mutuamente con certificados
- **API Keys** o **tokens** en los headers de gRPC para autenticación interna
- **Rate limiting** para proteger los servicios gRPC de abuso

---

## Resumen Final

### Lo que logramos

1. ✅ Comunicación gRPC funcional entre Booking y Catalog
2. ✅ Validación de precios en tiempo real (el precio $1.00 del hacker es ignorado)
3. ✅ Nombres oficiales de atracciones y productos obtenidos desde la fuente de verdad
4. ✅ Auditoría completa de todas las transacciones (`audit_log`)
5. ✅ Gateway configurado con todas las rutas necesarias
6. ✅ Dos controladores con propósitos claros y diferenciados

### Lo que faltaría para producción

1. 🔄 Ajustar las rutas del contrato `atracciones-api.yaml` o crear controladores wrapper
2. 🔄 Configurar HTTPS/TLS para eliminar la necesidad de dos puertos
3. 🔄 Externalizar las URLs de servicios a variables de entorno
4. 🔄 Implementar comunicación gRPC entre Booking↔Billing si se requiere facturación automática
5. 🔄 Agregar health checks y circuit breakers para resiliencia

---

*Documento generado como parte de la Fase 5: Evolución de Arquitectura y gRPC*
*Fecha: Mayo 2026*
