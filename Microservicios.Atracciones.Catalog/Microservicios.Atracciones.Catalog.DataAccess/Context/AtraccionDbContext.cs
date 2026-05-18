using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microservicios.Atracciones.Catalog.DataAccess.Common;
using Microservicios.Atracciones.Catalog.DataAccess.Entities;
using System.Text.Json;

namespace Microservicios.Atracciones.Catalog.DataAccess.Context;

public class AtraccionDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public AtraccionDbContext(
        DbContextOptions<AtraccionDbContext> options,
        IHttpContextAccessor? httpContextAccessor = null)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    // ══════════════════════════════════════════════════════
    // 1. MÓDULO GEOGRÁFICO
    // ══════════════════════════════════════════════════════
    public DbSet<Location> Locations { get; set; }

    // ══════════════════════════════════════════════════════
    // 2. CATÁLOGO
    // ══════════════════════════════════════════════════════
    public DbSet<Category> Categories { get; set; }
    public DbSet<Subcategory> Subcategories { get; set; }
    public DbSet<Tag> Tags { get; set; }

    // ══════════════════════════════════════════════════════
    // 3. ATRACCIONES
    // ══════════════════════════════════════════════════════
    public DbSet<Attraction> Attractions { get; set; }
    public DbSet<AttractionTag> AttractionTags { get; set; }
    public DbSet<AttractionMedia> AttractionMedias { get; set; }
    public DbSet<AttractionInclusion> AttractionInclusions { get; set; }

    // ══════════════════════════════════════════════════════
    // 4. ITINERARIO
    // ══════════════════════════════════════════════════════
    public DbSet<TourItinerary> TourItineraries { get; set; }
    public DbSet<TourStop> TourStops { get; set; }
    public DbSet<TourStopMedia> TourStopMedias { get; set; }

    // ══════════════════════════════════════════════════════
    // 5. INCLUSIONES
    // ══════════════════════════════════════════════════════
    public DbSet<InclusionItem> InclusionItems { get; set; }
    public DbSet<MediaType> MediaTypes { get; set; }

    // ══════════════════════════════════════════════════════
    // 6. INVENTARIO Y PRECIOS
    // ══════════════════════════════════════════════════════
    public DbSet<ProductOption> ProductOptions { get; set; }
    public DbSet<PriceTier> PriceTiers { get; set; }
    public DbSet<TicketCategory> TicketCategories { get; set; }

    // ══════════════════════════════════════════════════════
    // MODEL CREATING
    // ══════════════════════════════════════════════════════
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AtraccionDbContext).Assembly);

        // Mapeo manual para resolver la inconsistencia de nombres en tu BD
        var tableMapping = new Dictionary<string, string>
        {
            { nameof(Location), "locations" },
            { nameof(Category), "category" },
            { nameof(Subcategory), "subcategory" },
            { nameof(InclusionItem), "inclusion_item" },
            { nameof(Attraction), "attraction" },
            { nameof(AttractionTag), "attraction_tag" },
            { nameof(Tag), "tag" },
            { nameof(AttractionInclusion), "attraction_inclusion" },
            { nameof(AttractionMedia), "attraction_media" },
            { nameof(MediaType), "media_type" },
            { nameof(ProductOption), "product_option" },
            { nameof(PriceTier), "price_tier" },
            { nameof(TicketCategory), "ticket_category" },
            { nameof(TourItinerary), "tour_itinerary" },
            { nameof(TourStop), "tour_stop" },
            { nameof(TourStopMedia), "tour_stop_media" }
        };

        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            var entityName = entity.ClrType.Name;
            if (tableMapping.TryGetValue(entityName, out var tableName))
            {
                entity.SetTableName(tableName);
            }

            foreach (var property in entity.GetProperties())
            {
                var propName = ToSnakeCase(property.Name);
                property.SetColumnName(propName);
            }
        }
    }

    private string ToSnakeCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        return System.Text.RegularExpressions.Regex.Replace(input, @"([a-z0-9])([A-Z])", "$1_$2").ToLower();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampAuditFields();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void StampAuditFields()
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    entry.Entity.UpdatedAt = now;
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    entry.Property(e => e.CreatedAt).IsModified = false;
                    break;
            }
        }
    }
}
