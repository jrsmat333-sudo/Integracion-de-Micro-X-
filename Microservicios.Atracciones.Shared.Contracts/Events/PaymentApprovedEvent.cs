namespace Microservicios.Atracciones.Shared.Contracts.Events;

/// <summary>
/// Evento publicado por Billing cuando termina de generar la factura de una reserva.
/// En Fase 3 el Gateway lo consumirá para avisar en tiempo real (SignalR) al cliente
/// que reservó (usando <paramref name="CorrelationId"/> como grupo).
///
/// NOTA: en Fase 2 solo se PUBLICA; el consumidor (Gateway) se implementa en Fase 3.
/// </summary>
/// <param name="BookingId">Id de la reserva facturada.</param>
/// <param name="CorrelationId">El X-Idempotency-Key original (heredado del BookingCreatedEvent).</param>
/// <param name="TotalAmount">Total facturado.</param>
/// <param name="CurrencyCode">Moneda ISO (ej. "USD").</param>
/// <param name="OccurredOnUtc">Momento de aprobación/facturación (UTC).</param>
public record PaymentApprovedEvent(
    Guid BookingId,
    string CorrelationId,
    decimal TotalAmount,
    string CurrencyCode,
    DateTime OccurredOnUtc);
