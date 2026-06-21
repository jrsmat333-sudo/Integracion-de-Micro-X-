using Microsoft.AspNetCore.SignalR;

namespace Microservicios.Atracciones.Gateway.API.Realtime;

/// <summary>
/// Hub SignalR (WebSocket) que empuja avisos en tiempo real a la app móvil.
/// Mapeado en <c>/hub/notifications</c>.
///
/// Estrategia de grupos por CorrelationId (= X-Idempotency-Key), sin JWT en el socket:
///  1. La app genera el X-Idempotency-Key.
///  2. La app conecta el Hub y llama <see cref="JoinGroup"/>(key) ANTES de hacer el POST de la reserva.
///  3. El Gateway, al consumir BookingCreatedEvent / PaymentApprovedEvent con ese CorrelationId,
///     hace Clients.Group(correlationId).SendAsync(...), llegando solo a quien reservó.
///
/// Métodos que la app escucha (los disparan los consumers del bus):
///  - OnAttractionCreated (broadcast a todos)
///  - OnBookingConfirmed  (solo al grupo del CorrelationId)
///  - OnPaymentApproved   (solo al grupo del CorrelationId)
/// </summary>
public class NotificationsHub : Hub
{
    public Task JoinGroup(string correlationId)
        => Groups.AddToGroupAsync(Context.ConnectionId, correlationId);

    public Task LeaveGroup(string correlationId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, correlationId);
}
