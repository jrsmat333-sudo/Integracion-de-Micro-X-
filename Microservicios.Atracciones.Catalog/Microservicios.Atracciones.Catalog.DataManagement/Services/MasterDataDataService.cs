using Microsoft.EntityFrameworkCore;
using Microservicios.Atracciones.Catalog.DataAccess.Entities;
using Microservicios.Atracciones.Catalog.DataAccess.Repositories.Interfaces;
using Microservicios.Atracciones.Catalog.DataManagement.Interfaces;

namespace Microservicios.Atracciones.Catalog.DataManagement.Services;

public class MasterDataDataService : IMasterDataDataService
{
    private readonly IUnitOfWork _uow;

    public MasterDataDataService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IEnumerable<TicketCategory>> GetAllTicketCategoriesAsync()
    {
        return await _uow.TicketCategories.Query().Where(t => t.IsActive).OrderBy(t => t.SortOrder).ToListAsync();
    }

    public async Task<TicketCategory?> GetTicketCategoryByIdAsync(Guid id) => await _uow.TicketCategories.GetByIdAsync(id);

    public async Task<Guid> AddTicketCategoryAsync(TicketCategory category)
    {
        await _uow.TicketCategories.AddAsync(category);
        await _uow.CompleteAsync();
        return category.Id;
    }

    public async Task<bool> UpdateTicketCategoryAsync(TicketCategory category)
    {
        _uow.TicketCategories.Update(category);
        return await _uow.CompleteAsync() > 0;
    }

    public async Task<bool> DeleteTicketCategoryAsync(Guid id)
    {
        var entity = await _uow.TicketCategories.GetByIdAsync(id);
        if (entity == null) return false;

        entity.IsActive = false;
        _uow.TicketCategories.Update(entity);
        return await _uow.CompleteAsync() > 0;
    }
}
