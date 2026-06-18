namespace Microservicios.Atracciones.Shared.Contracts.Events;

/// <summary>
/// Evento publicado por Booking cuando una reserva se crea y confirma con éxito.
/// Billing lo consume de forma asíncrona para generar la factura (reemplaza la antigua
/// llamada gRPC síncrona CreateInvoice).
/// </summary>
/// <param name="BookingId">Id de la reserva creada.</param>
/// <param name="UserId">Id del usuario (o invitado) que reservó.</param>
/// <param name="CorrelationId">
/// El <c>X-Idempotency-Key</c> de la reserva (o el BookingId si la reserva vino por v1 legacy).
/// Se reutiliza en Fase 3 para dirigir el aviso SignalR al cliente correcto.
/// </param>
/// <param name="CurrencyCode">Moneda ISO (ej. "USD").</param>
/// <param name="TotalAmount">Total de la reserva (con impuestos), informativo.</param>
/// <param name="TaxRate">Tasa de impuesto en PORCENTAJE (ej. 15.0), coherente con cada línea.</param>
/// <param name="Billing">Datos de facturación del cliente.</param>
/// <param name="Lines">Líneas de la factura (una por ticket).</param>
/// <param name="OccurredOnUtc">Momento de creación de la reserva (UTC).</param>
public record BookingCreatedEvent(
    Guid BookingId,
    Guid UserId,
    string CorrelationId,
    string CurrencyCode,
    decimal TotalAmount,
    decimal TaxRate,
    BillingInfoDto Billing,
    List<InvoiceLineDto> Lines,
    DateTime OccurredOnUtc);

/// <summary>Datos de facturación del cliente (espejo de BillingInfo de Booking).</summary>
public record BillingInfoDto(
    string? CustomerName,
    string? TaxId,
    string? Email,
    string? Address);

/// <summary>
/// Línea de factura. <paramref name="TaxRate"/> va en PORCENTAJE (ej. 15.0), igual que
/// esperaba el antiguo gRPC, para no alterar el cálculo de impuestos existente en Billing.
/// </summary>
public record InvoiceLineDto(
    string Description,
    int Quantity,
    decimal UnitPrice,
    decimal TaxRate);
