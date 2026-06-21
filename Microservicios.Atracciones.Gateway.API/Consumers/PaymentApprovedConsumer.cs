using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microservicios.Atracciones.Gateway.API.Realtime;
using Microservicios.Atracciones.Shared.Contracts.Events;

namespace Microservicios.Atracciones.Gateway.API.Consumers;

/// <summary>
/// Consume <see cref="PaymentApprovedEvent"/> (publicado por Billing tras facturar) y avisa por
/// SignalR SOLO al cliente que reservó, vía el grupo del CorrelationId → <c>OnPaymentApproved</c>.
/// Es la señal final del flujo en tiempo real ("¡Reserva Confirmada!").
/// </summary>
public class PaymentApprovedConsumer : IConsumer<PaymentApprovedEvent>
{
    private readonly IHubContext<NotificationsHub> _hub;
    private readonly ILogger<PaymentApprovedConsumer> _logger;

    public PaymentApprovedConsumer(IHubContext<NotificationsHub> hub, ILogger<PaymentApprovedConsumer> logger)
    {
        _hub = hub;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentApprovedEvent> context)
    {
        var m = context.Message;

        await _hub.Clients.Group(m.CorrelationId).SendAsync("OnPaymentApproved", new
        {
            m.BookingId,
            m.TotalAmount,
            m.CurrencyCode,
            m.CorrelationId
        }, context.CancellationToken);

        _logger.LogInformation("OnPaymentApproved → grupo {CorrelationId} (BookingId={BookingId})", m.CorrelationId, m.BookingId);
    }
}
