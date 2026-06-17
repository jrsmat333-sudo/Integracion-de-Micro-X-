# Análisis de Arquitectura Fase 3 — Event Bus, GraphQL, Tiempo Real y Móvil

> **Propósito de este documento.** Antes de generar un ROADMAP de implementación, primero necesitamos un **entendimiento compartido** de:
> 1. Cómo funciona tu sistema **hoy** (con nombres de archivos y rutas reales de tu repo).
> 2. **Qué es** cada tecnología nueva (Event Bus / RabbitMQ, GraphQL, SignalR, gRPC, idempotencia, resiliencia) y **cómo encaja** en TU proyecto, no en abstracto.
> 3. **Qué decisiones** todavía no están tomadas → al final hay una sección de **OPEN QUESTIONS** que tú responderás. Con tus respuestas armaremos el roadmap.
>
> Léelo de arriba a abajo. Los puntos marcados con ⭐ son los más importantes para decidir bien.

---

## Índice

1. [Cómo funciona tu sistema HOY](#1-cómo-funciona-tu-sistema-hoy)
2. [Glosario conceptual aplicado a tu proyecto](#2-glosario-conceptual-aplicado-a-tu-proyecto)
3. [Qué microservicios migrar al Event Bus (y cuáles NO)](#3-qué-microservicios-migrar-al-event-bus-y-cuáles-no)
4. [Los 4 puntos del sistema gemelo: ¿son factibles en tu proyecto?](#4-los-4-puntos-del-sistema-gemelo-son-factibles-en-tu-proyecto)
5. [El contrato con los integradores (lo más delicado)](#5-el-contrato-con-los-integradores-lo-más-delicado)
6. [Resiliencia, idempotencia y observabilidad](#6-resiliencia-idempotencia-y-observabilidad)
7. [Migración del frontend a móvil: Flutter vs React Native](#7-migración-del-frontend-a-móvil-flutter-vs-react-native)
8. [Despliegue: ¿me quedo en Azure?](#8-despliegue-me-quedo-en-azure)
9. [Cómo funciona TODO junto (flujo end-to-end)](#9-cómo-funciona-todo-junto-flujo-end-to-end)
10. [Resumen de tecnologías a instalar](#10-resumen-de-tecnologías-a-instalar)
11. [⭐ OPEN QUESTIONS (responde esto)](#11--open-questions-responde-esto)

---

## 1. Cómo funciona tu sistema HOY

Tu sistema es una arquitectura de **microservicios en .NET**, con **una base de datos PostgreSQL (Supabase) por servicio** (ya cumples *database-per-service*, ver `CONEXIONES.md`). Hay **4 microservicios de dominio + 1 Gateway + 1 Frontend**.

### 1.1. Los componentes reales

| Componente | Carpeta | Responsabilidad | Rutas que expone |
|---|---|---|---|
| **Identify** | `Microservicios.Atracciones.Identify` | Auth (JWT), usuarios, clientes | `/api/v1/auth`, `/api/v1/user`, `/api/v1/client` |
| **Catalog** | `Microservicios.Atracciones.Catalog` | Atracciones, modalidades (product options), categorías de ticket, ubicaciones | `/api/v1/attraction`, `/api/v1/productoption`, `/api/v1/ticketcategory`, `/api/v1/location` |
| **Booking** | `Microservicios.Atracciones.Booking` | Reservas, disponibilidad/inventario, reviews | `/api/v1/booking`, `/api/v1/admin-booking`, `/api/v1/inventory`, `/api/v1/review` |
| **Billing** | `Microservicios.Atracciones.Billing` | Facturas y pagos | `/api/v1/billing`, `/api/v1/payment` |

| **Gateway** | `Microservicios.Atracciones.Gateway.API` | Puerta de entrada única (YARP) + BFF agregador | Todo lo de arriba, unificado |

| **Frontend** | `Microservicios.Atracciones.Frontend` | React 18 + Vite + Tailwind (web) | — |

### 1.2. El Gateway: qué hace exactamente

Tu Gateway ([`Gateway.API/Program.cs`](Microservicios.Atracciones.Gateway.API/Program.cs)) hace **dos trabajos distintos** que conviene no confundir:

**(a) Reverse Proxy (YARP).** En [`appsettings.json`](Microservicios.Atracciones.Gateway.API/appsettings.json) tienes `ReverseProxy.Routes` y `ReverseProxy.Clusters`. Esto es un **enrutador tonto**: "si la URL empieza por `/api/v1/attraction/...` mándala al `catalog-cluster`". El cliente (web/móvil/integrador) solo conoce **una URL** (la del Gateway) y el Gateway reparte internamente a cada microservicio en Azure Container Apps. Esto es **interoperabilidad sintáctica**: un único punto de entrada, HTTPS+JSON hacia afuera.

**(b) BFF agregador (Backend For Frontend).** Además del proxy, tu `Program.cs` define endpoints "inteligentes" escritos a mano que **combinan varias llamadas en una sola respuesta**. El más importante: 

```
GET /api/v1/attraction/{slug}   →  el Gateway:
   1. pide el detalle a Catalog
   2. saca los productOptionId (modalidades)
   3. por cada modalidad pide disponibilidad a Booking
   4. normaliza precios (NormalizePrice) para que el integrador no reciba 0
   5. devuelve UN solo JSON con atracción + slots + precios
```

⭐ **Esto es clave:** tu Gateway **ya es un BFF**. Hoy lo haces "a mano" con `HttpClient` y `JsonNode`. **GraphQL es exactamente la versión formal y declarativa de lo que ya estás haciendo aquí.** No es un concepto nuevo para tu sistema; es reemplazar ese código manual por algo estándar.

### 1.3. Comunicación interna: gRPC síncrono

Entre microservicios **no** usas HTTP/REST, usas **gRPC** (más rápido, contratos `.proto` fuertemente tipados). Tienes 2 llamadas gRPC reales, definidas en `Microservicios.Atracciones.Shared.gRPC/Protos/`:

| Llamada gRPC | Quién llama | A quién | ¿Para qué? | ¿Bloqueante? |
|---|---|---|---|---|
| `ValidateBookingData` | Booking | Catalog | Validar precios/nombres/modalidad **antes** de confirmar la reserva | **SÍ, y debe seguir siéndolo** |

| `CreateInvoice` | Booking | Billing | Generar la factura tras la reserva | SÍ hoy, **pero NO debería** |


El detalle importante está en [`BookingIntegrationService.cs`](Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.Business/Services/BookingIntegrationService.cs):

```csharp
// CrearFacturaAsync(...)  — línea ~327
try {
    ...
    await _billingClient.CreateInvoiceAsync(grpcInvoice);  // gRPC síncrono a Billing
}
catch (Exception ex) {
    _logger.LogError(ex, "CrearFacturaAsync inner error ...");  // ⚠️ se traga el error
}
```

⭐ **Observación crítica para tu proyecto:** la llamada a Billing **ya está envuelta en try/catch y el error solo se loguea**. Es decir, hoy ya tratas la factura como algo "secundario" al flujo de reserva. **El problema:** si Billing está caído en ese instante, **la factura se pierde para siempre** (nadie la reintenta). Esto es justamente lo que el **Event Bus resuelve**: en lugar de perderse, el evento queda en una **cola** y se reintenta hasta que Billing vuelva. → Migrar Booking→Billing al bus **no solo es factible, sino que ARREGLA un bug de fiabilidad que ya tienes.**

### 1.4. Frontend actual

`Microservicios.Atracciones.Frontend` es **React 18 + Vite + Tailwind**, con `fetch` plano contra el Gateway ([`src/services/api.js`](Microservicios.Atracciones.Frontend/src/services/api.js), constante `GATEWAY`). Tiene dos "mundos" dentro de la misma app ([`src/App.jsx`](Microservicios.Atracciones.Frontend/src/App.jsx)):

- **Marketplace (consumidor / turista):** `LandingPage`, `AttractionCard`, `AttractionDetail`, `AuthModal`, `UserProfile`, `PaymentSimulation`, `Navbar`. → **Esto es lo que se migra a móvil.**
- **Panel Admin:** `AdminPanel.jsx`, que se renderiza solo cuando `user.role === 'Admin' || 'Partner'`. → **Esto NO se migra a móvil**, se queda en web (como pide la consigna).

⭐ El frontend **no tiene canal en tiempo real**: para ver cambios (nuevo stock, reserva confirmada) hay que recargar o re-pedir. Ese es el dolor que resuelven **GraphQL Subscriptions / SignalR (WebSockets)**.

### 1.5. Despliegue actual

- **Azure Container Apps**: cada microservicio + Gateway corren como contenedores (URLs `*.azurecontainerapps.io`, ver `appsettings.json` del Gateway).
- **Azure Container Registry (ACR)**: guarda las imágenes Docker.
- **CI/CD con GitHub Actions**: cada servicio tiene su workflow en `.github/workflows/build-*.yml`. El flujo es: `push a main` → `docker build` → `docker push a ACR`. (El re-despliegue al Container App lo hace Azure al detectar nueva imagen `:latest`, o manualmente.)
- **Bases de datos**: PostgreSQL gestionado en **Supabase** (4 instancias, una por servicio).

### 1.6. Diagrama del estado actual

```
                         ┌──────────────────────────────┐
   React Web (fetch) ───►│   API GATEWAY (YARP + BFF)    │
   Integradores  ───────►│  *.azurecontainerapps.io     │
                         └──────────────┬───────────────┘
                          REST/HTTP     │  (reparte por ruta)
            ┌──────────────┬────────────┼────────────┬───────────────┐
            ▼              ▼             ▼            ▼               ▼
        Identify        Catalog       Booking      Billing       (Reviews
         (JWT)        (atracciones)  (reservas)   (facturas)    viven en Booking)
            │              ▲             │ │           ▲
            │              │ gRPC        │ │  gRPC      │
            │              └─────────────┘ └────────────┘
            │           ValidateBooking   CreateInvoice
            ▼              ▼             ▼            ▼
        DB Identity    DB Catalog    DB Booking   DB Billing   (Supabase, 1 por servicio)
```

---

## 2. Glosario conceptual aplicado a tu proyecto

### 2.1. Event Bus / Message Broker (RabbitMQ)

**Qué es (teoría).** Una pieza de infraestructura que transporta **mensajes** entre servicios de forma **asíncrona**, con el patrón **Publicador/Suscriptor (Pub/Sub)**. El que produce un evento (*publisher*) no sabe ni le importa quién lo consume; lo deja en el bus y sigue. Los interesados (*consumers*) están suscritos y lo procesan a su ritmo.

**Analogía.** Llamada telefónica (gRPC/REST síncrono) = ambos tienen que estar disponibles **al mismo tiempo** y uno espera al otro. 

Buzón de correo / WhatsApp (Event Bus) = dejas el mensaje y sigues con tu vida; el otro lo lee cuando puede. Si está dormido, el mensaje **no se pierde**, lo lee al despertar.

**Conceptos de RabbitMQ que vas a oír:**
- **Exchange**: la "central de correos" que recibe el mensaje del publisher.
- **Queue (cola)**: el "buzón" donde se acumulan los mensajes esperando ser procesados.
- **Binding / Routing**: las reglas de "qué mensaje va a qué buzón".
- **Consumer**: el servicio que vacía el buzón y procesa.
- **DLQ (Dead Letter Queue)**: el "buzón de fallidos". Si un mensaje falla N veces, se aparta aquí para que nadie lo pierda y un humano lo revise.
- **At-least-once delivery**: RabbitMQ garantiza que el mensaje llega **al menos una vez** → puede llegar **duplicado** → por eso necesitas **idempotencia** (sección 6).

**Cómo encaja en TU proyecto.** Hoy: `Booking → gRPC → Billing` (síncrono, frágil). Mañana: `Booking → publica BookingCreatedEvent → RabbitMQ → Billing lo consume y factura`. Booking responde al usuario sin esperar a Billing.


**Tecnologías .NET:** **MassTransit** (librería que abstrae RabbitMQ; lo más usado y robusto en .NET) o el cliente nativo `RabbitMQ.Client`. **Recomendado: MassTransit** (te da reintentos, DLQ, idempotencia con menos código).

**Dónde corre RabbitMQ:** **CloudAMQP** (RabbitMQ gestionado en la nube, plan gratuito "Little Lemur"; es lo que usó el sistema gemelo) o **Azure Service Bus** (el equivalente nativo de Azure). Ver sección 8.

### 2.2. GraphQL

**Qué es (teoría).** Un lenguaje de consulta para APIs. En vez de tener decenas de endpoints REST fijos, expones **un solo endpoint** (`/graphql`) y el **cliente decide exactamente qué campos quiere** y cómo anidarlos. 

Tres operaciones:
- **Query**: leer datos (equivale a tus GET).
- **Mutation**: escribir datos (equivale a tus POST/PUT/DELETE).
- **Subscription**: ⭐ **suscripción en tiempo real** vía WebSocket. El servidor te *empuja* datos cuando algo cambia, sin que tú preguntes. **Esto es lo que elimina la recarga de pantalla.**

**El problema que resuelve (over-fetching / under-fetching y N+1):** hoy tu pantalla de detalle necesita: detalle de atracción (Catalog) + modalidades (Catalog) + disponibilidad (Booking). Por eso tu Gateway hace **3+ llamadas a mano** en `GET /api/v1/attraction/{slug}`. Con GraphQL el móvil manda **una query** y el servidor resuelve todo en paralelo:

```graphql
query {
  attraction(slug: "tour-copa-mundo") {
    name
    startingPrice
    products {
      title
      priceTiers { price categoryName }
      slots { fecha horaInicio cuposDisponibles }   # ← esto hoy lo unes a mano
    }
  }
}
```

⭐ **Encaje en tu proyecto:** GraphQL **reemplaza tu BFF artesanal** del `Program.cs` del Gateway por algo declarativo. Pero **ojo**: GraphQL es para tu **app (web/móvil)**, **NO** para los integradores. Los integradores **siguen usando REST** (el contrato del `atracciones-v2.yaml`). Conviven los dos.

**Tecnología .NET:** **HotChocolate** (el servidor GraphQL estándar de .NET; se instala como paquete NuGet en el Gateway). No requiere infraestructura nueva: corre **dentro del contenedor del Gateway**.

### 2.3. gRPC

**Qué es.** Comunicación **síncrona** binaria de servicio a servicio, con contratos `.proto`. Muy rápida y tipada. **Ya la usas** (`Shared.gRPC/Protos/catalog.proto` y `billing.proto`).

⭐ **No la elimines toda.** gRPC y Event Bus **no compiten**, se complementan:
- Usa **gRPC (síncrono)** cuando necesitas una **respuesta YA** para continuar. Ej: `ValidateBookingData` — Booking **necesita** saber "¿este precio es válido? ¿sí o no?" antes de cobrar. No puede esperar a un evento.
- Usa **Event Bus (asíncrono)** cuando la otra acción **puede ocurrir después** sin bloquear al usuario. Ej: facturar, notificar, enviar email.

### 2.4. SignalR / WebSockets (tiempo real)

**Qué es.** SignalR es la librería de .NET para **WebSockets**: una **conexión persistente bidireccional** entre el servidor (Gateway) y el cliente (web/móvil). El servidor puede "empujar" mensajes al cliente en cualquier momento (*server push*). Un **Hub** es el punto de conexión (ej. `/hub/notifications`).

**Diferencia con GraphQL Subscriptions.** Ambos logran lo mismo (tiempo real sobre WebSocket). Son **dos formas de hacer la misma cosa**:
- **GraphQL Subscriptions** (HotChocolate): el tiempo real va integrado en el mismo `/graphql`. Más elegante si ya usas GraphQL.
- **SignalR Hub** (lo que describió el sistema gemelo): un canal aparte (`/hub/notifications`) con eventos nombrados (`OnSlotCapacityChanged`, `OnAttractionCreated`). Más simple de entender y de conectar desde Flutter/React Native.

⭐ **Decisión a tomar (ver Open Questions):** ¿tiempo real con **GraphQL Subscriptions** o con **SignalR**? Puedes incluso usar **solo SignalR** para el tiempo real y GraphQL **solo para queries**. El gemelo usó **SignalR**.

### 2.5. ESB vs Microservicios (para la defensa de Semana 13)

- **ESB (Enterprise Service Bus):** bus **centralizado y "pesado"** que contiene lógica de negocio, orquestación y transformaciones. Punto único de fallo. Arquitecturas SOA antiguas.
- **Tu arquitectura (coreografía con broker ligero):** principio **"smart endpoints, dumb pipes"**. RabbitMQ solo **transporta** (tubería tonta); la lógica vive en los microservicios (extremos inteligentes). **Esta es tu justificación de diseño:** elegiste microservicios + broker ligero + API Gateway en vez de un ESB monolítico, para tener independencia de despliegue, escalado por servicio y sin punto único de fallo lógico.

---

## 3. Qué microservicios migrar al Event Bus (y cuáles NO)

### 3.1. Qué hizo el sistema gemelo

Según el contexto que adjuntaste, el gemelo migró **un solo flujo** al bus:

> "Al confirmarse una reserva, **el microservicio de reservas publica** un `BookingCreatedEvent`... **el microservicio de facturación (billing-api) consume** este evento de forma asíncrona para generar la factura."

Es decir: **Booking (publisher) → Billing (consumer)**. Lo demás siguió en REST/gRPC.

### 3.2. Mi recomendación para TU proyecto

**Regla de oro:** solo migras al bus lo que **tolera consistencia eventual** (puede pasar "un segundo después" sin que el usuario se quede esperando). Lo que necesita respuesta inmediata **se queda síncrono**.

| Flujo | Hoy | ¿Migrar al bus? | Por qué |
|---|---|---|---|
| **Booking → Billing** (crear factura) | gRPC síncrono, error tragado | ✅ **SÍ — migrar** | La factura no debe bloquear la reserva. Ya la tratas como secundaria. El bus además te da reintentos (hoy si Billing cae, la factura se pierde). **Este es EL caso a migrar.** |

| **Booking → Catalog** (`ValidateBookingData`) | gRPC síncrono | ❌ **NO — dejar en gRPC** | Necesitas la respuesta "precio válido sí/no" en milisegundos antes de cobrar. Un evento asíncrono no sirve aquí. |

| **Notificaciones / emails** (confirmación) | No existe (o manual) | ✅ **SÍ — si lo implementas** | Enviar email de confirmación reaccionando a `BookingCreatedEvent`. Nuevo consumer, no bloquea nada. |

| **Cambios de stock → UI** (tiempo real) | No existe | ✅ **SÍ (vía bus → Gateway → WebSocket)** | Booking publica `SlotCapacityChanged`; el Gateway lo escucha y lo reenvía por WebSocket a la app. |

| **Catalog → app** (listar atracciones) | REST por Gateway | ❌ **NO** | Lectura inmediata al abrir la app. Sigue siendo REST/GraphQL request-response. |

| **Identify (auth/login)** | REST | ❌ **NO** | Login necesita respuesta inmediata. Nada que ganar con el bus. |

⭐ **Conclusión:** te recomiendo migrar **exactamente lo mismo que el gemelo**: el flujo **Booking → Billing**, opcionalmente sumando **Notificaciones** y el **canal de tiempo real de stock**. **Identify y Catalog NO se tocan** en cuanto a comunicación. Esto cumple "solo migrar los NECESARIOS" y mantiene el riesgo bajo.

### 3.3. Eventos que definirías (librería compartida de contratos)

Crearías un proyecto nuevo tipo `Microservicios.Atracciones.Shared.Contracts` (paralelo a tu `Shared.gRPC`) con clases POCO de eventos:

```csharp
public record BookingCreatedEvent(
    Guid BookingId, Guid UserId, string CurrencyCode,
    decimal TotalAmount, List<InvoiceLine> Lines,
    BillingInfo Billing, DateTime OccurredOnUtc);

public record SlotCapacityChangedEvent(Guid SlotId, int NewCapacity);
public record BookingCancelledEvent(Guid BookingId, Guid SlotId, int ReleasedSeats);
```

Booking publica; Billing y el Gateway (para WebSocket) consumen.

---

## 4. Los 4 puntos del sistema gemelo: ¿son factibles en tu proyecto?

Analizo cada punto que describiste, con veredicto de **factibilidad** y **tamaño de refactor**.

### Punto 1 — Event Bus (RabbitMQ / CloudAMQP): Booking publica, Billing consume

- **Factibilidad:** ✅ Alta.
- **Refactor:** 🟡 Medio-bajo. Ya tienes el flujo aislado en `CrearFacturaAsync` de `BookingIntegrationService.cs`. Cambias `await _billingClient.CreateInvoiceAsync(...)` por `await _publishEndpoint.Publish(new BookingCreatedEvent(...))`. En Billing creas un `BookingCreatedConsumer` que llama al `IBillingService.CrearFacturaAsync` que **ya existe**. El gRPC de billing puede incluso quedar como respaldo o eliminarse.
- **Infra nueva:** una instancia de RabbitMQ (CloudAMQP gratis o Azure Service Bus).


### Punto 2 — GraphQL Gateway (BFF con HotChocolate)

- **Factibilidad:** ✅ Alta.
- **Refactor:** 🟡 Medio. Instalas HotChocolate en el Gateway y defines `Query`/types que internamente llaman a Catalog/Booking (igual que hoy tu BFF a mano, pero declarativo). **No rompes REST**: GraphQL vive en `/graphql` y el REST/YARP sigue intacto para integradores.

- **Matiz:** no es obligatorio reemplazar TODO tu BFF de golpe. Puedes exponer en GraphQL solo las pantallas del marketplace móvil y dejar el resto en REST. **Adopción incremental.**

### Punto 3 — Tiempo real (SignalR + RabbitMQ)

- **Factibilidad:** ✅ Alta, pero es el punto con **más piezas móviles**.
- **Refactor:** 🟠 Medio-alto. Necesitas: (a) que Booking/Catalog **publiquen eventos** al bus cuando cambia algo (crear atracción, cambiar stock); (b) que el **Gateway tenga consumers** que escuchen esos eventos; (c) que el Gateway exponga un **Hub SignalR** (`/hub/notifications`) y haga *broadcast*; (d) que la **app móvil** mantenga la conexión WebSocket y actualice su estado local.
- **Riesgo:** el Gateway pasa de ser "stateless/proxy" a tener **conexiones persistentes y consumers**. Funciona, pero si algún día escalas el Gateway a varias réplicas necesitarás un **backplane** (Azure SignalR Service o Redis) para que el broadcast llegue a clientes conectados a otra réplica. Para el alcance del reto, **una sola réplica del Gateway** es suficiente y lo evita.

### Punto 4 — Reacción reactiva en el cliente

- **Factibilidad:** ✅ Alta. Es trabajo **de la app móvil**, no del backend. En Flutter (BLoC/Riverpod) o React Native (Apollo/Zustand) te suscribes al Hub/Subscription y actualizas el estado → la UI se repinta sola.

### Tabla resumen

| Punto | Factibilidad | Refactor | ¿Infra nueva? |
|---|---|---|---|
| 1. Event Bus Booking→Billing | ✅ Alta | 🟡 Medio-bajo | RabbitMQ |
| 2. GraphQL BFF | ✅ Alta | 🟡 Medio | No (vive en Gateway) |
| 3. Tiempo real SignalR | ✅ Alta | 🟠 Medio-alto | No (Gateway) / opcional Azure SignalR |
| 4. Cliente reactivo | ✅ Alta | 🟡 (trabajo móvil) | No |

⭐ **Nada de esto requiere reescribir tu backend.** Son **adiciones** sobre lo que ya tienes. El punto más delicado es el 3 (tiempo real) por las conexiones persistentes.

---

## 5. El contrato con los integradores (lo más delicado)

Este es el punto donde un error te rompe la integración con otros equipos. Vamos con cuidado.

### 5.1. Tu pregunta directa

> "¿Los nombres de las rutas no cambian, es correcto? Solo cambiaría mi ruta de booking, las demás se mantienen en v1."

**Respuesta corta: prácticamente sí, con un matiz importante (el prefijo).** Comparando tu sistema con el contrato `atracciones-v2.yaml` del sistema gemelo (TerraQuest / "yanick-maila"):

| Operación | Sistema gemelo (contrato v2) | Tu sistema HOY | Cambio para ti |
|---|---|---|---|
| Listar atracciones | `GET /api/v1/{prefijo}/attraction` | `GET /api/v1/attraction` | Solo prefijo (ver abajo). **Sigue v1.** |
| Detalle atracción | `GET /api/v1/{prefijo}/attraction/{slug}` | `GET /api/v1/attraction/{slug}` | Solo prefijo. **Sigue v1.** |
| Crear reserva | `POST /api/v2/{prefijo}/booking` + `X-Idempotency-Key` | `POST /api/v1/booking` | ⭐ **Sube a v2 + idempotencia obligatoria.** |
| Cancelar reserva | `POST /api/v1/{prefijo}/booking/{id}/cancel` | `POST /api/v1/booking/{id}/cancel` | Solo prefijo. **Sigue v1.** |
| Disponibilidad | (vía detalle) | `GET /api/v1/booking/disponibilidad` | **Sigue v1.** |

✅ **Confirmado:** el **único cambio funcional de ruta** es que **crear reserva pasa a `v2` y exige la cabecera `X-Idempotency-Key`**. Todo lo demás permanece en **v1**.

### 5.2. ⭐ El tema del prefijo (`yanick-maila`)

El contrato gemelo usa `/api/v1/yanick-maila/attraction`. Ese `yanick-maila` es **el identificador del equipo dueño de ESE sistema**. Tu sistema **hoy NO tiene prefijo** (`/api/v1/attraction` directo).

Aquí hay una decisión que **no puedo tomar por ti** (Open Question Q1), porque depende de cómo el **integrador** distingue entre sistemas:

- **Opción A:** los integradores identifican cada sistema por **URL base distinta** (cada uno su Gateway). Entonces **no necesitas prefijo**; mantienes `/api/v1/attraction` y solo cambias booking a v2.

- **Opción B:** todos los sistemas viven detrás de un **mismo host** y se distinguen por **prefijo de ruta**. Entonces **sí** debes añadir tu propio prefijo (ej. `/api/v1/josue-tenesaca/attraction`).

**Lo bueno:** añadir un prefijo es **trivial en tu Gateway** — es cambiar los `Match.Path` en `appsettings.json` (`/api/v1/{tu-prefijo}/attraction/{**catch-all}`) y los paths de los endpoints BFF en `Program.cs`. **No tocas los microservicios** (el Gateway puede reescribir/quitar el prefijo antes de reenviar a Catalog/Booking). 

### 5.3. La reserva V2 con idempotencia (lo nuevo)

Hoy tu reserva entra por dos caminos:
1. **Interceptor del Gateway** (`Program.cs`, `bookingInterceptor` en `MapPost("/api/v1/booking")`) que parchea el `priceTierId` y reenvía a Booking.
2. **Controller real** en Booking: [`AtraccionesBookingController.cs`](Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.API/Controllers/V1/AtraccionesBookingController.cs), `[Route("api/v1/booking")]`, `[HttpPost]`.

Para V2 necesitas:
- Una ruta `POST /api/v2/{prefijo}/booking` que **exija** la cabecera `X-Idempotency-Key` (responde 400 si falta).
- Una **tabla de idempotencia** en la BD de Booking (ej. `IdempotencyKeys`: `Key`, `BookingId`, `ResponseJson`, `CreatedAt`). Si la misma `X-Idempotency-Key` llega 2 veces → **devuelves la reserva ya creada en vez de crear otra** (el contrato lo dice: *"o devuelta de caché si es duplicada"*).

- **Mantener v1 vivo** un tiempo (o redirigir v1→v2 internamente) para no romper a quien aún use v1.



⭐ **Importante:** la idempotencia del contrato (HTTP, con `X-Idempotency-Key`) y la idempotencia del Event Bus (mensajes duplicados de RabbitMQ) son **dos cosas distintas** que **ambas** necesitas (ver sección 6).

### 5.4. Estructura de los DTOs: ¿coinciden?

Comparando `atracciones-v2.yaml` con tus DTOs (`AtraccionBookingRequestDto`, `priceTiers`, `slots`, etc.), la estructura es **muy parecida** y tu Gateway ya hace **normalización** (precios, `categoryName`, etc.) precisamente para encajar con lo que el integrador espera. Esto es **interoperabilidad semántica**: que "precio", "modalidad", "slot" signifiquen lo mismo en ambos sistemas. → Hay que **revisar campo por campo** el día de armar el contrato, pero vas bien encaminado. (Open Question Q2.)

---

## 6. Resiliencia, idempotencia y observabilidad

Estos son los temas de las Semanas 14–15 y los "puntos de robustez" que pide la consigna.

### 6.1. Idempotencia (DOS niveles)

| Nivel | Problema | Solución | Dónde |
|---|---|---|---|
| **HTTP (contrato)** | El integrador reintenta el POST de reserva y crea 2 reservas | Tabla `IdempotencyKeys` + cabecera `X-Idempotency-Key` | Booking API (V2) |

| **Mensajería (RabbitMQ)** | RabbitMQ entrega el mismo evento 2 veces (*at-least-once*) → 2 facturas | Tabla `ProcessedEvents` (guardas `MessageId`; si ya existe, descartas) | Consumer de Billing |

⭐ Sin idempotencia, el Event Bus puede **duplicar cobros/facturas**. Es **obligatorio** si migras a RabbitMQ. MassTransit tiene soporte (`InMemoryOutbox`, filtros de idempotencia) que ayuda.

### 6.2. Patrones de fiabilidad (con Polly en .NET)

- **Retry + Exponential Backoff:** reintentar llamadas fallidas esperando 1s, 2s, 4s… (cortes de red transitorios). → Lo aplicas a las llamadas gRPC del Booking y a las HTTP del Gateway.
- **Circuit Breaker:** tras N fallos seguidos, "abrir el circuito" y rechazar rápido un tiempo, para no saturar un servicio caído.
- **Fallback:** plan B cuando algo falla (ej. devolver una caché de "atracciones destacadas" en vez de un 500).
- **DLQ (Dead Letter Queue):** mensajes que fallan repetidamente se aíslan en una cola muerta en RabbitMQ → **ningún dato se pierde**, un humano lo revisa.
- **Outbox pattern (opcional, avanzado):** para garantizar que "guardar la reserva" y "publicar el evento" ocurran atómicamente (evita publicar un evento de una reserva que no se guardó). MassTransit lo soporta.

### 6.3. Observabilidad

Es el "monitoreo" que pide la consigna. Tres pilares:
- **Logs estructurados:** ya usas `ILogger`. Mejóralo con **Serilog** + un destino central (Seq, o Azure Log Analytics que **ya tienes** porque Container Apps escribe ahí).

- **Métricas:** peticiones/seg, latencia, errores. **OpenTelemetry** → exporta a Azure Monitor / Application Insights.

- **Trazas distribuidas (tracing):** seguir una petición a través de Gateway → Booking → (RabbitMQ) → Billing con un mismo `TraceId`. Clave en microservicios para depurar. **OpenTelemetry + Application Insights** lo dan casi gratis en Azure.

⭐ **En Azure tienes ventaja:** Container Apps ya integra **Application Insights / Log Analytics**. Activar observabilidad es sobre todo **configuración**, no código nuevo masivo.

---

## 7. Migración del frontend a móvil: Flutter vs React Native

### 7.1. ¿Hay que tocar el backend? — Casi nada

Correcto: como el front **ya consume el Gateway por HTTP/JSON**, la app móvil consume **los mismos endpoints**. El backend cambia solo si decides exponer **GraphQL** y/o **WebSocket** para la app (que es opcional y aditivo). El **REST actual sigue funcionando** para la app móvil tal cual.

### 7.2. ¿Qué se migra y qué no?

- ✅ **Marketplace** (consumidor): catálogo, detalle, búsqueda, login/registro, reserva, pago, "mis reservas", perfil → **a móvil**.
- ❌ **Panel Admin** (`AdminPanel.jsx`): **se queda en React web**. La consigna lo dice explícitamente.

Esto significa que **mantienes el repo React** (al menos para el admin) **y creas un proyecto móvil nuevo** para el marketplace. No "conviertes" React a móvil; **reconstruyes las pantallas del marketplace** en la tecnología móvil elegida apuntando a las mismas APIs.

### 7.3. Flutter vs React Native — ¿cuál es más fácil PARA TI?

| Criterio | Flutter (Dart) | React Native (JS/TS) |
|---|---|---|
| **Reaprovechas tu conocimiento React** | ❌ Lenguaje nuevo (Dart) | ✅ **Mismo paradigma que tu front actual** |
| **Reutilizas lógica de `api.js`** | ❌ Reescribir en Dart | ✅ Puedes portar gran parte del `fetch`/lógica JS |
| **Curva de aprendizaje (viniendo de React)** | Media-alta | **Baja** |
| **Rendimiento / animaciones** | ✅ Superior (compila nativo, Skia) | Muy bueno (suficiente para un marketplace) |
| **Cliente GraphQL** | `graphql_flutter` | `Apollo Client` (idéntico a web) |
| **Cliente SignalR** | paquete `signalr_netcore` | `@microsoft/signalr` (**el oficial, mismo de web**) |
| **Generar APK** | `flutter build apk` | `gradlew assembleRelease` / EAS Build |

⭐ **Recomendación:** dado que tu equipo **ya domina React**, **React Native (con Expo)** es el camino de **menor fricción**: mismo lenguaje, mismo modelo mental de componentes/estado, el cliente SignalR y Apollo son **los mismos paquetes que en web**, y puedes **reutilizar tu `api.js`** casi entero. Flutter da mejor rendimiento puro pero te obliga a aprender Dart. Para el alcance del reto (un marketplace), **la diferencia de rendimiento es irrelevante; la diferencia de productividad NO.** → **React Native + Expo** salvo que quieras explícitamente aprender Flutter. (Open Question Q3.)

### 7.4. ¿Cómo se genera la APK? (sí, así funciona)

Una app móvil **no se "despliega en un servidor"** como tu web. Se **compila en un archivo instalable**:
- **Android → `.apk`** (o `.aab` para la Play Store).
- **iOS → `.ipa`** (requiere Mac + cuenta Apple Developer).

**Con React Native + Expo** (lo más simple):
```bash
npm install -g eas-cli
eas build -p android --profile preview   # genera el .apk en la nube de Expo, te da un link de descarga
```
o local: `npx expo run:android` para probar en emulador, y `./gradlew assembleRelease` para el APK.

**Con Flutter:**
```bash
flutter build apk --release   # genera build/app/outputs/flutter-apk/app-release.apk
```

⭐ **"Desplegar públicamente" la app móvil** = repartir ese APK (link directo, o subirlo a Google Play / TestFlight). El **backend** (Gateway + microservicios) sigue desplegado en Azure y la app apunta a su URL pública. La app **no necesita servidor propio**; necesita que **el backend sea público** (ya lo es).

---

## 8. Despliegue: ¿me quedo en Azure?

### 8.1. Respuesta corta

✅ **Sí, te quedas en Azure.** El sistema gemelo usó **Oracle Cloud** (la IP `129.158.203.242.nip.io` del contrato es una VM de Oracle), pero **eso es una elección de ellos, no un requisito**. Todo lo que necesitas se puede hacer en Azure sin migrar nada.

### 8.2. ¿Existe Event Bus y GraphQL en Azure? ¿Desde dónde se implementan?

⭐ **Confusión común a aclarar:**
- **GraphQL NO es infraestructura que "se instala en Azure".** Es una **librería (HotChocolate) dentro del código del Gateway**. Cuando despliegas el contenedor del Gateway, GraphQL ya va dentro, en `/graphql`. **No agregas ningún recurso de Azure.**
- **SignalR/WebSocket** igual: va **dentro del Gateway** (`/hub/notifications`). Container Apps soporta WebSockets nativamente. (Opcional: **Azure SignalR Service** si necesitas escalar a muchas réplicas.)
- **El Event Bus (RabbitMQ) SÍ es infraestructura aparte.** Tienes 3 opciones:

| Opción | Qué es | Pros | Contras |
|---|---|---|---|
| **CloudAMQP** (recomendado para empezar) | RabbitMQ gestionado externo (lo usó el gemelo) | Gratis (Little Lemur), 5 min de setup, panel web, es RabbitMQ "de verdad" | Servicio fuera de Azure (latencia mínima extra) |
| **Azure Service Bus** | Broker nativo de Azure (no es RabbitMQ, es AMQP de Azure) | Integración total con Azure, SLA | No es RabbitMQ literal; MassTransit lo soporta pero cambia config; cuesta |
| **RabbitMQ como Container App** | Tú corres la imagen `rabbitmq` en Azure | Es RabbitMQ real, dentro de Azure | Tú lo administras (persistencia, backups) |

⭐ **Recomendación:** **CloudAMQP gratis** para el reto (rápido, y MassTransit apunta a él con un connection string). Si quieres "todo dentro de Azure", **Azure Service Bus** o **RabbitMQ en Container App**. Es una Open Question (Q4).

### 8.3. ¿Qué configuración añade esto a tu despliegue?

Manteniendo Azure + GitHub Actions + ACR **tal cual los tienes hoy**, solo añades:
1. **Connection string del broker** (CloudAMQP/Service Bus) como **variable de entorno / secret** en los Container Apps de **Booking, Billing y Gateway** (los que publican/consumen).
2. **WebSockets habilitados** en el Container App del Gateway (ingress, normalmente ya soportado).
3. **(Opcional) Application Insights** conectado para observabilidad.

4. Tus **workflows `build-*.yml` no cambian** (siguen haciendo `docker build` + `push`). Solo, quizá, un nuevo workflow si creas un microservicio nuevo (ej. uno de Notificaciones), pero **no es necesario** para el alcance mínimo.

⭐ **Tu CI/CD actual sobrevive intacto.** Esto es importante: **no rehaces el despliegue**, solo añades configuración (secrets) y, dentro del código, las librerías nuevas.

---

## 9. Cómo funciona TODO junto (flujo end-to-end)

Te explico el flujo completo de **una reserva** en la arquitectura nueva, para que veas cómo encajan Event Bus + GraphQL + tiempo real:

```
1. [App móvil] El turista pulsa "Reservar".
   POST /api/v2/{prefijo}/booking   (header X-Idempotency-Key: <uuid>)
        │
        ▼
2. [Gateway] Recibe, valida idempotencia HTTP, reenvía a Booking.
        │
        ▼
3. [Booking]
   a) ¿Ya procesé esta X-Idempotency-Key? → si sí, devuelvo la reserva cacheada. FIN.
   b) gRPC SÍNCRONO → Catalog.ValidateBookingData  ("¿precio válido? sí")   ← gRPC se queda
   c) Descuenta cupo, guarda Booking en su DB.
   d) PUBLICA en RabbitMQ:  BookingCreatedEvent  +  SlotCapacityChangedEvent
   e) Responde 200 al usuario YA (sin esperar a Billing).   ← desacoplado
        │
        ├──────────────► RabbitMQ ──────────────┐
        │                                        │
        ▼                                        ▼
4. [Billing consumer]                  5. [Gateway consumer]
   - ¿MessageId ya procesado? (idemp.)     - Recibe SlotCapacityChanged
   - Genera factura en SU DB.              - Hace broadcast por SignalR:
   - Si falla → reintenta → DLQ.             Hub.SendAsync("OnSlotCapacityChanged",
                                                          { slotId, newCapacity })
                                                  │
                                                  ▼
                                        6. [TODAS las apps conectadas]
                                           El WebSocket recibe el evento y
                                           actualizan el stock en pantalla
                                           SIN recargar.  ← esto resuelve tu dolor
```

**Y la carga de la pantalla de detalle (lectura), con GraphQL:**
```
[App móvil] una query GraphQL  →  [Gateway HotChocolate]  →  en paralelo:
     Catalog (detalle + modalidades) + Booking (slots)  →  un solo JSON  →  app
(reemplaza el GET /api/v1/attraction/{slug} hecho a mano en tu Program.cs)
```

---

## 10. Resumen de tecnologías a instalar

| Capa | Tecnología | Dónde | Reemplaza / añade |
|---|---|---|---|
| Event Bus | **RabbitMQ** (CloudAMQP) | Infra externa/Azure | Comunicación async |
| Cliente bus .NET | **MassTransit** (NuGet) | Booking, Billing, Gateway | gRPC Booking→Billing |
| GraphQL | **HotChocolate** (NuGet) | Gateway | BFF manual de `Program.cs` |
| Tiempo real | **SignalR** (incluido en .NET) | Gateway (Hub) | Polling/recarga |
| Resiliencia | **Polly** (NuGet) | Gateway, Booking | Retry/CB/fallback |
| Observabilidad | **Serilog + OpenTelemetry + App Insights** | Todos | Logs/métricas/trazas |
| Móvil | **React Native + Expo** *(o Flutter)* | Proyecto nuevo | Marketplace web → móvil |
| Cliente móvil GraphQL | **Apollo Client** *(o `graphql_flutter`)* | App móvil | — |
| Cliente móvil tiempo real | **@microsoft/signalr** *(o `signalr_netcore`)* | App móvil | — |
| Idempotencia | Tabla `IdempotencyKeys` + `ProcessedEvents` | Booking, Billing | Evitar duplicados |

⭐ **Lo que NO cambia:** tus 4 microservicios siguen existiendo igual, tu Gateway YARP sigue, tu CI/CD sigue, tus DBs Supabase siguen, tu REST para integradores sigue (salvo booking→v2).

---

## 11. ⭐ OPEN QUESTIONS (responde esto)

Responde estas preguntas (puedes hacerlo aquí mismo debajo de cada una). Con tus respuestas armaremos el **ROADMAP** de implementación.

### A. Sobre el contrato e integradores
- **Q1 (prefijo):** ¿Los integradores distinguen tu sistema por **URL base** (cada equipo su Gateway) o por **prefijo de ruta**? ¿Debo añadir un prefijo propio tipo `/api/v1/<tu-prefijo>/attraction`? Si sí, **¿qué prefijo exacto?** (ej. `josue-tenesaca`, `keo-arc`, etc.)

En este caso los integradores distinguen el sistema por una URL base, es decir cada equipo tiene su gateway, no agregues el prefijo de ruta.




- **Q2 (DTOs):** ¿Tienes ya **tu** versión final del contrato OpenAPI (como el `atracciones-v2.yaml`) o lo construimos a partir de tus DTOs actuales? ¿Hay campos del contrato gemelo que tu sistema **no** devuelve hoy?

Aun no tengo la version final de mi contrato de openAPI, porfavor construye mi contrato a partir de mis DTOS. En teoria deberia exponer y dar los mismos datos que el sistema gemelo para que de esta forma no tenga ningun problema al momento de que se haga la integracion.

Verifica si es que mi sistema puede cumplir con un contrato similar a atracciones-v2.yaml, es decir con los mismos nombres de rutas, y mandando los mismos datos y tipos de datos y genera el contrato para mi sistema bajo el nombre de Contrato-Josue Tenesaca X, y verifica si es que hay campos del contrato gemelo que mi sistema no devuelve hoy.




- **Q3 (versionado booking):** Al subir reserva a **v2 con idempotencia**, ¿**mantengo v1 funcionando** en paralelo (compatibilidad) o **v1 se elimina** y todos deben ir a v2?

Manten las rutas de v1 funcionando. En paralelo

Con respecto al tema del versionamiento de booking.
Quiero mantener v1 viva.
Mantener V1 independiente (Cada versión con su propio comportamiento)
En esta opción, V1 y V2 son dos caminos totalmente separados en tu código.

Los que usan V1: Siguen llamando a POST /api/v1/booking. El sistema se comporta exactamente igual que hoy: no exige cabecera de idempotencia y procesa la reserva con el flujo tradicional. Si envían la misma petición dos veces, se crearán dos reservas (comportamiento normal de V1).

Los que usan V2: Llaman a POST /api/v2/booking. Este endpoint tiene un código diferente que:
Verifica que venga la cabecera X-Idempotency-Key (si no viene, responde 400 Bad Request).
Verifica en la base de datos si esa clave ya fue procesada.
Si es duplicada, devuelve la reserva existente del caché de la BD. Si es nueva, la procesa y guarda la clave.

### B. Sobre el Event Bus
- **Q4 (broker):** ¿**CloudAMQP** (rápido, gratis, externo) o **Azure Service Bus / RabbitMQ en Container App** (todo dentro de Azure)?

Para hacer el event Bus usare cloudAMQP.


- **Q5 (alcance):** ¿Migramos **solo Booking→Billing** (mínimo, como el gemelo), o también añadimos **microservicio/consumer de Notificaciones (emails)**?

Solo migremos Booking→Billing al event BUs. 

- **Q6 (gRPC Billing):** Al migrar a eventos, ¿**elimino** el gRPC `CreateInvoice` de Billing o lo **dejo como respaldo**?

Elimina el grpc de createInvoice.

### C. Sobre GraphQL y tiempo real
- **Q7 (tiempo real):** ¿Tiempo real con **SignalR** (como el gemelo, canal aparte) o con **GraphQL Subscriptions** (integrado en `/graphql`)?

Enfoque Híbrido (GraphQL para leer + SignalR para avisar).

En este caso aun no quiero implementar las notificaciones ni el canal de tiempo tiempo real de stock. SignalR se usa para la actualizacion en tiempo real al momento de que se crea una atraccion, se crea la atraccion y se refleja en la pantalla sin necesidad de que el cliente realize un  refresh.

Petición Inicial: El usuario abre la app móvil. La app hace una query normal de GraphQL (por HTTP POST) para traer la lista de atracciones actuales y las dibuja en pantalla.
Conexión de Escucha: La app móvil se conecta a un Hub de SignalR muy simple en el Gateway (/hub/notifications).
El Evento: El administrador crea una nueva atracción. El microservicio de Catalog guarda la atracción y publica un evento AttractionCreatedEvent en RabbitMQ.
El Aviso: El Gateway (que consume ese mensaje de RabbitMQ) le dice a SignalR: “Oye, avísale a todos los móviles conectados que se ha creado una nueva atracción”.
La Reacción en el Móvil: La app móvil recibe por SignalR el aviso "OnAttractionCreated"

Y con respecto al microservicio de Catalog.
El microservicio de Catalog seguirá funcionando exactamente igual que hoy:

El Administrador hace un POST /api/v1/attraction (petición HTTP REST tradicional) que llega a Catalog.
Catalog recibe la petición, procesa la información y la guarda en su base de datos Supabase.
Aquí viene el único cambio: Justo después de guardar con éxito en la base de datos, agregamos una línea de código para publicar el evento en RabbitMQ:

Catalog responde inmediatamente 200 OK al Administrador por HTTP.
Nota clave: Catalog no tiene colas asignadas en RabbitMQ, ni consumidores (Consumers) escuchando mensajes. Solo usa el bus de salida para "lanzar" el aviso al aire y olvidarse de él (Fire and Forget). Por ende, no tiene lógica asíncrona de entrada

- **Q8 (GraphQL alcance):** ¿GraphQL **reemplaza** los BFF agregadores de tu `Gateway/Program.cs`, o GraphQL es **solo para la app móvil** y los integradores/REST quedan intactos? (Recomiendo lo segundo.)

Usa el enfoque de GraphQL es **solo para la app móvil** y los integradores/REST quedan intactos.



- **Q9 (eventos de UI):** ¿Qué eventos quieres ver en tiempo real? (mínimo: cambio de cupos/stock. ¿También "nueva atracción publicada", "reserva confirmada", "pago aprobado"?)


Quiero que para el tema de hacer una reserva sigas EXACTAMENTE el mismo flujo que sigo actualmente, solo que claro ahora desde la app movil y con todas las nuevas implementaciones, pero el flujo debe ser el mismo, y no solo el flujo, si no que tambien el tema, las animaciones y las pantallas. (por ejemplo actualmente desde web se muestra un gif mientras se carga la info, realizar lo mismo.)

Pantalla de Configuración: El usuario selecciona la modalidad, fecha/hora (slots) y la cantidad de pasajeros (igual que hoy).
Pantalla de Facturación: Rellena su Nombre, Email y RUC/Cédula.
Formulario de Tarjeta: Al presionar "Confirmar y Pagar", se abre el formulario para ingresar el número de tarjeta de crédito (simulada) y expira.
Pantalla de Transición (Real-time): Al presionar "Pagar", la petición viaja al Gateway y la app móvil muestra inmediatamente la animación de carga:
🔄 "Procesando tu pago y confirmando tu reserva..."
Pantalla de Éxito (Real-time): En cuanto SignalR envía la señal de éxito desde el Gateway, la animación cambia al ticket final:
"¡Reserva Confirmada!" 

Es decir para el tiempo real no quiero el cambio de cupos/stock.

Si quiero implementar nueva atracción publicada

Y si quiero implementar reserva confirmada y pago aprobado.





### D. Sobre el móvil
- **Q10 (tecnología):** ¿**React Native + Expo** (menor fricción, reusas React) o **Flutter** (mejor rendimiento, aprendes Dart)?
Quiero usar REACT NATIVE + Expo.


- **Q11 (alcance de pantallas):** ¿Qué pantallas del marketplace son **imprescindibles** en la primera versión móvil? (catálogo, detalle, login, reserva, pago, mis reservas, perfil…)
Para la aplicacion de movil quiero tener exactamente las mismas pantallas que tiene mi pagina web en cuando al marketplace se refiere, porque el tema de la pantalla de admin aun se mantiene en web. catálogo, detalle, login, reserva, pago, mis reservas, perfil…)


- **Q12 (admin):** Confirmo que el **panel admin se queda en React web** y **no** se toca, ¿correcto?

Es correctom el admin se mantiene en react web y no se toca.


### E. Sobre despliegue y observabilidad
- **Q13 (Azure):** Confirmas que quieres **permanecer 100% en Azure**, ¿correcto?

Si, voy a permanecer en azure, pero si usare la tecnologia mencionada de CloudAMQP, es la opcion recomendada. de esta forma solo me registrare y usando mi URL de conexion la pondre en mis appsettings.json y en mis variables de entorno para que todo funcione correctamente.



- **Q14 (observabilidad):** ¿Implementamos observabilidad **completa** (Serilog + OpenTelemetry + App Insights) o un **mínimo** (logs estructurados + métricas básicas) por tiempo?

De momento por tiempo solo implementa la observavilidad minima.

- **Q15 (distribución APK):** ¿Cómo "despliegas públicamente" la app: **link directo al APK**, **Google Play**, o **Expo/TestFlight**?

Para el día a día del desarrollo, usare la app de  Expo Go porque es instantáneo. Para la entrega final, ejecutare el comando de eas build, el cual te dará un link directo al APK. Es decir quiero tener un .apk de mi aplicacion.


### F. Sobre alcance y prioridades
- **Q16 (orden):** ¿Qué quieres atacar **primero** en el roadmap? Mi orden sugerido: **(1)** Resiliencia + idempotencia HTTP (estabilizar) → **(2)** Event Bus Booking→Billing → **(3)** GraphQL + SignalR en Gateway → **(4)** App móvil. ¿Lo respetamos o priorizas distinto (ej. móvil primero)?

Vamos con el orden sugerido. El roadmap debe cubrir todas las secciones de principip a fin.
Ademas de esto luego de cada seccion debe haber una seccion de validacion para realizar validaciones manuales y pruebas para verificar que todo esta bien antes de seguir a la siguiente fase.

- **Q17 (tiempo/entregas):** ¿Hay **fechas** de entrega por semana (las semanas 12–15 que mencionas) que deba mapear a fases del roadmap?
No hay fechas de entrega, solo genera el roadmap completo.

> **Siguiente paso:** responde las OPEN QUESTIONS. Con eso genero el **ROADMAP** detallado (fases, archivos a tocar, paquetes a instalar, orden de implementación y verificación) cuando me envíes el prompt correspondiente.
