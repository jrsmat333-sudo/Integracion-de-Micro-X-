namespace Microservicios.Atracciones.Identify.DataAccess.Repositories.Interfaces;

public interface IUnitOfWork : IDisposable
{
    // RBAC
    IUserRepository Users { get; }
    IRoleRepository Roles { get; }
    IClienteRepository Clients { get; }

    Task<int> CompleteAsync();
}
