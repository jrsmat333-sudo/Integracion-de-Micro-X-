namespace Microservicios.Atracciones.Gateway.API.GraphQL;

// ───────────────────────────────────────────────────────────────────────────
// Tipos expuestos por GraphQL (solo lectura, para la app móvil).
// Reflejan la forma JSON (camelCase) que devuelven Catalog/Booking; se rellenan
// deserializando las respuestas REST de esos microservicios.
// ───────────────────────────────────────────────────────────────────────────

public class AttractionSummary
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? DescriptionShort { get; set; }
    public string LocationName { get; set; } = string.Empty;
    public string LocationCountryCode { get; set; } = string.Empty;
    public decimal RatingAverage { get; set; }
    public int RatingCount { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? ImageUrl { get; set; }
    public decimal? StartingPrice { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public bool IsActive { get; set; }
    public bool IsPublished { get; set; }
    public int ModalityCount { get; set; }
}

public class AttractionDetail
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? DescriptionShort { get; set; }
    public string? DescriptionFull { get; set; }
    public string? DifficultyLevel { get; set; }
    public decimal RatingAverage { get; set; }
    public int RatingCount { get; set; }
    public int? MinAge { get; set; }
    public int? MaxGroupSize { get; set; }
    public string? Address { get; set; }
    public string? MeetingPoint { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? ImageUrl { get; set; }
    public Guid LocationId { get; set; }
    public string LocationName { get; set; } = string.Empty;
    public string LocationCountryCode { get; set; } = string.Empty;
    public List<Product> Products { get; set; } = [];
    /// <summary>Disponibilidad agregada por el resolver (desde Booking), una entrada por día y modalidad.</summary>
    public List<AvailabilityDay> Slots { get; set; } = [];
}

public class Product
{
    public Guid Id { get; set; }
    public string? Slug { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? DurationMinutes { get; set; }
    public string? DurationDescription { get; set; }
    public int CancelPolicyHours { get; set; }
    public string? CancelPolicyText { get; set; }
    public int? MaxGroupSize { get; set; }
    public int MinParticipants { get; set; }
    public bool IsPrivate { get; set; }
    public List<PriceTier> PriceTiers { get; set; } = [];
}

public class PriceTier
{
    public Guid Id { get; set; }
    public Guid TicketCategoryId { get; set; }
    public string? CategoryName { get; set; }
    public decimal Price { get; set; }
    public string CurrencyCode { get; set; } = "USD";
}

public class AvailabilityDay
{
    public string Fecha { get; set; } = string.Empty;
    public int CuposDisponibles { get; set; }
    public Guid? ProductOptionId { get; set; }
    public List<Horario> Horarios { get; set; } = [];
}

public class Horario
{
    public Guid SlotId { get; set; }
    public string HoraInicio { get; set; } = string.Empty;
    public string? HoraFin { get; set; }
    public int CuposDisponibles { get; set; }
    public int CuposTotales { get; set; }
}

public class MyBooking
{
    public Guid BookingId { get; set; }
    public string PnrCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime ActivityDate { get; set; }
    public string AttractionName { get; set; } = string.Empty;
    public string? AttractionImage { get; set; }
    public int TotalPassengers { get; set; }
}

// ───────────────────────────────────────────────────────────────────────────
// Envoltorios internos para deserializar las respuestas de los microservicios
// (ApiResponse<T> y PagedResult<T>). No se exponen en el esquema GraphQL.
// ───────────────────────────────────────────────────────────────────────────

internal sealed class ApiResponseDto<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
}

internal sealed class PagedResultDto<T>
{
    public List<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
}
