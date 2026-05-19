# 🔍 Auditoría Completa de Rutas — Backend vs Gateway
**Fecha:** 2026-05-19

---

## Resultado: ✅ Gateway CORREGIDO — Todas las rutas coinciden

Se auditaron los **14 controladores** de los **4 microservicios**. Tras la corrección aplicada, **todas las rutas del backend son accesibles a través del Gateway**.

---

## 1. Identity Service (`identity-cluster`)

| Controlador | Ruta Backend | Ruta Gateway | Estado |
|---|---|---|---|
| `AuthController` | `api/v1/auth` | `/api/v1/auth/{**catch-all}` | ✅ OK |
| `ClientController` | `api/v1/client` | `/api/v1/client/{**catch-all}` | ✅ OK |
| `UserController` | `api/v1/user` | `/api/v1/user/{**catch-all}` | ✅ OK (Recién agregado) |

### Endpoints detallados expuestos:

| Método | Ruta completa vía Gateway | Descripción | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Login de cliente | Público |
| `POST` | `/api/v1/auth/login-admin` | Login administrativo | Público |
| `POST` | `/api/v1/auth/register` | Registrar cuenta cliente | Público |
| `PUT` | `/api/v1/auth/profile` | Actualizar perfil | Bearer |
| `PUT` | `/api/v1/auth/change-password` | Cambiar contraseña | Bearer |
| `POST` | `/api/v1/auth/forgot-password` | Solicitar reset de contraseña | Público |
| `POST` | `/api/v1/auth/reset-password` | Restablecer contraseña con token | Público |
| `GET` | `/api/v1/client` | Listar clientes | Admin |
| `GET` | `/api/v1/client/{id}` | Detalle de cliente | Admin/Client |
| `GET` | `/api/v1/client/validate/{docNumber}` | Validar cliente por documento | Bearer |
| `PUT` | `/api/v1/client/{id}` | Actualizar cliente | Client |
| `POST` | `/api/v1/client` | Crear cliente | Admin |
| `DELETE` | `/api/v1/client/{id}` | Eliminar cliente | Admin |
| `GET` | `/api/v1/user` | Listar usuarios | Admin |
| `POST` | `/api/v1/user` | Crear usuario | Admin |
| `PATCH` | `/api/v1/user/{id}/status` | Activar/desactivar usuario | Admin |
| `DELETE` | `/api/v1/user/{id}` | Eliminar usuario | Admin |

---

## 2. Catalog Service (`catalog-cluster`)

| Controlador | Ruta Backend | Ruta Gateway | Estado |
|---|---|---|---|
| `AttractionController` | `api/v1/attraction` | `/api/v1/attraction/{**catch-all}` | ✅ OK |
| `CategoryController` | `api/v1/category` | `/api/v1/category/{**catch-all}` | ✅ OK (Recién agregado) |
| `LocationController` | `api/v1/location` | `/api/v1/location/{**catch-all}` | ✅ OK (Recién agregado) |
| `TagController` | `api/v1/tag` | `/api/v1/tag/{**catch-all}` | ✅ OK (Recién agregado) |
| `ItineraryController` | `api/v1/itinerary` | `/api/v1/itinerary/{**catch-all}` | ✅ OK (Recién agregado) |
| `MediaController` | `api/v1/media` | `/api/v1/media/{**catch-all}` | ✅ OK (Recién agregado) |
| `ProductOptionController` | `api/v1/productoption` | `/api/v1/productoption/{**catch-all}` | ✅ OK (Recién agregado) |
| `TicketCategoryController` | `api/v1/ticketcategory` | `/api/v1/ticketcategory/{**catch-all}` | ✅ OK (Recién agregado) |
| `InclusionController` | `api/v1/inclusion` | `/api/v1/inclusion/{**catch-all}` | ✅ OK (Recién agregado) |

---

## 3. Booking Service (`booking-cluster`)

| Controlador | Ruta Backend | Ruta Gateway | Estado |
|---|---|---|---|
| `BookingController` | `api/v1/admin-booking` | `/api/v1/admin-booking/{**catch-all}` | ✅ OK |
| `AtraccionesBookingController` | `api/v1/booking` | `/api/v1/booking/{**catch-all}` | ✅ OK |
| `ReviewController` | `api/v1/review` | `/api/v1/review/{**catch-all}` | ✅ OK |

### Endpoints detallados expuestos:

| Método | Ruta completa vía Gateway | Descripción | Auth |
|---|---|---|---|
| `POST` | `/api/v1/admin-booking` | Crear reserva segura (gRPC) | Client/Admin/Partner |
| `GET` | `/api/v1/admin-booking/management` | Panel admin de reservas | Admin/Partner |
| `GET` | `/api/v1/admin-booking/{pnr}` | Detalle por PNR | Público |
| `POST` | `/api/v1/admin-booking/cancel` | Cancelar reserva (admin) | Client/Admin |
| `GET` | `/api/v1/admin-booking/user/history` | Historial usuario | Client |
| `GET` | `/api/v1/admin-booking/detail/{id}` | Detalle por ID | Bearer |
| `POST` | `/api/v1/booking` | Crear reserva (integrador) | Bearer |
| `POST` | `/api/v1/booking/{id}/cancel` | Cancelar reserva | Bearer |
| `GET` | `/api/v1/booking/mis-reservas` | Historial de reservas | Bearer |
| `GET` | `/api/v1/booking/disponibilidad` | Disponibilidad de slots | Público |
| `POST` | `/api/v1/review` | Crear reseña | Client |
| `GET` | `/api/v1/review/management` | Panel admin de reseñas | Admin/Partner |
| `GET` | `/api/v1/review/attraction/{attractionId}` | Reseñas de atracción | Público |
| `DELETE` | `/api/v1/review/{id}` | Eliminar reseña | Admin |

---

## 4. Billing Service (`billing-cluster`)

| Controlador | Ruta Backend | Ruta Gateway | Estado |
|---|---|---|---|
| `BillingController` | `api/v1/billing` | `/api/v1/billing/{**catch-all}` | ✅ OK |
| `PaymentController` | `api/v1/payment` | `/api/v1/payment/{**catch-all}` | ✅ OK |

### Endpoints detallados expuestos:

| Método | Ruta completa vía Gateway | Descripción | Auth |
|---|---|---|---|
| `GET` | `/api/v1/billing/management` | Listar facturas (admin) | Admin/Partner/Client |
| `GET` | `/api/v1/billing/my-invoices` | Mis facturas | Bearer |
| `GET` | `/api/v1/billing/management/{id}` | Detalle de factura | Admin/Partner/Client |
| `POST` | `/api/v1/billing/invoice` | Crear factura | Admin/Partner/Client |
| `POST` | `/api/v1/billing/management/{id}/void` | Anular factura | Admin/Partner/Client |
| `GET` | `/api/v1/payment/booking/{bookingId}` | Pagos de una reserva | Bearer |
| `GET` | `/api/v1/payment/{id}` | Detalle de pago | Bearer |
| `POST` | `/api/v1/payment` | Crear pago | Bearer |
| `PUT` | `/api/v1/payment/{id}/status` | Actualizar estado de pago | Bearer |
| `POST` | `/api/v1/payment/{id}/refund` | Reembolso | Admin/Partner |

---

## Resumen de la Auditoría

| Microservicio | Controladores | Rutas en Gateway | Estado |
|---|---|---|---|
| **Identity** | 3 | 3 | ✅ Completo |
| **Catalog** | 9 | 9 | ✅ Completo |
| **Booking** | 3 | 3 | ✅ Completo |
| **Billing** | 2 | 2 | ✅ Completo |
| **TOTAL** | **17 controladores** | **17 rutas** | ✅ **100% cubierto** |

> **Conclusión:** Tras la corrección del Gateway, los 17 controladores del backend están correctamente mapeados. El frontend Angular podrá consumir los **48+ endpoints** del sistema sin problemas a través de la URL base del Gateway.
