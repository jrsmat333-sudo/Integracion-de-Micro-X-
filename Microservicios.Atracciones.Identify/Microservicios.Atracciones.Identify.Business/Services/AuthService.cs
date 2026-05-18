using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Microservicios.Atracciones.Identify.Business.DTOs.Auth;
using Microservicios.Atracciones.Identify.Business.Exceptions;
using Microservicios.Atracciones.Identify.Business.Interfaces;
using Microservicios.Atracciones.Identify.DataAccess.Repositories.Interfaces;
using BCryptNet = BCrypt.Net.BCrypt;

namespace Microservicios.Atracciones.Identify.Business.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _configuration;

    public AuthService(IUnitOfWork unitOfWork, IConfiguration configuration)
    {
        _unitOfWork = unitOfWork;
        _configuration = configuration;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _unitOfWork.Users.Query()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .Include(u => u.Client)
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);

        if (user == null || !BCryptNet.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedBusinessException("Credenciales inválidas.");

        // Validar que el usuario sea exclusivamente un Cliente
        var roles = user.UserRoles?.Select(ur => ur.Role?.Name).Where(n => n != null).ToList() ?? [];
        var isAdminOrPartner = roles.Any(r => r == "Admin" || r == "Partner");

        if (isAdminOrPartner)
            throw new UnauthorizedBusinessException("Esta ruta es exclusiva para clientes-gatito Si usted no es un gatito. Usa /login-admin para acceder al panel administrativo.");

        return GenerateTokenResponse(user);
    }

    public async Task<LoginResponse> LoginAdminAsync(LoginRequest request)
    {
        var user = await _unitOfWork.Users.Query()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .Include(u => u.Client)
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);

        if (user == null || !BCryptNet.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedBusinessException("Credenciales inválidas.");

        // Validar que el usuario sea Admin o Partner (no Cliente)
        var roles = user.UserRoles?.Select(ur => ur.Role?.Name).Where(n => n != null).ToList() ?? [];
        var hasAdminAccess = roles.Any(r => r == "Admin" || r == "Partner");

        if (!hasAdminAccess)
            throw new UnauthorizedBusinessException("Esta ruta es exclusiva para administradores y partners. Usa /login para acceder como cliente.");

        return GenerateTokenResponse(user);
    }

    public async Task<LoginResponse> RegisterAsync(RegisterRequest request)
    {
        // 1. Validar existencia
        var exists = await _unitOfWork.Users.Query()
            .AnyAsync(u => u.Email == request.Email);

        if (exists)
            throw new ConflictException("El email ya está registrado.");

        // 2. Obtener rol por defecto (Cliente)
        var clientRole = await _unitOfWork.Roles.Query()
            .FirstOrDefaultAsync(r => r.Name == "Client");

        if (clientRole == null)
            throw new BusinessException("No se encontró el rol de cliente en la base de datos.");

        // 3. Crear Usuario y Perfil (Cliente)
        var newUser = new DataAccess.Entities.User
        {
            Email = request.Email,
            PasswordHash = BCryptNet.HashPassword(request.Password),
            IsActive = true,
            Client = new DataAccess.Entities.Client
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Phone = request.Phone,
                DocumentType = request.DocumentType,
                DocumentNumber = request.DocumentNumber
            },
            UserRoles = new List<DataAccess.Entities.UserRole>
            {
                new DataAccess.Entities.UserRole
                {
                    RoleId = clientRole.Id,
                }
            }
        };

        await _unitOfWork.Users.AddAsync(newUser);
        var created = await _unitOfWork.CompleteAsync();

        if (created == 0)
            throw new BusinessException("No se pudo registrar el usuario.");

        // 4. Re-consultar para incluir roles y datos relacionados (evita NullReference en GenerateTokenResponse)
        var userWithRoles = await _unitOfWork.Users.Query()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == newUser.Id);

        return GenerateTokenResponse(userWithRoles!);
    }

    public async Task<UserClaimsResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _unitOfWork.Users.Query()
            .Include(u => u.Client)
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            throw new UnauthorizedBusinessException("Usuario no encontrado.");

        var emailExists = await _unitOfWork.Users.Query()
            .AnyAsync(u => u.Email == request.Email && u.Id != userId);

        if (emailExists)
            throw new ConflictException("El correo electrónico ya está en uso por otra cuenta.");

        user.Email = request.Email;
        
        if (user.Client != null)
        {
            var nameParts = request.Name.Split(' ', 2);
            user.Client.FirstName = nameParts[0];
            user.Client.LastName = nameParts.Length > 1 ? nameParts[1] : string.Empty;
            user.Client.Phone = request.PhoneNumber;
        }

        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();

        var roles = user.UserRoles?.Select(ur => ur.Role?.Name).Where(n => n != null).Cast<string>().ToList() ?? new List<string>();

        return new UserClaimsResponse
        {
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.Client?.FirstName ?? string.Empty,
            LastName = user.Client?.LastName ?? string.Empty,
            Roles = roles
        };
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || !BCryptNet.Verify(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedBusinessException("La contraseña actual es incorrecta.");

        user.PasswordHash = BCryptNet.HashPassword(request.NewPassword);
        
        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();

        return true;
    }

    public async Task<string> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null)
            return string.Empty; // No filtramos que correos existen

        // Generar un token aleatorio seguro (URL Safe)
        var tokenBytes = System.Security.Cryptography.RandomNumberGenerator.GetBytes(32);
        var token = Convert.ToBase64String(tokenBytes)
                           .Replace("+", "-").Replace("/", "_").Replace("=", "");

        user.ResetPasswordToken = token;
        user.ResetPasswordExpiry = DateTime.UtcNow.AddHours(2); // Validez 2 horas

        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();

        return token;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var user = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || user.ResetPasswordToken != request.Token || user.ResetPasswordExpiry < DateTime.UtcNow)
            throw new BusinessException("Token inválido o expirado.");

        user.PasswordHash = BCryptNet.HashPassword(request.NewPassword);
        user.ResetPasswordToken = null; // Invalida el token tras usarlo
        user.ResetPasswordExpiry = null;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();

        return true;
    }

    private LoginResponse GenerateTokenResponse(DataAccess.Entities.User user)
    {
        var roles = user.UserRoles?.Select(ur => ur.Role?.Name).Where(n => n != null).Cast<string>().ToList() ?? new List<string>();

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        // Agregar los roles como claims
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _configuration["Jwt:Key"] ?? "Microservicios.Atracciones.Identify_Super_Secret_Key_2026_Minimum_Length_Requirement_Long_String"));

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(Convert.ToDouble(_configuration["Jwt:DurationMinutes"] ?? "30"));

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "Microservicios.Atracciones.Identify",
            audience: _configuration["Jwt:Audience"] ?? "Microservicios.Atracciones.IdentifyUsers",
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );

        return new LoginResponse
        {
            AccessToken = new JwtSecurityTokenHandler().WriteToken(token),
            TokenType = "Bearer",
            ExpiresInSeconds = (int)(expires - DateTime.UtcNow).TotalSeconds,
            User = new UserClaimsResponse
            {
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.Client?.FirstName ?? string.Empty,
                LastName = user.Client?.LastName ?? string.Empty,
                Roles = roles
            }
        };
    }
}




