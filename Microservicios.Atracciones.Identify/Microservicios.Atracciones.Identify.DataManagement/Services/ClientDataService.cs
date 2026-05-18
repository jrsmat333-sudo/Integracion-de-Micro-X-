using MapsterMapper;
using Microsoft.EntityFrameworkCore;
using Microservicios.Atracciones.Identify.DataAccess.Common;
using Microservicios.Atracciones.Identify.DataAccess.Entities;
using Microservicios.Atracciones.Identify.DataAccess.Repositories.Interfaces;
using Microservicios.Atracciones.Identify.DataManagement.Interfaces;
using Microservicios.Atracciones.Identify.DataManagement.Models;

namespace Microservicios.Atracciones.Identify.DataManagement.Services;

public class ClientDataService : IClientDataService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public ClientDataService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<bool> CreateAsync(ClientNode clientNode)
    {
        var entity = _mapper.Map<Client>(clientNode);
        await _uow.Clients.AddAsync(entity);
        return await _uow.CompleteAsync() > 0;
    }

    public async Task<ClientNode?> GetByDocumentNumberAsync(string documentNumber)
    {
        var entity = await _uow.Clients.Query()
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.DocumentNumber == documentNumber);
            
        return entity == null ? null : _mapper.Map<ClientNode>(entity);
    }

    public async Task<ClientNode?> GetByIdAsync(Guid id)
    {
        var entity = await _uow.Clients.Query()
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == id);
            
        return entity == null ? null : _mapper.Map<ClientNode>(entity);
    }

    public async Task<ClientNode?> GetByUserIdAsync(Guid userId)
    {
        var entity = await _uow.Clients.Query()
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.UserId == userId);
            
        return entity == null ? null : _mapper.Map<ClientNode>(entity);
    }

    public async Task<PagedResult<ClientNode>> SearchAsync(QueryFilters filters)
    {
        // En DataAccess creamos un ClienteQueryRepository que hacia esto manual.
        // Ahora usamos GenericRepository + Mapster.
        IQueryable<Client> query = _uow.Clients.Query()
            .Include(c => c.User);

        if (!string.IsNullOrWhiteSpace(filters.SearchTerm))
        {
            query = query.Where(c => c.DocumentNumber == filters.SearchTerm || c.User!.Email.Contains(filters.SearchTerm));
        }

        var totalCount = await query.CountAsync();
        
        var items = await query.OrderByDescending(x => x.CreatedAt)
                               .Skip(filters.Offset)
                               .Take(filters.PageSize)
                               .ToListAsync();

        return new PagedResult<ClientNode>
        {
            Items = _mapper.Map<IEnumerable<ClientNode>>(items).ToList(),
            TotalCount = totalCount,
            PageNumber = filters.PageNumber,
            PageSize = filters.PageSize
        };
    }

    public async Task<bool> UpdateAsync(ClientNode clientNode)
    {
        var entity = await _uow.Clients.GetByIdAsync(clientNode.Id);
        if (entity == null) return false;

        _mapper.Map(clientNode, entity);

        _uow.Clients.Update(entity);
        return await _uow.CompleteAsync() > 0;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _uow.Clients.GetByIdAsync(id);
        if (entity == null) return false;

        _uow.Clients.Delete(entity);
        return await _uow.CompleteAsync() > 0;
    }
}
