using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microservicios.Atracciones.Identify.DataAccess.Common;
using Microservicios.Atracciones.Identify.DataAccess.Entities;
using System.Text.Json;

namespace Microservicios.Atracciones.Identify.DataAccess.Context;

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

    // ══════════════════════════════════════════════════
    // 3. RBAC
    // ══════════════════════════════════════════════════
    public DbSet<Role> Roles { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<Client> Clients { get; set; }


        // ══════════════════════════════════════════════════
    // MODEL CREATING
    // ══════════════════════════════════════════════════
    protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AtraccionDbContext).Assembly);

    // Mapeo manual para resolver la inconsistencia de nombres en tu BD
    var tableMapping = new Dictionary<string, string>
    {
        { nameof(User), "users" },
        { nameof(UserRole), "user_role" },
        { nameof(Role), "role" },
        { nameof(Client), "client" }
    };

    foreach (var entity in modelBuilder.Model.GetEntityTypes())
    {
        var entityName = entity.ClrType.Name;
        if (tableMapping.TryGetValue(entityName, out var tableName))
        {
            entity.SetTableName(tableName);
        }

        // Mantenemos snake_case para las columnas porque esas sí parecen consistentes
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

    // Solo convierte PascalCase a snake_case y a minúsculas
    // SIN añadir "s" al final, para respetar el nombre de tu clase
    return System.Text.RegularExpressions.Regex.Replace(input, @"([a-z0-9])([A-Z])", "$1_$2").ToLower();
}



    // ══════════════════════════════════════════════════
    // SAVE WITH AUDIT
    // ══════════════════════════════════════════════════
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampAuditFields();
        return await base.SaveChangesAsync(cancellationToken);
    }

    // ──────────────────────────────────────────────────
    private void StampAuditFields()
    {
        var currentUser = _httpContextAccessor?.HttpContext?.User?.Identity?.Name ?? "system";
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
                    // Evitar sobrescribir campos de creación
                    entry.Property(e => e.CreatedAt).IsModified = false;
                    break;

                case EntityState.Deleted:
                    // Dejamos el EF manejar el borrado
                    break;
            }
        }
    }

    // ──────────────────────────────────────────────────
}
