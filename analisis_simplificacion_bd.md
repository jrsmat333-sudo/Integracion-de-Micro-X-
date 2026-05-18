# 📉 Análisis y Simplificación de Bases de Datos

De acuerdo a tu solicitud, he analizado detalladamente el script `sql_dividido.sql` y el código actual para identificar qué tablas y atributos agregan complejidad innecesaria y pueden ser eliminados **sin romper el contrato OpenAPI (`atracciones-api.yaml`)**.

---

## 1. Análisis de `DB_IDENTITY` (Atributos Fantasma)

Revisé el código fuente (Controladores y Servicios) para ver si los atributos adicionales definidos en las entidades C# (`User.cs`, `Client.cs`) realmente tenían alguna lógica o funcionalidad programada.

**Resultado del análisis en el código C#:**
*   **`EmailVerified`:** Solo está definido como un *booleano*. **No hay** ninguna lógica en el código para enviar correos, generar códigos de verificación ni endpoints para validar correos. Simplemente está "puesto ahí".
*   **`RefreshToken`:** Solo está definido. El método `GenerateTokenResponse` solo devuelve un *Access Token* y no genera ni guarda ningún Refresh Token en la base de datos.
*   **`LastLoginAt`:** El método `LoginAsync` de `AuthService` valida la contraseña y genera el token, pero **nunca** actualiza este campo.
*   **`DeletedAt` (Soft Delete):** El código no tiene implementada la lógica global para filtrar los registros "borrados lógicamente" en las consultas.

### Sugerencias de Acción para C# (`DB_IDENTITY`):
**Recomendación principal:** En lugar de agregar estas columnas a la base de datos, te recomiendo **BORRARLAS de las clases en C#**.

*   **Bórralos del código (`User.cs`, `Client.cs`, `BaseEntity.cs`):**
    *   `EmailVerified`, `RefreshToken`, `LastLoginAt`, `DeletedAt`, `BirthDate`, `Nationality`, `AvatarUrl`, `PreferredLang`.
*   **Consérvalos e inclúyelos en tu base de datos (`Client.cs`):**
    *   `DocumentNumber` y `DocumentType`. 
    *   *¿Por qué conservarlos?* Porque el contrato YAML expone un endpoint `/client/validate/{docNumber}` y el esquema `ClientDto` devuelve explícitamente el `documentNumber`. Si los borras, romperás esa parte del contrato.

---

## 2. Simplificación de `DB_CATALOG`

Esta es la base de datos más sobrecargada. Está diseñada para un sistema multilingüe, con audio guías, itinerarios y jerarquías profundas, lo cual es excesivo para lo que pide tu contrato YAML (`AtraccionDto` solo pide id, nombre, descripción, precio, ubicación, imagen).

### Tablas a BORRAR COMPLETAMENTE:
Al borrar estas tablas, tu sistema será mucho más limpio y no afectará en absoluto tu contrato REST actual.
1.  **Tablas de Traducción (Multilingüe):** `language`, `category_translation`, `subcategory_translation`, `attraction_translation`, `product_translation`.
2.  **Tablas de Agrupación Visual:** `category`, `subcategory`, `tag`, `attraction_tag`. (El contrato YAML solo hace búsquedas por texto y ubicación, no por categorías).

3.  **Tablas de Experiencia:** `inclusion_item`, `attraction_inclusion`, `attraction_language`, `tour_itinerary`, `tour_stop`, `audio_guide`.


4.  **Tablas de Auditoría/Medios complejos:** `catalog_audit_log`, `media_type`, `attraction_media` (puedes reemplazar `attraction_media` simplemente agregando una columna `imagen_url` directamente a la tabla `attraction`).

### Tablas que DEBES CONSERVAR:
*   `attraction` (El núcleo. Se le debe agregar `descripcion`, `imagen_url` y `ubicacion_texto` para que cumpla con el DTO).
*   `product_option` y `price_tier` (Aquí están los precios).
*   `ticket_category` (Define si es "Adulto", "Niño", etc.).

> **⚠️ Impacto sobre `DB_BOOKING`:**
> Has mencionado que no deseas cambiar `DB_BOOKING`. Por esta razón, **debemos mantener obligatoriamente la tabla `product_option`** en Catalog. La tabla `availability_slot` de Booking depende estrictamente de un `product_id`. Si borráramos los productos, Booking se rompería.

---

## 3. Estructura Final Recomendada (Las 4 Bases de Datos)

Si aplicas las sugerencias de simplificación, así quedarán tus bases de datos. Ninguno de estos cambios afecta los endpoints definidos en tu YAML.

### 🏛️ 1. DB_IDENTITY (Se ajustó el C# para que coincida con la BD)
*Se queda igual que en tu script original, solo agregamos los campos de documento que exige el YAML.*
*   `role`
*   `users`
*   `user_role`
*   `client` *(Se le debe agregar `document_type` y `document_number`)*
*   `identity_audit_log` (Opcional, si deseas puedes borrarlo).



### 🎡 2. DB_CATALOG (Simplificada al máximo)
*Se eliminaron 18 tablas innecesarias.*
*   `attraction` *(Campos recomendados: id, slug, name, description, image_url, location_name, is_active)*
*   `ticket_category` *(Tipos de boletos: Adulto, Niño)*
*   `product_option` *(Para enlazar con Booking)*
*   `price_tier` *(Precios por cada tipo de boleto)*

### 📅 3. DB_BOOKING (Sin cambios)
*Mantiene su estructura intacta para no romper la lógica de inventario.*
*   `booking_status`
*   `availability_slot` *(Se conecta al `product_option` de Catalog mediante UUID)*
*   `booking`
*   `booking_detail`
*   `review`, `review_criteria`, `review_rating`, `review_media` (Opcionales, pero no afectan).

### 💳 4. DB_BILLING (Sin cambios)
*Mantiene su estructura intacta.*
*   `payment_status_type`
*   `payment_method_type`
*   `payment`
*   `invoice`
*   `invoice_detail`

---

---

### ¿Cómo proceder?
Si estás de acuerdo con esta arquitectura simplificada:
1. Yo me encargaré de borrar los atributos innecesarios directamente en tus clases de C# en el microservicio Identify.
2. Para el microservicio Catalog, tú puedes limpiar tu base de datos en Supabase borrando las tablas que mencioné.
3. Luego, adaptaremos los Controladores y Servicios de Catalog para que dejen de usar esas tablas eliminadas y se alineen a la nueva estructura simple.

---

## 🙋‍♂️ 4. Respuestas a tus Dudas sobre Atributos Específicos

### 1. ¿Qué es y para qué sirve `location_id` en la tabla `client` (DB_IDENTITY)?
* **¿A qué se refiere?** Representa la ubicación física o de residencia del cliente (ciudad, estado o país).
* **¿Tiene utilidad en el código?** **Sí, tiene una utilidad lógica.** Se utiliza al actualizar el perfil del cliente (`ActualizarClienteRequest`), en el mapeo de negocio (`ClienteBusinessMapper.cs`), y está expuesto en el modelo `ClientNode.cs`. 
* **¿Debería ser borrado?** **No te recomiendo borrarlo.** Aunque a nivel físico no tenga una clave foránea rígida (`FOREIGN KEY`) hacia la tabla `locations` de `DB_CATALOG` (lo cual es normal en microservicios para mantener el desacoplamiento), sirve para almacenar a nivel lógico la ubicación del cliente de forma opcional (`Guid?`). Borrarlo rompería la coherencia con los DTOs de actualización de perfil y los contratos que esperan recibir o actualizar esta información en el perfil del cliente.

---

### 2. ¿Qué utilidad tienen `reset_password_token` y `reset_password_expiry` en `users`?
* **¿Para qué sirven?** Se utilizan para el flujo de **"Olvidé mi contraseña"** / Recuperación de credenciales.
  1. Cuando un usuario solicita restablecer su contraseña, el sistema genera un token seguro único (`reset_password_token`) y le asigna una fecha y hora límite de validez (`reset_password_expiry`, configurada para 2 horas en el código).
  2. Cuando el usuario envía su nueva contraseña junto con el token, el sistema valida que el token coincida y que no haya expirado para poder efectuar el cambio.
* **¿Tienen utilidad en el código?** **Sí, son 100% funcionales y críticos.** A diferencia de los otros campos fantasma que borramos, estos dos atributos están implementados activamente en:
  * `AuthService.cs` (dentro del método `ResetPasswordAsync`).
  * `AuthController.cs` (en el endpoint expuesto `/api/v1/Auth/reset-password`).
* **¿Debería borrarlos?** **No, no los borres.** Si los eliminas, romperás por completo la funcionalidad de recuperación de contraseñas del microservicio de autenticación, la cual es una característica estándar y necesaria.

---

### 3. ¿Son necesarias o útiles las nuevas columnas agregadas a `category`, `subcategory` y `locations`?

¡Sí, son sumamente útiles e indispensables para controlar la interfaz de usuario (Frontend) de una aplicación real! A continuación, se detalla la utilidad de cada una:

#### 📊 `is_active` (Category y Subcategory)
* **Utilidad:** Permite habilitar o deshabilitar categorías y subcategorías desde un panel administrativo de manera temporal.
* **¿Por qué es indispensable?** Si decides pausar temporalmente la categoría "Parques Acuáticos" (por ejemplo, en temporada de invierno), puedes simplemente actualizar `is_active = FALSE`. Si no tuvieras esta columna y quisieras ocultar la categoría, tendrías que **borrar el registro físicamente**, lo cual por restricciones de clave foránea (`ON DELETE CASCADE`) **borraría también todas las atracciones asociadas** a ella. `is_active` te evita esta pérdida masiva de datos.

#### 🔀 `sort_order` (Category y Subcategory)
* **Utilidad:** Controla en qué orden se listan las categorías y subcategorías en la interfaz del cliente (ej. que "Más Populares" salga primero, y "Otros" al final).
* **¿Por qué es útil?** Sin este campo, la base de datos las ordenaría de forma aleatoria (según se insertaron) o alfabética. Este campo le da al administrador total control del orden visual de la aplicación.

#### 🗺️ `country_code` (Locations)
* **Utilidad:** Almacena el código estándar de país (ej. "ES" para España, "MX" para México, "CO" para Colombia).
* **¿Por qué es útil?** Facilita la carga de banderas en el frontend, búsquedas rápidas agrupadas por país y estandarización internacional de direcciones de manera sumamente simple.

---

### 4. ¿Para qué sirve `icon_url` en `subcategory`? ¿Habrá fallas o problemas si no le pongo un icono?

* **¿Para qué sirve?** Sirve para almacenar el enlace (URL) o el nombre de un icono representativo de esa subcategoría en particular (ej. un icono de "bota de senderismo" para senderismo, o una "montaña" para escalada).
* **¿Dará problemas o fallas si se deja vacío (en NULL)?** **No, en lo absoluto. No causará ninguna falla en el código.**
  * En la base de datos, la columna `icon_url TEXT` acepta valores nulos de forma predeterminada (no tiene restricción `NOT NULL`).
  * En el código de C#, la propiedad está definida de forma segura como `string? IconUrl` (el signo `?` indica que acepta nulos de forma nativa).
  * Si no le colocas ningún valor a la subcategoría, el backend devolverá `"iconUrl": null` en la respuesta JSON del API de forma segura. El frontend simplemente mostrará un icono por defecto si detecta que este campo viene vacío.


