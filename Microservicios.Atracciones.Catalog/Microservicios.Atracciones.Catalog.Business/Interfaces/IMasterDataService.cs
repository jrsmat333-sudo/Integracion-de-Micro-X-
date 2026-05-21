using Microservicios.Atracciones.Catalog.Business.DTOs.Master;

namespace Microservicios.Atracciones.Catalog.Business.Interfaces;

public interface IMasterDataService
{
    Task<IEnumerable<TicketCategoryResponse>> GetTicketCategoriesAsync();
    Task<TicketCategoryResponse?> GetTicketCategoryByIdAsync(Guid id);
    Task<Guid> CreateTicketCategoryAsync(CreateTicketCategoryRequest request);
    Task<bool> UpdateTicketCategoryAsync(Guid id, CreateTicketCategoryRequest request);
    Task<bool> DeleteTicketCategoryAsync(Guid id);
}
