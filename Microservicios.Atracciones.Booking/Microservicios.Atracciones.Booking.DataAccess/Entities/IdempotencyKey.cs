namespace Microservicios.Atracciones.Booking.DataAccess.Entities;

/// <summary>
/// Almacena la respuesta de una operación POST idempotente (Booking v2) indexada por la
/// cabecera <c>X-Idempotency-Key</c>. Si el cliente reintenta con la MISMA clave, se
/// devuelve la respuesta cacheada sin volver a crear la reserva.
///
/// NOTA IMPORTANTE: la tabla "IdempotencyKeys" se creó manualmente en Supabase con
/// nombres de columna PascalCase EXACTOS (Key, BookingId, ResponseJson, CreatedAtUtc).
/// En PostgreSQL los identificadores entre comillas distinguen mayúsculas/minúsculas,
/// por eso esta entidad se EXCLUYE de la convención snake_case del DbContext
/// (ver AtraccionDbContext.OnModelCreating) y se mapea explícitamente en
/// IdempotencyKeyConfiguration.
/// </summary>
public class IdempotencyKey
{
    /// <summary>Valor de la cabecera X-Idempotency-Key. Clave primaria.</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Id de la reserva creada en la primera ejecución.</summary>
    public Guid BookingId { get; set; }

    /// <summary>Respuesta serializada (ApiResponse&lt;AtraccionBookingResponseDto&gt;) que se devuelve tal cual al reintentar.</summary>
    public string ResponseJson { get; set; } = string.Empty;

    /// <summary>Fecha/hora UTC de creación del registro.</summary>
    public DateTime CreatedAtUtc { get; set; }
}
