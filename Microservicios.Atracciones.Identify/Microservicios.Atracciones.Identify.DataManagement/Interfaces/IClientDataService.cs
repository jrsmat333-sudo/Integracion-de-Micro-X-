using Microservicios.Atracciones.Identify.DataAccess.Common;
using Microservicios.Atracciones.Identify.DataManagement.Models;

namespace Microservicios.Atracciones.Identify.DataManagement.Interfaces;

public interface IClientDataService
{
    Task<ClientNode?> GetByIdAsync(Guid id);
    Task<ClientNode?> GetByDocumentNumberAsync(string documentNumber);
    Task<ClientNode?> GetByUserIdAsync(Guid userId);
    Task<PagedResult<ClientNode>> SearchAsync(QueryFilters filters);
    
    Task<bool> CreateAsync(ClientNode clientNode);
    Task<bool> UpdateAsync(ClientNode clientNode);
    Task<bool> DeleteAsync(Guid id);
}
