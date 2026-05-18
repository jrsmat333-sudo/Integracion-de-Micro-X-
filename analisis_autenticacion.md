# 🔐 Análisis del Sistema de Autenticación y Roles

Este documento detalla el funcionamiento exacto del sistema de autenticación, usuarios y roles dentro del microservicio **Identify**, basándose estrictamente en el código actual del proyecto sin plantear modificaciones.

---

## 1. Visión General: Entidades y Relaciones
El sistema está basado en **Entity Framework Core** y utiliza una relación de "muchos a muchos" entre usuarios y roles.
En la base de datos `atracciones-identify` y en la capa de acceso a datos (`Microservicios.Atracciones.Identify.DataAccess\Entities`), participan las siguientes entidades clave:

- **`User` (`users`)**: Maneja las credenciales. Almacena el correo (`Email`), la contraseña encriptada con BCrypt (`PasswordHash`) y el estado activo.
- **`Role` (`role`)**: Es un catálogo de los roles disponibles en el sistema (ej. *Client*, *Admin*).
- **`UserRole` (`user_role`)**: Tabla intermedia que vincula a un `User` con uno o varios `Role`.
- **`Client` (`client`)**: Almacena los datos personales (Nombre, Apellido, Teléfono, etc.) y está fuertemente vinculado a un `User` (`user_id`).

El sistema utiliza **JSON Web Tokens (JWT)** para mantener la sesión y los permisos de manera *stateless* (sin guardar sesión en memoria).

---

## 2. ¿Qué ocurre exactamente al crear un nuevo usuario?
El registro ocurre cuando un cliente envía un `POST` al endpoint `/api/v1/auth/register` (ubicado en `AuthController.cs`). 

El controlador delega esta tarea a la clase `AuthService.cs` (Capa Business), específicamente en el método `RegisterAsync()`. El flujo es el siguiente:

1. **Validación de unicidad:** Se verifica que el correo (`Email`) no exista previamente en la tabla `users`.
2. **Búsqueda del Rol (Asignación por defecto):**
   El código busca en la base de datos un rol que se llame exactamente `"Client"`.
   ```csharp
   // Código real en AuthService.cs
   var clientRole = await _unitOfWork.Roles.Query().FirstOrDefaultAsync(r => r.Name == "Client");
   ```
3. **Creación Atómica:** Se crea el objeto `User`, se hashea la contraseña usando la librería `BCrypt`, se crea el registro hijo `Client` (con los datos personales) y se añade una entrada a `UserRoles` inyectando el ID del rol `"Client"` encontrado en el paso anterior.
4. **Respuesta JWT:** Si el guardado es exitoso, genera y retorna inmediatamente el token JWT para que el usuario quede "logueado".

> **Respuesta a tu duda:** Por defecto se le asigna el rol **"Client"**. Esta asignación ocurre en el método `RegisterAsync` del archivo `AuthService.cs`.

---

## 3. ¿Cómo diferencia el sistema entre Usuario y Administrador?
La diferenciación se hace al momento de hacer **Login** y a través de los **Claims del JWT**.

Existen dos endpoints separados en `AuthController.cs`:
1. **`/login`** (Método `LoginAsync` en `AuthService`):
   - Verifica las credenciales.
   - Revisa la lista de roles del usuario. Si detecta que tiene el rol `"Admin"` o `"Partner"`, **bloquea el acceso** y le dice al usuario: *"Esta ruta es exclusiva para clientes. Usa /login-admin"*.
2. **`/login-admin`** (Método `LoginAdminAsync` en `AuthService`):
   - Verifica credenciales.
   - Revisa la lista de roles. Si el usuario **NO** tiene el rol `"Admin"` ni `"Partner"`, **bloquea el acceso** y dice: *"Esta ruta es exclusiva para administradores..."*.

Una vez que el usuario (sea cliente o admin) entra exitosamente, el método `GenerateTokenResponse()` toma todos los roles que tiene el usuario en la base de datos y los inyecta dentro de la "firma" del JWT bajo la propiedad `ClaimTypes.Role`.

### Validación en las rutas (Authorization)
Para proteger las rutas, el sistema utiliza el decorador de .NET llamado `[Authorize]`. Al usar JWT, el *Middleware* de .NET lee automáticamente los "Claims" de rol del token y decide si permite el paso.

Ejemplos en `AuthController.cs`:
- `[Authorize(Roles = "Client")]`: Solo permite entrar si el JWT contiene el rol "Client".
- `[Authorize(Roles = "Admin,Partner")]`: Permite entrar si el JWT contiene "Admin" o "Partner".

---

## 4. Pre-requisitos de Base de Datos (IMPORTANTE)
Actualmente, **tu base de datos está completamente vacía**. Al analizar tu archivo `sql_dividido.sql`, se constata que solo se crearon las tablas (`CREATE TABLE`), pero **no hay ningún script de inserción de datos iniciales (seeds)** ni migraciones automáticas configuradas en `Program.cs` para llenar la tabla de roles.

### ¿Qué sucederá si intentas registrarte ahora mismo?
Si envías el JSON a `/api/v1/auth/register`, el sistema ejecutará esta línea:
```csharp
var clientRole = await _unitOfWork.Roles.Query().FirstOrDefaultAsync(r => r.Name == "Client");
if (clientRole == null)
    throw new BusinessException("No se encontró el rol de cliente en la base de datos.");
```
Como la tabla `role` está vacía, la variable `clientRole` será nula y **el registro fallará arrojando ese error**.

### Solución Mínima Requerida
Para que el flujo del sistema funcione correctamente sin tocar el código en C#, debes insertar los roles esperados directamente en tu base de datos `atracciones-identify` en Supabase.

Ejecuta este script SQL en el editor SQL de Supabase para tu base de datos de Identidad:

```sql
INSERT INTO role (name, description) VALUES 
('Client', 'Usuario cliente estándar de la aplicación'),
('Admin', 'Administrador principal del sistema'),
('Partner', 'Socio o proveedor de atracciones');
```

Una vez que este registro maestro con el nombre `Client` exista en la tabla `role`, el código de `AuthService.cs` logrará encontrarlo, extraerá su ID (UUID) y se lo asignará automáticamente a cualquier nuevo registro que entre por la ruta de registro. 

*(Para crear un Administrador real, tendrás que registrarlo como un usuario normal y luego, por base de datos, cambiarle el ID de su rol en la tabla `user_role` para que apunte al rol `Admin`).*
