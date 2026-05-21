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
    // 2. ATRACCIONES
    // ══════════════════════════════════════════════════════
    public DbSet<Attraction> Attractions { get; set; }

    // ══════════════════════════════════════════════════════
    // 3. INVENTARIO Y PRECIOS
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

        var tableMapping = new Dictionary<string, string>
        {
            { nameof(Location), "locations" },
            { nameof(Attraction), "attraction" },
            { nameof(ProductOption), "product_option" },
            { nameof(PriceTier), "price_tier" },
            { nameof(TicketCategory), "ticket_category" }
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
