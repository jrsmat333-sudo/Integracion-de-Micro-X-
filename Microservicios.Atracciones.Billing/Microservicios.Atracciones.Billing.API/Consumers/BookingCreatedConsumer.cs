using MassTransit;
using Microservicios.Atracciones.Billing.Business.DTOs.Billing;
using Microservicios.Atracciones.Billing.Business.Interfaces;
using Microservicios.Atracciones.Billing.DataAccess.Entities;
using Microservicios.Atracciones.Billing.DataAccess.Repositories.Interfaces;
using Microservicios.Atracciones.Shared.Contracts.Events;

namespace Microservicios.Atracciones.Billing.API.Consumers;

/// <summary>
/// Consume <see cref="BookingCreatedEvent"/> (publicado por Booking) y genera la factura de
/// forma ASÍNCRONA, reutilizando <c>IBillingService.CrearFacturaAsync</c> (la misma lógica que
/// usaba el antiguo gRPC; solo cambia el disparador).
///
/// Tolerancia a fallos:
///  - <b>Idempotencia de mensajería:</b> tabla <c>ProcessedEvents</c> por <c>MessageId</c>.
///    Además, <c>CrearFacturaAsync</c> ya deduplica por <c>BookingId</c> (doble protección).
///  - <b>Reintentos + DLQ:</b> configurados en MassTransit (UseMessageRetry). Si un mensaje
///    falla de forma persistente, MassTransit lo mueve a la cola <c>_error</c> (DLQ).
///
/// Orden de pasos pensado para que un reintento sea seguro: facturar → publicar confirmación →
/// marcar como procesado (commit final). Si algo falla antes del último paso, el reintento
/// re-ejecuta sin duplicar la factura (dedupe por BookingId).
/// </summary>
public class BookingCreatedConsumer : IConsumer<BookingCreatedEvent>
{
    private readonly IBillingService _billingService;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<BookingCreatedConsumer> _logger;

    public BookingCreatedConsumer(
        IBillingService billingService,
        IUnitOfWork uow,
        ILogger<BookingCreatedConsumer> logger)
    {
        _billingService = billingService;
        _uow = uow;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<BookingCreatedEvent> context)
    {
        var msg = context.Message;
        var messageId = context.MessageId ?? Guid.Empty;

        // 1. Idempotencia de mensajería: si ya procesamos este MessageId, ignorar.
        if (messageId != Guid.Empty && await _uow.ProcessedEvents.ExistsAsync(p => p.MessageId == messageId))
        {
            _logger.LogInformation("BookingCreatedEvent {MessageId} ya procesado; se ignora.", messageId);
            return;
        }

        // 2. Generar la factura reutilizando la lógica existente (idempotente por BookingId).
        var invoiceRequest = new CreateInvoiceRequest
        {
            BookingId = msg.BookingId,
            UserId = msg.UserId,
            CustomerName = string.IsNullOrWhiteSpace(msg.Billing?.CustomerName) ? "Invitado" : msg.Billing!.CustomerName!,
            TaxId = msg.Billing?.TaxId ?? string.Empty,
            Email = string.IsNullOrEmpty(msg.Billing?.Email) ? null : msg.Billing!.Email,
            Address = string.IsNullOrEmpty(msg.Billing?.Address) ? null : msg.Billing!.Address,
            CurrencyCode = string.IsNullOrEmpty(msg.CurrencyCode) ? "USD" : msg.CurrencyCode,
            Details = msg.Lines.Select(l => new CreateInvoiceDetailRequest
            {
                Description = l.Description,
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                TaxRate = l.TaxRate
            }).ToList()
        };

        await _billingService.CrearFacturaAsync(invoiceRequest);

        // 3. (Fase 2.4) Publicar la confirmación. El Gateway la consumirá en Fase 3 para avisar
        //    al cliente por SignalR. En Fase 2 solo se PUBLICA; aún no hay consumidor.
        await context.Publish(new PaymentApprovedEvent(
            msg.BookingId,
            msg.CorrelationId,
            msg.TotalAmount,
            msg.CurrencyCode,
            DateTime.UtcNow));

        // 4. Marcar el mensaje como procesado (commit final).
        if (messageId != Guid.Empty)
        {
            await _uow.ProcessedEvents.AddAsync(new ProcessedEvent
            {
                MessageId = messageId,
                ConsumerType = nameof(BookingCreatedConsumer),
                ProcessedAtUtc = DateTime.UtcNow
            });
            await _uow.CompleteAsync();
        }

        _logger.LogInformation("Factura generada y PaymentApprovedEvent publicado para BookingId {BookingId}.", msg.BookingId);
    }
}
