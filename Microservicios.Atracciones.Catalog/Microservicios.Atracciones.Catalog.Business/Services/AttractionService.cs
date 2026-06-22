using Microservicios.Atracciones.Catalog.Business.DTOs.Attraction;
using Microservicios.Atracciones.Catalog.Business.DTOs.Inventory;
using Microservicios.Atracciones.Catalog.Business.Exceptions;
using Microservicios.Atracciones.Catalog.Business.Interfaces;
using Microservicios.Atracciones.Catalog.DataAccess.Common;
using Microservicios.Atracciones.Catalog.DataAccess.Entities;
using Microservicios.Atracciones.Catalog.DataManagement.Interfaces;
using Microservicios.Atracciones.Catalog.DataManagement.Models;
using Microservicios.Atracciones.Catalog.DataAccess.Repositories.Interfaces;
using Microservicios.Atracciones.Shared.Contracts.Events;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Microservicios.Atracciones.Catalog.Business.Services;

public class AttractionService : IAttractionService
{
    private readonly IAttractionDataService _attractionData;
    private readonly IInventoryDataService _inventoryData;
    private readonly IUnitOfWork _uow;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<AttractionService> _logger;

    public AttractionService(IAttractionDataService attractionData, IInventoryDataService inventoryData, IUnitOfWork uow, IPublishEndpoint publishEndpoint, ILogger<AttractionService> logger)
    {
        _attractionData = attractionData;
        _inventoryData = inventoryData;
        _uow = uow;
        _publishEndpoint = publishEndpoint;
        _logger = logger;
    }

    public async Task<PagedResult<AttractionSummaryResponse>> SearchAsync(AttractionSearchRequest request)
    {
        var filters = new AttractionQueryFilters
        {
            SearchTerm = request.SearchTerm ?? string.Empty,
            LocationId = request.LocationId,
            MinRating = request.MinRating,
            DifficultyLevel = request.DifficultyLevel,
            DifficultyLevels = request.DifficultyLevels,
            MinPrice = request.MinPrice,
            MaxPrice = request.MaxPrice,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            IsPublished = true,
            IsActive = true
        };

        var paged = await _attractionData.SearchAttractionsAsync(filters);

        return new PagedResult<AttractionSummaryResponse>
        {
            Items = paged.Items.Select(MapToSummary).ToList(),
            TotalCount = paged.TotalCount,
            PageNumber = paged.PageNumber,
            PageSize = paged.PageSize
        };
    }

    public async Task<PagedResult<AttractionSummaryResponse>> SearchManagementAsync(AttractionSearchRequest request, Guid currentUserId, bool isAdmin)
    {
        var filters = new AttractionQueryFilters
        {
            SearchTerm = request.SearchTerm ?? string.Empty,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            IsPublished = null
        };

        if (!isAdmin)
        {
            filters.ManagedById = currentUserId;
        }

        var paged = await _attractionData.SearchAttractionsAsync(filters);

        return new PagedResult<AttractionSummaryResponse>
        {
            Items = paged.Items.Select(MapToSummary).ToList(),
            TotalCount = paged.TotalCount,
            PageNumber = paged.PageNumber,
            PageSize = paged.PageSize
        };
    }

    public async Task<AttractionDetailResponse?> GetDetailBySlugAsync(string slug, short? languageId = null)
    {
        var node = await _attractionData.GetAttractionBySlugAsync(slug, languageId);
        if (node == null) return null;

        var products = await _inventoryData.GetProductsAsync(node.Id, languageId);
        return MapToDetail(node, products);
    }

    public async Task<IEnumerable<AttractionSummaryResponse>> GetTopRatedAsync(int count = 6)
    {
        var nodes = await _attractionData.GetTopRatedAsync(count);
        return nodes.Select(MapToSummary);
    }

    public async Task<IEnumerable<ProductResponse>> GetProductsAsync(Guid attractionId, short? languageId = null)
    {
        var products = await _inventoryData.GetProductsAsync(attractionId, languageId);
        return products.Select(MapToProductResponse);
    }

    public async Task<Guid> CreateAsync(CreateAttractionRequest request, Guid userId, bool isAdmin)
    {
        var attraction = new Attraction
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            LocationId = request.LocationId,
            ImageUrl = request.ImageUrl,
            DescriptionShort = request.DescriptionShort,
            DescriptionFull = request.DescriptionFull,
            Address = request.Address,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            MeetingPoint = request.MeetingPoint,
            DifficultyLevel = request.DifficultyLevel,
            ManagedById = isAdmin ? null : userId,
            Slug = GenerateSlug(request.Name)
        };

        var newId = await _attractionData.AddAttractionAsync(attraction);

        // Tiempo real (fire-and-forget): aún no tiene modalidades, así que precio = 0.
        await PublishAttractionCreatedAsync(attraction, startingPrice: 0m);

        return newId;
    }

    public async Task<Guid> CreateCompleteAsync(CreateCompleteAttractionRequest request, Guid userId, bool isAdmin)
    {
        var attraction = new Attraction
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            LocationId = request.LocationId,
            ImageUrl = request.ImageUrl,
            DescriptionShort = request.DescriptionShort,
            DescriptionFull = request.DescriptionFull,
            Address = request.Address,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            MeetingPoint = request.MeetingPoint,
            DifficultyLevel = request.DifficultyLevel,
            ManagedById = isAdmin ? null : userId,
            IsPublished = false,
            Slug = GenerateSlug(request.Name)
        };

        if (!request.Products.Any())
            throw new ValidationException("Debe agregar al menos una modalidad (producto) a la atracción.");

        foreach (var p in request.Products)
        {
            if (!p.PriceTiers.Any())
                throw new ValidationException($"La modalidad '{p.Title}' debe tener al menos una categoría de ticket (Price Tier) asignada.");

            var product = new ProductOption
            {
                Id = Guid.NewGuid(),
                AttractionId = attraction.Id,
                Title = p.Title,
                Description = p.Description,
                DurationMinutes = p.DurationMinutes,
                DurationDescription = p.DurationDescription,
                CancelPolicyHours = p.CancelPolicyHours,
                CancelPolicyText = p.CancelPolicyText,
                MaxGroupSize = p.MaxGroupSize,
                MinParticipants = p.MinParticipants,
                IsPrivate = p.IsPrivate,
                Slug = GenerateSlug(p.Title),
                IsActive = true
            };

            foreach (var pt in p.PriceTiers)
            {
                product.PriceTiers.Add(new PriceTier
                {
                    TicketCategoryId = pt.TicketCategoryId,
                    Price = pt.Price,
                    CurrencyCode = pt.CurrencyCode,
                    IsActive = true
                });
            }

            attraction.ProductOptions.Add(product);
        }

        await _uow.Attractions.AddAsync(attraction);
        await _uow.CompleteAsync();

        // Precio inicial = la tarifa más barata entre todas las modalidades creadas.
        var startingPrice = request.Products
            .SelectMany(p => p.PriceTiers)
            .Select(pt => pt.Price)
            .DefaultIfEmpty(0m)
            .Min();

        await PublishAttractionCreatedAsync(attraction, startingPrice);

        return attraction.Id;
    }

    /// <summary>
    /// Publica <see cref="AttractionCreatedEvent"/> en el bus (fire-and-forget). El Gateway lo
    /// consume y hace broadcast por SignalR para que la app móvil muestre la atracción sin recargar.
    /// Un fallo del broker NO debe afectar la creación de la atracción (solo se registra).
    /// </summary>
    private async Task PublishAttractionCreatedAsync(Attraction attraction, decimal startingPrice)
    {
        try
        {
            await _publishEndpoint.Publish(new AttractionCreatedEvent(
                attraction.Id,
                attraction.Name,
                null,               // LocationName: la app lo resuelve por el detalle (slug)
                attraction.ImageUrl,
                startingPrice,
                attraction.Slug,
                DateTime.UtcNow));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "No se pudo publicar AttractionCreatedEvent para AttractionId {AttractionId}", attraction.Id);
        }
    }

    public async Task<bool> UpdateAsync(Guid id, UpdateAttractionRequest request, Guid userId, bool isAdmin)
    {
        var existing = await _attractionData.GetByIdAsync(id);
        if (existing == null)
            throw new NotFoundException("Atracción", id);

        if (!isAdmin && existing.ManagedById != userId)
            throw new UnauthorizedBusinessException("No tienes permiso para editar esta atracción.");

        var updated = new Attraction
        {
            Id = id,
            Name = request.Name,
            LocationId = request.LocationId,
            ImageUrl = request.ImageUrl,
            DescriptionShort = request.DescriptionShort,
            DescriptionFull = request.DescriptionFull,
            Address = request.Address,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            MeetingPoint = request.MeetingPoint,
            DifficultyLevel = request.DifficultyLevel,
            IsPublished = existing.IsPublished,
        };

        return await _attractionData.UpdateAsync(updated);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, bool isAdmin)
    {
        var existing = await _attractionData.GetByIdAsync(id);
        if (existing == null)
            throw new NotFoundException("Atracción", id);

        if (!isAdmin)
            throw new UnauthorizedBusinessException("Solo los administradores pueden eliminar atracciones.");

        return await _attractionData.DeleteAsync(id);
    }

    public async Task<bool> ToggleStatusAsync(Guid id, bool isPublished, Guid userId, bool isAdmin)
    {
        var attraction = await _uow.Attractions.GetByIdAsync(id);
        if (attraction == null) return false;

        if (!isAdmin && attraction.ManagedById != userId) return false;

        var wasPublished = attraction.IsPublished;
        attraction.IsPublished = isPublished;
        attraction.UpdatedAt = DateTime.UtcNow;

        var saved = await _uow.CompleteAsync() > 0;

        // Si la atracción pasó de no publicada a publicada, notificar vía SignalR
        if (saved && !wasPublished && isPublished)
        {
            var fullAttraction = await _attractionData.GetFullByIdAsync(id);

            // Calcular startingPrice de las modalidades existentes
            var startingPrice = fullAttraction?.ProductOptions?
                .SelectMany(p => p.PriceTiers)
                .Select(pt => pt.Price)
                .DefaultIfEmpty(0m)
                .Min() ?? 0m;

            await PublishAttractionCreatedAsync(fullAttraction ?? attraction, startingPrice);
            _logger.LogInformation("Atracción {AttractionId} publicada y evento SignalR disparado.", id);
        }

        return saved;
    }

    public async Task<bool> ToggleActiveAsync(Guid id, bool isActive, Guid userId, bool isAdmin)
    {
        var attraction = await _uow.Attractions.GetByIdAsync(id);
        if (attraction == null) return false;

        if (!isAdmin && attraction.ManagedById != userId) return false;

        attraction.IsActive = isActive;
        attraction.UpdatedAt = DateTime.UtcNow;

        return await _uow.CompleteAsync() > 0;
    }

    public async Task<AttractionFullEditionResponse?> GetCompleteByIdAsync(Guid id, Guid userId, bool isAdmin)
    {
        var a = await _attractionData.GetFullByIdAsync(id);
        if (a == null) return null;

        if (!isAdmin && a.ManagedById != userId)
            throw new UnauthorizedBusinessException("No tienes permiso para ver esta atracción.");

        Guid? stateId = null;
        Guid? countryId = null;

        if (a.Location != null)
        {
            if (a.Location.Type == "city")
            {
                stateId = a.Location.ParentId;
                countryId = a.Location.Parent?.ParentId;
            }
            else if (a.Location.Type == "state")
            {
                stateId = a.Location.Id;
                countryId = a.Location.ParentId;
            }
            else if (a.Location.Type == "country")
            {
                countryId = a.Location.Id;
            }
        }

        return new AttractionFullEditionResponse
        {
            Id = a.Id,
            Slug = a.Slug,
            Name = a.Name,
            DescriptionShort = a.DescriptionShort,
            DescriptionFull = a.DescriptionFull,
            ImageUrl = a.ImageUrl,
            RatingAverage = a.RatingAverage,
            RatingCount = a.RatingCount,
            DifficultyLevel = a.DifficultyLevel,
            Address = a.Address,
            MeetingPoint = a.MeetingPoint,
            Latitude = a.Latitude,
            Longitude = a.Longitude,
            LocationId = a.LocationId,
            LocationName = a.Location?.Name ?? "",
            LocationCountryCode = a.Location?.CountryCode ?? "",
            StateId = stateId ?? Guid.Empty,
            CountryId = countryId ?? Guid.Empty,
            IsActive = a.IsActive,
            IsPublished = a.IsPublished,
            Products = a.ProductOptions.Select(po => new ProductResponse
            {
                Id = po.Id,
                Title = po.Title,
                Description = po.Description,
                DurationMinutes = po.DurationMinutes,
                DurationDescription = po.DurationDescription,
                CancelPolicyHours = po.CancelPolicyHours,
                MaxGroupSize = po.MaxGroupSize,
                MinParticipants = po.MinParticipants,
                IsPrivate = po.IsPrivate,
                PriceTiers = po.PriceTiers.Select(pt => new PriceTierResponse
                {
                    Id = pt.Id,
                    TicketCategoryId = pt.TicketCategoryId,
                    Price = pt.Price,
                    CurrencyCode = pt.CurrencyCode
                }).ToList()
            }).ToList()
        };
    }

    private static string GenerateSlug(string name)
    {
        return name.ToLower()
                   .Replace(" ", "-")
                   .Replace("á", "a").Replace("é", "e").Replace("í", "i").Replace("ó", "o").Replace("ú", "u")
                   .Replace("ñ", "n")
                   + "-" + Guid.NewGuid().ToString().Substring(0, 4);
    }

    private static AttractionSummaryResponse MapToSummary(AttractionNode node) => new()
    {
        Id = node.Id,
        Slug = node.Slug,
        Name = node.Name,
        DescriptionShort = node.DescriptionShort,
        LocationName = node.LocationName,
        LocationCountryCode = node.LocationCountryCode,
        RatingAverage = node.RatingAverage,
        RatingCount = node.RatingCount,
        DifficultyLevel = node.DifficultyLevel,
        ImageUrl = node.ImageUrl,
        StartingPrice = node.StartingPrice,
        IsActive = node.IsActive,
        IsPublished = node.IsPublished,
        ModalityCount = node.ModalityCount
    };

    private static AttractionDetailResponse MapToDetail(AttractionNode node, IEnumerable<ProductNode> products) => new()
    {
        Id = node.Id,
        Slug = node.Slug,
        Name = node.Name,
        DescriptionShort = node.DescriptionShort,
        DescriptionFull = node.DescriptionFull,
        ImageUrl = node.ImageUrl,
        RatingAverage = node.RatingAverage,
        RatingCount = node.RatingCount,
        DifficultyLevel = node.DifficultyLevel,
        Address = node.Address,
        MeetingPoint = node.MeetingPoint,
        Latitude = node.Latitude,
        Longitude = node.Longitude,
        LocationId = node.LocationId,
        LocationName = node.LocationName,
        LocationCountryCode = node.LocationCountryCode,
        Products = products.Select(MapToProductResponse).ToList()
    };

    private static ProductResponse MapToProductResponse(ProductNode p) => new()
    {
        Id = p.Id,
        Slug = p.Slug,
        Title = p.Title,
        Description = p.Description,
        DurationMinutes = p.DurationMinutes,
        DurationDescription = p.DurationDescription,
        CancelPolicyHours = p.CancelPolicyHours,
        CancelPolicyText = p.CancelPolicyText,
        MaxGroupSize = p.MaxGroupSize,
        MinParticipants = p.MinParticipants,
        IsPrivate = p.IsPrivate,
        PriceTiers = p.PriceTiers.Select(t => new PriceTierResponse
        {
            Id = t.Id,
            TicketCategoryId = t.TicketCategoryId,
            CategoryName = t.CategoryName,
            Price = t.Price,
            CurrencyCode = t.CurrencyCode
        }).ToList()
    };
}
