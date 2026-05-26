using System.Text.Json;
using System.Text.Json.Nodes;

var builder = WebApplication.CreateBuilder(args);

// Configurar YARP Reverse Proxy
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Configurar HttpClient para llamadas internas (BFF)
builder.Services.AddHttpClient();

// Configurar CORS general para el Gateway
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

app.UseCors("AllowAll");

// -----------------------------------------------------------------------------
// ENDPOINT AGREGADOR (BFF): Detalle + Opciones + Disponibilidad
// -----------------------------------------------------------------------------
app.MapGet("/api/v1/attraction/{slug}", async (string slug, IHttpClientFactory clientFactory, IConfiguration config) =>
{
    try
    {
        var client = clientFactory.CreateClient();
        
        var catalogBaseUrl = config["ReverseProxy:Clusters:catalog-cluster:Destinations:destination1:Address"]?.TrimEnd('/');
        var bookingBaseUrl = config["ReverseProxy:Clusters:booking-cluster:Destinations:destination1:Address"]?.TrimEnd('/');
        
        if (string.IsNullOrEmpty(catalogBaseUrl) || string.IsNullOrEmpty(bookingBaseUrl))
        {
            return Results.StatusCode(500);
        }

        // 1. Obtener Detalle de la Atracción
        var attractionRes = await client.GetAsync($"{catalogBaseUrl}/api/v1/attraction/{slug}");
        if (!attractionRes.IsSuccessStatusCode)
        {
            return Results.StatusCode((int)attractionRes.StatusCode);
        }
        
        var attractionJson = await attractionRes.Content.ReadAsStringAsync();
        var attractionNode = JsonNode.Parse(attractionJson);
        
        // Extraer attractionId
        string? attractionIdStr = null;
        var dataNode = attractionNode?["data"];
        if (dataNode != null)
        {
            attractionIdStr = dataNode["id"]?.ToString();
        }
        else
        {
            attractionIdStr = attractionNode?["id"]?.ToString();
        }

        if (string.IsNullOrEmpty(attractionIdStr))
        {
            return Results.NotFound(new { success = false, message = "Attraction ID no encontrado en la respuesta." });
        }

        var sourceNode = dataNode ?? attractionNode;

        // Extraer los Product IDs (Modalidades) desde el detalle (así evitamos redundancia)
        var productIds = new List<string>();
        var productsArray = sourceNode?["products"]?.AsArray();
        
        if (productsArray != null)
        {
            foreach (var prod in productsArray)
            {
                var pId = prod?["id"]?.ToString();
                if (!string.IsNullOrEmpty(pId))
                {
                    productIds.Add(pId);
                }
            }
        }

        // 2. Obtener Disponibilidad para TODAS las opciones iterando sobre sus IDs
        var allAvailability = new JsonArray();
        foreach (var pId in productIds)
        {
            var avRes = await client.GetAsync($"{bookingBaseUrl}/api/v1/booking/disponibilidad?productOptionId={pId}");
            if (avRes.IsSuccessStatusCode)
            {
                var avJsonStr = await avRes.Content.ReadAsStringAsync();
                var avNode = JsonNode.Parse(avJsonStr);
                var avDataArray = avNode?["data"]?.AsArray();
                
                if (avDataArray != null)
                {
                    foreach (var item in avDataArray)
                    {
                        var clonedItem = JsonNode.Parse(item!.ToJsonString());
                        if (clonedItem != null) 
                        {
                            // Inyectar el productOptionId para que el frontend sepa a qué opción pertenece el horario
                            clonedItem["productOptionId"] = pId;
                            allAvailability.Add(clonedItem);
                        }
                    }
                }
            }
        }

        // 3. Inyectar la disponibilidad directamente en el JSON original
        if (sourceNode is JsonObject jsonObject)
        {
            jsonObject["slots"] = allAvailability;
        }

        // Retornar el JSON original (ya que sourceNode es una referencia dentro de attractionNode, 
        // attractionNode ya contiene los slots inyectados)
        return Results.Content(attractionNode!.ToJsonString(), "application/json");
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

// -----------------------------------------------------------------------------
// ENDPOINT INTERCEPTOR: Disponibilidad global por atracción (Bugfix Integradores)
// -----------------------------------------------------------------------------
app.MapGet("/api/v1/booking/disponibilidad", async (Guid? attractionId, Guid? productOptionId, string? fecha, IHttpClientFactory clientFactory, IConfiguration config) =>
{
    try
    {
        var client = clientFactory.CreateClient();
        var bookingBaseUrl = config["ReverseProxy:Clusters:booking-cluster:Destinations:destination1:Address"]?.TrimEnd('/');
        var catalogBaseUrl = config["ReverseProxy:Clusters:catalog-cluster:Destinations:destination1:Address"]?.TrimEnd('/');

        if (string.IsNullOrEmpty(bookingBaseUrl) || string.IsNullOrEmpty(catalogBaseUrl))
            return Results.StatusCode(500);

        // Si mandaron productOptionId explícitamente o NO mandaron attractionId,
        // pasamos la consulta directamente al microservicio de booking
        if (productOptionId.HasValue || !attractionId.HasValue)
        {
            var url = $"{bookingBaseUrl}/api/v1/booking/disponibilidad?";
            if (productOptionId.HasValue) url += $"productOptionId={productOptionId.Value}&";
            if (attractionId.HasValue) url += $"attractionId={attractionId.Value}&";
            if (!string.IsNullOrEmpty(fecha)) url += $"fecha={fecha}";
            url = url.TrimEnd('&', '?');

            var res = await client.GetAsync(url);
            var content = await res.Content.ReadAsStringAsync();
            return Results.Content(content, "application/json", System.Text.Encoding.UTF8, (int)res.StatusCode);
        }

        // CASO ESPECIAL: El integrador mandó attractionId pero no productOptionId.
        // 1. Obtener todas las modalidades (Product Options) de esta atracción
        var poRes = await client.GetAsync($"{catalogBaseUrl}/api/v1/productoption/by-attraction/{attractionId.Value}");
        if (!poRes.IsSuccessStatusCode)
            return Results.StatusCode((int)poRes.StatusCode);
        
        var poJson = await poRes.Content.ReadAsStringAsync();
        var poNode = JsonNode.Parse(poJson);
        var productsArray = poNode?["data"]?.AsArray() ?? poNode?.AsArray();
        
        var productIds = new List<string>();
        if (productsArray != null)
        {
            foreach (var prod in productsArray)
            {
                var pId = prod?["id"]?.ToString();
                if (!string.IsNullOrEmpty(pId)) productIds.Add(pId);
            }
        }

        // 2. Pedir disponibilidad a Booking de manera individual para cada modalidad y agruparla
        var allAvailability = new JsonArray();
        foreach (var pId in productIds)
        {
            var url = $"{bookingBaseUrl}/api/v1/booking/disponibilidad?productOptionId={pId}";
            if (!string.IsNullOrEmpty(fecha)) url += $"&fecha={fecha}";
            
            var avRes = await client.GetAsync(url);
            if (avRes.IsSuccessStatusCode)
            {
                var avJsonStr = await avRes.Content.ReadAsStringAsync();
                var avNode = JsonNode.Parse(avJsonStr);
                var avDataArray = avNode?["data"]?.AsArray();
                if (avDataArray != null)
                {
                    foreach (var item in avDataArray)
                    {
                        var clonedItem = JsonNode.Parse(item!.ToJsonString());
                        if (clonedItem != null)
                        {
                            clonedItem["productOptionId"] = pId;
                            allAvailability.Add(clonedItem);
                        }
                    }
                }
            }
        }

        // Responder con la estructura de ApiResponse que espera el integrador
        var finalResponse = new
        {
            success = true,
            data = allAvailability,
            message = "Disponibilidad obtenida exitosamente"
        };

        return Results.Ok(finalResponse);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

// Mapear el Reverse Proxy
app.MapReverseProxy();

app.Run();
