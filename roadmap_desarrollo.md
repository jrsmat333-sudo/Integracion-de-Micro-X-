# 🗺️ Roadmap de Desarrollo: Estabilización y Evolución del Backend

Este documento detalla el plan de acción paso a paso para abordar el proyecto heredado. El objetivo principal de este roadmap es **evitar el caos** de intentar refactorizar, desplegar y conectar cosas simultáneamente. 

> **Regla de Oro:** Nunca se refactoriza ni se añade nueva tecnología (como YARP o gRPC) sobre un código base que no compila o que no se ha probado localmente.

---

## Fase 1: Restauración y Estabilización (Día 1)
*Objetivo: Lograr que el código existente compile en tu máquina local sin errores.*

1. **Instalación del Entorno:**
   - Verifica tener instalado **.NET 10 SDK**.
2. **Restauración de Paquetes:**
   - Abre la consola en la ruta raíz del proyecto (`c:\Users\USUARIO\Desktop\Microservicios.Atracciones`).
   - Entra a cada carpeta base (Identify, Catalog, Booking, Billing) y ejecuta `dotnet restore`. Esto descargará todas las dependencias que le faltan a tu computadora.
3. **Prueba de Compilación Lógica:**
   - En cada carpeta, ejecuta `dotnet build`. 
   - **Criterio de Éxito:** Cero errores de compilación en la consola. (Ignora los *Warnings* por ahora).

---

## Fase 2: Configuración de Bases de Datos (Día 1-2)
*Objetivo: Conectar los microservicios a tu propia infraestructura de Supabase.*

1. **Creación de Infraestructura:**
   - Entra a Supabase y crea 4 proyectos separados (ej. `atracciones-identify`, `atracciones-catalog`, `atracciones-booking`, `atracciones-billing`).
2. **Migración de Estructuras (Code-First a BD Existente):**
   - Abre el editor SQL de cada proyecto en Supabase.
   - Pega y ejecuta la sección correspondiente de tu archivo `sql_dividido.sql`. 
     - *Identidad:* Ejecuta la sección 1 (`identity_audit_log`, `users`, `role`, etc.).
     - *Catalog:* Ejecuta la sección 2 (`language`, `attraction`, etc.).
3. **Actualización de Credenciales (El Riesgo de Seguridad):**
   - Obtén las 4 URLs de conexión (Host, Password) de Supabase.
   - Modifica los archivos `appsettings.json` y `appsettings.Development.json` dentro de las carpetas `.API` de los 4 proyectos.
   - *(Opcional pero muy recomendado)*: Usa `dotnet user-secrets` para no dejar tu nueva contraseña de Supabase quemada en el código fuente.

---

## Fase 3: Pruebas Locales (Día 2)
*Objetivo: Confirmar que el código heredado realmente funciona y se comunica con tu base de datos.*

1. **Levantamiento Simultáneo:**
   - Abre 4 terminales (una para cada `.API`) y ejecuta `dotnet run`.
   - Alternativamente, si usas Visual Studio, abre los 4 archivos `.slnx` o configura una solución global para darle "Play" a todos a la vez.
2. **Pruebas de Funcionalidad Base (REST):**
   - Entra a la URL que te arroje la consola (ej. `https://localhost:5001/swagger`).
   - Usa el Swagger UI para hacer peticiones manuales:
     - Crea un usuario en Identify.
     - Crea una categoría en Catalog.
   - Ve a tu panel de Supabase y verifica que los datos realmente se hayan guardado en las tablas.
   - **Criterio de Éxito:** El proyecto lee y escribe en tus bases de datos sin excepciones.

---

## Fase 4: Implementación del API Gateway (YARP) (Día 3)
*Objetivo: Unificar los 4 microservicios bajo una sola URL para cumplir con el contrato `atracciones-api.yaml`.*



1. **Creación del Proyecto:**
   - Crea una nueva carpeta en la raíz llamada `Microservicios.Atracciones.Gateway.API`.
   - Inicia un proyecto web vacío: `dotnet new web`.
   - Instala YARP: `dotnet add package Yarp.ReverseProxy`.
2. **Configuración de Ruteo (`appsettings.json`):**
   - Aquí configurarás las reglas para mapear las rutas de tu contrato YAML hacia los puertos locales de tus APIs.
   - Ejemplo: Todo lo que vaya a `/api/v1/atracciones` en el Gateway, será redirigido a `https://localhost:[PUERTO_CATALOG]/api/v1/attraction`.

3. **Pruebas**
   - Comprueba que los 4 microservicios y el gateway se levantan correctamente.
   


---

## Fase 5: Evolución de Arquitectura y gRPC 
*Objetivo: Mejorar la comunicación interna (Backend-a-Backend).*

1. **Identificar Cuellos de Botella o Dependencias:**
   - Analiza qué microservicio necesita datos urgentes de otro. Por ejemplo, al crear un `Booking`, necesitas verificar que la `Atraccion` exista en el `Catalog`.
2. **Contratos `.proto`:**
   - Crea un pequeño proyecto de clases compartido para guardar los archivos `catalog.proto`.
3. **Implementación de Servidor/Cliente:**
   - En Catalog `.API`, instala `Grpc.AspNetCore` y expón el servicio (`app.MapGrpcService`).
   - En Booking `.Business`, instala `Grpc.Net.Client`, inyecta el cliente generado y llama a Catalog internamente en milisegundos.

---

## Fase 6: Despliegue en la Nube (Cloud)
*Objetivo: Exponer el proyecto al internet mediante una Red Privada.*

1. **Subida de Contenedores o Binarios:**
   - Despliega los 4 microservicios (Identify, Catalog, Booking, Billing) a tu servidor (ej. Azure App Service, Azure Container Apps, o Render).
   - Configúralos como **Servicios Internos** (Sin acceso desde internet público).
2. **Subida del Gateway:**
   - Sube tu proyecto `Microservicios.Atracciones.Gateway.API`.
   - Asígnale el dominio público (ej. `mi-empresa-api.azurewebsites.net`).
   - Modifica el `appsettings.json` del Gateway en la nube para que ya no apunte a `localhost:5001`, sino a las IPs o URLs internas privadas de los 4 microservicios en Azure.
3. **Entrega del Contrato:**
   - Entrega la URL de tu Gateway a los desarrolladores Frontend o externos. Ellos consumirán tu sistema usando el contrato YAML sin saber jamás qué hay detrás del telón.
