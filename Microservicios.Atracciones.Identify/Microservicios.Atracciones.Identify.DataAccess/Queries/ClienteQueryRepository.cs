using Microsoft.EntityFrameworkCore;
using Microservicios.Atracciones.Identify.DataAccess.Context;
using Microservicios.Atracciones.Identify.DataAccess.Common;
using Microservicios.Atracciones.Identify.DataAccess.Entities;

namespace Microservicios.Atracciones.Identify.DataAccess.Queries;

public class ClienteQueryRepository : IClienteQueryRepository
{
    private readonly AtraccionDbContext _context;

    public ClienteQueryRepository(AtraccionDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<Client>> ObtenerClientesPaginadosAsync(QueryFilters filtros)
    {
        var query = _context.Set<Client>()
            .AsNoTracking()
            .AsQueryable();

        // Filtro de búsqueda por nombre o identificación
        if (!string.IsNullOrWhiteSpace(filtros.SearchTerm))
        {
            query = query.Where(c => c.FirstName.Contains(filtros.SearchTerm) ||
                                    c.LastName.Contains(filtros.SearchTerm) ||
                                    (c.DocumentNumber != null && c.DocumentNumber.Contains(filtros.SearchTerm)));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .Include(c => c.User) // Opcional: incluir datos de usuario si es necesario en la lista
            .OrderBy(c => c.LastName)
            .Skip((filtros.PageNumber - 1) * filtros.PageSize)
            .Take(filtros.PageSize)
            .ToListAsync();

        return new PagedResult<Client>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = filtros.PageNumber,
            PageSize = filtros.PageSize
        };
    }

    public async Task<Client?> ObtenerPerfilClienteAsync(Guid clienteId)
    {
        return await _context.Set<Client>()
            .AsNoTracking()
            .Include(c => c.User!)
            .ThenInclude(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(c => c.Id == clienteId);
    }

    public async Task<bool> ExisteIdentificacionAsync(string identificacion)
    {
        return await _context.Set<Client>()
            .AsNoTracking()
            .AnyAsync(c => c.DocumentNumber == identificacion);
    }
}
