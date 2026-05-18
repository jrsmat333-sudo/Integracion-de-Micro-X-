# Rutas de Producción para Integradores

**API Gateway Base URL:**  
`https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io`

Este documento lista las URLs absolutas que cualquier frontend o sistema externo integrador debe utilizar para interactuar con tu ecosistema de microservicios de forma encriptada y segura.

---

## 1. Identidad y Autenticación (Identify Service)
El Gateway redirige las rutas que empiezan con `/api/v1/Auth` y `/api/v1/client` hacia el microservicio Identify.

- **Iniciar Sesión (Obtener Token JWT)**
  - `POST https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/Auth/Login`
- **Validar Cliente**
  - `GET https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/client/validate/{docNumber}`

---

## 2. Catálogo de Atracciones (Catalog Service)
El Gateway redirige las rutas que empiezan con `/api/v1/catalog` hacia el microservicio Catalog.

- **Listar Atracciones** (Reemplaza a `GET /atracciones`)
  - `GET https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/catalog/attraction`
- **Obtener Detalle de Atracción** (Reemplaza a `GET /atracciones/{id}`)
  - `GET https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/catalog/attraction/{slug}`

---

## 3. Reservas y Disponibilidad (Booking Service)
El Gateway redirige las rutas que empiezan con `/api/v1/booking`, `/api/v1/admin-booking` y `/api/v1/review` hacia el microservicio Booking.

- **Consultar Disponibilidad** (Reemplaza a `GET /atracciones/{id}/disponibilidad`)
  - `GET https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/booking/disponibilidad?attractionId={id}`
- **Crear Reserva (Integrador Externo - Confía en precios)**
  - `POST https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/booking`
- **Crear Reserva Segura (Plataforma Interna - Valida gRPC)**
  - `POST https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/admin-booking`
- **Listar mis reservas**
  - `GET https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/booking/mis-reservas`
- **Cancelar reserva**
  - `POST https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/booking/{id}/cancel`

---

## 4. Facturación (Billing Service)
El Gateway redirige las rutas que empiezan con `/api/v1/billing` y `/api/v1/payment` hacia el microservicio Billing.

- **Listar Facturas**
  - `GET https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io/api/v1/billing/management`
