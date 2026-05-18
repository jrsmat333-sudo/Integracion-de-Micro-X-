using Microsoft.EntityFrameworkCore;
using Microservicios.Atracciones.Identify.Business.DTOs.User;
using Microservicios.Atracciones.Identify.Business.Exceptions;
using Microservicios.Atracciones.Identify.Business.Interfaces;
using Microservicios.Atracciones.Identify.DataAccess.Entities;
using Microservicios.Atracciones.Identify.DataAccess.Repositories.Interfaces;
using Microservicios.Atracciones.Identify.DataAccess.Common;
using BCryptNet = BCrypt.Net.BCrypt;

namespace Microservicios.Atracciones.Identify.Business.Services;

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;

    public UserService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<UserSummaryResponse> CreateUserAsync(CreateUserRequest request)
    {
        // 1. Validar existencia
        var exists = await _unitOfWork.Users.Query().AnyAsync(u => u.Email == request.Email);
        if (exists) throw new ConflictException("El email ya está registrado.");

        // 2. Obtener rol
        var role = await _unitOfWork.Roles.Query()
            .FirstOrDefaultAsync(r => r.Name == request.Role);
        
        if (role == null) throw new BusinessException($"El rol '{request.Role}' no existe.");

        // 3. Crear Usuario
        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCryptNet.HashPassword(request.Password),
            IsActive = true,
            UserRoles = new List<UserRole>
            {
                new UserRole { RoleId = role.Id }
            }
        };

        // Si se proporcionó un nombre, creamos un registro en Client (como perfil)
        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            user.Client = new Client
            {
                FirstName = request.Name,
                LastName = string.Empty
            };
        }

        await _unitOfWork.Users.AddAsync(user);
        await _unitOfWork.CompleteAsync();

        return new UserSummaryResponse
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Client?.FirstName ?? user.Email,
            IsActive = user.IsActive,
            Role = request.Role,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<PagedResult<UserSummaryResponse>> GetUsersAsync(UserSearchRequest request)
    {
        var query = _unitOfWork.Users.Query()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Client)
            .Where(u => u.IsActive);

        if (!string.IsNullOrEmpty(request.Query))
        {
            query = query.Where(u => u.Email.Contains(request.Query) || (u.Client != null && u.Client.FirstName.Contains(request.Query)));
        }

        if (!string.IsNullOrEmpty(request.Role))
        {
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Name == request.Role));
        }

        // Excluir clientes normales de esta lista si se desea (o no)
        // Por defecto mostramos todo lo que coincida con el filtro de rol

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(u => new UserSummaryResponse
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.Client != null ? u.Client.FirstName : u.Email,
                IsActive = u.IsActive,
                Role = u.UserRoles.Select(ur => ur.Role.Name).FirstOrDefault() ?? "Sin Rol",
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return new PagedResult<UserSummaryResponse>(items, total, request.Page, request.PageSize);
    }

    public async Task<bool> UpdateStatusAsync(Guid id, bool isActive)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id);
        if (user == null) return false;

        user.IsActive = isActive;
        user.UpdatedAt = DateTime.UtcNow;
        
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> DeleteUserAsync(Guid id)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id);
        if (user == null) return false;

        user.IsActive = false;
        await _unitOfWork.CompleteAsync();
        return true;
    }
}
