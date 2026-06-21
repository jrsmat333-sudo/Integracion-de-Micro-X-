using MassTransit;
using Microsoft.Extensions.Logging;
using Microservicios.Atracciones.Shared.Contracts.Events;
using Microservicios.Atracciones.Booking.DataManagement.Interfaces;

namespace Microservicios.Atracciones.Booking.API.Consumers;

public class PaymentApprovedConsumer : IConsumer<PaymentApprovedEvent>
{
    private readonly IBookingDataService _bookingDataService;
    private readonly ILogger<PaymentApprovedConsumer> _logger;

    public PaymentApprovedConsumer(
        IBookingDataService bookingDataService,
        ILogger<PaymentApprovedConsumer> logger)
    {
        _bookingDataService = bookingDataService;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentApprovedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Consumiendo PaymentApprovedEvent para BookingId {BookingId}.", msg.BookingId);

        var booking = await _bookingDataService.GetByIdAsync(msg.BookingId);
        if (booking == null)
        {
            _logger.LogWarning("No se encontró la reserva {BookingId} asociada al pago aprobado.", msg.BookingId);
            return;
        }

        if (booking.StatusId == 1) // Pending
        {
            await _bookingDataService.UpdateBookingStatusAsync(msg.BookingId, 2); // 2 = Confirmed
            _logger.LogInformation("Reserva {BookingId} actualizada a estado Confirmed (2).", msg.BookingId);
        }
        else
        {
            _logger.LogInformation("Reserva {BookingId} ignorada porque su estado actual es {StatusId}.", msg.BookingId, booking.StatusId);
        }
    }
}
