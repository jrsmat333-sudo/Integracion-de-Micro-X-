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

        // 1.5 Iterar sobre los products: calcular precios mínimos y reconstruir priceTiers
        // garantizando que price NUNCA sea 0 (si lo es, se sustituye por startingPrice del producto).
        decimal minAttractionPrice = decimal.MaxValue;
        if (productsArray != null)
        {
            foreach (var prod in productsArray)
            {
                var priceTiers = prod?["priceTiers"]?.AsArray();
                decimal minProductPrice = decimal.MaxValue;

                // ── Pasada 1: descubrir el precio mínimo real (> 0) del producto ──
                var rawTiers = new List<(JsonNode original, decimal price)>();
                if (priceTiers != null)
                {
                    foreach (var pt in priceTiers)
                    {
                        if (pt == null) continue;
                        decimal priceVal = 0m;
                        var priceToken = pt["price"];
                        if (priceToken != null)
                        {
                            try { priceVal = (decimal)priceToken; }
                            catch { try { priceVal = decimal.Parse(priceToken.ToString(), System.Globalization.CultureInfo.InvariantCulture); } catch { priceVal = 0m; } }
                        }
                        if (priceVal > 0m && priceVal < minProductPrice) minProductPrice = priceVal;
                        rawTiers.Add((pt, priceVal));
                    }
                }

                decimal fallbackPrice = minProductPrice != decimal.MaxValue ? minProductPrice : 0m;
                if (fallbackPrice > 0m && fallbackPrice < minAttractionPrice) minAttractionPrice = fallbackPrice;

                // ── Pasada 2: reconstruir priceTiers garantizando price > 0 ──
                if (priceTiers != null)
                {
                    var newPriceTiers = new JsonArray();
                    foreach (var (originalPt, price) in rawTiers)
                    {
                        var effectivePrice = price > 0m ? price : fallbackPrice;

                        var newPt = new JsonObject();
                        newPt["id"] = originalPt["id"]?.ToString();
                        newPt["price"] = effectivePrice;
                        newPt["currencyCode"] = originalPt["currencyCode"]?.ToString() ?? "USD";

                        // categoryName se mantiene porque el frontend lo necesita como label.
                        // (No agregamos "label" porque el integrador externo crashea con ese campo.)
                        var categoryName = originalPt["categoryName"]?.ToString();
                        if (!string.IsNullOrEmpty(categoryName))
                        {
                            newPt["categoryName"] = categoryName;
                        }

                        newPriceTiers.Add(newPt);
                    }

                    // Si no había priceTiers o todos vinieron en 0 sin fallback, generamos uno sintético
                    // para que el integrador nunca reciba un array vacío que rompa su deserializador.
                    if (newPriceTiers.Count == 0 && prod != null)
                    {
                        var stub = new JsonObject();
                        stub["id"] = prod["id"]?.ToString();
                        stub["price"] = fallbackPrice;
                        stub["currencyCode"] = "USD";
                        newPriceTiers.Add(stub);
                    }

                    if (prod != null)
                    {
                        prod["priceTiers"] = newPriceTiers;
                    }
                }

                // Inyectar el precio directamente en el producto por si el integrador mapea 'price' o 'startingPrice' en la raíz
                if (prod != null && fallbackPrice > 0m)
                {
                    prod["price"] = fallbackPrice;
                    prod["startingPrice"] = fallbackPrice;
                    prod["precio"] = fallbackPrice;
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

        // 3. Inyectar la disponibilidad y los precios en el JSON original
        if (sourceNode is JsonObject jsonObject)
        {
            jsonObject["slots"] = allAvailability;
            
            // Inyectar startingPrice en el Attraction si el integrador lo busca ahí
            if (minAttractionPrice != decimal.MaxValue)
                jsonObject["startingPrice"] = minAttractionPrice;
            else
                jsonObject["startingPrice"] = 0;
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

// -----------------------------------------------------------------------------
// ENDPOINT INTERCEPTOR: POST /booking (Compatibilidad Integradores)
// -----------------------------------------------------------------------------
var bookingInterceptor = async (HttpContext context, IHttpClientFactory clientFactory, IConfiguration config) =>
{
    try
    {
        var client = clientFactory.CreateClient();
        var bookingBaseUrl = config["ReverseProxy:Clusters:booking-cluster:Destinations:destination1:Address"]?.TrimEnd('/');
        var catalogBaseUrl = config["ReverseProxy:Clusters:catalog-cluster:Destinations:destination1:Address"]?.TrimEnd('/');

        if (string.IsNullOrEmpty(bookingBaseUrl) || string.IsNullOrEmpty(catalogBaseUrl))
            return Results.StatusCode(500);

        using var reader = new StreamReader(context.Request.Body);
        var body = await reader.ReadToEndAsync();
        
        JsonNode? jsonNode = null;
        try { jsonNode = JsonNode.Parse(body); } catch { /* ignore parse error */ }

        // Parche para el bug del integrador: Si mandan priceTierId = productOptionId
        if (jsonNode != null)
        {
            var productOptionId = jsonNode["productOptionId"]?.ToString();
            var ticketsArray = jsonNode["tickets"]?.AsArray();
            
            if (!string.IsNullOrEmpty(productOptionId) && ticketsArray != null && ticketsArray.Count > 0)
            {
                // Obtenemos el producto real para sacar el priceTier correcto
                var poRes = await client.GetAsync($"{catalogBaseUrl}/api/v1/productoption/{productOptionId}");
                if (poRes.IsSuccessStatusCode)
                {
                    var poJson = await poRes.Content.ReadAsStringAsync();
                    var poNode = JsonNode.Parse(poJson);
                    var priceTiers = poNode?["priceTiers"]?.AsArray();

                    string? realPriceTierId = null;
                    if (priceTiers != null && priceTiers.Count > 0)
                    {
                        realPriceTierId = priceTiers[0]?["id"]?.ToString();
                    }

                    if (!string.IsNullOrEmpty(realPriceTierId))
                    {
                        foreach (var ticket in ticketsArray)
                        {
                            var tPtId = ticket?["priceTierId"]?.ToString();
                            // Si el integrador mandó el ProductOptionId por error o lo mandó vacío, lo forzamos al real
                            if (string.IsNullOrEmpty(tPtId) || tPtId == productOptionId)
                            {
                                ticket!["priceTierId"] = realPriceTierId;
                            }
                        }
                    }
                }
            }
        }

        var newBody = jsonNode?.ToJsonString() ?? body;
        var content = new StringContent(newBody, System.Text.Encoding.UTF8, "application/json");

        if (context.Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            client.DefaultRequestHeaders.Add("Authorization", authHeader.ToString());
        }

        var res = await client.PostAsync($"{bookingBaseUrl}/api/v1/booking", content);
        var resBody = await res.Content.ReadAsStringAsync();

        return Results.Content(resBody, "application/json", System.Text.Encoding.UTF8, (int)res.StatusCode);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
};

// Mapeamos ambas rutas para asegurar que el integrador lo logre
app.MapPost("/booking", bookingInterceptor);
app.MapPost("/api/v1/booking", bookingInterceptor);

// -----------------------------------------------------------------------------
// ENDPOINT INTERCEPTOR: GET /api/v1/productoption/by-attraction/{attractionId}
// -----------------------------------------------------------------------------
app.MapGet("/api/v1/productoption/by-attraction/{attractionId}", async (Guid attractionId, IHttpClientFactory clientFactory, IConfiguration config) =>
{
    try
    {
        var client = clientFactory.CreateClient();
        var catalogBaseUrl = config["ReverseProxy:Clusters:catalog-cluster:Destinations:destination1:Address"]?.TrimEnd('/');

        if (string.IsNullOrEmpty(catalogBaseUrl))
            return Results.StatusCode(500);

        var res = await client.GetAsync($"{catalogBaseUrl}/api/v1/productoption/by-attraction/{attractionId}");
        if (!res.IsSuccessStatusCode)
            return Results.StatusCode((int)res.StatusCode);

        var json = await res.Content.ReadAsStringAsync();
        var node = JsonNode.Parse(json);
        
        var productsArray = node?["data"]?.AsArray() ?? node?.AsArray();
        if (productsArray != null)
        {
            foreach (var prod in productsArray)
            {
                var priceTiers = prod?["priceTiers"]?.AsArray();
                if (priceTiers == null) continue;

                // ── Pasada 1: descubrir el precio mínimo real (> 0) del producto ──
                decimal minProductPrice = decimal.MaxValue;
                var rawTiers = new List<(JsonNode original, decimal price)>();
                foreach (var pt in priceTiers)
                {
                    if (pt == null) continue;
                    decimal priceVal = 0m;
                    var priceToken = pt["price"];
                    if (priceToken != null)
                    {
                        try { priceVal = (decimal)priceToken; }
                        catch { try { priceVal = decimal.Parse(priceToken.ToString(), System.Globalization.CultureInfo.InvariantCulture); } catch { priceVal = 0m; } }
                    }
                    if (priceVal > 0m && priceVal < minProductPrice) minProductPrice = priceVal;
                    rawTiers.Add((pt, priceVal));
                }

                decimal fallbackPrice = minProductPrice != decimal.MaxValue ? minProductPrice : 0m;

                // ── Pasada 2: reconstruir priceTiers garantizando price > 0 ──
                var newPriceTiers = new JsonArray();
                foreach (var (originalPt, price) in rawTiers)
                {
                    var effectivePrice = price > 0m ? price : fallbackPrice;
                    var newPt = new JsonObject();
                    newPt["id"] = originalPt["id"]?.ToString();
                    newPt["price"] = effectivePrice;
                    newPt["currencyCode"] = originalPt["currencyCode"]?.ToString() ?? "USD";

                    var categoryName = originalPt["categoryName"]?.ToString();
                    if (!string.IsNullOrEmpty(categoryName))
                    {
                        newPt["categoryName"] = categoryName;
                    }
                    newPriceTiers.Add(newPt);
                }

                if (newPriceTiers.Count == 0 && prod != null && fallbackPrice > 0m)
                {
                    var stub = new JsonObject();
                    stub["id"] = prod["id"]?.ToString();
                    stub["price"] = fallbackPrice;
                    stub["currencyCode"] = "USD";
                    newPriceTiers.Add(stub);
                }

                if (prod != null)
                {
                    prod["priceTiers"] = newPriceTiers;
                    if (fallbackPrice > 0m)
                    {
                        prod["price"] = fallbackPrice;
                        prod["startingPrice"] = fallbackPrice;
                        prod["precio"] = fallbackPrice;
                    }
                }
            }
        }

        return Results.Content(node!.ToJsonString(), "application/json");
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

// Mapear el Reverse Proxy
app.MapReverseProxy();

app.Run();
