using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microservicios.Atracciones.Booking.DataAccess.Entities;

namespace Microservicios.Atracciones.Booking.DataAccess.Configurations;

/// <summary>
/// Mapeo EF Core de <see cref="IdempotencyKey"/> a la tabla "IdempotencyKeys" creada
/// manualmente en Supabase. Los nombres de tabla y columnas deben coincidir 1:1 con el
/// SQL ejecutado a mano (PascalCase, sensible a mayúsculas en PostgreSQL):
///
///   CREATE TABLE "IdempotencyKeys" (
///       "Key" text PRIMARY KEY,
///       "BookingId" uuid NOT NULL,
///       "ResponseJson" text NOT NULL,
///       "CreatedAtUtc" timestamp with time zone NOT NULL
///   );
///
/// Esta entidad se excluye de la convención snake_case global del DbContext.
/// </summary>
public class IdempotencyKeyConfiguration : IEntityTypeConfiguration<IdempotencyKey>
{
    public void Configure(EntityTypeBuilder<IdempotencyKey> builder)
    {
        builder.ToTable("IdempotencyKeys");

        builder.HasKey(x => x.Key);

        builder.Property(x => x.Key).HasColumnName("Key").IsRequired();
        builder.Property(x => x.BookingId).HasColumnName("BookingId").IsRequired();
        builder.Property(x => x.ResponseJson).HasColumnName("ResponseJson").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("CreatedAtUtc").IsRequired();
    }
}
