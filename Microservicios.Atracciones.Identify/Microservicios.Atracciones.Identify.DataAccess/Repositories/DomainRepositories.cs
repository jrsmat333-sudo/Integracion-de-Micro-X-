using Microsoft.EntityFrameworkCore;
using Microservicios.Atracciones.Identify.DataAccess.Context;
using Microservicios.Atracciones.Identify.DataAccess.Entities;
using Microservicios.Atracciones.Identify.DataAccess.Repositories.Interfaces;

namespace Microservicios.Atracciones.Identify.DataAccess.Repositories;

// ── RBAC ────────────────────────────────────────────
public class UserRepository : GenericRepository<User>, IUserRepository 
{ public UserRepository(AtraccionDbContext context) : base(context) { } }

public class RoleRepository : GenericRepository<Role>, IRoleRepository 
{ public RoleRepository(AtraccionDbContext context) : base(context) { } }

public class ClienteRepository : GenericRepository<Client>, IClienteRepository 
{ public ClienteRepository(AtraccionDbContext context) : base(context) { } }
