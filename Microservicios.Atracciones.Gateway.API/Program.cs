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

        // Ensamblar respuesta final
        var finalResponse = new
        {
            success = true,
            data = new
            {
                detalle = sourceNode,
                disponibilidad = allAvailability
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
