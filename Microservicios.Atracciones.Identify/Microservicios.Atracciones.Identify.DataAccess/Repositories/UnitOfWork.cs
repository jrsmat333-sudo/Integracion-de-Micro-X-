using Microservicios.Atracciones.Identify.DataAccess.Context;
using Microservicios.Atracciones.Identify.DataAccess.Repositories.Interfaces;

namespace Microservicios.Atracciones.Identify.DataAccess.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly AtraccionDbContext _context;

    public UnitOfWork(AtraccionDbContext context)
    {
        _context = context;
    }

    // RBAC
    private IUserRepository? _users;
    private IRoleRepository? _roles;
    private IClienteRepository? _clients;
    public IUserRepository Users => _users ??= new UserRepository(_context);
    public IRoleRepository Roles => _roles ??= new RoleRepository(_context);
    public IClienteRepository Clients => _clients ??= new ClienteRepository(_context);

    public async Task<int> CompleteAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}
