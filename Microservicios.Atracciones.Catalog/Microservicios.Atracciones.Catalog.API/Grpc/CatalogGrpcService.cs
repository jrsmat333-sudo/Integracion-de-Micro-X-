using Grpc.Core;
using Microservicios.Atracciones.Shared.gRPC;
using Microservicios.Atracciones.Catalog.DataAccess.Entities;
using Microservicios.Atracciones.Catalog.DataAccess.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microservicios.Atracciones.Catalog.DataAccess.Context;
using Microsoft.Extensions.Logging;

namespace Microservicios.Atracciones.Catalog.API.Grpc;

public class CatalogGrpcService : CatalogService.CatalogServiceBase
{
    private readonly AtraccionDbContext _dbContext;
    private readonly ILogger<CatalogGrpcService> _logger;

    public CatalogGrpcService(AtraccionDbContext dbContext, ILogger<CatalogGrpcService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public override async Task<ValidateBookingResponse> ValidateBookingData(ValidateBookingRequest request, ServerCallContext context)
    {
        try
        {
            _logger.LogInformation("gRPC ValidateBookingData llamado - AttractionId: {AttractionId}, ProductOptionId: {ProductOptionId}, PriceTierIds: [{PriceTierIds}]",
                request.AttractionId, request.ProductOptionId, string.Join(", ", request.PriceTierIds));

            if (!Guid.TryParse(request.AttractionId, out Guid attractionId) || 
                !Guid.TryParse(request.ProductOptionId, out Guid productOptionId))
            {
                return new ValidateBookingResponse 
                { 
                    IsValid = false, 
                    ErrorMessage = "IDs inválidos proporcionados." 
                };
            }

            var attraction = await _dbContext.Attractions
                .Include(a => a.ProductOptions)
                    .ThenInclude(p => p.PriceTiers)
                    .ThenInclude(pt => pt.TicketCategory)
                .FirstOrDefaultAsync(a => a.Id == attractionId);

            if (attraction == null)
            {
                _logger.LogWarning("Atracción {AttractionId} no encontrada en el catálogo.", attractionId);
                return new ValidateBookingResponse 
                { 
                    IsValid = false, 
                    ErrorMessage = $"Atracción con ID {attractionId} no encontrada." 
                };
            }

            var product = attraction.ProductOptions.FirstOrDefault(p => p.Id == productOptionId);
            if (product == null)
            {
                _logger.LogWarning("ProductOption {ProductOptionId} no encontrada en atracción {AttractionName}.", productOptionId, attraction.Name);
                return new ValidateBookingResponse 
                { 
                    IsValid = false, 
                    ErrorMessage = $"Opción de producto con ID {productOptionId} no encontrada en la atracción." 
                };
            }

            var response = new ValidateBookingResponse
            {
                IsValid = true,
                AttractionName = attraction.Name,
                ProductTitle = product.Title,
                CurrencyCode = "USD"
            };

            // Fallback compartido: el priceTier oficial más barato y activo del producto.
            // Lo usamos cuando un integrador externo envía product.id (o un id inválido)
            // como priceTierId — convención que documentamos al comparar payloads con Venturo.
            var fallbackTier = product.PriceTiers
                .Where(pt => pt.IsActive)
                .OrderBy(pt => pt.Price)
                .FirstOrDefault();

            foreach (var requestedTierId in request.PriceTierIds)
            {
                PriceTier? priceTier = null;
                if (Guid.TryParse(requestedTierId, out Guid tierId))
                {
                    priceTier = product.PriceTiers.FirstOrDefault(pt => pt.Id == tierId && pt.IsActive);
                }

                if (priceTier != null)
                {
                    var label = priceTier.TicketCategory?.Name ?? "General";
                    _logger.LogInformation("PriceTier validado: {TierId} -> Label: {Label}, Precio oficial: {Price}", tierId, label, priceTier.Price);

                    response.PriceTiers.Add(new PriceTierResponse
                    {
                        PriceTierId = priceTier.Id.ToString(),
                        Label = label,
                        Price = (double)priceTier.Price
                    });
                }
                else if (fallbackTier != null)
                {
                    // El integrador mandó un id que no es un priceTier real (típicamente product.id).
                    // Devolvemos el priceTier oficial más barato del producto. Como el id devuelto
                    // será distinto al solicitado, el BookingIntegrationService debe tener lógica
                    // de fallback (no exigir match exacto por id).
                    var label = fallbackTier.TicketCategory?.Name ?? "General";
                    _logger.LogWarning("PriceTier {RequestedId} no es un priceTier real. Sustituyendo por el oficial más barato ({RealId}, {Price} {Currency}).",
                        requestedTierId, fallbackTier.Id, fallbackTier.Price, fallbackTier.CurrencyCode);

                    response.PriceTiers.Add(new PriceTierResponse
                    {
                        PriceTierId = fallbackTier.Id.ToString(),
                        Label = label,
                        Price = (double)fallbackTier.Price
                    });
                }
                else
                {
                    _logger.LogWarning("PriceTier {TierId} no encontrado y producto {ProductTitle} no tiene tiers activos para fallback.", requestedTierId, product.Title);
                }
            }

            _logger.LogInformation("gRPC Validación completada. Atracción: {Name}, Producto: {Product}, PriceTiers encontrados: {Count}",
                attraction.Name, product.Title, response.PriceTiers.Count);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error en gRPC ValidateBookingData");
            throw new RpcException(new Status(StatusCode.Internal, $"Error interno en Catalog: {ex.Message}"));
        }
    }
}
