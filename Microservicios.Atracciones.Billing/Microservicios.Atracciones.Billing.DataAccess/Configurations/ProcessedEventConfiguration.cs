using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microservicios.Atracciones.Billing.DataAccess.Entities;

namespace Microservicios.Atracciones.Billing.DataAccess.Configurations;

/// <summary>
/// Mapeo EF de <see cref="ProcessedEvent"/>. La clave primaria es <c>MessageId</c>
/// (EF no la detecta por convención porque no se llama "Id"/"ProcessedEventId", de ahí el HasKey).
/// El nombre de tabla lo asigna el tableMapping del BillingDbContext ("processed_events") y las
/// columnas las pasa a snake_case el mismo DbContext.
/// </summary>
public class ProcessedEventConfiguration : IEntityTypeConfiguration<ProcessedEvent>
{
    public void Configure(EntityTypeBuilder<ProcessedEvent> builder)
    {
        builder.HasKey(x => x.MessageId);
        builder.Property(x => x.ConsumerType).IsRequired();
        builder.Property(x => x.ProcessedAtUtc).IsRequired();
    }
}
