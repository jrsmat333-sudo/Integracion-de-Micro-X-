using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microservicios.Atracciones.Booking.Business.DTOs.Booking;
using Microservicios.Atracciones.Booking.Business.Interfaces;
using Microservicios.Atracciones.Booking.DataAccess.Repositories.Interfaces;
using Microservicios.Atracciones.Booking.DataManagement.Interfaces;
using Microservicios.Atracciones.Shared.Contracts.Events;
using MassTransit;
using System.Text.Json;

namespace Microservicios.Atracciones.Booking.Business.Services;

/// <summary>
/// Implementación del servicio de integración con el sistema central de Booking.
/// Convierte los datos internos de la plataforma de atracciones al formato estándar del contrato.
/// </summary>
public class BookingIntegrationService : IBookingIntegrationService
{
    private readonly IInventoryDataService _inventoryData;
    private readonly IUnitOfWork _uow;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BookingIntegrationService> _logger;
    private readonly Microservicios.Atracciones.Shared.gRPC.CatalogService.CatalogServiceClient _catalogClient;
    private readonly IPublishEndpoint _publishEndpoint;

    // Opciones de (de)serialización del cuerpo cacheado para idempotencia. Case-insensitive
    // para que el round-trip JSON funcione sin importar el casing en el que se guardó.
    private static readonly JsonSerializerOptions _idempotencyJson = new() { PropertyNameCaseInsensitive = true };

    public BookingIntegrationService(
        IInventoryDataService inventoryData,
        IUnitOfWork uow,
        IConfiguration configuration,
        ILogger<BookingIntegrationService> logger,
        Microservicios.Atracciones.Shared.gRPC.CatalogService.CatalogServiceClient catalogClient,
        IPublishEndpoint publishEndpoint)
    {
        _inventoryData = inventoryData;
        _uow = uow;
        _configuration = configuration;
        _logger = logger;
        _catalogClient = catalogClient;
        _publishEndpoint = publishEndpoint;
    }

    // ══════════════════════════════════════════════════
    // DISPONIBILIDAD AGRUPADA POR DÍA
    // ══════════════════════════════════════════════════

    public async Task<ApiResponse<List<DisponibilidadDiariaDto>>> ObtenerDisponibilidadAsync(Guid attractionId, DateOnly? fecha = null, Guid? productOptionId = null)
    {
        var fechaInicio = fecha ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var fechaFin = fecha.HasValue
            ? fecha.Value
            : DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30));

        // Slots are stored with ProductId = productOptionId; filter by it when provided.
        var filterId = productOptionId ?? attractionId;

        var slots = await _uow.AvailabilitySlots.Query()
            .Where(s =>
                s.ProductId == filterId &&
                s.IsActive &&
                s.SlotDate >= fechaInicio &&
                s.SlotDate <= fechaFin &&
                s.CapacityAvailable > 0)
            .OrderBy(s => s.SlotDate)
            .ThenBy(s => s.StartTime)
            .ToListAsync();

        var disponibilidadPorDia = slots
            .GroupBy(s => s.SlotDate)
            .Select(g => new DisponibilidadDiariaDto
            {
                Fecha = g.Key.ToString("yyyy-MM-dd"),
                CuposDisponibles = g.Sum(s => s.CapacityAvailable),
                Horarios = g.Select(s => new HorarioDto
                {
                    SlotId = s.Id,
                    HoraInicio = s.StartTime.ToString(@"HH\:mm"),
                    HoraFin = s.EndTime?.ToString(@"HH\:mm"),
                    CuposDisponibles = s.CapacityAvailable,
                    CuposTotales = s.CapacityTotal
                }).ToList()
            })
            .ToList();

        return ApiResponse<List<DisponibilidadDiariaDto>>.Ok(disponibilidadPorDia);
    }

    // ══════════════════════════════════════════════════
    // TRANSACCIONES: CREAR RESERVA
    // ══════════════════════════════════════════════════

    public async Task<ApiResponse<AtraccionBookingResponseDto>> CrearReservaAsync(AtraccionBookingRequestDto request, Guid? userId, string? idempotencyKey = null)
    {
        // Resolver userId: si no hay JWT, generar un UUID como usuario invitado
        var resolvedUserId = userId ?? Guid.NewGuid();

        var slot = await _uow.AvailabilitySlots.Query(false)
            .FirstOrDefaultAsync(s => s.Id == request.SlotId && s.IsActive);

        if (slot == null)
            return ApiResponse<AtraccionBookingResponseDto>.Fail("El horario seleccionado ya no está disponible.");

        int totalTickets = request.Tickets!.Count;
        if (slot.CapacityAvailable < totalTickets)
            return ApiResponse<AtraccionBookingResponseDto>.Fail($"No hay cupos suficientes. Cupos restantes: {slot.CapacityAvailable}");

        // Llamada gRPC a Catálogo Microservice para validar precios y nombres
        var grpcRequest = new Microservicios.Atracciones.Shared.gRPC.ValidateBookingRequest
        {
            AttractionId = request.AttractionId.ToString(),
            ProductOptionId = slot.ProductId.ToString()
        };

        var distinctPriceTiers = request.Tickets
            .Where(t => t.PriceTierId.HasValue)
            .Select(t => t.PriceTierId.Value.ToString())
            .Distinct();
        grpcRequest.PriceTierIds.AddRange(distinctPriceTiers);

        var grpcResponse = await _catalogClient.ValidateBookingDataAsync(grpcRequest);
        if (!grpcResponse.IsValid)
            return ApiResponse<AtraccionBookingResponseDto>.Fail($"Error validando datos en Catálogo: {grpcResponse.ErrorMessage}");

        request.AttractionName = grpcResponse.AttractionName;
        request.ProductTitle = grpcResponse.ProductTitle;
        string currency = grpcResponse.CurrencyCode;
        decimal totalAmount = 0;
        var details = new List<DataAccess.Entities.BookingDetail>();

        foreach (var t in request.Tickets)
        {
            // Match exacto por id (flujo del frontend). Si falla, tomamos el primer tier
            // oficial devuelto por gRPC: caso integrador externo que envía product.id como
            // priceTierId — el gRPC ya hizo el fallback al tier más barato del producto.
            var officialTier =
                grpcResponse.PriceTiers.FirstOrDefault(pt => pt.PriceTierId == t.PriceTierId?.ToString())
                ?? grpcResponse.PriceTiers.FirstOrDefault();

            if (officialTier == null)
                return ApiResponse<AtraccionBookingResponseDto>.Fail($"La categoría de precio {t.PriceTierId} ya no está disponible.");

            // Sustituimos el priceTierId del ticket por el OFICIAL devuelto por gRPC para
            // mantener integridad referencial en BookingDetail (evita guardar product.id en PriceTierId).
            if (Guid.TryParse(officialTier.PriceTierId, out Guid officialTierGuid))
            {
                t.PriceTierId = officialTierGuid;
            }

            t.PriceTierLabel = officialTier.Label;
            t.UnitPrice = (decimal)officialTier.Price; // Sobrescribimos el precio del request con el oficial de gRPC
            totalAmount += t.UnitPrice;

            details.Add(new DataAccess.Entities.BookingDetail
            {
                Id = Guid.NewGuid(),
                ProductOptionId = request.ProductOptionId,
                PriceTierId = t.PriceTierId ?? Guid.Empty,
                FirstName = t.FirstName,
                LastName = t.LastName,
                DocumentNumber = t.DocumentNumber,
                DocumentType = t.DocumentType,
                Quantity = 1,
                UnitPrice = t.UnitPrice,
                CurrencyCode = currency,
                AttractionNameSnapshot = request.AttractionName ?? "Attraction",
                OptionNameSnapshot = request.ProductTitle ?? "Option",
                TierNameSnapshot = t.PriceTierLabel ?? "Ticket"
            });
        }

        decimal taxRate = 0.15m;
        try {
            var configValue = _configuration["Billing:TaxRate"];
            if (!string.IsNullOrEmpty(configValue)) {
                taxRate = decimal.Parse(configValue, System.Globalization.CultureInfo.InvariantCulture);
            }
        } catch { }

        totalAmount = totalAmount * (1 + taxRate);

        var booking = new DataAccess.Entities.Booking
        {
            Id = Guid.NewGuid(),
            PnrCode = GeneratePnrCode(),
            UserId = resolvedUserId,
            AttractionId = request.AttractionId,
            SlotId = slot.Id,
            StatusId = 2, // Confirmed
            TotalAmount = Math.Round(totalAmount, 2),
            CurrencyCode = currency,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            await _uow.Bookings.AddAsync(booking);

            foreach (var detail in details)
            {
                detail.BookingId = booking.Id;
                await _uow.BookingDetails.AddAsync(detail);
            }

            slot.CapacityAvailable -= (short)totalTickets;
            slot.UpdatedAt = DateTime.UtcNow;

            // Construimos la respuesta ANTES de confirmar para poder persistirla junto con la
            // reserva cuando la operación es idempotente (v2), garantizando consistencia.
            var response = ApiResponse<AtraccionBookingResponseDto>.Ok(new AtraccionBookingResponseDto
            {
                BookingId = booking.Id,
                PnrCode = booking.PnrCode,
                Status = "Confirmed",
                TotalAmount = totalAmount,
                Currency = booking.CurrencyCode,
                ActivityDate = slot.SlotDate.ToDateTime(slot.StartTime),
                AttractionName = request.AttractionName ?? "Attraction"
            }, "Reserva creada exitosamente.");

            // Idempotencia (v2): guardamos la clave + la respuesta serializada en la MISMA
            // transacción que la reserva. Si dos peticiones concurrentes usan la misma clave,
            // la PK única hace que la segunda falle al confirmar y se revierta TODA la
            // transacción (no se crea una reserva huérfana).
            if (!string.IsNullOrWhiteSpace(idempotencyKey))
            {
                await _uow.IdempotencyKeys.AddAsync(new DataAccess.Entities.IdempotencyKey
                {
                    Key = idempotencyKey,
                    BookingId = booking.Id,
                    ResponseJson = JsonSerializer.Serialize(response, _idempotencyJson),
                    CreatedAtUtc = DateTime.UtcNow
                });
            }

            await _uow.CompleteAsync();

            // Event Bus: publicamos BookingCreatedEvent para que Billing genere la factura
            // de forma ASÍNCRONA (reemplaza la antigua llamada gRPC síncrona). La reserva ya
            // está confirmada; si el broker fallara, solo registramos el error sin tumbar la
            // reserva (la factura podrá regenerarse). El CorrelationId reutiliza la clave de
            // idempotencia (o el BookingId en el flujo v1 legacy) para el aviso SignalR (Fase 3).
            try
            {
                var correlationId = string.IsNullOrWhiteSpace(idempotencyKey)
                    ? booking.Id.ToString()
                    : idempotencyKey;

                decimal taxRatePercent = taxRate * 100;

                await _publishEndpoint.Publish(new BookingCreatedEvent(
                    booking.Id,
                    resolvedUserId,
                    correlationId,
                    currency,
                    booking.TotalAmount,
                    taxRatePercent,
                    new BillingInfoDto(
                        request.Billing?.CustomerName,
                        request.Billing?.TaxId,
                        request.Billing?.Email,
                        request.Billing?.Address),
                    details.Select(d => new InvoiceLineDto(
                        $"{d.TierNameSnapshot} - {d.AttractionNameSnapshot}",
                        d.Quantity,
                        d.UnitPrice,
                        taxRatePercent)).ToList(),
                    DateTime.UtcNow));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "No se pudo publicar BookingCreatedEvent para BookingId {BookingId}", booking.Id);
            }

            return response;
        }
        catch (Exception ex)
        {
            var errorMsg = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
            return ApiResponse<AtraccionBookingResponseDto>.Fail("Error interno al procesar la reserva: " + errorMsg);
        }
    }

    // ══════════════════════════════════════════════════
    // TRANSACCIONES: CREAR RESERVA IDEMPOTENTE (v2)
    // ══════════════════════════════════════════════════

    public async Task<ApiResponse<AtraccionBookingResponseDto>> CrearReservaIdempotenteAsync(
        AtraccionBookingRequestDto request, Guid? userId, string idempotencyKey)
    {
        // 1. ¿La clave ya fue procesada? → devolvemos la respuesta cacheada tal cual,
        //    sin crear otra reserva.
        var existing = await _uow.IdempotencyKeys.Query()
            .FirstOrDefaultAsync(k => k.Key == idempotencyKey);

        if (existing != null)
        {
            var cached = JsonSerializer.Deserialize<ApiResponse<AtraccionBookingResponseDto>>(
                existing.ResponseJson, _idempotencyJson);

            if (cached != null)
                return cached;

            // Defensa: si el JSON cacheado no se puede deserializar, devolvemos al menos el BookingId.
            return ApiResponse<AtraccionBookingResponseDto>.Ok(
                new AtraccionBookingResponseDto { BookingId = existing.BookingId, Status = "Confirmed" },
                "Reserva ya procesada (idempotente).");
        }

        // 2. Primera vez para esta clave → flujo normal, pasando la clave para que se
        //    persista en la misma transacción que la reserva.
        return await CrearReservaAsync(request, userId, idempotencyKey);
    }

    public async Task<ApiResponse<bool>> CancelarReservaAsync(Guid bookingId, Guid? userId = null)
    {
        var booking = await _uow.Bookings.Query(false)
            .Include(b => b.AvailabilitySlot)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null)
            return ApiResponse<bool>.Fail("Reserva no encontrada.");

        if (booking.StatusId == 4)
            return ApiResponse<bool>.Fail("La reserva ya se encuentra cancelada.");

        if (booking.StatusId == 3)
            return ApiResponse<bool>.Fail("No se puede cancelar una reserva que ya ha sido completada.");

        booking.StatusId = 4;
        booking.CancelledAt = DateTime.UtcNow;
        booking.UpdatedAt = DateTime.UtcNow;

        var totalTickets = await _uow.BookingDetails.Query()
            .Where(d => d.BookingId == bookingId)
            .SumAsync(d => d.Quantity);
        booking.AvailabilitySlot.CapacityAvailable += (short)totalTickets;
        booking.AvailabilitySlot.UpdatedAt = DateTime.UtcNow;

        await _uow.CompleteAsync();

        return ApiResponse<bool>.Ok(true, "Reserva cancelada y cupos liberados.");
    }

    public async Task<ApiResponse<List<AtraccionBookingResponseDto>>> ListarMisReservasAsync(Guid userId)
    {
        var bookings = await _uow.Bookings.Query()
            .Include(b => b.AvailabilitySlot)
            .Include(b => b.Details)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        var dtos = bookings.Select(b => new AtraccionBookingResponseDto
        {
            BookingId = b.Id,
            PnrCode = b.PnrCode,
            Status = b.StatusId switch { 1 => "Pending", 2 => "Confirmed", 3 => "Completed", 4 => "Cancelled", _ => "Unknown" },
            TotalAmount = b.TotalAmount,
            Currency = b.CurrencyCode,
            ActivityDate = b.AvailabilitySlot.SlotDate.ToDateTime(b.AvailabilitySlot.StartTime),
            AttractionName = b.Details.FirstOrDefault()?.AttractionNameSnapshot ?? "Attraction"
        }).ToList();

        return ApiResponse<List<AtraccionBookingResponseDto>>.Ok(dtos);
    }

    private string GeneratePnrCode()
    {
        return Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();
    }
}
