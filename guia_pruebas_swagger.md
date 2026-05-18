# 🧪 Guía de Pruebas Locales (Fase 3)

Este documento te servirá como guía para probar rápidamente que cada uno de tus 4 microservicios está conectado correctamente a su base de datos respectiva en Supabase.

## 🛠️ Instrucciones Generales
1. Abre 4 terminales.
2. Navega a la carpeta `.API` de cada microservicio.
3. Ejecuta `dotnet run` en cada terminal.
4. Fíjate en la consola qué URL (puerto) te asigna a cada uno (usualmente dicen `Now listening on: http://localhost:5000` o similar).
5. Abre en tu navegador `http://localhost:[PUERTO]/swagger`.

A continuación tienes los payloads JSON exactos que debes copiar y pegar en los endpoints de Swagger para realizar la prueba.

---

## 1. Microservicio IDENTIFY (Identidad)

**Objetivo:** Crear un nuevo usuario en la base de datos `atracciones-identify`.

### POST `/api/v1/yanick-maila/Auth/register` (o similar en UserController)
Busca el endpoint de registro o creación de usuario, presiona **Try it out** y pega este JSON:

```json
{
  "firstName": "Administrador",
  "lastName": "Prueba",
  "email": "admin@atracciones.com",
  "password": "Password123!"
}
```
*Nota: Si te pide un `roleId` o similar y falla, revisa el error que te devuelve; eso confirmará que la conexión a la base de datos es exitosa.*

### GET `/api/v1/yanick-maila/User`
Ejecuta el GET y verifica que te devuelva una lista (vacía o con el usuario que acabas de intentar crear). Si devuelve `200 OK`, la conexión de lectura es exitosa.

---

## 2. Microservicio CATALOG (Catálogo)

**Objetivo:** Crear una categoría básica en la base de datos `atracciones-catalog`.

### POST `/api/v1/catalog/Category`
Busca el endpoint POST de Category, dale a **Try it out** y pega este JSON:

```json
{
  "name": "Aventura Extrema",
  "description": "Atracciones de alto riesgo y adrenalina",
  "isActive": true
}
```

### GET `/api/v1/catalog/Category`
Al ejecutar este GET, deberías recibir un Array `[ { ... } ]` con la categoría que acabas de crear. ¡Lectura y escritura confirmadas!

---

## 3. Microservicio BOOKING (Reservas)

**Objetivo:** Probar lectura y manejo de errores (escritura requeriría IDs reales del catálogo).

### GET `/api/v1/booking/Booking` (o nombre equivalente)
Simplemente ejecuta el GET. Debería devolver un `200 OK` con una lista vacía `[]`. Si la base de datos no estuviera conectada, te arrojaría un error `500 Internal Server Error`.

### POST `/api/v1/booking/Booking`
Puedes intentar enviar una reserva falsa para ver si el sistema llega a consultar la BD:

```json
{
  "slotId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tickets": [
    {
      "ticketCategoryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "firstName": "Juan",
      "lastName": "Perez",
      "documentNumber": "123456789",
      "documentType": "DNI"
    }
  ],
  "notas": "Reserva de prueba"
}
```
*Si devuelve un error 400 (Bad Request) diciendo "El slot no existe", es un **éxito rotundo**, porque significa que el código fue a la base de datos de Booking a buscar el Slot y no lo encontró.*

---

## 4. Microservicio BILLING (Facturación)

**Objetivo:** Verificar la conectividad de la base de datos de pagos.

### GET `/api/v1/billing/management` (o endpoint equivalente)
Al igual que con Booking, ejecuta un GET en el controlador principal que encuentres en Swagger. Un `200 OK` (lista vacía) o un `401 Unauthorized` (si requiere token) confirmará que el servicio está arriba. 

Si el servicio levanta y puedes ver el Swagger sin errores fatales de consola, la conexión de Billing es correcta gracias a la corrección del punto y coma (`;`) que hicimos.

---

### 🎉 Criterio de Éxito Final
Si lograste crear la categoría en **Catalog** y el usuario en **Identify**, o al menos recibiste respuestas controladas del API (200, 400, 404) en lugar de una caída del servidor (500 Database Connection Refused), **la Fase 3 está superada**. 

¡Avísame apenas termines tus pruebas para empezar con la Fase 4 (API Gateway)!
