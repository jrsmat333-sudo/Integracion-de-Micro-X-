using Microservicios.Atracciones.Billing.DataAccess.Entities;

namespace Microservicios.Atracciones.Billing.DataAccess.Repositories.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IPaymentRepository Payments { get; }
    IInvoiceRepository Invoices { get; }
    IInvoiceDetailRepository InvoiceDetails { get; }

    // Idempotencia de mensajería (Event Bus). Usa el repositorio genérico (PK = MessageId).
    IGenericRepository<ProcessedEvent> ProcessedEvents { get; }

    Task<int> CompleteAsync();
}
