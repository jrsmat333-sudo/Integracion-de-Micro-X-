using Microservicios.Atracciones.Booking.Business.DTOs.Booking;

namespace Microservicios.Atracciones.Booking.Business.Interfaces;

/// <summary>
/// Servicio de integración con el sistema central de Booking.
/// Expone los endpoints del contrato REST público para transacciones de reserva.
/// </summary>
public interface IBookingIntegrationService
{
    /// <summary>
    /// Consulta la disponibilidad de una atracción agrupada por día.
    /// Si se proporciona productOptionId, filtra por esa modalidad específica;
    /// de lo contrario filtra por attractionId (legacy).
    /// </summary>
    Task<ApiResponse<List<DisponibilidadDiariaDto>>> ObtenerDisponibilidadAsync(Guid attractionId, DateOnly? fecha = null, Guid? productOptionId = null);

    // ── Transacciones ─────────────────────────────────────

    /// <summary>
    /// Crea una nueva reserva bloqueando cupos en el inventario.
    /// Si se proporciona <paramref name="idempotencyKey"/>, persiste la clave + la respuesta
    /// en la MISMA transacción que la reserva (para el flujo idempotente v2).
    /// </summary>
    Task<ApiResponse<AtraccionBookingResponseDto>> CrearReservaAsync(AtraccionBookingRequestDto request, Guid? userId, string? idempotencyKey = null);

    /// <summary>
    /// Flujo idempotente de creación de reserva (Booking v2).
    /// Si la <paramref name="idempotencyKey"/> ya existe, devuelve la respuesta cacheada
    /// sin crear otra reserva; en caso contrario, ejecuta <see cref="CrearReservaAsync"/>
    /// y guarda la clave junto con la reserva.
    /// </summary>
    Task<ApiResponse<AtraccionBookingResponseDto>> CrearReservaIdempotenteAsync(AtraccionBookingRequestDto request, Guid? userId, string idempotencyKey);

    /// <summary>
    /// Cancela una reserva existente y libera los cupos.
    /// </summary>
    Task<ApiResponse<bool>> CancelarReservaAsync(Guid bookingId, Guid? userId = null);

    /// <summary>
    /// Lista las reservas realizadas por un usuario.
    /// </summary>
    Task<ApiResponse<List<AtraccionBookingResponseDto>>> ListarMisReservasAsync(Guid userId);
}
