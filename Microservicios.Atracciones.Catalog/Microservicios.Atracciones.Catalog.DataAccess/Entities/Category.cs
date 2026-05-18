using Microservicios.Atracciones.Catalog.DataAccess.Common;

namespace Microservicios.Atracciones.Catalog.DataAccess.Entities;

public class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? IconUrl { get; set; }
    public short SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    // Navegación
    public virtual ICollection<Subcategory> Subcategories { get; set; } = [];
}
