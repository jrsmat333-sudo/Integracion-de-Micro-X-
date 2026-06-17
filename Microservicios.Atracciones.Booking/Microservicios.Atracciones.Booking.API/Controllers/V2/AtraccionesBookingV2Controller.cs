using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microservicios.Atracciones.Booking.Business.DTOs.Booking;
using Microservicios.Atracciones.Booking.Business.Interfaces;
using System.Security.Claims;

namespace Microservicios.Atracciones.Booking.API.Controllers.V2;

/// <summary>
/// Versión 2 del contrato de reservas: añade idempotencia HTTP mediante la cabecera
/// <c>X-Idempotency-Key</c>. El camino v1 (<see cref="V1.AtraccionesBookingController"/>)
/// se mantiene intacto y sigue funcionando igual.
/// </summary>
[ApiController]
[Route("api/v2/booking")]
[Authorize]
[Produces("application/json")]
public class AtraccionesBookingV2Controller : ControllerBase
{
    private readonly IBookingIntegrationService _bookingService;

    public AtraccionesBookingV2Controller(IBookingIntegrationService bookingService)
    {
        _bookingService = bookingService;
    }

    /// <summary>
    /// Crea una reserva de forma idempotente.
    /// Requiere la cabecera <c>X-Idempotency-Key</c>:
    ///  - Si falta → 400.
    ///  - Si la clave ya existe → devuelve la respuesta cacheada (mismo bookingId), sin crear otra reserva.
    ///  - Si es nueva → crea la reserva y guarda la clave + respuesta en la misma transacción.
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AtraccionBookingResponseDto>>> CrearReserva(
        [FromBody] AtraccionBookingRequestDto request,
        [FromHeader(Name = "X-Idempotency-Key")] string? idempotencyKey)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            return BadRequest(ApiResponse<AtraccionBookingResponseDto>.Fail("X-Idempotency-Key requerida"));

        request.Normalize();

        var userId = GetUserId();
        var result = await _bookingService.CrearReservaIdempotenteAsync(request, userId, idempotencyKey);

        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    private Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            return null;

        return Guid.TryParse(userIdClaim, out var id) ? id : null;
    }
}
