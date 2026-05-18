# 📄 Análisis Técnico: Proyecto `Microservicios.Atracciones`

## 1. Objetivo del análisis
El objetivo de este documento es proporcionar una comprensión exhaustiva de la arquitectura, funcionamiento, estructuración y flujo de datos del backend del proyecto `Microservicios.Atracciones`. Se ha realizado un escrutinio completamente pasivo del código fuente para entender la disposición de las tecnologías, cómo interactúan (o no) los diferentes servicios y cuál es la responsabilidad de cada componente.

Este documento sirve como guía principal para la inducción (onboarding) de nuevos desarrolladores al proyecto.

---

## 2. Arquitectura general

### 2.1. Patrón Arquitectónico
Cada uno de los servicios dentro de este proyecto sigue estrictamente una **Arquitectura N-Capas (N-Tier Architecture)** clásica, con claras divisiones lógicas dentro de cada dominio. El patrón principal implementado para el acceso a datos es el **Repository Pattern** junto con el patrón **Unit of Work**.

### 2.2. ¿Es realmente una arquitectura de microservicios?
**Físicamente sí, pero operativamente incompleta o delegada al Frontend.** 
El proyecto está segregado en cuatro dominios principales que operan como servicios independientes:
1. `Microservicios.Atracciones.Identify` (Autenticación y RBAC)
2. `Microservicios.Atracciones.Catalog` (Gestión de atracciones, categorías e idiomas)
3. `Microservicios.Atracciones.Booking` (Gestión de inventario y reservas)
4. `Microservicios.Atracciones.Billing` (Facturación y pagos)

Sin embargo, a nivel de backend:
- **NO existe un API Gateway** (como Ocelot o YARP) dentro de este repositorio.
- **NO hay comunicación directa (Síncrona o Asíncrona)** entre los servicios. No se encontraron implementaciones de `HttpClient`, `gRPC`, ni Message Brokers (`RabbitMQ`, `Kafka`, `MassTransit`).
- Esto indica que la orquestación de llamadas y la composición de los datos recae íntegramente en el cliente (Frontend/BFF), o que el proyecto se encuentra en una etapa de desarrollo donde las integraciones inter-servicios aún no han sido implementadas.

### 2.3. Organización y Responsabilidades
Cada microservicio está subdividido en 4 proyectos de clases principales (ej. `Microservicios.Atracciones.Catalog`):
- **`.API`**: Capa de presentación (Controladores, inyección de dependencias, configuración JWT y Swagger).
- **`.Business`**: Lógica de negocio, servicios e interfaces (Casos de uso y validaciones).
- **`.DataAccess`**: Interacción con la base de datos (DbContext de Entity Framework, Repositorios, Entidades de dominio).
- **`.DataManagement`**: Gestión auxiliar de datos (Mappers, DTOs y validadores transversales).

---

## 3. Tecnologías utilizadas

- **Framework Backend principal**: ASP.NET Core (.NET 10.0), la versión más moderna del framework.
- **Lenguaje**: C# 14 (o el correspondiente a .NET 10).
- **ORM**: Entity Framework Core.
- **Base de Datos**: PostgreSQL alojado remotamente en **Supabase**.
- **Autenticación**: JSON Web Tokens (JWT) mediante `Microsoft.AspNetCore.Authentication.JwtBearer`.
- **Generación de PDFs**: `QuestPDF` (Versión Community), detectado específicamente en el microservicio `Billing` para la generación de comprobantes.
- **Documentación de API**: Swagger (`Swashbuckle.AspNetCore`).
- **Versionado de API**: `Asp.Versioning.Mvc`.
- **Docker / Sistemas de Mensajería**: **Ausentes**. No se encontró ningún `Dockerfile`, `docker-compose.yml`, ni referencias a RabbitMQ/Kafka. El proyecto está diseñado para ejecutarse nativamente mediante `dotnet run` / IIS Express localmente.

---

## 4. Comunicación entre microservicios

Como se mencionó anteriormente, tras inspeccionar exhaustivamente la solución:
- **NO se utiliza comunicación REST interna**: No hay rastros de `HttpClient`, `Refit` ni `RestSharp`.
- **NO se utiliza comunicación gRPC**.
- **NO se utilizan Message Brokers o Eventos**.

*Excepción técnica:* Los microservicios operan en silos aislados, pero comparten **la misma infraestructura de base de datos** en Supabase. Específicamente, el servicio de **Booking** y **Billing** apuntan exactamente al mismo cluster y host de Supabase (`Host=db.xjadseakmpettnpyyxdm.supabase.co`), aunque utilizan diferentes contextos de datos.

**Nota:** Si un proceso requiere datos de varios servicios (ej. Crear una reserva que requiere datos del usuario, inventario del catálogo y generar un pago), el cliente (Frontend) debe hacer peticiones en cadena a los distintos puertos locales que expone cada API.

---

## 5. API y Endpoints

### Definición y Enrutamiento
- Los endpoints están definidos en la capa `.API/Controllers/V1/` utilizando el atributo `[ApiController]`.
- El ruteo es explícito por atributos, siguiendo convenciones REST: `[Route("api/v1/[controller]")]`.

### Manejo de Requests y Autenticación
- **Protección**: La mayoría de las rutas están protegidas mediante el atributo `[Authorize]`. Se hace uso extensivo de Roles (`[Authorize(Roles = "Admin,Partner")]`).
- **Anonimato**: Algunos endpoints de búsqueda en el catálogo usan `[AllowAnonymous]` para visitantes públicos.
- **Identidad del usuario**: Los controladores recuperan la identidad del usuario a través de `ClaimTypes.NameIdentifier` desde el JWT.

### Respuestas
- Se devuelve un formato JSON utilizando objetos auxiliares como `PagedResult<T>` para paginaciones.
- Se hace uso de métodos nativos de `ControllerBase` como `Ok()`, `NotFound()`, `CreatedAtAction()`.

---

## 6. Base de Datos

### Conexión
La URL de conexión está definida en los archivos `appsettings.json` de cada servicio bajo el nodo `ConnectionStrings:DefaultConnection`.

### ORM y Modelos (Entity Framework Core)
- **DbContext**: Cada servicio tiene su propio contexto (ej. `AtraccionDbContext` en Catalog/Booking/Identify y `BillingDbContext` en Billing).
- **Mapeo a Snake Case**: En el método `OnModelCreating`, los modelos se mapean explícitamente a nombres de tabla específicos y se implementa una función `ToSnakeCase` para convertir las propiedades C# (PascalCase) a nombres de columna amigables en PostgreSQL (snake_case).
- **Auditoría automática**: Los DbContext sobrescriben el método `SaveChangesAsync()`. Se implementa una función `StampAuditFields()` que detecta si la entidad implementa `BaseEntity` y le asigna automáticamente la fecha de `CreatedAt` (para INSERT) o `UpdatedAt` (para UPDATE), evitando que las consultas modifiquen la fecha de creación accidentalmente.
- **Historial Completo (AuditLog)**: En el servicio de **Booking**, existe un método `BuildAuditEntries()` que intercepta cualquier modificación a la base de datos (INSERT/UPDATE/DELETE), registra la dirección IP, el endpoint y el agente de usuario, serializando en JSON los valores viejos y nuevos (`OldValues`, `NewValues`) en la tabla `audit_log`.

---

## 7. Flujo Interno del Proyecto (Paso a paso)

Cuando entra una petición (ej. Búsqueda de Atracciones):
1. **Entrada al Controller (`.API`)**: La petición llega a `AttractionController`. ASP.NET Core valida automáticamente el JWT (si aplica).
2. **Inyección de Dependencias**: El controlador invoca el servicio correspondiente a través de una interfaz (ej. `_attractionService.SearchAsync()`).
3. **Lógica de Negocio (`.Business`)**: El `AttractionService` recibe el Request/DTO. Aquí se aplica la lógica de negocio, reglas de validación y cálculos.
4. **Acceso a Datos (`.DataAccess`)**: El servicio llama al Unit of Work (`_uow`) que provee acceso a los Repositorios (ej. `_uow.Attractions.Query()`).
5. **Base de Datos**: El Repositorio ejecuta la consulta en PostgreSQL a través de Entity Framework Core (`AtraccionDbContext`).
6. **Mapeo y Retorno**: Los datos devueltos de la BD se mapean a un DTO de respuesta (`AttractionSummaryResponse`) —muchas veces apoyado por las utilidades en `.DataManagement`— y se devuelven al Controller.
7. **Respuesta HTTP**: El Controller envuelve la respuesta en un `ActionResult` (`Ok()`) retornando un JSON al cliente.

---

## 8. Estructura del Proyecto (Carpetas)

La arquitectura base por cada microservicio (`Microservicios.Atracciones.[Servicio]`) es la siguiente:

- **`[Servicio].API`**: Es el *Entrypoint*. Contiene `Program.cs` (donde se configura el contenedor IoC, Swagger y Middlewares), la carpeta `Controllers/` (los endpoints) y el archivo `appsettings.json` (variables y conexión a BD).
- **`[Servicio].Business`**: Contiene la lógica profunda de la app. Sus carpetas típicas son `Services/` (implementación de la lógica), `Interfaces/` (contratos) y `DTOs/`.
- **`[Servicio].DataAccess`**: Responsable exclusivo de la persistencia. Contiene `Context/` (AtraccionDbContext), `Entities/` (Modelos de la base de datos como `User`, `Location`, `Payment`), y `Repositories/` (Unit of Work y Repositorios genéricos).
- **`[Servicio].DataManagement`**: Utilizado para código transversal. Suele contener `Mappers/` para transformar Entidades a DTOs y validadores transversales auxiliares.

---

## 9. Configuración y Despliegue

- **Ejecución Local**: Para levantar el proyecto, un desarrollador simplemente debe entrar en la carpeta del `.API` de cada microservicio y ejecutar `dotnet run` (o inicializar múltiples proyectos desde Visual Studio mediante el archivo `.slnx`).
- **Configuración**: Se maneja vía los archivos `appsettings.json` y `appsettings.Development.json`. En este archivo residen:
  - Cadenas de conexión (Supabase).
  - Configuración del Token JWT (`Key`, `Issuer`, `Audience`). Las llaves están hardcodeadas en texto plano en estos archivos de configuración.
  - Reglas de Logging.
- **Despliegue y DevOps**: Al no existir Dockerfiles o configuración de CI/CD (GitHub Actions, Azure DevOps pipelines) dentro del repositorio, se deduce que el proyecto se corre en servicios App Service nativos o PaaS (por ejemplo Azure App Service o Render) mediante publicación de binarios, o los contenedores se generan de forma externa a este repo.

---

## 10. Hallazgos Importantes (Riesgos, Acoplamiento y Buenas Prácticas)

### ✅ Buenas Prácticas detectadas
1. **Auditoría Transparente (Audit Logging):** Muy buena implementación en el DbContext para sobrescribir `SaveChangesAsync` y marcar automáticamente fechas y realizar un Change Tracking en formato JSON (`OldValues`/`NewValues`). Esto reduce el código repetitivo en los repositorios.
2. **Capa N-Tier Limpia:** Excelente aislamiento; los controladores no conocen de EF Core, y la capa DataAccess no conoce del protocolo HTTP.
3. **Mapeo Inteligente de BD:** El uso de una función dinámica `ToSnakeCase` en el ModelBuilder es una forma muy astuta de mantener el estándar de C# (`PascalCase`) mientras se respeta la convención `snake_case` de PostgreSQL.

### ⚠️ Riesgos Técnicos y Posibles Antipatrones
1. **Falta de comunicación Backend-to-Backend:** El hecho de que no exista un API Gateway ni llamadas HTTP entre servicios rompe un poco el concepto tradicional de Microservicios, convirtiéndolo en un patrón BFF (Backend For Frontend) extremo, donde la UI carga con la responsabilidad de orquestar transacciones distribuidas (ej. si falla el pago, la UI tiene que decirle al servicio de booking que lo cancele).
2. **Llaves Secretas en Texto Plano:** Las llaves JWT (`Jwt:Key`) y la cadena de conexión de Supabase (con contraseña explícita) están expuestas dentro del archivo de código fuente `appsettings.json`. Deberían ser inyectadas mediante `Environment Variables` o User Secrets en desarrollo.
3. **Compartición de Base de Datos Base de datos (Booking & Billing):** Ambos servicios apuntan al mismo clúster de Supabase (`db.xjadseakmpettnpyyxdm.supabase.co`). Aunque lógicamente las entidades están separadas en sus DbContexts, este nivel de acoplamiento infraestructural podría generar cuellos de botella compartidos.
4. **Falta de Docker:** Dificulta el onboarding local de nuevos desarrolladores ya que deben levantar 4 proyectos en C# distintos por consola y no hay un `docker-compose up` unificado.
