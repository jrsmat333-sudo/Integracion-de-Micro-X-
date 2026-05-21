using Microservicios.Atracciones.Catalog.DataAccess.Common;

namespace Microservicios.Atracciones.Catalog.DataAccess.Entities;

public class Attraction : BaseEntity
{
    public Guid LocationId { get; set; }
    public string Slug { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string? DescriptionShort { get; set; }
    public string? DescriptionFull { get; set; }
    public string? ImageUrl { get; set; }

    public string? Address { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? MeetingPoint { get; set; }

    public decimal RatingAverage { get; set; } = 0.00m;
    public int RatingCount { get; set; } = 0;

    public short? MinAge { get; set; }
    public short? MaxGroupSize { get; set; }
    public string? DifficultyLevel { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsPublished { get; set; } = false;
    public Guid? ManagedById { get; set; }
    public DateTime? DeletedAt { get; set; }

    public virtual Location Location { get; set; } = null!;
    public virtual ICollection<ProductOption> ProductOptions { get; set; } = [];
}
