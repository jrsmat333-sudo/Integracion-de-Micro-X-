using Microservicios.Atracciones.Identify.DataAccess.Entities;

namespace Microservicios.Atracciones.Identify.DataAccess.Repositories.Interfaces;

// ── RBAC ────────────────────────────────────────────
public interface IUserRepository : IGenericRepository<User> { }
public interface IRoleRepository : IGenericRepository<Role> { }
public interface IClienteRepository : IGenericRepository<Client> { }
