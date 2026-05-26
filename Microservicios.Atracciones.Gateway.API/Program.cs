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
app.MapGet("/api/v1/integrations/attraction-full/{slug}", async (string slug, IHttpClientFactory clientFactory, IConfiguration config) =>
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

        // 2. Obtener Opciones de Producto (Modalidades)
        var productOptionRes = await client.GetAsync($"{catalogBaseUrl}/api/v1/productoption/by-attraction/{attractionIdStr}");
        JsonNode? productOptionsNode = null;
        if (productOptionRes.IsSuccessStatusCode)
        {
            var poJson = await productOptionRes.Content.ReadAsStringAsync();
            productOptionsNode = JsonNode.Parse(poJson);
            // Extraer del envelope 'data' si existe
            if (productOptionsNode?["data"] != null) 
            {
                productOptionsNode = productOptionsNode["data"];
            }
        }

        // 3. Obtener Disponibilidad
        var availabilityRes = await client.GetAsync($"{bookingBaseUrl}/api/v1/booking/disponibilidad?attractionId={attractionIdStr}");
        JsonNode? availabilityNode = null;
        if (availabilityRes.IsSuccessStatusCode)
        {
            var avJson = await availabilityRes.Content.ReadAsStringAsync();
            availabilityNode = JsonNode.Parse(avJson);
            // Extraer del envelope 'data' si existe
            if (availabilityNode?["data"] != null) 
            {
                availabilityNode = availabilityNode["data"];
            }
        }

        // Ensamblar respuesta final
        var finalResponse = new
        {
            success = true,
            data = new
            {
                detalle = dataNode ?? attractionNode,
                opciones = productOptionsNode,
                disponibilidad = availabilityNode
            }
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
