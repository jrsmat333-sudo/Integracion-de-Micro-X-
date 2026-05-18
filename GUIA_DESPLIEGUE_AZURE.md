# Guía de Preparación y Despliegue en Azure

Este documento detalla cómo preparar tu arquitectura de microservicios para el paso a producción en la nube (Azure), respondiendo a tus dudas sobre configuración, seguridad y flujo de trabajo.

## 1. Variables de Entorno y `appsettings.json`

Cuando desarrollas en local, guardas tus secretos (cadenas de conexión a la base de datos, claves JWT) en `appsettings.json`. Cuando subes a Azure, la mejor práctica es **no** subir esos secretos en texto plano en tus archivos.

### ¿Cómo funciona en Azure?
Azure tiene una sección llamada **Configuration** (o Variables de Entorno / Application Settings) en los servicios como *Azure App Service* o *Azure Container Apps*. 

Cuando tú configuras una variable en Azure llamada `ConnectionStrings__DefaultConnection` o `Jwt__Key` (nota los dobles guiones bajos `__` que en Azure reemplazan a los dos puntos `:`), **ASP.NET Core es lo suficientemente inteligente para sobrescribir lo que está en el `appsettings.json` con lo que está en Azure**.

### ¿Afecta el código?
**No. Cero cambios en el código.** La magia la hace la clase `builder.Configuration`. Esta clase lee en el siguiente orden:
1. Lee `appsettings.json`
2. Lee `appsettings.Production.json` (si existe)
3. Lee las Variables de Entorno del sistema (las que configuras en la nube)

Lo último que lee "gana". Por lo tanto, tu código seguirá funcionando exactamente igual, pero tomando los datos seguros de la nube.

---

## 2. El misterio del fragmento JWT en `Program.cs`

Te preguntabas por qué existe este código en los `Program.cs` y si deberías borrarlo:

```csharp
var jwtKey = builder.Configuration["Jwt:Key"] ?? "BillingService_Super_Secret_Key_2026";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "BillingService";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "BillingServiceUsers";
```

### ¿Debería borrarlo porque ya está en `appsettings.json`?
**¡NO, no lo borres!** Es estrictamente necesario. 

`appsettings.json` es solo un "diccionario" de texto, no ejecuta nada. El código en `Program.cs` es el que realmente levanta el sistema de seguridad.

Lo que hace ese código es:
1. `builder.Configuration["Jwt:Key"]` va y **busca** en tu `appsettings.json` (o en las variables de entorno de Azure) el valor de esa clave.
2. El operador `??` (Null-coalescing) significa: *"Si por algún error no encuentras la clave en el archivo json ni en la nube, entonces, para que la aplicación no explote (crashee), usa esta clave falsa por defecto: 'BillingService_Super_Secret_Key_2026'."*

**Recomendación:** En lugar de borrarlo, la mejor práctica para producción es quitar el fallback (`?? "..."`) y obligar al sistema a fallar si falta la clave, porque no quieres usar una clave hardcodeada en producción. Por ejemplo:

```csharp
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new ArgumentNullException("Jwt:Key falta en la configuración");
```

---

## 3. Redes Aisladas: ¿Por qué solo el Gateway es público?

Lo que escuchaste es la regla de oro de la arquitectura de microservicios: **El patrón API Gateway**.

### ¿Por qué aislar los microservicios?
Si tus 4 microservicios (Catalog, Booking, Identify, Billing) estuvieran públicos en Internet, tendrías grandes problemas:
- **Superficie de ataque gigante:** Un hacker tendría 4 puntos de entrada diferentes para intentar vulnerar tu sistema.
- **Complejidad de clientes:** Tus aplicaciones móviles o web tendrían que saber las 4 URLs distintas y manejar los CORS para cada una.
- **Fuga de datos internos:** Endpoints internos (como el de gRPC en el puerto 5012) podrían quedar expuestos accidentalmente a Internet.

### La solución de la nube (VNet)
En Azure (usando *Azure Container Apps* o *AKS*), tú creas una **Red Virtual (VNet)**. 
1. Pones a los 4 microservicios dentro de la VNet, configurados como "Ingress Interno". Esto significa que no tienen una IP pública en Internet.
2. Pones al **Gateway** en la misma red, pero a él le das un "Ingress Externo" (una IP pública y un dominio como `api.tudominio.com`).

Como todos están en la misma red privada, el Gateway puede verlos y redirigir el tráfico (`api.tudominio.com/api/v1/booking` -> `http://booking-service:80`), pero un hacker externo chocará siempre contra el Gateway, donde puedes poner Firewalls, Rate Limiting y monitoreo centralizado.

---

## 4. Flujo de Trabajo Recomendado para el Despliegue

Dado que tienes un sistema complejo con proyectos compartidos (Shared gRPC) y un Gateway, si intentas subir todo de golpe y algo falla, será muy difícil saber qué salió mal. Sigue este flujo paso a paso:

### Fase 1: Infraestructura Base
1. **Crear la Base de Datos:** Crea tu servidor PostgreSQL en Azure y despliega tu script `sql_dividido.sql`. Asegúrate de que las tablas estén listas.
2. **Entorno de App Service / Container Apps:** Crea el entorno donde vivirán las aplicaciones (ej. un Azure Container Apps Environment que crea automáticamente la red virtual).

### Fase 2: El Servicio Independiente
El servicio más independiente que tienes es `Identify` (Autenticación), ya que no depende de gRPC.
1. Compila y publica `Identify`. 
2. Asegúrate de configurar sus variables de entorno (`ConnectionStrings` y `Jwt:Key`).
3. Pruébalo *temporalmente* dándole acceso público solo para ver si conecta a la BD y genera tokens. (Una vez que pruebes, lo devuelves a red interna).

### Fase 3: Los Servicios con gRPC
Aquí entra la librería `Shared.gRPC`.
1. **El Paquete Compartido:** Asegúrate de que al compilar `Catalog` y `Booking`, ambos puedan encontrar el proyecto `Shared.gRPC`.
2. **Catalog primero:** Despliega Catalog. Configura su variable de BD. Asegúrate de que escuche en el puerto interno.
3. **Booking después:** Despliega Booking. Aquí viene lo importante: tienes que configurar la variable de entorno que le dice a Booking cuál es la URL interna de Catalog (ej. `http://catalog-service.internal:80`).
4. **Billing:** Despliégalo y conéctalo a la BD.

### Fase 4: El Gran Orquestador (El Gateway)
1. Despliega el API Gateway como la única aplicación pública.
2. En las Variables de Entorno del Gateway (o en su `appsettings.json` si lo subes quemado), cambia los `http://localhost:5001` por las **URLs internas** de Azure de cada microservicio (ej. `http://identity-service.internal`).
3. **La Prueba Final:** Abre Postman, apunta a la URL pública del Gateway, pide un token en `/Auth`, úsalo en el Bearer, y haz el `POST /api/v1/admin-booking`. Si funciona, tu ecosistema está 100% interconectado.

### Consejos para Azure
* Recomiendo **Azure Container Apps** para tu proyecto. Es Serverless, soporta HTTP/2 (vital para tu gRPC) y permite configurar redes internas y el Gateway muy fácilmente con contenedores Docker.
* Habilita **Application Insights**. Te permitirá ver un mapa visual de cómo el Gateway llama a Booking, y cómo Booking llama a Catalog por gRPC, mostrando exactamente dónde ocurren los errores.
