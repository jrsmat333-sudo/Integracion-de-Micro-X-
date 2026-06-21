using System.Text.Json;

namespace Microservicios.Atracciones.Gateway.API.GraphQL;

/// <summary>
/// Raíz de consultas GraphQL (solo lectura) para la app móvil. Cada resolver llama por HTTP
/// a Catalog/Booking reutilizando el mismo cliente "resilient" (Retry/Timeout) de los BFF.
/// Las escrituras (login, reservar, pagar) siguen por REST; aquí NO hay mutations.
///
/// Las dependencias inyectadas son TODAS singletons (IHttpClientFactory, IConfiguration,
/// IHttpContextAccessor), así que es seguro inyectarlas por constructor en el tipo raíz.
/// </summary>
public class Query
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly IHttpContextAccessor _httpContextAccessor;

    private static readonly JsonSerializerOptions _json = new() { PropertyNameCaseInsensitive = true };

    public Query(IHttpClientFactory httpClientFactory, IConfiguration config, IHttpContextAccessor httpContextAccessor)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _httpContextAccessor = httpContextAccessor;
    }

    private string? CatalogBaseUrl => _config["ReverseProxy:Clusters:catalog-cluster:Destinations:destination1:Address"]?.TrimEnd('/');
    private string? BookingBaseUrl => _config["ReverseProxy:Clusters:booking-cluster:Destinations:destination1:Address"]?.TrimEnd('/');

    /// <summary>GraphQL: <c>attractions(search, page, pageSize)</c> → listado para el catálogo móvil.</summary>
    public async Task<List<AttractionSummary>> GetAttractions(string? search = null, int page = 1, int pageSize = 20)
    {
        var client = _httpClientFactory.CreateClient("resilient");

        // OJO: el endpoint de Catalog bindea searchTerm/pageNumber/pageSize (no search/page).
        var url = $"{CatalogBaseUrl}/api/v1/attraction?pageNumber={page}&pageSize={pageSize}";
        if (!string.IsNullOrWhiteSpace(search))
            url += $"&searchTerm={Uri.EscapeDataString(search)}";

        var res = await client.GetAsync(url);
        if (!res.IsSuccessStatusCode) return new();

        var body = await res.Content.ReadAsStringAsync();
        var parsed = JsonSerializer.Deserialize<ApiResponseDto<PagedResultDto<AttractionSummary>>>(body, _json);
        return parsed?.Data?.Items ?? new();
    }

    /// <summary>GraphQL: <c>attraction(slug)</c> → detalle + modalidades + slots en una sola consulta.</summary>
    public async Task<AttractionDetail?> GetAttraction(string slug)
    {
        var client = _httpClientFactory.CreateClient("resilient");

        var detailRes = await client.GetAsync($"{CatalogBaseUrl}/api/v1/attraction/{slug}");
        if (!detailRes.IsSuccessStatusCode) return null;

        var detailBody = await detailRes.Content.ReadAsStringAsync();
        var detail = JsonSerializer.Deserialize<ApiResponseDto<AttractionDetail>>(detailBody, _json)?.Data;
        if (detail == null) return null;

        // Agregar la disponibilidad de cada modalidad (igual que el BFF REST), etiquetada
        // con su productOptionId para que la app sepa a qué modalidad pertenece cada slot.
        foreach (var product in detail.Products)
        {
            var avRes = await client.GetAsync($"{BookingBaseUrl}/api/v1/booking/disponibilidad?productOptionId={product.Id}");
            if (!avRes.IsSuccessStatusCode) continue;

            var avBody = await avRes.Content.ReadAsStringAsync();
            var days = JsonSerializer.Deserialize<ApiResponseDto<List<AvailabilityDay>>>(avBody, _json)?.Data;
            if (days == null) continue;

            foreach (var day in days)
            {
                day.ProductOptionId = product.Id;
                detail.Slots.Add(day);
            }
        }

        return detail;
    }

    /// <summary>GraphQL: <c>myBookings</c> → reservas del usuario. Reenvía el JWT entrante a Booking.</summary>
    public async Task<List<MyBooking>> GetMyBookings()
    {
        var authHeader = _httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(authHeader)) return new();

        var client = _httpClientFactory.CreateClient("resilient");
        using var req = new HttpRequestMessage(HttpMethod.Get, $"{BookingBaseUrl}/api/v1/booking/mis-reservas");
        req.Headers.TryAddWithoutValidation("Authorization", authHeader);

        var res = await client.SendAsync(req);
        if (!res.IsSuccessStatusCode) return new();

        var body = await res.Content.ReadAsStringAsync();
        var parsed = JsonSerializer.Deserialize<ApiResponseDto<List<MyBooking>>>(body, _json);
        return parsed?.Data ?? new();
    }
}
