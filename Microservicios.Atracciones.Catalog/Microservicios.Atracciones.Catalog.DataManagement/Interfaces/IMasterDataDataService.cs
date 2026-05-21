using Microservicios.Atracciones.Catalog.DataAccess.Entities;

namespace Microservicios.Atracciones.Catalog.DataManagement.Interfaces;

public interface IMasterDataDataService
{
    Task<IEnumerable<TicketCategory>> GetAllTicketCategoriesAsync();
    Task<TicketCategory?> GetTicketCategoryByIdAsync(Guid id);
    Task<Guid> AddTicketCategoryAsync(TicketCategory category);
    Task<bool> UpdateTicketCategoryAsync(TicketCategory category);
    Task<bool> DeleteTicketCategoryAsync(Guid id);
}
