# Guía de Pruebas: API Gateway y Microservicios

Esta guía contiene las instrucciones y peticiones exactas para comprobar que el **API Gateway (YARP)** está enrutando correctamente el tráfico hacia los 4 microservicios subyacentes.

## 1. Levantar la Arquitectura Completa

Para que el Gateway funcione, es estrictamente necesario que los 4 microservicios destino estén corriendo simultáneamente. 

Abre **5 terminales distintas** en la raíz de tu proyecto y ejecuta cada comando en una terminal separada:

**Terminal 1 (Identify - Puerto 5001):**
```bash
cd Microservicios.Atracciones.Identify/Microservicios.Atracciones.Identify.API
dotnet run
```

**Terminal 2 (Catalog - Puerto 5002):**
```bash
cd Microservicios.Atracciones.Catalog/Microservicios.Atracciones.Catalog.API
dotnet run
```

**Terminal 3 (Booking - Puerto 5003):**
```bash
cd Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.API
dotnet run
```

**Terminal 4 (Billing - Puerto 5004):**
```bash
cd Microservicios.Atracciones.Billing/Microservicios.Atracciones.Billing.API
dotnet run
```

**Terminal 5 (Gateway - Puerto 5000):**
```bash
cd Microservicios.Atracciones.Gateway.API
dotnet run
```

---

## 2. Pruebas de Ruteo a través del Gateway (Postman / REST Client)

**IMPORTANTE:** Fíjate que todas las peticiones a continuación se envían al **`localhost:5000`** (El Gateway). Ya no tienes que preocuparte por saber en qué puerto corre cada microservicio; el Gateway lo sabe por ti.

### Prueba 1: Microservicio de Identidad (Identify)
Verificaremos que el Gateway puede enrutar una petición de login hacia el microservicio de autenticación (`localhost:5001`).

```http
POST http://localhost:5000/api/v1/Auth/login
Content-Type: application/json

{
  "email": "admin@atracciones.com",
  "password": "Password123!"
}
```
*Si devuelve un Token JWT, el ruteo de `identity-cluster` es exitoso.*

### Prueba 2: Microservicio de Catálogo (Catalog)
Verificaremos que el Gateway puede listar las categorías públicas (`localhost:5002`). Esta ruta suele ser pública.

```http
GET http://localhost:5000/api/v1/catalog/Category
Accept: application/json
```
*Si devuelve una lista (ej. `[]`), el ruteo de `catalog-cluster` es exitoso.*

### Prueba 3: Microservicio de Reservas (Booking)
Comprobaremos que el Gateway deriva las consultas de disponibilidad de tours hacia el microservicio de Booking (`localhost:5003`). Asumiendo que esta es la ruta para buscar disponibilidad (puedes ajustar el id de la atracción):

```http
GET http://localhost:5000/api/v1/booking/availability/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d?date=2026-05-20
Accept: application/json
```
*(Es probable que requiera el Header `Authorization: Bearer <token_de_la_prueba_1>` dependiendo de cómo protejas tus rutas).*
*Si devuelve una respuesta HTTP 200 o HTTP 404 (Attraction not found), significa que el Gateway logró llegar al backend exitosamente, demostrando que el `booking-cluster` funciona.*

### Prueba 4: Microservicio de Facturación (Billing)
Probaremos que el Gateway rutea la consulta de las facturas del sistema hacia Billing (`localhost:5004`). Esta ruta suele ser protegida, así que asegúrate de enviar el token obtenido en la Prueba 1.

```http
GET http://localhost:5000/api/v1/billing/management
Authorization: Bearer <AQUI_TU_TOKEN_JWT>
Accept: application/json
```
*Si devuelve `HTTP 200 OK`, el ruteo de `billing-cluster` y tu configuración JWT están funcionando sin problemas a través del Gateway.*

---

## 3. Comprobación de Fallos (Qué hacer si algo falla)

Si envías una petición al Gateway (`http://localhost:5000/...`) y recibes un error **HTTP 502 Bad Gateway** o **HTTP 503 Service Unavailable**, esto significa que:
1. El Gateway entendió a dónde querías ir.
2. Pero el microservicio destino (ej. `localhost:5001`) está apagado o fallando.
   - **Solución:** Revisa la consola de ese microservicio específico para ver si se cayó o si hay errores de base de datos.

Si recibes un error **HTTP 404 Not Found** directamente del Gateway, significa que:
1. Escribiste mal la URL y no coincide con ninguna regla definida en tu `appsettings.json` del Gateway.
   - **Solución:** Compara la URL que escribiste con los `Match.Path` de la configuración de YARP.
