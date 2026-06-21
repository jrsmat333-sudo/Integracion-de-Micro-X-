using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microservicios.Atracciones.Gateway.API.Realtime;
using Microservicios.Atracciones.Shared.Contracts.Events;

namespace Microservicios.Atracciones.Gateway.API.Consumers;

/// <summary>
/// Consume <see cref="BookingCreatedEvent"/> (publicado por Booking) y avisa por SignalR SOLO al
/// cliente que reservó, usando el grupo del CorrelationId (= X-Idempotency-Key) → <c>OnBookingConfirmed</c>.
///
/// Nota: Billing también consume este mismo evento (para facturar) en su propia cola; aquí el
/// Gateway tiene su propia cola, así que ambos lo reciben (fan-out por exchange).
/// </summary>
public class BookingConfirmedConsumer : IConsumer<BookingCreatedEvent>
{
    private readonly IHubContext<NotificationsHub> _hub;
    private readonly ILogger<BookingConfirmedConsumer> _logger;

    public BookingConfirmedConsumer(IHubContext<NotificationsHub> hub, ILogger<BookingConfirmedConsumer> logger)
    {
        _hub = hub;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<BookingCreatedEvent> context)
    {
        var m = context.Message;

        await _hub.Clients.Group(m.CorrelationId).SendAsync("OnBookingConfirmed", new
        {
            m.BookingId,
            m.TotalAmount,
            m.CurrencyCode,
            m.CorrelationId
        }, context.CancellationToken);

        _logger.LogInformation("OnBookingConfirmed → grupo {CorrelationId} (BookingId={BookingId})", m.CorrelationId, m.BookingId);
    }
}
