namespace Microservicios.Atracciones.Catalog.DataAccess.Common;

public class QueryFilters
{
    private int _pageSize = 10;
    private int _pageNumber = 1;

    public string? SearchTerm { get; set; }

    public int PageNumber
    {
        get => _pageNumber;
        set => _pageNumber = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value is < 1 or > 100 ? 10 : value;
    }

    public string? SortBy { get; set; }
    public bool IsAscending { get; set; } = true;

    public int Offset => (PageNumber - 1) * PageSize;
}

public class AttractionQueryFilters : QueryFilters
{
    public Guid? LocationId { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public decimal? MinRating { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? DifficultyLevels { get; set; }
    public bool? IsPublished { get; set; } = true;
    public bool? IsActive { get; set; } = true;
    public Guid? ManagedById { get; set; }
}

public class AvailabilityQueryFilters : QueryFilters
{
    public Guid ProductId { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
    public int MinCapacity { get; set; } = 1;
}

public class BookingQueryFilters : QueryFilters
{
    public Guid? ManagedById { get; set; }
    public short? StatusId { get; set; }
}

public class ReviewQueryFilters : QueryFilters
{
    public Guid? ManagedById { get; set; }
    public Guid? AttractionId { get; set; }
}
