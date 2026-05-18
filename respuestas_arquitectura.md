# 🏛️ Respuestas sobre Arquitectura y Diseño del Proyecto

A continuación, resuelvo detalladamente tus dudas sobre el estado actual de tu backend, cómo escalarlo y las implicaciones de su diseño.

---

## 1. Comunicación e Integración (REST vs. gRPC)

### Implementación de gRPC en .NET
Implementar gRPC en tu entorno actual (.NET 10) es muy limpio y no requiere refactorizar tus controladores actuales. La forma más correcta es:
1. **Crear un proyecto compartido (Shared o Contracts):** Donde definas tus archivos `.proto` (ej. `catalog.proto`).
2. **Servidor gRPC:** En el microservicio que posee los datos (ej. `Catalog`), instalas el paquete `Grpc.AspNetCore`, implementas el servicio (heredando de la clase autogenerada del `.proto`) y lo expones en `Program.cs` usando `app.MapGrpcService<MiServicioGrpc>()`.
3. **Cliente gRPC:** En el microservicio que necesita los datos (ej. `Booking`), instalas `Grpc.Net.Client`, inyectas el cliente y haces la llamada directa.

Es la mejor opción para backend-to-backend porque es binario, muy rápido y fuertemente tipado.

### Exposición de Endpoints a Sistemas Externos
Tu diseño actual expone endpoints HTTP a través de los *Controllers* (como se ve en `BillingController.cs` o `AttractionController.cs`). Un sistema externo puede consumirlos haciendo peticiones HTTP directas a la URL y puerto donde esté corriendo cada microservicio. 
Sin embargo, **para que sea profesional**, un sistema externo no debería tener que saber que tienes 4 microservices distintos en 4 puertos distintos. La práctica estándar es colocar un **API Gateway** (como YARP u Ocelot) frente a tus microservicios. El Gateway expone una única URL pública y rutea las peticiones internamente al microservicio correcto.

### Condiciones REST y convivencia con gRPC
Que tu proyecto siga "condiciones REST" significa que tus controladores usan correctamente los verbos HTTP (`GET` para leer, `POST` para crear, `PUT` para actualizar), devuelven códigos de estado estándar (200, 404, 201) y usan JSON.
**Conviven perfectamente con gRPC.** La regla de oro es: 
- **REST:** Se usa para la comunicación hacia "afuera" (Frontend, Aplicaciones Móviles, Sistemas Externos).
- **gRPC:** Se usa para la comunicación "adentro" (El microservicio de Booking hablando con el de Catalog para verificar inventario).

---

## 2. Base de Datos y Entity Framework Core (EF Core)

### ¿Qué es EF Core y el DbContext?
Entity Framework Core es un ORM (Object-Relational Mapper). Su trabajo es traducir los objetos de C# (tus clases en la carpeta `Entities`) en consultas de SQL puro para PostgreSQL. El `DbContext` es el cerebro de esta operación: representa una sesión activa con la base de datos y define qué tablas existen (mediante los `DbSet`).

**Relación con tu script SQL:**
Tu proyecto está usando un enfoque de **"Database First lógico" pero implementado en código (Code-First mapping)**. 
Mirando tu archivo `sql_dividido.sql`, tú ya tienes las tablas estructuradas (ej. `users`, `attraction`). En lugar de decirle a EF Core que *cree* la base de datos desde cero, tu código en `AtraccionDbContext.cs` utiliza el método `OnModelCreating` (y la función `ToSnakeCase`) para decirle a C#: *"No crees las tablas, mapea mi clase `User` a la tabla existente `users` que ya está creada en PostgreSQL"*.

### Compatibilidad con Bases de Datos Existentes
Tu backend funcionará perfectamente con la base de datos del script `sql_dividido.sql` siempre y cuando las propiedades de tus clases en C# coincidan en tipo de dato con las columnas SQL, y que los nombres puedan ser traducidos por tu función `ToSnakeCase`. Si añades una nueva tabla en SQL, solo debes crear la clase correspondiente en `.Entities` y añadir un `DbSet` en tu `DbContext`.

### Microservicios con Base de Datos Compartida
Que `Booking` y `Billing` apunten al mismo host de Supabase **es un antipatrón en la arquitectura pura de microservicios**. En teoría, si el servicio de Booking se cae y corrompe su disco, no debería afectar a Billing. 
**¿Es un error crítico?** Para empresas enormes (Netflix, Amazon), sí. Para un proyecto inicial o en fase de emprendimiento, es una **decisión práctica y temporal muy común** para ahorrar costos de infraestructura y simplificar el mantenimiento. Mientras los `DbContext` de cada servicio no se crucen (Booking no debe consultar tablas de Billing directamente a nivel SQL), la separación lógica se mantiene y podrás separarlos físicamente a distintos servidores en el futuro sin reescribir tu código C#.

---

## 3. Configuración y Migración de Base de Datos (Supabase)

### Cambio de Connection String
Las cadenas de conexión son el único vínculo entre tu código y tu base de datos; ellas definen de forma única a dónde apunta cada microservicio.
Para migrar a tu propia base de datos de Supabase, debes abrir el archivo **`appsettings.json`** y **`appsettings.Development.json`** que se encuentran dentro de la carpeta `.API` de CADA microservicio (son 4 en total).

Debes buscar este bloque:
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=db.NUEVO_HOST.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=TU_NUEVA_PASSWORD;"
}
```
**Pasos:**
1. Crear el proyecto en Supabase.
2. Ejecutar tu script `sql_dividido.sql` en el SQL Editor de tu nuevo Supabase para crear las tablas.
3. Copiar la contraseña y el host que te da Supabase.
4. Reemplazar esos valores en los 4 `appsettings.json` de tu código.

---

## 4. Seguridad y Gestión de Secretos

### Llaves en Texto Plano
Tener `Jwt:Key` y contraseñas de base de datos en `appsettings.json` es un riesgo gigante. Si subes este código a un repositorio público en GitHub, un bot robará tu base de datos en cuestión de segundos.

**Mejor estrategia:** No lo dejes para después.
- **Para desarrollo local:** Usa **.NET User Secrets**. Abre la terminal en la carpeta `.API` y corre:
  `dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=...;Password=..."`
  Esto guarda la contraseña en una carpeta oculta de tu computadora Windows, no en el código.
- **Para Producción:** Al desplegar en Azure, AWS o Render, configura estas variables en la sección de **Environment Variables** del proveedor de nube. 
Luego, simplemente borra las contraseñas reales de tu `appsettings.json` y pon valores falsos o vacíos.

---

## 5. Comandos de Ejecución y el Contrato OpenAPI

### Uso de `dotnet run`
Efectivamente, `dotnet run` le dice al compilador de .NET: *"Toma este proyecto, compílalo, y levanta el servidor web Kestrel embebido"*.
Dado que tienes 4 microservicios independientes, **sí, tendrías que abrir 4 terminales distintas**, entrar a cada carpeta `.API` y hacer `dotnet run` en cada una. 
*(Tip: Puedes usar el archivo `.slnx` abriéndolo con Visual Studio 2022 y configurar la solución para que inicie "Múltiples Proyectos de Inicio" al presionar F5).*

### El Contrato `atracciones-api.yaml`
Este archivo es un contrato Swagger/OpenAPI. Define cómo un sistema externo espera comunicarse contigo (espera una sola URL base `/api/v1/yanick-maila` que agrupe `/atracciones`, `/booking`, etc.).

**¿Tu API actual cumple con esto?**
Tus controladores actuales cumplen *funcionalmente* (tienes controladores para Atracciones y Bookings), pero **estructuralmente no**. Actualmente tus APIs están dispersas en distintos puertos y sus rutas base son diferentes (ej. `api/v1/attraction` en lugar de `api/v1/yanick-maila/atracciones`).

**¿Cómo lograr que cumpla el contrato?**
Aquí es donde entra la magia del **API Gateway** (YARP). Debes crear un quinto proyecto mínimo en .NET que actúe como Gateway. Este Gateway expondrá la ruta base `api/v1/yanick-maila`. 
- Si el Gateway recibe una petición a `/atracciones`, la reenviará silenciosamente al puerto de tu microservicio de Catalog.
- Si recibe a `/booking`, la reenviará al puerto de Booking.
Para el sistema externo, parecerá que está hablando con un solo monolito gigante que cumple al 100% el contrato YAML.

**¿Problemas con gRPC?**
Ninguno en lo absoluto. El contrato YAML dicta cómo el mundo exterior (aplicaciones, socios) habla con tu Gateway. El gRPC ocurriría *detrás* de la cortina, entre tus microservicios (ej. cuando Booking le pregunta a Catalog si hay espacio). El cliente externo nunca se entera de que usas gRPC internamente.

---

## 6. Dudas Adicionales

### El API Gateway (YARP) y la ruta del contrato
Efectivamente, la URL `https://servicioatraccionapi.../api/v1/yanick-maila` que ves en el contrato es la **ruta pública que expondría el API Gateway**. 

**¿Cómo funciona?**
1. El sistema externo (quien sea que vaya a consumir tus datos) recibe única y exclusivamente esa URL del Gateway. No sabe absolutamente nada de tus 4 microservicios (Catalog, Booking, etc.) ni de sus puertos individuales.
2. Cuando el sistema externo hace una petición `GET https://.../api/v1/yanick-maila/atracciones`, el Gateway la recibe.
3. El Gateway internamente sabe (porque tú lo configurarás así) que todo lo que empiece con `/atracciones` debe redirigirlo (hacer un "proxy inverso") a `http://localhost:PUERTO_DE_CATALOG/api/v1/attraction`.
4. El microservicio de Catalog responde al Gateway, y el Gateway finalmente le devuelve esa misma respuesta al cliente externo.

**¿De qué forma se haría esto? ¿Qué es YARP?**
YARP (*Yet Another Reverse Proxy*) es una librería creada por Microsoft. Es la forma **más moderna, sencilla y nativa** de construir un API Gateway en ecosistemas .NET.
Para implementarlo:
- Sí, **tienes que crear un nuevo proyecto** (una nueva carpeta al mismo nivel que las otras, por ejemplo `Microservicios.Atracciones.Gateway`).
- En ese proyecto, instalas el paquete de YARP (`Yarp.ReverseProxy`).
- En el archivo `appsettings.json` de ese nuevo proyecto, escribes las reglas de ruteo como un simple JSON: *"Si recibes `/yanick-maila/atracciones`, envíalo al puerto 5001"*.

**¿Y qué pasa si mi ruta no va a tener `/yanick-maila/`? ¿Dónde se configura eso?**
No hay absolutamente ningún problema. El nombre `/yanick-maila/` en el contrato es solo un prefijo (*Base Path*) de ejemplo. Al momento de crear tu proyecto Gateway, **tú decides la ruta en el código**.
- El dominio base (`https://mi-empresa-api.azurewebsites.net`) te lo asigna la nube (Azure) al momento de desplegar.
- La ruta después del dominio (`/api/v1/atracciones`) la configuras **tú en el código**, específicamente en las reglas (*Routes*) del `appsettings.json` del Gateway.
- **La mejor forma para tu proyecto:** Simplemente ignora el `/yanick-maila/` del YAML. Configura tu Gateway para que reciba directamente `/api/v1/atracciones` y lo redirija a tu microservicio. Si el sistema externo te exige estrictamente usar `/yanick-maila/` porque ellos ya programaron su sistema así, entonces lo agregas en tu `appsettings.json` de YARP. Es un simple string de texto que puedes cambiar en el código en cualquier momento sin afectar en nada a tus 4 microservicios.

- **¿A dónde se sube? ¿Qué es eso de la Red Privada?** 
Efectivamente, para que funcione en internet, subirás **5 proyectos** a la nube (por ejemplo, a Azure): los 4 microservicios + el API Gateway.
Cuando digo que estarán en una **red privada**, significa lo siguiente:
  - En Azure, configuras el **Gateway** para que sea "Público". Este será el único que reciba un link accesible desde cualquier navegador en el mundo (`https://...`).
  - Tus otros 4 microservicios (Catalog, Booking, etc.) los configuras como "Internos" o "Privados". Azure no les asignará una URL pública en internet. 
  - Solo el Gateway, que está dentro de ese mismo servidor/red de Azure, conoce las direcciones internas IP de esos 4 microservicios y puede enviarles tráfico.
  - **¿Por qué se hace así?** Por pura seguridad. Evita que un atacante o bot malicioso pueda golpear directamente a tu microservicio de *Billing* saltándose las reglas del Gateway. El Gateway funciona como un "guardia de seguridad": es el único que da la cara al internet público, verifica las peticiones, y luego las deja pasar hacia los cuartos internos (tus microservicios).

- **¿Problemas con la BD?** Ninguno. El Gateway no se conecta a ninguna base de datos; es solo un "director de tráfico". Las bases de datos siguen siendo exclusivas de cada microservicio.
### Abordaje del Proyecto (Paso a Paso recomendado)
Como heredaste este proyecto y tu computadora no tiene las dependencias, tu objetivo principal es **evitar la frustración de intentar hacer demasiadas cosas a la vez**. El orden estricto de abordaje debería ser:

1. **Restaurar y Verificar Compilación (Solo Código):**
   - Asegúrate de tener instalado el **.NET 10 SDK**.
   - Entra a cada carpeta (o usa la solución global) y ejecuta `dotnet build`. .NET descargará e instalará todas las dependencias (paquetes NuGet) automáticamente. Asegúrate de que no haya errores de compilación.
2. **Configurar las Bases de Datos Locales/Remotas:**
   - Ve a Supabase, crea tus bases de datos (ver siguiente punto).
   - Actualiza todos los `appsettings.json` y `appsettings.Development.json` con tus nuevas URLs de conexión.
3. **Levantar y Probar (Sin hacer código nuevo aún):**
   - Levanta los proyectos (`dotnet run`). Entra a las URLs de Swagger de cada uno en tu navegador.
   - Intenta hacer peticiones a los endpoints existentes para asegurarte de que leen/escriben correctamente en tu nueva base de datos de Supabase.
4. **Implementar el API Gateway (YARP):**
   - Crea el proyecto nuevo de Gateway para unificar las rutas de acuerdo al contrato YAML y verifica que funcione.
5. **Implementar gRPC o Refactors:**
   - Una vez que la base de tu proyecto actual esté **100% estable, corriendo y conectada a tu BD**, recién entonces instalas `Grpc.AspNetCore` e inicias la programación de tus nuevos cambios estructurales.

### Configuración de Bases de Datos en Supabase
El plan que propones es **excelente y es el enfoque correcto** para una arquitectura de microservicios limpia:
1. Crear 4 bases de datos (o esquemas/proyectos) separadas en Supabase.
2. Poner las 4 URLs distintas en los `appsettings.json` de los respectivos microservicios.
3. Ejecutar tu script `sql_dividido.sql`. 
   *(Sugerencia: Aunque puedes correr el script completo en las 4 bases de datos, lo más profesional sería correr **solo la parte que corresponde a cada servicio**. Por ejemplo, en la BD de Identify, correr solo la sección "1. DB_IDENTITY"; en la BD de Catalog, solo la "2. DB_CATALOG", etc. Esto mantendrá tus BDs ligeras y sin tablas vacías inútiles).*

**¿Sería necesario hacer alguna configuración adicional en el código?**
**Absolutamente ninguna**. Como ya mencioné, el código de los DbContext (`AtraccionDbContext` y `BillingDbContext`) ya está escrito para buscar exactamente esas tablas y aplicar el formato `snake_case`. En el momento en que actualices la URL de conexión y levantes el proyecto, el ORM detectará las tablas creadas por tu script y funcionará de forma transparente.
