# Arquitectura y Evolución del Proyecto: Fase 3 (Móvil, Event Bus y Resiliencia)

Este documento detalla la evolución arquitectónica del sistema de Atracciones Turísticas, cubriendo la transición del frontend web a una aplicación móvil, la adopción de un bus de eventos (RabbitMQ), GraphQL para actualizaciones en tiempo real, y la implementación de patrones avanzados de resiliencia e interoperabilidad.

---

## 1. Contexto Actual del Proyecto

Actualmente, el sistema opera con una arquitectura de **Microservicios** (Catalog, Booking, Billing, Identity) orquestados mediante un **API Gateway**. 
- **Comunicación Interna:** Se basa fuertemente en **gRPC**. Aunque gRPC es extremadamente rápido, representa una comunicación *síncrona*. Por ejemplo, cuando el servicio de Reservas (Booking) crea una reserva, llama síncronamente mediante gRPC al servicio de Facturación (Billing) para generar la factura. Esto acopla temporalmente ambos servicios.
- **Frontend:** Desarrollado en **React** para web, consumiendo las APIs RESTful a través del Gateway.
- **Limitación identificada:** Al realizar acciones de escritura (ej. crear una reserva), la interfaz web depende de recargas manuales (refresh) o "polling" constante para ver el estado actualizado de la transacción, al carecer de un canal bidireccional en tiempo real.

---

## 2. Conceptos Teóricos Clave

### 2.1. Event Bus (Bus de Eventos) - RabbitMQ
Un bus de eventos es una pieza de infraestructura (Message Broker) que permite la comunicación **asíncrona** entre microservicios mediante el patrón Publicador/Suscriptor (Pub/Sub). 
- **¿Cómo funciona?** Un microservicio (ej. Booking) publica un evento (ej. `BookingCreatedIntegrationEvent`) en el bus y continúa su ejecución sin esperar respuesta. Otros servicios (ej. Billing) están suscritos a ese tipo de evento, lo atrapan y procesan la facturación a su propio ritmo.
- **Relación con el Gateway:** El API Gateway **no** interactúa directamente con el Event Bus. El Gateway es una puerta de enlace de capa 7 (HTTP) que enruta las peticiones de los clientes (móvil/web) hacia los microservicios. Son los *microservicios internamente* los que publican y consumen eventos a través del Bus.

### 2.2. GraphQL y Actualizaciones en Tiempo Real
GraphQL es un lenguaje de consultas para APIs. A diferencia de REST, permite al cliente solicitar exactamente los campos y la estructura de datos que necesita. 
- **Suscripciones (Subscriptions):** Esta es la característica vital para solucionar la recarga de pantalla. GraphQL permite establecer una conexión persistente (basada en WebSockets). Cuando el Event Bus notifica a un microservicio que un estado cambió (ej. pago aprobado), el backend lanza un evento en GraphQL y el frontend conectado recibe los datos actualizados instantáneamente de forma reactiva, **sin necesidad de recargar la pantalla**.

### 2.3. ESB vs Microservicios (Integración Centralizada vs Distribuida)
- **ESB (Enterprise Service Bus):** Pertenece a arquitecturas monolíticas y SOA antiguas. Es un bus centralizado "pesado" que contiene reglas de negocio complejas, orquestación, transformaciones de datos y enrutamiento inteligente. 
- **Microservicios (Coreografía con Message Broker ligero):** En lugar de un ESB, usamos el principio *"Smart endpoints and dumb pipes"* (Extremos inteligentes y tuberías tontas). RabbitMQ (la tubería) solo transporta mensajes ciegamente. La lógica de negocio, las transformaciones y decisiones viven exclusivamente dentro de los *"smart endpoints"* (nuestros microservicios). **Esta es la arquitectura adoptada y justificada**, porque evita que el bus se convierta en un punto único de falla lógica y cuello de botella, garantizando verdadera independencia.

---

## 3. Estrategia de Migración de Microservicios al Event Bus

**Regla de oro:** NO se debe migrar todo al Event Bus. Solo se deben migrar las operaciones de negocio donde se tolere consistencia eventual (Eventual Consistency) y donde no se requiera una respuesta instantánea al usuario frontal.

1. **Microservicios a MIGRAR al Bus (Comunicación Asíncrona):**
   - **Billing (Facturación / Pagos):** Es el candidato ideal. Cuando se confirma una reserva, la generación contable, el registro en la base de datos de facturación y el envío del PDF de la factura al correo del usuario no necesitan bloquear el flujo de la aplicación. Booking debe publicar un `OrderConfirmedEvent` en RabbitMQ, y Billing debe consumirlo en segundo plano. Esto elimina la necesidad de la actual llamada gRPC síncrona.
   - **Notificaciones (si aplica):** El envío de correos de confirmación a los integradores o usuarios finales debe hacerse reaccionando a eventos del bus.

2. **Microservicios a MANTENER en gRPC/REST (Comunicación Síncrona):**
   - **Catalog:** Al abrir la App Móvil, el usuario necesita ver inmediatamente la lista de atracciones. Esto debe seguir siendo una petición REST (o GraphQL request-response) rápida a través del Gateway.
   - **Inventory / Disponibilidad:** Si Booking necesita validar si quedan cupos antes de procesar una tarjeta de crédito, debe hacerlo mediante una llamada **gRPC síncrona** a Catalog/Inventory. El Bus de eventos no sirve aquí porque Booking necesita la respuesta "SÍ o NO" en ese instante de milisegundos para continuar.

---

## 4. Evolución de la Interfaz: Marketplace Móvil

El paso del Marketplace de React Web a móvil no requerirá grandes cambios en el Backend, porque la lógica de negocio ya está abstraída en microservicios detrás del API Gateway. El móvil consumirá los mismos endpoints REST (o el nuevo endpoint de GraphQL).

- **Módulo Administrativo:** Se mantendrá operativo tal como está en React Web. (Los administradores suben fotos, configuran precios y ven reservaciones en sus laptops).
- **Marketplace Móvil:** Los clientes turistas usarán su celular para comprar boletos.
- **Tecnología a utilizar:** **Flutter** o **React Native**. 
  - **Flutter** ofrece una compilación nativa directa (C++ / Skia), brindando animaciones a 60/120 FPS y una experiencia fluida superior, lo cual es ideal si se buscan interfaces de alto impacto visual como en viajes/atracciones. Usa `Dart`. Manejadores de estado como `BLoC` o `Riverpod` integran muy bien WebSockets para GraphQL.
  - **React Native** es la evolución natural si tú (o el equipo) ya dominan React (JS/TS), compartiendo sintaxis y paradigmas. 

---

## 5. Resiliencia, Tolerancia a Fallos e Interoperabilidad

La migración exige proteger las integraciones entre servicios distribuidos para evitar cascadas de fallos. Aplicaremos los siguientes patrones, implementables con bibliotecas como **Polly** en .NET:

1. **Idempotencia:** En sistemas asíncronos (RabbitMQ), existe el riesgo del "At-least-once delivery" (un mensaje puede llegar duplicado). Cada microservicio consumidor debe guardar una tabla (ej. `ProcessedEvents`) en su base de datos. Si el evento `CrearFactura_Reserva123` llega dos veces, el sistema detecta que el ID ya existe y descarta el segundo mensaje sin duplicar cobros.
2. **Reintentos (Retries) y Exponential Backoff:** Si el Gateway intenta comunicarse con Catalog y hay un micro-corte de red temporal, el sistema no lanza error al instante, sino que reintenta automáticamente esperando, por ejemplo, 1s, luego 2s, luego 4s (retroceso exponencial).
3. **Circuit Breaker:** Si Catalog está colapsado (ej. base de datos apagada), seguir reintentando solo saturará más la red. Tras un umbral de fallos (ej. 5 consecutivos), el circuito se "abre". Durante 30 segundos, cualquier petición se rechaza inmediatamente para darle tiempo al servicio de recuperarse.
4. **Fallback:** Es el "Plan B". En combinación con Circuit Breaker, si el servicio de búsqueda personalizada falla, el sistema devuelve una lista pre-guardada estática (caché) de "Atracciones Destacadas" en lugar de un error 500, mejorando la UX móvil.
5. **Manejo de Errores en Integraciones (DLQ - Dead Letter Queue):** Si Billing consume un evento del Bus pero su base de datos falla al procesarlo, el mensaje se reintenta localmente (ej. 5 veces). Si persiste, se empuja a una cola "Dead Letter" en RabbitMQ, donde queda aislado. Un administrador lo puede revisar más tarde, asegurando que **ningún dato se pierda**.

---

## 6. Integración de Datos y ETL/ELT

- **Normalización e Interoperabilidad Semántica/Sintáctica:** El API Gateway actúa como traductor de protocolos. Mientras internamente los servicios usan `gRPC` (Protobuf) o `RabbitMQ` (AMQP), de cara al dispositivo Móvil todo se exporta como `JSON` estructurado sobre HTTPS/WSS (WebSockets para GraphQL). 
- **Flujo de Información Consistente:** Evitaremos construir grandes reportes en tiempo real haciendo joins entre bases de datos separadas (ej. unir la tabla de Booking con Catalog). En su lugar, mediante eventos, el servicio Booking mantendrá vistas materializadas (copias de solo lectura de nombres de atracciones) en su propia base, para que cuando la App pida "Mis Reservaciones", obtenga todo el texto desde un solo servicio sin demoras.

---

## 7. Fases de Implementación Técnica y Tecnologías a Usar

### FASE 1: Patrones de Resiliencia y Estabilización gRPC
* **Instalar:** Paquete NuGet `Polly` en los proyectos de .NET.
* **Acción:** Envolver las llamadas HTTP/gRPC del API Gateway y los microservicios actuales con políticas de *Retry* y *Circuit Breaker*. 
* **Acción:** Modificar las bases de datos para incluir tablas de idempotencia en `Booking` y `Billing`.

### FASE 2: Infraestructura y Bus de Eventos
* **Instalar:** Docker image de `RabbitMQ`. Instalar paquete NuGet `MassTransit` (La forma más robusta de usar Rabbit en .NET).
* **Acción:** Definir la librería compartida de Contratos (Eventos) en C#.
* **Acción:** Intervenir el flujo síncrono Booking -> Billing. Eliminar la llamada directa gRPC, y hacer que Booking publique un mensaje en MassTransit. Billing debe ser configurado como consumidor.

### FASE 3: API Gateway en Tiempo Real (GraphQL)
* **Instalar:** Paquete NuGet `HotChocolate.AspNetCore` en el API Gateway o un nuevo backend for frontend.
* **Acción:** Configurar un Schema de GraphQL básico que apunte internamente a REST/gRPC.
* **Acción:** Activar WebSockets y definir una `[Subscription]` que emita datos hacia la App Móvil cuando un evento finaliza en RabbitMQ.

### FASE 4: App Móvil (Flutter / React Native)
* **Instalar:** SDK de Flutter o React Native CLI. Bibliotecas cliente de GraphQL (ej. `graphql_flutter` o `Apollo Client` para React Native).
* **Acción:** Replicar las interfaces UI del Marketplace, pero apuntando a los Querys y Subscriptions de GraphQL en el Gateway. Al crear reservaciones, la UI móvil simplemente escuchará el WebSocket y se pintará verde automáticamente cuando el bus confirme todo en background.
