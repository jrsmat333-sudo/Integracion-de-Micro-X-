namespace Microservicios.Atracciones.Catalog.DataAccess.Entities;

/// <summary>
/// Catálogo de ítems de inclusión/exclusión reutilizables.
/// category: "included" | "not_included" | "optional" | "bring"
/// </summary>
public class InclusionItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? IconSlug { get; set; }
    public string DefaultText { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual ICollection<AttractionInclusion> AttractionInclusions { get; set; } = [];
}
