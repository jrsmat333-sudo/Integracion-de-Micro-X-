using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microservicios.Atracciones.Catalog.DataAccess.Entities;

namespace Microservicios.Atracciones.Catalog.DataAccess.Configurations;

public class TicketCategoryConfiguration : IEntityTypeConfiguration<TicketCategory>
{
    public void Configure(EntityTypeBuilder<TicketCategory> builder)
    {
        builder.ToTable("TicketCategory");
        builder.HasKey(tc => tc.Id);
        builder.Property(tc => tc.Name).HasMaxLength(50).IsRequired();
        builder.Property(tc => tc.NameEn).HasMaxLength(50);

        builder.HasData(
            new TicketCategory { Id = Guid.Parse("A1B2C3D4-E5F6-4A1B-8C9D-0E1F2A3B4C5D"), Name = "Adulto", NameEn = "Adult", AgeRangeMin = 13, SortOrder = 1 },
            new TicketCategory { Id = Guid.Parse("B2C3D4E5-F6A1-4B2C-9D0E-1F2A3B4C5D6E"), Name = "Niño", NameEn = "Child", AgeRangeMin = 5, AgeRangeMax = 12, SortOrder = 2 },
            new TicketCategory { Id = Guid.Parse("C3D4E5F6-A1B2-4C3D-0E1F-2A3B4C5D6E7F"), Name = "Bebé", NameEn = "Infant", AgeRangeMax = 4, SortOrder = 3 },
            new TicketCategory { Id = Guid.Parse("D4E5F6A1-B2C3-4D4E-1F2A-3B4C5D6E7F8A"), Name = "Senior", NameEn = "Senior", AgeRangeMin = 65, SortOrder = 4 }
        );
    }
}

public class ProductOptionConfiguration : IEntityTypeConfiguration<ProductOption>
{
    public void Configure(EntityTypeBuilder<ProductOption> builder)
    {
        builder.ToTable("ProductOption");
        builder.HasKey(p => p.Id);
        builder.HasIndex(p => new { p.AttractionId, p.Slug }).IsUnique();
        builder.Property(p => p.Title).HasMaxLength(150).IsRequired();
        builder.Property(p => p.Slug).HasMaxLength(150).IsRequired();
        builder.Property(p => p.DurationDescription).HasMaxLength(100);
        builder.Property(p => p.CancelPolicyHours).HasDefaultValue(24);
        builder.Property(p => p.MinParticipants).HasDefaultValue((short)1);
        builder.Property(p => p.IsActive).HasDefaultValue(true);
        builder.Property(p => p.IsPrivate).HasDefaultValue(false);
        builder.Property(p => p.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasMany(p => p.PriceTiers)
               .WithOne(pt => pt.ProductOption)
               .HasForeignKey(pt => pt.ProductId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
