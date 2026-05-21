using Microservicios.Atracciones.Catalog.Business.DTOs.Master;
using Microservicios.Atracciones.Catalog.Business.Interfaces;
using Microservicios.Atracciones.Catalog.DataManagement.Interfaces;

namespace Microservicios.Atracciones.Catalog.Business.Services;

public class MasterDataService : IMasterDataService
{
    private readonly IMasterDataDataService _masterData;

    public MasterDataService(IMasterDataDataService masterData)
    {
        _masterData = masterData;
    }

    public async Task<IEnumerable<TicketCategoryResponse>> GetTicketCategoriesAsync()
    {
        var cats = await _masterData.GetAllTicketCategoriesAsync();
        return cats.Select(MapToTicketCategoryResponse);
    }

    public async Task<TicketCategoryResponse?> GetTicketCategoryByIdAsync(Guid id)
    {
        var cat = await _masterData.GetTicketCategoryByIdAsync(id);
        return cat == null ? null : MapToTicketCategoryResponse(cat);
    }

    public async Task<Guid> CreateTicketCategoryAsync(CreateTicketCategoryRequest request)
    {
        var category = new DataAccess.Entities.TicketCategory
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            NameEn = request.NameEn,
            AgeRangeMin = request.AgeRangeMin,
            AgeRangeMax = request.AgeRangeMax,
            SortOrder = request.SortOrder,
            IsActive = true
        };
        return await _masterData.AddTicketCategoryAsync(category);
    }

    public async Task<bool> UpdateTicketCategoryAsync(Guid id, CreateTicketCategoryRequest request)
    {
        var category = new DataAccess.Entities.TicketCategory
        {
            Id = id,
            Name = request.Name,
            NameEn = request.NameEn,
            AgeRangeMin = request.AgeRangeMin,
            AgeRangeMax = request.AgeRangeMax,
            SortOrder = request.SortOrder,
            IsActive = true
        };
        return await _masterData.UpdateTicketCategoryAsync(category);
    }

    public Task<bool> DeleteTicketCategoryAsync(Guid id) => _masterData.DeleteTicketCategoryAsync(id);

    private static TicketCategoryResponse MapToTicketCategoryResponse(DataAccess.Entities.TicketCategory c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        NameEn = c.NameEn,
        AgeRangeMin = c.AgeRangeMin,
        AgeRangeMax = c.AgeRangeMax
    };
}
