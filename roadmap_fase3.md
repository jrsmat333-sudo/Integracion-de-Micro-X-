# ROADMAP Fase 3 — Event Bus, Idempotencia, GraphQL, Tiempo Real y App Móvil

> Documento operativo. Se ejecuta **de arriba a abajo**. Cada fase termina con una sección **✅ VALIDACIÓN** que debes pasar **antes** de avanzar a la siguiente.
>
> **Decisiones congeladas** (de tus respuestas en `analisis_y_open_questions_fase3.md`):
> - **Sin prefijo de ruta.** Los integradores te distinguen por **URL base** (tu Gateway). Rutas en `/api/v1/...` directo. (Q1)
> - **Contrato** = `Contrato-JosueTenesaca.yaml` (generado), compatible 1:1 con el gemelo. (Q2)
> - **Booking v1 se mantiene vivo en paralelo**; **v2 nuevo** con `X-Idempotency-Key`. Caminos de código separados. (Q3)
> - **Broker:** CloudAMQP. (Q4) — **Solo migramos Booking→Billing** al bus. (Q5) — **Se elimina** el gRPC `CreateInvoice`. (Q6)
> - **Híbrido:** GraphQL para **leer** (solo app móvil) + SignalR para **avisar**. Sin tiempo real de stock/cupos. (Q7, Q8)
> - **Eventos de tiempo real:** `AttractionCreated` (broadcast), `BookingConfirmed` + `PaymentApproved` (al usuario que reserva). (Q9)
> - **Móvil:** React Native + Expo, mismas pantallas y mismo flujo/animaciones que la web marketplace. **Admin se queda en React web, intacto.** (Q10, Q11, Q12)
> - **Despliegue:** 100% Azure + CloudAMQP. **Observabilidad mínima.** APK final con `eas build` (Expo Go en desarrollo). (Q13, Q14, Q15)
> - **Orden:** (0) Contrato → (1) Resiliencia+Idempotencia → (2) Event Bus → (3) GraphQL+SignalR → (4) Móvil → (5) Observabilidad+Deploy. (Q16, Q17)

---

## Índice de fases

| Fase | Nombre | Riesgo | Resultado |
|---|---|---|---|
| **0** | Contrato y línea base (verificación) | 🟢 Bajo | `Contrato-JosueTenesaca.yaml` validado (sistema ya 100% compatible, sin mapeo) |
| **1** | Resiliencia + Idempotencia HTTP (Booking v2) | 🟡 Medio | Polly + tabla idempotencia + `POST /api/v2/booking` |
| **2** | Event Bus Booking→Billing (CloudAMQP + MassTransit) | 🟡 Medio | gRPC CreateInvoice eliminado, facturación asíncrona |
| **3** | GraphQL (lectura) + SignalR (tiempo real) en Gateway | 🟠 Medio-alto | `/graphql` + `/hub/notifications` |
| **4** | App móvil React Native + Expo (marketplace) | 🟠 Alto | APK del marketplace |
| **5** | Observabilidad mínima + despliegue Azure | 🟢 Bajo | Logs/métricas + secrets en Azure |

> **Regla de oro de todo el roadmap:** trabaja en una **rama por fase** (`feature/fase-1-idempotencia`, etc.), no en `main`. Despliega y valida una fase antes de empezar la siguiente. Nunca migres dos cosas a la vez.

---

# FASE 0 — Contrato y línea base (verificación)

**Objetivo:** congelar el contrato que los integradores van a consumir cuando "enciendan" la integración. **Ya validado empíricamente: el sistema es 100% compatible y NO requiere ningún cambio de mapeo en el Gateway.**

## 0.1. Resultado de la verificación (tu sistema HOY vs integradores reales)

He comparado tus DTOs reales contra el contrato. Veredicto por bloque:

### ✅ Parte transaccional (reservas) — COINCIDE 1:1
Tus DTOs de Booking son **idénticos** al gemelo (mismos campos, mismo JSON camelCase):

| Concepto | Tu DTO | Campo del gemelo | ¿Coincide? |
|---|---|---|---|
| Crear reserva | `AtraccionBookingRequestDto` (slotId, passengers, tickets, contactName, contactEmail, isPosSale, notas, billing) | `AtraccionBookingRequestDto` | ✅ Idéntico |
| Pasajero | `PassengerBookingDto` | `PassengerBookingDto` | ✅ Idéntico |
| Ticket | `TicketBookingDetailDto` | `TicketBookingDetailDto` | ✅ Idéntico |
| Facturación | `BillingInfo` (customerName, taxId, email, address) | `BillingInfo` | ✅ Idéntico |
| Respuesta reserva | `AtraccionBookingResponseDto` (bookingId, pnrCode, status, totalAmount, currency, activityDate, attractionName, attractionImage, totalPassengers) | `AtraccionBookingResponseDto` | ✅ Idéntico |
| Wrapper | `ApiResponse<T>` (success, data, message, errors) | `ApiResponse*` | ✅ Idéntico |

→ **No hay que tocar nada en reservas** salvo añadir la idempotencia v2 (Fase 1).

### ✅ Parte de catálogo (listado y detalle) — YA COMPATIBLE (sin mapeo)
Tus endpoints de Catalog devuelven **nombres en inglés** (`name`, `descriptionShort`, `products`, `priceTiers`, `slots` en la raíz). **Se verificó en producción que los integradores reales consumen y aceptan este JSON sin problemas.** Por tanto:

- ❌ **DESCARTADO:** el traductor de propiedades inglés→español en el Gateway.
- ❌ **DESCARTADO:** la reagrupación de `slots` dentro de cada modalidad.
- ✅ El catálogo quedó **consistente** con el resto de microservicios (todo en inglés). Antes era inconsistente (solo Catalog se documentaba en español); ahora **todos los endpoints usan los mismos nombres en inglés**.

| Dato | Forma real expuesta (inglés) | Estado |
|---|---|---|
| Listado | `AttractionSummaryResponse` → `name`, `descriptionShort`, `locationName`, `startingPrice`, `currencyCode`, `imageUrl`, `slug`, `isPublished` | ✅ Aceptado por integradores |
| Detalle | `AttractionDetailResponse` → `products[]` → `priceTiers[]` + `slots[]` en la raíz | ✅ Aceptado por integradores |
| Modalidad | `ProductResponse` → `title`, `description`, `priceTiers` | ✅ |
| Tarifa | `PriceTierResponse` → `id`, `categoryName`, `price`, `currencyCode` | ✅ |

**Conclusión:** ✅ **El sistema ya cumple el contrato tal cual, sin tocar el Gateway ni los microservicios.** El contrato `Contrato-JosueTenesaca.yaml` documenta esta forma en inglés.

## ✅ VALIDACIÓN FASE 0
- [ ] Abrir `Contrato-JosueTenesaca.yaml` en [editor.swagger.io](https://editor.swagger.io) → **no debe haber errores de sintaxis**.
- [ ] Confirmar la URL real de tu Gateway y reemplazar `TU-SUBDOMINIO` en el `servers.url` del contrato.
- [ ] Pedir `GET /api/v1/attraction` y `GET /api/v1/attraction/{slug}` por el Gateway y confirmar que el JSON real **coincide con el contrato** (campos en inglés, `products[]`, `slots` en la raíz).
- [ ] **Criterio de avance:** el contrato está congelado y coincide con la respuesta real. No se escribe código de mapeo (descartado).

---

# FASE 1 — Resiliencia + Idempotencia HTTP (Booking v2)

**Objetivo:** estabilizar el sistema actual (que ya funciona) ANTES de meter el bus. Añadir patrones de fiabilidad a las llamadas síncronas y crear el `POST /api/v2/booking` idempotente del contrato.

## 1.1. Resiliencia con Polly (llamadas gRPC y HTTP existentes)
- **Instalar** en Booking y Gateway: `Microsoft.Extensions.Http.Resilience` (Polly v8, el paquete moderno de .NET).
- **Booking → Catalog (gRPC `ValidateBookingData`)**: envolver el `GrpcClient` con política de **Retry (3 intentos, backoff exponencial)** + **Circuit Breaker**. Archivo: `Booking.API/Program.cs` (donde registras `AddGrpcClient<CatalogServiceClient>`).
- **Gateway (HttpClient de los BFF)**: añadir Retry + Timeout a las llamadas `client.GetAsync(...)` de `Gateway.API/Program.cs`.
- **Fallback** (opcional, recomendado): en el endpoint `top`/listado del Gateway, si Catalog falla, devolver una caché en memoria de "atracciones destacadas" en vez de 500.

## 1.2. Idempotencia HTTP — tabla nueva en Booking
- **Entidad nueva** `IdempotencyKey` en `Booking.DataAccess/Entities/`:
  - `Key` (string, PK o índice único) ← el `X-Idempotency-Key`.
  - `BookingId` (Guid).
  - `ResponseJson` (text) ← la respuesta serializada para devolverla tal cual si se repite.
  - `CreatedAtUtc` (datetime).
- **Migración EF Core**: `dotnet ef migrations add AddIdempotencyKeys` + `dotnet ef database update` contra la DB de Booking (Supabase).
- Configuración en `BookingConfiguration.cs` (índice único en `Key`).

## 1.3. Endpoint `POST /api/v2/booking` (camino separado de v1)
- **Nuevo controller** `AtraccionesBookingV2Controller` en `Booking.API/Controllers/V2/`, `[Route("api/v2/booking")]`.
- Lógica:
  1. Leer cabecera `X-Idempotency-Key`. **Si falta → 400** (`ApiResponse.Fail("X-Idempotency-Key requerida")`).
  2. Buscar la `Key` en la tabla. **Si existe → devolver `ResponseJson` cacheado** (no crear otra reserva).
  3. Si no existe → ejecutar el **mismo flujo de `CrearReservaAsync`** que ya tienes en `BookingIntegrationService`.
  4. Guardar `Key` + respuesta en la tabla (en la **misma transacción** que la reserva, para consistencia).
- **`POST /api/v1/booking` NO se toca** → sigue funcionando igual (Q3).
- **Gateway**: añadir ruta YARP para `/api/v2/booking/{**catch-all}` → `booking-cluster` en `appsettings.json`. (El interceptor actual de `MapPost("/api/v1/booking")` se mantiene para v1.)

## ✅ VALIDACIÓN FASE 1
Pruebas manuales (Postman / `.http`):
- [ ] `POST /api/v2/booking` **sin** `X-Idempotency-Key` → **400**.
- [ ] `POST /api/v2/booking` **con** clave nueva → **200** + reserva creada (verificar fila en DB Booking).
- [ ] **Repetir el MISMO POST con la MISMA clave** → **200** con **el mismo `bookingId`** y **NO** se crea una segunda reserva (verificar que la tabla `Booking` no creció).
- [ ] `POST /api/v1/booking` (legacy) → sigue creando reserva como antes (sin exigir cabecera).
- [ ] Simular caída de Catalog (apagar el Container App un momento) → el Retry/Circuit Breaker actúa; el error es controlado, no un crash.
- [ ] Validar el contrato: pedir `GET /api/v1/attraction` y `GET /api/v1/attraction/{slug}` a través del Gateway y comparar el JSON contra `Contrato-JosueTenesaca.yaml` (nombres en inglés, `products[]`, `slots` en la raíz).
- [ ] **Criterio de avance:** idempotencia v2 funciona, v1 intacto, sin regresiones en la web actual.

---

# FASE 2 — Event Bus Booking→Billing (CloudAMQP + MassTransit)

**Objetivo:** desacoplar la facturación. Booking deja de llamar a Billing por gRPC; ahora **publica un evento** y Billing lo **consume** de forma asíncrona. Elimina el gRPC `CreateInvoice`.

## 2.0. Infraestructura: CloudAMQP
- Crear cuenta en [cloudamqp.com](https://www.cloudamqp.com) → instancia **Little Lemur (gratis)**.
- Copiar la **AMQP URL** (`amqps://user:pass@host/vhost`).
- Guardarla como **variable de entorno / secret** `RabbitMq__ConnectionString` en los Container Apps de **Booking** y **Billing** (y Gateway en Fase 3). En local, en `appsettings.Development.json`.

## 2.1. Proyecto compartido de contratos de eventos
- **Nuevo proyecto** de class library `Microservicios.Atracciones.Shared.Contracts` (paralelo a `Shared.gRPC`).
- Definir los `record` de eventos (POCO, sin lógica):
  ```csharp
  public record BookingCreatedEvent(
      Guid BookingId, Guid UserId, string CorrelationId,
      string CurrencyCode, decimal TotalAmount, decimal TaxRate,
      BillingInfoDto Billing, List<InvoiceLineDto> Lines, DateTime OccurredOnUtc);
  ```
  > `CorrelationId` = el `X-Idempotency-Key` de la reserva. Se reutiliza luego para dirigir el aviso SignalR al cliente correcto (Fase 3).
- Referenciar este proyecto desde Booking, Billing y (Fase 3) Gateway.

## 2.2. Booking = Publisher
- **Instalar** en Booking.API: `MassTransit` + `MassTransit.RabbitMQ`.
- Registrar MassTransit en `Booking.API/Program.cs` (configurar host con `RabbitMq__ConnectionString`).
- En `BookingIntegrationService` (y en el flujo v2), **sustituir**:
  ```csharp
  // ANTES (eliminar):
  await _billingClient.CreateInvoiceAsync(grpcInvoice);
  // DESPUÉS:
  await _publishEndpoint.Publish(new BookingCreatedEvent(...));
  ```
- **Eliminar** la inyección de `BillingServiceClient` y su registro `AddGrpcClient<BillingServiceClient>` en `Program.cs`. (Q6)
- **Eliminar** el método `CrearFacturaAsync` que armaba el `CreateInvoiceGrpcRequest`.

## 2.3. Billing = Consumer (con idempotencia de mensajería)
- **Instalar** en Billing.API: `MassTransit` + `MassTransit.RabbitMQ`.
- **Consumer nuevo** `BookingCreatedConsumer : IConsumer<BookingCreatedEvent>`:
  - Idempotencia: tabla `ProcessedEvents` (guardar `MessageId`; si ya existe → ignorar). EF migration en DB Billing.
  - Llamar al **`IBillingService.CrearFacturaAsync` que YA EXISTE** (reutilizas la lógica; solo cambia el disparador).
  - **Reintentos + DLQ**: configurar en MassTransit `UseMessageRetry` (ej. 3 intentos) y que los fallos persistentes vayan a `_error`/_skipped (DLQ automática de MassTransit).
- **Eliminar** el `BillingGrpcService` (`Billing.API/GrpcServices/BillingGrpcService.cs`) y su mapeo en `Program.cs`. (Q6)
- **Limpieza:** quitar de `Shared.gRPC/Protos/billing.proto` el servicio (o dejar el archivo pero sin registrar el servidor). El gRPC de **Catalog** (`catalog.proto`) **se queda** (Fase 1 lo protege con Polly).

## 2.4. (Después) Billing publica confirmación → preparar Fase 3
- Cuando Billing termina la factura, **publica** `PaymentApprovedEvent(BookingId, CorrelationId, ...)`. Esto lo consumirá el Gateway en Fase 3 para avisar al móvil. (Si prefieres, esta publicación se añade al inicio de Fase 3.)

## ✅ VALIDACIÓN FASE 2
- [ ] En el panel de **CloudAMQP** ver el exchange/cola creados por MassTransit y los mensajes pasando.
- [ ] Crear una reserva (v2) → verificar que **se genera la factura** en la DB de Billing (consumida por evento, ya **no** por gRPC).
- [ ] **Prueba de resiliencia (la importante):** **apagar Billing**, crear una reserva → la reserva **se crea igual y responde 200** (no se bloquea). Volver a **encender Billing** → el mensaje encolado se procesa y **la factura aparece** (no se perdió). ⭐ Esto demuestra el desacople.
- [ ] **Prueba de idempotencia de mensajería:** reenviar el mismo evento (o forzar redelivery) → **no se duplica** la factura.
- [ ] Confirmar que el gRPC `CreateInvoice` ya **no existe** (búsqueda en el repo sin referencias a `BillingServiceClient`).
- [ ] **Criterio de avance:** facturación 100% asíncrona, tolerante a caídas de Billing, sin duplicados.

---

# FASE 3 — GraphQL (lectura) + SignalR (tiempo real) en el Gateway

**Objetivo:** exponer GraphQL para que la app móvil **lea** en una sola consulta, y un Hub SignalR que **empuje** avisos en tiempo real. Híbrido (Q7). **GraphQL es solo para la app móvil; REST/integradores intactos** (Q8).

## 3.1. GraphQL de lectura (HotChocolate) — solo queries
- **Instalar** en Gateway.API: `HotChocolate.AspNetCore`.
- Registrar GraphQL en `Program.cs` y mapear `/graphql`.
- Definir **types** y **Query** que internamente llaman a Catalog/Booking (reutilizando la lógica de tus BFF actuales):
  - `attractions(search, page)` → listado (para la pantalla de catálogo móvil).
  - `attraction(slug)` → detalle + modalidades + slots (reemplaza las 3+ llamadas a mano para el móvil).
  - `myBookings` → "mis reservas" (con JWT).
- **No** definimos Mutations al inicio: las **escrituras** (login, crear reserva, pago) siguen por **REST** para reutilizar el flujo idéntico al de la web (Q9). GraphQL = solo lectura por ahora.
- **Importante:** los endpoints REST/YARP y los BFF actuales **siguen intactos** (los integradores y el admin web no se enteran).

## 3.2. SignalR Hub
- **Instalar/activar** SignalR en Gateway.API (`AddSignalR`), mapear Hub en `/hub/notifications`.
- Métodos de cliente (lo que el móvil escucha):
  - `OnAttractionCreated(attraction)` → **broadcast a todos**.
  - `OnBookingConfirmed(payload)` → **solo al cliente que reservó** (grupo por `CorrelationId`).
  - `OnPaymentApproved(payload)` → **solo al cliente que reservó** (grupo por `CorrelationId`).
- **Grupos por CorrelationId** (evita race conditions y no requiere JWT en el socket):
  1. La app **genera el `X-Idempotency-Key`** antes de reservar.
  2. La app se conecta al Hub y hace `JoinGroup(idempotencyKey)` **antes** de mandar el POST.
  3. El Gateway, al recibir el evento con ese `CorrelationId`, hace `Clients.Group(correlationId).SendAsync(...)`.

## 3.3. Catalog = Publisher de `AttractionCreatedEvent` (fire-and-forget)
- **Instalar** en Catalog.API: `MassTransit` + `MassTransit.RabbitMQ` (**solo publish**, sin consumers — Q7).
- En `AttractionService.CreateAsync`/`CreateCompleteAsync`, **justo después** de guardar en DB con éxito, añadir:
  ```csharp
  await _publishEndpoint.Publish(new AttractionCreatedEvent(id, nombre, ubicacion, imagenUrl, precio, slug));
  ```
- Catalog responde 200 al admin como hoy. **No tiene colas ni consumers.** (exactamente lo que pediste en Q7).

## 3.4. Gateway = Consumer (puente bus → WebSocket)
- **Instalar** en Gateway.API: `MassTransit` + `MassTransit.RabbitMQ`.
- Consumers en el Gateway:
  - `AttractionCreatedConsumer` → `Clients.All.SendAsync("OnAttractionCreated", ...)`.
  - `BookingConfirmedConsumer` (consume `BookingCreatedEvent`) → `Clients.Group(correlationId).SendAsync("OnBookingConfirmed", ...)`.
  - `PaymentApprovedConsumer` (consume `PaymentApprovedEvent` de Billing) → `Clients.Group(correlationId).SendAsync("OnPaymentApproved", ...)`.
- **Infra Azure:** habilitar **WebSockets** en el ingress del Container App del Gateway. Mantener el Gateway en **1 réplica** (evita necesitar backplane Redis/Azure SignalR para el alcance del reto).

## 3.5. El flujo de reserva en tiempo real (tu UX de Q9)
```
App: genera X-Idempotency-Key → conecta Hub → JoinGroup(key)
App: muestra "🔄 Procesando tu pago y confirmando tu reserva..."
App: POST /api/v2/booking (header X-Idempotency-Key)
  → Booking crea reserva, publica BookingCreatedEvent(CorrelationId=key), responde 200
  → Gateway consume BookingCreatedEvent → OnBookingConfirmed al grupo(key)
  → Billing consume BookingCreatedEvent → factura → publica PaymentApprovedEvent(key)
  → Gateway consume PaymentApprovedEvent → OnPaymentApproved al grupo(key)
App: al recibir OnBookingConfirmed/OnPaymentApproved → muestra ticket "¡Reserva Confirmada!"
```
- **Fallback de UX (resiliencia):** si en ~8–10s no llega la señal SignalR, la app usa la **respuesta HTTP 200** del POST (la reserva existe igual; la factura llegará por reintento). Evita que la pantalla se quede colgada en "Procesando...".

## ✅ VALIDACIÓN FASE 3
- [ ] Abrir **Banana Cake Pop** (`/graphql` en el navegador) → ejecutar `attraction(slug)` y ver atracción + modalidades + slots en **una sola query**.
- [ ] Con un cliente WebSocket de prueba (o la propia app en Fase 4), conectarse a `/hub/notifications`.
- [ ] **Tiempo real atracción:** desde el **admin web**, crear una atracción → el cliente conectado recibe `OnAttractionCreated` **sin refrescar**.
- [ ] **Tiempo real reserva:** hacer una reserva v2 con un `CorrelationId` → recibir `OnBookingConfirmed` y luego `OnPaymentApproved` en ese grupo.
- [ ] Confirmar que **REST/YARP y el admin web siguen funcionando** igual (GraphQL no rompió nada).
- [ ] **Criterio de avance:** GraphQL lee bien, SignalR empuja los 3 eventos, REST intacto.

---

# FASE 4 — App móvil React Native + Expo (Marketplace)

**Objetivo:** reconstruir el **marketplace** (no el admin) como app móvil, con **las mismas pantallas, flujo y animaciones** que la web (Q9, Q11). Consumiendo GraphQL (lectura) + REST (escritura) + SignalR (tiempo real).

## 4.0. Setup
- **Instalar:** Node LTS, `npm i -g eas-cli`, `npx create-expo-app@latest atracciones-movil`.
- **Librerías:** `@apollo/client graphql` (GraphQL), `@microsoft/signalr` (tiempo real, **el mismo paquete que en web**), `@react-navigation/native` (navegación), `expo-secure-store` (guardar JWT), `axios` o `fetch` (REST para escrituras).
- **Reutilizar `src/services/api.js`** de tu web React como base del cliente REST (portarlo casi tal cual).

## 4.1. Pantallas (mismas que el marketplace web — Q11)
| Pantalla | Origen web | Fuente de datos |
|---|---|---|
| Catálogo + búsqueda + carrusel | `App.jsx` (LandingPage, AttractionCard) | GraphQL `attractions` + SignalR `OnAttractionCreated` |
| Detalle de atracción | `AttractionDetail.jsx` | GraphQL `attraction(slug)` |
| Login / Registro | `AuthModal.jsx` | REST `/api/v1/auth` |
| Reserva (config: modalidad, slot, pasajeros) | `AttractionDetail.jsx` | GraphQL detalle + REST |
| Facturación (nombre, email, RUC/cédula) | flujo de pago | local → REST |
| Formulario de tarjeta (simulado) | `PaymentSimulation.jsx` | local (simulado) |
| Transición "Procesando..." + Éxito "¡Reserva Confirmada!" | nuevo (tiempo real) | REST `POST /api/v2/booking` + SignalR |
| Mis reservas | `UserProfile.jsx` | GraphQL `myBookings` |
| Perfil | `UserProfile.jsx` | REST |

- ⭐ **Replicar las animaciones**: el **gif de carga** que usas en web durante las cargas, y la animación de transición de pago → ticket. Misma identidad visual (mismos colores/tipografías Tailwind → equivalentes en RN con `StyleSheet` o NativeWind).

## 4.2. Integración tiempo real (el flujo de Q9)
- Implementar exactamente el flujo de la sección 3.5: generar key → conectar Hub → JoinGroup → mostrar "Procesando" → POST → esperar `OnBookingConfirmed`/`OnPaymentApproved` → mostrar ticket. Con el **fallback de 8–10s**.

## 4.3. Generar el APK
- **Desarrollo diario:** `npx expo start` + app **Expo Go** en tu teléfono (instantáneo). (Q15)
- **Entrega final:** `eas build -p android --profile preview` → te da un **link de descarga del `.apk`**. (Q15)
- Apuntar la app a la **URL pública del Gateway en Azure** (variable de entorno de Expo / `app.config.js`).

## ✅ VALIDACIÓN FASE 4
- [ ] La app abre en **Expo Go** y muestra el catálogo (datos reales del Gateway en Azure).
- [ ] **Crear atracción desde el admin web** → aparece en la app móvil **sin refrescar** (SignalR).
- [ ] Flujo de reserva completo en móvil: catálogo → detalle → login → config → facturación → tarjeta → "Procesando..." → **ticket "¡Reserva Confirmada!"** llega por SignalR.
- [ ] Mismas pantallas/animaciones que la web (gif de carga incluido).
- [ ] **Mis reservas** muestra la reserva recién creada.
- [ ] `eas build` genera un **`.apk` instalable** y funciona en un teléfono real.
- [ ] El **admin web sigue intacto** (no se migró).
- [ ] **Criterio de avance:** APK funcional con el flujo completo end-to-end.

---

# FASE 5 — Observabilidad mínima + despliegue Azure

**Objetivo:** dejar el sistema monitoreable (mínimo, por tiempo — Q14) y todo configurado en Azure + CloudAMQP (Q13).

## 5.1. Observabilidad mínima
- **Logs estructurados:** añadir **Serilog** a los 4 microservicios + Gateway (escribe a consola → Azure Log Analytics ya lo recoge en Container Apps). Incluir `CorrelationId`/`TraceId` en los logs del flujo de reserva.
- **Métricas básicas / health checks:** `AddHealthChecks()` en cada servicio con endpoint `/health` (y health check de RabbitMQ y de la DB). Útil para ver qué está vivo.
- (Se **omite** OpenTelemetry/App Insights completo por ahora — Q14.)

## 5.2. Configuración de despliegue (Azure)
- **Secrets / env vars** en los Container Apps:
  - `RabbitMq__ConnectionString` (CloudAMQP) en **Booking, Billing, Gateway, Catalog**.
  - Connection strings de Supabase (ya existen).
- **WebSockets** habilitados en el ingress del Gateway (Fase 3).
- **Gateway en 1 réplica** (por SignalR sin backplane).
- **CI/CD:** tus `build-*.yml` **no cambian**. Crear **un workflow nuevo** solo si añadiste un proyecto desplegable nuevo (no es el caso: `Shared.Contracts` es librería, no se despliega sola).
- **App móvil:** no se despliega en servidor; se distribuye el `.apk` (link de `eas build`).

## ✅ VALIDACIÓN FASE 5
- [ ] `/health` responde OK en cada servicio (y marca DOWN si apagas RabbitMQ/DB).
- [ ] Los logs en Azure Log Analytics muestran el `CorrelationId` atravesando Gateway → Booking → Billing.
- [ ] Reiniciar todo en Azure y correr el flujo end-to-end (reserva + tiempo real) **en producción**.
- [ ] **Criterio de cierre:** sistema desplegado públicamente en Azure, monitoreable, con la app móvil apuntando a producción.

---

## Resumen de paquetes a instalar por proyecto

| Proyecto | Paquetes nuevos |
|---|---|
| `Booking.API` | `Microsoft.Extensions.Http.Resilience` (Polly), `MassTransit`, `MassTransit.RabbitMQ`, EF migration (idempotencia) |
| `Billing.API` | `MassTransit`, `MassTransit.RabbitMQ`, EF migration (ProcessedEvents) |
| `Catalog.API` | `MassTransit`, `MassTransit.RabbitMQ` (solo publish) |
| `Gateway.API` | `HotChocolate.AspNetCore`, `MassTransit`, `MassTransit.RabbitMQ`, `Microsoft.AspNetCore.SignalR` (incluido), `Microsoft.Extensions.Http.Resilience` |
| `Shared.Contracts` (nuevo) | — (solo `record`s de eventos) |
| App móvil (nuevo) | `@apollo/client`, `graphql`, `@microsoft/signalr`, `@react-navigation/*`, `expo-secure-store` |
| Todos (Fase 5) | `Serilog.AspNetCore`, `AspNetCore.HealthChecks.*` |

## Qué NO se toca en todo el roadmap
- Identify (auth) — sin cambios de comunicación.
- gRPC **Catalog** `ValidateBookingData` — se queda (protegido con Polly).
- `POST /api/v1/booking` (legacy) — vivo en paralelo.
- Admin web (React) — intacto.
- Tus 4 DBs Supabase, tu YARP, tu CI/CD de GitHub Actions.

---

> **Estado:** roadmap listo para ejecutar. Empieza por la **rama `feature/fase-0`** (congelar contrato) y avanza fase por fase, pasando cada **✅ VALIDACIÓN** antes de continuar. Cuando quieras, te ayudo a implementar la Fase 1 paso a paso.
