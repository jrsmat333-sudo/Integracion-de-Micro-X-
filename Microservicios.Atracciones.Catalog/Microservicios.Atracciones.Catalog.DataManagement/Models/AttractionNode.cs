namespace Microservicios.Atracciones.Catalog.DataManagement.Models;

public class AttractionNode
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? DescriptionShort { get; set; }
    public string? DescriptionFull { get; set; }
    public string? ImageUrl { get; set; }
    public decimal RatingAverage { get; set; }
    public int RatingCount { get; set; }
    public string? DifficultyLevel { get; set; }
    public Guid? ManagedById { get; set; }
    public decimal? StartingPrice { get; set; }
    public string? Address { get; set; }
    public string? MeetingPoint { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public bool IsActive { get; set; }
    public bool IsPublished { get; set; }
    public int ModalityCount { get; set; }

    // Jerarquía directa aplanada
    public Guid LocationId { get; set; }
    public string LocationName { get; set; } = string.Empty;
    public string LocationCountryCode { get; set; } = string.Empty;
}
